# Assuria

Plataforma interna de automatización de pruebas web basada en Selenium. Assuria permite a un equipo de QA administrar proyectos, diseñar casos de prueba como automatizaciones (no como documentos), configurar entornos y variables, y ejecutarlas de forma asíncrona sobre Selenium real.

Este repositorio contiene la **Fase 1** (arquitectura base, autenticación, Projects, Test Cases, el Test Case Builder, Environments y el Design System) y el primer corte de **Fase 2**: el motor de ejecución backend (modelos de Test Runs, Celery, worker con Selenium real). La UI de progreso en vivo de los runs llega en el próximo corte.

## Stack

| Capa            | Tecnología                                      |
|-----------------|--------------------------------------------------|
| Frontend        | React + TypeScript + Vite + Tailwind CSS v4      |
| Backend / API   | Django + Django REST Framework                   |
| Automatización  | Selenium (Remote WebDriver), registro de acciones propio |
| Procesamiento   | Celery + Redis                                   |
| Base de datos   | PostgreSQL                                       |
| Infraestructura | Docker + Docker Compose                          |

## Arquitectura

```
Frontend (Vite/React) → API (DRF) → PostgreSQL
                              ↓
                            Redis (broker)
                              ↓
                        Celery Worker
                              ↓
                  Selenium Remote WebDriver
                  (selenium/standalone-chrome)
```

Selenium nunca se ejecuta dentro de un request HTTP: `POST /api/test-runs/` solo crea el `TestRun` (+ sus `TestResult`) y encola `execute_test_run` en Celery — el worker es quien abre el navegador, ejecuta los pasos y persiste los resultados incrementalmente. El worker habla con Selenium vía Remote WebDriver desde el día uno (contra el contenedor `selenium/standalone-chrome` en `docker-compose.yml`), así que pasar a un Grid real más adelante es cambiar una URL, no la arquitectura.

### Aislamiento por organización

El dominio está preparado para múltiples organizaciones sin haber construido un SaaS multi-tenant completo (sin billing, planes ni onboarding comercial):

```
Organization ("Assuria Internal", única por ahora)
  └─ OrganizationMembership (rol: owner / admin / member)
  └─ Project
        └─ ProjectMembership (rol: admin / qa_manager / qa_engineer / viewer)
        └─ Environment, EnvironmentVariable, TestCase, TestStep
```

El aislamiento se aplica **en el backend**, nunca solo ocultando datos en el frontend:

- `apps/core/organizations.py` resuelve la organización del usuario autenticado a partir de `OrganizationMembership` — nunca a partir de un `organization_id` enviado por el cliente.
- `apps/core/viewsets.py` define `OrganizationScopedModelViewSet`, la clase base de la que heredan todos los ViewSets. Cada una declara `organization_lookup` y `project_lookup`; el queryset y los permisos de escritura se derivan de ahí de forma centralizada y auditable.
- Los secretos de `EnvironmentVariable` se cifran en reposo (Fernet) y nunca se devuelven en texto plano si `is_secret=True`.

## Estructura del repositorio

```
assuria/
├── backend/
│   ├── config/                  # settings, urls
│   └── apps/
│       ├── core/                 # infraestructura de aislamiento, paginación, excepciones
│       ├── users/                  # User, auth (JWT)
│       ├── organizations/           # Organization, OrganizationMembership
│       ├── projects/                 # Project, ProjectMembership
│       ├── environments/              # Environment, EnvironmentVariable (cifradas)
│       └── test_cases/                 # TestCase, TestStep, registro de acciones
├── frontend/
│   └── src/
│       ├── features/             # auth, projects, test-cases, environments, dashboard
│       ├── components/
│       │   ├── ui/                 # Design System (Button, Table, Modal, Tabs...)
│       │   └── layout/               # TopBar, ProjectRail, AppLayout
│       └── lib/                  # api client, query client, theme
└── docker-compose.yml
```

## Cómo correrlo

### Con Docker (recomendado)

