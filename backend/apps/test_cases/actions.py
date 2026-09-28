"""Action registry.

Every action a Test Step can perform is declared here as an ActionDefinition
with a JSON-schema-like list of parameters. The frontend Test Case Builder
renders each step's parameter form directly from GET /api/actions/ — it does
not hardcode a form per action type. Backend validation of a TestStep's
`params` against its action's schema also goes through this registry.

Adding a new action = adding one ActionDefinition to ACTIONS below. Nothing
else in the system needs to change (see architecture notes on the execution
engine for how this plugs into the Selenium worker in Phase 2).
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
        help_text="CSS selector or XPath.",
    )


ACTIONS: tuple[ActionDefinition, ...] = (
    # Navigation
    ActionDefinition(
        key="open_url",
        label="Open URL",
        category="navigation",
        summary_template="{url}",
        params=(
            ActionParam(
                key="url", label="URL", type="url",
                placeholder="{{BASE_URL}}/login",
                help_text="Supports variables, e.g. {{BASE_URL}}.",
            ),
        ),
    ),
    ActionDefinition(key="refresh", label="Refresh", category="navigation", summary_template="Refresh page"),
    ActionDefinition(key="back", label="Back", category="navigation", summary_template="Navigate back"),
    ActionDefinition(key="forward", label="Forward", category="navigation", summary_template="Navigate forward"),
    # Browser
    ActionDefinition(
        key="wait",
        label="Wait",
        category="browser",
        summary_template="Wait {duration_ms}ms",
        params=(
            ActionParam(key="duration_ms", label="Duration (ms)", type="number", placeholder="1000"),
        ),
    ),
    ActionDefinition(key="screenshot", label="Screenshot", category="browser", summary_template="Capture screenshot"),
    # Interaction
    ActionDefinition(key="click", label="Click", category="interaction", summary_template="{selector}", params=(_selector(),)),
    ActionDefinition(
        key="double_click", label="Double Click", category="interaction", summary_template="{selector}", params=(_selector(),)
    ),
    ActionDefinition(
        key="input_text",
        label="Input Text",
        category="interaction",
        summary_template="{selector} = {value}",
        params=(
            _selector(),
            ActionParam(key="value", label="Value", type="text", placeholder="{{USERNAME}}"),
        ),
    ),
    ActionDefinition(key="clear", label="Clear", category="interaction", summary_template="{selector}", params=(_selector(),)),
    ActionDefinition(
        key="select",
        label="Select",
        category="interaction",
        summary_template="{selector} = {value}",
        params=(
            _selector(),
            ActionParam(key="value", label="Option value", type="text", placeholder="Argentina"),
        ),
    ),
    ActionDefinition(key="hover", label="Hover", category="interaction", summary_template="{selector}", params=(_selector(),)),
    ActionDefinition(
        key="scroll",
        label="Scroll",
        category="interaction",
        summary_template="Scroll to {selector}",
        params=(_selector(required=False),),
    ),
    # Assertions
    ActionDefinition(
        key="assert_text",
        label="Assert Text",
        category="assertion",
        summary_template="{selector} contains “{value}”",
        params=(
            _selector(),
            ActionParam(key="value", label="Expected text", type="text", placeholder="Dashboard"),
        ),
    ),
    ActionDefinition(
        key="assert_element_exists",
        label="Assert Element Exists",
        category="assertion",
        summary_template="{selector} exists",
        params=(_selector(),),
    ),
    ActionDefinition(
        key="assert_element_visible",
        label="Assert Element Visible",
        category="assertion",
        summary_template="{selector} is visible",
        params=(_selector(),),
    ),
    ActionDefinition(
        key="assert_url",
        label="Assert URL",
        category="assertion",
        summary_template="URL {match} {value}",
        params=(
            ActionParam(
                key="match", label="Match", type="select", required=True,
                choices=(("equals", "Equals"), ("contains", "Contains")),
            ),
            ActionParam(key="value", label="Expected URL", type="text", placeholder="{{BASE_URL}}/dashboard"),
        ),
    ),
    ActionDefinition(
        key="assert_attribute",
        label="Assert Attribute",
        category="assertion",
        summary_template="{selector}[{attribute}] = {value}",
        params=(
            _selector(),
            ActionParam(key="attribute", label="Attribute", type="text", placeholder="disabled"),
            ActionParam(key="value", label="Expected value", type="text", placeholder="true"),
        ),
    ),
    ActionDefinition(
        key="assert_page_title",
        label="Assert Page Title",
        category="assertion",
        summary_template="Title = {value}",
        params=(ActionParam(key="value", label="Expected title", type="text", placeholder="Fenix QA — Dashboard"),),
    ),
    # Control
    ActionDefinition(
        key="conditional",
        label="Conditional",
        category="control",
        summary_template="If {selector} exists",
        params=(_selector(required=True, label="Condition selector"),),
    ),
    ActionDefinition(
        key="retry",
        label="Retry",
        category="control",
        summary_template="Retry up to {attempts} times",
        params=(ActionParam(key="attempts", label="Attempts", type="number", placeholder="3"),),
    ),
    ActionDefinition(
        key="wait_until",
        label="Wait Until",
        category="control",
        summary_template="Wait until {selector} is visible",
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
        raise ValueError(f"Unknown action '{action_key}'.")
    for param in action.params:
        if param.required and not str(params.get(param.key, "")).strip():
            raise ValueError(f"'{param.label}' is required for {action.label}.")
    return params
