from django.contrib import admin

from apps.environments.models import Environment, EnvironmentVariable


class EnvironmentVariableInline(admin.TabularInline):
    model = EnvironmentVariable
    extra = 0


@admin.register(Environment)
class EnvironmentAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "base_url", "browser")
    list_filter = ("project", "browser")
    inlines = [EnvironmentVariableInline]
