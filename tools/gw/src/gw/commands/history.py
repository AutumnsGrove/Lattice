"""Command history - track and re-run previous commands."""

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import click

from ..ui import console, create_table, error, info, success, warning


# History database path
HISTORY_DB = Path.home() / ".grove" / "gw_history.db"


def _init_db() -> sqlite3.Connection:
    """Initialize the history database."""
    HISTORY_DB.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(HISTORY_DB)
    conn.row_factory = sqlite3.Row

    conn.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            command TEXT NOT NULL,
            args TEXT,
            is_write BOOLEAN DEFAULT 0,
            exit_code INTEGER,
            duration_ms INTEGER
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_history_timestamp
        ON history(timestamp DESC)
    """)
    conn.commit()

    return conn


def record_command(
    command: str,
    args: list[str],
    is_write: bool = False,
    exit_code: int = 0,
    duration_ms: int = 0,
) -> None:
    """Record a command to history."""
    try:
        conn = _init_db()
        conn.execute(
            """
            INSERT INTO history (timestamp, command, args, is_write, exit_code, duration_ms)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.now().isoformat(),
                command,
                json.dumps(args),
                is_write,
                exit_code,
                duration_ms,
            ),
        )
        conn.commit()
        conn.close()
    except sqlite3.Error:
        # Silently fail - history is not critical
        pass


@click.group(invoke_without_command=True)
@click.pass_context
def history(ctx: click.Context) -> None:
    """View and manage command history.

    Track previous commands and re-run them easily.

    \b
    Examples:
        gw history                # Show recent commands
        gw history --writes       # Show only write operations
        gw history search cache   # Search history
        gw history run 5          # Re-run command #5
        gw history clear          # Clear history
    """
    if ctx.invoked_subcommand is None:
        ctx.invoke(history_list)


