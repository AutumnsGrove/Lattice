"""Data bootstrapper for local D1 databases.

Applies migrations via wrangler CLI and executes seed SQL scripts via
direct SQLite access for speed. Handles all three Grove databases.

When wrangler migrations fail (e.g. DEFAULT (unixepoch()) not supported
in local SQLite ALTER TABLE), falls back to direct SQLite execution with
compatibility patching.

Supports data profiles for switching between different test states:
  - blog: Full Midnight Bloom tea shop (3 posts, 5 pages)
  - empty: Tenant exists with defaults, no posts or custom pages
  - fresh: Clean databases with migrations only, no tenant data
"""

import re
import sqlite3
import subprocess
import sys
from pathlib import Path

from glimpse.seed.discovery import find_grove_root, find_seed_scripts, find_local_d1_databases


# Database names and their wrangler identifiers
DATABASES = {
    "engine": "grove-engine-db",
    "curios": "grove-curios-db",
    "observability": "grove-observability-db",
}

# Patterns that break local D1 SQLite in ALTER TABLE statements.
# unixepoch() is valid in CREATE TABLE but not in ALTER TABLE ADD COLUMN
# on the local miniflare SQLite version.
_UNIXEPOCH_DEFAULT_RE = re.compile(
    r"(ALTER\s+TABLE\s+\w+\s+ADD\s+COLUMN\s+\w+\s+\w+)\s+DEFAULT\s+\(unixepoch\(\)\)",
    re.IGNORECASE,
)

# Data profiles: map profile name to the seed scripts it uses.
# Scripts are loaded from the seed scripts directory (scripts/db/).
# "fresh" uses no seeds (migrations only).
PROFILES: dict[str, list[str]] = {
    "blog": [
        "seed-midnight-bloom.sql",
        "add-midnight-bloom-pages.sql",
        "fix-midnight-bloom-content.sql",
    ],
    "empty": [
        "seed-empty-grove.sql",
    ],
    "fresh": [],
}

DEFAULT_PROFILE = "blog"


def _patch_migration_sql(sql: str) -> str:
    """Patch migration SQL for local D1 SQLite compatibility.

    Replaces DEFAULT (unixepoch()) in ALTER TABLE statements with
    DEFAULT 0, since local SQLite doesn't support non-constant defaults
    in ALTER TABLE ADD COLUMN.
    """
    return _UNIXEPOCH_DEFAULT_RE.sub(r"\1 DEFAULT 0", sql)


def _split_sql_statements(sql: str) -> list[str]:
    """Split SQL text into individual statements, respecting string literals.

    Unlike naive str.split(';'), this handles:
      - Multiline string values containing semicolons
      - SQL comments (-- line comments)
      - Escaped quotes ('') within strings
    """
    statements: list[str] = []
    current: list[str] = []
    in_string = False

    for line in sql.split("\n"):
        stripped = line.strip()

        # Skip pure comment lines (but keep inline comments)
        if stripped.startswith("--") and not in_string:
            continue

        current.append(line)

        # Track string state character by character
        i = 0
        while i < len(line):
            ch = line[i]
            if ch == "'" and not in_string:
                in_string = True
            elif ch == "'" and in_string:
                # Check for escaped quote ('')
                if i + 1 < len(line) and line[i + 1] == "'":
                    i += 1  # Skip the escaped quote
                else:
                    in_string = False
            elif ch == "-" and not in_string and i + 1 < len(line) and line[i + 1] == "-":
                break  # Rest of line is a comment
            elif ch == ";" and not in_string:
                # End of statement
                stmt = "\n".join(current).strip()
                if stmt:
                    statements.append(stmt)
                current = []
            i += 1

    # Handle any remaining content (statement without trailing semicolon)
    remainder = "\n".join(current).strip()
    if remainder:
        statements.append(remainder)

    return statements


