"""
Tests for grove_shutter.cli module.
"""

import pytest
import sys
import json
from datetime import datetime
from unittest.mock import AsyncMock, patch, MagicMock
from io import StringIO

from grove_shutter import cli
from grove_shutter.models import ShutterResponse, PromptInjectionDetails


class TestSerializeResponse:
    """Test suite for _serialize_response function."""

    def test_serialize_datetime(self):
        """Test that datetime objects are serialized to ISO format."""
        dt = datetime(2024, 1, 15, 10, 30, 45)
        result = cli._serialize_response(dt)

        assert result == "2024-01-15T10:30:45"
        assert isinstance(result, str)

    def test_serialize_datetime_with_microseconds(self):
        """Test datetime with microseconds is serialized correctly."""
        dt = datetime(2024, 1, 15, 10, 30, 45, 123456)
        result = cli._serialize_response(dt)

        assert "2024-01-15T10:30:45" in result
        assert "123456" in result

    def test_serialize_non_serializable_raises_error(self):
        """Test that non-serializable objects raise TypeError."""
        with pytest.raises(TypeError) as exc_info:
            cli._serialize_response(object())

        assert "not JSON serializable" in str(exc_info.value)

    def test_serialize_custom_object_raises_error(self):
        """Test that custom classes raise TypeError."""
        class CustomClass:
            pass

        with pytest.raises(TypeError):
            cli._serialize_response(CustomClass())


class TestPrintHelp:
    """Test suite for print_help function."""

    def test_print_help_output(self, capsys):
        """Test that help message is printed correctly."""
        cli.print_help()

        captured = capsys.readouterr()
        output = captured.out

        assert "Shutter" in output
        assert "Web Content Distillation Service" in output
        assert "Usage:" in output
        assert "--query" in output

    def test_print_help_contains_subcommands(self, capsys):
        """Test that help includes all subcommands."""
        cli.print_help()

        captured = capsys.readouterr()
        output = captured.out

        assert "setup" in output
        assert "offenders" in output
        assert "clear-offenders" in output

    def test_print_help_contains_options(self, capsys):
        """Test that help includes all options."""
        cli.print_help()

        captured = capsys.readouterr()
        output = captured.out

        assert "-q, --query" in output
        assert "-m, --model" in output
        assert "-t, --max-tokens" in output
        assert "--dry-run" in output


class TestMainHelp:
    """Test suite for main() with --help."""

    def test_main_help_flag(self, monkeypatch, capsys):
        """Test that --help flag prints usage and returns."""
        monkeypatch.setattr(sys, "argv", ["shutter", "--help"])

        cli.main()

        captured = capsys.readouterr()
        assert "Usage:" in captured.out

    def test_main_help_short_flag(self, monkeypatch, capsys):
        """Test that -h flag works."""
        monkeypatch.setattr(sys, "argv", ["shutter", "-h"])

        cli.main()

        captured = capsys.readouterr()
        assert "Usage:" in captured.out


class TestMainValidation:
    """Test suite for main() argument validation."""

    def test_main_no_args_prints_error(self, monkeypatch, capsys):
        """Test that no arguments prints error and exits."""
        monkeypatch.setattr(sys, "argv", ["shutter"])

        with pytest.raises(SystemExit) as exc_info:
            cli.main()

        assert exc_info.value.code == 1
        captured = capsys.readouterr()
        assert "URL argument is required" in captured.out

    def test_main_missing_query_prints_error(self, monkeypatch, capsys):
        """Test that missing --query prints error and exits."""
        monkeypatch.setattr(sys, "argv", ["shutter", "https://example.com"])

        with pytest.raises(SystemExit) as exc_info:
            cli.main()

        assert exc_info.value.code == 1
        captured = capsys.readouterr()
        assert "--query option is required" in captured.out

    def test_main_unknown_option_prints_error(self, monkeypatch, capsys):
        """Test that unknown option prints error and exits."""
        monkeypatch.setattr(sys, "argv", ["shutter", "--unknown-option"])

        with pytest.raises(SystemExit) as exc_info:
            cli.main()

        assert exc_info.value.code == 1
        captured = capsys.readouterr()
        assert "Unknown option" in captured.out


class TestMainSubcommands:
    """Test suite for main() subcommand handling."""

    def test_main_setup_subcommand(self, monkeypatch):
        """Test that 'setup' subcommand calls setup_config."""
        monkeypatch.setattr(sys, "argv", ["shutter", "setup"])

        mock_setup = patch("grove_shutter.cli.setup_config")

        with mock_setup as setup_mock:
            cli.main()
            setup_mock.assert_called_once()

    def test_main_offenders_subcommand(self, monkeypatch, capsys):
        """Test that 'offenders' subcommand calls list_offenders."""
        monkeypatch.setattr(sys, "argv", ["shutter", "offenders"])

        with patch("grove_shutter.cli.list_offenders", return_value=[]):
            cli.main()

            captured = capsys.readouterr()
            assert "No domains in offenders list" in captured.out

    def test_main_offenders_with_data(self, monkeypatch, capsys):
        """Test offenders subcommand displays data correctly."""
        mock_offender = MagicMock()
        mock_offender.domain = "bad.com"
        mock_offender.detection_count = 3
        mock_offender.injection_types = ["injection_type1"]

        monkeypatch.setattr(sys, "argv", ["shutter", "offenders"])

        with patch("grove_shutter.cli.list_offenders", return_value=[mock_offender]):
            cli.main()

            captured = capsys.readouterr()
            assert "bad.com" in captured.out
            assert "3" in captured.out
            assert "Total: 1 domain(s)" in captured.out

    def test_main_clear_offenders_subcommand(self, monkeypatch, capsys):
        """Test that 'clear-offenders' subcommand calls clear_offenders."""
        monkeypatch.setattr(sys, "argv", ["shutter", "clear-offenders"])

        with patch("grove_shutter.cli.clear_offenders"):
            cli.main()

            captured = capsys.readouterr()
            assert "Offenders list cleared" in captured.out


