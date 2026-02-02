"""Tests for MCP server tools."""

import json
import pytest
from unittest.mock import Mock, patch, MagicMock


class TestMCPToolDefinitions:
    """Test that MCP tools are properly defined."""

    def test_mcp_server_imports(self):
        """MCP server module should import without errors."""
        from gw.mcp_server import mcp
        assert mcp is not None

    def test_mcp_server_has_tools(self):
        """MCP server should have tools defined."""
        from gw.mcp_server import (
            grove_db_query,
            grove_db_tables,
            grove_db_schema,
            grove_tenant_lookup,
            grove_cache_list,
            grove_git_status,
            grove_git_log,
            grove_gh_pr_list,
            grove_packages_list,
        )
        # All should be callable
        assert callable(grove_db_query)
        assert callable(grove_db_tables)
        assert callable(grove_db_schema)
        assert callable(grove_tenant_lookup)
        assert callable(grove_cache_list)
        assert callable(grove_git_status)
        assert callable(grove_git_log)
        assert callable(grove_gh_pr_list)
        assert callable(grove_packages_list)


class TestDatabaseTools:
    """Test database MCP tools."""

    def test_grove_db_query_blocks_writes(self):
        """Write operations should be blocked in MCP mode."""
        from gw.mcp_server import grove_db_query

        # Test various write operations
        for sql in [
            "INSERT INTO users VALUES (1, 'test')",
            "UPDATE users SET name = 'test'",
            "DELETE FROM users WHERE id = 1",
            "DROP TABLE users",
            "ALTER TABLE users ADD COLUMN foo",
            "CREATE TABLE test (id INT)",
            "TRUNCATE TABLE users",
        ]:
            result = json.loads(grove_db_query(sql))
            assert "error" in result
            assert "blocked" in result["error"].lower() or "Write operations" in result["error"]

    @patch('gw.mcp_server.Wrangler')
    @patch('gw.mcp_server.get_config')
    def test_grove_db_query_allows_select(self, mock_config, mock_wrangler_class):
        """SELECT queries should be allowed."""
        from gw.mcp_server import grove_db_query

        # Mock config
        mock_cfg = Mock()
        mock_cfg.databases = {"lattice": Mock(name="grove-engine-db")}
        mock_config.return_value = mock_cfg

        # Mock wrangler
        mock_wrangler = Mock()
        mock_wrangler.execute.return_value = json.dumps([{"results": [{"id": 1, "name": "test"}]}])
        mock_wrangler_class.return_value = mock_wrangler

        result = json.loads(grove_db_query("SELECT * FROM users"))
        assert "results" in result

    @patch('gw.mcp_server.Wrangler')
    @patch('gw.mcp_server.get_config')
    def test_grove_db_tables_returns_list(self, mock_config, mock_wrangler_class):
        """grove_db_tables should return table list."""
        from gw.mcp_server import grove_db_tables

        mock_cfg = Mock()
        mock_cfg.databases = {"lattice": Mock(name="grove-engine-db")}
        mock_config.return_value = mock_cfg

        mock_wrangler = Mock()
        mock_wrangler.execute.return_value = json.dumps([{
            "results": [{"name": "users"}, {"name": "posts"}]
        }])
        mock_wrangler_class.return_value = mock_wrangler

        result = json.loads(grove_db_tables())
        assert "tables" in result
        assert "users" in result["tables"]
        assert "posts" in result["tables"]

    def test_grove_db_schema_blocks_sql_injection(self):
        """grove_db_schema should block SQL injection attempts."""
        from gw.mcp_server import grove_db_schema

        # Test various injection attempts
        for table in [
            "users); DROP TABLE users; --",
            "users' OR '1'='1",
            "users; DELETE FROM users",
            "../../../etc/passwd",
            "users/**/OR/**/1=1",
        ]:
            result = json.loads(grove_db_schema(table))
            assert "error" in result
            assert result["error"] == "Invalid table name"