class DataBootstrapper:
    """Orchestrates migration and seed data for local D1 databases."""

    def __init__(
        self,
        grove_root: Path | None = None,
        scripts_dir: str = "scripts/db",
        migrations_dir: str = "libs/engine/migrations",
    ) -> None:
        self._grove_root = grove_root or find_grove_root()
        self._scripts_dir = scripts_dir
        self._migrations_dir = migrations_dir

    def apply_migrations(
        self,
        target_db: str | None = None,
        dry_run: bool = False,
    ) -> list[dict]:
        """Apply wrangler D1 migrations to local databases.

        target_db: "engine", "curios", or "observability". None = all.
        Returns list of result dicts with 'db', 'success', 'output'.

        Strategy:
          1. Try wrangler d1 migrations apply (handles most migrations)
          2. If wrangler fails (e.g. migration 053+ with unixepoch()),
             apply remaining migrations directly to the SAME databases
             with compatibility patching.
        """
        if not self._grove_root:
            return [{"db": "all", "success": False, "output": "GROVE_ROOT not found"}]

        results = []
        dbs = {target_db: DATABASES[target_db]} if target_db else DATABASES

        for name, wrangler_name in dbs.items():
            if dry_run:
                results.append({
                    "db": name,
                    "success": True,
                    "output": f"[dry-run] Would apply migrations for {wrangler_name}",
                })
                continue

            # Step 1: Try wrangler (creates databases and applies what it can)
            wrangler_ok = self._try_wrangler_migrations(name, wrangler_name)

            # Step 2: Apply any remaining migrations directly with patching
            fallback = self._apply_remaining_migrations_direct(name)
            results.append(fallback)

        return results

    def _try_wrangler_migrations(self, db_name: str, wrangler_name: str) -> bool:
        """Run wrangler d1 migrations apply. Returns True if successful."""
        try:
            proc = subprocess.run(
                [
                    "npx", "wrangler", "d1", "migrations", "apply",
                    wrangler_name, "--local",
                ],
                cwd=str(self._grove_root / "libs" / "engine"),
                capture_output=True,
                text=True,
                timeout=60,
            )
            return proc.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

    def _apply_remaining_migrations_direct(self, db_name: str) -> dict:
        """Apply unapplied migrations directly via SQLite with compatibility patches.

        Finds the databases created by wrangler (in libs/engine/.wrangler/) and
        applies any migrations that wrangler couldn't handle (e.g. those with
        DEFAULT (unixepoch()) in ALTER TABLE).
        """
        migrations_path = self._grove_root / self._migrations_dir
        if not migrations_path.exists():
            return {"db": db_name, "success": False, "output": f"Migrations dir not found: {migrations_path}"}

        # Find the database (wrangler-created preferred, glimpse-created fallback)
        databases = find_local_d1_databases(self._grove_root)
        db_path = databases.get(db_name)

        if not db_path:
            # Create a glimpse-managed database as last resort
            state_dir = self._grove_root / ".wrangler" / "state" / "v3" / "d1"
            state_dir.mkdir(parents=True, exist_ok=True)
            db_dir = state_dir / f"glimpse-{db_name}"
            db_dir.mkdir(exist_ok=True)
            db_path = db_dir / "db.sqlite"

        migration_files = sorted(migrations_path.glob("*.sql"))
        if not migration_files:
            return {"db": db_name, "success": True, "output": "No migration files found"}

        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Create migrations tracking table if needed
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS d1_migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                applied_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

        # Get already-applied migrations
        cursor.execute("SELECT name FROM d1_migrations")
        applied = {row[0] for row in cursor.fetchall()}

        applied_count = 0
        skipped_count = 0
        errors = []

        for mig_file in migration_files:
            if mig_file.name in applied:
                skipped_count += 1
                continue

            sql = mig_file.read_text()
            patched_sql = _patch_migration_sql(sql)
            statements = _split_sql_statements(patched_sql)

            try:
                cursor.execute("BEGIN")
                for stmt in statements:
                    cursor.execute(stmt)
                cursor.execute(
                    "INSERT INTO d1_migrations (name) VALUES (?)",
                    (mig_file.name,),
                )
                conn.commit()
                applied_count += 1
            except sqlite3.Error as e:
                conn.rollback()
                errors.append(f"{mig_file.name}: {e}")

        conn.close()

        if errors:
            return {
                "db": db_name,
                "success": False,
                "output": (
                    f"Direct SQLite fallback: {applied_count} applied, "
                    f"{len(errors)} failed: {'; '.join(errors[:3])}"
                ),
            }

        return {
            "db": db_name,
            "success": True,
            "output": (
                f"Applied {applied_count} migrations via direct SQLite "
                f"({skipped_count} already applied)"
            ),
        }

    def apply_seeds(
        self,
        tenant: str | None = None,
        target_db: str | None = None,
        dry_run: bool = False,
        profile: str | None = None,
    ) -> list[dict]:
        """Execute seed SQL scripts against local D1 databases.

        Uses direct SQLite access for speed (bypasses wrangler CLI).

        When profile is specified, only scripts listed in that profile are run.
        When profile is None and tenant is None, all scripts in the seed
        directory are run (backward-compatible behavior).
        """
        if not self._grove_root:
            return [{"script": "all", "success": False, "output": "GROVE_ROOT not found"}]

        # Determine which scripts to run
        if profile is not None:
            if profile not in PROFILES:
                return [{"script": "all", "success": False, "output": f"Unknown profile: {profile}. Available: {', '.join(PROFILES)}"}]
            script_names = PROFILES[profile]
            if not script_names:
                return [{"script": "all", "success": True, "output": f"Profile '{profile}' uses no seed scripts (migrations only)"}]
            scripts_base = self._grove_root / self._scripts_dir
            scripts = [scripts_base / name for name in script_names if (scripts_base / name).exists()]
            missing = [name for name in script_names if not (scripts_base / name).exists()]
            if missing:
                return [{"script": "all", "success": False, "output": f"Missing seed scripts for profile '{profile}': {', '.join(missing)}"}]
        else:
            # Legacy behavior: find all scripts, optionally filter by tenant
            scripts = find_seed_scripts(self._grove_root, self._scripts_dir)
            if not scripts:
                return [{"script": "all", "success": True, "output": "No seed scripts found"}]
            if tenant:
                scripts = [s for s in scripts if tenant in s.name]

        # Find local databases
        databases = find_local_d1_databases(self._grove_root)

        results = []
        for script in scripts:
            if dry_run:
                results.append({
                    "script": script.name,
                    "success": True,
                    "output": f"[dry-run] Would execute {script.name}",
                })
                continue

            # Determine target database from script name
            db_key = "engine"  # default
            if "curio" in script.name.lower():
                db_key = "curios"
            elif "obs" in script.name.lower():
                db_key = "observability"

            if target_db and db_key != target_db:
                continue

            db_path = databases.get(db_key)
            if not db_path:
                results.append({
                    "script": script.name,
                    "success": False,
                    "output": f"Local {db_key} database not found (run migrations first)",
                })
                continue

            try:
                sql = script.read_text()
                conn = sqlite3.connect(str(db_path))
                conn.executescript(sql)
                conn.close()
                results.append({
                    "script": script.name,
                    "success": True,
                    "output": f"Executed {script.name}",
                })
            except sqlite3.Error as e:
                results.append({
                    "script": script.name,
                    "success": False,
                    "output": f"SQL error in {script.name}: {e}",
                })
            except OSError as e:
                results.append({
                    "script": script.name,
                    "success": False,
                    "output": f"File error: {e}",
                })

        return results

    def reset(self, target_db: str | None = None, profile: str | None = None) -> list[dict]:
        """Drop all local D1 data and recreate from scratch.

        This is destructive. Caller must confirm before calling.
        Uses the specified profile for re-seeding (defaults to 'blog').
        """
        if not self._grove_root:
            return [{"db": "all", "success": False, "output": "GROVE_ROOT not found"}]

        databases = find_local_d1_databases(self._grove_root)
        results = []

        dbs_to_reset = {target_db: databases.get(target_db)} if target_db else databases

        for name, db_path in dbs_to_reset.items():
            if db_path and db_path.exists():
                try:
                    conn = sqlite3.connect(str(db_path))
                    cursor = conn.cursor()
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                    tables = [row[0] for row in cursor.fetchall()]
                    for table in tables:
                        if table != "sqlite_sequence":
                            cursor.execute(f'DROP TABLE IF EXISTS "{table}"')  # noqa: S608
                    conn.commit()
                    conn.close()
                    results.append({
                        "db": name,
                        "success": True,
                        "output": f"Dropped {len(tables)} tables from {name}",
                    })
                except sqlite3.Error as e:
                    results.append({
                        "db": name,
                        "success": False,
                        "output": f"Reset failed for {name}: {e}",
                    })
            else:
                results.append({
                    "db": name,
                    "success": True,
                    "output": f"No local database for {name} (nothing to reset)",
                })

        # Re-apply migrations and seeds with the specified profile
        migration_results = self.apply_migrations(target_db)
        seed_results = self.apply_seeds(target_db=target_db, profile=profile or DEFAULT_PROFILE)

        return results + migration_results + seed_results
