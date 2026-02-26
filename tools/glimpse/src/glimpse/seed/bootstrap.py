"""Data bootstrapper for local D1 databases.

Applies migrations via wrangler CLI and executes seed SQL scripts via
direct SQLite access for speed. Handles all three Grove databases.
"""

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
                results.append({
                    "db": name,
                    "success": proc.returncode == 0,
                    "output": proc.stdout.strip() or proc.stderr.strip(),
                })
            except FileNotFoundError:
                results.append({
                    "db": name,
                    "success": False,
                    "output": "wrangler not found (install with: pnpm add -g wrangler)",
                })
            except subprocess.TimeoutExpired:
                results.append({
                    "db": name,
                    "success": False,
                    "output": "Migration timed out after 60s",
                })

        return results

    def apply_seeds(
        self,
        tenant: str | None = None,
        target_db: str | None = None,
        dry_run: bool = False,
    ) -> list[dict]:
        """Execute seed SQL scripts against local D1 databases.

        Uses direct SQLite access for speed (bypasses wrangler CLI).
        """
        if not self._grove_root:
            return [{"script": "all", "success": False, "output": "GROVE_ROOT not found"}]

        # Find seed scripts
        scripts = find_seed_scripts(self._grove_root, self._scripts_dir)
        if not scripts:
            return [{"script": "all", "success": True, "output": "No seed scripts found"}]

        # Filter by tenant if specified
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

    def reset(self, target_db: str | None = None) -> list[dict]:
        """Drop all local D1 data and recreate from scratch.

        This is destructive. Caller must confirm before calling.
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
                            cursor.execute(f"DROP TABLE IF EXISTS {table}")  # noqa: S608
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

        # Re-apply migrations and seeds
        migration_results = self.apply_migrations(target_db)
        seed_results = self.apply_seeds(target_db=target_db)

        return results + migration_results + seed_results
