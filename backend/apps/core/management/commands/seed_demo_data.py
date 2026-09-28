from django.core.management.base import BaseCommand
from django.db import transaction

from apps.environments.models import Environment, EnvironmentVariable
from apps.organizations.models import Organization, OrganizationMembership
from apps.projects.models import Project, ProjectMembership
from apps.test_cases.models import TestCase, TestStep
from apps.users.models import User

DEMO_USERS = [
    dict(email="admin@testora.dev", full_name="Camila Ibarra", org_role="owner", project_role="admin", password="Testora123!"),
    dict(email="sofia.ramirez@testora.dev", full_name="Sofía Ramírez", org_role="member", project_role="qa_manager", password="Testora123!"),
    dict(email="diego.torres@testora.dev", full_name="Diego Torres", org_role="member", project_role="qa_engineer", password="Testora123!"),
    dict(email="valentina.cruz@testora.dev", full_name="Valentina Cruz", org_role="member", project_role="qa_engineer", password="Testora123!"),
    dict(email="martin.lopez@testora.dev", full_name="Martín López", org_role="member", project_role="viewer", password="Testora123!"),
]

ENVIRONMENTS = [
    dict(name="DEV", base_url="https://dev.fenixqa.example.com", variables={
        "BASE_URL": ("https://dev.fenixqa.example.com", False),
        "USERNAME": ("qa_user", False),
        "PASSWORD": ("Fenix#Dev2024", True),
        "CUSTOMER_ID": ("48213", False),
    }),
    dict(name="QA", base_url="https://qa.fenixqa.example.com", variables={
        "BASE_URL": ("https://qa.fenixqa.example.com", False),
        "USERNAME": ("qa_user", False),
        "PASSWORD": ("Fenix#Qa2024", True),
        "CUSTOMER_ID": ("48213", False),
    }),
    dict(name="UAT", base_url="https://uat.fenixqa.example.com", variables={
        "BASE_URL": ("https://uat.fenixqa.example.com", False),
        "USERNAME": ("qa_user_uat", False),
        "PASSWORD": ("Fenix#Uat2024", True),
        "CUSTOMER_ID": ("91027", False),
    }),
]

TEST_CASES = [
    dict(
        name="Login válido",
        description="Verifica que un usuario con credenciales correctas pueda acceder al panel principal.",
        tags=["smoke", "authentication"],
        status="active",
        steps=[
            ("open_url", {"url": "{{BASE_URL}}/login"}),
            ("input_text", {"selector": "#username", "value": "{{USERNAME}}"}),
            ("input_text", {"selector": "#password", "value": "{{PASSWORD}}"}),
            ("click", {"selector": "#login-button"}),
            ("assert_element_visible", {"selector": "[data-testid='dashboard']"}),
        ],
    ),
    dict(
        name="Login con credenciales inválidas",
        description="Verifica que el sistema rechace un intento de acceso con contraseña incorrecta.",
        tags=["regression", "authentication"],
        status="active",
        steps=[
            ("open_url", {"url": "{{BASE_URL}}/login"}),
            ("input_text", {"selector": "#username", "value": "{{USERNAME}}"}),
            ("input_text", {"selector": "#password", "value": "clave-incorrecta"}),
            ("click", {"selector": "#login-button"}),
            ("assert_text", {"selector": ".alert-error", "value": "Credenciales inválidas"}),
        ],
    ),
    dict(
        name="Búsqueda de contravención por placa",
        description="Busca una contravención existente utilizando la placa del vehículo.",
        tags=["regression", "contravenciones"],
        status="active",
        steps=[
            ("open_url", {"url": "{{BASE_URL}}/contravenciones"}),
            ("input_text", {"selector": "#plate-search", "value": "AB123CD"}),
            ("click", {"selector": "#search-button"}),
            ("wait_until", {"selector": ".result-row", "timeout_ms": "5000"}),
            ("assert_element_exists", {"selector": ".result-row"}),
        ],
    ),
    dict(
        name="Crear impugnación",
        description="Registra una nueva impugnación asociada a una contravención existente.",
        tags=["regression", "impugnaciones"],
        status="active",
        steps=[
            ("open_url", {"url": "{{BASE_URL}}/contravenciones/AB123CD/impugnar"}),
            ("input_text", {"selector": "#reason", "value": "Notificación fuera de plazo"}),
            ("click", {"selector": "#submit-impugnation"}),
            ("assert_text", {"selector": ".toast-success", "value": "Impugnación registrada"}),
        ],
    ),
    dict(
        name="Actualizar observación de contravención",
        description="Edita el campo de observaciones de una contravención y confirma el guardado.",
        tags=["regression", "contravenciones"],
        status="draft",
        steps=[
            ("open_url", {"url": "{{BASE_URL}}/contravenciones/AB123CD"}),
            ("click", {"selector": "#edit-observation"}),
            ("clear", {"selector": "#observation-field"}),
            ("input_text", {"selector": "#observation-field", "value": "Vehículo trasladado a depósito municipal."}),
            ("click", {"selector": "#save-observation"}),
            ("assert_text", {"selector": ".toast-success", "value": "Observación actualizada"}),
        ],
    ),
    dict(
        name="Generar reporte de contravenciones",
        description="Genera el reporte mensual de contravenciones para el cliente actual y valida su descarga.",
        tags=["regression", "reports"],
        status="active",
        steps=[
            ("open_url", {"url": "{{BASE_URL}}/reportes/contravenciones"}),
            ("select", {"selector": "#customer-select", "value": "{{CUSTOMER_ID}}"}),
            ("click", {"selector": "#generate-report"}),
            ("wait_until", {"selector": "#report-ready-badge", "timeout_ms": "8000"}),
            ("assert_element_visible", {"selector": "#download-report"}),
        ],
    ),
]


