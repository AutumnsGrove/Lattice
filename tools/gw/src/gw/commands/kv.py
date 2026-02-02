"""KV namespace commands - manage Cloudflare Workers KV."""

import json
from typing import Any, Optional

import click

from ..config import GWConfig
from ..ui import console, create_panel, create_table, error, info, success, warning
from ..wrangler import Wrangler, WranglerError


@click.group()
@click.pass_context
def kv(ctx: click.Context) -> None:
    """KV namespace operations.

    Manage Cloudflare Workers KV key-value storage with safety guards.
    Read operations are always safe. Write operations require --write flag.

    \b
    Examples:
        gw kv list                    # List all namespaces
        gw kv keys cache              # List keys in 'cache' namespace
        gw kv get cache session:123   # Get a key
        gw kv put --write cache key value  # Set a key
    """
    pass


@kv.command("list")
@click.pass_context
def kv_list(ctx: click.Context) -> None:
    """List all KV namespaces.

    Shows both configured namespace aliases and all namespaces in your
    Cloudflare account.

    \b
    Examples:
        gw kv list
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    try:
        result = wrangler.execute(["kv:namespace", "list"], use_json=True)
        remote_namespaces = json.loads(result)
    except (WranglerError, json.JSONDecodeError) as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to list namespaces: {e}")
        return

    if output_json:
        output_data = {
            "configured": {
                alias: {"name": ns.name, "id": ns.id}
                for alias, ns in config.kv_namespaces.items()
            },
            "remote": remote_namespaces,
        }
        console.print(json.dumps(output_data, indent=2))
        return

    # Human-readable output
    console.print("\n[bold green]KV Namespaces[/bold green]\n")

    # Configured aliases
    if config.kv_namespaces:
        alias_table = create_table(title="Configured Aliases")
        alias_table.add_column("Alias", style="cyan")
        alias_table.add_column("Name", style="magenta")
        alias_table.add_column("ID", style="yellow")

        for alias, ns_info in config.kv_namespaces.items():
            alias_table.add_row(alias, ns_info.name, ns_info.id[:12] + "...")

        console.print(alias_table)
        console.print()

    # Remote namespaces
    if remote_namespaces:
        remote_table = create_table(title="Cloudflare KV Namespaces")
        remote_table.add_column("Title", style="cyan")
        remote_table.add_column("ID", style="yellow")

        for ns in remote_namespaces:
            remote_table.add_row(
                ns.get("title", "unknown"),
                ns.get("id", "unknown")[:12] + "...",
            )

        console.print(remote_table)


@kv.command("keys")
@click.argument("namespace")
@click.option("--prefix", "-p", help="Filter keys by prefix")
@click.option("--limit", "-n", default=100, help="Maximum keys to return (default: 100)")
@click.pass_context
def kv_keys(
    ctx: click.Context,
    namespace: str,
    prefix: Optional[str],
    limit: int,
) -> None:
    """List keys in a namespace.

    \b
    Examples:
        gw kv keys cache
        gw kv keys cache --prefix session:
        gw kv keys flags --limit 50
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Resolve namespace
    ns_id = _resolve_namespace(config, namespace)

    cmd = ["kv:key", "list", "--namespace-id", ns_id]
    if prefix:
        cmd.extend(["--prefix", prefix])

    try:
        result = wrangler.execute(cmd, use_json=True)
        keys = json.loads(result)
        # Apply limit
        keys = keys[:limit] if len(keys) > limit else keys
    except (WranglerError, json.JSONDecodeError) as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to list keys: {e}")
        return

    if output_json:
        console.print(json.dumps({"namespace": namespace, "keys": keys}, indent=2))
        return

    # Human-readable output
    console.print(f"\n[bold green]Keys in {namespace}[/bold green]\n")

    if not keys:
        info("No keys found")
        return

    keys_table = create_table(title=f"{len(keys)} Keys")
    keys_table.add_column("Name", style="cyan")
    keys_table.add_column("Expiration", style="yellow")
    keys_table.add_column("Metadata", style="dim")

    for key in keys:
        expiration = key.get("expiration")
        exp_str = str(expiration) if expiration else "-"
        metadata = key.get("metadata")
        meta_str = json.dumps(metadata)[:30] + "..." if metadata else "-"
        keys_table.add_row(key.get("name", "unknown"), exp_str, meta_str)

    console.print(keys_table)


