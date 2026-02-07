"""Social broadcasting commands - cross-post to Bluesky and more."""

import json
import os
import urllib.request
import urllib.error
from typing import Optional

import click

from ..config import GWConfig
from ..ui import console, create_panel, create_table, error, info, success, warning


ZEPHYR_URL = "https://grove-zephyr.m7jv4v7npb.workers.dev"


def _get_api_key(config: GWConfig) -> Optional[str]:
    """Get Zephyr API key from environment or secrets."""
    # Check environment variable first
    key = os.environ.get("ZEPHYR_API_KEY")
    if key:
        return key

    # Check secrets.json
    secrets_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))),
        "secrets.json",
    )
    try:
        with open(secrets_path) as f:
            secrets = json.load(f)
            return secrets.get("ZEPHYR_API_KEY")
    except (FileNotFoundError, json.JSONDecodeError, KeyError):
        return None


def _zephyr_request(
    endpoint: str,
    api_key: str,
    method: str = "GET",
    data: Optional[dict] = None,
) -> dict:
    """Make an authenticated request to the Zephyr API."""
    url = f"{ZEPHYR_URL}{endpoint}"
    headers = {
        "X-API-Key": api_key,
        "Content-Type": "application/json",
    }

    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode("utf-8"))
            return body
        except (json.JSONDecodeError, UnicodeDecodeError):
            raise click.ClickException(f"API error: HTTP {e.code}")
    except urllib.error.URLError as e:
        raise click.ClickException(f"Connection failed: {e.reason}")


@click.group()
@click.pass_context
def social(ctx: click.Context) -> None:
    """Social cross-posting via Zephyr.

    Scatter your content on the wind — post to Bluesky (and more, soon).

    \\b
    Examples:
        gw social post --write "Hello from the grove!"
        gw social status
        gw social history
    """
    pass


@social.command("post")
@click.argument("content", required=True)
@click.option("--write", is_flag=True, help="Confirm posting (required)")
@click.option(
    "--platform",
    "-p",
    multiple=True,
    default=["bluesky"],
    help="Target platform (default: bluesky)",
)
@click.pass_context
def social_post(
    ctx: click.Context,
    content: str,
    write: bool,
    platform: tuple,
) -> None:
    """Post content to social platforms.

    Requires --write flag.

    \\b
    Examples:
        gw social post --write "Just shipped cross-posting!"
        gw social post --write --platform bluesky "Hello world"
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)

    if not write:
        if output_json:
            console.print(json.dumps({"error": "Social post requires --write flag"}))
        else:
            error("Social post requires --write flag")
            info("Add --write to send the post")
        raise SystemExit(1)

    api_key = _get_api_key(config)
    if not api_key:
        if output_json:
            console.print(json.dumps({"error": "ZEPHYR_API_KEY not found"}))
        else:
            error("ZEPHYR_API_KEY not found")
            info("Set ZEPHYR_API_KEY environment variable or add to secrets.json")
        raise SystemExit(1)

    platforms = list(platform)

    if not output_json:
        console.print(f"\n[dim]Posting to {', '.join(platforms)}...[/dim]")

    result = _zephyr_request(
        "/broadcast",
        api_key,
        method="POST",
        data={
            "channel": "social",
            "content": content,
            "platforms": platforms,
            "metadata": {
                "source": "gw-cli",
                "tenant": "grove",
            },
        },
    )

    if output_json:
        console.print(json.dumps(result, indent=2))
        return

    # Pretty print results
    if result.get("success"):
        success("Posted successfully!")
        for delivery in result.get("deliveries", []):
            if delivery.get("success"):
                url = delivery.get("postUrl", "")
                console.print(f"  [green]●[/green] {delivery['platform']}: {url}")
            else:
                err_msg = delivery.get("error", {}).get("message", "Unknown error")
                console.print(f"  [red]●[/red] {delivery['platform']}: {err_msg}")

        broadcast_id = result.get("metadata", {}).get("broadcastId", "")
        latency = result.get("metadata", {}).get("latencyMs", 0)
        console.print(f"\n[dim]Broadcast: {broadcast_id} ({latency}ms)[/dim]")
    elif result.get("partial"):
        warning("Partially delivered")
        for delivery in result.get("deliveries", []):
            if delivery.get("success"):
                url = delivery.get("postUrl", "")
                console.print(f"  [green]●[/green] {delivery['platform']}: {url}")
            else:
                err_msg = delivery.get("error", {}).get("message", "Unknown error")
                console.print(f"  [red]●[/red] {delivery['platform']}: {err_msg}")
    else:
        error("Delivery failed")
        error_msg = result.get("errorMessage", "")
        if error_msg:
            console.print(f"  [dim]{error_msg}[/dim]")
        for delivery in result.get("deliveries", []):
            if not delivery.get("success"):
                err_msg = delivery.get("error", {}).get("message", "Unknown error")
                console.print(f"  [red]●[/red] {delivery['platform']}: {err_msg}")


@social.command("status")
@click.pass_context
def social_status(ctx: click.Context) -> None:
    """Show platform status and health.

    Always safe — no --write flag required.

    \\b
    Examples:
        gw social status
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)

    api_key = _get_api_key(config)
    if not api_key:
        if output_json:
            console.print(json.dumps({"error": "ZEPHYR_API_KEY not found"}))
        else:
            error("ZEPHYR_API_KEY not found")
            info("Set ZEPHYR_API_KEY environment variable or add to secrets.json")
        raise SystemExit(1)

    result = _zephyr_request("/broadcast/platforms", api_key)

    if output_json:
        console.print(json.dumps(result, indent=2))
        return

    console.print("\n[bold green]Social Platforms[/bold green]\n")

    table = create_table()
    table.add_column("Platform", style="cyan")
    table.add_column("Configured", justify="center")
    table.add_column("Health", justify="center")
    table.add_column("Notes")

    for p in result.get("platforms", []):
        name = p.get("name", p.get("id", "?"))
        configured = "[green]●[/green] Yes" if p.get("configured") else "[dim]○[/dim] No"
        healthy = "[green]●[/green] OK" if p.get("healthy") else "[dim]○[/dim] Down"

        notes = ""
        if p.get("comingSoon"):
            configured = "[dim]—[/dim]"
            healthy = "[dim]—[/dim]"
            notes = "[dim]Coming soon[/dim]"
        elif p.get("circuitBreaker", {}).get("open"):
            healthy = "[red]●[/red] Circuit open"

        table.add_row(name, configured, healthy, notes)

    console.print(table)


