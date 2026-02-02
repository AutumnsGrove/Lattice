"""Configuration loading and management for Grove Wrap."""

from dataclasses import dataclass, asdict
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
class GWConfig:
    """Grove Wrap configuration."""

    databases: dict[str, DatabaseAlias]
    kv_namespaces: dict[str, KVNamespace]
    r2_buckets: list[R2Bucket]
    safety: SafetyConfig

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

        return cls(
            databases=databases,
            kv_namespaces=kv_namespaces,
            r2_buckets=r2_buckets,
            safety=safety,
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
