"""Configuration loading and management for Grove Wrap."""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
import tomli
import tomli_w


@dataclass
class DatabaseAlias:
    """Database alias configuration."""

    name: str
    id: str


@dataclass
class KVNamespace:
    """KV namespace configuration."""

    name: str
    id: str


@dataclass
class R2Bucket:
    """R2 bucket configuration."""

    name: str


@dataclass
class SafetyConfig:
    """Database safety configuration."""

    max_delete_rows: int = 100
    max_update_rows: int = 500
    protected_tables: list[str] = None

    def __post_init__(self) -> None:
        """Initialize protected tables if not provided."""
        if self.protected_tables is None:
            self.protected_tables = [
                "users",
                "tenants",
                "subscriptions",
                "payments",
                "sessions",
            ]


@dataclass
class GitConfig:
    """Git integration configuration."""

    # Commit format enforcement
    commit_format: str = "conventional"  # conventional, simple, or none
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

    # Protected branches (cannot force-push)
    protected_branches: list[str] = field(
        default_factory=lambda: ["main", "master", "production", "staging"]
    )

    # Issue auto-linking
    auto_link_issues: bool = True
    issue_pattern: str = r"(?:^|/)(?P<num>\d+)[-_]"

    # Pre-commit behavior
    skip_hooks_on_wip: bool = True


@dataclass
class GitHubConfig:
    """GitHub integration configuration."""

    # Repository context (auto-detected, but can override)
    owner: str = "AutumnsGrove"
    repo: str = "GroveEngine"

    # Default labels for new PRs/issues
    default_pr_labels: list[str] = field(default_factory=list)
    default_issue_labels: list[str] = field(default_factory=list)

    # Rate limit thresholds
    rate_limit_warn_threshold: int = 100
    rate_limit_block_threshold: int = 10

    # Project board configuration (for badger-triage)
    project_number: Optional[int] = None

    # Project field IDs
    project_fields: dict[str, str] = field(default_factory=dict)

    # Project field value IDs
    project_values: dict[str, str] = field(default_factory=dict)


