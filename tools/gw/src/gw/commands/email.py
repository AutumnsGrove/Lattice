"""Email commands - test and manage Cloudflare Email Routing."""

import json
from typing import Optional

import click

from ..config import GWConfig
from ..ui import console, create_table, error, info, success, warning
from ..wrangler import Wrangler, WranglerError


@click.group()
@click.pass_context
def email(ctx: click.Context) -> None:
    """Email routing operations.

    Test and inspect Cloudflare Email Routing configuration.

    \b
    Examples:
        gw email status            # Check email routing status
        gw email test --write      # Send a test email
    """
    pass


@email.command("status")
@click.option("--zone", "-z", help="Zone name or ID (default: auto-detect)")
@click.pass_context
def email_status(ctx: click.Context, zone: Optional[str]) -> None:
    """Show email routing status.

    Always safe - no --write flag required.

    \b
    Examples:
        gw email status
        gw email status --zone grove.ink
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Email routing status requires Cloudflare API
    # Wrangler doesn't have direct email commands, so we use the API

    try:
        # Check if email worker is deployed
        result = wrangler.execute(["tail", "--format=json", "grove-email", "--once"], use_json=False)
        worker_active = True
    except WranglerError:
        worker_active = False

    status_data = {
        "email_worker": {
            "name": "grove-email",
            "active": worker_active,
        },
        "note": "Full email routing status requires Cloudflare dashboard",
        "dashboard_url": "https://dash.cloudflare.com/?to=/:account/:zone/email/routing",
    }

    if output_json:
        console.print(json.dumps(status_data, indent=2))
        return

    console.print("\n[bold green]Email Routing Status[/bold green]\n")

    status_table = create_table()
    status_table.add_column("Component", style="cyan")
    status_table.add_column("Status")

    worker_status = "[green]● Active[/green]" if worker_active else "[dim]○ Not Found[/dim]"
    status_table.add_row("Email Worker (grove-email)", worker_status)

    console.print(status_table)
    console.print(f"\n[dim]Full status: {status_data['dashboard_url']}[/dim]")


@email.command("test")
@click.option("--write", is_flag=True, help="Confirm sending test email")
@click.option("--to", "-t", "to_email", required=True, help="Recipient email address")
@click.option("--subject", "-s", default="Grove Email Test", help="Email subject")
@click.option("--body", "-b", default="This is a test email from Grove.", help="Email body")
@click.pass_context
def email_test(
    ctx: click.Context,
    write: bool,
    to_email: str,
    subject: str,
    body: str,
) -> None:
    """Send a test email.

    Requires --write flag.

    \b
    Examples:
        gw email test --write --to test@example.com
        gw email test --write --to dev@grove.ink --subject "Test" --body "Hello!"
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)

    if not write:
        if output_json:
            console.print(json.dumps({"error": "Email test requires --write flag"}))
        else:
            error("Email test requires --write flag")
            info("Add --write to send the test email")
        raise SystemExit(1)

    # This would typically invoke a worker endpoint or API to send test email
    # For now, we'll provide instructions

    if output_json:
        console.print(json.dumps({
            "to": to_email,
            "subject": subject,
            "status": "not_implemented",
            "note": "Test email sending requires grove-email worker endpoint",
        }))
    else:
        warning("Test email sending not yet implemented")
        console.print("\n[dim]To test email routing:[/dim]")
        console.print("1. Configure Email Routing in Cloudflare dashboard")
        console.print("2. Deploy grove-email worker")
        console.print(f"3. Send email to: {to_email}")


@email.command("rules")
@click.option("--zone", "-z", help="Zone name or ID")
@click.pass_context
def email_rules(ctx: click.Context, zone: Optional[str]) -> None:
    """List email routing rules.

    Always safe - no --write flag required.

    \b
    Examples:
        gw email rules
        gw email rules --zone grove.ink
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)

    # Email routing rules require Cloudflare API
    # This is a placeholder showing how rules would be displayed

    rules_data = {
        "note": "Email routing rules must be viewed in Cloudflare dashboard",
        "dashboard_url": "https://dash.cloudflare.com/?to=/:account/:zone/email/routing/routes",
    }

    if output_json:
        console.print(json.dumps(rules_data, indent=2))
        return

    console.print("\n[bold green]Email Routing Rules[/bold green]\n")
    info("Email routing rules are managed in the Cloudflare dashboard")
    console.print(f"\n[dim]{rules_data['dashboard_url']}[/dim]")
