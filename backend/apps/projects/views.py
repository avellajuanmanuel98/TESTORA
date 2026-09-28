from rest_framework.exceptions import PermissionDenied

from apps.core.viewsets import OrganizationScopedModelViewSet
from apps.organizations.models import OrganizationMembership
from apps.projects.serializers import (
    ProjectDetailSerializer,
    ProjectListSerializer,
    ProjectWriteSerializer,
)
from apps.projects.models import Project


class ProjectViewSet(OrganizationScopedModelViewSet):
    """Projects are the workspace boundary a QA engineer works inside all
    day. Listing is scoped to organization + the caller's ProjectMembership;
    creating a project is an organization-level action (owner/admin), not a
    project-level one, since the project doesn't exist yet to hold a role."""

    organization_lookup = "organization"
    project_lookup = ""
    created_by_field = "created_by"
    queryset = Project.objects.select_related("organization").prefetch_related(
        "memberships__user"
    )

    def get_serializer_class(self):
        if self.action == "list":
            return ProjectListSerializer
        if self.action == "retrieve":
            return ProjectDetailSerializer
        return ProjectWriteSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        return ProjectListSerializer.annotate_queryset(qs)

    def perform_create(self, serializer):
        membership = OrganizationMembership.objects.filter(
            organization=self.request.organization, user=self.request.user
        ).first()
        if membership is None or membership.role not in (
            OrganizationMembership.ROLE_OWNER,
            OrganizationMembership.ROLE_ADMIN,
        ):
            raise PermissionDenied("Only organization admins can create projects.")
        project = serializer.save(
            organization=self.request.organization, created_by=self.request.user
        )
        from apps.projects.models import ProjectMembership

        ProjectMembership.objects.create(
            project=project, user=self.request.user, role=ProjectMembership.ROLE_ADMIN
        )
