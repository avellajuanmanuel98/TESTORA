from django.contrib import admin

from apps.test_cases.models import TestCase, TestStep


class TestStepInline(admin.TabularInline):
    model = TestStep
    extra = 0
    ordering = ["order"]


@admin.register(TestCase)
class TestCaseAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "status", "updated_at")
    list_filter = ("project", "status")
    inlines = [TestStepInline]
