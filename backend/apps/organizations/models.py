from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel


class Organization(TimestampedModel):
    """The top-level data isolation boundary. Assuria runs a single
    organization ("Assuria Internal") today; every Project hangs off one, so
    supporting more organizations later is additive, not a rewrite. See the
    architecture notes on Organization isolation for the full rationale."""

    STATUS_ACTIVE = "active"
    STATUS_SUSPENDED = "suspended"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_SUSPENDED, "Suspended"),
    ]

    name = models.CharField(max_length=150)
    slug = models.SlugField(unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)

    def __str__(self) -> str:
        return self.name


class OrganizationMembership(TimestampedModel):
    ROLE_OWNER = "owner"
    ROLE_ADMIN = "admin"
    ROLE_MEMBER = "member"
    ROLE_CHOICES = [
        (ROLE_OWNER, "Owner"),
        (ROLE_ADMIN, "Admin"),
        (ROLE_MEMBER, "Member"),
    ]

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="organization_memberships"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_MEMBER)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "user"], name="unique_organization_user"
            )
        ]

    def __str__(self) -> str:
        return f"{self.user} @ {self.organization} ({self.role})"
