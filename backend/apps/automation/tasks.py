"""Celery task that drives a TestRun to completion.

Selenium never runs inside the HTTP request/response cycle — this task is
only ever invoked via .delay(), from TestRunViewSet.perform_create, after
the TestRun/TestResult rows are committed (see apps/test_runs/views.py).
"""

import logging
import time

from celery import shared_task
from django.core.files.base import ContentFile
from django.db.models import Max
from django.utils import timezone
from selenium.common.exceptions import WebDriverException

from apps.automation.context import ExecutionContext
from apps.automation.engine import SeleniumSession
from apps.automation.executors import EXECUTORS
from apps.automation.models import RecordingSession
from apps.automation.recorder_js import DRAIN_JS, INJECT_JS
from apps.test_cases.models import TestStep
from apps.test_runs.models import Evidence, StepResult, TestResult, TestRun

logger = logging.getLogger(__name__)

# How often to re-inject the recorder script and drain captured events.
# Short, deliberately: a page navigation (clicking a link, submitting a
# form) destroys the page's JS state, taking any not-yet-drained events
# with it — verified in practice losing a click that immediately submits a
# form. 200ms keeps that window small without spamming the browser with
# execute_script calls between actions.
RECORDER_POLL_SECONDS = 0.2


@shared_task(bind=True, acks_late=True, soft_time_limit=300, time_limit=360)
def execute_test_run(self, run_id):
    try:
        run = TestRun.objects.select_related("environment").get(pk=run_id)
    except TestRun.DoesNotExist:
        logger.warning("execute_test_run: run %s no longer exists", run_id)
        return

    total = run.test_results.count()
    run.status = TestRun.STATUS_RUNNING
    run.started_at = timezone.now()
    run.celery_task_id = self.request.id or ""
    run.total = total
    run.queued = total
    run.save(update_fields=["status", "started_at", "celery_task_id", "total", "queued"])

    context = ExecutionContext(run.environment)

    try:
        for result in run.test_results.select_related("test_case").order_by("id"):
            run.queued = max(run.queued - 1, 0)
            run.running = 1
            run.save(update_fields=["queued", "running"])

            failed = _run_test_case(result, context)

            run.running = 0
            if failed:
                run.failed += 1
            else:
                run.passed += 1
            run.save(update_fields=["running", "failed", "passed"])
    except Exception:
        # A run must never stay "running" forever because the worker itself
        # crashed mid-flight (driver crash, OOM, etc.) — see risk notes.
        logger.exception("execute_test_run: run %s crashed", run_id)
        run.status = TestRun.STATUS_ERROR
        run.finished_at = timezone.now()
        run.save(update_fields=["status", "finished_at"])
        return

    run.status = TestRun.STATUS_FAILED if run.failed else TestRun.STATUS_PASSED
    run.finished_at = timezone.now()
    run.save(update_fields=["status", "finished_at"])


def _run_test_case(result: TestResult, context: ExecutionContext) -> bool:
    """Runs one TestResult's steps in a fresh browser session — isolates
    cookies/state per test case, like a real QA run. Returns True if the
    test case failed."""
    result.status = TestResult.STATUS_RUNNING
    result.started_at = timezone.now()
    result.save(update_fields=["status", "started_at"])

    steps = list(result.test_case.steps.filter(enabled=True).order_by("order"))
    failed = False

    with SeleniumSession(browser=context.environment.browser) as driver:
        for step in steps:
            step_result = StepResult.objects.create(
                test_result=result,
                step=step,
                order=step.order,
                action_type=step.action_type,
                status=TestResult.STATUS_RUNNING,
                selector_snapshot=str(step.params.get("selector", "")),
            )

            if failed:
                step_result.status = TestResult.STATUS_SKIPPED
                step_result.save(update_fields=["status"])
                continue

            executor = EXECUTORS.get(step.action_type)
            start = time.monotonic()
            try:
                if executor is None:
                    raise ValueError(f"Acción no soportada por el motor: '{step.action_type}'.")
                executor(driver, context, step.params)
                step_result.status = TestResult.STATUS_PASSED
                if step.action_type == "screenshot":
                    _capture_evidence(driver, result, step_result, only_screenshot=True)
            except Exception as exc:
                failed = True
                step_result.status = TestResult.STATUS_ERROR
                step_result.error_message = _clean_error_message(exc)
                if result.error_message == "":
                    result.error_type = type(exc).__name__
                    result.error_message = step_result.error_message
                if step.screenshot_on_fail:
                    _capture_evidence(driver, result, step_result)
            finally:
                step_result.duration_ms = int((time.monotonic() - start) * 1000)
                step_result.save()

    result.status = TestResult.STATUS_FAILED if failed else TestResult.STATUS_PASSED
    result.finished_at = timezone.now()
    result.duration_ms = int((result.finished_at - result.started_at).total_seconds() * 1000)
    result.save(update_fields=["status", "finished_at", "duration_ms", "error_type", "error_message"])
    return failed


