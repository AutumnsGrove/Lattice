"""Tests for glimpse.capture.console — ConsoleCollector unit tests.

Uses mock Playwright page objects to test the collector without a browser.
"""

from unittest.mock import MagicMock

from glimpse.capture.console import ConsoleCollector
from glimpse.capture.screenshot import ConsoleMessage


class FakeConsoleMsg:
    """Minimal mock of a Playwright ConsoleMessage."""

    def __init__(self, type_: str, text: str, url: str = "", line: int = 0, col: int = 0):
        self.type = type_
        self.text = text
        self.location = {"url": url, "lineNumber": line, "columnNumber": col}


class FakeError:
    """Minimal mock of a Playwright page error."""

    def __init__(self, message: str):
        self.message = message


class TestConsoleCollector:
    def test_attach_hooks_events(self):
        page = MagicMock()
        collector = ConsoleCollector()
        collector.attach(page)
        page.on.assert_any_call("console", collector._on_console)
        page.on.assert_any_call("pageerror", collector._on_pageerror)

    def test_empty_by_default(self):
        collector = ConsoleCollector()
        assert collector.messages == []

    def test_collects_console_log(self):
        collector = ConsoleCollector()
        msg = FakeConsoleMsg(type_="log", text="Hello world")
        collector._on_console(msg)
        assert len(collector.messages) == 1
        assert collector.messages[0].level == "log"
        assert collector.messages[0].text == "Hello world"

    def test_collects_console_error(self):
        collector = ConsoleCollector()
        msg = FakeConsoleMsg(type_="error", text="TypeError: x is undefined", url="app.js", line=42, col=15)
        collector._on_console(msg)
        assert len(collector.messages) == 1
        assert collector.messages[0].level == "error"
        assert collector.messages[0].url == "app.js"
        assert collector.messages[0].line == 42
        assert collector.messages[0].col == 15

    def test_maps_warn_to_warning(self):
        """Playwright uses 'warn' but our spec uses 'warning'."""
        collector = ConsoleCollector()
        msg = FakeConsoleMsg(type_="warn", text="Deprecated API")
        collector._on_console(msg)
        assert collector.messages[0].level == "warning"

    def test_collects_pageerror(self):
        collector = ConsoleCollector()
        err = FakeError("Uncaught ReferenceError: foo is not defined")
        collector._on_pageerror(err)
        assert len(collector.messages) == 1
        assert collector.messages[0].level == "error"
        assert "Uncaught" in collector.messages[0].text
        assert "ReferenceError" in collector.messages[0].text

    def test_collects_pageerror_without_message_attr(self):
        collector = ConsoleCollector()
        collector._on_pageerror("plain string error")
        assert len(collector.messages) == 1
        assert "Uncaught: plain string error" in collector.messages[0].text

    def test_multiple_messages_ordered(self):
        collector = ConsoleCollector()
        collector._on_console(FakeConsoleMsg(type_="log", text="first"))
        collector._on_console(FakeConsoleMsg(type_="error", text="second"))
        collector._on_pageerror(FakeError("third"))
        assert len(collector.messages) == 3
        assert collector.messages[0].text == "first"
        assert collector.messages[1].text == "second"
        assert "third" in collector.messages[2].text

    def test_messages_returns_copy(self):
        """Messages property should return a copy, not the internal list."""
        collector = ConsoleCollector()
        collector._on_console(FakeConsoleMsg(type_="log", text="test"))
        msgs = collector.messages
        msgs.clear()
        assert len(collector.messages) == 1

    def test_handles_missing_location(self):
        """Console messages without location should use defaults."""
        collector = ConsoleCollector()
        msg = MagicMock()
        msg.type = "log"
        msg.text = "no location"
        # No location attribute
        del msg.location
        collector._on_console(msg)
        assert collector.messages[0].url == ""
        assert collector.messages[0].line == 0
