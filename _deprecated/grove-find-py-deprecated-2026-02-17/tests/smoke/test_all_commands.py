"""Smoke tests to verify all commands run without crashing.

These tests verify that commands can be invoked and don't crash,
but don't verify specific output content.
"""

import pytest
from typer.testing import CliRunner

from grove_find.cli import app

runner = CliRunner()


class TestCLISmoke:
    """Smoke tests for CLI commands."""

    def test_help(self):
        """Test --help shows usage."""
        result = runner.invoke(app, ["--help"])
        assert result.exit_code == 0
        assert "grove-find" in result.stdout.lower() or "gf" in result.stdout.lower()

    def test_version(self):
        """Test --version shows version."""
        result = runner.invoke(app, ["--version"])
        assert result.exit_code == 0
        assert "1.0.0" in result.stdout

    @pytest.mark.parametrize(
        "command",
        [
            ["class", "--help"],
            ["func", "--help"],
            ["usage", "--help"],
            ["imports", "--help"],
            ["svelte", "--help"],
            ["ts", "--help"],
            ["js", "--help"],
            ["css", "--help"],
            ["md", "--help"],
            ["json", "--help"],
            ["toml", "--help"],
            ["yaml", "--help"],
            ["html", "--help"],
            ["shell", "--help"],
            ["recent", "--help"],
            ["changed", "--help"],
            ["todo", "--help"],
            ["log", "--help"],
            ["env", "--help"],
            ["stats", "--help"],
            ["briefing", "--help"],
            ["routes", "--help"],
            ["db", "--help"],
            ["glass", "--help"],
            ["test", "--help"],
            ["config", "--help"],
            ["store", "--help"],
            ["type", "--help"],
            ["export", "--help"],
            ["auth", "--help"],
            ["engine", "--help"],
            # Infrastructure commands
            ["large", "--help"],
            ["orphaned", "--help"],
            ["migrations", "--help"],
            ["flags", "--help"],
            ["workers", "--help"],
            ["emails", "--help"],
            ["deps", "--help"],
            ["config-diff", "--help"],
        ],
    )
    def test_command_help(self, command):
        """Test that each command's --help works."""
        result = runner.invoke(app, command)
        assert result.exit_code == 0

    def test_git_subcommands_help(self):
        """Test git subcommand group help."""
        result = runner.invoke(app, ["git", "--help"])
        assert result.exit_code == 0
        assert "blame" in result.stdout.lower() or "churn" in result.stdout.lower()

    def test_github_subcommands_help(self):
        """Test github subcommand group help."""
        result = runner.invoke(app, ["github", "--help"])
        assert result.exit_code == 0
        assert "issue" in result.stdout

    def test_cf_subcommands_help(self):
        """Test cloudflare subcommand group help."""
        result = runner.invoke(app, ["cf", "--help"])
        assert result.exit_code == 0


class TestAgentMode:
    """Test agent mode flag handling."""

    def test_agent_flag(self):
        """Test --agent flag is accepted."""
        result = runner.invoke(app, ["--agent", "--help"])
        assert result.exit_code == 0

    def test_json_flag(self):
        """Test --json flag is accepted."""
        result = runner.invoke(app, ["--json", "--help"])
        assert result.exit_code == 0
