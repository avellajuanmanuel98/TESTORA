from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.core.organizations import get_current_organization


class IsOrganizationMember(BasePermission):
    """Base permission for every authenticated API view.

    Resolving the current organization happens here, as a side effect of the
    permission check, so it is guaranteed to run (via check_permissions)
    before any viewset's get_queryset() executes. This is the single place
    request.organization gets set — never trust an organization id supplied
    by the client.
    """

    message = "You do not belong to an organization."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        request.organization = get_current_organization(request.user)
        return request.organization is not None


ROLE_RANK = {"viewer": 0, "qa_engineer": 1, "qa_manager": 2, "admin": 3}


class HasProjectRole(BasePermission):
    """Object-level permission for anything nested under a Project.

    Read access requires any ProjectMembership; mutating access requires a
    role at or above `min_role_for_write` (default: qa_engineer), except
    DELETE, which is gated by the (usually stricter) `min_role_for_delete`.
    The view must implement get_object_project(obj) -> Project, provided by
    OrganizationScopedModelViewSet via its `project_lookup` attribute.
    """

    message = "You do not have access to this project."
    min_role_for_write = "qa_engineer"
    min_role_for_delete = "qa_engineer"

    def has_object_permission(self, request, view, obj):
        from apps.projects.models import ProjectMembership

        project = view.get_object_project(obj)
        membership = ProjectMembership.objects.filter(
            user=request.user, project=project
        ).first()
        if membership is None:
            return False
        if request.method in SAFE_METHODS:
            return True
        required_role = self.min_role_for_delete if request.method == "DELETE" else self.min_role_for_write
        return ROLE_RANK[membership.role] >= ROLE_RANK[required_role]
