"""Tests for GitHub integration - wrapper, safety, and commands."""

import os
from unittest.mock import MagicMock, patch
from datetime import datetime

import pytest

from gw.gh_wrapper import GitHub, GitHubError, PullRequest, Issue, WorkflowRun, RateLimit
from gw.safety.github import (
    DEFAULT_GITHUB_SAFETY_CONFIG,
    GitHubSafetyConfig,
    GitHubSafetyError,
    GitHubSafetyTier,
    RateLimitError,
    check_github_safety,
    get_api_tier_from_method,
    should_block_rate_limit,
    should_warn_rate_limit,
)


# ============================================================================
# GitHub Safety Tier Tests
# ============================================================================


class TestOperationTiers:
    """Tests for operation tier classification."""

    def test_read_operations_are_tier_1(self) -> None:
        """Test that read operations are classified as READ tier."""
        from gw.safety.github import get_operation_tier, OPERATION_TIERS

        read_ops = [
            "pr_list", "pr_view", "pr_status",
            "issue_list", "issue_view",
            "run_list", "run_view",
            "api_get", "rate_limit",
        ]
        for op in read_ops:
            assert get_operation_tier(op) == GitHubSafetyTier.READ, f"{op} should be READ"

    def test_write_operations_are_tier_2(self) -> None:
        """Test that write operations are classified as WRITE tier."""
        from gw.safety.github import get_operation_tier

        write_ops = [
            "pr_create", "pr_comment", "pr_review", "pr_edit",
            "issue_create", "issue_comment", "issue_edit",
            "run_rerun", "run_cancel",
            "api_post", "api_patch",
        ]
        for op in write_ops:
            assert get_operation_tier(op) == GitHubSafetyTier.WRITE, f"{op} should be WRITE"

    def test_destructive_operations_are_tier_3(self) -> None:
        """Test that destructive operations are classified as DESTRUCTIVE tier."""
        from gw.safety.github import get_operation_tier

        destructive_ops = [
            "pr_merge", "pr_close",
            "issue_close", "issue_reopen",
            "api_delete",
        ]
        for op in destructive_ops:
            assert get_operation_tier(op) == GitHubSafetyTier.DESTRUCTIVE, f"{op} should be DESTRUCTIVE"


class TestSafetyChecks:
    """Tests for safety check enforcement."""

    def test_read_operations_always_allowed(self) -> None:
        """Test that read operations don't require flags."""
        # Should not raise
        check_github_safety("pr_list", write_flag=False)
        check_github_safety("issue_view", write_flag=False)
        check_github_safety("run_list", write_flag=False)

    def test_write_operations_require_write_flag(self) -> None:
        """Test that write operations require --write flag."""
        with pytest.raises(GitHubSafetyError) as exc_info:
            check_github_safety("pr_create", write_flag=False)
        assert exc_info.value.tier == GitHubSafetyTier.WRITE
        assert "--write" in exc_info.value.suggestion

    def test_write_operations_allowed_with_flag(self) -> None:
        """Test that write operations are allowed with --write flag."""
        # Should not raise
        check_github_safety("pr_create", write_flag=True)
        check_github_safety("issue_comment", write_flag=True)

    def test_destructive_operations_require_write_flag(self) -> None:
        """Test that destructive operations require --write flag."""
        with pytest.raises(GitHubSafetyError):
            check_github_safety("pr_merge", write_flag=False)

    def test_destructive_operations_allowed_with_write_flag(self) -> None:
        """Test that destructive operations are allowed with --write."""
        # Should not raise (confirmation handled at command level)
        check_github_safety("pr_merge", write_flag=True)
        check_github_safety("issue_close", write_flag=True)