def _clean_error_message(exc: Exception) -> str:
    """Selenium exceptions stringify with a huge hex stacktrace and a
    "(Session info: ...)" line — noise for a QA engineer reading a result.
    Keep just the actual message. Our own AssertionErrors (plain, one-line
    Spanish messages) pass through unchanged."""
    text = str(exc).split("\nStacktrace:")[0].split("\n  (Session info:")[0].strip()
    if text.startswith("Message: "):
        text = text[len("Message: "):]
    return text


def _capture_evidence(driver, result, step_result, only_screenshot=False):
    try:
        png = driver.get_screenshot_as_png()
        evidence = Evidence(test_result=result, step_result=step_result, type=Evidence.TYPE_SCREENSHOT)
        evidence.file.save(f"run-{result.run_id}-step-{step_result.id}.png", ContentFile(png), save=True)
    except Exception:
        logger.exception("Could not capture screenshot evidence for step_result %s", step_result.id)

    if only_screenshot:
        return

    try:
        html = driver.page_source
        evidence = Evidence(test_result=result, step_result=step_result, type=Evidence.TYPE_HTML)
        evidence.file.save(
            f"run-{result.run_id}-step-{step_result.id}.html",
            ContentFile(html.encode("utf-8")),
            save=True,
        )
    except Exception:
        logger.exception("Could not capture HTML evidence for step_result %s", step_result.id)


@shared_task(bind=True, soft_time_limit=1800, time_limit=1860)
def record_session(self, session_id):
    """Drives a RecordingSession: opens a real, visible browser at the
    environment's base URL, injects a small event-capture script, and polls
    it for clicks/typed values/selections — turning each into a TestStep as
    it happens. There is no explicit "stop" endpoint: closing the browser
    window is how the user ends a recording, which surfaces here as
    WebDriverException on the next poll — a normal, expected way for this
    task to finish, not a crash.
    """
    try:
        session = RecordingSession.objects.select_related("test_case", "environment").get(pk=session_id)
    except RecordingSession.DoesNotExist:
        logger.warning("record_session: session %s no longer exists", session_id)
        return

    session.celery_task_id = self.request.id or ""
    session.save(update_fields=["celery_task_id"])

    next_order = (session.test_case.steps.aggregate(m=Max("order"))["m"] or 0) + 1
    # A brand-new test case has no step of its own to navigate anywhere —
    # replaying it later opens a fresh browser session that starts on a
    # blank page, so without this the very first recorded interaction fails
    # with "no such element" against a page that was never loaded. Only
    # needed once: recording more steps onto a test case that already has
    # some means it already has its own starting navigation.
    needs_open_url_step = next_order == 1

    try:
        # headless=False is the entire point here — the user needs a window
        # they can actually click and type into.
        with SeleniumSession(browser=session.environment.browser, headless=False) as driver:
            driver.get(session.environment.base_url)

            if needs_open_url_step:
                TestStep.objects.create(
                    test_case=session.test_case,
                    order=next_order,
                    action_type="open_url",
                    params={"url": "{{BASE_URL}}"},
                    note="Grabado automáticamente",
                )
                next_order += 1
                session.steps_captured += 1
                session.save(update_fields=["steps_captured"])

            while True:
                try:
                    driver.execute_script(INJECT_JS)
                    events = driver.execute_script(DRAIN_JS) or []
                except WebDriverException:
                    # The window was closed (or the browser crashed) — either
                    # way, recording is over. Nothing left to clean up: the
                    # `with` block's __exit__ still calls driver.quit(),
                    # which is a harmless no-op on an already-gone session.
                    break

                for event in events:
                    step = _step_from_recorder_event(session.test_case, next_order, event)
                    if step is None:
                        continue
                    step.save()
                    next_order += 1
                    session.steps_captured += 1
                if events:
                    session.save(update_fields=["steps_captured"])

                time.sleep(RECORDER_POLL_SECONDS)
    except Exception:
        logger.exception("record_session: session %s crashed", session_id)
        session.status = RecordingSession.STATUS_ERROR
        session.error_message = "La grabación se interrumpió inesperadamente."
        session.finished_at = timezone.now()
        session.save(update_fields=["status", "error_message", "finished_at"])
        return

    session.status = RecordingSession.STATUS_FINISHED
    session.finished_at = timezone.now()
    session.save(update_fields=["status", "finished_at"])


def _step_from_recorder_event(test_case, order, event):
    """Maps one captured browser event to an unsaved TestStep, or None for
    an event type this recorder doesn't (yet) understand. Assertions are
    deliberately never inferred here — recording captures actions; a human
    adds the verifications afterward in the Builder."""
    event_type = event.get("type")
    selector = event.get("selector")
    if not selector:
        return None

    if event_type == "click":
        text = (event.get("text") or "").strip()
        note = f"Grabado: clic en «{text}»" if text else "Grabado automáticamente"
        params = {"selector": selector}
    elif event_type in ("input_text", "select"):
        note = "Grabado automáticamente"
        params = {"selector": selector, "value": event.get("value", "")}
    else:
        return None

    return TestStep(test_case=test_case, order=order, action_type=event_type, params=params, note=note)
