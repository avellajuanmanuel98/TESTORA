"""Executors — one function per action key in apps.test_cases.actions.ACTIONS.

Each executor takes (driver, context, params). Returning normally means the
step passed; raising any exception (AssertionError for a failed assertion,
anything else for a real error) means it failed. Every string param is
resolved through context.resolve() first so {{VARIABLE}} substitution works
wherever a step references it — this is what makes Environment variables
(e.g. {{BASE_URL}}) actually usable.

`conditional` and `retry` are control-flow actions in the schema, but
TestStep is a flat, non-nested list today — there's no concept of "child
steps" for either to branch over. Both are deliberately simplified below
rather than guessing at branching semantics the schema doesn't support yet;
see each function's docstring.
"""

import time

from selenium.common.exceptions import (
    ElementClickInterceptedException,
    ElementNotInteractableException,
    NoSuchElementException,
    StaleElementReferenceException,
    TimeoutException,
)
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

# Exceptions that mean "the DOM is mid-mutation right now, this exact
# attempt just lost the race" rather than "this is genuinely wrong" — worth
# retrying against a freshly re-found element. Confirmed in practice that a
# single replaced element can surface as any of these depending on exactly
# when Selenium's interactability check runs relative to the DOM swap, not
# just StaleElementReferenceException.
TRANSIENT_ELEMENT_ERRORS = (
    NoSuchElementException,
    StaleElementReferenceException,
    ElementNotInteractableException,
    ElementClickInterceptedException,
)


def _by(selector: str):
    selector = selector.strip()
    if selector.startswith(("/", "(", ".//")):
        return By.XPATH, selector
    return By.CSS_SELECTOR, selector


def _act(driver, context, params, action):
    """Retries find-element-then-`action(element)` as a single attempt,
    re-fetching the element fresh each time, until one attempt fully
    succeeds or the step's timeout_ms runs out.

    This is deliberately not "wait for presence, then act separately" —
    that two-step shape has a real gap in it: PrimeFaces (and similar
    AJAX-heavy frameworks) routinely redraw a field after it first appears
    but before a script has time to act on it, so a reference obtained one
    moment earlier goes stale by the time it's used. Retrying the whole
    find-and-act pair as one unit means every attempt is against whatever
    is on the page *right now* — no state carried across attempts for the
    page to invalidate out from under it. Confirmed necessary in practice
    across more than one action type on the same real-world form (a
    cascading `select`, then `input_text` on a different field) — this
    covers every interactive action once instead of one at a time.

    `action` may itself raise AssertionError (for assertion actions) — that
    propagates immediately, uninterrupted by this retry loop, since a
    genuine assertion failure is not the same thing as "the element isn't
    stable yet"."""
    by, value = _by(context.resolve(params["selector"]))
    timeout = getattr(context, "timeout_ms", 5000) / 1000
    deadline = time.monotonic() + timeout
    while True:
        try:
            element = driver.find_element(by, value)
            return action(element)
        except TRANSIENT_ELEMENT_ERRORS:
            if time.monotonic() >= deadline:
                raise NoSuchElementException(
                    f"No se pudo interactuar con «{value}» después de esperar {int(timeout * 1000)}ms."
                )
            time.sleep(0.2)


def open_url(driver, context, params):
    driver.get(context.resolve(params["url"]))


def refresh(driver, context, params):
    driver.refresh()


def back(driver, context, params):
    driver.back()


def forward(driver, context, params):
    driver.forward()


def wait(driver, context, params):
    time.sleep(float(params.get("duration_ms", 1000)) / 1000)


def screenshot(driver, context, params):
    # No-op here on purpose: capturing the actual Evidence row needs the
    # StepResult/TestResult, which only the task orchestrator (tasks.py)
    # has access to. It captures evidence for this action explicitly.
    pass


def click(driver, context, params):
    _act(driver, context, params, lambda el: el.click())


def double_click(driver, context, params):
    _act(driver, context, params, lambda el: ActionChains(driver).double_click(el).perform())