class TestAPITiers:
    """Tests for API method tier classification."""

    def test_get_is_read(self) -> None:
        """Test GET requests are READ tier."""
        assert get_api_tier_from_method("GET") == GitHubSafetyTier.READ
        assert get_api_tier_from_method("get") == GitHubSafetyTier.READ

    def test_post_patch_put_are_write(self) -> None:
        """Test POST/PATCH/PUT requests are WRITE tier."""
        assert get_api_tier_from_method("POST") == GitHubSafetyTier.WRITE
        assert get_api_tier_from_method("PATCH") == GitHubSafetyTier.WRITE
        assert get_api_tier_from_method("PUT") == GitHubSafetyTier.WRITE

    def test_delete_is_destructive(self) -> None:
        """Test DELETE requests are DESTRUCTIVE tier."""
        assert get_api_tier_from_method("DELETE") == GitHubSafetyTier.DESTRUCTIVE


# ============================================================================
# Rate Limit Tests
# ============================================================================


class TestRateLimit:
    """Tests for rate limit handling."""

    def test_rate_limit_low_detection(self) -> None:
        """Test detection of low rate limit."""
        limit = RateLimit(
            resource="core",
            limit=5000,
            used=4950,
            remaining=50,
            reset=datetime.now(),
        )
        assert limit.is_low
        assert not limit.is_exhausted

    def test_rate_limit_exhausted_detection(self) -> None:
        """Test detection of exhausted rate limit."""
        limit = RateLimit(
            resource="core",
            limit=5000,
            used=5000,
            remaining=0,
            reset=datetime.now(),
        )
        assert limit.is_exhausted
        assert limit.is_low  # Also low when exhausted

    def test_rate_limit_healthy(self) -> None:
        """Test healthy rate limit detection."""
        limit = RateLimit(
            resource="core",
            limit=5000,
            used=1000,
            remaining=4000,
            reset=datetime.now(),
        )
        assert not limit.is_low
        assert not limit.is_exhausted

    def test_should_warn_rate_limit(self) -> None:
        """Test rate limit warning threshold."""
        low_limit = RateLimit(
            resource="core",
            limit=5000,
            used=4950,
            remaining=50,
            reset=datetime.now(),
        )
        assert should_warn_rate_limit(low_limit)

        healthy_limit = RateLimit(
            resource="core",
            limit=5000,
            used=1000,
            remaining=4000,
            reset=datetime.now(),
        )
        assert not should_warn_rate_limit(healthy_limit)

    def test_should_block_rate_limit(self) -> None:
        """Test rate limit blocking threshold."""
        very_low = RateLimit(
            resource="core",
            limit=5000,
            used=4995,
            remaining=5,
            reset=datetime.now(),
        )
        assert should_block_rate_limit(very_low)

        low_but_ok = RateLimit(
            resource="core",
            limit=5000,
            used=4950,
            remaining=50,
            reset=datetime.now(),
        )
        assert not should_block_rate_limit(low_but_ok)


# ============================================================================
# GitHub Wrapper Tests
# ============================================================================


class TestGitHubWrapper:
    """Tests for the GitHub CLI wrapper."""

    @patch("subprocess.run")
    def test_is_installed_true(self, mock_run: MagicMock) -> None:
        """Test gh installation check when installed."""
        mock_run.return_value = MagicMock(returncode=0)
        gh = GitHub()
        assert gh.is_installed()

    @patch("subprocess.run")
    def test_is_installed_false(self, mock_run: MagicMock) -> None:
        """Test gh installation check when not installed."""
        mock_run.side_effect = FileNotFoundError()
        gh = GitHub()
        assert not gh.is_installed()

    @patch("subprocess.run")
    def test_is_authenticated_true(self, mock_run: MagicMock) -> None:
        """Test authentication check when authenticated."""
        mock_run.return_value = MagicMock(returncode=0)
        gh = GitHub()
        assert gh.is_authenticated()

    def test_repo_auto_detection(self) -> None:
        """Test repository auto-detection from git remote."""
        gh = GitHub()
        # Test URL parsing
        assert gh._parse_repo_from_url("https://github.com/owner/repo.git") == "owner/repo"
        assert gh._parse_repo_from_url("git@github.com:owner/repo.git") == "owner/repo"
        assert gh._parse_repo_from_url("https://github.com/owner/repo") == "owner/repo"

    def test_repo_explicit_setting(self) -> None:
        """Test explicit repository setting."""
        gh = GitHub(repo="custom/repo")
        assert gh.repo == "custom/repo"


