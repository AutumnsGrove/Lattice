"""Cache commands - manage KV cache and CDN purge.

Provides commands to list and purge cache entries from KV namespaces
and Cloudflare CDN.
"""

import json
import os
from typing import Any

import click

from ..config import GWConfig
from ..ui import GROVE_COLORS, CozyGroup, console, create_table, error, info, success, warning
from ..wrangler import Wrangler, WranglerError

CACHE_CATEGORIES = {
    "read": (
        "\U0001f4d6 Read (Always Safe)",
        GROVE_COLORS["forest_green"],
        [
            ("list", "List cache keys from KV"),
            ("stats", "Show cache statistics"),
        ],
    ),
    "write": (
        "\u270f\ufe0f  Write (Require --write)",
        GROVE_COLORS["leaf_yellow"],
        [
            ("purge", "Purge cache entries"),
        ],
    ),
}


def parse_wrangler_json(output: str) -> list[dict[str, Any]]:
    """Parse wrangler JSON output."""
    try:
        data = json.loads(output)
        if isinstance(data, list):
            return data
        return []
    except json.JSONDecodeError:
        return []


@click.group(cls=CozyGroup, cozy_categories=CACHE_CATEGORIES)
@click.pass_context
def cache(ctx: click.Context) -> None:
    """Cache management for KV and CDN."""
    pass


@cache.command("list")
@click.argument("tenant", required=False)
@click.option("--all", "-a", "list_all", is_flag=True, help="List all cache keys")
@click.option("--prefix", "-p", help="Filter by key prefix")
@click.option("--limit", "-n", default=100, help="Maximum keys to show (default: 100)")
@click.option(
    "--namespace",
    "--ns",
    default="CACHE_KV",
    help="KV namespace binding name (default: CACHE_KV)",
)
@click.pass_context
def cache_list(
    ctx: click.Context,
    tenant: str | None,
    list_all: bool,
    prefix: str | None,
    limit: int,
    namespace: str,
) -> None:
    """List cache keys from KV.

    Examples:

        gw cache list autumn           # Keys for tenant 'autumn'

        gw cache list --all            # All cache keys

        gw cache list --prefix "page:" # Keys starting with 'page:'
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Build prefix
    if tenant:
        key_prefix = f"cache:{tenant}:"
    elif prefix:
        key_prefix = prefix
    elif list_all:
        key_prefix = ""
    else:
        error("Specify a tenant, --all, or --prefix")
        ctx.exit(1)

    # Get KV namespace ID from config
    ns_config = config.kv_namespaces.get("cache")
    if ns_config:
        ns_id = ns_config.id
    else:
        # Try to use the namespace name directly
        error(f"KV namespace '{namespace}' not found in config")
        ctx.exit(1)

    try:
        args = ["kv:key", "list", "--namespace-id", ns_id]
        if key_prefix:
            args.extend(["--prefix", key_prefix])

        result = wrangler.execute(args, use_json=False)

        # Parse the keys from output (wrangler outputs JSON array)
        try:
            keys = json.loads(result)
        except json.JSONDecodeError:
            keys = []

    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to list keys: {e}")
        ctx.exit(1)

    # Limit results
    if len(keys) > limit:
        keys = keys[:limit]
        truncated = True
    else:
        truncated = False

    if output_json:
        console.print(
            json.dumps(
                {
                    "namespace": namespace,
                    "prefix": key_prefix,
                    "keys": keys,
                    "truncated": truncated,
                },
                indent=2,
            )
        )
        return

    # Human-readable output
    title = f"Cache Keys"
    if tenant:
        title += f" for '{tenant}'"
    elif key_prefix:
        title += f" (prefix: {key_prefix})"

    console.print(f"\n[bold green]{title}[/bold green]\n")

    if not keys:
        info("No cache keys found")
        return

    table = create_table(
        title=f"{len(keys)} Keys" + (" (truncated)" if truncated else "")
    )
    table.add_column("Key", style="cyan", overflow="fold")
    table.add_column("Expiration", style="yellow")

    for key in keys:
        name = key.get("name", "unknown")
        expiration = key.get("expiration")
        if expiration:
            from datetime import datetime

            try:
                exp_dt = datetime.fromtimestamp(expiration)
                exp_str = exp_dt.strftime("%Y-%m-%d %H:%M")
            except (ValueError, OSError):
                exp_str = str(expiration)
        else:
            exp_str = "never"

        table.add_row(name, exp_str)

    console.print(table)


@cache.command("purge")
@click.argument("key", required=False)
@click.option("--tenant", "-t", help="Purge all keys for a tenant")
@click.option("--prefix", "-p", help="Purge keys matching prefix")
@click.option(
    "--cdn", is_flag=True, help="Purge CDN edge cache (requires CF_API_TOKEN)"
)
@click.option(
    "--all", "-a", "purge_all", is_flag=True, help="Purge all (requires confirmation)"
)
@click.option("--yes", "-y", is_flag=True, help="Skip confirmation")
@click.pass_context
def cache_purge(
    ctx: click.Context,
    key: str | None,
    tenant: str | None,
    prefix: str | None,
    cdn: bool,
    purge_all: bool,
    yes: bool,
) -> None:
    """Purge cache entries.

    Examples:

        gw cache purge "cache:autumn:homepage"   # Purge specific key

        gw cache purge --tenant autumn           # Purge all tenant keys

        gw cache purge --cdn autumn.grove.place  # Purge CDN for domain

        gw cache purge --cdn --all               # Full CDN purge (dangerous!)
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # CDN purge
    if cdn:
        _purge_cdn(ctx, key, purge_all, yes)
        return

    # KV purge
    if key:
        keys_to_purge = [key]
    elif tenant:
        # List all keys for tenant first
        keys_to_purge = _list_keys_by_prefix(wrangler, config, f"cache:{tenant}:")
    elif prefix:
        keys_to_purge = _list_keys_by_prefix(wrangler, config, prefix)
    elif purge_all:
        if not yes:
            error("Purging all cache requires --yes flag")
            ctx.exit(1)
        keys_to_purge = _list_keys_by_prefix(wrangler, config, "")
    else:
        error("Specify a key, --tenant, --prefix, or --all")
        ctx.exit(1)

    if not keys_to_purge:
        if output_json:
            console.print(json.dumps({"purged": 0}))
        else:
            info("No keys to purge")
        return

    # Confirm if many keys
    if len(keys_to_purge) > 10 and not yes:
        if not click.confirm(f"Purge {len(keys_to_purge)} keys?"):
            info("Cancelled")
            return

    # Get namespace ID
    ns_config = config.kv_namespaces.get("cache")
    if not ns_config:
        error("Cache KV namespace not configured")
        ctx.exit(1)

    ns_id = ns_config.id
    purged = 0
    errors = []

    for k in keys_to_purge:
        try:
            wrangler.execute(["kv:key", "delete", "--namespace-id", ns_id, k])
            purged += 1
            if not output_json:
                success(f"Purged: {k}")
        except WranglerError as e:
            errors.append({"key": k, "error": str(e)})
            if not output_json:
                error(f"Failed to purge {k}: {e}")

    if output_json:
        console.print(json.dumps({"purged": purged, "errors": errors}, indent=2))
    else:
        console.print()
        success(f"Purged {purged} keys")
        if errors:
            warning(f"{len(errors)} errors occurred")


