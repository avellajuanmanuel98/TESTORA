from rest_framework import serializers

from apps.automation.models import RecordingSession


class RecordingSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecordingSession
        fields = [
            "id",
            "test_case",
            "environment",
            "status",
            "steps_captured",
            "error_message",
            "created_at",
            "finished_at",
        ]
        read_only_fields = fields
