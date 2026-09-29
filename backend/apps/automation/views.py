from rest_framework import mixins, viewsets

from apps.automation.models import RecordingSession
from apps.automation.serializers import RecordingSessionSerializer
from apps.core.permissions import IsOrganizationMember


class RecordingSessionViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Read-only — the frontend polls GET /recording-sessions/{id}/ while a
    recording is in progress. Sessions are created via
    TestCaseViewSet.start_recording, never directly."""

    permission_classes = [IsOrganizationMember]
    serializer_class = RecordingSessionSerializer
    queryset = RecordingSession.objects.select_related("test_case__project")

    def get_queryset(self):
        return super().get_queryset().filter(
            test_case__project__organization=self.request.organization
        )
