"""Safety layers for Grove Wrap operations."""

# Database safety (original safety.py)
from .database import (
    AGENT_SAFE_CONFIG,
    ErrorCode,
    SafetyConfig,
    SafetyViolationError,
    extract_table_name,
    get_operation_type,
    validate_sql,
)

# Git safety
from .git import (
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

# GitHub safety
from .github import (
    GitHubSafetyConfig,
    GitHubSafetyError,
    GitHubSafetyTier,
    RateLimitError,
    check_github_safety,
    check_rate_limit,
    get_api_tier_from_method,
    should_block_rate_limit,
    should_warn_rate_limit,
)

__all__ = [
    # Database safety
    "AGENT_SAFE_CONFIG",
    "ErrorCode",
    "SafetyConfig",
    "SafetyViolationError",
    "extract_table_name",
    "get_operation_type",
    "validate_sql",
    # Git safety
    "GitSafetyConfig",
    "GitSafetyError",
    "GitSafetyTier",
    "check_git_safety",
    "extract_issue_number",
    "format_conventional_commit",
    "get_operation_tier",
    "is_agent_mode",
    "is_protected_branch",
    "validate_conventional_commit",
    # GitHub safety
    "GitHubSafetyConfig",
    "GitHubSafetyError",
    "GitHubSafetyTier",
    "RateLimitError",
    "check_github_safety",
    "check_rate_limit",
    "get_api_tier_from_method",
    "should_block_rate_limit",
    "should_warn_rate_limit",
]
