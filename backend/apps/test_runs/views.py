from django.db import transaction

from apps.core.viewsets import OrganizationScopedModelViewSet
from apps.test_runs.models import TestResult, TestRun
from apps.test_runs.serializers import (
    TestRunCreateSerializer,
    TestRunDetailSerializer,
    TestRunListSerializer,
)


class TestRunViewSet(OrganizationScopedModelViewSet):
    organization_lookup = "project__organization"
    project_lookup = "project"
    # Runs are append-only once created — no update/delete endpoint.
    http_method_names = ["get", "post", "head", "options"]
    filterset_fields = ["project", "status", "suite"]
    queryset = TestRun.objects.select_related("project", "environment", "suite", "triggered_by")

    def get_serializer_class(self):
        if self.action == "create":
            return TestRunCreateSerializer
        if self.action == "retrieve":
            return TestRunDetailSerializer
        return TestRunListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "retrieve":
            qs = qs.prefetch_related("test_results__test_case", "test_results__step_results__evidence")
        return qs

    def perform_create(self, serializer):
        # Imported here, not at module level, so importing this view module
        # never requires Celery/Selenium to be importable (e.g. in tests
        # that only exercise the API surface).
        from apps.automation.tasks import execute_test_run

        project = self.get_create_project(serializer)
        self._require_write_role(project)

        suite = serializer.validated_data.get("suite")
        test_case = serializer.validated_data.pop("test_case", None)

        with transaction.atomic():
            run = serializer.save(triggered_by=self.request.user)
            test_cases = (
                [item.test_case for item in suite.items.select_related("test_case").order_by("order")]
                if suite
                else [test_case]
            )
            TestResult.objects.bulk_create([TestResult(run=run, test_case=tc) for tc in test_cases])
            # Selenium never runs inside the request/response cycle: this
            # only fires once the row above is actually committed, so the
            # worker can never race a not-yet-visible TestRun.
            transaction.on_commit(lambda: execute_test_run.delay(run.id))
