from django.db.models import ProtectedError
from rest_framework.exceptions import ValidationError

from apps.core.viewsets import OrganizationScopedModelViewSet
from apps.environments.models import Environment, EnvironmentVariable
from apps.environments.serializers import EnvironmentSerializer, EnvironmentVariableSerializer


class EnvironmentViewSet(OrganizationScopedModelViewSet):
    organization_lookup = "project__organization"
    project_lookup = "project"
    filterset_fields = ["project"]
    serializer_class = EnvironmentSerializer
    queryset = Environment.objects.select_related("project").prefetch_related("variables")

    def perform_destroy(self, instance):
        # TestRun.environment is on_delete=PROTECT (a run must always be
        # able to say where it ran) — surface that as a clean, actionable
        # error instead of letting ProtectedError bubble up as a 500.
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError(
                {"detail": "No se puede eliminar: este entorno tiene ejecuciones registradas."}
            )


class EnvironmentVariableViewSet(OrganizationScopedModelViewSet):
    organization_lookup = "environment__project__organization"
    project_lookup = "environment__project"
    filterset_fields = ["environment"]
    serializer_class = EnvironmentVariableSerializer
    queryset = EnvironmentVariable.objects.select_related("environment__project")
