"""Dev tools command group - unified development workflows."""

import click

from .server import dev_start, dev_stop, dev_restart, dev_logs
from .test import test
from .build import build
from .check import check
from .lint import lint
from .ci import ci


@click.group()
@click.pass_context
def dev(ctx: click.Context) -> None:
    """Development tools for the monorepo.

    Run development servers, tests, builds, and checks with smart
    package detection. Commands auto-detect the current package
    from your working directory.

    \b
    Examples:
        gw dev start                 # Start dev server for current package
        gw dev test                  # Run tests for current package
        gw dev build --all           # Build all packages
        gw dev check                 # Type check current package
    """
    pass


# Server commands
dev.add_command(dev_start, name="start")
dev.add_command(dev_stop, name="stop")
dev.add_command(dev_restart, name="restart")
dev.add_command(dev_logs, name="logs")

# Standalone commands (also registered at top level)
dev.add_command(test)
dev.add_command(build)
dev.add_command(check)
dev.add_command(lint)
dev.add_command(ci)