@kv.command("get")
@click.argument("namespace")
@click.argument("key")
@click.pass_context
def kv_get(ctx: click.Context, namespace: str, key: str) -> None:
    """Get a value from KV.

    Always safe - no --write flag required.

    \b
    Examples:
        gw kv get cache session:abc123
        gw kv get flags feature_enabled
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Resolve namespace
    ns_id = _resolve_namespace(config, namespace)

    try:
        result = wrangler.execute(["kv:key", "get", "--namespace-id", ns_id, key])
        value = result.strip()
    except WranglerError as e:
        if "key not found" in str(e).lower() or "could not find" in str(e).lower():
            if output_json:
                console.print(json.dumps({"key": key, "value": None, "found": False}))
            else:
                warning(f"Key '{key}' not found in {namespace}")
            return
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to get key: {e}")
        return

    if output_json:
        # Try to parse as JSON if possible
        try:
            parsed = json.loads(value)
            console.print(json.dumps({"key": key, "value": parsed, "found": True}, indent=2))
        except json.JSONDecodeError:
            console.print(json.dumps({"key": key, "value": value, "found": True}, indent=2))
        return

    # Human-readable output
    console.print(f"\n[bold green]{key}[/bold green]\n")

    # Try to pretty-print JSON
    try:
        parsed = json.loads(value)
        console.print(json.dumps(parsed, indent=2))
    except json.JSONDecodeError:
        console.print(value)


@kv.command("put")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("namespace")
@click.argument("key")
@click.argument("value")
@click.option("--ttl", type=int, help="TTL in seconds")
@click.option("--expiration", type=int, help="Expiration timestamp (Unix)")
@click.option("--metadata", "-m", help="JSON metadata to attach")
@click.pass_context
def kv_put(
    ctx: click.Context,
    write: bool,
    namespace: str,
    key: str,
    value: str,
    ttl: Optional[int],
    expiration: Optional[int],
    metadata: Optional[str],
) -> None:
    """Set a value in KV.

    Requires --write flag.

    \b
    Examples:
        gw kv put --write cache session:123 '{"user": "autumn"}'
        gw kv put --write cache temp_key "value" --ttl 3600
        gw kv put --write flags feature '{"enabled": true}' --metadata '{"version": 1}'
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    if not write:
        if output_json:
            console.print(json.dumps({"error": "KV put requires --write flag"}))
        else:
            error("KV put requires --write flag")
            info("Add --write to confirm this operation")
        raise SystemExit(1)

    # Resolve namespace
    ns_id = _resolve_namespace(config, namespace)

    cmd = ["kv:key", "put", "--namespace-id", ns_id, key, value]
    if ttl:
        cmd.extend(["--ttl", str(ttl)])
    if expiration:
        cmd.extend(["--expiration", str(expiration)])
    if metadata:
        cmd.extend(["--metadata", metadata])

    try:
        wrangler.execute(cmd)
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to put key: {e}")
        raise SystemExit(1)

    if output_json:
        console.print(json.dumps({"key": key, "namespace": namespace, "written": True}))
    else:
        success(f"Written '{key}' to {namespace}")


@kv.command("delete")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("namespace")
@click.argument("key")
@click.pass_context
def kv_delete(ctx: click.Context, write: bool, namespace: str, key: str) -> None:
    """Delete a key from KV.

    Requires --write flag.

    \b
    Examples:
        gw kv delete --write cache session:expired
        gw kv delete --write flags old_feature
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    if not write:
        if output_json:
            console.print(json.dumps({"error": "KV delete requires --write flag"}))
        else:
            error("KV delete requires --write flag")
            info("Add --write to confirm this operation")
        raise SystemExit(1)

    # Resolve namespace
    ns_id = _resolve_namespace(config, namespace)

    try:
        wrangler.execute(["kv:key", "delete", "--namespace-id", ns_id, key])
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to delete key: {e}")
        raise SystemExit(1)

    if output_json:
        console.print(json.dumps({"key": key, "namespace": namespace, "deleted": True}))
    else:
        success(f"Deleted '{key}' from {namespace}")


def _resolve_namespace(config: GWConfig, namespace: str) -> str:
    """Resolve namespace alias to actual ID."""
    if namespace in config.kv_namespaces:
        return config.kv_namespaces[namespace].id
    # Assume it's a raw namespace ID
    return namespace
