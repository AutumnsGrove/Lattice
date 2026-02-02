"""GitHub safety layer with tiered operation controls and rate limiting.

Safety Tiers:
- TIER 1 (READ): Always safe, no flags needed
- TIER 2 (WRITE): Requires --write flag
- TIER 3 (DESTRUCTIVE): Requires --write, confirmation in interactive mode
"""

import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from ..gh_wrapper import GitHub, RateLimit


class GitHubSafetyTier(Enum):
    """GitHub operation safety tiers."""

    READ = "read"  # Always safe: list, view, status
    WRITE = "write"  # Requires --write: create, comment, edit
    DESTRUCTIVE = "destructive"  # Requires --write + confirmation: merge, close, delete


class GitHubSafetyError(Exception):
    """Raised when a GitHub operation violates safety rules."""

    def __init__(
        self,
        message: str,
        tier: GitHubSafetyTier,
        operation: str,
        suggestion: Optional[str] = None,
    ):
        """Initialize GitHub safety error.

        Args:
            message: Error message
            tier: Safety tier that was violated
            operation: GitHub operation that was attempted
            suggestion: Helpful suggestion for the user
        """
        self.message = message
        self.tier = tier
        self.operation = operation
        self.suggestion = suggestion
        super().__init__(message)


class RateLimitError(Exception):
    """Raised when rate limit is exhausted."""

    def __init__(self, limit: RateLimit):
        """Initialize rate limit error.

        Args:
            limit: Rate limit information
        """
        self.limit = limit
        super().__init__(
            f"GitHub API rate limit exhausted for {limit.resource}. "
            f"Resets at {limit.reset.strftime('%H:%M:%S')}"
        )


@dataclass
class GitHubSafetyConfig:
    """Configuration for GitHub safety validation."""

    # Repository context
    owner: str = "AutumnsGrove"
    repo: str = "GroveEngine"

    # Rate limit thresholds
    rate_limit_warn_threshold: int = 100  # Warn when remaining < this
    rate_limit_block_threshold: int = 10  # Block when remaining < this

    # Default labels for new PRs/issues
    default_pr_labels: list[str] = field(default_factory=list)
    default_issue_labels: list[str] = field(default_factory=list)

    # Project board configuration
    project_number: Optional[int] = None

    # Project field IDs (for badger-triage integration)
    project_fields: dict[str, str] = field(default_factory=dict)

    # Project field value IDs
    project_values: dict[str, str] = field(default_factory=dict)


# Default configuration
DEFAULT_GITHUB_SAFETY_CONFIG = GitHubSafetyConfig()


# Operations mapped to their safety tiers
OPERATION_TIERS: dict[str, GitHubSafetyTier] = {
    # Tier 1: Read operations (always safe)
    "pr_list": GitHubSafetyTier.READ,
    "pr_view": GitHubSafetyTier.READ,
    "pr_status": GitHubSafetyTier.READ,
    "pr_checks": GitHubSafetyTier.READ,
    "issue_list": GitHubSafetyTier.READ,
    "issue_view": GitHubSafetyTier.READ,
    "issue_search": GitHubSafetyTier.READ,
    "run_list": GitHubSafetyTier.READ,
    "run_view": GitHubSafetyTier.READ,
    "run_watch": GitHubSafetyTier.READ,
    "project_list": GitHubSafetyTier.READ,
    "project_view": GitHubSafetyTier.READ,
    "api_get": GitHubSafetyTier.READ,
    "rate_limit": GitHubSafetyTier.READ,
    # Tier 2: Write operations (require --write)
    "pr_create": GitHubSafetyTier.WRITE,
    "pr_comment": GitHubSafetyTier.WRITE,
    "pr_review": GitHubSafetyTier.WRITE,
    "pr_edit": GitHubSafetyTier.WRITE,
    "issue_create": GitHubSafetyTier.WRITE,
    "issue_comment": GitHubSafetyTier.WRITE,
    "issue_edit": GitHubSafetyTier.WRITE,
    "run_rerun": GitHubSafetyTier.WRITE,
    "run_cancel": GitHubSafetyTier.WRITE,
    "workflow_run": GitHubSafetyTier.WRITE,
    "project_move": GitHubSafetyTier.WRITE,
    "project_field": GitHubSafetyTier.WRITE,
    "project_add": GitHubSafetyTier.WRITE,
    "api_post": GitHubSafetyTier.WRITE,
    "api_patch": GitHubSafetyTier.WRITE,
    # Tier 3: Destructive operations (require --write + confirmation)
    "pr_merge": GitHubSafetyTier.DESTRUCTIVE,
    "pr_close": GitHubSafetyTier.DESTRUCTIVE,
    "issue_close": GitHubSafetyTier.DESTRUCTIVE,
    "issue_reopen": GitHubSafetyTier.DESTRUCTIVE,
    "project_remove": GitHubSafetyTier.DESTRUCTIVE,
    "project_bulk": GitHubSafetyTier.DESTRUCTIVE,
    "api_delete": GitHubSafetyTier.DESTRUCTIVE,
}