class TestGitTools:
    """Test git MCP tools."""

    @patch('gw.mcp_server.Git')
    def test_grove_git_status_returns_json(self, mock_git_class):
        """grove_git_status should return JSON status."""
        from gw.mcp_server import grove_git_status

        mock_git = Mock()
        mock_git.is_repo.return_value = True
        mock_status = Mock()
        mock_status.branch = "main"
        mock_status.upstream = "origin/main"
        mock_status.ahead = 1
        mock_status.behind = 0
        mock_status.is_clean = False
        mock_status.staged = [("M", "file.py")]
        mock_status.unstaged = []
        mock_status.untracked = ["new.py"]
        mock_git.status.return_value = mock_status
        mock_git_class.return_value = mock_git

        result = json.loads(grove_git_status())
        assert result["branch"] == "main"
        assert result["ahead"] == 1
        assert len(result["staged"]) == 1
        assert "new.py" in result["untracked"]

    @patch('gw.mcp_server.Git')
    def test_grove_git_status_not_repo(self, mock_git_class):
        """grove_git_status should handle non-repo gracefully."""
        from gw.mcp_server import grove_git_status

        mock_git = Mock()
        mock_git.is_repo.return_value = False
        mock_git_class.return_value = mock_git

        result = json.loads(grove_git_status())
        assert "error" in result
        assert "repository" in result["error"].lower()

    @patch('gw.mcp_server.Git')
    def test_grove_git_log_returns_commits(self, mock_git_class):
        """grove_git_log should return commit list."""
        from gw.mcp_server import grove_git_log

        mock_git = Mock()
        mock_git.is_repo.return_value = True

        mock_commit = Mock()
        mock_commit.hash = "abc123def456"
        mock_commit.short_hash = "abc123d"
        mock_commit.author = "Test User"
        mock_commit.date = "2026-02-01"
        mock_commit.message = "Test commit"
        mock_git.log.return_value = [mock_commit]
        mock_git_class.return_value = mock_git

        result = json.loads(grove_git_log(limit=5))
        assert "commits" in result
        assert len(result["commits"]) == 1
        assert result["commits"][0]["author"] == "Test User"


class TestGitHubTools:
    """Test GitHub MCP tools."""

    @patch('gw.mcp_server.GitHub')
    def test_grove_gh_pr_list_returns_prs(self, mock_gh_class):
        """grove_gh_pr_list should return PR list."""
        from gw.mcp_server import grove_gh_pr_list

        mock_gh = Mock()
        mock_gh.pr_list.return_value = [
            {"number": 1, "title": "Test PR", "state": "open"}
        ]
        mock_gh_class.return_value = mock_gh

        result = json.loads(grove_gh_pr_list())
        assert "pull_requests" in result
        assert len(result["pull_requests"]) == 1

    @patch('gw.mcp_server.GitHub')
    def test_grove_gh_issue_list_returns_issues(self, mock_gh_class):
        """grove_gh_issue_list should return issue list."""
        from gw.mcp_server import grove_gh_issue_list

        mock_gh = Mock()
        mock_gh.issue_list.return_value = [
            {"number": 348, "title": "Test Issue", "state": "open"}
        ]
        mock_gh_class.return_value = mock_gh

        result = json.loads(grove_gh_issue_list())
        assert "issues" in result
        assert len(result["issues"]) == 1


class TestDevTools:
    """Test dev tools MCP functions."""

    @patch('gw.mcp_server.load_monorepo')
    def test_grove_packages_list_returns_packages(self, mock_load):
        """grove_packages_list should return package list."""
        from gw.mcp_server import grove_packages_list

        mock_pkg = Mock()
        mock_pkg.name = "engine"
        mock_pkg.path = "/test/packages/engine"
        mock_pkg.package_type = Mock(value="sveltekit")
        mock_pkg.has_script = {"test": True, "build": True}

        mock_monorepo = Mock()
        mock_monorepo.packages = [mock_pkg]
        mock_load.return_value = mock_monorepo

        result = json.loads(grove_packages_list())
        assert "packages" in result
        assert len(result["packages"]) == 1
        assert result["packages"][0]["name"] == "engine"

    @patch('gw.mcp_server.load_monorepo')
    def test_grove_packages_list_not_monorepo(self, mock_load):
        """grove_packages_list should handle non-monorepo."""
        from gw.mcp_server import grove_packages_list

        mock_load.return_value = None

        result = json.loads(grove_packages_list())
        assert "error" in result


class TestMCPSafety:
    """Test MCP safety features."""

    def test_agent_mode_enabled(self):
        """Agent mode should be enabled in MCP server."""
        import os
        from gw import mcp_server  # Import triggers env set

        # The mcp_server module sets this on import
        assert os.environ.get("GW_AGENT_MODE") == "1"

    def test_all_tools_return_json(self):
        """All MCP tools should return valid JSON."""
        from gw.mcp_server import (
            grove_status,
        )

        # grove_status doesn't need mocks
        result = grove_status()
        # Should be valid JSON
        parsed = json.loads(result)
        assert isinstance(parsed, dict)


class TestMCPCommand:
    """Test MCP CLI commands."""

    def test_mcp_command_exists(self):
        """MCP command should be registered."""
        from gw.cli import main
        assert "mcp" in [cmd.name for cmd in main.commands.values()]

    def test_mcp_subcommands_exist(self):
        """MCP subcommands should exist."""
        from gw.commands.mcp import mcp
        subcommands = [cmd.name for cmd in mcp.commands.values()]
        assert "serve" in subcommands
        assert "tools" in subcommands
        assert "config" in subcommands
