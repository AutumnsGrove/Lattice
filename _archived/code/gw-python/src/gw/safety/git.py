"""Git safety layer with tiered operation controls.

Safety Tiers:
- TIER 1 (READ): Always safe, no flags needed
- TIER 2 (WRITE): Requires --write flag
- TIER 3 (DANGEROUS): Requires --write --force, blocked in agent mode
- TIER 4 (PROTECTED): Never allowed (force-push to protected branches)
"""

import os
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class GitSafetyTier(Enum):
    """Git operation safety tiers."""

    READ = "read"  # Always safe: status, log, diff, blame, show
    WRITE = "write"  # Requires --write: commit, push, add, branch
    DANGEROUS = "dangerous"  # Requires --write --force: force-push, reset --hard, rebase
    PROTECTED = "protected"  # Never allowed: force-push to main/production


class GitSafetyError(Exception):
    """Raised when a Git operation violates safety rules."""

    def __init__(
        self,
        message: str,
        tier: GitSafetyTier,
        operation: str,
        suggestion: Optional[str] = None,
    ):
        """Initialize Git safety error.

        Args:
            message: Error message
            tier: Safety tier that was violated
            operation: Git operation that was attempted
            suggestion: Helpful suggestion for the user
        """
        self.message = message
        self.tier = tier
        self.operation = operation
        self.suggestion = suggestion
        super().__init__(message)


@dataclass
class GitSafetyConfig:
    """Configuration for Git safety validation."""

    # Branches that cannot be force-pushed or have dangerous operations
    protected_branches: list[str] = field(
        default_factory=lambda: ["main", "master", "production", "staging"]
    )

    # Conventional commit types allowed
    conventional_types: list[str] = field(
        default_factory=lambda: [
            "feat",
            "fix",
            "docs",
            "style",
            "refactor",
            "test",
            "chore",
            "perf",
            "ci",
            "build",
            "revert",
        ]
    )

    # Commit message format enforcement
    commit_format: str = "conventional"  # conventional, simple, or none

    # Auto-link issues from branch names
    auto_link_issues: bool = True

    # Regex pattern to extract issue number from branch
    issue_pattern: str = r"(?:^|/)(?P<num>\d+)[-_]"

    # Skip hooks for WIP commits
    skip_hooks_on_wip: bool = True


# Default configuration
DEFAULT_GIT_SAFETY_CONFIG = GitSafetyConfig()


# Operations mapped to their safety tiers
OPERATION_TIERS: dict[str, GitSafetyTier] = {
    # Tier 1: Read operations (always safe)
    "status": GitSafetyTier.READ,
    "log": GitSafetyTier.READ,
    "diff": GitSafetyTier.READ,
    "blame": GitSafetyTier.READ,
    "show": GitSafetyTier.READ,
    "branch_list": GitSafetyTier.READ,
    "stash_list": GitSafetyTier.READ,
    "remote_list": GitSafetyTier.READ,
    "fetch": GitSafetyTier.READ,  # Read-only, fetches refs without changing working tree
    "reflog": GitSafetyTier.READ,
    "shortlog": GitSafetyTier.READ,
    "tag_list": GitSafetyTier.READ,
    "config_get": GitSafetyTier.READ,
    # Tier 2: Write operations (require --write)
    "add": GitSafetyTier.WRITE,
    "commit": GitSafetyTier.WRITE,
    "push": GitSafetyTier.WRITE,
    "branch_create": GitSafetyTier.WRITE,
    "branch_delete": GitSafetyTier.WRITE,
    "checkout": GitSafetyTier.WRITE,
    "switch": GitSafetyTier.WRITE,
    "stash_push": GitSafetyTier.WRITE,
    "stash_pop": GitSafetyTier.WRITE,
    "stash_apply": GitSafetyTier.WRITE,
    "stash_drop": GitSafetyTier.WRITE,
    "pull": GitSafetyTier.WRITE,
    "unstage": GitSafetyTier.WRITE,
    "save": GitSafetyTier.WRITE,  # Grove shortcut
    "wip": GitSafetyTier.WRITE,  # Grove shortcut
    "undo": GitSafetyTier.WRITE,  # Grove shortcut
    "amend": GitSafetyTier.WRITE,  # Grove shortcut
    "sync": GitSafetyTier.WRITE,  # Grove shortcut
    "cherry_pick": GitSafetyTier.WRITE,
    "ship": GitSafetyTier.WRITE,  # Grove workflow
    "restore": GitSafetyTier.WRITE,
    "tag_create": GitSafetyTier.WRITE,
    "tag_delete": GitSafetyTier.WRITE,
    "remote_add": GitSafetyTier.WRITE,
    "remote_remove": GitSafetyTier.WRITE,
    "remote_rename": GitSafetyTier.WRITE,
    "config_set": GitSafetyTier.WRITE,
    # Worktree operations
    "worktree_list": GitSafetyTier.READ,
    "worktree_create": GitSafetyTier.WRITE,
    "worktree_remove": GitSafetyTier.WRITE,
    "worktree_prune": GitSafetyTier.WRITE,
    "worktree_clean": GitSafetyTier.DANGEROUS,  # Removes ALL worktrees
    "worktree_finish": GitSafetyTier.WRITE,
    # Tier 3: Dangerous operations (require --write --force, blocked in agent mode)
    "push_force": GitSafetyTier.DANGEROUS,
    "reset_hard": GitSafetyTier.DANGEROUS,
    "reset_mixed": GitSafetyTier.DANGEROUS,
    "rebase": GitSafetyTier.DANGEROUS,
    "merge": GitSafetyTier.DANGEROUS,
    "clean": GitSafetyTier.DANGEROUS,
    "branch_force_delete": GitSafetyTier.DANGEROUS,
}