@history.command("list")
@click.option("--limit", "-n", default=20, help="Number of entries to show")
@click.option("--writes", "-w", is_flag=True, help="Show only write operations")
@click.option("--all", "show_all", is_flag=True, help="Show all entries")
@click.pass_context
def history_list(
    ctx: click.Context,
    limit: int,
    writes: bool,
    show_all: bool,
) -> None:
    """Show command history.

    \b
    Examples:
        gw history list            # Show last 20 commands
        gw history list -n 50      # Show last 50
        gw history list --writes   # Only write operations
        gw history list --all      # Show everything
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        conn = _init_db()
        query = "SELECT * FROM history"
        params: list[Any] = []

        if writes:
            query += " WHERE is_write = 1"

        query += " ORDER BY timestamp DESC"

        if not show_all:
            query += " LIMIT ?"
            params.append(limit)

        cursor = conn.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
    except sqlite3.Error as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to read history: {e}")
        ctx.exit(1)

    if output_json:
        entries = [
            {
                "id": row["id"],
                "timestamp": row["timestamp"],
                "command": row["command"],
                "args": json.loads(row["args"]) if row["args"] else [],
                "is_write": bool(row["is_write"]),
                "exit_code": row["exit_code"],
            }
            for row in rows
        ]
        console.print(json.dumps({"history": entries}, indent=2))
        return

    if not rows:
        info("No command history found")
        return

    console.print("\n[bold green]Command History[/bold green]\n")

    table = create_table()
    table.add_column("ID", style="dim", justify="right")
    table.add_column("Timestamp", style="yellow")
    table.add_column("Command", style="cyan")
    table.add_column("Write", justify="center")
    table.add_column("Exit", justify="center")

    for row in rows:
        # Parse timestamp
        try:
            dt = datetime.fromisoformat(row["timestamp"])
            ts_str = dt.strftime("%Y-%m-%d %H:%M")
        except (ValueError, TypeError):
            ts_str = row["timestamp"][:16]

        # Build command string
        args = json.loads(row["args"]) if row["args"] else []
        cmd_str = f"gw {row['command']}"
        if args:
            cmd_str += " " + " ".join(args[:3])  # Truncate long args
            if len(args) > 3:
                cmd_str += " ..."

        # Truncate if too long
        if len(cmd_str) > 50:
            cmd_str = cmd_str[:47] + "..."

        # Write indicator
        write_str = "[yellow]✎[/yellow]" if row["is_write"] else ""

        # Exit code
        exit_code = row["exit_code"]
        if exit_code == 0:
            exit_str = "[green]0[/green]"
        elif exit_code is None:
            exit_str = "[dim]-[/dim]"
        else:
            exit_str = f"[red]{exit_code}[/red]"

        table.add_row(str(row["id"]), ts_str, cmd_str, write_str, exit_str)

    console.print(table)
    console.print(f"\n[dim]Showing {len(rows)} entries. Use 'gw history run <ID>' to re-run.[/dim]")


@history.command("search")
@click.argument("pattern")
@click.option("--limit", "-n", default=20, help="Maximum results")
@click.pass_context
def history_search(ctx: click.Context, pattern: str, limit: int) -> None:
    """Search command history.

    \b
    Examples:
        gw history search cache    # Find cache commands
        gw history search tenant   # Find tenant commands
        gw history search "db query"
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        conn = _init_db()
        cursor = conn.execute(
            """
            SELECT * FROM history
            WHERE command LIKE ? OR args LIKE ?
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (f"%{pattern}%", f"%{pattern}%", limit),
        )
        rows = cursor.fetchall()
        conn.close()
    except sqlite3.Error as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Search failed: {e}")
        ctx.exit(1)

    if output_json:
        entries = [
            {
                "id": row["id"],
                "timestamp": row["timestamp"],
                "command": row["command"],
                "args": json.loads(row["args"]) if row["args"] else [],
            }
            for row in rows
        ]
        console.print(json.dumps({"results": entries}, indent=2))
        return

    if not rows:
        info(f"No commands matching '{pattern}' found")
        return

    console.print(f"\n[bold green]Search Results for '{pattern}'[/bold green]\n")

    table = create_table()
    table.add_column("ID", style="dim", justify="right")
    table.add_column("Timestamp", style="yellow")
    table.add_column("Command", style="cyan")

    for row in rows:
        try:
            dt = datetime.fromisoformat(row["timestamp"])
            ts_str = dt.strftime("%Y-%m-%d %H:%M")
        except (ValueError, TypeError):
            ts_str = row["timestamp"][:16]

        args = json.loads(row["args"]) if row["args"] else []
        cmd_str = f"gw {row['command']} {' '.join(args)}"
        if len(cmd_str) > 60:
            cmd_str = cmd_str[:57] + "..."

        table.add_row(str(row["id"]), ts_str, cmd_str)

    console.print(table)


@history.command("show")
@click.argument("entry_id", type=int)
@click.pass_context
def history_show(ctx: click.Context, entry_id: int) -> None:
    """Show details for a specific history entry.

    \b
    Examples:
        gw history show 5
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        conn = _init_db()
        cursor = conn.execute(
            "SELECT * FROM history WHERE id = ?",
            (entry_id,),
        )
        row = cursor.fetchone()
        conn.close()
    except sqlite3.Error as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to get entry: {e}")
        ctx.exit(1)

    if not row:
        if output_json:
            console.print(json.dumps({"error": "Entry not found"}))
        else:
            error(f"History entry #{entry_id} not found")
        ctx.exit(1)

    entry = {
        "id": row["id"],
        "timestamp": row["timestamp"],
        "command": row["command"],
        "args": json.loads(row["args"]) if row["args"] else [],
        "is_write": bool(row["is_write"]),
        "exit_code": row["exit_code"],
        "duration_ms": row["duration_ms"],
    }

    if output_json:
        console.print(json.dumps(entry, indent=2))
        return

    console.print(f"\n[bold green]History Entry #{entry_id}[/bold green]\n")

    try:
        dt = datetime.fromisoformat(entry["timestamp"])
        ts_str = dt.strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, TypeError):
        ts_str = entry["timestamp"]

    console.print(f"[cyan]Timestamp:[/cyan] {ts_str}")
    console.print(f"[cyan]Command:[/cyan] gw {entry['command']}")
    if entry["args"]:
        console.print(f"[cyan]Arguments:[/cyan] {' '.join(entry['args'])}")
    console.print(f"[cyan]Write Operation:[/cyan] {'Yes' if entry['is_write'] else 'No'}")
    console.print(f"[cyan]Exit Code:[/cyan] {entry['exit_code']}")
    if entry["duration_ms"]:
        console.print(f"[cyan]Duration:[/cyan] {entry['duration_ms']}ms")

    console.print(f"\n[dim]To re-run: gw history run {entry_id}[/dim]")


