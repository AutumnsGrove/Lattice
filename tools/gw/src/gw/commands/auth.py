"""Auth command - manage Cloudflare and OAuth client authentication."""

import json
import secrets
from typing import Optional

import click

from ..config import GWConfig
from ..ui import console, create_table, error, info, success, warning
from ..wrangler import Wrangler, WranglerError


@click.group()
def auth() -> None:
    """Manage authentication.

    Cloudflare authentication and OAuth client management.

    \b
    Examples:
        gw auth check                      # Check Cloudflare auth
        gw auth login                      # Login to Cloudflare
        gw auth client list                # List OAuth clients
        gw auth client create --write      # Create new client
    """
    pass


@auth.command()
@click.pass_context
def check(ctx: click.Context) -> None:
    """Check if Wrangler is authenticated.

    Returns exit code 0 if authenticated, 1 if not.
    """
    config: GWConfig = ctx.obj["config"]
    wrangler = Wrangler(config)

    try:
        whoami_data = wrangler.whoami()
        account = whoami_data.get("account", {})
        account_name = account.get("name", "Unknown")

        success(f"Authenticated as {account_name}")
        ctx.exit(0)
    except WranglerError as e:
        error("Not authenticated")
        if ctx.obj["verbose"]:
            error(f"Details: {e}")
        ctx.exit(1)


@auth.command()
@click.pass_context
def login(ctx: click.Context) -> None:
    """Log in to Cloudflare.

    Opens browser to authenticate with Cloudflare.
    """
    config: GWConfig = ctx.obj["config"]
    wrangler = Wrangler(config)

    try:
        wrangler.login()
        success("Successfully logged in to Cloudflare")
    except WranglerError as e:
        error("Login failed")
        if ctx.obj["verbose"]:
            error(f"Details: {e}")
        ctx.exit(1)


# ============================================================================
# OAuth Client Management (Heartwood/GroveAuth)
# ============================================================================


@auth.group()
def client() -> None:
    """OAuth client management for Heartwood.

    Manage OAuth clients registered with GroveAuth (Heartwood).
    These commands interact with the groveauth D1 database.

    \b
    Examples:
        gw auth client list
        gw auth client create --write --name "My App"
        gw auth client info CLIENT_ID
    """
    pass


@client.command("list")
@click.pass_context
def client_list(ctx: click.Context) -> None:
    """List all OAuth clients.

    Always safe - no --write flag required.

    \b
    Examples:
        gw auth client list
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Query groveauth database for clients
    db_name = config.databases.get("groveauth")
    if not db_name:
        if output_json:
            console.print(json.dumps({"error": "groveauth database not configured"}))
        else:
            error("groveauth database not configured in ~/.grove/gw.toml")
        raise SystemExit(1)

    try:
        result = wrangler.execute([
            "d1", "execute", db_name.name, "--remote", "--json",
            "--command", "SELECT client_id, name, redirect_uri, created_at FROM oauth_clients ORDER BY created_at DESC",
        ])
        data = json.loads(result)
        clients = data[0].get("results", []) if data else []
    except (WranglerError, json.JSONDecodeError, IndexError) as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to list clients: {e}")
        return

    if output_json:
        console.print(json.dumps({"clients": clients}, indent=2))
        return

    console.print("\n[bold green]OAuth Clients[/bold green]\n")

    if not clients:
        info("No OAuth clients found")
        console.print("[dim]Create one with: gw auth client create --write --name 'My App'[/dim]")
        return

    client_table = create_table(title=f"{len(clients)} Clients")
    client_table.add_column("Client ID", style="cyan")
    client_table.add_column("Name", style="magenta")
    client_table.add_column("Redirect URI", style="dim")
    client_table.add_column("Created", style="yellow")

    for c in clients:
        client_id = c.get("client_id", "unknown")
        client_table.add_row(
            client_id[:16] + "..." if len(client_id) > 16 else client_id,
            c.get("name", "unknown"),
            c.get("redirect_uri", "-")[:30] + "..." if len(c.get("redirect_uri", "")) > 30 else c.get("redirect_uri", "-"),
            c.get("created_at", "-")[:10] if c.get("created_at") else "-",
        )

    console.print(client_table)


@client.command("info")
@click.argument("client_id")
@click.pass_context
def client_info(ctx: click.Context, client_id: str) -> None:
    """Show OAuth client details.

    Always safe - no --write flag required.

    \b
    Examples:
        gw auth client info abc123
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    db_name = config.databases.get("groveauth")
    if not db_name:
        if output_json:
            console.print(json.dumps({"error": "groveauth database not configured"}))
        else:
            error("groveauth database not configured")
        raise SystemExit(1)

    try:
        result = wrangler.execute([
            "d1", "execute", db_name.name, "--remote", "--json",
            "--command", f"SELECT * FROM oauth_clients WHERE client_id = '{client_id}'",
        ])
        data = json.loads(result)
        clients = data[0].get("results", []) if data else []
    except (WranglerError, json.JSONDecodeError, IndexError) as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to get client: {e}")
        return

    if not clients:
        if output_json:
            console.print(json.dumps({"error": "Client not found", "client_id": client_id}))
        else:
            warning(f"Client '{client_id}' not found")
        return

    client_data = clients[0]

    if output_json:
        console.print(json.dumps(client_data, indent=2))
        return

    console.print(f"\n[bold green]OAuth Client: {client_data.get('name', 'Unknown')}[/bold green]\n")
    console.print(f"Client ID: [cyan]{client_data.get('client_id', 'unknown')}[/cyan]")
    console.print(f"Redirect URI: {client_data.get('redirect_uri', '-')}")
    console.print(f"Created: {client_data.get('created_at', '-')}")
    console.print(f"Updated: {client_data.get('updated_at', '-')}")


