"""Status command - shows current Grove Wrap status and configuration."""

import json
from pathlib import Path

import click

from ..config import GWConfig
from ..ui import console, create_panel, create_table, error, info, success, warning
from ..wrangler import Wrangler, WranglerError


@click.command()
@click.pass_context
def status(ctx: click.Context) -> None:
    """Show current Grove Wrap status and configuration.

    Displays Cloudflare account information, available databases,
    KV namespaces, R2 buckets, and project directory.
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj["output_json"]

    wrangler = Wrangler(config)

    status_data = {
        "cloudflare": None,
        "databases": {},
        "kv_namespaces": {},
        "r2_buckets": [],
        "project_directory": str(Path.cwd()),
        "config_file": str(Path.home() / ".grove" / "gw.toml"),
    }

    # Get Cloudflare account info
    if not wrangler.is_installed():
        status_data["cloudflare"] = {
            "authenticated": False,
            "installed": False,
            "error": "Wrangler is not installed",
        }
    else:
        try:
            whoami_data = wrangler.whoami()
            account = whoami_data.get("account", {})
            status_data["cloudflare"] = {
                "account_id": account.get("id"),
                "account_name": account.get("name"),
                "authenticated": True,
                "installed": True,
            }
        except WranglerError:
            status_data["cloudflare"] = {
                "authenticated": False,
                "installed": True,
                "error": "Not authenticated with Cloudflare",
            }

    # Collect databases
    for alias, db in config.databases.items():
        status_data["databases"][alias] = {
            "name": db.name,
            "id": db.id,
        }

    # Collect KV namespaces
    for alias, kv in config.kv_namespaces.items():
        status_data["kv_namespaces"][alias] = {
            "name": kv.name,
            "id": kv.id,
        }

    # Collect R2 buckets
    for bucket in config.r2_buckets:
        status_data["r2_buckets"].append(bucket.name)

    if output_json:
        console.print(json.dumps(status_data, indent=2))
        return

    # Human-readable output
    console.print("\n[bold green]Grove Wrap Status[/bold green]\n")

    # Cloudflare section
    cf = status_data["cloudflare"]
    if cf.get("authenticated"):
        console.print(
            create_panel(
                f"Account: [bold]{cf['account_name']}[/bold]\n"
                f"ID: {cf['account_id']}",
                title="Cloudflare",
                style="blue",
            )
        )
    elif not cf.get("installed", True):
        console.print(
            create_panel(
                "[dim]Wrangler not installed[/dim]\nInstall with: [bold]npm i -g wrangler[/bold]",
                title="Cloudflare",
                style="dim",
            )
        )
    else:
        console.print(
            create_panel(
                "[yellow]Not authenticated[/yellow]\nRun [bold]gw auth login[/bold] to authenticate",
                title="Cloudflare",
                style="red",
            )
        )

    # Databases section
    if status_data["databases"]:
        db_table = create_table(title="Databases")
        db_table.add_column("Alias", style="cyan")
        db_table.add_column("Name", style="magenta")
        db_table.add_column("ID", style="yellow")

        for alias, db in status_data["databases"].items():
            db_table.add_row(alias, db["name"], db["id"][:8] + "...")

        console.print(db_table)

    # KV Namespaces section
    if status_data["kv_namespaces"]:
        console.print()
        kv_table = create_table(title="KV Namespaces")
        kv_table.add_column("Alias", style="cyan")
        kv_table.add_column("Name", style="magenta")
        kv_table.add_column("ID", style="yellow")

        for alias, kv in status_data["kv_namespaces"].items():
            kv_table.add_row(alias, kv["name"], kv["id"][:8] + "...")

        console.print(kv_table)

    # R2 Buckets section
    if status_data["r2_buckets"]:
        console.print()
        r2_table = create_table(title="R2 Buckets")
        r2_table.add_column("Bucket Name", style="cyan")

        for bucket in status_data["r2_buckets"]:
            r2_table.add_row(bucket)

        console.print(r2_table)

    # Project info
    console.print()
    console.print(f"[dim]Project directory:[/dim] {status_data['project_directory']}")
    console.print(f"[dim]Config file:[/dim] {status_data['config_file']}")
    console.print()
