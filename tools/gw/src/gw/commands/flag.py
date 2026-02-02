"""Feature flag commands - manage feature flags via KV."""

import json
from datetime import datetime
from typing import Optional

import click

from ..config import GWConfig
from ..ui import console, create_table, error, info, success, warning
from ..wrangler import Wrangler, WranglerError


# Default flags namespace alias
FLAGS_NAMESPACE = "flags"


@click.group()
@click.pass_context
def flag(ctx: click.Context) -> None:
    """Feature flag operations.

    Manage feature flags stored in KV with safety guards.
    Read operations are always safe. Write operations require --write flag.

    \b
    Examples:
        gw flag list                     # List all flags
        gw flag get dark_mode            # Get flag value
        gw flag enable --write dark_mode # Enable a flag
        gw flag disable --write beta_ui  # Disable a flag
    """
    pass


@flag.command("list")
@click.option("--prefix", "-p", help="Filter flags by prefix")
@click.pass_context
def flag_list(ctx: click.Context, prefix: Optional[str]) -> None:
    """List all feature flags.

    Always safe - no --write flag required.

    \b
    Examples:
        gw flag list
        gw flag list --prefix tenant:
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Resolve flags namespace
    ns_id = _resolve_flags_namespace(config)

    cmd = ["kv:key", "list", "--namespace-id", ns_id]
    if prefix:
        cmd.extend(["--prefix", prefix])

    try:
        result = wrangler.execute(cmd, use_json=True)
        keys = json.loads(result)
    except (WranglerError, json.JSONDecodeError) as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to list flags: {e}")
        return

    # Fetch values for each flag to show status
    flags_data = []
    for key_info in keys:
        key = key_info.get("name", "")
        try:
            value_result = wrangler.execute(["kv:key", "get", "--namespace-id", ns_id, key])
            value = value_result.strip()
            try:
                parsed = json.loads(value)
                flags_data.append({
                    "name": key,
                    "enabled": parsed.get("enabled", False) if isinstance(parsed, dict) else bool(parsed),
                    "value": parsed,
                })
            except json.JSONDecodeError:
                flags_data.append({
                    "name": key,
                    "enabled": value.lower() in ("true", "1", "yes", "on"),
                    "value": value,
                })
        except WranglerError:
            flags_data.append({
                "name": key,
                "enabled": None,
                "value": None,
                "error": "Failed to fetch",
            })

    if output_json:
        console.print(json.dumps({"flags": flags_data}, indent=2))
        return

    console.print("\n[bold green]Feature Flags[/bold green]\n")

    if not flags_data:
        info("No flags found")
        return

    flag_table = create_table(title=f"{len(flags_data)} Flags")
    flag_table.add_column("Flag", style="cyan")
    flag_table.add_column("Status", justify="center")
    flag_table.add_column("Value", style="dim")

    for f in flags_data:
        if f.get("error"):
            status = "[red]?[/red]"
        elif f["enabled"]:
            status = "[green]●[/green] ON"
        else:
            status = "[dim]○[/dim] OFF"

        value_str = ""
        if isinstance(f["value"], dict):
            # Show extra fields beyond 'enabled'
            extras = {k: v for k, v in f["value"].items() if k != "enabled"}
            if extras:
                value_str = json.dumps(extras)[:40]
        elif f["value"] is not None:
            value_str = str(f["value"])[:40]

        flag_table.add_row(f["name"], status, value_str)

    console.print(flag_table)


@flag.command("get")
@click.argument("name")
@click.pass_context
def flag_get(ctx: click.Context, name: str) -> None:
    """Get a feature flag value.

    Always safe - no --write flag required.

    \b
    Examples:
        gw flag get dark_mode
        gw flag get tenant:grove:beta_features
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    ns_id = _resolve_flags_namespace(config)

    try:
        result = wrangler.execute(["kv:key", "get", "--namespace-id", ns_id, name])
        value = result.strip()
    except WranglerError as e:
        if "not found" in str(e).lower():
            if output_json:
                console.print(json.dumps({"name": name, "found": False}))
            else:
                warning(f"Flag '{name}' not found")
            return
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to get flag: {e}")
        return

    # Parse value
    try:
        parsed = json.loads(value)
        enabled = parsed.get("enabled", False) if isinstance(parsed, dict) else bool(parsed)
    except json.JSONDecodeError:
        parsed = value
        enabled = value.lower() in ("true", "1", "yes", "on")

    if output_json:
        console.print(json.dumps({
            "name": name,
            "enabled": enabled,
            "value": parsed,
            "found": True,
        }, indent=2))
        return

    console.print(f"\n[bold green]{name}[/bold green]\n")
    status = "[green]● ENABLED[/green]" if enabled else "[dim]○ DISABLED[/dim]"
    console.print(f"Status: {status}")
    if isinstance(parsed, dict):
        console.print(f"Value: {json.dumps(parsed, indent=2)}")
    else:
        console.print(f"Value: {parsed}")


