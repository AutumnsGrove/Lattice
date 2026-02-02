"""Auth command - manage Cloudflare authentication."""

import click

from ..config import GWConfig
from ..ui import error, success, warning
from ..wrangler import Wrangler, WranglerError


@click.group()
def auth() -> None:
    """Manage Cloudflare authentication."""
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
