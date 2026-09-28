from django.db.models import Count, Max
from rest_framework import serializers

from apps.projects.models import Project, ProjectMembership
from apps.users.serializers import UserSerializer


class ProjectMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ProjectMembership
        fields = ["id", "user", "role", "created_at"]
        read_only_fields = fields


class ProjectListSerializer(serializers.ModelSerializer):
    test_case_count = serializers.IntegerField(read_only=True)
    last_activity_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "status",
            "test_case_count",
            "last_activity_at",
            "created_at",
        ]
        read_only_fields = ["id", "slug", "test_case_count", "last_activity_at", "created_at"]

    @staticmethod
    def annotate_queryset(queryset):
        return queryset.annotate(
            test_case_count=Count("test_cases", distinct=True),
            last_activity_at=Max("test_cases__updated_at"),
        )


class ProjectDetailSerializer(ProjectListSerializer):
    members = ProjectMembershipSerializer(many=True, read_only=True, source="memberships")

    class Meta(ProjectListSerializer.Meta):
        fields = ProjectListSerializer.Meta.fields + ["members"]


class ProjectWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "name", "description", "status"]
        read_only_fields = ["id"]
