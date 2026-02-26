"""Discover GROVE_ROOT, seed scripts, migration directories, and local D1 files.

Provides the filesystem context that the DataBootstrapper needs to apply
migrations and seed data.
"""

import os
import sqlite3
from pathlib import Path


def find_grove_root() -> Path | None:
    """Find the Grove monorepo root directory.

    Checks GROVE_ROOT env var first, then walks up from CWD.
    """
    env_root = os.environ.get("GROVE_ROOT")
    if env_root:
        p = Path(env_root)
        if p.exists():
            return p

    cwd = Path.cwd()
    for parent in [cwd, *cwd.parents]:
        if (parent / "pnpm-workspace.yaml").exists():
            return parent

    return None


def find_seed_scripts(grove_root: Path, scripts_dir: str = "scripts/db") -> list[Path]:
    """Find SQL seed scripts in the scripts directory.

    Returns paths sorted alphabetically for deterministic execution order.
    """
    scripts_path = grove_root / scripts_dir
    if not scripts_path.exists():
        return []

    return sorted(scripts_path.glob("*.sql"))


def find_local_d1_databases(grove_root: Path) -> dict[str, Path | None]:
    """Find local D1 SQLite files in .wrangler/state/.

    Returns a dict mapping database name to SQLite file path (or None if not found).
    """
    state_dir = grove_root / ".wrangler" / "state" / "v3" / "d1"
    databases = {
        "engine": None,
        "curios": None,
        "observability": None,
    }

    if not state_dir.exists():
        return databases

    # D1 local state uses miniflare directory structure
    for db_dir in state_dir.iterdir():
        if not db_dir.is_dir():
            continue
        # Look for the SQLite file
        for sqlite_file in db_dir.glob("*.sqlite"):
            name = db_dir.name.lower()
            if "engine" in name:
                databases["engine"] = sqlite_file
            elif "curio" in name:
                databases["curios"] = sqlite_file
            elif "obs" in name or "observ" in name:
                databases["observability"] = sqlite_file

    return databases


def query_database_counts(db_path: Path) -> dict[str, int]:
    """Query a local D1 SQLite database for table and row counts.

    Returns dict with 'tables', and counts for common tables.
    Used by `glimpse status` for readiness checks.
    """
    counts: dict[str, int] = {"tables": 0}

    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Count tables
        cursor.execute(
            "SELECT count(*) FROM sqlite_master WHERE type='table'"
        )
        counts["tables"] = cursor.fetchone()[0]

        # Try counting common tables (ignore if they don't exist)
        for table in ["tenants", "pages", "posts", "site_settings"]:
            try:
                cursor.execute(f"SELECT count(*) FROM {table}")  # noqa: S608
                counts[table] = cursor.fetchone()[0]
            except sqlite3.OperationalError:
                pass

        conn.close()
    except (sqlite3.Error, OSError):
        pass

    return counts
