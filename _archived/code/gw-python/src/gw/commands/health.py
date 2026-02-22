"""Health command - checks Grove Wrap health and readiness."""

import json
from pathlib import Path

import click

from ..config import GWConfig
from ..ui import console, create_panel, error, info, success, warning
from ..wrangler import Wrangler, WranglerError


@click.command()
@click.pass_context
def health(ctx: click.Context) -> None:
    """Check Grove Wrap health and readiness.

    Verifies:
    - Wrangler is installed and authenticated
    - Configuration file exists and is valid
    - Database connectivity (configured, not tested)
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj["output_json"]

    health_data = {
        "healthy": True,
        "checks": {
            "wrangler_installed": False,
            "wrangler_authenticated": False,
            "config_exists": False,
            "databases_configured": False,
        },
        "issues": [],
    }

    wrangler = Wrangler(config)

    # Check Wrangler installation
    if wrangler.is_installed():
        health_data["checks"]["wrangler_installed"] = True
    else:
        health_data["checks"]["wrangler_installed"] = False
        health_data["healthy"] = False
        health_data["issues"].append("Wrangler is not installed")

    # Check Wrangler authentication
    if wrangler.is_authenticated():
        health_data["checks"]["wrangler_authenticated"] = True
    else:
        health_data["checks"]["wrangler_authenticated"] = False
        health_data["healthy"] = False
        health_data["issues"].append("Wrangler is not authenticated")

    # Check config file exists
    config_file = Path.home() / ".grove" / "gw.toml"
    if config_file.exists():
        health_data["checks"]["config_exists"] = True
    else:
        health_data["checks"]["config_exists"] = False
        # This is not critical - we have defaults

    # Check databases configured
    if len(config.databases) > 0:
        health_data["checks"]["databases_configured"] = True
    else:
        health_data["checks"]["databases_configured"] = False
        health_data["issues"].append("No databases configured")
        health_data["healthy"] = False

    if output_json:
        console.print(json.dumps(health_data, indent=2))
        return

    # Human-readable output
    console.print("\n[bold green]Grove Wrap Health Check[/bold green]\n")

    # Overall status
    if health_data["healthy"]:
        success("All systems operational")
    else:
        error("One or more issues detected")

    console.print()

    # Individual checks
    checks = health_data["checks"]
    if checks["wrangler_installed"]:
        success("Wrangler installed")
    else:
        error("Wrangler not installed")

    if checks["wrangler_authenticated"]:
        success("Wrangler authenticated")
    else:
        error("Wrangler not authenticated")

    if checks["config_exists"]:
        success("Config file exists")
    else:
        info("Using default configuration")

    if checks["databases_configured"]:
        success(f"{len(config.databases)} database(s) configured")
    else:
        error("No databases configured")

    # Issues
    if health_data["issues"]:
        console.print()
        console.print("[yellow]Issues:[/yellow]")
        for issue in health_data["issues"]:
            console.print(f"  [yellow]•[/yellow] {issue}")

    console.print()
