from rest_framework import serializers

from apps.test_cases.actions import ACTIONS_BY_KEY, validate_params
from apps.test_cases.models import TestCase, TestStep


def render_summary(action_key: str, params: dict) -> str:
    action = ACTIONS_BY_KEY.get(action_key)
    if action is None:
        return action_key
    try:
        return action.summary_template.format(**{**{p.key: "" for p in action.params}, **params})
    except (KeyError, IndexError):
        return action.label


class TestStepSerializer(serializers.ModelSerializer):
    summary = serializers.SerializerMethodField()
    action_label = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()

    class Meta:
        model = TestStep
        fields = [
            "id",
            "test_case",
            "order",
            "action_type",
            "action_label",
            "category",
            "params",
            "summary",
            "timeout_ms",
            "screenshot_on_fail",
            "enabled",
            "note",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]
        extra_kwargs = {"test_case": {"write_only": True}}

    def get_summary(self, obj):
        return render_summary(obj.action_type, obj.params)

    def get_action_label(self, obj):
        action = ACTIONS_BY_KEY.get(obj.action_type)
        return action.label if action else obj.action_type

    def get_category(self, obj):
        action = ACTIONS_BY_KEY.get(obj.action_type)
        return action.category if action else "unknown"

    def validate(self, attrs):
        action_type = attrs.get("action_type", getattr(self.instance, "action_type", None))
        params = attrs.get("params", getattr(self.instance, "params", {}))
        try:
            validate_params(action_type, params)
        except ValueError as exc:
            raise serializers.ValidationError({"params": str(exc)}) from exc
        return attrs

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        organization = self.context.get("organization")
        if organization is not None and "test_case" in self.fields:
            self.fields["test_case"].queryset = TestCase.objects.filter(
                project__organization=organization
            )


class TestCaseListSerializer(serializers.ModelSerializer):
    step_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = TestCase
        fields = ["id", "project", "name", "description", "tags", "status", "step_count", "updated_at"]
        read_only_fields = ["id", "step_count", "updated_at"]


class TestCaseDetailSerializer(TestCaseListSerializer):
    steps = TestStepSerializer(many=True, read_only=True)

    class Meta(TestCaseListSerializer.Meta):
        fields = TestCaseListSerializer.Meta.fields + ["steps"]


class TestCaseWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestCase
        fields = ["id", "project", "name", "description", "tags", "status"]
        read_only_fields = ["id"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        organization = self.context.get("organization")
        if organization is not None and "project" in self.fields:
            from apps.projects.models import Project

            self.fields["project"].queryset = Project.objects.filter(organization=organization)