@flag.command("enable")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("name")
@click.option("--metadata", "-m", help="Additional JSON metadata to store")
@click.pass_context
def flag_enable(
    ctx: click.Context,
    write: bool,
    name: str,
    metadata: Optional[str],
) -> None:
    """Enable a feature flag.

    Requires --write flag.

    \b
    Examples:
        gw flag enable --write dark_mode
        gw flag enable --write beta_ui --metadata '{"rollout": 0.5}'
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    if not write:
        if output_json:
            console.print(json.dumps({"error": "Flag enable requires --write flag"}))
        else:
            error("Flag enable requires --write flag")
            info("Add --write to confirm this operation")
        raise SystemExit(1)

    ns_id = _resolve_flags_namespace(config)

    # Build flag value
    flag_value: dict = {"enabled": True, "updated_at": datetime.utcnow().isoformat()}
    if metadata:
        try:
            extra = json.loads(metadata)
            flag_value.update(extra)
        except json.JSONDecodeError:
            if output_json:
                console.print(json.dumps({"error": "Invalid JSON metadata"}))
            else:
                error("Invalid JSON metadata")
            raise SystemExit(1)

    try:
        wrangler.execute([
            "kv:key", "put", "--namespace-id", ns_id,
            name, json.dumps(flag_value),
        ])
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to enable flag: {e}")
        raise SystemExit(1)

    if output_json:
        console.print(json.dumps({"name": name, "enabled": True, "value": flag_value}))
    else:
        success(f"Enabled flag '{name}'")


@flag.command("disable")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("name")
@click.pass_context
def flag_disable(ctx: click.Context, write: bool, name: str) -> None:
    """Disable a feature flag.

    Requires --write flag.

    \b
    Examples:
        gw flag disable --write beta_ui
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    if not write:
        if output_json:
            console.print(json.dumps({"error": "Flag disable requires --write flag"}))
        else:
            error("Flag disable requires --write flag")
            info("Add --write to confirm this operation")
        raise SystemExit(1)

    ns_id = _resolve_flags_namespace(config)

    flag_value = {"enabled": False, "updated_at": datetime.utcnow().isoformat()}

    try:
        wrangler.execute([
            "kv:key", "put", "--namespace-id", ns_id,
            name, json.dumps(flag_value),
        ])
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to disable flag: {e}")
        raise SystemExit(1)

    if output_json:
        console.print(json.dumps({"name": name, "enabled": False}))
    else:
        success(f"Disabled flag '{name}'")


@flag.command("delete")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--force", is_flag=True, help="Confirm destructive operation")
@click.argument("name")
@click.pass_context
def flag_delete(ctx: click.Context, write: bool, force: bool, name: str) -> None:
    """Delete a feature flag.

    Requires --write --force flags.

    \b
    Examples:
        gw flag delete --write --force old_experiment
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    if not write:
        if output_json:
            console.print(json.dumps({"error": "Flag delete requires --write flag"}))
        else:
            error("Flag delete requires --write flag")
        raise SystemExit(1)

    if not force:
        if output_json:
            console.print(json.dumps({"error": "Flag delete requires --force flag"}))
        else:
            error("Flag delete requires --force flag")
            info("This is a destructive operation")
        raise SystemExit(1)

    ns_id = _resolve_flags_namespace(config)

    try:
        wrangler.execute(["kv:key", "delete", "--namespace-id", ns_id, name])
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to delete flag: {e}")
        raise SystemExit(1)

    if output_json:
        console.print(json.dumps({"name": name, "deleted": True}))
    else:
        success(f"Deleted flag '{name}'")


def _resolve_flags_namespace(config: GWConfig) -> str:
    """Get the flags KV namespace ID."""
    if FLAGS_NAMESPACE in config.kv_namespaces:
        return config.kv_namespaces[FLAGS_NAMESPACE].id
    raise click.ClickException(
        f"Flags namespace '{FLAGS_NAMESPACE}' not configured. "
        "Add it to ~/.grove/gw.toml under [kv_namespaces]"
    )
