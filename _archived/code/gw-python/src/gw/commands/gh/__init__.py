"""GitHub command group for Grove Wrap."""

import click

from ...ui import GROVE_COLORS, CozyGroup
from .pr import pr
from .issue import issue
from .run import run
from .api import api, rate_limit
from .project import project

GH_CATEGORIES = {
    "core": (
        "\U0001f4cb Core",
        GROVE_COLORS["river_cyan"],
        [
            ("pr", "Pull request operations"),
            ("issue", "Issue operations"),
        ],
    ),
    "ci": (
        "\u26a1 CI/CD",
        GROVE_COLORS["leaf_yellow"],
        [
            ("run", "Workflow run operations"),
        ],
    ),
    "management": (
        "\U0001f527 Management",
        GROVE_COLORS["bark_brown"],
        [
            ("project", "Project board operations"),
            ("api", "Raw GitHub API requests"),
            ("rate-limit", "Check API rate limit status"),
        ],
    ),
}


@click.group(cls=CozyGroup, cozy_categories=GH_CATEGORIES)
def gh() -> None:
    """GitHub operations with safety guards."""
    pass


# Register subcommand groups
gh.add_command(pr)
gh.add_command(issue)
gh.add_command(run)
gh.add_command(api)
gh.add_command(rate_limit)
gh.add_command(project)
