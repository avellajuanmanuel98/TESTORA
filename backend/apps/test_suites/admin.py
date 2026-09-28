from django.contrib import admin

from apps.test_suites.models import TestSuite, TestSuiteItem


class TestSuiteItemInline(admin.TabularInline):
    model = TestSuiteItem
    extra = 0
    ordering = ["order"]


@admin.register(TestSuite)
class TestSuiteAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "updated_at")
    list_filter = ("project",)
    inlines = [TestSuiteItemInline]
