from django.core.management.base import BaseCommand
from django.db import transaction

from apps.environments.models import Environment, EnvironmentVariable
from apps.organizations.models import Organization, OrganizationMembership
from apps.projects.models import Project, ProjectMembership
from apps.test_cases.models import TestCase, TestStep
from apps.test_suites.models import TestSuite, TestSuiteItem
from apps.users.models import User

DEMO_USERS = [
    dict(email="admin@testora.dev", full_name="Camila Ibarra", org_role="owner", project_role="admin", password="Testora123!"),
    dict(email="sofia.ramirez@testora.dev", full_name="Sofía Ramírez", org_role="member", project_role="qa_manager", password="Testora123!"),
    dict(email="diego.torres@testora.dev", full_name="Diego Torres", org_role="member", project_role="qa_engineer", password="Testora123!"),
    dict(email="valentina.cruz@testora.dev", full_name="Valentina Cruz", org_role="member", project_role="qa_engineer", password="Testora123!"),
    dict(email="martin.lopez@testora.dev", full_name="Martín López", org_role="member", project_role="viewer", password="Testora123!"),
]

# Modela el proyecto sobre las dos aplicaciones que Implementación tiene
# "En pruebas" según el onboarding de Gencell Pharma: Bioinformática
# (pipeline de secuenciación) y Referencias (recepción de muestras y
# entrega de resultados).
ENVIRONMENTS = [
    dict(name="DEV", base_url="https://dev.gencellpharma.example.com", variables={
        "BASE_URL": ("https://dev.gencellpharma.example.com", False),
        "USERNAME": ("qa_user", False),
        "PASSWORD": ("Gencell#Dev2024", True),
        "PACIENTE_ID": ("GC-2024-04512", False),
    }),
    dict(name="QA", base_url="https://qa.gencellpharma.example.com", variables={
        "BASE_URL": ("https://qa.gencellpharma.example.com", False),
        "USERNAME": ("qa_user", False),
        "PASSWORD": ("Gencell#Qa2024", True),
        "PACIENTE_ID": ("GC-2024-04512", False),
    }),
    dict(name="UAT", base_url="https://uat.gencellpharma.example.com", variables={
        "BASE_URL": ("https://uat.gencellpharma.example.com", False),
        "USERNAME": ("qa_user_uat", False),
        "PASSWORD": ("Gencell#Uat2024", True),
        "PACIENTE_ID": ("GC-2024-05190", False),
    }),
]

TEST_CASES = [
    dict(
        name="Login válido",
        description="Verifica que un usuario de Referencias o Bioinformática con credenciales correctas pueda acceder al panel principal.",
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
        name="Registrar recepción de muestra",
        description="Verifica que Referencias pueda registrar la recepción de una muestra y que el sistema le asigne número de caso.",
        tags=["smoke", "referencias"],
        status="active",
        steps=[
            ("open_url", {"url": "{{BASE_URL}}/referencias/muestras/nueva"}),
            ("input_text", {"selector": "#paciente-id", "value": "{{PACIENTE_ID}}"}),
            ("select", {"selector": "#tipo-muestra", "value": "Sangre completa"}),
            ("click", {"selector": "#registrar-muestra"}),
            ("assert_text", {"selector": ".toast-success", "value": "Muestra registrada"}),
        ],
    ),
    dict(
        name="Registrar muestra sin tipo de muestra",
        description="Verifica que el sistema no permita registrar una muestra si no se indica el tipo de muestra.",
        tags=["regression", "referencias"],
        status="active",
        steps=[
            ("open_url", {"url": "{{BASE_URL}}/referencias/muestras/nueva"}),
            ("input_text", {"selector": "#paciente-id", "value": "{{PACIENTE_ID}}"}),
            ("click", {"selector": "#registrar-muestra"}),
            ("assert_text", {"selector": ".field-error", "value": "El tipo de muestra es obligatorio"}),
        ],
    ),
    dict(
        name="Cargar archivo FASTQ e iniciar secuenciación",
        description="Verifica que Bioinformática pueda cargar un archivo FASTQ e iniciar el pipeline de secuenciación de un caso.",
        tags=["regression", "bioinformatica"],
        status="draft",
        steps=[
            ("open_url", {"url": "{{BASE_URL}}/bioinformatica/casos/CASE-2024-0451"}),
            ("click", {"selector": "#cargar-fastq"}),
            ("click", {"selector": "#iniciar-pipeline"}),
            ("wait_until", {"selector": "#estado-pipeline", "timeout_ms": "8000"}),
            ("assert_text", {"selector": "#estado-pipeline", "value": "En proceso"}),
        ],
    ),
    dict(
        name="Consultar variantes detectadas (VCF)",
        description="Verifica que se puedan consultar las variantes generadas para un caso ya procesado por el pipeline.",
        tags=["regression", "bioinformatica"],
        status="active",
        steps=[
            ("open_url", {"url": "{{BASE_URL}}/bioinformatica/casos/CASE-2024-0451/variantes"}),
            ("assert_element_visible", {"selector": "[data-testid='tabla-variantes']"}),
            ("assert_element_exists", {"selector": ".variante-row"}),
        ],
    ),
    dict(
        name="Enviar caso a interpretación",
        description="Verifica que un caso con VCF generado pueda enviarse a la plataforma de interpretación (VarSome / Emedgene).",
        tags=["regression", "bioinformatica"],
        status="active",
        steps=[
            ("open_url", {"url": "{{BASE_URL}}/bioinformatica/casos/CASE-2024-0451"}),
            ("click", {"selector": "#enviar-interpretacion"}),
            ("assert_text", {"selector": "#estado-caso", "value": "Enviado a interpretación"}),
        ],
    ),
    dict(
        name="Marcar caso como entregado",
        description="Verifica que, tras la validación médica, Referencias pueda marcar el resultado como entregado al paciente o a la EPS.",
        tags=["regression", "referencias"],
        status="active",
        steps=[
            ("open_url", {"url": "{{BASE_URL}}/referencias/casos/CASE-2024-0451"}),
            ("click", {"selector": "#marcar-entregado"}),
            ("assert_text", {"selector": "#estado-caso", "value": "Entregado"}),
        ],
    ),
]