@history.command("run")
@click.argument("entry_id", type=int)
@click.option("--dry-run", is_flag=True, help="Show command without running")
@click.pass_context
def history_run(ctx: click.Context, entry_id: int, dry_run: bool) -> None:
    """Re-run a command from history.

    \b
    Examples:
        gw history run 5           # Re-run command #5
        gw history run 5 --dry-run # Show what would run
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        conn = _init_db()
        cursor = conn.execute(
            "SELECT * FROM history WHERE id = ?",
            (entry_id,),
        )
        row = cursor.fetchone()
        conn.close()
    except sqlite3.Error as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to get entry: {e}")
        ctx.exit(1)

    if not row:
        if output_json:
            console.print(json.dumps({"error": "Entry not found"}))
        else:
            error(f"History entry #{entry_id} not found")
        ctx.exit(1)

    args = json.loads(row["args"]) if row["args"] else []
    full_command = ["gw", row["command"]] + args

    if output_json:
        console.print(json.dumps({
            "id": entry_id,
            "command": full_command,
            "dry_run": dry_run,
        }))
        if dry_run:
            return

    if dry_run:
        console.print(f"[bold yellow]DRY RUN[/bold yellow] - Would execute:\n")
        console.print(f"  [cyan]{' '.join(full_command)}[/cyan]")
        return

    console.print(f"[dim]Re-running: {' '.join(full_command)}[/dim]\n")

    # Re-invoke the command through Click
    # This is a simplified version - in practice you'd want to use subprocess
    import subprocess
    result = subprocess.run(full_command)
    ctx.exit(result.returncode)


@history.command("clear")
@click.option("--force", "-f", is_flag=True, help="Skip confirmation")
@click.option("--older-than", help="Clear entries older than (e.g., '30d', '1w')")
@click.pass_context
def history_clear(ctx: click.Context, force: bool, older_than: Optional[str]) -> None:
    """Clear command history.

    \b
    Examples:
        gw history clear           # Clear all (with confirmation)
        gw history clear -f        # Clear all (no confirmation)
        gw history clear --older-than 30d  # Clear entries older than 30 days
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        conn = _init_db()

        # Get count first
        if older_than:
            # Parse duration
            days = _parse_duration(older_than)
            if days is None:
                if output_json:
                    console.print(json.dumps({"error": "Invalid duration format"}))
                else:
                    error("Invalid duration. Use format like '30d', '1w', '6m'")
                ctx.exit(1)

            from datetime import timedelta
            cutoff = datetime.now() - timedelta(days=days)
            cursor = conn.execute(
                "SELECT COUNT(*) FROM history WHERE timestamp < ?",
                (cutoff.isoformat(),),
            )
            count = cursor.fetchone()[0]
        else:
            cursor = conn.execute("SELECT COUNT(*) FROM history")
            count = cursor.fetchone()[0]

        if count == 0:
            if output_json:
                console.print(json.dumps({"message": "No entries to clear"}))
            else:
                info("No history entries to clear")
            return

        # Confirm
        if not force and not output_json:
            console.print(f"[yellow]This will delete {count} history entries.[/yellow]")
            if not click.confirm("Continue?"):
                info("Cancelled")
                return

        # Delete
        if older_than:
            conn.execute(
                "DELETE FROM history WHERE timestamp < ?",
                (cutoff.isoformat(),),
            )
        else:
            conn.execute("DELETE FROM history")

        conn.commit()
        conn.close()

        if output_json:
            console.print(json.dumps({"deleted": count}))
        else:
            success(f"Cleared {count} history entries")

    except sqlite3.Error as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to clear history: {e}")
        ctx.exit(1)


def _parse_duration(duration: str) -> Optional[int]:
    """Parse a duration string to days."""
    try:
        value = int(duration[:-1])
        unit = duration[-1].lower()

        if unit == "d":
            return value
        elif unit == "w":
            return value * 7
        elif unit == "m":
            return value * 30
        elif unit == "y":
            return value * 365
        else:
            return None
    except (ValueError, IndexError):
        return None


# Make 'list' the default command when just running 'gw history'
@history.command("default", hidden=True)
@click.pass_context
def history_default(ctx: click.Context) -> None:
    """Default action - show history list."""
    ctx.invoke(history_list)
