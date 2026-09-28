from rest_framework import serializers

from apps.environments.models import Environment
from apps.projects.models import Project
from apps.test_cases.models import TestCase
from apps.test_runs.models import Evidence, StepResult, TestResult, TestRun
from apps.test_suites.models import TestSuite


class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = ["id", "type", "file", "created_at"]
        read_only_fields = fields


class StepResultSerializer(serializers.ModelSerializer):
    evidence = EvidenceSerializer(many=True, read_only=True)

    class Meta:
        model = StepResult
        fields = [
            "id", "order", "action_type", "status", "duration_ms",
            "error_message", "selector_snapshot", "evidence",
        ]
        read_only_fields = fields


class TestResultSerializer(serializers.ModelSerializer):
    test_case_name = serializers.CharField(source="test_case.name", read_only=True)
    step_results = StepResultSerializer(many=True, read_only=True)

    class Meta:
        model = TestResult
        fields = [
            "id", "test_case", "test_case_name", "status", "duration_ms",
            "error_type", "error_message", "started_at", "finished_at", "step_results",
        ]
        read_only_fields = fields


class TestRunListSerializer(serializers.ModelSerializer):
    environment_name = serializers.CharField(source="environment.name", read_only=True)
    suite_name = serializers.SerializerMethodField()
    triggered_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TestRun
        fields = [
            "id", "project", "environment", "environment_name", "suite", "suite_name",
            "status", "triggered_by", "triggered_by_name", "total", "passed", "failed",
            "running", "queued", "skipped", "started_at", "finished_at", "created_at",
        ]
        read_only_fields = fields

    def get_suite_name(self, obj):
        return obj.suite.name if obj.suite_id else None

    def get_triggered_by_name(self, obj):
        return str(obj.triggered_by) if obj.triggered_by_id else None


class TestRunDetailSerializer(TestRunListSerializer):
    test_results = TestResultSerializer(many=True, read_only=True)

    class Meta(TestRunListSerializer.Meta):
        fields = TestRunListSerializer.Meta.fields + ["test_results"]


class TestRunCreateSerializer(serializers.ModelSerializer):
    test_case = serializers.PrimaryKeyRelatedField(
        queryset=TestCase.objects.none(), required=False, write_only=True
    )

    class Meta:
        model = TestRun
        fields = ["id", "project", "environment", "suite", "test_case"]
        read_only_fields = ["id"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        organization = self.context.get("organization")
        if organization is None:
            return
        self.fields["project"].queryset = Project.objects.filter(organization=organization)
        self.fields["environment"].queryset = Environment.objects.filter(project__organization=organization)
        self.fields["suite"].queryset = TestSuite.objects.filter(project__organization=organization)
        self.fields["test_case"].queryset = TestCase.objects.filter(project__organization=organization)

    def validate(self, attrs):
        project = attrs["project"]
        environment = attrs["environment"]
        suite = attrs.get("suite")
        test_case = attrs.get("test_case")
        if environment.project_id != project.id:
            raise serializers.ValidationError({"environment": "El entorno no pertenece a este proyecto."})
        if bool(suite) == bool(test_case):
            raise serializers.ValidationError("Indicá exactamente una suite o un caso de prueba a ejecutar.")
        if suite and suite.project_id != project.id:
            raise serializers.ValidationError({"suite": "La suite no pertenece a este proyecto."})
        if test_case and test_case.project_id != project.id:
            raise serializers.ValidationError({"test_case": "El caso de prueba no pertenece a este proyecto."})
        if suite and not suite.items.exists():
            raise serializers.ValidationError({"suite": "La suite no tiene casos de prueba para ejecutar."})
        return attrs
