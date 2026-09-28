from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.organizations.models import Organization, OrganizationMembership


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def attach_user_to_default_organization(sender, instance, created, **kwargs):
    """Every new user is transparently attached to the single default
    organization. No signup/onboarding UI needed for Phase 1's single-org
    setup; this is the only place that assumption lives."""
    if not created:
        return

    organization, _ = Organization.objects.get_or_create(
        slug=settings.DEFAULT_ORGANIZATION_SLUG,
        defaults={"name": settings.DEFAULT_ORGANIZATION_NAME},
    )
    is_first_member = not organization.memberships.exists()
    OrganizationMembership.objects.get_or_create(
        organization=organization,
        user=instance,
        defaults={
            "role": OrganizationMembership.ROLE_OWNER
            if is_first_member
            else OrganizationMembership.ROLE_MEMBER
        },
    )
