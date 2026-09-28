"""Celery task that drives a TestRun to completion.

Selenium never runs inside the HTTP request/response cycle — this task is
only ever invoked via .delay(), from TestRunViewSet.perform_create, after
the TestRun/TestResult rows are committed (see apps/test_runs/views.py).
"""

import logging
import time

from celery import shared_task
from django.core.files.base import ContentFile
from django.utils import timezone

from apps.automation.context import ExecutionContext
from apps.automation.engine import SeleniumSession
from apps.automation.executors import EXECUTORS
from apps.test_runs.models import Evidence, StepResult, TestResult, TestRun

logger = logging.getLogger(__name__)


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
