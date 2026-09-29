from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel
from apps.environments.models import Environment
from apps.test_cases.models import TestCase


class RecordingSession(TimestampedModel):
    """Tracks one "record my clicks" run of the Celery recorder task against
    a real browser (see apps/automation/tasks.py::record_session). One row
    per attempt — status transitions recording -> finished/error exactly
    once, driven entirely by the task, never by the API."""

    STATUS_RECORDING = "recording"
    STATUS_FINISHED = "finished"
    STATUS_ERROR = "error"
    STATUS_CHOICES = [
        (STATUS_RECORDING, "Recording"),
        (STATUS_FINISHED, "Finished"),
        (STATUS_ERROR, "Error"),
    ]

    test_case = models.ForeignKey(TestCase, on_delete=models.CASCADE, related_name="recording_sessions")
    environment = models.ForeignKey(Environment, on_delete=models.CASCADE, related_name="recording_sessions")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_RECORDING)
    started_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="recording_sessions"
    )
    celery_task_id = models.CharField(max_length=255, blank=True)
    steps_captured = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Recording of {self.test_case_id} ({self.status})"