def input_text(driver, context, params):
    value = context.resolve(params["value"])

    def do(el):
        el.clear()
        el.send_keys(value)

    _act(driver, context, params, do)


def clear(driver, context, params):
    _act(driver, context, params, lambda el: el.clear())


def select(driver, context, params):
    target_text = context.resolve(params["value"])
    _act(driver, context, params, lambda el: Select(el).select_by_visible_text(target_text))


def hover(driver, context, params):
    _act(driver, context, params, lambda el: ActionChains(driver).move_to_element(el).perform())


def scroll(driver, context, params):
    if params.get("selector"):
        _act(
            driver, context, params,
            lambda el: driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", el),
        )
    else:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")


def assert_text(driver, context, params):
    expected = context.resolve(params["value"])

    def do(el):
        if expected not in el.text:
            raise AssertionError(f"Se esperaba que el texto contuviera «{expected}», se encontró «{el.text}».")

    _act(driver, context, params, do)


def assert_element_exists(driver, context, params):
    by, value = _by(context.resolve(params["selector"]))
    try:
        driver.find_element(by, value)
    except NoSuchElementException:
        raise AssertionError(f"El elemento «{value}» no existe.")


def assert_element_visible(driver, context, params):
    def do(el):
        if not el.is_displayed():
            raise AssertionError(f"El elemento «{params['selector']}» existe pero no es visible.")

    _act(driver, context, params, do)


def assert_url(driver, context, params):
    expected = context.resolve(params["value"])
    current = driver.current_url
    match = params.get("match", "equals")
    ok = current == expected if match == "equals" else expected in current
    if not ok:
        raise AssertionError(f"URL actual «{current}» no cumple la condición ({match}) con «{expected}».")


def assert_attribute(driver, context, params):
    expected = context.resolve(params["value"])

    def do(el):
        actual = el.get_attribute(params["attribute"])
        if str(actual) != str(expected):
            raise AssertionError(f"Atributo «{params['attribute']}» = «{actual}», se esperaba «{expected}».")

    _act(driver, context, params, do)


def assert_page_title(driver, context, params):
    expected = context.resolve(params["value"])
    if driver.title != expected:
        raise AssertionError(f"Título de página «{driver.title}», se esperaba «{expected}».")


def conditional(driver, context, params):
    """Simplified for this cut: gates only itself. A missing selector makes
    this step a no-op pass — it never affects other steps, since TestStep
    has no concept of nested/child steps yet for a real "if" to branch over.
    """
    by, value = _by(context.resolve(params["selector"]))
    try:
        driver.find_element(by, value)
    except NoSuchElementException:
        pass


def retry(driver, context, params):
    """The `retry` action's schema (apps/test_cases/actions.py) only defines
    an `attempts` param — no target to retry against. Real retry semantics
    need either a target param or nested steps, neither of which exist in
    the schema yet, so this is a documented no-op rather than a guess."""
    return


def wait_until(driver, context, params):
    timeout_ms = int(params.get("timeout_ms", 5000))
    by, value = _by(context.resolve(params["selector"]))
    try:
        WebDriverWait(driver, timeout_ms / 1000).until(EC.presence_of_element_located((by, value)))
    except TimeoutException:
        raise AssertionError(f"«{params['selector']}» no apareció dentro de {timeout_ms}ms.")


EXECUTORS = {
    "open_url": open_url,
    "refresh": refresh,
    "back": back,
    "forward": forward,
    "wait": wait,
    "screenshot": screenshot,
    "click": click,
    "double_click": double_click,
    "input_text": input_text,
    "clear": clear,
    "select": select,
    "hover": hover,
    "scroll": scroll,
    "assert_text": assert_text,
    "assert_element_exists": assert_element_exists,
    "assert_element_visible": assert_element_visible,
    "assert_url": assert_url,
    "assert_attribute": assert_attribute,
    "assert_page_title": assert_page_title,
    "conditional": conditional,
    "retry": retry,
    "wait_until": wait_until,
}
