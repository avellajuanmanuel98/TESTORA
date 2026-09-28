from rest_framework import serializers

from apps.environments.models import Environment, EnvironmentVariable

MASK = "••••••••"


class EnvironmentVariableSerializer(serializers.ModelSerializer):
    value = serializers.SerializerMethodField()

    class Meta:
        model = EnvironmentVariable
        fields = ["id", "environment", "key", "value", "is_secret", "updated_at"]
        read_only_fields = ["id", "updated_at"]
        extra_kwargs = {"environment": {"write_only": True}}

    def get_value(self, obj):
        return MASK if obj.is_secret else obj.value

    def validate_key(self, key):
        if not key.replace("_", "").isalnum() or not key[:1].isalpha():
            raise serializers.ValidationError(
                "Use only letters, numbers and underscores, starting with a letter — e.g. BASE_URL."
            )
        return key.upper()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        organization = self.context.get("organization")
        if organization is not None and "environment" in self.fields:
            self.fields["environment"].queryset = Environment.objects.filter(
                project__organization=organization
            )


class EnvironmentSerializer(serializers.ModelSerializer):
    variables = EnvironmentVariableSerializer(many=True, read_only=True)

    class Meta:
        model = Environment
        fields = [
            "id",
            "project",
            "name",
            "base_url",
            "browser",
            "browser_config",
            "variables",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {"project": {"write_only": True}}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        organization = self.context.get("organization")
        if organization is not None and "project" in self.fields:
            from apps.projects.models import Project

            self.fields["project"].queryset = Project.objects.filter(organization=organization)