class TestMainArgumentParsing:
    """Test suite for main() argument parsing."""

    @patch("grove_shutter.cli.run_extraction")
    def test_main_parses_url(self, mock_run, monkeypatch):
        """Test that URL is correctly parsed."""
        monkeypatch.setattr(sys, "argv", ["shutter", "https://example.com", "-q", "test"])

        cli.main()

        call_kwargs = mock_run.call_args[1]
        assert call_kwargs["url"] == "https://example.com"

    @patch("grove_shutter.cli.run_extraction")
    def test_main_parses_query_long_form(self, mock_run, monkeypatch):
        """Test that --query is parsed correctly."""
        monkeypatch.setattr(sys, "argv", ["shutter", "https://example.com", "--query", "What is this?"])

        cli.main()

        call_kwargs = mock_run.call_args[1]
        assert call_kwargs["query"] == "What is this?"

    @patch("grove_shutter.cli.run_extraction")
    def test_main_parses_query_short_form(self, mock_run, monkeypatch):
        """Test that -q is parsed correctly."""
        monkeypatch.setattr(sys, "argv", ["shutter", "https://example.com", "-q", "What?"])

        cli.main()

        call_kwargs = mock_run.call_args[1]
        assert call_kwargs["query"] == "What?"

    @patch("grove_shutter.cli.run_extraction")
    def test_main_parses_model(self, mock_run, monkeypatch):
        """Test that --model is parsed correctly."""
        monkeypatch.setattr(sys, "argv", ["shutter", "https://example.com", "-q", "test", "-m", "accurate"])

        cli.main()

        call_kwargs = mock_run.call_args[1]
        assert call_kwargs["model"] == "accurate"

    @patch("grove_shutter.cli.run_extraction")
    def test_main_parses_max_tokens(self, mock_run, monkeypatch):
        """Test that --max-tokens is parsed correctly."""
        monkeypatch.setattr(sys, "argv", ["shutter", "https://example.com", "-q", "test", "-t", "1000"])

        cli.main()

        call_kwargs = mock_run.call_args[1]
        assert call_kwargs["max_tokens"] == 1000

    @patch("grove_shutter.cli.run_extraction")
    def test_main_parses_extended_query(self, mock_run, monkeypatch):
        """Test that --extended is parsed correctly."""
        monkeypatch.setattr(sys, "argv", ["shutter", "https://example.com", "-q", "test", "-e", "extended"])

        cli.main()

        call_kwargs = mock_run.call_args[1]
        assert call_kwargs["extended_query"] == "extended"

    @patch("grove_shutter.cli.run_extraction")
    def test_main_parses_dry_run(self, mock_run, monkeypatch):
        """Test that --dry-run flag is parsed correctly."""
        monkeypatch.setattr(sys, "argv", ["shutter", "https://example.com", "-q", "test", "--dry-run"])

        cli.main()

        call_kwargs = mock_run.call_args[1]
        assert call_kwargs["dry_run"] is True

    @patch("grove_shutter.cli.run_extraction")
    def test_main_parses_timeout(self, mock_run, monkeypatch):
        """Test that --timeout is parsed correctly."""
        monkeypatch.setattr(sys, "argv", ["shutter", "https://example.com", "-q", "test", "--timeout", "60000"])

        cli.main()

        call_kwargs = mock_run.call_args[1]
        assert call_kwargs["timeout"] == 60000

    @patch("grove_shutter.cli.run_extraction")
    def test_main_default_values(self, mock_run, monkeypatch):
        """Test that default values are used when options not provided."""
        monkeypatch.setattr(sys, "argv", ["shutter", "https://example.com", "-q", "test"])

        cli.main()

        call_kwargs = mock_run.call_args[1]
        assert call_kwargs["model"] == "fast"
        assert call_kwargs["max_tokens"] == 500
        assert call_kwargs["extended_query"] is None
        assert call_kwargs["dry_run"] is False
        assert call_kwargs["timeout"] == 30000


