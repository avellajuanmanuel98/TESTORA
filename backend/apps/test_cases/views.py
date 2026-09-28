from django.db import transaction
from django.db.models import Count, Max
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.viewsets import OrganizationScopedModelViewSet
from apps.test_cases.actions import ACTIONS
from apps.test_cases.models import TestCase, TestStep
from apps.test_cases.serializers import (
    TestCaseDetailSerializer,
    TestCaseListSerializer,
    TestCaseWriteSerializer,
    TestStepSerializer,
)

# A step count no real test case will ever reach; used as a scratch offset
# when temporarily reordering steps to dodge the (test_case, order) unique
# constraint (see reorder_steps and duplicate below).
TEMP_ORDER_OFFSET = 1_000_000


class ActionsView(APIView):
    """Exposes the action registry so the Test Case Builder renders each
    step's parameter form dynamically, instead of hardcoding one per type."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            [
                {
                    "key": a.key,
                    "label": a.label,
                    "category": a.category,
                    "params": [
                        {
                            "key": p.key,
                            "label": p.label,
                            "type": p.type,
                            "required": p.required,
                            "placeholder": p.placeholder,
                            "help_text": p.help_text,
                            "choices": list(p.choices),
                        }
                        for p in a.params
                    ],
                }
                for a in ACTIONS
            ]
        )


class TestCaseViewSet(OrganizationScopedModelViewSet):
    organization_lookup = "project__organization"
    project_lookup = "project"
    created_by_field = "created_by"
    # Deleting a test case is permanent (cascades its steps and run
    # history) — reserved for admins, unlike editing it day-to-day.
    min_delete_role = "admin"
    filterset_fields = ["project", "status"]
    queryset = TestCase.objects.select_related("project").prefetch_related("steps")

    def get_serializer_class(self):
        if self.action == "list":
            return TestCaseListSerializer
        if self.action == "retrieve":
            return TestCaseDetailSerializer
        return TestCaseWriteSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "list":
            qs = qs.annotate(step_count=Count("steps", distinct=True))
        return qs

    def perform_update(self, serializer):
        project = self.get_object_project(serializer.instance)
        self._require_write_role(project)
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="reorder-steps")
    def reorder_steps(self, request, pk=None):
        test_case = self.get_object()
        step_ids = request.data.get("step_ids", [])
        steps = {s.id: s for s in test_case.steps.all()}
        if set(step_ids) != set(steps.keys()):
            return Response(
                {"detail": "step_ids must include exactly the test case's current steps."},
                status=400,
            )
        with transaction.atomic():
            # Two passes to dodge the (test_case, order) unique constraint
            # while the new ordering is applied. order is a PositiveIntegerField
            # (DB-level >= 0 check), so the temporary slot has to be a large
            # positive offset rather than a negative number.
            for offset, step_id in enumerate(step_ids):
                TestStep.objects.filter(pk=step_id).update(order=TEMP_ORDER_OFFSET + offset)
            for offset, step_id in enumerate(step_ids):
                TestStep.objects.filter(pk=step_id).update(order=offset + 1)
        # test_case.steps.all() would return the queryset prefetch_related
        # cached at get_object() time — stale now that we've just updated
        # order. Query fresh instead.
        fresh_steps = TestStep.objects.filter(test_case=test_case).order_by("order")
        return Response(TestStepSerializer(fresh_steps, many=True).data)


class TestStepViewSet(OrganizationScopedModelViewSet):
    organization_lookup = "test_case__project__organization"
    project_lookup = "test_case__project"
    filterset_fields = ["test_case"]
    serializer_class = TestStepSerializer
    queryset = TestStep.objects.select_related("test_case__project")

    def perform_create(self, serializer):
        test_case = serializer.validated_data["test_case"]
        self._require_write_role(test_case.project)
        if serializer.validated_data.get("order") is None:
            next_order = (
                test_case.steps.aggregate(max_order=Max("order"))["max_order"] or 0
            ) + 1
            serializer.save(order=next_order)
        else:
            serializer.save()

    def perform_update(self, serializer):
        self._require_write_role(serializer.instance.test_case.project)
        serializer.save()

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        original = self.get_object()
        self._require_write_role(original.test_case.project)
        with transaction.atomic():
            # Shift steps after this one up by one slot, in two passes (via
            # temporary negative orders) so the bulk update never collides
            # with the (test_case, order) unique constraint mid-flight —
            # same technique as reorder_steps.
            shifting_ids = list(
                original.test_case.steps.filter(order__gt=original.order)
                .order_by("order")
                .values_list("id", flat=True)
            )
            for offset, step_id in enumerate(shifting_ids):
                TestStep.objects.filter(pk=step_id).update(order=TEMP_ORDER_OFFSET + offset)
            for offset, step_id in enumerate(shifting_ids):
                TestStep.objects.filter(pk=step_id).update(order=original.order + 2 + offset)

            copy = TestStep.objects.create(
                test_case=original.test_case,
                order=original.order + 1,
                action_type=original.action_type,
                params=original.params,
                timeout_ms=original.timeout_ms,
                screenshot_on_fail=original.screenshot_on_fail,
                enabled=original.enabled,
                note=original.note,
            )
        return Response(TestStepSerializer(copy).data, status=201)
