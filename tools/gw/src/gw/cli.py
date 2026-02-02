"""Main CLI entry point for Grove Wrap."""

import click

from .commands import auth, health, status
from .config import GWConfig


@click.group()
@click.option(
    "--json",
    "output_json",
    is_flag=True,
    help="Output machine-readable JSON",
)
@click.option(
    "--verbose",
    is_flag=True,
    help="Enable verbose debug output",
)
@click.pass_context
def main(ctx: click.Context, output_json: bool, verbose: bool) -> None:
    """Grove Wrap - A friendly fence around Wrangler's garden.

    A safety layer for Cloudflare operations with database protection,
    configuration management, and helpful terminal output.
    """
    # Ensure we have a context object
    if ctx.obj is None:
        ctx.obj = {}

    # Load configuration
    ctx.obj["config"] = GWConfig.load()
    ctx.obj["output_json"] = output_json
    ctx.obj["verbose"] = verbose


# Register command groups
main.add_command(status.status)
main.add_command(health.health)
main.add_command(auth.auth)


if __name__ == "__main__":
    main()