@dataclass
class GWConfig:
    """Grove Wrap configuration."""

    databases: dict[str, DatabaseAlias]
    kv_namespaces: dict[str, KVNamespace]
    r2_buckets: list[R2Bucket]
    safety: SafetyConfig
    git: GitConfig = field(default_factory=GitConfig)
    github: GitHubConfig = field(default_factory=GitHubConfig)

    @classmethod
    def load(cls) -> "GWConfig":
        """Load configuration from ~/.grove/gw.toml or create default."""
        config_dir = Path.home() / ".grove"
        config_file = config_dir / "gw.toml"

        if config_file.exists():
            with open(config_file, "rb") as f:
                data = tomli.load(f)
                return cls._from_dict(data)
        else:
            return cls._default()

    @classmethod
    def _default(cls) -> "GWConfig":
        """Create default configuration."""
        return cls(
            databases={
                "lattice": DatabaseAlias(
                    "grove-engine-db", "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"
                ),
                "groveauth": DatabaseAlias(
                    "groveauth", "45eae4c7-8ae7-4078-9218-8e1677a4360f"
                ),
                "clearing": DatabaseAlias(
                    "daily-clearing-db", "1fb94ac6-53c6-49d6-9388-a6f585f86196"
                ),
                "amber": DatabaseAlias("amber", "f688021b-a986-495a-94bb-352354768a22"),
            },
            kv_namespaces={
                "cache": KVNamespace("cache", "514e91e81cc44d128a82ec6f668303e4"),
                "flags": KVNamespace("flags", "65a600876aa14e9cbec8f8acd7d53b5f"),
            },
            r2_buckets=[R2Bucket("grove-media")],
            safety=SafetyConfig(),
            git=GitConfig(),
            github=GitHubConfig(),
        )

    @classmethod
    def _from_dict(cls, data: dict) -> "GWConfig":
        """Create config from dictionary."""
        databases = {}
        for name, db_data in data.get("databases", {}).items():
            databases[name] = DatabaseAlias(db_data["name"], db_data["id"])

        kv_namespaces = {}
        for name, kv_data in data.get("kv_namespaces", {}).items():
            kv_namespaces[name] = KVNamespace(kv_data["name"], kv_data["id"])

        r2_buckets = [R2Bucket(bucket["name"]) for bucket in data.get("r2_buckets", [])]

        safety_data = data.get("safety", {})
        safety = SafetyConfig(
            max_delete_rows=safety_data.get("max_delete_rows", 100),
            max_update_rows=safety_data.get("max_update_rows", 500),
            protected_tables=safety_data.get(
                "protected_tables",
                [
                    "users",
                    "tenants",
                    "subscriptions",
                    "payments",
                    "sessions",
                ],
            ),
        )

        # Parse git configuration
        git_data = data.get("git", {})
        git = GitConfig(
            commit_format=git_data.get("commit_format", "conventional"),
            conventional_types=git_data.get(
                "conventional_types",
                ["feat", "fix", "docs", "style", "refactor", "test", "chore", "perf", "ci", "build", "revert"],
            ),
            protected_branches=git_data.get(
                "protected_branches",
                ["main", "master", "production", "staging"],
            ),
            auto_link_issues=git_data.get("auto_link_issues", True),
            issue_pattern=git_data.get("issue_pattern", r"(?:^|/)(?P<num>\d+)[-_]"),
            skip_hooks_on_wip=git_data.get("skip_hooks_on_wip", True),
        )

        # Parse github configuration
        github_data = data.get("github", {})
        github = GitHubConfig(
            owner=github_data.get("owner", "AutumnsGrove"),
            repo=github_data.get("repo", "GroveEngine"),
            default_pr_labels=github_data.get("default_pr_labels", []),
            default_issue_labels=github_data.get("default_issue_labels", []),
            rate_limit_warn_threshold=github_data.get("rate_limit_warn_threshold", 100),
            rate_limit_block_threshold=github_data.get("rate_limit_block_threshold", 10),
            project_number=github_data.get("project_number"),
            project_fields=github_data.get("project_fields", {}),
            project_values=github_data.get("project_values", {}),
        )

        return cls(
            databases=databases,
            kv_namespaces=kv_namespaces,
            r2_buckets=r2_buckets,
            safety=safety,
            git=git,
            github=github,
        )

    def save(self) -> None:
        """Save configuration to ~/.grove/gw.toml."""
        config_dir = Path.home() / ".grove"
        config_dir.mkdir(parents=True, exist_ok=True)

        config_file = config_dir / "gw.toml"

        data = {
            "databases": {
                name: {"name": db.name, "id": db.id}
                for name, db in self.databases.items()
            },
            "kv_namespaces": {
                name: {"name": kv.name, "id": kv.id}
                for name, kv in self.kv_namespaces.items()
            },
            "r2_buckets": [{"name": bucket.name} for bucket in self.r2_buckets],
            "safety": {
                "max_delete_rows": self.safety.max_delete_rows,
                "max_update_rows": self.safety.max_update_rows,
                "protected_tables": self.safety.protected_tables,
            },
            "git": {
                "commit_format": self.git.commit_format,
                "conventional_types": self.git.conventional_types,
                "protected_branches": self.git.protected_branches,
                "auto_link_issues": self.git.auto_link_issues,
                "issue_pattern": self.git.issue_pattern,
                "skip_hooks_on_wip": self.git.skip_hooks_on_wip,
            },
            "github": {
                "owner": self.github.owner,
                "repo": self.github.repo,
                "default_pr_labels": self.github.default_pr_labels,
                "default_issue_labels": self.github.default_issue_labels,
                "rate_limit_warn_threshold": self.github.rate_limit_warn_threshold,
                "rate_limit_block_threshold": self.github.rate_limit_block_threshold,
                "project_number": self.github.project_number,
                "project_fields": self.github.project_fields,
                "project_values": self.github.project_values,
            },
        }

        with open(config_file, "wb") as f:
            tomli_w.dump(data, f)

    def get_agent_safe_config(self) -> SafetyConfig:
        """Get stricter safety config for agent mode."""
        return SafetyConfig(
            max_delete_rows=50,
            max_update_rows=200,
            protected_tables=self.safety.protected_tables,
        )
