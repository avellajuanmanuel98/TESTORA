"""Selenium session management.

The worker always talks to Selenium via Remote WebDriver, never a local
driver, so the target (a local chromedriver server in dev, the
`selenium/standalone-chrome` container in docker compose, a full Grid hub
later) is a settings change (SELENIUM_REMOTE_URL), never a code change.
"""

from django.conf import settings
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chromium.remote_connection import ChromiumRemoteConnection


class SeleniumSession:
    """Context manager that always calls driver.quit(), even on crash — a
    run must never stay stuck "running" because a browser leaked."""

    def __init__(self, browser: str = "chrome"):
        self.browser = browser
        self.driver = None

    def __enter__(self):
        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1440,900")
        # Some internal/corporate targets actively detect and block
        # automation-controlled browsers (navigator.webdriver, the
        # automation infobar, etc.) — this is standard, widely-documented
        # Selenium configuration to look like a normal browser instead of
        # a bot, not a security bypass: it only affects how *our own*
        # requests present themselves.
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        if settings.SELENIUM_CHROME_BINARY:
            options.binary_location = settings.SELENIUM_CHROME_BINARY
        # A ChromiumRemoteConnection (not a bare URL string) is what
        # registers the "executeCdpCommand" endpoint below — webdriver.Chrome()
        # does the same thing internally for local sessions.
        executor = ChromiumRemoteConnection(
            remote_server_addr=settings.SELENIUM_REMOTE_URL, vendor_prefix="goog", browser_name="chrome"
        )
        self.driver = webdriver.Remote(command_executor=executor, options=options)
        self.driver.set_page_load_timeout(60)
        self.driver.execute(
            "executeCdpCommand",
            {
                "cmd": "Page.addScriptToEvaluateOnNewDocument",
                "params": {"source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"},
            },
        )
        return self.driver

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.driver is not None:
            try:
                self.driver.quit()
            except Exception:
                pass
        return False
