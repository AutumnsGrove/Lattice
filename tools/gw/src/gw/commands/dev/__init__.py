"""Dev tools command group - unified development workflows."""

import click

from ...ui import GROVE_COLORS, CozyGroup
from .server import dev_start, dev_stop, dev_restart, dev_logs
from .test import test
from .build import build
from .check import check
from .lint import lint
from .ci import ci
from .reinstall import reinstall
from .format import fmt

DEV_CATEGORIES = {
    "server": (
        "\U0001f5a5\ufe0f  Dev Server",
        GROVE_COLORS["river_cyan"],
        [
            ("start", "Start dev server for current package"),
            ("stop", "Stop a running dev server"),
            ("restart", "Restart a dev server"),
            ("logs", "Show dev server logs"),
        ],
    ),
    "quality": (
        "\u2705 Quality",
        GROVE_COLORS["forest_green"],
        [
            ("test", "Run tests"),
            ("check", "Run type checking"),
            ("lint", "Lint code"),
            ("fmt", "Format code"),
        ],
    ),
    "build": (
        "\U0001f4e6 Build & Ship",
        GROVE_COLORS["leaf_yellow"],
        [
            ("build", "Build packages"),
            ("ci", "Run full CI pipeline locally"),
        ],
    ),
    "tools": (
        "\U0001f527 Tools",
        GROVE_COLORS["bark_brown"],
        [
            ("reinstall", "Reinstall gw as a UV tool"),
        ],
    ),
}


@click.group(cls=CozyGroup, cozy_categories=DEV_CATEGORIES, cozy_show_safety=False)
@click.pass_context
def dev(ctx: click.Context) -> None:
    """Development tools for the monorepo."""
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
dev.add_command(fmt)
dev.add_command(ci)

# Tool management
dev.add_command(reinstall)