def is_agent_mode() -> bool:
    """Check if running in agent mode.

    Agent mode is detected via GW_AGENT_MODE environment variable
    or by detecting Claude Code execution context.

    Returns:
        True if in agent mode
    """
    # Check explicit environment variable
    if os.environ.get("GW_AGENT_MODE", "").lower() in ("1", "true", "yes"):
        return True

    # Check for Claude Code context (common indicators)
    if os.environ.get("CLAUDE_CODE"):
        return True

    # Check for MCP server context
    if os.environ.get("MCP_SERVER"):
        return True

    return False


def get_operation_tier(operation: str) -> GitSafetyTier:
    """Get the safety tier for a Git operation.

    Args:
        operation: Operation name (e.g., 'commit', 'push_force')

    Returns:
        Safety tier for the operation
    """
    return OPERATION_TIERS.get(operation, GitSafetyTier.WRITE)


def is_protected_branch(
    branch: str,
    config: Optional[GitSafetyConfig] = None,
) -> bool:
    """Check if a branch is protected.

    Args:
        branch: Branch name
        config: Safety configuration

    Returns:
        True if branch is protected
    """
    if config is None:
        config = DEFAULT_GIT_SAFETY_CONFIG

    return branch.lower() in [b.lower() for b in config.protected_branches]


def check_git_safety(
    operation: str,
    write_flag: bool = False,
    force_flag: bool = False,
    target_branch: Optional[str] = None,
    config: Optional[GitSafetyConfig] = None,
) -> None:
    """Check if a Git operation is allowed.

    Args:
        operation: Operation name
        write_flag: Whether --write flag was provided
        force_flag: Whether --force flag was provided
        target_branch: Target branch for push/merge operations
        config: Safety configuration

    Raises:
        GitSafetyError: If operation is not allowed
    """
    if config is None:
        config = DEFAULT_GIT_SAFETY_CONFIG

    tier = get_operation_tier(operation)
    agent_mode = is_agent_mode()

    # Tier 1: Read operations always allowed
    if tier == GitSafetyTier.READ:
        return

    # Tier 2: Write operations require --write flag
    # Auto-imply --write for interactive sessions (human at terminal).
    # Non-interactive contexts (agents, CI, MCP) still require explicit --write.
    if tier == GitSafetyTier.WRITE:
        effective_write = write_flag or (os.isatty(0) and not agent_mode)
        if not effective_write:
            raise GitSafetyError(
                f"Operation '{operation}' requires --write flag",
                tier=tier,
                operation=operation,
                suggestion=f"Add --write flag: gw git {operation} --write",
            )
        return

    # Tier 3: Dangerous operations
    if tier == GitSafetyTier.DANGEROUS:
        # In agent mode, dangerous operations are blocked entirely
        if agent_mode:
            raise GitSafetyError(
                f"Operation '{operation}' is blocked in agent mode",
                tier=tier,
                operation=operation,
                suggestion="This operation can only be performed by a human operator",
            )

        # Require both --write and --force
        if not write_flag:
            raise GitSafetyError(
                f"Operation '{operation}' requires --write flag",
                tier=tier,
                operation=operation,
                suggestion=f"Add --write flag: gw git {operation} --write --force",
            )

        if not force_flag:
            raise GitSafetyError(
                f"Operation '{operation}' is dangerous and requires --force flag",
                tier=tier,
                operation=operation,
                suggestion=f"Add --force flag: gw git {operation} --write --force",
            )

        # Check protected branch for push_force
        if operation == "push_force" and target_branch:
            if is_protected_branch(target_branch, config):
                raise GitSafetyError(
                    f"Force push to protected branch '{target_branch}' is not allowed",
                    tier=GitSafetyTier.PROTECTED,
                    operation=operation,
                    suggestion="Use a feature branch instead",
                )

        return

    # Tier 4: Protected operations (should not reach here normally)
    raise GitSafetyError(
        f"Operation '{operation}' is not allowed",
        tier=GitSafetyTier.PROTECTED,
        operation=operation,
    )


