"""Tests for Git integration - wrapper, safety, and commands."""

import os
from unittest.mock import MagicMock, patch

import pytest

from gw.git_wrapper import Git, GitError, GitStatus, GitCommit, GitDiff
from gw.safety.git import (
    DEFAULT_GIT_SAFETY_CONFIG,
    GitSafetyConfig,
    GitSafetyError,
    GitSafetyTier,
    check_git_safety,
    extract_issue_number,
    format_conventional_commit,
    get_operation_tier,
    is_agent_mode,
    is_protected_branch,
    validate_conventional_commit,
)


# ============================================================================
# Git Safety Tier Tests
# ============================================================================


class TestOperationTiers:
    """Tests for operation tier classification."""

    def test_read_operations_are_tier_1(self) -> None:
        """Test that read operations are classified as READ tier."""
        read_ops = ["status", "log", "diff", "blame", "show", "branch_list", "stash_list"]
        for op in read_ops:
            assert get_operation_tier(op) == GitSafetyTier.READ

    def test_write_operations_are_tier_2(self) -> None:
        """Test that write operations are classified as WRITE tier."""
        write_ops = ["add", "commit", "push", "branch_create", "stash_push", "save", "wip"]
        for op in write_ops:
            assert get_operation_tier(op) == GitSafetyTier.WRITE

    def test_dangerous_operations_are_tier_3(self) -> None:
        """Test that dangerous operations are classified as DANGEROUS tier."""
        dangerous_ops = ["push_force", "reset_hard", "rebase", "merge", "clean"]
        for op in dangerous_ops:
            assert get_operation_tier(op) == GitSafetyTier.DANGEROUS

    def test_unknown_operations_default_to_write(self) -> None:
        """Test that unknown operations default to WRITE tier."""
        assert get_operation_tier("unknown_operation") == GitSafetyTier.WRITE


class TestProtectedBranches:
    """Tests for protected branch detection."""

    def test_default_protected_branches(self) -> None:
        """Test default protected branches."""
        assert is_protected_branch("main")
        assert is_protected_branch("master")
        assert is_protected_branch("production")
        assert is_protected_branch("staging")

    def test_protected_branches_case_insensitive(self) -> None:
        """Test protected branch check is case insensitive."""
        assert is_protected_branch("MAIN")
        assert is_protected_branch("Main")
        assert is_protected_branch("PRODUCTION")

    def test_unprotected_branches(self) -> None:
        """Test unprotected branches."""
        assert not is_protected_branch("feature/348-new-thing")
        assert not is_protected_branch("develop")
        assert not is_protected_branch("hotfix/urgent")

    def test_custom_protected_branches(self) -> None:
        """Test custom protected branches from config."""
        config = GitSafetyConfig(protected_branches=["release", "hotfix"])
        assert is_protected_branch("release", config)
        assert is_protected_branch("hotfix", config)
        assert not is_protected_branch("main", config)


class TestAgentModeDetection:
    """Tests for agent mode detection."""

    def test_agent_mode_from_env_var(self) -> None:
        """Test agent mode detection from GW_AGENT_MODE."""
        with patch.dict(os.environ, {"GW_AGENT_MODE": "1"}):
            assert is_agent_mode()

        with patch.dict(os.environ, {"GW_AGENT_MODE": "true"}):
            assert is_agent_mode()

        with patch.dict(os.environ, {"GW_AGENT_MODE": "yes"}):
            assert is_agent_mode()

    def test_agent_mode_from_claude_code(self) -> None:
        """Test agent mode detection from CLAUDE_CODE env."""
        with patch.dict(os.environ, {"CLAUDE_CODE": "1"}, clear=True):
            assert is_agent_mode()

    def test_not_agent_mode_by_default(self) -> None:
        """Test agent mode is off by default."""
        with patch.dict(os.environ, {}, clear=True):
            # Remove any agent mode indicators
            for key in ["GW_AGENT_MODE", "CLAUDE_CODE", "MCP_SERVER"]:
                os.environ.pop(key, None)
            assert not is_agent_mode()


