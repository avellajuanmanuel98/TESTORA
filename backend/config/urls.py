from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.environments.views import EnvironmentVariableViewSet, EnvironmentViewSet
from apps.projects.views import ProjectViewSet
from apps.test_cases.views import ActionsView, TestCaseViewSet, TestStepViewSet

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")
router.register("environments", EnvironmentViewSet, basename="environment")
router.register("environment-variables", EnvironmentVariableViewSet, basename="environment-variable")
router.register("test-cases", TestCaseViewSet, basename="test-case")
router.register("test-steps", TestStepViewSet, basename="test-step")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/actions/", ActionsView.as_view(), name="actions"),
    path("api/", include("apps.users.urls")),
]