def validate_conventional_commit(
    message: str,
    config: Optional[GitSafetyConfig] = None,
) -> tuple[bool, Optional[str]]:
    """Validate a commit message follows Conventional Commits format.

    Format: type(scope): description
    Example: feat(auth): add OAuth2 PKCE flow

    Args:
        message: Commit message
        config: Safety configuration

    Returns:
        Tuple of (is_valid, error_message)
    """
    if config is None:
        config = DEFAULT_GIT_SAFETY_CONFIG

    if config.commit_format == "none":
        return (True, None)

    if config.commit_format == "simple":
        # Just check it's not empty and has reasonable length
        if not message.strip():
            return (False, "Commit message cannot be empty")
        if len(message.split("\n")[0]) > 72:
            return (False, "First line should be 72 characters or less")
        return (True, None)

    # Conventional commits format
    # Pattern: type(scope)!?: description
    pattern = r"^(" + "|".join(config.conventional_types) + r")(\(.+\))?!?: .+"

    first_line = message.split("\n")[0]

    if not re.match(pattern, first_line, re.IGNORECASE):
        types_str = ", ".join(config.conventional_types)
        return (
            False,
            f"Commit message must follow Conventional Commits format: type(scope): description\n"
            f"Valid types: {types_str}\n"
            f"Example: feat(auth): add OAuth2 PKCE flow",
        )

    # Check first line length
    if len(first_line) > 72:
        return (False, "First line should be 72 characters or less")

    return (True, None)


def format_conventional_commit(
    type_: str,
    description: str,
    scope: Optional[str] = None,
    body: Optional[str] = None,
    breaking: bool = False,
    issue_number: Optional[int] = None,
) -> str:
    """Format a conventional commit message.

    Args:
        type_: Commit type (feat, fix, etc.)
        description: Short description
        scope: Optional scope
        body: Optional body text
        breaking: Whether this is a breaking change
        issue_number: Optional issue number to link

    Returns:
        Formatted commit message
    """
    # Build first line
    first_line = type_

    if scope:
        first_line += f"({scope})"

    if breaking:
        first_line += "!"

    first_line += f": {description}"

    # Add issue reference
    if issue_number:
        first_line += f" (#{issue_number})"

    # Build full message
    if body:
        return f"{first_line}\n\n{body}"

    return first_line


def extract_issue_number(
    branch: str,
    config: Optional[GitSafetyConfig] = None,
) -> Optional[int]:
    """Extract issue number from branch name.

    Args:
        branch: Branch name
        config: Safety configuration with issue pattern

    Returns:
        Issue number or None
    """
    if config is None:
        config = DEFAULT_GIT_SAFETY_CONFIG

    if not config.auto_link_issues:
        return None

    match = re.search(config.issue_pattern, branch)
    if match:
        return int(match.group("num"))

    return None


def get_tier_description(tier: GitSafetyTier) -> str:
    """Get human-readable description of a safety tier.

    Args:
        tier: Safety tier

    Returns:
        Description string
    """
    descriptions = {
        GitSafetyTier.READ: "Read-only operation (always safe)",
        GitSafetyTier.WRITE: "Write operation (requires --write flag)",
        GitSafetyTier.DANGEROUS: "Dangerous operation (requires --write --force, blocked in agent mode)",
        GitSafetyTier.PROTECTED: "Protected operation (never allowed)",
    }
    return descriptions.get(tier, "Unknown tier")
