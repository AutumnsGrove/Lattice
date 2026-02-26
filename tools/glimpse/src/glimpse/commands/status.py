"""glimpse status — readiness check for development environment."""

import shutil
import subprocess
import sys

import click

from glimpse.server.health import check_server_reachable
from glimpse.seed.discovery import find_grove_root, find_local_d1_databases, query_database_counts


@click.command()
@click.pass_context
def status(ctx: click.Context) -> None:
    """Report whether the development environment is ready for verification.

    Checks: browser installed, dev server running, database seeded, config found.
    """
    config = ctx.obj["config"]
    output_handler = ctx.obj["output"]

    checks: dict = {}

    # 1. Browser check
    try:
        result = subprocess.run(
            [sys.executable, "-m", "playwright", "--version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            version = result.stdout.strip().split()[-1] if result.stdout.strip() else "unknown"
            checks["browser"] = {"ok": True, "detail": f"Chromium installed (playwright {version})"}
        else:
            checks["browser"] = {"ok": False, "detail": "Playwright not found"}
    except Exception:
        checks["browser"] = {"ok": False, "detail": "Playwright not found"}

    # 2. Dev server check
    health_url = config.server_health_url
    if check_server_reachable(health_url):
        checks["server"] = {"ok": True, "detail": f"Running on {health_url}"}
    else:
        checks["server"] = {"ok": False, "detail": f"Not running on {health_url}"}

    # 3. Database check (direct SQLite read for speed)
    grove_root = find_grove_root()
    if grove_root:
        databases = find_local_d1_databases(grove_root)
        engine_db = databases.get("engine")
        if engine_db and engine_db.exists():
            counts = query_database_counts(engine_db)
            tenants = counts.get("tenants", 0)
            pages = counts.get("pages", 0)
            posts = counts.get("posts", 0)
            if tenants > 0:
                checks["database"] = {
                    "ok": True,
                    "detail": f"Local D1 seeded ({tenants} tenant{'s' if tenants != 1 else ''}, {pages} pages, {posts} posts)",
                }
            else:
                checks["database"] = {
                    "ok": False,
                    "detail": "Local D1 not seeded (run: glimpse seed)",
                }
        else:
            checks["database"] = {"ok": False, "detail": "Local D1 not seeded (run: glimpse seed)"}
    else:
        checks["database"] = {"ok": False, "detail": "GROVE_ROOT not found"}

    # 4. Config check
    config_path = config._find_config()
    if config_path:
        checks["config"] = {"ok": True, "detail": f".glimpse.toml found ({config_path})"}
    else:
        checks["config"] = {"ok": False, "detail": "No .glimpse.toml (using defaults)"}

    # Suggestions for fixing issues
    suggestions = []
    if not checks["database"].get("ok"):
        suggestions.append("glimpse seed")
    if not checks["server"].get("ok"):
        suggestions.append(f"cd {config.server_start_cwd} && {config.server_start_command}")
    if not checks["browser"].get("ok"):
        suggestions.append("glimpse install")
    if suggestions:
        checks["suggestions"] = suggestions

    # Check overall readiness
    checks["ready"] = all(
        v.get("ok", False) for k, v in checks.items()
        if isinstance(v, dict) and k not in ("suggestions",)
    )

    output_handler.print_status(checks)
