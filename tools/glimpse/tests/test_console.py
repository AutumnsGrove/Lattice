"""Tests for glimpse.output.formatter — output mode behavior."""

import json
from io import StringIO
from pathlib import Path
from unittest.mock import patch

from glimpse.capture.screenshot import CaptureResult, ConsoleMessage
from glimpse.output.formatter import GlimpseOutput, _format_bytes, _display_url


class TestFormatBytes:
    def test_bytes(self):
        assert _format_bytes(500) == "500 B"

    def test_kilobytes(self):
        assert _format_bytes(2048) == "2.0 KB"

    def test_megabytes(self):
        assert _format_bytes(1_500_000) == "1.4 MB"

    def test_zero(self):
        assert _format_bytes(0) == "0 B"


class TestDisplayUrl:
    def test_strips_https(self):
        assert _display_url("https://grove.place") == "grove.place"

    def test_strips_http(self):
        assert _display_url("http://localhost:3000") == "localhost:3000"

    def test_strips_trailing_slash(self):
        assert _display_url("https://grove.place/") == "grove.place"


class TestAgentMode:
    def test_success_prints_path_only(self):
        output = GlimpseOutput(mode="agent")
        result = CaptureResult(
            output_path=Path("/tmp/test.png"),
            url="https://grove.place",
            size_bytes=1000,
        )
        with patch("sys.stdout", new_callable=StringIO) as mock_stdout:
            output.print_capture(result)
            assert "/tmp/test.png" in mock_stdout.getvalue()

    def test_failure_uses_fail_prefix(self):
        """Agent mode failures use [FAIL] prefix per spec contract."""
        output = GlimpseOutput(mode="agent")
        result = CaptureResult(error="Navigation failed")
        with patch("sys.stdout", new_callable=StringIO) as mock_stdout:
            output.print_capture(result)
            assert "[FAIL]" in mock_stdout.getvalue()
            assert "Navigation failed" in mock_stdout.getvalue()

    def test_console_errors_printed_after_path(self):
        """Agent mode prints [ERROR] lines after the screenshot path."""
        output = GlimpseOutput(mode="agent")
        result = CaptureResult(
            output_path=Path("/tmp/test.png"),
            url="https://grove.place",
            size_bytes=1000,
            console_messages=[
                ConsoleMessage(level="error", text="TypeError: x is undefined", url="page.svelte", line=42, col=15),
                ConsoleMessage(level="warning", text="Deprecated API usage"),
            ],
        )
        with patch("sys.stdout", new_callable=StringIO) as mock_stdout:
            output.print_capture(result)
            lines = mock_stdout.getvalue().strip().split("\n")
            assert "/tmp/test.png" in lines[0]
            assert "[ERROR]" in lines[1]
            assert "TypeError" in lines[1]
            assert "(page.svelte:42:15)" in lines[1]
            assert "[WARN]" in lines[2]
            assert "Deprecated" in lines[2]

    def test_print_error_uses_fail_prefix(self):
        """print_error in agent mode uses [FAIL] prefix."""
        output = GlimpseOutput(mode="agent")
        with patch("sys.stdout", new_callable=StringIO) as mock_stdout:
            output.print_error("Server not reachable: localhost:5173")
            assert "[FAIL]" in mock_stdout.getvalue()


class TestJsonMode:
    def test_success_output_is_valid_json(self):
        output = GlimpseOutput(mode="json")
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
        with patch("sys.stdout", new_callable=StringIO) as mock_stdout:
            output.print_capture(result)
            data = json.loads(mock_stdout.getvalue())
            assert data["url"] == "https://grove.place"
            assert data["season"] == "autumn"
            assert data["theme"] == "dark"
            assert data["viewport"]["width"] == 1920
            assert data["size_bytes"] == 1234567

    def test_error_output_is_valid_json(self):
        output = GlimpseOutput(mode="json")
        result = CaptureResult(error="Something broke")
        with patch("sys.stdout", new_callable=StringIO) as mock_stdout:
            output.print_capture(result)
            data = json.loads(mock_stdout.getvalue())
            assert data["error"] == "Something broke"

    def test_error_message_is_json(self):
        output = GlimpseOutput(mode="json")
        with patch("sys.stdout", new_callable=StringIO) as mock_stdout:
            output.print_error("Bad URL")
            data = json.loads(mock_stdout.getvalue())
            assert data["error"] == "Bad URL"

    def test_console_messages_in_json(self):
        """JSON output includes console array and counts when logs captured."""
        output = GlimpseOutput(mode="json")
        result = CaptureResult(
            output_path=Path("/tmp/test.png"),
            url="https://grove.place",
            console_messages=[
                ConsoleMessage(level="error", text="TypeError", url="page.svelte", line=42),
                ConsoleMessage(level="warning", text="Deprecated"),
                ConsoleMessage(level="log", text="Debug info"),
            ],
        )
        with patch("sys.stdout", new_callable=StringIO) as mock_stdout:
            output.print_capture(result)
            data = json.loads(mock_stdout.getvalue())
            assert "console" in data
            assert len(data["console"]) == 3
            assert data["error_count"] == 1
            assert data["warning_count"] == 1
            assert data["log_count"] == 1
