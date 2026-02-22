"""Database commands - query and inspect D1 databases."""

import json
import re
from pathlib import Path
from typing import Any

import click

from ..config import GWConfig
from ..safety import AGENT_SAFE_CONFIG, SafetyConfig, SafetyViolationError, validate_sql
from ..ui import GROVE_COLORS, CozyGroup, console, create_panel, create_table, error, info, success, warning
from ..wrangler import Wrangler, WranglerError

D1_CATEGORIES = {
    "read": (
        "\U0001f4d6 Read (Always Safe)",
        GROVE_COLORS["forest_green"],
        [
            ("list", "List all databases"),
            ("tables", "List tables in a database"),
            ("schema", "Show schema for a table"),
            ("query", "Execute a read-only SQL query"),
        ],
    ),
    "write": (
        "\u270f\ufe0f  Write (Require --write)",
        GROVE_COLORS["leaf_yellow"],
        [
            ("migrate", "Execute a SQL migration file"),
        ],
    ),
}


def parse_wrangler_json(output: str) -> list[dict[str, Any]]:
    """Parse wrangler JSON output, extracting results."""
    try:
        data = json.loads(output)
        if isinstance(data, list) and len(data) > 0:
            return data[0].get("results", [])
        return []
    except json.JSONDecodeError:
        return []


@click.group(cls=CozyGroup, cozy_categories=D1_CATEGORIES)
@click.pass_context
def d1(ctx: click.Context) -> None:
    """D1 database operations."""
    pass


@d1.command("list")
@click.pass_context
def d1_list(ctx: click.Context) -> None:
    """List all available databases.

    Shows both configured database aliases and all databases in your
    Cloudflare account.
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Get databases from wrangler
    try:
        result = wrangler.execute(["d1", "list"], use_json=True)
        remote_dbs = json.loads(result)
    except (WranglerError, json.JSONDecodeError) as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to list databases: {e}")
        return

    if output_json:
        output_data = {
            "configured": {
                alias: {"name": db.name, "id": db.id}
                for alias, db in config.databases.items()
            },
            "remote": remote_dbs,
        }
        console.print(json.dumps(output_data, indent=2))
        return

    # Human-readable output
    console.print("\n[bold green]Databases[/bold green]\n")

    # Configured aliases
    if config.databases:
        alias_table = create_table(title="Configured Aliases")
        alias_table.add_column("Alias", style="cyan")
        alias_table.add_column("Name", style="magenta")
        alias_table.add_column("ID", style="yellow")

        for alias, db_info in config.databases.items():
            alias_table.add_row(alias, db_info.name, db_info.id[:12] + "...")

        console.print(alias_table)
        console.print()

    # Remote databases
    if remote_dbs:
        remote_table = create_table(title="Cloudflare D1 Databases")
        remote_table.add_column("Name", style="cyan")
        remote_table.add_column("ID", style="yellow")
        remote_table.add_column("Tables", style="green")
        remote_table.add_column("Size", style="magenta")

        for db_info in remote_dbs:
            size_bytes = db_info.get("file_size", 0)
            size_str = (
                f"{size_bytes / 1024 / 1024:.1f} MB"
                if size_bytes > 1024 * 1024
                else f"{size_bytes / 1024:.1f} KB"
            )
            remote_table.add_row(
                db_info.get("name", "unknown"),
                db_info.get("uuid", "unknown")[:12] + "...",
                str(db_info.get("num_tables", 0)),
                size_str,
            )

        console.print(remote_table)


@d1.command("tables")
@click.option(
    "--db",
    "-d",
    "database",
    default="lattice",
    help="Database alias or name (default: lattice)",
)
@click.pass_context
def d1_tables(ctx: click.Context, database: str) -> None:
    """List tables in a database.

    Examples:

        gw d1 tables                 # List tables in default database

        gw d1 tables --db groveauth  # List tables in groveauth
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Resolve database name
    db_name = _resolve_database(config, database)

    try:
        result = wrangler.execute(
            [
                "d1",
                "execute",
                db_name,
                "--remote",
                "--json",
                "--command",
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' ORDER BY name",
            ]
        )
        tables = parse_wrangler_json(result)
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to list tables: {e}")
        return

    if output_json:
        console.print(json.dumps({"database": db_name, "tables": tables}, indent=2))
        return

    # Human-readable output
    console.print(f"\n[bold green]Tables in {db_name}[/bold green]\n")

    if tables:
        table_display = create_table(title=f"{len(tables)} Tables")
        table_display.add_column("Table Name", style="cyan")

        for t in tables:
            table_display.add_row(t.get("name", "unknown"))

        console.print(table_display)
    else:
        warning("No tables found")


