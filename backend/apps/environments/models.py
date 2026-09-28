from django.db import models

from apps.core.fields import EncryptedTextField
from apps.core.models import TimestampedModel
from apps.projects.models import Project


class Environment(TimestampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="environments")
    name = models.CharField(max_length=100)
    base_url = models.URLField()
    browser = models.CharField(max_length=30, default="chrome")
    browser_config = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["project", "name"], name="unique_project_environment_name")
        ]
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.project.name} / {self.name}"


class EnvironmentVariable(TimestampedModel):
    environment = models.ForeignKey(
        Environment, on_delete=models.CASCADE, related_name="variables"
    )
    key = models.CharField(max_length=100)
    value = EncryptedTextField()
    is_secret = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["environment", "key"], name="unique_environment_variable_key")
        ]
        ordering = ["key"]

    def __str__(self) -> str:
        return f"{{{{{self.key}}}}}"
