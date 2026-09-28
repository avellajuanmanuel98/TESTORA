from django.conf import settings
from django.db import models
from django.utils.text import slugify

from apps.core.models import TimestampedModel
from apps.organizations.models import Organization


class Project(TimestampedModel):
    STATUS_ACTIVE = "active"
    STATUS_ARCHIVED = "archived"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_ARCHIVED, "Archived"),
    ]

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="projects", db_index=True
    )
    name = models.CharField(max_length=150)
    slug = models.SlugField()
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="projects_created"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["organization", "slug"], name="unique_org_project_slug")
        ]
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class ProjectMembership(TimestampedModel):
    ROLE_ADMIN = "admin"
    ROLE_QA_MANAGER = "qa_manager"
    ROLE_QA_ENGINEER = "qa_engineer"
    ROLE_VIEWER = "viewer"
    ROLE_CHOICES = [
        (ROLE_ADMIN, "Admin"),
        (ROLE_QA_MANAGER, "QA Manager"),
        (ROLE_QA_ENGINEER, "QA Engineer"),
        (ROLE_VIEWER, "Viewer"),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_memberships"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_VIEWER)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["project", "user"], name="unique_project_user")
        ]
        ordering = ["user__full_name"]

    def __str__(self) -> str:
        return f"{self.user} @ {self.project} ({self.role})"
