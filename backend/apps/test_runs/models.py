from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel
from apps.environments.models import Environment
from apps.projects.models import Project
from apps.test_cases.models import TestCase, TestStep
from apps.test_suites.models import TestSuite


class TestRun(TimestampedModel):
    STATUS_QUEUED = "queued"
    STATUS_RUNNING = "running"
    STATUS_PASSED = "passed"
    STATUS_FAILED = "failed"
    STATUS_ERROR = "error"
    STATUS_CHOICES = [
        (STATUS_QUEUED, "Queued"),
        (STATUS_RUNNING, "Running"),
        (STATUS_PASSED, "Passed"),
        (STATUS_FAILED, "Failed"),
        (STATUS_ERROR, "Error"),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="test_runs")
    environment = models.ForeignKey(Environment, on_delete=models.PROTECT, related_name="test_runs")
    # None means this run targets a single ad-hoc test_case rather than a suite.
    suite = models.ForeignKey(
        TestSuite, on_delete=models.SET_NULL, null=True, blank=True, related_name="test_runs"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_QUEUED)
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="test_runs_triggered"
    )
    celery_task_id = models.CharField(max_length=255, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    total = models.PositiveIntegerField(default=0)
    passed = models.PositiveIntegerField(default=0)
    failed = models.PositiveIntegerField(default=0)
    running = models.PositiveIntegerField(default=0)
    queued = models.PositiveIntegerField(default=0)
    skipped = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Run #{self.pk} — {self.project.name} ({self.status})"


class TestResult(TimestampedModel):
    STATUS_QUEUED = "queued"
    STATUS_RUNNING = "running"
    STATUS_PASSED = "passed"
    STATUS_FAILED = "failed"
    STATUS_ERROR = "error"
    STATUS_SKIPPED = "skipped"
    STATUS_CHOICES = [
        (STATUS_QUEUED, "Queued"),
        (STATUS_RUNNING, "Running"),
        (STATUS_PASSED, "Passed"),
        (STATUS_FAILED, "Failed"),
        (STATUS_ERROR, "Error"),
        (STATUS_SKIPPED, "Skipped"),
    ]

    run = models.ForeignKey(TestRun, on_delete=models.CASCADE, related_name="test_results")
    test_case = models.ForeignKey(TestCase, on_delete=models.CASCADE, related_name="results")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_QUEUED)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    error_type = models.CharField(max_length=100, blank=True)
    error_message = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(fields=["run", "test_case"], name="unique_run_test_case")
        ]

    def __str__(self) -> str:
        return f"{self.test_case.name} — {self.status}"


class StepResult(TimestampedModel):
    test_result = models.ForeignKey(TestResult, on_delete=models.CASCADE, related_name="step_results")
    # Kept even if the original TestStep is later edited/deleted, so run
    # history survives — action_type/selector_snapshot are captured at
    # execution time rather than read through this FK.
    step = models.ForeignKey(
        TestStep, on_delete=models.SET_NULL, null=True, blank=True, related_name="results"
    )
    order = models.PositiveIntegerField()
    action_type = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=TestResult.STATUS_CHOICES, default=TestResult.STATUS_QUEUED)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    # The selector actually used, snapshotted at execution time — groundwork
    # for the future heuristic selector self-healing feature.
    selector_snapshot = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(fields=["test_result", "order"], name="unique_test_result_step_order")
        ]

    def __str__(self) -> str:
        return f"{self.test_result} — step {self.order} ({self.action_type})"


class Evidence(TimestampedModel):
    TYPE_SCREENSHOT = "screenshot"
    TYPE_HTML = "html"
    TYPE_LOG = "log"
    TYPE_CHOICES = [
        (TYPE_SCREENSHOT, "Screenshot"),
        (TYPE_HTML, "HTML"),
        (TYPE_LOG, "Log"),
    ]

    test_result = models.ForeignKey(TestResult, on_delete=models.CASCADE, related_name="evidence")
    step_result = models.ForeignKey(
        StepResult, on_delete=models.CASCADE, null=True, blank=True, related_name="evidence"
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    # A plain FileField never hardcodes a storage scheme — swapping the
    # default storage backend to S3-compatible storage later is a settings
    # change, not an app-code change.
    file = models.FileField(upload_to="evidence/%Y/%m/%d/")

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.type} — {self.test_result}"