def is_agent_mode() -> bool:
    """Check if running in agent mode.

    Returns:
        True if in agent mode
    """
    # Check explicit environment variable
    if os.environ.get("GW_AGENT_MODE", "").lower() in ("1", "true", "yes"):
        return True

    # Check for Claude Code context
    if os.environ.get("CLAUDE_CODE"):
        return True

    # Check for MCP server context
    if os.environ.get("MCP_SERVER"):
        return True

    return False


def get_operation_tier(operation: str) -> GitHubSafetyTier:
    """Get the safety tier for a GitHub operation.

    Args:
        operation: Operation name (e.g., 'pr_create', 'issue_close')

    Returns:
        Safety tier for the operation
    """
    return OPERATION_TIERS.get(operation, GitHubSafetyTier.WRITE)


def check_github_safety(
    operation: str,
    write_flag: bool = False,
    config: Optional[GitHubSafetyConfig] = None,
) -> None:
    """Check if a GitHub operation is allowed.

    Args:
        operation: Operation name
        write_flag: Whether --write flag was provided
        config: Safety configuration

    Raises:
        GitHubSafetyError: If operation is not allowed
    """
    if config is None:
        config = DEFAULT_GITHUB_SAFETY_CONFIG

    tier = get_operation_tier(operation)

    # Tier 1: Read operations always allowed
    if tier == GitHubSafetyTier.READ:
        return

    # Tier 2 & 3: Require --write flag
    if tier in (GitHubSafetyTier.WRITE, GitHubSafetyTier.DESTRUCTIVE):
        if not write_flag:
            raise GitHubSafetyError(
                f"Operation '{operation}' requires --write flag",
                tier=tier,
                operation=operation,
                suggestion=f"Add --write flag: gw gh {operation.replace('_', ' ')} --write",
            )
        return


def check_rate_limit(
    gh: GitHub,
    resource: str = "core",
    config: Optional[GitHubSafetyConfig] = None,
) -> Optional[RateLimit]:
    """Check rate limit and warn/block if low.

    Args:
        gh: GitHub wrapper instance
        resource: API resource to check
        config: Safety configuration

    Returns:
        RateLimit info if available

    Raises:
        RateLimitError: If rate limit is exhausted
    """
    if config is None:
        config = DEFAULT_GITHUB_SAFETY_CONFIG

    limit = gh.check_rate_limit(resource)
    if not limit:
        return None

    if limit.is_exhausted:
        raise RateLimitError(limit)

    return limit


def should_warn_rate_limit(
    limit: RateLimit,
    config: Optional[GitHubSafetyConfig] = None,
) -> bool:
    """Check if we should warn about rate limit.

    Args:
        limit: Rate limit info
        config: Safety configuration

    Returns:
        True if warning should be shown
    """
    if config is None:
        config = DEFAULT_GITHUB_SAFETY_CONFIG

    return limit.remaining < config.rate_limit_warn_threshold


def should_block_rate_limit(
    limit: RateLimit,
    config: Optional[GitHubSafetyConfig] = None,
) -> bool:
    """Check if we should block due to rate limit.

    Args:
        limit: Rate limit info
        config: Safety configuration

    Returns:
        True if operation should be blocked
    """
    if config is None:
        config = DEFAULT_GITHUB_SAFETY_CONFIG

    return limit.remaining < config.rate_limit_block_threshold


def get_tier_description(tier: GitHubSafetyTier) -> str:
    """Get human-readable description of a safety tier.

    Args:
        tier: Safety tier

    Returns:
        Description string
    """
    descriptions = {
        GitHubSafetyTier.READ: "Read-only operation (always safe)",
        GitHubSafetyTier.WRITE: "Write operation (requires --write flag)",
        GitHubSafetyTier.DESTRUCTIVE: "Destructive operation (requires --write, may need confirmation)",
    }
    return descriptions.get(tier, "Unknown tier")


def get_api_tier_from_method(method: str) -> GitHubSafetyTier:
    """Get safety tier for raw API calls based on HTTP method.

    Args:
        method: HTTP method (GET, POST, PATCH, DELETE, etc.)

    Returns:
        Safety tier for the method
    """
    method = method.upper()

    if method == "GET":
        return GitHubSafetyTier.READ
    elif method in ("POST", "PATCH", "PUT"):
        return GitHubSafetyTier.WRITE
    elif method == "DELETE":
        return GitHubSafetyTier.DESTRUCTIVE
    else:
        return GitHubSafetyTier.WRITE
