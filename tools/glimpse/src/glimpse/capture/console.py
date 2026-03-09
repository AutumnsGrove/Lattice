"""Console message collector for Glimpse.

Attaches to a Playwright page before navigation to capture all console
output (log, warn, error, info, debug) and uncaught exceptions. This is
the core of the --logs verification loop: screenshots show what looks
wrong, console logs show why it is wrong.
"""

from glimpse.capture.screenshot import ConsoleMessage


class ConsoleCollector:
    """Collects browser console messages from a Playwright page.

    Attach to a page before navigation so it catches page-load errors:

        collector = ConsoleCollector()
        collector.attach(page)
        await page.goto(url)
        messages = collector.messages
    """

    def __init__(self) -> None:
        self._messages: list[ConsoleMessage] = []

    @property
    def messages(self) -> list[ConsoleMessage]:
        """All collected console messages."""
        return list(self._messages)

    def attach(self, page) -> None:
        """Hook into a Playwright page's console and error events.

        Must be called before page.goto() to capture page-load messages.
        """
        page.on("console", self._on_console)
        page.on("pageerror", self._on_pageerror)

    def _on_console(self, msg) -> None:
        """Handle a console event from Playwright."""
        # Map Playwright's msg.type to our level names
        level = msg.type
        if level == "warn":
            level = "warning"

        location = msg.location if hasattr(msg, "location") else {}
        url = location.get("url", "") if isinstance(location, dict) else ""
        line = location.get("lineNumber", 0) if isinstance(location, dict) else 0
        col = location.get("columnNumber", 0) if isinstance(location, dict) else 0

        self._messages.append(
            ConsoleMessage(
                level=level,
                text=msg.text,
                url=url,
                line=line,
                col=col,
            )
        )

    def _on_pageerror(self, exc) -> None:
        """Handle an uncaught exception from Playwright."""
        self._messages.append(
            ConsoleMessage(
                level="error",
                text=f"Uncaught: {exc.message}" if hasattr(exc, "message") else f"Uncaught: {exc}",
            )
        )
