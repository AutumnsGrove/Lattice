"""Diagnostic commands - check system health and common issues."""

import json
import shutil
import subprocess
from pathlib import Path
from typing import Optional

import click

from ..config import GWConfig
from ..ui import console, create_panel, create_table, error, info, success, warning


@click.command()
@click.option("--fix", is_flag=True, help="Attempt to fix issues where possible")
@click.option("--verbose", "-v", is_flag=True, help="Show detailed output")
@click.pass_context
def doctor(ctx: click.Context, fix: bool, verbose: bool) -> None:
    """Diagnose common issues and check system health.

    Like 'brew doctor' - runs diagnostic checks and suggests fixes.

    \b
    Examples:
        gw doctor              # Run all checks
        gw doctor --fix        # Fix issues where possible
        gw doctor -v           # Verbose output
    """
    output_json = ctx.obj.get("output_json", False)
    config: GWConfig = ctx.obj["config"]

    checks = []
    warnings_count = 0
    errors_count = 0

    if not output_json:
        console.print("\n[bold green]🌲 Grove Doctor[/bold green]\n")
        console.print("[dim]Running diagnostic checks...[/dim]\n")

    # Check 1: Wrangler installed
    wrangler_check = _check_wrangler(verbose)
    checks.append(wrangler_check)
    if wrangler_check["status"] == "warning":
        warnings_count += 1
    elif wrangler_check["status"] == "error":
        errors_count += 1

    # Check 2: Wrangler authenticated
    auth_check = _check_wrangler_auth(verbose)
    checks.append(auth_check)
    if auth_check["status"] == "warning":
        warnings_count += 1
    elif auth_check["status"] == "error":
        errors_count += 1

    # Check 3: Git installed
    git_check = _check_git(verbose)
    checks.append(git_check)
    if git_check["status"] == "error":
        errors_count += 1

    # Check 4: GitHub CLI installed
    gh_check = _check_gh(verbose)
    checks.append(gh_check)
    if gh_check["status"] == "warning":
        warnings_count += 1
    elif gh_check["status"] == "error":
        errors_count += 1

    # Check 5: GitHub CLI authenticated
    gh_auth_check = _check_gh_auth(verbose)
    checks.append(gh_auth_check)
    if gh_auth_check["status"] == "warning":
        warnings_count += 1
    elif gh_auth_check["status"] == "error":
        errors_count += 1

    # Check 6: Config file exists
    config_check = _check_config(verbose)
    checks.append(config_check)
    if config_check["status"] == "warning":
        warnings_count += 1

    # Check 7: Secrets vault
    vault_check = _check_secrets_vault(verbose)
    checks.append(vault_check)
    if vault_check["status"] == "warning":
        warnings_count += 1

    # Check 8: Node.js / pnpm for dev commands
    node_check = _check_node(verbose)
    checks.append(node_check)
    if node_check["status"] == "warning":
        warnings_count += 1

    # Check 9: UV for Python
    uv_check = _check_uv(verbose)
    checks.append(uv_check)
    if uv_check["status"] == "warning":
        warnings_count += 1

    # Check 10: In a Grove monorepo
    monorepo_check = _check_monorepo(verbose)
    checks.append(monorepo_check)
    if monorepo_check["status"] == "warning":
        warnings_count += 1

    # Check 11: Wrangler config consistency
    config_check2 = _check_wrangler_configs(verbose)
    checks.append(config_check2)
    if config_check2["status"] == "warning":
        warnings_count += 1
    elif config_check2["status"] == "error":
        errors_count += 1

    # Check 12: Migration health
    migration_check = _check_migrations(verbose)
    checks.append(migration_check)
    if migration_check["status"] == "warning":
        warnings_count += 1

    if output_json:
        console.print(json.dumps({
            "checks": checks,
            "warnings": warnings_count,
            "errors": errors_count,
            "healthy": errors_count == 0,
        }, indent=2))
        return

    # Display results
    table = create_table()
    table.add_column("Check", style="cyan")
    table.add_column("Status", justify="center")
    table.add_column("Details", style="dim")

    for check in checks:
        if check["status"] == "ok":
            status = "[green]✓ OK[/green]"
        elif check["status"] == "warning":
            status = "[yellow]⚠ Warning[/yellow]"
        else:
            status = "[red]✗ Error[/red]"

        table.add_row(check["name"], status, check.get("details", ""))

    console.print(table)
    console.print()

    # Summary
    if errors_count > 0:
        error(f"{errors_count} error(s), {warnings_count} warning(s)")
    elif warnings_count > 0:
        warning(f"{warnings_count} warning(s)")
        console.print("[dim]Run with --fix to attempt automatic fixes[/dim]")
    else:
        success("All checks passed!")

    # Show fixes if there are issues
    fixes = [c for c in checks if c.get("fix")]
    if fixes and not output_json:
        console.print("\n[bold]Suggested Fixes:[/bold]\n")
        for c in fixes:
            console.print(f"  • {c['name']}: [cyan]{c['fix']}[/cyan]")

    # Exit code
    ctx.exit(1 if errors_count > 0 else 0)


