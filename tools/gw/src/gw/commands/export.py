"""Export commands - manage zip data exports."""

import json
import os
import urllib.request
import urllib.error
from datetime import datetime
from typing import Any

import click

from ..config import GWConfig
from ..ui import GROVE_COLORS, CozyGroup, console, create_panel, create_table, error, info, success, warning
from ..wrangler import Wrangler, WranglerError

EXPORT_CATEGORIES = {
    "read": (
        "\U0001f4d6 Read (Always Safe)",
        GROVE_COLORS["forest_green"],
        [
            ("list", "List recent exports"),
            ("status", "Check export status"),
        ],
    ),
    "write": (
        "\u270f\ufe0f  Write (Require --write)",
        GROVE_COLORS["leaf_yellow"],
        [
            ("start", "Trigger a new export"),
            ("download", "Download export zip from R2"),
            ("cleanup", "Clean expired exports"),
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
    try:
        dt = datetime.fromtimestamp(ts)
        return dt.strftime("%Y-%m-%d %H:%M")
    except (ValueError, OSError):
        return str(ts)


def _escape_sql(value: str) -> str:
    """Basic SQL escaping to prevent injection in string literals."""
    return value.replace("'", "''")


def _resolve_database(config: GWConfig, database: str) -> str:
    """Resolve database alias to actual name."""
    if database in config.databases:
        return config.databases[database].name
    return database


# Active export statuses (not yet complete or failed)
ACTIVE_STATUSES = ("pending", "querying", "assembling", "uploading", "notifying")


@click.group(cls=CozyGroup, cozy_categories=EXPORT_CATEGORIES)
@click.pass_context
def export(ctx: click.Context) -> None:
    """Zip data export operations."""
    pass


@export.command("list")
@click.argument("subdomain", required=False)
@click.option("--limit", "-n", default=20, help="Maximum exports to show (default: 20)")
@click.option(
    "--db",
    "-d",
    "database",
    default="lattice",
    help="Database alias (default: lattice)",
)
@click.pass_context
def export_list(
    ctx: click.Context, subdomain: str | None, limit: int, database: str
) -> None:
    """List recent exports, optionally filtered by tenant.

    \b
    Examples:
        gw export list                 # All recent exports
        gw export list autumn          # Exports for autumn
        gw export list --limit 50      # Show more
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)
    db_name = _resolve_database(config, database)

    # Build query — join tenants for subdomain display
    if subdomain:
        query = (
            f"SELECT e.id, e.status, e.progress, e.file_size_bytes, e.created_at, "
            f"e.completed_at, e.expires_at, e.delivery_method, t.subdomain "
            f"FROM storage_exports e "
            f"JOIN tenants t ON e.tenant_id = t.id "
            f"WHERE t.subdomain = '{_escape_sql(subdomain)}' "
            f"ORDER BY e.created_at DESC LIMIT {limit}"
        )
    else:
        query = (
            f"SELECT e.id, e.status, e.progress, e.file_size_bytes, e.created_at, "
            f"e.completed_at, e.expires_at, e.delivery_method, t.subdomain "
            f"FROM storage_exports e "
            f"JOIN tenants t ON e.tenant_id = t.id "
            f"ORDER BY e.created_at DESC LIMIT {limit}"
        )

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
        console.print(json.dumps({"exports": rows}, indent=2))
        return

    console.print(f"\n[bold green]Data Exports[/bold green] ({len(rows)} shown)\n")

    if not rows:
        info("No exports found")
        return

    now = int(datetime.now().timestamp())
    export_table = create_table()
    export_table.add_column("ID", style="cyan", max_width=12)
    export_table.add_column("Subdomain", style="white")
    export_table.add_column("Status", style="magenta")
    export_table.add_column("Progress", style="yellow", justify="right")
    export_table.add_column("Size", style="green", justify="right")
    export_table.add_column("Method", style="dim")
    export_table.add_column("Created", style="dim")

    for row in rows:
        status = row.get("status", "?")
        expires_at = row.get("expires_at")
        # Mark as expired if past expiry
        if status == "complete" and expires_at and expires_at < now:
            status = "[red]expired[/red]"
        elif status == "complete":
            status = "[green]complete[/green]"
        elif status == "failed":
            status = "[red]failed[/red]"
        elif status in ACTIVE_STATUSES:
            status = f"[yellow]{status}[/yellow]"

        size = row.get("file_size_bytes")
        size_str = format_bytes(size) if size else "-"

        export_table.add_row(
            row.get("id", "?")[:12] + "...",
            row.get("subdomain", "-"),
            status,
            f"{row.get('progress', 0)}%",
            size_str,
            row.get("delivery_method", "-"),
            format_timestamp(row.get("created_at")),
        )

    console.print(export_table)


@export.command("status")
@click.argument("export_id")
@click.option(
    "--db",
    "-d",
    "database",
    default="lattice",
    help="Database alias (default: lattice)",
)
@click.pass_context
def export_status(ctx: click.Context, export_id: str, database: str) -> None:
    """Check the status of a specific export.

    \b
    Examples:
        gw export status abc-123-def
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)
    db_name = _resolve_database(config, database)

    query = (
        f"SELECT e.*, t.subdomain FROM storage_exports e "
        f"JOIN tenants t ON e.tenant_id = t.id "
        f"WHERE e.id = '{_escape_sql(export_id)}'"
    )

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
            console.print(json.dumps({"error": "Export not found"}))
        else:
            error(f"Export '{export_id}' not found")
        ctx.exit(1)

    row = rows[0]

    if output_json:
        console.print(json.dumps(row, indent=2))
        return

    # Determine display status
    now = int(datetime.now().timestamp())
    status = row.get("status", "?")
    expires_at = row.get("expires_at")
    is_expired = status == "complete" and expires_at and expires_at < now

    status_color = "yellow"
    if status == "complete":
        status_color = "red" if is_expired else "green"
    elif status == "failed":
        status_color = "red"

    display_status = f"[{status_color}]{status}{'  (EXPIRED)' if is_expired else ''}[/{status_color}]"

    # Build detail panel
    size = row.get("file_size_bytes")
    item_counts = row.get("item_counts", "")

    detail_lines = [
        f"[bold]Export ID:[/bold] {row.get('id')}",
        f"[bold]Tenant:[/bold] {row.get('subdomain', '-')}.grove.place",
        f"[bold]Email:[/bold] {row.get('user_email', '-')}",
        f"[bold]Status:[/bold] {display_status}",
        f"[bold]Progress:[/bold] {row.get('progress', 0)}%",
        f"[bold]Images:[/bold] {'Yes' if row.get('include_images') else 'No'}",
        f"[bold]Method:[/bold] {row.get('delivery_method', '-')}",
    ]

    if size:
        detail_lines.append(f"[bold]File Size:[/bold] {format_bytes(size)}")
    if item_counts:
        detail_lines.append(f"[bold]Items:[/bold] {item_counts}")
    if row.get("r2_key"):
        detail_lines.append(f"[bold]R2 Key:[/bold] {row.get('r2_key')}")
    if row.get("error_message"):
        detail_lines.append(f"[bold red]Error:[/bold red] {row.get('error_message')}")

    detail_lines.append("")
    detail_lines.append(f"[bold]Created:[/bold] {format_timestamp(row.get('created_at'))}")
    if row.get("completed_at"):
        detail_lines.append(f"[bold]Completed:[/bold] {format_timestamp(row.get('completed_at'))}")
    if expires_at:
        detail_lines.append(f"[bold]Expires:[/bold] {format_timestamp(expires_at)}")

    console.print()
    console.print(
        create_panel("\n".join(detail_lines), title="Export Details", style="blue")
    )


@export.command("start")
@click.argument("subdomain")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option(
    "--images/--no-images",
    default=True,
    help="Include images in export (default: yes)",
)
@click.option(
    "--method",
    type=click.Choice(["email", "download"]),
    default="download",
    help="Delivery method (default: download for CLI)",
)
@click.option(
    "--session",
    envvar="GROVE_SESSION",
    help="Session cookie for API mode (or set GROVE_SESSION env var)",
)
@click.option(
    "--db",
    "-d",
    "database",
    default="lattice",
    help="Database alias (default: lattice)",
)
@click.pass_context
def export_start(
    ctx: click.Context,
    subdomain: str,
    write: bool,
    images: bool,
    method: str,
    session: str | None,
    database: str,
) -> None:
    """Trigger a new zip export for a tenant.

    With --session (or GROVE_SESSION env var), hits the deployed API which
    triggers the Durable Object automatically. Without a session, creates
    the D1 record directly but warns the DO must be triggered separately.

    \b
    Examples:
        gw export start autumn --write
        gw export start autumn --write --no-images
        gw export start autumn --write --session <cookie>
        GROVE_SESSION=abc gw export start autumn --write
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)
    db_name = _resolve_database(config, database)

    if not write:
        if output_json:
            console.print(json.dumps({"error": "Export start requires --write flag"}))
        else:
            error("Export start requires --write flag")
            info("Add --write to trigger the export")
        ctx.exit(1)

    # Validate tenant exists
    try:
        result = wrangler.execute(
            [
                "d1", "execute", db_name, "--remote", "--json", "--command",
                f"SELECT id, subdomain, email FROM tenants WHERE subdomain = '{_escape_sql(subdomain)}'",
            ]
        )
        tenant_rows = parse_wrangler_json(result)
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Tenant lookup failed: {e}")
        ctx.exit(1)

    if not tenant_rows:
        if output_json:
            console.print(json.dumps({"error": f"Tenant '{subdomain}' not found"}))
        else:
            error(f"Tenant '{subdomain}' not found")
        ctx.exit(1)

    tenant_data = tenant_rows[0]
    tenant_id = tenant_data["id"]

    # Check for in-progress exports
    try:
        active_list = "', '".join(ACTIVE_STATUSES)
        result = wrangler.execute(
            [
                "d1", "execute", db_name, "--remote", "--json", "--command",
                f"SELECT id, status FROM storage_exports WHERE tenant_id = '{_escape_sql(tenant_id)}' AND status IN ('{active_list}')",
            ]
        )
        active_rows = parse_wrangler_json(result)
    except WranglerError:
        active_rows = []

    if active_rows:
        existing_id = active_rows[0].get("id", "?")
        existing_status = active_rows[0].get("status", "?")
        if output_json:
            console.print(json.dumps({
                "error": "Export already in progress",
                "existing_export_id": existing_id,
                "existing_status": existing_status,
            }))
        else:
            warning(f"Export already in progress for '{subdomain}'")
            info(f"Existing export: {existing_id} (status: {existing_status})")
            info("Use 'gw export status <id>' to check progress")
        ctx.exit(1)

    # === API mode: hit the deployed endpoint with a session cookie ===
    if session:
        url = f"https://{subdomain}.grove.place/api/export/start"
        body = json.dumps({
            "includeImages": images,
            "deliveryMethod": method,
        }).encode()

        req = urllib.request.Request(url, method="POST", data=body)
        req.add_header("Content-Type", "application/json")
        req.add_header("Cookie", f"grove_session={session}")
        req.add_header("Origin", f"https://{subdomain}.grove.place")

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_data = json.loads(resp.read().decode())

            export_id = resp_data.get("exportId", "?")

            if output_json:
                console.print(json.dumps(resp_data, indent=2))
            else:
                success(f"Export started via API for '{subdomain}'")
                info(f"Export ID: {export_id}")
                info(f"Track with: gw export status {export_id}")
            return

        except urllib.error.HTTPError as e:
            resp_body = e.read().decode() if e.fp else ""
            if output_json:
                console.print(json.dumps({"error": f"API returned {e.code}", "body": resp_body}))
            else:
                error(f"API returned HTTP {e.code}")
                if resp_body:
                    try:
                        err_data = json.loads(resp_body)
                        info(f"Message: {err_data.get('userMessage', resp_body[:200])}")
                    except json.JSONDecodeError:
                        info(f"Response: {resp_body[:200]}")
            ctx.exit(1)

        except urllib.error.URLError as e:
            if output_json:
                console.print(json.dumps({"error": str(e)}))
            else:
                error(f"Could not reach API: {e}")
            ctx.exit(1)

    # === D1-direct mode: create the record, but DO must be triggered separately ===
    import uuid

    export_id = str(uuid.uuid4())
    now = int(datetime.now().timestamp())
    expires_at = now + 7 * 24 * 60 * 60  # 7 days

    query = (
        f"INSERT INTO storage_exports "
        f"(id, tenant_id, user_email, include_images, delivery_method, status, progress, created_at, expires_at) "
        f"VALUES ("
        f"'{_escape_sql(export_id)}', "
        f"'{_escape_sql(tenant_id)}', "
        f"'{_escape_sql(tenant_data.get('email', ''))}', "
        f"{1 if images else 0}, "
        f"'{_escape_sql(method)}', "
        f"'pending', 0, {now}, {expires_at})"
    )

    try:
        wrangler.execute(
            ["d1", "execute", db_name, "--remote", "--command", query]
        )
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to create export record: {e}")
        ctx.exit(1)

    if output_json:
        console.print(json.dumps({
            "export_id": export_id,
            "mode": "d1-direct",
            "status": "pending",
            "warning": "Durable Object not triggered — visit the export page or use --session to trigger via API",
        }, indent=2))
    else:
        success(f"Export record created for '{subdomain}'")
        info(f"Export ID: {export_id}")
        warning("D1-only mode: the Durable Object was NOT triggered")
        info("To trigger processing, either:")
        info("  • Use --session flag to hit the API (triggers DO automatically)")
        info("  • Visit the export page in the browser")
        info(f"Track with: gw export status {export_id}")


@export.command("download")
@click.argument("export_id")
@click.option("--write", is_flag=True, help="Confirm write operation (creates local file)")
@click.option("--output", "-o", help="Output file path (default: grove-export-<subdomain>-<date>.zip)")
@click.option(
    "--db",
    "-d",
    "database",
    default="lattice",
    help="Database alias (default: lattice)",
)
@click.pass_context
def export_download(
    ctx: click.Context,
    export_id: str,
    write: bool,
    output: str | None,
    database: str,
) -> None:
    """Download a completed export zip from R2.

    \b
    Examples:
        gw export download abc-123-def --write
        gw export download abc-123-def --write --output my-backup.zip
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)
    db_name = _resolve_database(config, database)

    if not write:
        if output_json:
            console.print(json.dumps({"error": "Download requires --write flag (creates local file)"}))
        else:
            error("Download requires --write flag")
            info("Add --write to confirm (this creates a local file)")
        ctx.exit(1)

    # Look up the export record
    query = (
        f"SELECT e.*, t.subdomain FROM storage_exports e "
        f"JOIN tenants t ON e.tenant_id = t.id "
        f"WHERE e.id = '{_escape_sql(export_id)}'"
    )

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
            console.print(json.dumps({"error": "Export not found"}))
        else:
            error(f"Export '{export_id}' not found")
        ctx.exit(1)

    row = rows[0]
    status = row.get("status")
    r2_key = row.get("r2_key")
    subdomain_val = row.get("subdomain", "unknown")

    if status != "complete":
        if output_json:
            console.print(json.dumps({"error": f"Export status is '{status}', not 'complete'"}))
        else:
            error(f"Export is not complete (status: {status})")
            if status in ACTIVE_STATUSES:
                info("Export is still in progress — check back later")
        ctx.exit(1)

    # Check expiry
    now = int(datetime.now().timestamp())
    expires_at = row.get("expires_at")
    if expires_at and expires_at < now:
        if output_json:
            console.print(json.dumps({"error": "Export has expired", "expired_at": format_timestamp(expires_at)}))
        else:
            error("Export has expired")
            info(f"Expired at: {format_timestamp(expires_at)}")
            info("Start a new export with: gw export start <subdomain> --write")
        ctx.exit(1)

    if not r2_key:
        if output_json:
            console.print(json.dumps({"error": "No R2 key found — export may not have uploaded correctly"}))
        else:
            error("No R2 key found on this export")
            info("The zip may not have uploaded correctly")
        ctx.exit(1)

    # Build output filename
    if not output:
        date_str = datetime.now().strftime("%Y-%m-%d")
        output = f"grove-export-{subdomain_val}-{date_str}.zip"

    # Download from R2
    try:
        wrangler.execute(["r2", "object", "get", "grove-exports", r2_key, "--file", output])
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to download from R2: {e}")
        ctx.exit(1)

    size = row.get("file_size_bytes")

    if output_json:
        console.print(json.dumps({
            "downloaded": output,
            "r2_key": r2_key,
            "size": size,
        }))
    else:
        success(f"Downloaded to {output}")
        if size:
            info(f"Size: {format_bytes(size)}")


@export.command("cleanup")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--dry-run", is_flag=True, help="Preview what would be cleaned up")
@click.option(
    "--db",
    "-d",
    "database",
    default="lattice",
    help="Database alias (default: lattice)",
)
@click.pass_context
def export_cleanup(
    ctx: click.Context, write: bool, dry_run: bool, database: str
) -> None:
    """Clean up expired exports (D1 records + R2 objects).

    \b
    Examples:
        gw export cleanup --write
        gw export cleanup --write --dry-run    # Preview only
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)
    db_name = _resolve_database(config, database)

    if not write and not dry_run:
        if output_json:
            console.print(json.dumps({"error": "Cleanup requires --write flag"}))
        else:
            error("Cleanup requires --write flag")
            info("Preview with: gw export cleanup --write --dry-run")
        ctx.exit(1)

    now = int(datetime.now().timestamp())

    # Find expired complete exports
    query = (
        f"SELECT id, r2_key, tenant_id FROM storage_exports "
        f"WHERE status = 'complete' AND expires_at < {now}"
    )

    try:
        result = wrangler.execute(
            ["d1", "execute", db_name, "--remote", "--json", "--command", query]
        )
        expired = parse_wrangler_json(result)
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Query failed: {e}")
        ctx.exit(1)

    if not expired:
        if output_json:
            console.print(json.dumps({"cleaned": 0, "message": "No expired exports"}))
        else:
            info("No expired exports to clean up")
        return

    if dry_run:
        if output_json:
            console.print(json.dumps({"dry_run": True, "would_clean": len(expired), "exports": expired}, indent=2))
        else:
            console.print(f"\n[bold yellow]DRY RUN[/bold yellow] — Would clean {len(expired)} expired export(s):\n")
            for exp in expired:
                console.print(f"  • {exp.get('id', '?')[:12]}... (R2: {exp.get('r2_key', 'none')})")
        return

    # Clean each expired export
    cleaned = 0
    r2_errors = 0

    for exp in expired:
        exp_id = exp.get("id")
        r2_key = exp.get("r2_key")

        # Delete R2 object if it exists
        if r2_key:
            try:
                wrangler.execute(["r2", "object", "delete", "grove-exports", r2_key])
            except WranglerError:
                r2_errors += 1

        # Update D1 status to expired
        try:
            wrangler.execute(
                [
                    "d1", "execute", db_name, "--remote", "--command",
                    f"UPDATE storage_exports SET status = 'expired' WHERE id = '{_escape_sql(exp_id)}'",
                ]
            )
            cleaned += 1
        except WranglerError:
            pass

    if output_json:
        console.print(json.dumps({"cleaned": cleaned, "r2_errors": r2_errors}))
    else:
        success(f"Cleaned {cleaned} expired export(s)")
        if r2_errors:
            warning(f"{r2_errors} R2 object(s) could not be deleted (may already be gone)")
