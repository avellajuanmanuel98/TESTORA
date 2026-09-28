from django.contrib import admin

from apps.test_runs.models import Evidence, StepResult, TestResult, TestRun


class EvidenceInline(admin.TabularInline):
    model = Evidence
    extra = 0


class StepResultInline(admin.TabularInline):
    model = StepResult
    extra = 0
    ordering = ["order"]


class TestResultInline(admin.TabularInline):
    model = TestResult
    extra = 0


@admin.register(TestRun)
class TestRunAdmin(admin.ModelAdmin):
    list_display = ("id", "project", "environment", "status", "triggered_by", "created_at")
    list_filter = ("project", "status")
    inlines = [TestResultInline]


@admin.register(TestResult)
class TestResultAdmin(admin.ModelAdmin):
    list_display = ("id", "run", "test_case", "status", "duration_ms")
    list_filter = ("status",)
    inlines = [StepResultInline]


@admin.register(StepResult)
class StepResultAdmin(admin.ModelAdmin):
    list_display = ("id", "test_result", "order", "action_type", "status")
    inlines = [EvidenceInline]