# Agrupa los casos de prueba existentes en suites por etiqueta — smoke y
# regresión transversales, más una suite por aplicación (Bioinformática,
# Referencias), como se organizaría un equipo real.
SUITES = [
    ("Smoke Testing", "smoke"),
    ("Regression", "regression"),
    ("Authentication", "authentication"),
    ("Bioinformática", "bioinformatica"),
    ("Referencias", "referencias"),
]


class Command(BaseCommand):
    help = "Seeds Testora Internal / Gencell Pharma demo data: users, environments, test cases and steps."

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
        description = (
            "Pruebas de las aplicaciones de Bioinformática y Referencias: recepción de "
            "muestras, pipeline de secuenciación (FASTQ/BAM/VCF), envío a interpretación "
            "y entrega de resultados."
        )
        # Migra un proyecto sembrado con el tema anterior ("Fenix QA") si
        # existe, en vez de dejarlo huérfano junto a uno nuevo.
        project = Project.objects.filter(organization=organization, slug="fenix-qa").first()
        if project:
            project.name = "Gencell Pharma"
            project.slug = "gencell-pharma"
            project.description = description
            project.save()
        else:
            project, _ = Project.objects.get_or_create(
                organization=organization,
                slug="gencell-pharma",
                defaults={"name": "Gencell Pharma", "description": description, "created_by": admin_user},
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
            environment.variables.exclude(key__in=env_spec["variables"].keys()).delete()
            for key, (value, is_secret) in env_spec["variables"].items():
                EnvironmentVariable.objects.update_or_create(
                    environment=environment, key=key,
                    defaults={"value": value, "is_secret": is_secret},
                )
        self.stdout.write(self.style.SUCCESS(f"Environments ready: {len(ENVIRONMENTS)}"))

        # Reset completo de casos de prueba y suites para que el proyecto
        # quede exactamente como describen TEST_CASES/SUITES arriba, sin
        # arrastrar datos de un tema anterior.
        project.test_cases.all().delete()
        project.test_suites.all().delete()

        for tc_spec in TEST_CASES:
            test_case = TestCase.objects.create(
                project=project,
                name=tc_spec["name"],
                description=tc_spec["description"],
                tags=tc_spec["tags"],
                status=tc_spec["status"],
                created_by=admin_user,
                updated_by=admin_user,
            )
            for order, (action_type, params) in enumerate(tc_spec["steps"], start=1):
                TestStep.objects.create(
                    test_case=test_case, order=order, action_type=action_type, params=params,
                )
        self.stdout.write(self.style.SUCCESS(f"Test cases ready: {len(TEST_CASES)}"))

        suites_created = 0
        for suite_name, tag in SUITES:
            matching = list(TestCase.objects.filter(project=project, tags__contains=[tag]))
            if not matching:
                continue
            suite = TestSuite.objects.create(
                project=project, name=suite_name,
                description=f"Casos de prueba con la etiqueta “{tag}”.",
            )
            for order, test_case in enumerate(matching, start=1):
                TestSuiteItem.objects.create(suite=suite, test_case=test_case, order=order)
            suites_created += 1
        self.stdout.write(self.style.SUCCESS(f"Test suites ready: {suites_created}"))

        self.stdout.write(self.style.SUCCESS(
            "\nDemo data seeded. Log in with admin@testora.dev / Testora123!"
        ))
