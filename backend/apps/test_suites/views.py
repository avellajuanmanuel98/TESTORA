from django.db import IntegrityError, transaction
from django.db.models import Max
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.core.viewsets import OrganizationScopedModelViewSet
from apps.test_suites.models import TestSuite, TestSuiteItem
from apps.test_suites.serializers import (
    TestSuiteDetailSerializer,
    TestSuiteItemSerializer,
    TestSuiteListSerializer,
    TestSuiteWriteSerializer,
)

# See apps/test_cases/views.py::TEMP_ORDER_OFFSET for why this two-pass
# shift is needed (dodges the (suite, order) unique constraint mid-update).
TEMP_ORDER_OFFSET = 1_000_000


class TestSuiteViewSet(OrganizationScopedModelViewSet):
    organization_lookup = "project__organization"
    project_lookup = "project"
    filterset_fields = ["project"]
    queryset = TestSuite.objects.select_related("project").prefetch_related("items__test_case")

    def get_serializer_class(self):
        if self.action == "list":
            return TestSuiteListSerializer
        if self.action == "retrieve":
            return TestSuiteDetailSerializer
        return TestSuiteWriteSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "list":
            qs = TestSuiteListSerializer.annotate_queryset(qs)
        return qs

    @action(detail=True, methods=["post"], url_path="reorder-items")
    def reorder_items(self, request, pk=None):
        suite = self.get_object()
        item_ids = request.data.get("item_ids", [])
        current_ids = set(suite.items.values_list("id", flat=True))
        if set(item_ids) != current_ids:
            return Response(
                {"detail": "item_ids must include exactly the suite's current items."}, status=400
            )
        with transaction.atomic():
            for offset, item_id in enumerate(item_ids):
                TestSuiteItem.objects.filter(pk=item_id).update(order=TEMP_ORDER_OFFSET + offset)
            for offset, item_id in enumerate(item_ids):
                TestSuiteItem.objects.filter(pk=item_id).update(order=offset + 1)
        # suite.items.all() would hit the prefetch_related cache from
        # get_object() — stale now. Query fresh, same as reorder_steps.
        fresh_items = TestSuiteItem.objects.filter(suite=suite).order_by("order")
        return Response(TestSuiteItemSerializer(fresh_items, many=True).data)


class TestSuiteItemViewSet(OrganizationScopedModelViewSet):
    organization_lookup = "suite__project__organization"
    project_lookup = "suite__project"
    filterset_fields = ["suite"]
    serializer_class = TestSuiteItemSerializer
    queryset = TestSuiteItem.objects.select_related("suite__project", "test_case")

    def perform_create(self, serializer):
        suite = serializer.validated_data["suite"]
        self._require_write_role(suite.project)
        test_case = serializer.validated_data["test_case"]
        if suite.items.filter(test_case=test_case).exists():
            raise ValidationError({"test_case": "Este caso de prueba ya está en la suite."})
        try:
            with transaction.atomic():
                if serializer.validated_data.get("order") is None:
                    next_order = (suite.items.aggregate(max_order=Max("order"))["max_order"] or 0) + 1
                    serializer.save(order=next_order)
                else:
                    serializer.save()
        except IntegrityError:
            # Two requests racing to append to the same suite at once.
            raise ValidationError({"detail": "No se pudo agregar el caso de prueba, probá de nuevo."})
