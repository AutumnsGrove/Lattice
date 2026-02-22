"""Warden API gateway command group for Grove Wrap."""

import click

from ...ui import GROVE_COLORS, CozyGroup
from .status import status
from .test_service import test_service
from .agent import agent
from .logs import logs

# User-Agent for Warden HTTP requests.
# Cloudflare Bot Fight Mode blocks Python-urllib's default UA.
GW_USER_AGENT = "gw-cli/1.0 (Grove Wrap)"

WARDEN_CATEGORIES = {
    "monitoring": (
        "\U0001f4ca Monitoring",
        GROVE_COLORS["river_cyan"],
        [
            ("status", "Health check against warden.grove.place"),
            ("test", "Test connectivity through Warden"),
            ("logs", "Recent audit log entries"),
        ],
    ),
    "agents": (
        "\U0001f916 Agents",
        GROVE_COLORS["forest_green"],
        [
            ("agent", "Agent registration and management"),
        ],
    ),
}


@click.group(cls=CozyGroup, cozy_categories=WARDEN_CATEGORIES)
def warden() -> None:
    """Warden API gateway management."""
    pass


warden.add_command(status)
warden.add_command(test_service, name="test")
warden.add_command(agent)
warden.add_command(logs)
