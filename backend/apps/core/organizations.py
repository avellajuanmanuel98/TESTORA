"""Single source of truth for resolving "the current organization" for a
request. Every place in the codebase that needs organization context calls
into this module instead of querying OrganizationMembership directly, so the
day Testora supports more than one organization per user, this is the only
place that changes.
"""

from apps.organizations.models import Organization, OrganizationMembership


def get_current_organization(user) -> Organization | None:
    """Resolve the organization the given authenticated user acts within.

    Phase 1 assumption: a user belongs to exactly one organization. When
    multi-organization membership ships, this becomes "the organization
    selected via the Organization Switcher / an org claim on the token",
    still resolved server-side — never from a client-supplied id.
    """
    if user is None or not getattr(user, "is_authenticated", False):
        return None

    membership = (
        OrganizationMembership.objects.select_related("organization")
        .filter(user=user)
        .first()
    )
    return membership.organization if membership else None
