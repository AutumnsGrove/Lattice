"""GitHub command group for Grove Wrap."""

import click

from .pr import pr
from .issue import issue
from .run import run
from .api import api, rate_limit


@click.group()
def gh() -> None:
    """GitHub operations with safety guards.

    Grove-aware GitHub CLI wrapper with rate limit awareness,
    project board integration, and agent-safe defaults.

    \b
    Safety Tiers:
    - READ:        list, view, status (always safe)
    - WRITE:       create, comment, edit (require --write)
    - DESTRUCTIVE: merge, close, delete (require --write, may need confirmation)

    \b
    Examples:
        gw gh pr list              # List open PRs
        gw gh pr view 123          # View PR details
        gw gh pr create --write    # Create a PR
        gw gh issue list           # List open issues
    """
    pass


# Register subcommand groups
gh.add_command(pr)
gh.add_command(issue)
gh.add_command(run)
gh.add_command(api)
gh.add_command(rate_limit)
