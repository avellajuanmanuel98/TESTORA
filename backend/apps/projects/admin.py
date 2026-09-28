from django.contrib import admin

from apps.projects.models import Project, ProjectMembership


class ProjectMembershipInline(admin.TabularInline):
    model = ProjectMembership
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "status", "created_at")
    list_filter = ("organization", "status")
    inlines = [ProjectMembershipInline]


@admin.register(ProjectMembership)
class ProjectMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "project", "role")
    list_filter = ("role",)
