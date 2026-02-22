"""Warden test command — connectivity test through the gateway."""

import json

import click
from rich.console import Console

from ...ui import GROVE_COLORS

console = Console()

WARDEN_URL = "https://warden.grove.place"

# Minimal test payloads for each service
TEST_PAYLOADS = {
    "github": {
        "service": "github",
        "action": "list_repos",
        "params": {"owner": "AutumnsGrove", "per_page": 1},
    },
    "tavily": {
        "service": "tavily",
        "action": "search",
        "params": {"query": "grove place blog", "max_results": 1},
    },
}


@click.command("test")
@click.argument("service", type=click.Choice(["github", "tavily"]))
@click.option("--url", default=WARDEN_URL, help="Warden base URL")
@click.option("--api-key", envvar="WARDEN_API_KEY", help="Agent API key")
@click.pass_context
def test_service(ctx: click.Context, service: str, url: str, api_key: str) -> None:
    """Test connectivity through Warden for a specific service.

    Requires a valid agent API key (set WARDEN_API_KEY or pass --api-key).

    \\b
    Examples:
        gw warden test github
        gw warden test tavily --api-key wdn_sk_...
    """
    output_json = ctx.obj.get("output_json", False)

    if not api_key:
        console.print("[red]API key required.[/red] Set WARDEN_API_KEY or pass --api-key")
        raise SystemExit(1)

    payload = TEST_PAYLOADS.get(service)
    if not payload:
        console.print(f"[red]Unknown service:[/red] {service}")
        raise SystemExit(1)

    try:
        import urllib.request

        from . import GW_USER_AGENT

        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            f"{url}/request",
            data=data,
            headers={
                "Content-Type": "application/json",
                "X-API-Key": api_key,
                "User-Agent": GW_USER_AGENT,
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode())

        if output_json:
            console.print(json.dumps(result, indent=2))
            return

        if result.get("success"):
            latency = result.get("meta", {}).get("latencyMs", "?")
            console.print(
                f"[{GROVE_COLORS['forest_green']}]\u2713[/{GROVE_COLORS['forest_green']}] "
                f"{service} — [green]OK[/green] ({latency}ms)"
            )
        else:
            error = result.get("error", {})
            console.print(
                f"[red]\u2717[/red] {service} — "
                f"[red]{error.get('code', 'UNKNOWN')}[/red]: {error.get('message', 'No details')}"
            )
            raise SystemExit(1)

    except SystemExit:
        raise
    except Exception as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}, indent=2))
        else:
            console.print(f"[red]Request failed:[/red] {e}")
        raise SystemExit(1)
