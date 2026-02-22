"""Tests for UI helpers - terminal detection and output formatting."""

import os
from unittest.mock import patch, MagicMock

import pytest

from gw.ui import is_interactive


# ============================================================================
# Interactive Mode Detection Tests
# ============================================================================


class TestIsInteractive:
    """Tests for is_interactive() detection."""

    def test_not_interactive_when_stdin_not_tty(self) -> None:
        """Test that non-TTY stdin returns False."""
        with patch("sys.stdin.isatty", return_value=False):
            assert not is_interactive()

    def test_not_interactive_when_agent_mode_set(self) -> None:
        """Test that GW_AGENT_MODE env var returns False."""
        with patch("sys.stdin.isatty", return_value=True):
            with patch.dict(os.environ, {"GW_AGENT_MODE": "1"}):
                assert not is_interactive()

    def test_not_interactive_when_mcp_server_mode(self) -> None:
        """Test that GW_MCP_SERVER env var returns False."""
        with patch("sys.stdin.isatty", return_value=True):
            with patch.dict(os.environ, {"GW_MCP_SERVER": "1"}, clear=False):
                # Need to clear agent mode if it's set
                os.environ.pop("GW_AGENT_MODE", None)
                assert not is_interactive()

    def test_not_interactive_when_no_interactive_set(self) -> None:
        """Test that NO_INTERACTIVE env var returns False."""
        with patch("sys.stdin.isatty", return_value=True):
            with patch.dict(os.environ, {"NO_INTERACTIVE": "1"}, clear=False):
                os.environ.pop("GW_AGENT_MODE", None)
                os.environ.pop("GW_MCP_SERVER", None)
                assert not is_interactive()

    def test_interactive_when_tty_and_no_env_flags(self) -> None:
        """Test that TTY without env flags returns True."""
        with patch("sys.stdin.isatty", return_value=True):
            with patch.dict(os.environ, {}, clear=True):
                # Ensure no agent/mcp flags are set
                for key in ["GW_AGENT_MODE", "GW_MCP_SERVER", "NO_INTERACTIVE"]:
                    os.environ.pop(key, None)
                assert is_interactive()

    def test_agent_mode_truthy_values(self) -> None:
        """Test various truthy values for GW_AGENT_MODE."""
        truthy_values = ["1", "true", "yes", "TRUE", "Yes", "anything"]

        with patch("sys.stdin.isatty", return_value=True):
            for val in truthy_values:
                with patch.dict(os.environ, {"GW_AGENT_MODE": val}):
                    # Any non-empty value should be truthy
                    assert not is_interactive(), f"Failed for GW_AGENT_MODE={val}"

    def test_priority_stdin_checked_first(self) -> None:
        """Test that stdin TTY check happens before env var checks."""
        # Even with no env vars, non-TTY stdin should return False
        with patch("sys.stdin.isatty", return_value=False):
            with patch.dict(os.environ, {}, clear=True):
                assert not is_interactive()
