"""Tests for worktree commands - ref resolution and parsing."""

from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from gw.commands.git.worktree import (
    resolve_ref,
    get_existing_worktrees,
    WORKTREE_DIR,
)
from gw.gh_wrapper import GitHubError


# ============================================================================
# Ref Resolution Tests
# ============================================================================


class TestResolveRef:
    """Tests for resolve_ref() function."""

    def test_branch_name_passthrough(self) -> None:
        """Test that plain branch names pass through."""
        branch, worktree_name, ref_type = resolve_ref("feature/auth")

        assert branch == "feature/auth"
        assert ref_type == "branch"
        # Worktree name is sanitized
        assert worktree_name == "feature-auth"

    def test_branch_name_sanitization(self) -> None:
        """Test that special characters are sanitized for directory names."""
        branch, worktree_name, ref_type = resolve_ref("feature/cool-thing@2.0")

        assert branch == "feature/cool-thing@2.0"  # Original preserved
        assert worktree_name == "feature-cool-thing-2-0"  # Sanitized
        assert ref_type == "branch"

    def test_issue_ref_format(self) -> None:
        """Test #XXX format creates issue-XXX branch."""
        branch, worktree_name, ref_type = resolve_ref("#450")

        assert branch == "issue-450"
        assert worktree_name == "issue-450"
        assert ref_type == "issue"

    def test_issue_ref_large_number(self) -> None:
        """Test issue refs with large numbers."""
        branch, worktree_name, ref_type = resolve_ref("#12345")

        assert branch == "issue-12345"
        assert worktree_name == "issue-12345"
        assert ref_type == "issue"

    @patch("gw.commands.git.worktree.GitHub")
    def test_pr_number_lookup(self, mock_gh_class: MagicMock) -> None:
        """Test PR number looks up branch name via GitHub."""
        # Setup mock
        mock_gh = MagicMock()
        mock_pr = MagicMock()
        mock_pr.head_branch = "feature/cool-feature"
        mock_gh.pr_view.return_value = mock_pr
        mock_gh_class.return_value = mock_gh

        branch, worktree_name, ref_type = resolve_ref("920")

        assert branch == "feature/cool-feature"
        assert worktree_name == "pr-920"
        assert ref_type == "pr"
        mock_gh.pr_view.assert_called_once_with(920)

    @patch("gw.commands.git.worktree.GitHub")
    def test_pr_not_found_error(self, mock_gh_class: MagicMock) -> None:
        """Test error when PR not found."""
        # Setup mock to raise error
        mock_gh = MagicMock()
        mock_gh.pr_view.side_effect = GitHubError("Not Found", returncode=1)
        mock_gh_class.return_value = mock_gh

        with pytest.raises(Exception) as exc_info:
            resolve_ref("99999")

        assert "PR #99999" in str(exc_info.value)

    def test_simple_branch_name(self) -> None:
        """Test simple branch names without special characters."""
        branch, worktree_name, ref_type = resolve_ref("main")

        assert branch == "main"
        assert worktree_name == "main"
        assert ref_type == "branch"


# ============================================================================
# Worktree Parsing Tests
# ============================================================================


class TestGetExistingWorktrees:
    """Tests for worktree list parsing."""

    @patch("subprocess.run")
    def test_parse_porcelain_output(self, mock_run: MagicMock) -> None:
        """Test parsing git worktree list --porcelain output."""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout=(
                "worktree /path/to/repo\n"
                "HEAD abc123def456\n"
                "branch refs/heads/main\n"
                "\n"
                "worktree /path/to/repo/.gw-worktrees/pr-920\n"
                "HEAD def789abc123\n"
                "branch refs/heads/feature/cool\n"
                "\n"
            ),
        )

        worktrees = get_existing_worktrees()

        assert len(worktrees) == 2
        assert worktrees[0]["path"] == "/path/to/repo"
        assert worktrees[0]["branch"] == "main"
        assert worktrees[1]["path"] == "/path/to/repo/.gw-worktrees/pr-920"
        assert worktrees[1]["branch"] == "feature/cool"

    @patch("subprocess.run")
    def test_parse_detached_head(self, mock_run: MagicMock) -> None:
        """Test parsing worktree with detached HEAD."""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout=(
                "worktree /path/to/worktree\n"
                "HEAD abc123\n"
                "detached\n"
                "\n"
            ),
        )

        worktrees = get_existing_worktrees()

        assert len(worktrees) == 1
        assert worktrees[0].get("detached") is True
        assert "branch" not in worktrees[0]

    @patch("subprocess.run")
    def test_parse_bare_repo(self, mock_run: MagicMock) -> None:
        """Test parsing bare repository marker."""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout=(
                "worktree /path/to/bare.git\n"
                "bare\n"
                "\n"
            ),
        )

        worktrees = get_existing_worktrees()

        assert len(worktrees) == 1
        assert worktrees[0].get("bare") is True

    @patch("subprocess.run")
    def test_empty_output(self, mock_run: MagicMock) -> None:
        """Test handling empty output."""
        mock_run.return_value = MagicMock(returncode=0, stdout="")

        worktrees = get_existing_worktrees()

        assert worktrees == []


# ============================================================================
# Constants Tests
# ============================================================================


class TestWorktreeConstants:
    """Tests for worktree configuration constants."""

    def test_worktree_dir_name(self) -> None:
        """Test worktree directory name is reasonable."""
        assert WORKTREE_DIR == ".gw-worktrees"
        assert WORKTREE_DIR.startswith(".")  # Hidden directory
