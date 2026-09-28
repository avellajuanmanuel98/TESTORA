from apps.core.viewsets import OrganizationScopedModelViewSet
from apps.environments.models import Environment, EnvironmentVariable
from apps.environments.serializers import EnvironmentSerializer, EnvironmentVariableSerializer


class EnvironmentViewSet(OrganizationScopedModelViewSet):
    organization_lookup = "project__organization"
    project_lookup = "project"
    filterset_fields = ["project"]
    serializer_class = EnvironmentSerializer
    queryset = Environment.objects.select_related("project").prefetch_related("variables")


class EnvironmentVariableViewSet(OrganizationScopedModelViewSet):
    organization_lookup = "environment__project__organization"
    project_lookup = "environment__project"
    filterset_fields = ["environment"]
    serializer_class = EnvironmentVariableSerializer
    queryset = EnvironmentVariable.objects.select_related("environment__project")
