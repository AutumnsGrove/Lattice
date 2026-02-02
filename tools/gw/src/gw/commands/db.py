"""Database commands - query and inspect D1 databases."""

import json
import re
from typing import Any

import click

from ..config import GWConfig
from ..safety import AGENT_SAFE_CONFIG, SafetyConfig, SafetyViolationError, validate_sql
from ..ui import console, create_panel, create_table, error, info, success, warning
from ..wrangler import Wrangler, WranglerError


def parse_wrangler_json(output: str) -> list[dict[str, Any]]:
    """Parse wrangler JSON output, extracting results."""
    try:
        data = json.loads(output)
        if isinstance(data, list) and len(data) > 0:
            return data[0].get("results", [])
        return []
    except json.JSONDecodeError:
        return []


@click.group()
@click.pass_context
def db(ctx: click.Context) -> None:
    """Database operations for D1.

    Query databases, list tables, and inspect schemas with safety guards.
    All queries are read-only by default.
    """
    pass


@db.command("list")
@click.pass_context
def db_list(ctx: click.Context) -> None:
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


@db.command("tables")
@click.option(
    "--db",
    "-d",
    "database",
    default="lattice",
    help="Database alias or name (default: lattice)",
)
@click.pass_context
def db_tables(ctx: click.Context, database: str) -> None:
    """List tables in a database.

    Examples:

        gw db tables                 # List tables in default database

        gw db tables --db groveauth  # List tables in groveauth
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


@db.command("schema")
@click.argument("table_name")
@click.option(
    "--db",
    "-d",
    "database",
    default="lattice",
    help="Database alias or name (default: lattice)",
)
@click.pass_context
def db_schema(ctx: click.Context, table_name: str, database: str) -> None:
    """Show schema for a table.

    Examples:

        gw db schema tenants             # Show tenants table schema

        gw db schema posts --db lattice  # Specify database
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


@db.command("query")
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
@click.pass_context
def db_query(
    ctx: click.Context, sql: str, database: str, write: bool, limit: int
) -> None:
    """Execute a SQL query.

    By default, only SELECT queries are allowed. Use --write for mutations.

    Examples:

        gw db query "SELECT * FROM tenants LIMIT 5"

        gw db query "SELECT subdomain, plan FROM tenants WHERE plan = 'oak'"

        gw db query --db groveauth "SELECT * FROM clients"
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Resolve database name
    db_name = _resolve_database(config, database)

    # Safety validation
    safety_config = SafetyConfig() if write else AGENT_SAFE_CONFIG

    try:
        validate_sql(sql, safety_config)
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