@d1.command("schema")
@click.argument("table_name")
@click.option(
    "--db",
    "-d",
    "database",
    default="lattice",
    help="Database alias or name (default: lattice)",
)
@click.pass_context
def d1_schema(ctx: click.Context, table_name: str, database: str) -> None:
    """Show schema for a table.

    Examples:

        gw d1 schema tenants             # Show tenants table schema

        gw d1 schema posts --db lattice  # Specify database
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Resolve database name
    db_name = _resolve_database(config, database)

    try:
        result = wrangler.execute(
            [
                "d1",
                "execute",
                db_name,
                "--remote",
                "--json",
                "--command",
                f"PRAGMA table_info({table_name})",
            ]
        )
        columns = parse_wrangler_json(result)
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to get schema: {e}")
        return

    if not columns:
        if output_json:
            console.print(json.dumps({"error": f"Table '{table_name}' not found"}))
        else:
            error(f"Table '{table_name}' not found")
        return

    if output_json:
        console.print(
            json.dumps(
                {"database": db_name, "table": table_name, "columns": columns}, indent=2
            )
        )
        return

    # Human-readable output
    console.print(f"\n[bold green]Schema: {table_name}[/bold green]\n")

    schema_table = create_table(title=f"{len(columns)} Columns")
    schema_table.add_column("Column", style="cyan")
    schema_table.add_column("Type", style="magenta")
    schema_table.add_column("Nullable", style="yellow")
    schema_table.add_column("Default", style="green")
    schema_table.add_column("PK", style="red")

    for col in columns:
        schema_table.add_row(
            col.get("name", "unknown"),
            col.get("type", "unknown"),
            "YES" if not col.get("notnull") else "NO",
            str(col.get("dflt_value", "-")) if col.get("dflt_value") else "-",
            "✓" if col.get("pk") else "",
        )

    console.print(schema_table)


@d1.command("query")
@click.argument("sql")
@click.option(
    "--db",
    "-d",
    "database",
    default="lattice",
    help="Database alias or name (default: lattice)",
)
@click.option(
    "--write",
    is_flag=True,
    help="Allow write operations (INSERT, UPDATE, DELETE)",
)
@click.option(
    "--limit",
    "-n",
    default=100,
    help="Maximum rows to return (default: 100)",
)
@click.option(
    "--force",
    is_flag=True,
    help="Bypass row-limit safety checks (still enforces WHERE and protected tables)",
)
@click.pass_context
def d1_query(
    ctx: click.Context, sql: str, database: str, write: bool, limit: int, force: bool
) -> None:
    """Execute a SQL query.

    By default, only SELECT queries are allowed. Use --write for mutations.

    Examples:

        gw d1 query "SELECT * FROM tenants LIMIT 5"

        gw d1 query "SELECT subdomain, plan FROM tenants WHERE plan = 'oak'"

        gw d1 query --db groveauth "SELECT * FROM clients"

        gw d1 query --write --force "UPDATE posts SET status = 'draft' WHERE tenant_id = 'x'"
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Resolve database name
    db_name = _resolve_database(config, database)

    # Safety validation
    safety_config = SafetyConfig() if write else AGENT_SAFE_CONFIG

    try:
        validate_sql(sql, safety_config, skip_row_limits=force)
    except SafetyViolationError as e:
        if output_json:
            console.print(json.dumps({"error": str(e), "code": e.code.value}, indent=2))
        else:
            error(f"Safety violation: {e.message}")
            console.print(f"[dim]Code: {e.code.value}[/dim]")
        ctx.exit(1)

    # Check if it's a write operation without --write flag
    sql_upper = sql.strip().upper()
    is_write = any(
        sql_upper.startswith(op)
        for op in ["INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER"]
    )

    if is_write and not write:
        if output_json:
            console.print(
                json.dumps({"error": "Write operations require --write flag"}, indent=2)
            )
        else:
            error("Write operations require --write flag")
            info("Add --write to execute mutations")
        ctx.exit(1)

    # Add LIMIT if not present and it's a SELECT
    final_sql = sql
    if sql_upper.startswith("SELECT") and "LIMIT" not in sql_upper:
        final_sql = f"{sql.rstrip(';')} LIMIT {limit}"

    try:
        result = wrangler.execute(
            [
                "d1",
                "execute",
                db_name,
                "--remote",
                "--json",
                "--command",
                final_sql,
            ]
        )
        rows = parse_wrangler_json(result)
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Query failed: {e}")
        ctx.exit(1)

    if output_json:
        console.print(json.dumps({"database": db_name, "rows": rows}, indent=2))
        return

    # Human-readable output
    if not rows:
        info("No results")
        return

    console.print(f"\n[bold green]Query Results[/bold green] ({len(rows)} rows)\n")

    # Build table dynamically based on columns
    result_table = create_table()
    columns = list(rows[0].keys())

    for col in columns:
        result_table.add_column(col, style="cyan", overflow="fold")

    for row in rows:
        result_table.add_row(*[_format_value(row.get(col)) for col in columns])

    console.print(result_table)


