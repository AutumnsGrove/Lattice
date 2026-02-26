"""Tests for glimpse.capture.screenshot — dataclass contracts."""

from pathlib import Path

from glimpse.capture.screenshot import CaptureRequest, CaptureResult, ConsoleMessage


class TestConsoleMessage:
    def test_basic_creation(self):
        msg = ConsoleMessage(level="error", text="TypeError: x is undefined")
        assert msg.level == "error"
        assert msg.text == "TypeError: x is undefined"
        assert msg.url == ""
        assert msg.line == 0
        assert msg.col == 0

    def test_full_creation(self):
        msg = ConsoleMessage(
            level="warning",
            text="Deprecated API",
            url="page.svelte",
            line=42,
            col=15,
        )
        assert msg.level == "warning"
        assert msg.text == "Deprecated API"
        assert msg.url == "page.svelte"
        assert msg.line == 42
        assert msg.col == 15

    def test_to_dict_minimal(self):
        msg = ConsoleMessage(level="error", text="Boom")
        d = msg.to_dict()
        assert d == {"level": "error", "text": "Boom"}
        assert "url" not in d
        assert "line" not in d

    def test_to_dict_full(self):
        msg = ConsoleMessage(level="error", text="Boom", url="app.js", line=10, col=5)
        d = msg.to_dict()
        assert d["url"] == "app.js"
        assert d["line"] == 10
        assert d["col"] == 5


class TestCaptureRequest:
    def test_defaults(self):
        """Spec defaults: 1920x1080, scale 2, wait 500, png, quality 90."""
        req = CaptureRequest(url="https://grove.place")
        assert req.width == 1920
        assert req.height == 1080
        assert req.scale == 2
        assert req.wait_ms == 500
        assert req.format == "png"
        assert req.quality == 90
        assert req.full_page is False
        assert req.no_inject is False
        assert req.timeout_ms == 30000

    def test_optional_fields_default_none(self):
        req = CaptureRequest(url="https://grove.place")
        assert req.season is None
        assert req.theme is None
        assert req.grove_mode is None
        assert req.selector is None
        assert req.output_path is None

    def test_logs_default_false(self):
        req = CaptureRequest(url="https://grove.place")
        assert req.logs is False

    def test_wait_strategy_default_fixed(self):
        req = CaptureRequest(url="https://grove.place")
        assert req.wait_strategy == "fixed"

    def test_custom_values(self):
        req = CaptureRequest(
            url="https://grove.place",
            season="autumn",
            theme="dark",
            width=1440,
            height=900,
            scale=1,
            full_page=True,
        )
        assert req.season == "autumn"
        assert req.theme == "dark"
        assert req.width == 1440
        assert req.height == 900
        assert req.scale == 1
        assert req.full_page is True

    def test_logs_and_wait_strategy(self):
        req = CaptureRequest(
            url="https://grove.place",
            logs=True,
            wait_strategy="networkidle",
        )
        assert req.logs is True
        assert req.wait_strategy == "networkidle"


class TestCaptureResult:
    def test_success_property(self):
        result = CaptureResult(output_path=Path("/tmp/test.png"))
        assert result.success is True

    def test_failure_property(self):
        result = CaptureResult(error="Navigation failed")
        assert result.success is False

    def test_no_path_is_failure(self):
        result = CaptureResult()
        assert result.success is False

    def test_console_messages_default_empty(self):
        result = CaptureResult()
        assert result.console_messages == []

    def test_error_count(self):
        result = CaptureResult(console_messages=[
            ConsoleMessage(level="error", text="err1"),
            ConsoleMessage(level="error", text="err2"),
            ConsoleMessage(level="warning", text="warn1"),
            ConsoleMessage(level="log", text="log1"),
        ])
        assert result.error_count == 2

    def test_warning_count(self):
        result = CaptureResult(console_messages=[
            ConsoleMessage(level="error", text="err1"),
            ConsoleMessage(level="warning", text="warn1"),
            ConsoleMessage(level="warning", text="warn2"),
        ])
        assert result.warning_count == 2

    def test_log_count(self):
        result = CaptureResult(console_messages=[
            ConsoleMessage(level="error", text="err1"),
            ConsoleMessage(level="warning", text="warn1"),
            ConsoleMessage(level="log", text="log1"),
            ConsoleMessage(level="info", text="info1"),
            ConsoleMessage(level="debug", text="dbg1"),
        ])
        assert result.log_count == 3

    def test_counts_zero_when_no_messages(self):
        result = CaptureResult()
        assert result.error_count == 0
        assert result.warning_count == 0
        assert result.log_count == 0

    def test_to_dict_success(self):
        result = CaptureResult(
            output_path=Path("/tmp/test.png"),
            url="https://grove.place",
            season="autumn",
            theme="dark",
            viewport=(1920, 1080),
            scale=2,
            size_bytes=1234567,
            duration_ms=3500,
        )
        d = result.to_dict()
        assert d["url"] == "https://grove.place"
        assert d["output"] == "/tmp/test.png"
        assert d["season"] == "autumn"
        assert d["theme"] == "dark"
        assert d["viewport"] == {"width": 1920, "height": 1080}
        assert d["scale"] == 2
        assert d["size_bytes"] == 1234567
        assert d["duration_ms"] == 3500
        assert "error" not in d

    def test_to_dict_error(self):
        result = CaptureResult(error="Something broke")
        d = result.to_dict()
        assert d["error"] == "Something broke"
        assert d["output"] is None

    def test_to_dict_with_console(self):
        result = CaptureResult(
            output_path=Path("/tmp/test.png"),
            url="https://grove.place",
            console_messages=[
                ConsoleMessage(level="error", text="TypeError", url="app.js", line=10),
                ConsoleMessage(level="warning", text="Deprecated"),
                ConsoleMessage(level="log", text="Debug info"),
            ],
        )
        d = result.to_dict()
        assert "console" in d
        assert len(d["console"]) == 3
        assert d["console"][0]["level"] == "error"
        assert d["console"][0]["text"] == "TypeError"
        assert d["error_count"] == 1
        assert d["warning_count"] == 1
        assert d["log_count"] == 1

    def test_to_dict_no_console_key_when_empty(self):
        result = CaptureResult(
            output_path=Path("/tmp/test.png"),
            url="https://grove.place",
        )
        d = result.to_dict()
        assert "console" not in d
        assert "error_count" not in d