class TestPullRequestParsing:
    """Tests for PR data parsing."""

    def test_parse_pr_basic(self) -> None:
        """Test basic PR parsing."""
        gh = GitHub(repo="test/repo")
        data = {
            "number": 123,
            "title": "Test PR",
            "state": "OPEN",
            "author": {"login": "testuser"},
            "url": "https://github.com/test/repo/pull/123",
            "headRefName": "feature/test",
            "baseRefName": "main",
            "createdAt": "2026-02-01T10:00:00Z",
            "updatedAt": "2026-02-01T11:00:00Z",
            "labels": [{"name": "bug"}, {"name": "priority:high"}],
            "isDraft": False,
        }

        pr = gh._parse_pr(data)

        assert pr.number == 123
        assert pr.title == "Test PR"
        assert pr.state == "OPEN"
        assert pr.author == "testuser"
        assert pr.head_branch == "feature/test"
        assert pr.base_branch == "main"
        assert "bug" in pr.labels
        assert not pr.draft


class TestIssueParsing:
    """Tests for issue data parsing."""

    def test_parse_issue_basic(self) -> None:
        """Test basic issue parsing."""
        gh = GitHub(repo="test/repo")
        data = {
            "number": 348,
            "title": "Test Issue",
            "state": "OPEN",
            "author": {"login": "testuser"},
            "url": "https://github.com/test/repo/issues/348",
            "createdAt": "2026-02-01T10:00:00Z",
            "updatedAt": "2026-02-01T11:00:00Z",
            "labels": [{"name": "enhancement"}],
            "assignees": [{"login": "developer"}],
            "milestone": {"title": "February 2026"},
        }

        issue = gh._parse_issue(data)

        assert issue.number == 348
        assert issue.title == "Test Issue"
        assert issue.state == "OPEN"
        assert issue.author == "testuser"
        assert "enhancement" in issue.labels
        assert "developer" in issue.assignees
        assert issue.milestone == "February 2026"


class TestWorkflowRunParsing:
    """Tests for workflow run data parsing."""

    def test_parse_run_basic(self) -> None:
        """Test basic run parsing."""
        gh = GitHub(repo="test/repo")
        data = {
            "databaseId": 12345678,
            "displayTitle": "CI Pipeline",
            "status": "completed",
            "conclusion": "success",
            "workflowName": "ci.yml",
            "headBranch": "main",
            "event": "push",
            "createdAt": "2026-02-01T10:00:00Z",
            "url": "https://github.com/test/repo/actions/runs/12345678",
        }

        run = gh._parse_run(data)

        assert run.id == 12345678
        assert run.name == "CI Pipeline"
        assert run.status == "completed"
        assert run.conclusion == "success"
        assert run.workflow_name == "ci.yml"
        assert run.branch == "main"


# ============================================================================
# Safety Config Tests
# ============================================================================


class TestGitHubSafetyConfig:
    """Tests for GitHub safety configuration."""

    def test_default_config(self) -> None:
        """Test default configuration values."""
        config = GitHubSafetyConfig()
        assert config.owner == "AutumnsGrove"
        assert config.repo == "GroveEngine"
        assert config.rate_limit_warn_threshold == 100
        assert config.rate_limit_block_threshold == 10

    def test_custom_config(self) -> None:
        """Test custom configuration."""
        config = GitHubSafetyConfig(
            owner="custom",
            repo="repo",
            rate_limit_warn_threshold=50,
        )
        assert config.owner == "custom"
        assert config.rate_limit_warn_threshold == 50
