"""Warden agent management commands."""

import json

import click
from rich.console import Console
from rich.table import Table

from ...ui import GROVE_COLORS

console = Console()

WARDEN_URL = "https://warden.grove.place"


@click.group()
def agent() -> None:
    """Agent registration and management."""
    pass


@agent.command("register")
@click.option("--write", is_flag=True, required=True, help="Confirm write operation")
@click.option("--name", required=True, help="Agent display name")
@click.option("--owner", required=True, help="Agent owner (tenant or admin)")
@click.option(
    "--scope",
    "scopes",
    multiple=True,
    default=["github:read", "tavily:read"],
    help="Permission scopes (repeatable)",
)
@click.option("--rpm", default=60, help="Rate limit: requests per minute")
@click.option("--daily", default=1000, help="Rate limit: requests per day")
@click.option("--url", default=WARDEN_URL, help="Warden base URL")
@click.option("--admin-key", envvar="WARDEN_ADMIN_KEY", help="Admin API key")
@click.pass_context
def register(
    ctx: click.Context,
    write: bool,
    name: str,
    owner: str,
    scopes: tuple[str, ...],
    rpm: int,
    daily: int,
    url: str,
    admin_key: str,
) -> None:
    """Register a new Warden agent.

    Creates an agent and returns a one-time secret. Store it securely.
    Requires --write flag and admin API key.

    \\b
    Examples:
        gw warden agent register --write --name "grove-bot" --owner "autumn"
        gw warden agent register --write --name "ci-agent" --owner "ci" --scope "github:*"
    """
    output_json = ctx.obj.get("output_json", False)

    if not admin_key:
        console.print("[red]Admin key required.[/red] Set WARDEN_ADMIN_KEY or pass --admin-key")
        raise SystemExit(1)

    payload = {
        "name": name,
        "owner": owner,
        "scopes": list(scopes),
        "rate_limit_rpm": rpm,
        "rate_limit_daily": daily,
    }

    try:
        import urllib.request

        from . import GW_USER_AGENT

        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            f"{url}/admin/agents",
            data=data,
            headers={
                "Content-Type": "application/json",
                "X-API-Key": admin_key,
                "User-Agent": GW_USER_AGENT,
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())

        if output_json:
            console.print(json.dumps(result, indent=2))
            return

        if result.get("success"):
            agent_data = result["data"]
            console.print(f"\n[green]\u2713 Agent registered[/green]")
            console.print(f"  ID:     [bold]{agent_data['id']}[/bold]")
            console.print(f"  Name:   {agent_data['name']}")
            console.print(f"  Owner:  {agent_data['owner']}")
            console.print(f"  Scopes: {', '.join(agent_data['scopes'])}")
            console.print(f"\n  [yellow]Secret (save this — shown once):[/yellow]")
            console.print(f"  [bold]{agent_data['secret']}[/bold]\n")
        else:
            error = result.get("error", {})
            console.print(f"[red]Registration failed:[/red] {error.get('message', 'Unknown error')}")
            raise SystemExit(1)

    except SystemExit:
        raise
    except Exception as e:
        console.print(f"[red]Request failed:[/red] {e}")
        raise SystemExit(1)


@agent.command("list")
@click.option("--url", default=WARDEN_URL, help="Warden base URL")
@click.option("--admin-key", envvar="WARDEN_ADMIN_KEY", help="Admin API key")
@click.pass_context
def list_agents(ctx: click.Context, url: str, admin_key: str) -> None:
    """List all registered agents.

    Always safe — no --write flag required.

    \\b
    Examples:
        gw warden agent list
    """
    output_json = ctx.obj.get("output_json", False)

    if not admin_key:
        console.print("[red]Admin key required.[/red] Set WARDEN_ADMIN_KEY or pass --admin-key")
        raise SystemExit(1)

    try:
        import urllib.request

        from . import GW_USER_AGENT

        req = urllib.request.Request(
            f"{url}/admin/agents",
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

        agents = result.get("data", {}).get("agents", [])
        if not agents:
            console.print("[dim]No agents registered.[/dim]")
            return

        table = Table(
            title="Warden Agents",
            border_style=GROVE_COLORS["forest_green"],
        )
        table.add_column("ID", style="bold")
        table.add_column("Name")
        table.add_column("Owner")
        table.add_column("Scopes", style="dim")
        table.add_column("Enabled", justify="center")
        table.add_column("Requests", justify="right")
        table.add_column("Last Used", style="dim")

        for a in agents:
            enabled_style = "green" if a.get("enabled") else "red"
            enabled_text = "\u2713" if a.get("enabled") else "\u2717"
            scopes_text = ", ".join(a.get("scopes", []))
            table.add_row(
                a["id"][:16] + "...",
                a["name"],
                a["owner"],
                scopes_text[:40],
                f"[{enabled_style}]{enabled_text}[/{enabled_style}]",
                str(a.get("request_count", 0)),
                a.get("last_used_at") or "never",
            )

        console.print(table)

    except SystemExit:
        raise
    except Exception as e:
        console.print(f"[red]Request failed:[/red] {e}")
        raise SystemExit(1)


@agent.command("revoke")
@click.option("--write", is_flag=True, required=True, help="Confirm write operation")
@click.argument("agent_id")
@click.option("--url", default=WARDEN_URL, help="Warden base URL")
@click.option("--admin-key", envvar="WARDEN_ADMIN_KEY", help="Admin API key")
@click.pass_context
def revoke(
    ctx: click.Context,
    write: bool,
    agent_id: str,
    url: str,
    admin_key: str,
) -> None:
    """Revoke (disable) an agent.

    The agent will be disabled immediately. Requires --write flag.

    \\b
    Examples:
        gw warden agent revoke --write wdn_abc123...
    """
    output_json = ctx.obj.get("output_json", False)

    if not admin_key:
        console.print("[red]Admin key required.[/red] Set WARDEN_ADMIN_KEY or pass --admin-key")
        raise SystemExit(1)

    if not output_json:
        if not click.confirm(f"Revoke agent {agent_id}?"):
            console.print("[dim]Cancelled.[/dim]")
            return

    try:
        import urllib.request

        from . import GW_USER_AGENT

        req = urllib.request.Request(
            f"{url}/admin/agents/{agent_id}",
            headers={"X-API-Key": admin_key, "User-Agent": GW_USER_AGENT},
            method="DELETE",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())

        if output_json:
            console.print(json.dumps(result, indent=2))
            return

        if result.get("success"):
            console.print(f"[green]\u2713 Agent {agent_id} revoked[/green]")
        else:
            error = result.get("error", {})
            console.print(f"[red]Revocation failed:[/red] {error.get('message', 'Unknown error')}")
            raise SystemExit(1)

    except SystemExit:
        raise
    except Exception as e:
        console.print(f"[red]Request failed:[/red] {e}")
        raise SystemExit(1)