def _check_wrangler(verbose: bool) -> dict:
    """Check if wrangler is installed and get version."""
    wrangler_path = shutil.which("wrangler")
    if not wrangler_path:
        return {
            "name": "Wrangler CLI",
            "status": "error",
            "details": "Not installed",
            "fix": "npm install -g wrangler",
        }

    try:
        result = subprocess.run(
            ["wrangler", "--version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        version = result.stdout.strip().split()[-1] if result.stdout else "unknown"
        return {
            "name": "Wrangler CLI",
            "status": "ok",
            "details": f"v{version}",
        }
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return {
            "name": "Wrangler CLI",
            "status": "error",
            "details": "Failed to check version",
        }


def _check_wrangler_auth(verbose: bool) -> dict:
    """Check if wrangler is authenticated."""
    try:
        result = subprocess.run(
            ["wrangler", "whoami"],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode == 0 and "You are logged in" in result.stdout:
            # Extract email if present
            lines = result.stdout.strip().split("\n")
            email = None
            for line in lines:
                if "@" in line:
                    email = line.strip()
                    break
            return {
                "name": "Wrangler Auth",
                "status": "ok",
                "details": email or "Authenticated",
            }
        return {
            "name": "Wrangler Auth",
            "status": "warning",
            "details": "Not logged in",
            "fix": "wrangler login",
        }
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return {
            "name": "Wrangler Auth",
            "status": "warning",
            "details": "Could not check",
        }


def _check_git(verbose: bool) -> dict:
    """Check if git is installed."""
    git_path = shutil.which("git")
    if not git_path:
        return {
            "name": "Git",
            "status": "error",
            "details": "Not installed",
            "fix": "Install git from https://git-scm.com",
        }

    try:
        result = subprocess.run(
            ["git", "--version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        version = result.stdout.strip().replace("git version ", "")
        return {
            "name": "Git",
            "status": "ok",
            "details": f"v{version}",
        }
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return {
            "name": "Git",
            "status": "error",
            "details": "Failed to check version",
        }


def _check_gh(verbose: bool) -> dict:
    """Check if GitHub CLI is installed."""
    gh_path = shutil.which("gh")
    if not gh_path:
        return {
            "name": "GitHub CLI",
            "status": "warning",
            "details": "Not installed (optional)",
            "fix": "brew install gh",
        }

    try:
        result = subprocess.run(
            ["gh", "--version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        version = result.stdout.strip().split()[2] if result.stdout else "unknown"
        return {
            "name": "GitHub CLI",
            "status": "ok",
            "details": f"v{version}",
        }
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return {
            "name": "GitHub CLI",
            "status": "warning",
            "details": "Failed to check version",
        }


def _check_gh_auth(verbose: bool) -> dict:
    """Check if GitHub CLI is authenticated."""
    gh_path = shutil.which("gh")
    if not gh_path:
        return {
            "name": "GitHub Auth",
            "status": "warning",
            "details": "gh not installed",
        }

    try:
        result = subprocess.run(
            ["gh", "auth", "status"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            return {
                "name": "GitHub Auth",
                "status": "ok",
                "details": "Authenticated",
            }
        return {
            "name": "GitHub Auth",
            "status": "warning",
            "details": "Not logged in",
            "fix": "gh auth login",
        }
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return {
            "name": "GitHub Auth",
            "status": "warning",
            "details": "Could not check",
        }


def _check_config(verbose: bool) -> dict:
    """Check if gw config file exists."""
    config_path = Path.home() / ".grove" / "gw.toml"
    if config_path.exists():
        return {
            "name": "Config File",
            "status": "ok",
            "details": str(config_path),
        }
    return {
        "name": "Config File",
        "status": "warning",
        "details": "Not found (using defaults)",
        "fix": "gw config init",
    }


def _check_secrets_vault(verbose: bool) -> dict:
    """Check if secrets vault exists."""
    vault_path = Path.home() / ".grove" / "secrets.enc"
    if vault_path.exists():
        return {
            "name": "Secrets Vault",
            "status": "ok",
            "details": "Initialized",
        }
    return {
        "name": "Secrets Vault",
        "status": "warning",
        "details": "Not initialized",
        "fix": "gw secret init",
    }


def _check_node(verbose: bool) -> dict:
    """Check if Node.js and pnpm are installed."""
    node_path = shutil.which("node")
    pnpm_path = shutil.which("pnpm")

    if not node_path:
        return {
            "name": "Node.js",
            "status": "warning",
            "details": "Not installed (needed for dev commands)",
            "fix": "Install Node.js from https://nodejs.org",
        }

    if not pnpm_path:
        return {
            "name": "Node.js / pnpm",
            "status": "warning",
            "details": "pnpm not installed",
            "fix": "npm install -g pnpm",
        }

    try:
        result = subprocess.run(
            ["node", "--version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        version = result.stdout.strip()
        return {
            "name": "Node.js / pnpm",
            "status": "ok",
            "details": f"Node {version}",
        }
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return {
            "name": "Node.js / pnpm",
            "status": "warning",
            "details": "Failed to check version",
        }


def _check_uv(verbose: bool) -> dict:
    """Check if UV is installed."""
    uv_path = shutil.which("uv")
    if not uv_path:
        return {
            "name": "UV (Python)",
            "status": "warning",
            "details": "Not installed (recommended)",
            "fix": "curl -LsSf https://astral.sh/uv/install.sh | sh",
        }

    try:
        result = subprocess.run(
            ["uv", "--version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        version = result.stdout.strip().split()[-1] if result.stdout else "unknown"
        return {
            "name": "UV (Python)",
            "status": "ok",
            "details": f"v{version}",
        }
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return {
            "name": "UV (Python)",
            "status": "warning",
            "details": "Failed to check version",
        }


def _check_monorepo(verbose: bool) -> dict:
    """Check if we're in a Grove monorepo."""
    cwd = Path.cwd()

    # Look for pnpm-workspace.yaml
    workspace_file = cwd / "pnpm-workspace.yaml"
    if not workspace_file.exists():
        # Try parent directories
        for parent in cwd.parents:
            if (parent / "pnpm-workspace.yaml").exists():
                workspace_file = parent / "pnpm-workspace.yaml"
                break

    if workspace_file.exists():
        return {
            "name": "Grove Monorepo",
            "status": "ok",
            "details": str(workspace_file.parent.name),
        }

    return {
        "name": "Grove Monorepo",
        "status": "warning",
        "details": "Not in a monorepo",
    }


def _check_wrangler_configs(verbose: bool) -> dict:
    """Check wrangler.toml configs for ID consistency."""
    try:
        import tomllib
    except ImportError:
        try:
            import tomli as tomllib
        except ImportError:
            return {
                "name": "Config Consistency",
                "status": "warning",
                "details": "tomllib not available",
            }

    cwd = Path.cwd()
    root = cwd
    for parent in [cwd] + list(cwd.parents):
        if (parent / "pnpm-workspace.yaml").exists():
            root = parent
            break

    wrangler_files = [
        f for f in root.rglob("wrangler.toml")
        if "node_modules" not in str(f) and "_deprecated" not in str(f)
    ]

    if not wrangler_files:
        return {
            "name": "Config Consistency",
            "status": "ok",
            "details": "No wrangler.toml files",
        }

    # Collect binding IDs across files
    from collections import defaultdict
    binding_ids: dict[str, set] = defaultdict(set)

    for wpath in wrangler_files:
        try:
            with open(wpath, "rb") as f:
                data = tomllib.load(f)
        except Exception:
            continue

        for db in data.get("d1_databases", []):
            binding = db.get("binding", "?")
            db_id = db.get("database_id", "")
            if db_id:
                binding_ids[f"D1:{binding}"].add(db_id)

        for kv in data.get("kv_namespaces", []):
            binding = kv.get("binding", "?")
            kv_id = kv.get("id", "")
            if kv_id:
                binding_ids[f"KV:{binding}"].add(kv_id)

    mismatches = [k for k, v in binding_ids.items() if len(v) > 1]

    if mismatches:
        return {
            "name": "Config Consistency",
            "status": "warning",
            "details": f"{len(mismatches)} binding(s) have mismatched IDs",
            "fix": "gw config-validate --fix-report",
        }

    return {
        "name": "Config Consistency",
        "status": "ok",
        "details": f"{len(wrangler_files)} configs, all IDs consistent",
    }


def _check_migrations(verbose: bool) -> dict:
    """Check migration health across packages."""
    cwd = Path.cwd()
    root = cwd
    for parent in [cwd] + list(cwd.parents):
        if (parent / "pnpm-workspace.yaml").exists():
            root = parent
            break

    migration_dirs = []
    for migrations_dir in root.rglob("migrations"):
        if "node_modules" in str(migrations_dir) or "_deprecated" in str(migrations_dir):
            continue
        if migrations_dir.is_dir():
            sql_files = list(migrations_dir.glob("*.sql"))
            if sql_files:
                migration_dirs.append((migrations_dir, sql_files))

    if not migration_dirs:
        return {
            "name": "D1 Migrations",
            "status": "ok",
            "details": "No migrations found",
        }

    total = sum(len(files) for _, files in migration_dirs)

    # Check for naming consistency (should be sequential numbers)
    issues = []
    for mdir, files in migration_dirs:
        names = sorted([f.stem for f in files])
        # Check if all start with numbers
        numbered = [n for n in names if n[:4].isdigit()]
        if len(numbered) != len(names):
            issues.append(str(mdir.relative_to(root)))

    if issues:
        return {
            "name": "D1 Migrations",
            "status": "warning",
            "details": f"{total} migrations, {len(issues)} dir(s) with inconsistent naming",
            "fix": "gf migrations",
        }

    return {
        "name": "D1 Migrations",
        "status": "ok",
        "details": f"{total} migrations across {len(migration_dirs)} databases",
    }
