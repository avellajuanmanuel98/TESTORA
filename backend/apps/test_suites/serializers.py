from django.db.models import Count
from rest_framework import serializers

from apps.projects.models import Project
from apps.test_cases.models import TestCase
from apps.test_suites.models import TestSuite, TestSuiteItem


class TestSuiteItemSerializer(serializers.ModelSerializer):
    test_case_name = serializers.CharField(source="test_case.name", read_only=True)
    test_case_status = serializers.CharField(source="test_case.status", read_only=True)

    class Meta:
        model = TestSuiteItem
        fields = ["id", "suite", "test_case", "test_case_name", "test_case_status", "order"]
        read_only_fields = ["id"]
        extra_kwargs = {
            "suite": {"write_only": True},
            # Optional on write: TestSuiteItemViewSet.perform_create
            # auto-assigns the next order when the client omits it.
            "order": {"required": False},
        }
        # See TestStepSerializer for why: DRF derives UniqueTogetherValidators
        # from the model's UniqueConstraints (suite+order, suite+test_case),
        # which would force `order` to be required again. The DB constraints
        # already guard integrity.
        validators = []

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        organization = self.context.get("organization")
        if organization is None:
            return
        if "suite" in self.fields:
            self.fields["suite"].queryset = TestSuite.objects.filter(project__organization=organization)
        if "test_case" in self.fields:
            self.fields["test_case"].queryset = TestCase.objects.filter(project__organization=organization)


class TestSuiteListSerializer(serializers.ModelSerializer):
    test_case_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = TestSuite
        fields = ["id", "project", "name", "description", "test_case_count", "created_at", "updated_at"]
        read_only_fields = ["id", "test_case_count", "created_at", "updated_at"]
        extra_kwargs = {"project": {"write_only": True}}

    @staticmethod
    def annotate_queryset(queryset):
        return queryset.annotate(test_case_count=Count("items", distinct=True))


class TestSuiteDetailSerializer(TestSuiteListSerializer):
    items = TestSuiteItemSerializer(many=True, read_only=True)

    class Meta(TestSuiteListSerializer.Meta):
        fields = TestSuiteListSerializer.Meta.fields + ["items"]


class TestSuiteWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestSuite
        fields = ["id", "project", "name", "description"]
        read_only_fields = ["id"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        organization = self.context.get("organization")
        if organization is not None and "project" in self.fields:
            self.fields["project"].queryset = Project.objects.filter(organization=organization)
