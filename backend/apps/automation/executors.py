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

from selenium.common.exceptions import NoSuchElementException, StaleElementReferenceException, TimeoutException
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait


def _by(selector: str):
    selector = selector.strip()
    if selector.startswith(("/", "(", ".//")):
        return By.XPATH, selector
    return By.CSS_SELECTOR, selector


def _find(driver, context, params):
    """Waits up to the step's own timeout_ms for the element to appear,
    instead of failing the instant it isn't in the DOM yet. This is what
    makes a cascading dropdown (select a country, wait for the AJAX call
    that repopulates the province select) work without a manual "Esperar"
    step before every dependent field — real-world JSF/PrimeFaces forms hit
    this constantly."""
    by, value = _by(context.resolve(params["selector"]))
    timeout = getattr(context, "timeout_ms", 5000) / 1000
    try:
        return WebDriverWait(driver, timeout).until(EC.presence_of_element_located((by, value)))
    except TimeoutException:
        raise NoSuchElementException(
            f"No se encontró el elemento «{value}» después de esperar {int(timeout * 1000)}ms."
        )


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
    _find(driver, context, params).click()


def double_click(driver, context, params):
    ActionChains(driver).double_click(_find(driver, context, params)).perform()


def input_text(driver, context, params):
    element = _find(driver, context, params)
    element.clear()
    element.send_keys(context.resolve(params["value"]))


def clear(driver, context, params):
    _find(driver, context, params).clear()


def select(driver, context, params):
    """Waits for the target *option* to exist, not just the <select> tag —
    PrimeFaces and similar frameworks commonly render an empty dropdown
    immediately and populate its options via a separate, slightly later
    AJAX call, so the select itself being present (see _find) says nothing
    about whether the option a step wants is there yet. Re-finding the
    select fresh on every poll, rather than reusing one reference, also
    survives the dropdown being replaced wholesale mid-wait — a stale
    reference from the previous DOM node would otherwise raise
    StaleElementReferenceException instead of just trying again."""
    by, value = _by(context.resolve(params["selector"]))
    target_text = context.resolve(params["value"])
    timeout = getattr(context, "timeout_ms", 5000) / 1000

    def option_ready(d):
        try:
            select_el = d.find_element(by, value)
            has_option = any(o.text == target_text for o in Select(select_el).options)
        except (NoSuchElementException, StaleElementReferenceException):
            return False
        return select_el if has_option else False

    try:
        element = WebDriverWait(driver, timeout).until(option_ready)
    except TimeoutException:
        raise NoSuchElementException(
            f"La opción «{target_text}» no apareció en «{value}» después de esperar {int(timeout * 1000)}ms."
        )
    Select(element).select_by_visible_text(target_text)


def hover(driver, context, params):
    ActionChains(driver).move_to_element(_find(driver, context, params)).perform()


def scroll(driver, context, params):
    if params.get("selector"):
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", _find(driver, context, params))
    else:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")


def assert_text(driver, context, params):
    element = _find(driver, context, params)
    expected = context.resolve(params["value"])
    if expected not in element.text:
        raise AssertionError(f"Se esperaba que el texto contuviera «{expected}», se encontró «{element.text}».")


def assert_element_exists(driver, context, params):
    by, value = _by(context.resolve(params["selector"]))
    try:
        driver.find_element(by, value)
    except NoSuchElementException:
        raise AssertionError(f"El elemento «{value}» no existe.")


def assert_element_visible(driver, context, params):
    element = _find(driver, context, params)
    if not element.is_displayed():
        raise AssertionError(f"El elemento «{params['selector']}» existe pero no es visible.")


def assert_url(driver, context, params):
    expected = context.resolve(params["value"])
    current = driver.current_url
    match = params.get("match", "equals")
    ok = current == expected if match == "equals" else expected in current
    if not ok:
        raise AssertionError(f"URL actual «{current}» no cumple la condición ({match}) con «{expected}».")


def assert_attribute(driver, context, params):
    element = _find(driver, context, params)
    expected = context.resolve(params["value"])
    actual = element.get_attribute(params["attribute"])
    if str(actual) != str(expected):
        raise AssertionError(f"Atributo «{params['attribute']}» = «{actual}», se esperaba «{expected}».")


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