@client.command("create")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--name", "-n", required=True, help="Client name")
@click.option("--redirect-uri", "-r", required=True, help="OAuth redirect URI")
@click.pass_context
def client_create(
    ctx: click.Context,
    write: bool,
    name: str,
    redirect_uri: str,
) -> None:
    """Create a new OAuth client.

    Requires --write flag.

    \b
    Examples:
        gw auth client create --write --name "My App" --redirect-uri "http://localhost:3000/callback"
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    if not write:
        if output_json:
            console.print(json.dumps({"error": "Client create requires --write flag"}))
        else:
            error("Client create requires --write flag")
            info("Add --write to confirm this operation")
        raise SystemExit(1)

    db_name = config.databases.get("groveauth")
    if not db_name:
        if output_json:
            console.print(json.dumps({"error": "groveauth database not configured"}))
        else:
            error("groveauth database not configured")
        raise SystemExit(1)

    # Generate client credentials
    client_id = secrets.token_urlsafe(24)
    client_secret = secrets.token_urlsafe(32)

    try:
        wrangler.execute([
            "d1", "execute", db_name.name, "--remote", "--json",
            "--command", f"""
                INSERT INTO oauth_clients (client_id, client_secret, name, redirect_uri, created_at, updated_at)
                VALUES ('{client_id}', '{client_secret}', '{name}', '{redirect_uri}', datetime('now'), datetime('now'))
            """,
        ])
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to create client: {e}")
        raise SystemExit(1)

    if output_json:
        console.print(json.dumps({
            "client_id": client_id,
            "client_secret": client_secret,
            "name": name,
            "redirect_uri": redirect_uri,
        }, indent=2))
    else:
        success(f"Created OAuth client '{name}'")
        console.print(f"\n[bold]Client ID:[/bold] [cyan]{client_id}[/cyan]")
        console.print(f"[bold]Client Secret:[/bold] [yellow]{client_secret}[/yellow]")
        console.print("\n[dim]⚠️  Save the client secret now - it cannot be retrieved later![/dim]")


@client.command("rotate")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("client_id")
@click.pass_context
def client_rotate(ctx: click.Context, write: bool, client_id: str) -> None:
    """Rotate an OAuth client's secret.

    Requires --write flag. Generates a new client secret.

    \b
    Examples:
        gw auth client rotate --write abc123
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    if not write:
        if output_json:
            console.print(json.dumps({"error": "Secret rotation requires --write flag"}))
        else:
            error("Secret rotation requires --write flag")
        raise SystemExit(1)

    db_name = config.databases.get("groveauth")
    if not db_name:
        if output_json:
            console.print(json.dumps({"error": "groveauth database not configured"}))
        else:
            error("groveauth database not configured")
        raise SystemExit(1)

    # Generate new secret
    new_secret = secrets.token_urlsafe(32)

    try:
        wrangler.execute([
            "d1", "execute", db_name.name, "--remote", "--json",
            "--command", f"""
                UPDATE oauth_clients
                SET client_secret = '{new_secret}', updated_at = datetime('now')
                WHERE client_id = '{client_id}'
            """,
        ])
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to rotate secret: {e}")
        raise SystemExit(1)

    if output_json:
        console.print(json.dumps({
            "client_id": client_id,
            "client_secret": new_secret,
            "rotated": True,
        }))
    else:
        success(f"Rotated secret for client {client_id}")
        console.print(f"\n[bold]New Client Secret:[/bold] [yellow]{new_secret}[/yellow]")
        console.print("\n[dim]⚠️  Save the new secret now - it cannot be retrieved later![/dim]")


@client.command("delete")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--force", is_flag=True, help="Confirm destructive operation")
@click.argument("client_id")
@click.pass_context
def client_delete(ctx: click.Context, write: bool, force: bool, client_id: str) -> None:
    """Delete an OAuth client.

    Requires --write --force flags.

    \b
    Examples:
        gw auth client delete --write --force abc123
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    if not write:
        if output_json:
            console.print(json.dumps({"error": "Client delete requires --write flag"}))
        else:
            error("Client delete requires --write flag")
        raise SystemExit(1)

    if not force:
        if output_json:
            console.print(json.dumps({"error": "Client delete requires --force flag"}))
        else:
            error("Client delete requires --force flag")
            warning("This will invalidate all tokens for this client!")
        raise SystemExit(1)

    db_name = config.databases.get("groveauth")
    if not db_name:
        if output_json:
            console.print(json.dumps({"error": "groveauth database not configured"}))
        else:
            error("groveauth database not configured")
        raise SystemExit(1)

    try:
        wrangler.execute([
            "d1", "execute", db_name.name, "--remote", "--json",
            "--command", f"DELETE FROM oauth_clients WHERE client_id = '{client_id}'",
        ])
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to delete client: {e}")
        raise SystemExit(1)

    if output_json:
        console.print(json.dumps({"client_id": client_id, "deleted": True}))
    else:
        success(f"Deleted OAuth client {client_id}")
