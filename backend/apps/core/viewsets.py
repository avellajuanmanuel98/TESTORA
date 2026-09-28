"""Organization + project isolation, centralized.

Every ViewSet in the codebase that serves data scoped to an organization (or,
one level deeper, to a project) inherits from OrganizationScopedModelViewSet
instead of re-implementing filtering. This is the one place to audit for
tenant isolation bugs — see architecture notes on Organization isolation.

Usage:
    class TestCaseViewSet(OrganizationScopedModelViewSet):
        organization_lookup = "project__organization"
        project_lookup = "project"
        created_by_field = "created_by"
        ...

`organization_lookup` / `project_lookup` are Django `__`-style lookup paths
from the model to its Organization / Project. They double as Python
attribute paths (split on "__") for object-level permission checks, which
works because model FK field names never contain double underscores.
"""

from rest_framework.exceptions import PermissionDenied
from rest_framework.viewsets import ModelViewSet

from apps.core.permissions import ROLE_RANK, HasProjectRole, IsOrganizationMember


class OrganizationScopedModelViewSet(ModelViewSet):
    permission_classes = [IsOrganizationMember]

    #: lookup from this model to its Organization FK, e.g. "organization" or
    #: "project__organization". Required on every subclass.
    organization_lookup: str = "organization"

    #: lookup from this model to its Project FK, e.g. "" (this model IS the
    #: Project), "project", or "test_case__project". None means this model
    #: is not project-scoped (e.g. Organization itself).
    project_lookup: str | None = None

    #: name of the field to stamp with request.user on create, if any.
    created_by_field: str | None = None

    #: minimum ProjectMembership role required for non-safe methods. Raise
    #: this per-viewset (e.g. to "admin") for sensitive resources such as
    #: project settings or membership management.
    min_write_role: str = "qa_engineer"

    def get_permissions(self):
        permissions = super().get_permissions()
        if self.project_lookup is not None:
            permission = HasProjectRole()
            permission.min_role_for_write = self.min_write_role
            permissions.append(permission)
        return permissions

    def get_queryset(self):
        qs = super().get_queryset().filter(
            **{self.organization_lookup: self.request.organization}
        )
        if self.project_lookup is not None:
            member_lookup = (
                f"{self.project_lookup}__memberships__user"
                if self.project_lookup
                else "memberships__user"
            )
            qs = qs.filter(**{member_lookup: self.request.user}).distinct()
        return qs

    def get_object_project(self, obj):
        """Walk `project_lookup` as attribute access to find the Project an
        object belongs to. Used by HasProjectRole for object-level checks."""
        if not self.project_lookup:
            return obj
        target = obj
        for part in self.project_lookup.split("__"):
            target = getattr(target, part)
        return target

    def get_create_project(self, serializer):
        """Resolve the Project a *new* object will belong to, from the FK
        already validated (and org-scoped) by the serializer field."""
        if self.project_lookup is None:
            return None
        parts = self.project_lookup.split("__")
        target = serializer.validated_data.get(parts[0])
        for part in parts[1:]:
            target = getattr(target, part)
        return target

    def perform_create(self, serializer):
        project = self.get_create_project(serializer)
        if project is not None:
            self._require_write_role(project)
        extra = {}
        if self.created_by_field:
            extra[self.created_by_field] = self.request.user
        serializer.save(**extra)

    def perform_update(self, serializer):
        project = self.get_object_project(serializer.instance)
        if self.project_lookup is not None:
            self._require_write_role(project)
        serializer.save()

    def _require_write_role(self, project):
        from apps.projects.models import ProjectMembership

        membership = ProjectMembership.objects.filter(
            user=self.request.user, project=project
        ).first()
        if membership is None or ROLE_RANK[membership.role] < ROLE_RANK[self.min_write_role]:
            raise PermissionDenied("You do not have write access to this project.")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["organization"] = getattr(self.request, "organization", None)
        return context
