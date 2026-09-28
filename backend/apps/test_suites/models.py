from django.db import models

from apps.core.models import TimestampedModel
from apps.projects.models import Project
from apps.test_cases.models import TestCase


class TestSuite(TimestampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="test_suites")
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["project", "name"], name="unique_project_suite_name")
        ]
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class TestSuiteItem(TimestampedModel):
    suite = models.ForeignKey(TestSuite, on_delete=models.CASCADE, related_name="items")
    test_case = models.ForeignKey(TestCase, on_delete=models.CASCADE, related_name="suite_items")
    order = models.PositiveIntegerField()

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(fields=["suite", "order"], name="unique_suite_item_order"),
            models.UniqueConstraint(fields=["suite", "test_case"], name="unique_suite_test_case"),
        ]

    def __str__(self) -> str:
        return f"{self.suite.name} — {self.test_case.name}"
