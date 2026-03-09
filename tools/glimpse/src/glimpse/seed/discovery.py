"""Discover GROVE_ROOT, seed scripts, migration directories, and local D1 files.

Provides the filesystem context that the DataBootstrapper needs to apply
migrations and seed data.

Database discovery searches two locations:
  1. libs/engine/.wrangler/ — created by `wrangler d1 migrations apply` or
     `vite dev` (miniflare). Files use hash-based names and are identified
     by querying table contents.
  2. {root}/.wrangler/ — glimpse-created databases with named directories
     (glimpse-engine/, glimpse-curios/, etc.). Used as fallback.

The wrangler-created databases are preferred because they're what the dev
server actually reads from.
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


def _identify_wrangler_database(db_path: Path) -> str | None:
    """Identify a wrangler-created database by its table contents.

    Returns 'engine', 'curios', or 'observability', or None if unidentifiable.
    Wrangler creates databases with hash-based filenames so we can't identify
    them by path — we query for signature tables instead.
    """
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Check for curios-specific tables (guestbook, gallery, timeline)
        cursor.execute(
            "SELECT count(*) FROM sqlite_master WHERE type='table' AND "
            "name IN ('guestbook_entries', 'gallery_items', 'timeline_entries')"
        )
        curio_tables = cursor.fetchone()[0]

        # Check for observability-specific tables (sentinel, vista)
        cursor.execute(
            "SELECT count(*) FROM sqlite_master WHERE type='table' AND "
            "name IN ('sentinel_checks', 'vista_events', 'sentinel_incidents')"
        )
        obs_tables = cursor.fetchone()[0]

        # Check for engine-specific tables (tenants, posts, pages)
        cursor.execute(
            "SELECT count(*) FROM sqlite_master WHERE type='table' AND "
            "name IN ('tenants', 'posts', 'pages', 'site_settings')"
        )
        engine_tables = cursor.fetchone()[0]

        conn.close()

        # The database with the most matching signature tables wins.
        # When wrangler applies engine migrations to all databases,
        # all may have tenants/posts/pages. But curios/obs tables
        # are only created by their respective migrations.
        if curio_tables >= 2:
            return "curios"
        if obs_tables >= 2:
            return "observability"
        if engine_tables >= 2:
            return "engine"

        return None
    except (sqlite3.Error, OSError):
        return None


def find_local_d1_databases(grove_root: Path) -> dict[str, Path | None]:
    """Find local D1 SQLite files created by wrangler or glimpse.

    Searches two locations (wrangler-created preferred):
      1. libs/engine/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/
      2. {root}/.wrangler/state/v3/d1/ (glimpse-created named directories)

    Returns a dict mapping database name to SQLite file path (or None if not found).
    """
    databases: dict[str, Path | None] = {
        "engine": None,
        "curios": None,
        "observability": None,
    }

    # Priority 1: Wrangler-created databases (what the dev server uses)
    wrangler_dir = (
        grove_root / "libs" / "engine" / ".wrangler" / "state" / "v3" / "d1"
        / "miniflare-D1DatabaseObject"
    )
    if wrangler_dir.exists():
        unidentified: list[Path] = []
        for sqlite_file in sorted(wrangler_dir.glob("*.sqlite")):
            # Skip WAL/SHM files
            if "-shm" in sqlite_file.name or "-wal" in sqlite_file.name:
                continue
            db_type = _identify_wrangler_database(sqlite_file)
            if db_type and databases[db_type] is None:
                databases[db_type] = sqlite_file
            else:
                unidentified.append(sqlite_file)

        # When all databases got engine migrations (common with wrangler),
        # they all look like engine DBs. Assign the first match as engine,
        # and remaining unidentified as curios/observability in order.
        if databases["engine"] is None and unidentified:
            databases["engine"] = unidentified.pop(0)
        if databases["curios"] is None and unidentified:
            databases["curios"] = unidentified.pop(0)
        if databases["observability"] is None and unidentified:
            databases["observability"] = unidentified.pop(0)

    # Priority 2: Glimpse-created databases (fallback)
    glimpse_dir = grove_root / ".wrangler" / "state" / "v3" / "d1"
    if glimpse_dir.exists():
        for db_dir in glimpse_dir.iterdir():
            if not db_dir.is_dir():
                continue
            for sqlite_file in db_dir.glob("*.sqlite"):
                name = db_dir.name.lower()
                if "engine" in name and databases["engine"] is None:
                    databases["engine"] = sqlite_file
                elif "curio" in name and databases["curios"] is None:
                    databases["curios"] = sqlite_file
                elif ("obs" in name or "observ" in name) and databases["observability"] is None:
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
                cursor.execute(f'SELECT count(*) FROM "{table}"')  # noqa: S608
                counts[table] = cursor.fetchone()[0]
            except sqlite3.OperationalError:
                pass

        conn.close()
    except (sqlite3.Error, OSError):
        pass

    return counts
