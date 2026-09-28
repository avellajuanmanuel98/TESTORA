"""Action registry.

Every action a Test Step can perform is declared here as an ActionDefinition
with a JSON-schema-like list of parameters. The frontend Test Case Builder
renders each step's parameter form directly from GET /api/actions/ — it does
not hardcode a form per action type. Backend validation of a TestStep's
`params` against its action's schema also goes through this registry.

Adding a new action = adding one ActionDefinition to ACTIONS below. Nothing
else in the system needs to change (see architecture notes on the execution
engine for how this plugs into the Selenium worker in Phase 2).

`key` values (action identifiers) stay in English snake_case — they are a
stable technical contract, not prose. Every `label`, `help_text`, `choices`
label and `summary_template` is user-facing copy and is written in Spanish.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ActionParam:
    key: str
    label: str
    type: str  # "selector" | "text" | "url" | "number" | "boolean" | "select"
    required: bool = True
    placeholder: str = ""
    help_text: str = ""
    choices: tuple[tuple[str, str], ...] = ()  # (value, label) pairs, for type="select"


@dataclass(frozen=True)
class ActionDefinition:
    key: str
    label: str
    category: str  # "navigation" | "browser" | "interaction" | "assertion" | "control"
    summary_template: str  # e.g. "{selector}" or "{selector} = {value}"
    params: tuple[ActionParam, ...] = field(default_factory=tuple)


def _selector(key="selector", label="Selector", required=True):
    return ActionParam(
        key=key,
        label=label,
        type="selector",
        required=required,
        placeholder="#login-button, .btn-primary, //button[@id='x']",
        help_text="Selector CSS o XPath.",
    )


ACTIONS: tuple[ActionDefinition, ...] = (
    # Navegación
    ActionDefinition(
        key="open_url",
        label="Abrir URL",
        category="navigation",
        summary_template="{url}",
        params=(
            ActionParam(
                key="url", label="URL", type="url",
                placeholder="{{BASE_URL}}/login",
                help_text="Admite variables, ej. {{BASE_URL}}.",
            ),
        ),
    ),
    ActionDefinition(key="refresh", label="Refrescar", category="navigation", summary_template="Refrescar página"),
    ActionDefinition(key="back", label="Atrás", category="navigation", summary_template="Volver a la página anterior"),
    ActionDefinition(key="forward", label="Adelante", category="navigation", summary_template="Avanzar a la página siguiente"),
    # Navegador
    ActionDefinition(
        key="wait",
        label="Esperar",
        category="browser",
        summary_template="Esperar {duration_ms}ms",
        params=(
            ActionParam(key="duration_ms", label="Duración (ms)", type="number", placeholder="1000"),
        ),
    ),
    ActionDefinition(key="screenshot", label="Screenshot", category="browser", summary_template="Capturar screenshot"),
    # Interacción
    ActionDefinition(key="click", label="Clic", category="interaction", summary_template="{selector}", params=(_selector(),)),
    ActionDefinition(
        key="double_click", label="Doble clic", category="interaction", summary_template="{selector}", params=(_selector(),)
    ),
    ActionDefinition(
        key="input_text",
        label="Escribir texto",
        category="interaction",
        summary_template="{selector} = {value}",
        params=(
            _selector(),
            ActionParam(key="value", label="Valor", type="text", placeholder="{{USERNAME}}"),
        ),
    ),
    ActionDefinition(key="clear", label="Limpiar campo", category="interaction", summary_template="{selector}", params=(_selector(),)),
    ActionDefinition(
        key="select",
        label="Seleccionar opción",
        category="interaction",
        summary_template="{selector} = {value}",
        params=(
            _selector(),
            ActionParam(key="value", label="Valor de la opción", type="text", placeholder="Argentina"),
        ),
    ),
    ActionDefinition(key="hover", label="Pasar el mouse", category="interaction", summary_template="{selector}", params=(_selector(),)),
    ActionDefinition(
        key="scroll",
        label="Scroll",
        category="interaction",
        summary_template="Scroll hasta {selector}",
        params=(_selector(required=False),),
    ),
    # Aserciones
    ActionDefinition(
        key="assert_text",
        label="Verificar texto",
        category="assertion",
        summary_template="{selector} contiene “{value}”",
        params=(
            _selector(),
            ActionParam(key="value", label="Texto esperado", type="text", placeholder="Dashboard"),
        ),
    ),
    ActionDefinition(
        key="assert_element_exists",
        label="Verificar que el elemento existe",
        category="assertion",
        summary_template="{selector} existe",
        params=(_selector(),),
    ),
    ActionDefinition(
        key="assert_element_visible",
        label="Verificar que el elemento es visible",
        category="assertion",
        summary_template="{selector} es visible",
        params=(_selector(),),
    ),
    ActionDefinition(
        key="assert_url",
        label="Verificar URL",
        category="assertion",
        summary_template="URL {match} {value}",
        params=(
            ActionParam(
                key="match", label="Condición", type="select", required=True,
                choices=(("equals", "Igual a"), ("contains", "Contiene")),
            ),
            ActionParam(key="value", label="URL esperada", type="text", placeholder="{{BASE_URL}}/dashboard"),
        ),
    ),
    ActionDefinition(
        key="assert_attribute",
        label="Verificar atributo",
        category="assertion",
        summary_template="{selector}[{attribute}] = {value}",
        params=(
            _selector(),
            ActionParam(key="attribute", label="Atributo", type="text", placeholder="disabled"),
            ActionParam(key="value", label="Valor esperado", type="text", placeholder="true"),
        ),
    ),
    ActionDefinition(
        key="assert_page_title",
        label="Verificar título de página",
        category="assertion",
        summary_template="Título = {value}",
        params=(ActionParam(key="value", label="Título esperado", type="text", placeholder="Fenix QA — Dashboard"),),
    ),
    # Control
    ActionDefinition(
        key="conditional",
        label="Condicional",
        category="control",
        summary_template="Si {selector} existe",
        params=(_selector(required=True, label="Selector de la condición"),),
    ),
    ActionDefinition(
        key="retry",
        label="Reintentar",
        category="control",
        summary_template="Reintentar hasta {attempts} veces",
        params=(ActionParam(key="attempts", label="Intentos", type="number", placeholder="3"),),
    ),
    ActionDefinition(
        key="wait_until",
        label="Esperar hasta",
        category="control",
        summary_template="Esperar hasta que {selector} sea visible",
        params=(
            _selector(),
            ActionParam(key="timeout_ms", label="Timeout (ms)", type="number", placeholder="5000"),
        ),
    ),
)

ACTIONS_BY_KEY: dict[str, ActionDefinition] = {a.key: a for a in ACTIONS}


def validate_params(action_key: str, params: dict) -> dict:
    """Raises ValueError with a human-readable message if params don't
    satisfy the action's schema. Returns the params unchanged on success."""
    action = ACTIONS_BY_KEY.get(action_key)
    if action is None:
        raise ValueError(f"Acción desconocida: '{action_key}'.")
    for param in action.params:
        if param.required and not str(params.get(param.key, "")).strip():
            raise ValueError(f"'{param.label}' es obligatorio para {action.label}.")
    return params