@cache.command("stats")
@click.pass_context
def cache_stats(ctx: click.Context) -> None:
    """Show cache statistics.

    Displays cache namespace info and key counts.
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    stats = {}

    for alias, ns in config.kv_namespaces.items():
        try:
            result = wrangler.execute(
                ["kv:key", "list", "--namespace-id", ns.id], use_json=False
            )
            keys = json.loads(result)
            stats[alias] = {
                "name": ns.name,
                "id": ns.id,
                "key_count": len(keys),
            }
        except (WranglerError, json.JSONDecodeError):
            stats[alias] = {
                "name": ns.name,
                "id": ns.id,
                "key_count": "?",
            }

    if output_json:
        console.print(json.dumps({"namespaces": stats}, indent=2))
        return

    console.print("\n[bold green]Cache Statistics[/bold green]\n")

    table = create_table(title="KV Namespaces")
    table.add_column("Alias", style="cyan")
    table.add_column("Name", style="magenta")
    table.add_column("Keys", style="green", justify="right")

    for alias, data in stats.items():
        table.add_row(alias, data["name"], str(data["key_count"]))

    console.print(table)


def _list_keys_by_prefix(
    wrangler: Wrangler, config: GWConfig, prefix: str
) -> list[str]:
    """List all keys matching a prefix."""
    ns_config = config.kv_namespaces.get("cache")
    if not ns_config:
        return []

    try:
        args = ["kv:key", "list", "--namespace-id", ns_config.id]
        if prefix:
            args.extend(["--prefix", prefix])

        result = wrangler.execute(args, use_json=False)
        keys = json.loads(result)
        return [k.get("name") for k in keys if k.get("name")]
    except (WranglerError, json.JSONDecodeError):
        return []


def _purge_cdn(ctx: click.Context, url: str | None, purge_all: bool, yes: bool) -> None:
    """Purge Cloudflare CDN cache."""
    import subprocess

    output_json: bool = ctx.obj.get("output_json", False)

    # Check for API token
    api_token = os.environ.get("CF_API_TOKEN")
    zone_id = os.environ.get("CF_ZONE_ID")

    if not api_token:
        if output_json:
            console.print(json.dumps({"error": "CF_API_TOKEN not set"}))
        else:
            error("CF_API_TOKEN environment variable required for CDN purge")
            info("Set CF_API_TOKEN to your Cloudflare API token")
        ctx.exit(1)

    if not zone_id:
        if output_json:
            console.print(json.dumps({"error": "CF_ZONE_ID not set"}))
        else:
            error("CF_ZONE_ID environment variable required for CDN purge")
        ctx.exit(1)

    if purge_all:
        if not yes:
            if not click.confirm("Purge ENTIRE CDN cache? This affects all users."):
                info("Cancelled")
                return

        # Purge everything
        data = {"purge_everything": True}
    elif url:
        # Purge specific URL
        data = {"files": [url]}
    else:
        error("Specify a URL or --all for CDN purge")
        ctx.exit(1)

    # Call Cloudflare API
    try:
        result = subprocess.run(
            [
                "curl",
                "-s",
                "-X",
                "POST",
                f"https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache",
                "-H",
                f"Authorization: Bearer {api_token}",
                "-H",
                "Content-Type: application/json",
                "-d",
                json.dumps(data),
            ],
            capture_output=True,
            text=True,
        )

        response = json.loads(result.stdout)

        if response.get("success"):
            if output_json:
                console.print(json.dumps({"success": True, "purged": url or "all"}))
            else:
                success("CDN cache purged" + (f": {url}" if url else " (all)"))
        else:
            errors = response.get("errors", [])
            error_msg = errors[0].get("message") if errors else "Unknown error"
            if output_json:
                console.print(json.dumps({"success": False, "error": error_msg}))
            else:
                error(f"CDN purge failed: {error_msg}")

    except Exception as e:
        if output_json:
            console.print(json.dumps({"success": False, "error": str(e)}))
        else:
            error(f"CDN purge failed: {e}")
        ctx.exit(1)