```bash
cp backend/.env.example backend/.env
# Generar una clave de cifrado y pegarla en FIELD_ENCRYPTION_KEY dentro de backend/.env:
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

docker compose up --build
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173

**Si esos puertos ya están en uso** en tu máquina (por otro proyecto, por ejemplo), copiá `.env.example` (el de la raíz del repo, no el de `backend/`) a `.env` y ajustá `BACKEND_PORT`/`FRONTEND_PORT`/`DB_PORT`/`REDIS_PORT`. Docker Compose lo lee automáticamente, sin flags extra.

Con los contenedores levantados, en otra terminal:

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser   # opcional
docker compose exec backend python manage.py seed_demo_data
```

### Sin Docker (desarrollo local)

Backend:

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # completar FIELD_ENCRYPTION_KEY y apuntar DATABASE_URL/REDIS_URL a servicios locales
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Datos de demo

`seed_demo_data` crea la organización **Assuria Internal**, el proyecto **Gencell Pharma** (Bioinformática y Referencias: recepción de muestras, pipeline de secuenciación FASTQ/BAM/VCF, interpretación y entrega de resultados), tres entornos (DEV/QA/UAT) con variables, y ocho casos de prueba realistas con sus steps. Usuarios de ejemplo (contraseña `Assuria123!` para todos):

| Email                          | Rol de organización | Rol en Gencell Pharma |
|---------------------------------|----------------------|------------------|
| admin@assuria.dev               | owner                | admin            |
| sofia.ramirez@assuria.dev       | member               | qa_manager       |
| diego.torres@assuria.dev        | member               | qa_engineer      |
| valentina.cruz@assuria.dev      | member               | qa_engineer      |
| martin.lopez@assuria.dev        | member               | viewer           |

## API

Autenticación JWT (`djangorestframework-simplejwt`):

- `POST /api/auth/login/` → `{ access, refresh, user }`
- `POST /api/auth/refresh/`
- `GET /api/auth/me/`

Recursos principales (todos filtrados por organización + membresía de proyecto en el backend):

- `GET/POST /api/projects/`, `GET/PATCH /api/projects/{id}/`
- `GET/POST /api/test-cases/?project={id}`, `POST /api/test-cases/{id}/reorder-steps/`
- `GET/POST/PATCH/DELETE /api/test-steps/`, `POST /api/test-steps/{id}/duplicate/`
- `GET/POST /api/environments/?project={id}`, `GET/POST/DELETE /api/environment-variables/`
- `GET /api/actions/` — registro de acciones disponibles para el Test Case Builder (JSON-schema por acción)
- `GET/POST /api/test-runs/?project={id}` — encola un run (body: `project`, `environment`, y `suite` **o** `test_case`); nunca ejecuta Selenium en el request
- `GET /api/test-runs/{id}/` — detalle completo del run, con `test_results → step_results → evidence` anidados (pensado para polling)

## Extender el registro de acciones

Cada acción del Test Case Builder (Click, Assert Text, Wait Until...) se declara en `backend/apps/test_cases/actions.py` como un `ActionDefinition` con su lista de parámetros tipados. El frontend construye el formulario de cada step dinámicamente a partir de `GET /api/actions/`. La ejecución real de cada acción vive por separado en `backend/apps/automation/executors.py` (`EXECUTORS`, una función por `action.key`) — agregar una acción nueva es una entrada en `ACTIONS` más su executor, sin tocar el componente del builder ni el resto del motor.

## Roadmap

- **Fase 2 (en curso)** — ✅ Test Suites. ✅ Motor de ejecución backend (Celery + Selenium Worker, modelos de Test Runs/Results/Evidence). Pendiente: Test Runs con UI de progreso en vivo (polling) y botón "Ejecutar" desde el Builder/Suites.
- **Fase 3** — Reports, variables integradas end-to-end en el builder, evidencia más rica.
- **Fase 4** — Test recorder, ejecución paralela, Selenium Grid, auto-reparación heurística de selectores, CI/CD, integraciones (Jira/Azure DevOps/GitHub).