@social.command("history")
@click.option("--limit", "-n", default=10, help="Number of recent posts")
@click.pass_context
def social_history(ctx: click.Context, limit: int) -> None:
    """Show recent broadcast history.

    Always safe — no --write flag required.

    \\b
    Examples:
        gw social history
        gw social history -n 20
    """
    output_json: bool = ctx.obj.get("output_json", False)

    # History requires D1 access — not available from CLI without wrangler
    # For now, show a helpful message
    if output_json:
        console.print(json.dumps({
            "note": "Broadcast history requires direct D1 access",
            "suggestion": "View history at /arbor/zephyr in the admin dashboard",
        }))
    else:
        info("Broadcast history is available in the admin dashboard")
        console.print("  [dim]Visit:[/dim] [cyan]grove.place/arbor/zephyr[/cyan]")
        console.print()
        console.print("[dim]Direct CLI history requires a dedicated API endpoint (coming soon).[/dim]")


@social.command("setup")
@click.pass_context
def social_setup(ctx: click.Context) -> None:
    """Show setup instructions for social platforms.

    \\b
    Examples:
        gw social setup
    """
    output_json: bool = ctx.obj.get("output_json", False)

    if output_json:
        console.print(json.dumps({
            "platforms": {
                "bluesky": {
                    "steps": [
                        "Go to bsky.app → Settings → App Passwords",
                        "Create a new app password (name it grove-zephyr)",
                        "Copy the generated password",
                        "Run: wrangler secret put BLUESKY_HANDLE",
                        "Run: wrangler secret put BLUESKY_APP_PASSWORD",
                    ]
                }
            }
        }))
        return

    panel_content = (
        "[bold cyan]Bluesky Setup[/bold cyan]\n\n"
        "1. Go to [link=https://bsky.app]bsky.app[/link] → Settings → App Passwords\n"
        '2. Create a new app password (name it "grove-zephyr")\n'
        "3. Copy the generated password\n"
        "4. Set the secrets:\n"
        "   [dim]wrangler secret put BLUESKY_HANDLE[/dim]\n"
        "     → e.g. autumn.bsky.social\n"
        "   [dim]wrangler secret put BLUESKY_APP_PASSWORD[/dim]\n"
        "     → paste the generated password\n\n"
        "5. Test it:\n"
        '   [green]gw social post --write "Hello from Grove!"[/green]\n\n'
        "[dim]Mastodon and DEV.to support coming soon.[/dim]"
    )

    console.print()
    console.print(create_panel(panel_content, title="Social Platform Setup"))
    console.print()