@d1.command("migrate")
@click.argument("file_path", type=click.Path(exists=True))
@click.option(
    "--db",
    "-d",
    "database",
    default="lattice",
    help="Database alias or name (default: lattice)",
)
@click.option(
    "--write",
    is_flag=True,
    help="Required to execute the migration",
)
@click.option(
    "--dry-run",
    is_flag=True,
    help="Show SQL without executing",
)
@click.pass_context
def d1_migrate(
    ctx: click.Context, file_path: str, database: str, write: bool, dry_run: bool
) -> None:
    """Execute a SQL migration file against D1.

    Reads a .sql file and runs it against the specified database.
    Multi-statement files and DDL (CREATE, ALTER, DROP) are allowed.
    Comments are preserved and passed to wrangler.

    Examples:

        gw d1 migrate --write packages/engine/migrations/049_photo_gallery_graft.sql

        gw d1 migrate --dry-run packages/engine/migrations/049_photo_gallery_graft.sql

        gw d1 migrate --write --db groveauth migrations/001_init.sql
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    path = Path(file_path)

    if not path.suffix == ".sql":
        error(f"Expected a .sql file, got: {path.name}")
        ctx.exit(1)

    sql_content = path.read_text()
    if not sql_content.strip():
        error(f"Migration file is empty: {path.name}")
        ctx.exit(1)

    # Resolve database name
    db_name = _resolve_database(config, database)

    # Show preview
    if not output_json:
        console.print(f"\n[bold]Migration:[/bold] {path.name}")
        console.print(f"[bold]Database:[/bold] {db_name}")
        console.print(f"[bold]File:[/bold] {path}\n")

        # Show the SQL content (truncated for large files)
        lines = sql_content.strip().split("\n")
        preview = "\n".join(lines[:40])
        if len(lines) > 40:
            preview += f"\n\n... ({len(lines) - 40} more lines)"
        console.print(f"[dim]{preview}[/dim]\n")

    if dry_run:
        if output_json:
            console.print(
                json.dumps(
                    {"dry_run": True, "database": db_name, "file": str(path), "sql": sql_content},
                    indent=2,
                )
            )
        else:
            info("Dry run — no changes made")
        return

    if not write:
        error("Migrations require --write flag")
        info("Preview with: gw d1 migrate --dry-run <file>")
        ctx.exit(1)

    # Execute via wrangler --file (supports multi-statement SQL, comments, DDL)
    try:
        result = wrangler.execute(
            [
                "d1",
                "execute",
                db_name,
                "--remote",
                "--file",
                str(path),
            ]
        )

        if output_json:
            console.print(json.dumps({"success": True, "database": db_name, "file": str(path)}))
        else:
            success(f"Migration applied: {path.name}")
            if result.strip():
                # Show wrangler output (row counts, etc.)
                for line in result.strip().split("\n"):
                    if line.strip():
                        console.print(f"  [dim]{line.strip()}[/dim]")

    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Migration failed: {e}")
        ctx.exit(1)


def _resolve_database(config: GWConfig, database: str) -> str:
    """Resolve database alias to actual name."""
    if database in config.databases:
        return config.databases[database].name
    return database


def _format_value(value: Any) -> str:
    """Format a value for display."""
    if value is None:
        return "[dim]NULL[/dim]"
    if isinstance(value, bool):
        return "✓" if value else "✗"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str) and len(value) > 50:
        return value[:47] + "..."
    return str(value)
