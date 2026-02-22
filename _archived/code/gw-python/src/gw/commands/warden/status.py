"""Warden status command — health check."""

import json

import click
from rich.console import Console
from rich.panel import Panel
from rich.text import Text

from ...ui import GROVE_COLORS

console = Console()

WARDEN_URL = "https://warden.grove.place"


@click.command()
@click.option("--url", default=WARDEN_URL, help="Warden base URL")
@click.pass_context
def status(ctx: click.Context, url: str) -> None:
    """Health check against warden.grove.place.

    Always safe — no --write flag required.

    \\b
    Examples:
        gw warden status
        gw warden status --url http://localhost:8787
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        import urllib.request

        from . import GW_USER_AGENT

        req = urllib.request.Request(
            f"{url}/health",
            headers={"Accept": "application/json", "User-Agent": GW_USER_AGENT},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())

        if output_json:
            console.print(json.dumps(data, indent=2))
            return

        status_color = "green" if data.get("status") == "healthy" else "red"
        services = data.get("services", [])
        version = data.get("version", "unknown")

        text = Text()
        text.append("Status: ", "bold")
        text.append(f"{data.get('status', 'unknown')}\n", f"bold {status_color}")
        text.append("Version: ", "bold")
        text.append(f"{version}\n", "dim")
        text.append("Services: ", "bold")
        text.append(", ".join(services) if services else "none", GROVE_COLORS["river_cyan"])

        console.print(
            Panel(
                text,
                title="\U0001f6e1\ufe0f  Warden Gateway",
                border_style=GROVE_COLORS["forest_green"],
                padding=(1, 2),
            )
        )

    except Exception as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}, indent=2))
            raise SystemExit(1)

        console.print(f"[red]Warden unreachable:[/red] {e}")
        console.print(f"[dim]Tried: {url}/health[/dim]")
        raise SystemExit(1)