class Command(BaseCommand):
    help = "Seeds Testora Internal / Fenix QA demo data: users, environments, test cases and steps."

    @transaction.atomic
    def handle(self, *args, **options):
        organization, _ = Organization.objects.get_or_create(
            slug="testora-internal", defaults={"name": "Testora Internal"}
        )

        users_by_email = {}
        for spec in DEMO_USERS:
            user, created = User.objects.get_or_create(
                email=spec["email"],
                defaults={
                    "username": spec["email"],
                    "full_name": spec["full_name"],
                    "is_staff": spec["org_role"] == "owner",
                    "is_superuser": spec["org_role"] == "owner",
                },
            )
            if created:
                user.set_password(spec["password"])
                user.save()
            users_by_email[spec["email"]] = user
            OrganizationMembership.objects.update_or_create(
                organization=organization, user=user, defaults={"role": spec["org_role"]}
            )
        self.stdout.write(self.style.SUCCESS(f"Users ready: {len(users_by_email)}"))

        admin_user = users_by_email["admin@testora.dev"]
        project, _ = Project.objects.get_or_create(
            organization=organization,
            slug="fenix-qa",
            defaults={
                "name": "Fenix QA",
                "description": (
                    "Plataforma de gestión de contravenciones, impugnaciones y "
                    "reportes de tránsito para el municipio."
                ),
                "created_by": admin_user,
            },
        )
        for spec in DEMO_USERS:
            ProjectMembership.objects.update_or_create(
                project=project, user=users_by_email[spec["email"]],
                defaults={"role": spec["project_role"]},
            )
        self.stdout.write(self.style.SUCCESS(f"Project ready: {project.name}"))

        for env_spec in ENVIRONMENTS:
            environment, _ = Environment.objects.update_or_create(
                project=project, name=env_spec["name"],
                defaults={"base_url": env_spec["base_url"], "browser": "chrome"},
            )
            for key, (value, is_secret) in env_spec["variables"].items():
                EnvironmentVariable.objects.update_or_create(
                    environment=environment, key=key,
                    defaults={"value": value, "is_secret": is_secret},
                )
        self.stdout.write(self.style.SUCCESS(f"Environments ready: {len(ENVIRONMENTS)}"))

        for tc_spec in TEST_CASES:
            test_case, _ = TestCase.objects.update_or_create(
                project=project, name=tc_spec["name"],
                defaults={
                    "description": tc_spec["description"],
                    "tags": tc_spec["tags"],
                    "status": tc_spec["status"],
                    "created_by": admin_user,
                    "updated_by": admin_user,
                },
            )
            test_case.steps.all().delete()
            for order, (action_type, params) in enumerate(tc_spec["steps"], start=1):
                TestStep.objects.create(
                    test_case=test_case, order=order, action_type=action_type, params=params,
                )
        self.stdout.write(self.style.SUCCESS(f"Test cases ready: {len(TEST_CASES)}"))

        self.stdout.write(self.style.SUCCESS(
            "\nDemo data seeded. Log in with admin@testora.dev / Testora123!"
        ))
