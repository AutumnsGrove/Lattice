"""Warden audit log query command."""

import json

import click
from rich.console import Console
from rich.table import Table

from ...ui import GROVE_COLORS

console = Console()

WARDEN_URL = "https://warden.grove.place"


@click.command()
@click.option("--agent-id", help="Filter by agent ID")
@click.option("--service", help="Filter by service (github, tavily)")
@click.option("--limit", default=20, help="Number of entries to return")
@click.option("--url", default=WARDEN_URL, help="Warden base URL")
@click.option("--admin-key", envvar="WARDEN_ADMIN_KEY", help="Admin API key")
@click.pass_context
def logs(
    ctx: click.Context,
    agent_id: str,
    service: str,
    limit: int,
    url: str,
    admin_key: str,
) -> None:
    """Query recent audit log entries.

    Always safe — no --write flag required.

    \\b
    Examples:
        gw warden logs
        gw warden logs --service github --limit 50
        gw warden logs --agent-id wdn_abc123
    """
    output_json = ctx.obj.get("output_json", False)

    if not admin_key:
        console.print("[red]Admin key required.[/red] Set WARDEN_ADMIN_KEY or pass --admin-key")
        raise SystemExit(1)

    try:
        import urllib.request
        import urllib.parse

        params = {"limit": str(limit)}
        if agent_id:
            params["agent_id"] = agent_id
        if service:
            params["service"] = service

        from . import GW_USER_AGENT

        query_string = urllib.parse.urlencode(params)
        req = urllib.request.Request(
            f"{url}/admin/logs?{query_string}",
            headers={
                "Accept": "application/json",
                "X-API-Key": admin_key,
                "User-Agent": GW_USER_AGENT,
            },
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())

        if output_json:
            console.print(json.dumps(result, indent=2))
            return

        entries = result.get("data", {}).get("entries", [])
        if not entries:
            console.print("[dim]No audit log entries found.[/dim]")
            return

        table = Table(
            title="Warden Audit Log",
            border_style=GROVE_COLORS["river_cyan"],
        )
        table.add_column("Time", style="dim")
        table.add_column("Agent")
        table.add_column("Service")
        table.add_column("Action")
        table.add_column("Auth", style="dim")
        table.add_column("Result", justify="center")
        table.add_column("Latency", justify="right")

        for entry in entries:
            result_text = entry.get("auth_result", "?")
            result_style = "green" if result_text == "success" else "red"

            # Show event_type if it's not a normal request
            event = entry.get("event_type", "request")
            action_display = entry.get("action", "?")
            if event != "request":
                action_display = f"[yellow]{event}[/yellow]"

            table.add_row(
                entry.get("created_at", "?"),
                entry.get("agent_name") or entry.get("agent_id", "?")[:12],
                entry.get("target_service", "?"),
                action_display,
                entry.get("auth_method", "?"),
                f"[{result_style}]{result_text}[/{result_style}]",
                f"{entry.get('latency_ms', 0)}ms",
            )

        console.print(table)
        console.print(f"\n[dim]Showing {len(entries)} entries[/dim]")

    except SystemExit:
        raise
    except Exception as e:
        console.print(f"[red]Request failed:[/red] {e}")
        raise SystemExit(1)
