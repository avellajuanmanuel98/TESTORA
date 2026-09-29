from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.environments.views import EnvironmentVariableViewSet, EnvironmentViewSet
from apps.projects.views import ProjectViewSet
from apps.reports.views import OrgOverviewView, ProjectReportView
from apps.test_cases.views import ActionsView, TestCaseViewSet, TestStepViewSet
from apps.test_runs.views import TestRunViewSet
from apps.test_suites.views import TestSuiteItemViewSet, TestSuiteViewSet

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")
router.register("environments", EnvironmentViewSet, basename="environment")
router.register("environment-variables", EnvironmentVariableViewSet, basename="environment-variable")
router.register("test-cases", TestCaseViewSet, basename="test-case")
router.register("test-steps", TestStepViewSet, basename="test-step")
router.register("test-suites", TestSuiteViewSet, basename="test-suite")
router.register("test-suite-items", TestSuiteItemViewSet, basename="test-suite-item")
router.register("test-runs", TestRunViewSet, basename="test-run")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/actions/", ActionsView.as_view(), name="actions"),
    path("api/reports/summary/", ProjectReportView.as_view(), name="reports-summary"),
    path("api/reports/overview/", OrgOverviewView.as_view(), name="reports-overview"),
    path("api/", include("apps.users.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
