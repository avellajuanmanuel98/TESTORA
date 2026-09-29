from django.contrib import admin

from apps.automation.models import RecordingSession


@admin.register(RecordingSession)
class RecordingSessionAdmin(admin.ModelAdmin):
    list_display = ["id", "test_case", "environment", "status", "steps_captured", "started_by", "created_at"]
    list_filter = ["status"]
    # status/error_message stay editable — the escape hatch for a session
    # stuck "recording" because its task never actually ran (worker was
    # down, code mismatch after a deploy, etc.). Everything else is a
    # record of what happened, not meant to be hand-edited.
    readonly_fields = [f.name for f in RecordingSession._meta.fields if f.name not in ("status", "error_message")]