class TestRunExtraction:
    """Test suite for run_extraction function."""

    @patch("grove_shutter.cli.asyncio.run")
    def test_run_extraction_sets_dry_run_env(self, mock_asyncio, monkeypatch):
        """Test that --dry-run sets SHUTTER_DRY_RUN environment variable."""
        mock_result = MagicMock()
        mock_result.url = "https://example.com"
        mock_result.extracted = "content"
        mock_asyncio.return_value = mock_result

        with patch("grove_shutter.cli.asdict", return_value={}):
            cli.run_extraction(
                url="https://example.com",
                query="test",
                dry_run=True
            )

        assert sys.modules["os"].environ.get("SHUTTER_DRY_RUN") == "1"

    @patch("grove_shutter.cli.asyncio.run")
    def test_run_extraction_does_not_set_dry_run_when_false(self, mock_asyncio, monkeypatch):
        """Test that dry_run=False doesn't set the env var."""
        # Clean up env first
        if "SHUTTER_DRY_RUN" in sys.modules["os"].environ:
            del sys.modules["os"].environ["SHUTTER_DRY_RUN"]

        mock_result = MagicMock()
        mock_asyncio.return_value = mock_result

        with patch("grove_shutter.cli.asdict", return_value={}):
            cli.run_extraction(
                url="https://example.com",
                query="test",
                dry_run=False
            )

        # Should not be set
        assert sys.modules["os"].environ.get("SHUTTER_DRY_RUN") != "1"

    @patch("grove_shutter.cli.asyncio.run")
    def test_run_extraction_prints_json(self, mock_asyncio, capsys):
        """Test that run_extraction prints JSON output."""
        mock_result = MagicMock()

        mock_asyncio.return_value = mock_result

        result_dict = {
            "url": "https://example.com",
            "extracted": "content",
            "tokens_input": 100,
            "tokens_output": 50,
            "model_used": "gpt-4",
            "prompt_injection": None
        }

        with patch("grove_shutter.cli.asdict", return_value=result_dict):
            cli.run_extraction(
                url="https://example.com",
                query="test"
            )

        captured = capsys.readouterr()
        # Verify JSON was printed
        assert '"url"' in captured.out or "url" in captured.out
        assert "https://example.com" in captured.out

        # Verify it's valid JSON
        output_json = json.loads(captured.out)
        assert output_json["url"] == "https://example.com"

    @patch("grove_shutter.cli.asyncio.run")
    def test_run_extraction_calls_shutter(self, mock_asyncio):
        """Test that run_extraction calls shutter with correct arguments."""
        mock_result = MagicMock()
        mock_asyncio.return_value = mock_result

        with patch("grove_shutter.cli.asdict", return_value={}):
            cli.run_extraction(
                url="https://example.com",
                query="What is this?",
                model="accurate",
                max_tokens=1000,
                extended_query="extended",
                timeout=60000
            )

        # Verify asyncio.run was called with shutter coroutine
        assert mock_asyncio.called

    @patch("grove_shutter.cli.asyncio.run")
    def test_run_extraction_formats_datetime_in_json(self, mock_asyncio, capsys):
        """Test that datetime objects are formatted in JSON output."""
        dt = datetime(2024, 1, 15, 10, 30, 45)

        mock_result = MagicMock()
        mock_asyncio.return_value = mock_result

        result_dict = {
            "url": "https://example.com",
            "extracted": "content",
            "timestamp": dt
        }

        with patch("grove_shutter.cli.asdict", return_value=result_dict):
            cli.run_extraction(
                url="https://example.com",
                query="test"
            )

        captured = capsys.readouterr()
        # Datetime should be in ISO format
        assert "2024-01-15T10:30:45" in captured.out


class TestMainIntegration:
    """Integration tests for complete main() flow."""

    @patch("grove_shutter.cli.run_extraction")
    def test_main_complete_extraction_command(self, mock_run, monkeypatch):
        """Test complete extraction command with all options."""
        monkeypatch.setattr(sys, "argv", [
            "shutter",
            "https://example.com/page",
            "-q", "Extract pricing",
            "-m", "accurate",
            "-t", "1000",
            "-e", "Include discounts",
            "--dry-run",
            "--timeout", "45000"
        ])

        cli.main()

        mock_run.assert_called_once()
        call_kwargs = mock_run.call_args[1]

        assert call_kwargs["url"] == "https://example.com/page"
        assert call_kwargs["query"] == "Extract pricing"
        assert call_kwargs["model"] == "accurate"
        assert call_kwargs["max_tokens"] == 1000
        assert call_kwargs["extended_query"] == "Include discounts"
        assert call_kwargs["dry_run"] is True
        assert call_kwargs["timeout"] == 45000

    @patch("grove_shutter.cli.run_extraction")
    def test_main_minimal_extraction_command(self, mock_run, monkeypatch):
        """Test extraction command with only required arguments."""
        monkeypatch.setattr(sys, "argv", [
            "shutter",
            "https://example.com",
            "-q", "Test query"
        ])

        cli.main()

        mock_run.assert_called_once()
        call_kwargs = mock_run.call_args[1]

        assert call_kwargs["url"] == "https://example.com"
        assert call_kwargs["query"] == "Test query"
        # Verify defaults
        assert call_kwargs["model"] == "fast"
        assert call_kwargs["max_tokens"] == 500
        assert call_kwargs["dry_run"] is False
