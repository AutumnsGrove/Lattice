"""Durable Objects commands - inspect and manage DO instances."""

import json
from typing import Optional

import click

from ..config import GWConfig
from ..ui import console, create_table, error, info, success, warning
from ..wrangler import Wrangler, WranglerError


@click.group()
@click.pass_context
def do(ctx: click.Context) -> None:
    """Durable Objects operations.

    Inspect Durable Object namespaces and instances.
    All operations are read-only for safety.

    \b
    Examples:
        gw do list                    # List DO namespaces
        gw do info TENANT_SESSIONS    # Show namespace info
    """
    pass


@do.command("list")
@click.option("--worker", "-w", default="grove-engine", help="Worker name (default: grove-engine)")
@click.pass_context
def do_list(ctx: click.Context, worker: str) -> None:
    """List Durable Object namespaces.

    Always safe - no --write flag required.

    \b
    Examples:
        gw do list
        gw do list --worker grove-auth
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Get DO namespaces from wrangler.toml bindings
    # Note: There's no direct wrangler command to list DOs, so we parse config
    try:
        # Try to get bindings info which includes DOs
        result = wrangler.execute(["deploy", "--dry-run", "--outdir", "/tmp/gw-do-check"], use_json=True)
        # This is a workaround - wrangler doesn't have a direct DO list command
        # In practice, DOs are defined in wrangler.toml
    except WranglerError:
        pass  # Expected to fail, we're just checking

    # For now, show configured DOs from a known list
    # In a real implementation, we'd parse wrangler.toml
    known_dos = [
        {"name": "TENANT_SESSIONS", "class": "TenantSession", "description": "Per-tenant session management"},
        {"name": "RATE_LIMITER", "class": "RateLimiter", "description": "Distributed rate limiting"},
        {"name": "REALTIME_ROOMS", "class": "RealtimeRoom", "description": "WebSocket room coordination"},
    ]

    if output_json:
        console.print(json.dumps({"worker": worker, "namespaces": known_dos}, indent=2))
        return

    console.print(f"\n[bold green]Durable Objects in {worker}[/bold green]\n")

    do_table = create_table(title="DO Namespaces")
    do_table.add_column("Binding", style="cyan")
    do_table.add_column("Class", style="magenta")
    do_table.add_column("Description", style="dim")

    for do_info in known_dos:
        do_table.add_row(
            do_info["name"],
            do_info["class"],
            do_info["description"],
        )

    console.print(do_table)
    console.print("\n[dim]Note: DO list is based on known bindings. Check wrangler.toml for definitive list.[/dim]")


@do.command("info")
@click.argument("namespace")
@click.option("--worker", "-w", default="grove-engine", help="Worker name")
@click.pass_context
def do_info(ctx: click.Context, namespace: str, worker: str) -> None:
    """Show Durable Object namespace info.

    Always safe - no --write flag required.

    \b
    Examples:
        gw do info TENANT_SESSIONS
        gw do info RATE_LIMITER --worker grove-engine
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)

    # DO inspection is limited - Cloudflare doesn't expose much via CLI
    # This would typically require the Cloudflare API directly

    info_data = {
        "namespace": namespace,
        "worker": worker,
        "note": "Durable Object inspection requires Cloudflare dashboard or API",
        "dashboard_url": f"https://dash.cloudflare.com/?to=/:account/workers/durable-objects",
    }

    if output_json:
        console.print(json.dumps(info_data, indent=2))
        return

    console.print(f"\n[bold green]Durable Object: {namespace}[/bold green]\n")
    console.print(f"Worker: [cyan]{worker}[/cyan]")
    console.print(f"\n[dim]Full DO inspection requires the Cloudflare dashboard.[/dim]")
    console.print(f"[dim]Dashboard: {info_data['dashboard_url']}[/dim]")


@do.command("alarm")
@click.argument("namespace")
@click.argument("instance_id")
@click.option("--worker", "-w", default="grove-engine", help="Worker name")
@click.pass_context
def do_alarm(ctx: click.Context, namespace: str, instance_id: str, worker: str) -> None:
    """Check alarm status for a DO instance.

    Always safe - no --write flag required.

    \b
    Examples:
        gw do alarm TENANT_SESSIONS abc123
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)

    # Alarm inspection is not directly available via wrangler
    # This would require Cloudflare API

    if output_json:
        console.print(json.dumps({
            "namespace": namespace,
            "instance_id": instance_id,
            "error": "Alarm inspection requires Cloudflare API",
        }))
    else:
        warning("Alarm inspection requires direct Cloudflare API access")
        info("Use the Cloudflare dashboard to view DO alarms")
