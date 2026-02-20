"""Tenant commands - lookup and inspect Grove tenants."""

import json
from typing import Any

import click

from ..config import GWConfig
from ..ui import GROVE_COLORS, CozyGroup, console, create_panel, create_table, error, info, success, warning
from ..wrangler import Wrangler, WranglerError

TENANT_CATEGORIES = {
    "read": (
        "\U0001f4d6 Read (Always Safe)",
        GROVE_COLORS["forest_green"],
        [
            ("list", "List all tenants"),
            ("lookup", "Look up a tenant"),
            ("stats", "Show tenant statistics"),
        ],
    ),
    "write": (
        "\u270f\ufe0f  Write (Require --write)",
        GROVE_COLORS["leaf_yellow"],
        [
            ("create", "Create a new tenant"),
        ],
    ),
    "destructive": (
        "\U0001f525 Destructive (--write --force)",
        "red",
        [
            ("delete", "Delete a tenant and all data"),
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


def format_bytes(size_bytes: int) -> str:
    """Format bytes to human-readable size."""
    if size_bytes >= 1024 * 1024 * 1024:
        return f"{size_bytes / 1024 / 1024 / 1024:.2f} GB"
    if size_bytes >= 1024 * 1024:
        return f"{size_bytes / 1024 / 1024:.2f} MB"
    if size_bytes >= 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes} bytes"


def format_timestamp(ts: int | None) -> str:
    """Format Unix timestamp to readable date."""
    if ts is None:
        return "-"
    from datetime import datetime

    try:
        dt = datetime.fromtimestamp(ts)
        return dt.strftime("%Y-%m-%d %H:%M")
    except (ValueError, OSError):
        return str(ts)


@click.group(cls=CozyGroup, cozy_categories=TENANT_CATEGORIES)
@click.pass_context
def tenant(ctx: click.Context) -> None:
    """Tenant lookup and management.
    """
    pass


@tenant.command("lookup")
@click.argument("identifier", required=False)
@click.option("--email", "-e", help="Look up by email address")
@click.option("--id", "-i", "tenant_id", help="Look up by tenant ID")
@click.option(
    "--db",
    "-d",
    "database",
    default="lattice",
    help="Database alias (default: lattice)",
)
@click.pass_context
def tenant_lookup(
    ctx: click.Context,
    identifier: str | None,
    email: str | None,
    tenant_id: str | None,
    database: str,
) -> None:
    """Look up a tenant by subdomain, email, or ID.

    Examples:

        gw tenant lookup autumn          # By subdomain

        gw tenant lookup --email user@example.com

        gw tenant lookup --id abc-123-def
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Resolve database
    db_name = config.databases.get(database)
    if db_name:
        db_name = db_name.name
    else:
        db_name = database

    # Build query based on identifier type
    if email:
        query = f"SELECT * FROM tenants WHERE email = '{_escape_sql(email)}'"
    elif tenant_id:
        query = f"SELECT * FROM tenants WHERE id = '{_escape_sql(tenant_id)}'"
    elif identifier:
        query = f"SELECT * FROM tenants WHERE subdomain = '{_escape_sql(identifier)}'"
    else:
        if output_json:
            console.print(json.dumps({"error": "No identifier provided"}))
        else:
            error("Please provide a subdomain, --email, or --id")
        ctx.exit(1)

    try:
        result = wrangler.execute(
            ["d1", "execute", db_name, "--remote", "--json", "--command", query]
        )
        rows = parse_wrangler_json(result)
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Query failed: {e}")
        ctx.exit(1)

    if not rows:
        if output_json:
            console.print(json.dumps({"error": "Tenant not found"}))
        else:
            warning("Tenant not found")
        ctx.exit(1)

    tenant_data = rows[0]

    if output_json:
        console.print(json.dumps(tenant_data, indent=2))
        return

    # Human-readable output
    _display_tenant(tenant_data)


@tenant.command("stats")
@click.argument("subdomain")
@click.option(
    "--db",
    "-d",
    "database",
    default="lattice",
    help="Database alias (default: lattice)",
)
@click.pass_context
def tenant_stats(ctx: click.Context, subdomain: str, database: str) -> None:
    """Show detailed statistics for a tenant.

    Examples:

        gw tenant stats autumn
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Resolve database
    db_name = config.databases.get(database)
    if db_name:
        db_name = db_name.name
    else:
        db_name = database

    # Get tenant info
    try:
        result = wrangler.execute(
            [
                "d1",
                "execute",
                db_name,
                "--remote",
                "--json",
                "--command",
                f"SELECT * FROM tenants WHERE subdomain = '{_escape_sql(subdomain)}'",
            ]
        )
        tenant_rows = parse_wrangler_json(result)
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Query failed: {e}")
        ctx.exit(1)

    if not tenant_rows:
        if output_json:
            console.print(json.dumps({"error": "Tenant not found"}))
        else:
            warning(f"Tenant '{subdomain}' not found")
        ctx.exit(1)

    tenant_data = tenant_rows[0]
    tenant_id = tenant_data.get("id")

    # Gather stats
    stats = {"tenant": tenant_data, "counts": {}}

    # Count posts
    try:
        result = wrangler.execute(
            [
                "d1",
                "execute",
                db_name,
                "--remote",
                "--json",
                "--command",
                f"SELECT COUNT(*) as count FROM posts WHERE tenant_id = '{tenant_id}'",
            ]
        )
        count_rows = parse_wrangler_json(result)
        stats["counts"]["posts"] = count_rows[0].get("count", 0) if count_rows else 0
    except WranglerError:
        stats["counts"]["posts"] = "?"

    # Count pages
    try:
        result = wrangler.execute(
            [
                "d1",
                "execute",
                db_name,
                "--remote",
                "--json",
                "--command",
                f"SELECT COUNT(*) as count FROM pages WHERE tenant_id = '{tenant_id}'",
            ]
        )
        count_rows = parse_wrangler_json(result)
        stats["counts"]["pages"] = count_rows[0].get("count", 0) if count_rows else 0
    except WranglerError:
        stats["counts"]["pages"] = "?"

    # Count images and calculate actual storage from gallery_images
    # (gallery_images is the primary image store — image_hashes only tracks dedup)
    try:
        result = wrangler.execute(
            [
                "d1",
                "execute",
                db_name,
                "--remote",
                "--json",
                "--command",
                f"SELECT COUNT(*) as count, COALESCE(SUM(COALESCE(file_size, 0)), 0) as total_bytes FROM gallery_images WHERE tenant_id = '{tenant_id}'",
            ]
        )
        count_rows = parse_wrangler_json(result)
        if count_rows:
            stats["counts"]["images"] = count_rows[0].get("count", 0)
            stats["storage_used_bytes"] = count_rows[0].get("total_bytes", 0)
        else:
            stats["counts"]["images"] = 0
            stats["storage_used_bytes"] = 0
    except WranglerError:
        stats["counts"]["images"] = "?"
        stats["storage_used_bytes"] = 0

    # Count sessions
    try:
        result = wrangler.execute(
            [
                "d1",
                "execute",
                db_name,
                "--remote",
                "--json",
                "--command",
                f"SELECT COUNT(*) as count FROM sessions WHERE tenant_id = '{tenant_id}'",
            ]
        )
        count_rows = parse_wrangler_json(result)
        stats["counts"]["sessions"] = count_rows[0].get("count", 0) if count_rows else 0
    except WranglerError:
        stats["counts"]["sessions"] = "?"

    if output_json:
        console.print(json.dumps(stats, indent=2))
        return

    # Human-readable output
    console.print(f"\n[bold green]Tenant Statistics: {subdomain}[/bold green]\n")

    # Tenant info panel
    info_text = f"""[bold]{tenant_data.get('display_name', subdomain)}[/bold]
Subdomain: {subdomain}.grove.place
Email: {tenant_data.get('email', '-')}
Plan: [cyan]{tenant_data.get('plan', 'seedling')}[/cyan]
Created: {format_timestamp(tenant_data.get('created_at'))}"""

    console.print(create_panel(info_text, title="Tenant Info", style="blue"))
    console.print()

    # Stats table
    stats_table = create_table(title="Content Statistics")
    stats_table.add_column("Type", style="cyan")
    stats_table.add_column("Count", style="green", justify="right")

    stats_table.add_row("Posts", str(stats["counts"]["posts"]))
    stats_table.add_row("Pages", str(stats["counts"]["pages"]))
    stats_table.add_row("Images", str(stats["counts"]["images"]))
    stats_table.add_row("Active Sessions", str(stats["counts"]["sessions"]))

    console.print(stats_table)
    console.print()

    # Storage panel — use actual storage from image_hashes, not stale tenants.storage_used_bytes
    actual_storage = stats.get("storage_used_bytes", 0) or 0
    storage_limit = tenant_data.get("storage_limit_bytes", 0) or 0

    if storage_limit > 0:
        usage_pct = (actual_storage / storage_limit) * 100
        storage_text = f"""Used: {format_bytes(actual_storage)} of {format_bytes(storage_limit)}
Usage: {usage_pct:.1f}%"""
    else:
        storage_text = f"Used: {format_bytes(actual_storage)}"

    console.print(create_panel(storage_text, title="Storage", style="magenta"))


@tenant.command("list")
@click.option("--plan", "-p", help="Filter by plan (seedling, sapling, oak, evergreen)")
@click.option("--limit", "-n", default=20, help="Maximum tenants to show (default: 20)")
@click.option(
    "--db",
    "-d",
    "database",
    default="lattice",
    help="Database alias (default: lattice)",
)
@click.pass_context
def tenant_list(
    ctx: click.Context, plan: str | None, limit: int, database: str
) -> None:
    """List all tenants.

    Examples:

        gw tenant list                   # List first 20 tenants

        gw tenant list --plan oak        # Filter by plan

        gw tenant list -n 50             # Show 50 tenants
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Resolve database
    db_name = config.databases.get(database)
    if db_name:
        db_name = db_name.name
    else:
        db_name = database

    # Build query
    query = "SELECT id, subdomain, display_name, email, plan, created_at FROM tenants"
    if plan:
        query += f" WHERE plan = '{_escape_sql(plan)}'"
    query += f" ORDER BY created_at DESC LIMIT {limit}"

    try:
        result = wrangler.execute(
            ["d1", "execute", db_name, "--remote", "--json", "--command", query]
        )
        rows = parse_wrangler_json(result)
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Query failed: {e}")
        ctx.exit(1)

    if output_json:
        console.print(json.dumps({"tenants": rows}, indent=2))
        return

    # Human-readable output
    console.print(f"\n[bold green]Tenants[/bold green] ({len(rows)} shown)\n")

    if not rows:
        info("No tenants found")
        return

    tenant_table = create_table()
    tenant_table.add_column("Subdomain", style="cyan")
    tenant_table.add_column("Display Name", style="white")
    tenant_table.add_column("Plan", style="magenta")
    tenant_table.add_column("Created", style="yellow")

    for row in rows:
        tenant_table.add_row(
            row.get("subdomain", "-"),
            row.get("display_name", "-")[:30],
            row.get("plan", "-"),
            format_timestamp(row.get("created_at")),
        )

    console.print(tenant_table)


def _display_tenant(tenant_data: dict[str, Any]) -> None:
    """Display tenant information in a nice format."""
    console.print(
        f"\n[bold green]Tenant: {tenant_data.get('subdomain')}[/bold green]\n"
    )

    info_table = create_table()
    info_table.add_column("Field", style="cyan")
    info_table.add_column("Value", style="white")

    # Key fields to display
    fields = [
        ("ID", "id"),
        ("Subdomain", "subdomain"),
        ("Display Name", "display_name"),
        ("Email", "email"),
        ("Plan", "plan"),
        ("Custom Domain", "custom_domain"),
        ("Storage Used", "storage_used_bytes"),
        ("Active", "is_active"),
        ("Created", "created_at"),
        ("Updated", "updated_at"),
    ]

    for label, key in fields:
        value = tenant_data.get(key)
        if key == "storage_used_bytes" and value:
            value = format_bytes(value)
        elif key in ("created_at", "updated_at") and value:
            value = format_timestamp(value)
        elif key == "is_active":
            value = "✓ Yes" if value else "✗ No"
        elif value is None:
            value = "-"
        info_table.add_row(label, str(value))

    console.print(info_table)


def _escape_sql(value: str) -> str:
    """Basic SQL escaping to prevent injection in string literals."""
    # Replace single quotes with two single quotes (SQL standard escaping)
    return value.replace("'", "''")


@tenant.command("create")
@click.option("--write", is_flag=True, required=True, help="Confirm write operation")
@click.option("--subdomain", "-s", help="Subdomain for the tenant")
@click.option("--name", "-n", help="Display name")
@click.option("--email", "-e", help="Email address")
@click.option(
    "--plan",
    "-p",
    type=click.Choice(["seedling", "sapling", "oak", "evergreen"]),
    default="seedling",
    help="Subscription plan",
)
@click.option(
    "--db",
    "-d",
    "database",
    default="lattice",
    help="Database alias (default: lattice)",
)
@click.option("--dry-run", is_flag=True, help="Preview without creating")
@click.pass_context
def tenant_create(
    ctx: click.Context,
    write: bool,
    subdomain: str | None,
    name: str | None,
    email: str | None,
    plan: str,
    database: str,
    dry_run: bool,
) -> None:
    """Create a new tenant.

    Interactive wizard if options not provided.

    \b
    Examples:
        gw tenant create --write                          # Interactive
        gw tenant create --write -s myblog -n "My Blog"   # With options
        gw tenant create --write --dry-run                # Preview
    """
    import uuid
    from datetime import datetime

    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Resolve database
    db_name = config.databases.get(database)
    if db_name:
        db_name = db_name.name
    else:
        db_name = database

    # Interactive prompts if not provided
    if not subdomain:
        subdomain = click.prompt("Subdomain", type=str)
    if not name:
        name = click.prompt("Display name", type=str, default=subdomain)
    if not email:
        email = click.prompt("Email address", type=str)

    # Validate subdomain
    subdomain = subdomain.lower().strip()
    if not subdomain.isalnum() and "-" not in subdomain:
        if output_json:
            console.print(json.dumps({"error": "Invalid subdomain format"}))
        else:
            error("Subdomain must be alphanumeric (hyphens allowed)")
        ctx.exit(1)

    # Generate ID
    tenant_id = str(uuid.uuid4())
    now = int(datetime.now().timestamp())

    tenant_data = {
        "id": tenant_id,
        "subdomain": subdomain,
        "display_name": name,
        "email": email,
        "plan": plan,
        "created_at": now,
        "updated_at": now,
        "is_active": True,
    }

    # Dry run
    if dry_run:
        if output_json:
            console.print(json.dumps({
                "dry_run": True,
                "tenant": tenant_data,
            }, indent=2))
        else:
            console.print("[bold yellow]DRY RUN[/bold yellow] - Would create:\n")
            _display_tenant(tenant_data)
        return

    # Build INSERT query
    query = f"""
        INSERT INTO tenants (id, subdomain, display_name, email, plan, created_at, updated_at, is_active)
        VALUES (
            '{_escape_sql(tenant_id)}',
            '{_escape_sql(subdomain)}',
            '{_escape_sql(name)}',
            '{_escape_sql(email)}',
            '{_escape_sql(plan)}',
            {now},
            {now},
            1
        )
    """

    try:
        wrangler.execute(
            ["d1", "execute", db_name, "--remote", "--command", query]
        )
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to create tenant: {e}")
        ctx.exit(1)

    if output_json:
        console.print(json.dumps({"created": tenant_data}, indent=2))
    else:
        success(f"Created tenant '{subdomain}' (id: {tenant_id[:8]}...)")
        info(f"URL: https://{subdomain}.grove.place")


@tenant.command("delete")
@click.argument("subdomain")
@click.option("--write", is_flag=True, required=True, help="Confirm write operation")
@click.option("--force", is_flag=True, help="Skip confirmation prompt")
@click.option(
    "--db",
    "-d",
    "database",
    default="lattice",
    help="Database alias (default: lattice)",
)
@click.option("--dry-run", is_flag=True, help="Preview what would be deleted")
@click.pass_context
def tenant_delete(
    ctx: click.Context,
    subdomain: str,
    write: bool,
    force: bool,
    database: str,
    dry_run: bool,
) -> None:
    """Delete a tenant and all their data.

    ⚠️  DANGEROUS: This permanently deletes all tenant data!

    \b
    Examples:
        gw tenant delete testuser --write           # With confirmation
        gw tenant delete testuser --write --force   # Skip confirmation
        gw tenant delete testuser --write --dry-run # Preview deletion
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Resolve database
    db_name = config.databases.get(database)
    if db_name:
        db_name = db_name.name
    else:
        db_name = database

    # First, look up the tenant to get ID and stats
    try:
        result = wrangler.execute(
            [
                "d1", "execute", db_name, "--remote", "--json", "--command",
                f"SELECT * FROM tenants WHERE subdomain = '{_escape_sql(subdomain)}'",
            ]
        )
        tenant_rows = parse_wrangler_json(result)
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to look up tenant: {e}")
        ctx.exit(1)

    if not tenant_rows:
        if output_json:
            console.print(json.dumps({"error": "Tenant not found"}))
        else:
            error(f"Tenant '{subdomain}' not found")
        ctx.exit(1)

    tenant_data = tenant_rows[0]
    tenant_id = tenant_data.get("id")

    # Gather deletion stats
    stats = {}
    tables_to_delete = ["posts", "pages", "media", "sessions", "products", "orders"]

    for table in tables_to_delete:
        try:
            result = wrangler.execute(
                [
                    "d1", "execute", db_name, "--remote", "--json", "--command",
                    f"SELECT COUNT(*) as count FROM {table} WHERE tenant_id = '{tenant_id}'",
                ]
            )
            count_rows = parse_wrangler_json(result)
            stats[table] = count_rows[0].get("count", 0) if count_rows else 0
        except WranglerError:
            stats[table] = "?"

    # Preview / dry run
    if dry_run or not output_json:
        total_items = sum(v for v in stats.values() if isinstance(v, int))

        if output_json:
            console.print(json.dumps({
                "dry_run": True,
                "tenant": tenant_data,
                "would_delete": stats,
                "total_items": total_items,
            }, indent=2))
            return

        console.print(f"\n[bold red]⚠️  DELETE TENANT: {subdomain}[/bold red]\n")
        console.print(f"Tenant ID: {tenant_id}")
        console.print(f"Email: {tenant_data.get('email', '-')}")
        console.print(f"Plan: {tenant_data.get('plan', '-')}")
        console.print()

        console.print("[bold]Data to be deleted:[/bold]")
        for table, count in stats.items():
            console.print(f"  • {table}: {count}")
        console.print()

        if dry_run:
            console.print("[yellow]DRY RUN - No changes made[/yellow]")
            return

    # Confirmation
    if not force and not output_json:
        console.print("[bold red]This action CANNOT be undone![/bold red]\n")
        confirm = click.prompt(
            f"Type 'DELETE {subdomain}' to confirm",
            type=str,
        )
        if confirm != f"DELETE {subdomain}":
            info("Cancelled")
            ctx.exit(0)

    # Perform deletion (CASCADE should handle related tables)
    try:
        wrangler.execute(
            [
                "d1", "execute", db_name, "--remote", "--command",
                f"DELETE FROM tenants WHERE id = '{tenant_id}'",
            ]
        )
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to delete tenant: {e}")
        ctx.exit(1)

    if output_json:
        console.print(json.dumps({
            "deleted": subdomain,
            "tenant_id": tenant_id,
            "items_deleted": stats,
        }))
    else:
        success(f"Deleted tenant '{subdomain}' and all associated data")
