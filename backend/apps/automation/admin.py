from django.contrib import admin

from apps.automation.models import RecordingSession


@admin.register(RecordingSession)
class RecordingSessionAdmin(admin.ModelAdmin):
    list_display = ["id", "test_case", "environment", "status", "steps_captured", "started_by", "created_at"]
    list_filter = ["status"]
    readonly_fields = [f.name for f in RecordingSession._meta.fields]
