"""Reports — aggregate queries over existing TestRun/TestResult data.

No new models: this is a read-only view over data owned by apps.test_runs.
Answers a small set of concrete questions (pass rate, flaky tests, tests
that fail most, duration by suite) rather than a general-purpose metrics
builder — see the architecture notes' Fase 3 scope.
"""

from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsOrganizationMember
from apps.projects.models import Project, ProjectMembership
from apps.test_runs.models import TestResult, TestRun, reclaim_stale_runs

FINISHED_STATUSES = [TestResult.STATUS_PASSED, TestResult.STATUS_FAILED, TestResult.STATUS_ERROR]
ACTIVE_RUN_STATUSES = [TestRun.STATUS_QUEUED, TestRun.STATUS_RUNNING]
FINISHED_RUN_STATUSES = [TestRun.STATUS_PASSED, TestRun.STATUS_FAILED, TestRun.STATUS_ERROR]


class ProjectReportView(APIView):
    """GET /api/reports/summary/?project=<id>

    Never trusts the project id alone — same isolation guarantee as every
    ModelViewSet: the project must belong to request.organization (set by
    IsOrganizationMember from the authenticated user, never from the
    client), and the user must actually be a member of it.
    """

    permission_classes = [IsOrganizationMember]

    def get(self, request):
        project_id = request.query_params.get("project")
        project = get_object_or_404(Project, pk=project_id, organization=request.organization)
        if not ProjectMembership.objects.filter(user=request.user, project=project).exists():
            raise PermissionDenied("No tenés acceso a este proyecto.")

        results = TestResult.objects.filter(run__project=project, status__in=FINISHED_STATUSES)
        total = results.count()
        passed = results.filter(status=TestResult.STATUS_PASSED).count()
        pass_rate = round(passed / total * 100, 1) if total else None

        by_test_case = results.values("test_case", "test_case__name").annotate(
            passed_count=Count("id", filter=Q(status=TestResult.STATUS_PASSED)),
            failed_count=Count(
                "id", filter=Q(status__in=[TestResult.STATUS_FAILED, TestResult.STATUS_ERROR])
            ),
        )

        flaky_tests = [
            {"id": row["test_case"], "name": row["test_case__name"], "passed": row["passed_count"], "failed": row["failed_count"]}
            for row in by_test_case
            if row["passed_count"] > 0 and row["failed_count"] > 0
        ]

        top_failing = sorted(
            (row for row in by_test_case if row["failed_count"] > 0),
            key=lambda row: row["failed_count"],
            reverse=True,
        )[:5]
        top_failing = [
            {"id": row["test_case"], "name": row["test_case__name"], "failed": row["failed_count"]}
            for row in top_failing
        ]

        duration_by_suite = (
            TestRun.objects.filter(project=project, suite__isnull=False, finished_at__isnull=False)
            .values("suite__id", "suite__name")
            .annotate(avg_duration_ms=Avg("test_results__duration_ms"), run_count=Count("id", distinct=True))
            .order_by("suite__name")
        )
        duration_by_suite = [
            {
                "suite_id": row["suite__id"],
                "suite_name": row["suite__name"],
                "avg_duration_ms": round(row["avg_duration_ms"]) if row["avg_duration_ms"] else None,
                "run_count": row["run_count"],
            }
            for row in duration_by_suite
        ]

        return Response(
            {
                "total_results": total,
                "passed": passed,
                "failed": total - passed,
                "pass_rate": pass_rate,
                "flaky_tests": flaky_tests,
                "top_failing": top_failing,
                "duration_by_suite": duration_by_suite,
            }
        )


def _run_summary(run):
    return {
        "id": run.id,
        "project": run.project_id,
        "project_name": run.project.name,
        "status": run.status,
        "suite_name": run.suite.name if run.suite_id else None,
        "total": run.total,
        "passed": run.passed,
        "failed": run.failed,
        "started_at": run.started_at,
        "finished_at": run.finished_at,
    }


class OrgOverviewView(APIView):
    """GET /api/reports/overview/

    Cross-project health snapshot for the global Dashboard: only ever scoped
    to request.organization and, within it, to the projects the requesting
    user actually belongs to (ProjectMembership) — never every project in
    the org regardless of access.
    """

    permission_classes = [IsOrganizationMember]

    def get(self, request):
        projects = Project.objects.filter(
            organization=request.organization, memberships__user=request.user
        )
        reclaim_stale_runs(TestRun.objects.filter(project__in=projects))

        results = TestResult.objects.filter(run__project__in=projects, status__in=FINISHED_STATUSES)
        total = results.count()
        passed = results.filter(status=TestResult.STATUS_PASSED).count()
        pass_rate = round(passed / total * 100, 1) if total else None

        by_test_case = results.values(
            "test_case", "test_case__name", "run__project__name"
        ).annotate(
            passed_count=Count("id", filter=Q(status=TestResult.STATUS_PASSED)),
            failed_count=Count(
                "id", filter=Q(status__in=[TestResult.STATUS_FAILED, TestResult.STATUS_ERROR])
            ),
        )
        needs_attention = sorted(
            (row for row in by_test_case if row["failed_count"] > 0),
            key=lambda row: row["failed_count"],
            reverse=True,
        )[:5]
        needs_attention = [
            {
                "id": row["test_case"],
                "name": row["test_case__name"],
                "project_name": row["run__project__name"],
                "passed": row["passed_count"],
                "failed": row["failed_count"],
                "flaky": row["passed_count"] > 0 and row["failed_count"] > 0,
            }
            for row in needs_attention
        ]

        active_runs = (
            TestRun.objects.filter(project__in=projects, status__in=ACTIVE_RUN_STATUSES)
            .select_related("project", "suite")
            .order_by("-created_at")[:5]
        )
        recent_runs = (
            TestRun.objects.filter(project__in=projects, status__in=FINISHED_RUN_STATUSES)
            .select_related("project", "suite")
            .order_by("-finished_at")[:5]
        )

        return Response(
            {
                "total_results": total,
                "passed": passed,
                "failed": total - passed,
                "pass_rate": pass_rate,
                "needs_attention": needs_attention,
                "active_runs": [_run_summary(r) for r in active_runs],
                "recent_runs": [_run_summary(r) for r in recent_runs],
            }
        )
