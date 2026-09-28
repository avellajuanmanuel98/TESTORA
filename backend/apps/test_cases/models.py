from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel
from apps.projects.models import Project


class TestCase(TimestampedModel):
    STATUS_DRAFT = "draft"
    STATUS_ACTIVE = "active"
    STATUS_DEPRECATED = "deprecated"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_DEPRECATED, "Deprecated"),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="test_cases")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="test_cases_created"
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="test_cases_updated",
        blank=True,
    )

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return self.name


class TestStep(TimestampedModel):
    test_case = models.ForeignKey(TestCase, on_delete=models.CASCADE, related_name="steps")
    order = models.PositiveIntegerField()
    action_type = models.CharField(max_length=50)
    params = models.JSONField(default=dict, blank=True)
    timeout_ms = models.PositiveIntegerField(default=5000)
    screenshot_on_fail = models.BooleanField(default=True)
    enabled = models.BooleanField(default=True)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(fields=["test_case", "order"], name="unique_test_case_step_order")
        ]

    def __str__(self) -> str:
        return f"{self.test_case.name} — step {self.order} ({self.action_type})"
