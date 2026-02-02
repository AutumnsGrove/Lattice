"""Backup commands - manage D1 database backups."""

import json
from typing import Optional

import click
from rich.prompt import Confirm

from ..config import GWConfig
from ..ui import console, create_table, error, info, success, warning
from ..wrangler import Wrangler, WranglerError


@click.group()
@click.pass_context
def backup(ctx: click.Context) -> None:
    """D1 database backup operations.

    Create, list, and restore database backups with safety guards.
    Create and restore operations require --write flag.

    \b
    Examples:
        gw backup list                       # List backups
        gw backup create --write             # Create backup
        gw backup restore --write --force ID # Restore backup
    """
    pass


@backup.command("list")
@click.option(
    "--db", "-d", "database",
    default="lattice",
    help="Database alias or name (default: lattice)",
)
@click.pass_context
def backup_list(ctx: click.Context, database: str) -> None:
    """List available backups.

    Always safe - no --write flag required.

    \b
    Examples:
        gw backup list
        gw backup list --db groveauth
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    db_name = _resolve_database(config, database)

    try:
        result = wrangler.execute(["d1", "backup", "list", db_name], use_json=True)
        backups = json.loads(result)
    except (WranglerError, json.JSONDecodeError) as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to list backups: {e}")
        return

    if output_json:
        console.print(json.dumps({"database": db_name, "backups": backups}, indent=2))
        return

    console.print(f"\n[bold green]Backups for {db_name}[/bold green]\n")

    if not backups:
        info("No backups found")
        console.print("[dim]Create one with: gw backup create --write[/dim]")
        return

    backup_table = create_table(title=f"{len(backups)} Backups")
    backup_table.add_column("ID", style="cyan")
    backup_table.add_column("Created", style="yellow")
    backup_table.add_column("State", style="green")
    backup_table.add_column("Size", style="magenta", justify="right")

    for b in backups:
        backup_id = b.get("id", "unknown")
        created = b.get("created_at", "-")
        if created and len(created) > 19:
            created = created[:19].replace("T", " ")
        state = b.get("state", "unknown")
        state_style = "green" if state == "complete" else "yellow"

        size_bytes = b.get("file_size", 0)
        size_str = _format_size(size_bytes)

        backup_table.add_row(
            backup_id[:12] + "..." if len(backup_id) > 12 else backup_id,
            created,
            f"[{state_style}]{state}[/{state_style}]",
            size_str,
        )

    console.print(backup_table)


@backup.command("create")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option(
    "--db", "-d", "database",
    default="lattice",
    help="Database alias or name (default: lattice)",
)
@click.pass_context
def backup_create(ctx: click.Context, write: bool, database: str) -> None:
    """Create a database backup.

    Requires --write flag.

    \b
    Examples:
        gw backup create --write
        gw backup create --write --db groveauth
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    if not write:
        if output_json:
            console.print(json.dumps({"error": "Backup create requires --write flag"}))
        else:
            error("Backup create requires --write flag")
            info("Add --write to confirm this operation")
        raise SystemExit(1)

    db_name = _resolve_database(config, database)

    if not output_json:
        console.print(f"[dim]Creating backup of {db_name}...[/dim]")

    try:
        result = wrangler.execute(["d1", "backup", "create", db_name], use_json=True)
        backup_data = json.loads(result)
    except (WranglerError, json.JSONDecodeError) as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to create backup: {e}")
        raise SystemExit(1)

    if output_json:
        console.print(json.dumps({"database": db_name, "backup": backup_data}, indent=2))
    else:
        backup_id = backup_data.get("id", "unknown") if isinstance(backup_data, dict) else str(backup_data)
        success(f"Created backup: {backup_id}")


@backup.command("restore")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--force", is_flag=True, help="Confirm destructive operation")
@click.argument("backup_id")
@click.option(
    "--db", "-d", "database",
    default="lattice",
    help="Database alias or name (default: lattice)",
)
@click.pass_context
def backup_restore(
    ctx: click.Context,
    write: bool,
    force: bool,
    backup_id: str,
    database: str,
) -> None:
    """Restore a database from backup.

    Requires --write --force flags. This is a destructive operation
    that will overwrite current database contents.

    \b
    Examples:
        gw backup restore --write --force abc123def456
        gw backup restore --write --force abc123def456 --db groveauth
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    if not write:
        if output_json:
            console.print(json.dumps({"error": "Backup restore requires --write flag"}))
        else:
            error("Backup restore requires --write flag")
        raise SystemExit(1)

    if not force:
        if output_json:
            console.print(json.dumps({"error": "Backup restore requires --force flag (destructive operation)"}))
        else:
            error("Backup restore requires --force flag")
            warning("This will overwrite all current data!")
        raise SystemExit(1)

    db_name = _resolve_database(config, database)

    # Extra confirmation for non-JSON mode
    if not output_json:
        console.print(f"\n[yellow]⚠️  Warning: This will restore {db_name} from backup {backup_id}[/yellow]")
        console.print("[yellow]All current data will be replaced![/yellow]\n")
        if not Confirm.ask("Are you sure you want to continue?", default=False):
            console.print("[dim]Aborted[/dim]")
            raise SystemExit(0)

    try:
        result = wrangler.execute(["d1", "backup", "restore", db_name, backup_id])
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to restore backup: {e}")
        raise SystemExit(1)

    if output_json:
        console.print(json.dumps({
            "database": db_name,
            "backup_id": backup_id,
            "restored": True,
        }))
    else:
        success(f"Restored {db_name} from backup {backup_id}")


@backup.command("download")
@click.argument("backup_id")
@click.option(
    "--db", "-d", "database",
    default="lattice",
    help="Database alias or name (default: lattice)",
)
@click.option("--output", "-o", help="Output file path")
@click.pass_context
def backup_download(
    ctx: click.Context,
    backup_id: str,
    database: str,
    output: Optional[str],
) -> None:
    """Download a backup file locally.

    Always safe - no --write flag required.

    \b
    Examples:
        gw backup download abc123def456
        gw backup download abc123def456 --output backup.sql
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    db_name = _resolve_database(config, database)
    output_file = output or f"{db_name}-{backup_id[:8]}.sql"

    try:
        result = wrangler.execute([
            "d1", "backup", "download", db_name, backup_id,
            "--output", output_file,
        ])
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to download backup: {e}")
        raise SystemExit(1)

    if output_json:
        console.print(json.dumps({
            "database": db_name,
            "backup_id": backup_id,
            "file": output_file,
        }))
    else:
        success(f"Downloaded backup to {output_file}")


def _resolve_database(config: GWConfig, database: str) -> str:
    """Resolve database alias to actual name."""
    if database in config.databases:
        return config.databases[database].name
    return database


def _format_size(size_bytes: int) -> str:
    """Format a size in bytes to human-readable."""
    if size_bytes >= 1024 * 1024:
        return f"{size_bytes / 1024 / 1024:.1f} MB"
    if size_bytes >= 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes} B"
