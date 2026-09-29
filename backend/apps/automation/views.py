from rest_framework import mixins, viewsets

from apps.automation.models import RecordingSession
from apps.automation.serializers import RecordingSessionSerializer
from apps.core.permissions import IsOrganizationMember


class RecordingSessionViewSet(mixins.RetrieveModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    """Read-only — the frontend polls GET /recording-sessions/{id}/ while a
    recording is in progress, and lists ?test_case=<id>&status=recording on
    the Builder's mount to discover an already-active recording it didn't
    itself start (a different tab, an earlier session, one left stuck by a
    worker restart) — otherwise a stale "recording" row is invisible to
    anyone who didn't literally click the button that created it, with no
    way to even cancel it. Sessions are created via
    TestCaseViewSet.start_recording, never directly."""

    permission_classes = [IsOrganizationMember]
    serializer_class = RecordingSessionSerializer
    filterset_fields = ["test_case", "status"]
    queryset = RecordingSession.objects.select_related("test_case__project")

    def get_queryset(self):
        return super().get_queryset().filter(
            test_case__project__organization=self.request.organization
        )
