from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.users.models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ["email"]
    list_display = ["email", "full_name", "is_staff", "is_active"]
    search_fields = ["email", "full_name", "username"]
    # full_name (not Django's built-in first_name/last_name) is what the
    # app actually displays everywhere — it isn't in DjangoUserAdmin's
    # default fieldsets, so it was impossible to edit from this screen.
    fieldsets = DjangoUserAdmin.fieldsets + (("Assuria", {"fields": ("full_name",)}),)
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (("Assuria", {"fields": ("full_name",)}),)