class TestSafetyChecks:
    """Tests for safety check enforcement."""

    def test_read_operations_always_allowed(self) -> None:
        """Test that read operations don't require flags."""
        # Should not raise
        check_git_safety("status", write_flag=False)
        check_git_safety("log", write_flag=False)
        check_git_safety("diff", write_flag=False)

    def test_write_operations_require_write_flag(self) -> None:
        """Test that write operations require --write flag."""
        with pytest.raises(GitSafetyError) as exc_info:
            check_git_safety("commit", write_flag=False)
        assert exc_info.value.tier == GitSafetyTier.WRITE
        assert "--write" in exc_info.value.suggestion

    def test_write_operations_allowed_with_flag(self) -> None:
        """Test that write operations are allowed with --write flag."""
        # Should not raise
        check_git_safety("commit", write_flag=True)
        check_git_safety("push", write_flag=True)

    def test_dangerous_operations_require_both_flags(self) -> None:
        """Test that dangerous operations require --write and --force."""
        # Missing --write
        with pytest.raises(GitSafetyError):
            check_git_safety("push_force", write_flag=False, force_flag=False)

        # Missing --force
        with pytest.raises(GitSafetyError):
            check_git_safety("push_force", write_flag=True, force_flag=False)

    def test_dangerous_operations_allowed_with_both_flags(self) -> None:
        """Test that dangerous operations are allowed with both flags."""
        # Should not raise (when not in agent mode)
        with patch.dict(os.environ, {}, clear=True):
            check_git_safety("push_force", write_flag=True, force_flag=True)

    def test_dangerous_operations_blocked_in_agent_mode(self) -> None:
        """Test that dangerous operations are blocked in agent mode."""
        with patch.dict(os.environ, {"GW_AGENT_MODE": "1"}):
            with pytest.raises(GitSafetyError) as exc_info:
                check_git_safety("push_force", write_flag=True, force_flag=True)
            assert "agent mode" in exc_info.value.message.lower()

    def test_force_push_to_protected_branch_blocked(self) -> None:
        """Test that force push to protected branches is blocked."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(GitSafetyError) as exc_info:
                check_git_safety(
                    "push_force",
                    write_flag=True,
                    force_flag=True,
                    target_branch="main",
                )
            assert exc_info.value.tier == GitSafetyTier.PROTECTED
            assert "protected" in exc_info.value.message.lower()


# ============================================================================
# Conventional Commits Tests
# ============================================================================


class TestConventionalCommits:
    """Tests for Conventional Commits validation."""

    def test_valid_conventional_commits(self) -> None:
        """Test valid conventional commit messages."""
        valid_messages = [
            "feat: add new feature",
            "fix: resolve bug",
            "feat(auth): add OAuth2 support",
            "fix(ui): correct button alignment",
            "docs: update README",
            "chore: update dependencies",
            "refactor(api): restructure endpoints",
            "test: add unit tests",
            "perf: optimize database queries",
            "ci: update workflow",
            "build: bump version",
            "revert: undo last change",
            "feat!: breaking change",
            "feat(api)!: breaking API change",
        ]

        for msg in valid_messages:
            valid, error = validate_conventional_commit(msg)
            assert valid, f"Message should be valid: {msg}, error: {error}"

    def test_invalid_conventional_commits(self) -> None:
        """Test invalid conventional commit messages."""
        invalid_messages = [
            "Add new feature",  # No type
            "feature: add something",  # Wrong type
            "feat add feature",  # Missing colon
            "feat:",  # Missing description
            "",  # Empty
        ]

        for msg in invalid_messages:
            valid, error = validate_conventional_commit(msg)
            assert not valid, f"Message should be invalid: {msg}"
            assert error is not None

    def test_commit_line_length_warning(self) -> None:
        """Test that long first lines are flagged."""
        long_message = "feat: " + "x" * 80  # Way over 72 chars
        valid, error = validate_conventional_commit(long_message)
        assert not valid
        assert "72 characters" in error

    def test_custom_types(self) -> None:
        """Test custom commit types from config."""
        config = GitSafetyConfig(conventional_types=["custom", "special"])
        valid, error = validate_conventional_commit("custom: do something", config)
        assert valid

        valid, error = validate_conventional_commit("feat: do something", config)
        assert not valid  # feat not in custom types

    def test_format_none_skips_validation(self) -> None:
        """Test that format='none' skips validation."""
        config = GitSafetyConfig(commit_format="none")
        valid, error = validate_conventional_commit("any message works", config)
        assert valid

    def test_format_simple_basic_validation(self) -> None:
        """Test that format='simple' does basic validation."""
        config = GitSafetyConfig(commit_format="simple")

        # Empty message fails
        valid, error = validate_conventional_commit("", config)
        assert not valid

        # Non-conventional message passes
        valid, error = validate_conventional_commit("Just a simple message", config)
        assert valid


class TestFormatConventionalCommit:
    """Tests for commit message formatting."""

    def test_basic_format(self) -> None:
        """Test basic message formatting."""
        msg = format_conventional_commit("feat", "add new feature")
        assert msg == "feat: add new feature"

    def test_format_with_scope(self) -> None:
        """Test formatting with scope."""
        msg = format_conventional_commit("fix", "resolve bug", scope="auth")
        assert msg == "fix(auth): resolve bug"

    def test_format_with_breaking(self) -> None:
        """Test formatting with breaking change."""
        msg = format_conventional_commit("feat", "change API", breaking=True)
        assert msg == "feat!: change API"

    def test_format_with_issue(self) -> None:
        """Test formatting with issue link."""
        msg = format_conventional_commit("fix", "resolve bug", issue_number=348)
        assert msg == "fix: resolve bug (#348)"

    def test_format_with_body(self) -> None:
        """Test formatting with body."""
        msg = format_conventional_commit(
            "feat",
            "add feature",
            body="This is the body text.",
        )
        assert "feat: add feature" in msg
        assert "This is the body text." in msg


class TestIssueExtraction:
    """Tests for issue number extraction from branch names."""

    def test_extract_from_feature_branch(self) -> None:
        """Test extraction from feature/XXX-description format."""
        assert extract_issue_number("feature/348-add-caching") == 348
        assert extract_issue_number("feature/123-fix-bug") == 123

    def test_extract_from_fix_branch(self) -> None:
        """Test extraction from fix/XXX-description format."""
        assert extract_issue_number("fix/527-cache-issue") == 527

    def test_extract_from_simple_branch(self) -> None:
        """Test extraction from XXX-description format."""
        assert extract_issue_number("456-something") == 456

    def test_no_issue_in_branch(self) -> None:
        """Test branches without issue numbers."""
        assert extract_issue_number("main") is None
        assert extract_issue_number("develop") is None
        assert extract_issue_number("feature/no-issue-here") is None

    def test_disabled_auto_link(self) -> None:
        """Test that auto-link can be disabled."""
        config = GitSafetyConfig(auto_link_issues=False)
        assert extract_issue_number("feature/348-something", config) is None


# ============================================================================
# Git Wrapper Tests
# ============================================================================


class TestGitWrapper:
    """Tests for the Git subprocess wrapper."""

    @patch("subprocess.run")
    def test_is_installed_true(self, mock_run: MagicMock) -> None:
        """Test git installation check when installed."""
        mock_run.return_value = MagicMock(returncode=0)
        git = Git()
        assert git.is_installed()

    @patch("subprocess.run")
    def test_is_installed_false(self, mock_run: MagicMock) -> None:
        """Test git installation check when not installed."""
        mock_run.side_effect = FileNotFoundError()
        git = Git()
        assert not git.is_installed()

    @patch("subprocess.run")
    def test_is_repo_true(self, mock_run: MagicMock) -> None:
        """Test repo detection when in a repo."""
        mock_run.return_value = MagicMock(returncode=0, stdout=".git\n")
        git = Git()
        assert git.is_repo()

    @patch("subprocess.run")
    def test_execute_success(self, mock_run: MagicMock) -> None:
        """Test successful command execution."""
        mock_run.return_value = MagicMock(returncode=0, stdout="output\n")
        git = Git()
        result = git.execute(["status"])
        assert result == "output\n"
        mock_run.assert_called_once()

    @patch("subprocess.run")
    def test_execute_failure(self, mock_run: MagicMock) -> None:
        """Test command execution failure."""
        import subprocess

        mock_run.side_effect = subprocess.CalledProcessError(
            1, "git status", stderr="error"
        )
        git = Git()
        with pytest.raises(GitError):
            git.execute(["status"])


class TestGitStatusParsing:
    """Tests for git status parsing."""

    @patch("subprocess.run")
    def test_parse_clean_status(self, mock_run: MagicMock) -> None:
        """Test parsing clean status."""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="# branch.head main\n# branch.upstream origin/main\n# branch.ab +0 -0\n",
        )
        git = Git()
        status = git.status()

        assert status.branch == "main"
        assert status.upstream == "origin/main"
        assert status.is_clean
        assert status.ahead == 0
        assert status.behind == 0

    @patch("subprocess.run")
    def test_parse_status_with_changes(self, mock_run: MagicMock) -> None:
        """Test parsing status with staged and unstaged changes."""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout=(
                "# branch.head feature/test\n"
                "# branch.ab +2 -1\n"
                "1 M. N... 100644 100644 abc123 def456 src/file.py\n"
                "1 .M N... 100644 100644 abc123 def456 src/other.py\n"
                "? untracked.txt\n"
            ),
        )
        git = Git()
        status = git.status()

        assert status.branch == "feature/test"
        assert status.ahead == 2
        assert status.behind == 1
        assert not status.is_clean
        assert len(status.staged) == 1
        assert len(status.unstaged) == 1
        assert len(status.untracked) == 1


class TestGitLogParsing:
    """Tests for git log parsing."""

    @patch("subprocess.run")
    def test_parse_log(self, mock_run: MagicMock) -> None:
        """Test parsing git log output."""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout=(
                "abc123full\x00abc123\x00Author Name\x00author@example.com\x00"
                "2026-02-01T10:00:00\x00feat: add feature\x00Body text\x00\x1e"
            ),
        )
        git = Git()
        commits = git.log(limit=1)

        assert len(commits) == 1
        assert commits[0].hash == "abc123full"
        assert commits[0].short_hash == "abc123"
        assert commits[0].author == "Author Name"
        assert commits[0].subject == "feat: add feature"


# ============================================================================
# Integration Tests (require actual git repo - mark as slow)
# ============================================================================


@pytest.mark.slow
class TestGitIntegration:
    """Integration tests that require an actual git repository."""

    def test_real_git_operations(self, tmp_path) -> None:
        """Test real git operations in a temporary directory."""
        import subprocess

        # Initialize a test repo
        subprocess.run(["git", "init"], cwd=tmp_path, check=True, capture_output=True)
        subprocess.run(
            ["git", "config", "user.email", "test@test.com"],
            cwd=tmp_path,
            check=True,
            capture_output=True,
        )
        subprocess.run(
            ["git", "config", "user.name", "Test User"],
            cwd=tmp_path,
            check=True,
            capture_output=True,
        )

        git = Git(working_dir=tmp_path)

        # Should be a repo
        assert git.is_repo()

        # Should have clean status initially
        status = git.status()
        assert status.is_clean

        # Create a file
        (tmp_path / "test.txt").write_text("hello")

        # Should show untracked
        status = git.status()
        assert not status.is_clean
        assert "test.txt" in status.untracked

        # Stage the file
        git.add(["test.txt"])
        status = git.status()
        assert len(status.staged) == 1

        # Commit
        commit_hash = git.commit("feat: initial commit")
        assert len(commit_hash) == 40  # Full SHA

        # Should be clean again
        status = git.status()
        assert status.is_clean

        # Log should show the commit
        commits = git.log(limit=1)
        assert len(commits) == 1
        assert commits[0].subject == "feat: initial commit"
