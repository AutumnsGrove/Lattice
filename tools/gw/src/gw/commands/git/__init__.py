"""Git command group for Grove Wrap."""

import click

from .read import diff, log, show, status, blame
from .write import add, branch, cherry_pick, commit, pull, push, stash, switch, unstage
from .danger import merge, push_force, rebase, reset
from .shortcuts import amend, fast, save, sync, undo, wip
from .workflows import prep, ship
from .worktree import worktree


@click.group()
def git() -> None:
    """Git operations with safety guards.

    Grove-aware git operations with Conventional Commits enforcement,
    protected branch detection, and agent-safe defaults.

    \b
    Safety Tiers:
    - READ:      status, log, diff, blame, show (always safe)
    - WRITE:     commit, push, pull, add, branch (require --write)
    - DANGEROUS: force-push, reset, rebase (require --write --force)
    - PROTECTED: Force-push to main/production (always blocked)

    \b
    Examples:
        gw git status              # Always safe
        gw git log --limit 5       # Always safe
        gw git commit --write -m "feat: add feature"
        gw git push --write
    """
    pass


# Register read commands
git.add_command(status)
git.add_command(log)
git.add_command(diff)
git.add_command(blame)
git.add_command(show)

# Register write commands
git.add_command(add)
git.add_command(commit)
git.add_command(pull)
git.add_command(push)
git.add_command(branch)
git.add_command(stash)
git.add_command(switch)
git.add_command(unstage)
git.add_command(cherry_pick, name="cherry-pick")

# Register dangerous commands
git.add_command(reset)
git.add_command(rebase)
git.add_command(merge)
git.add_command(push_force, name="force-push")

# Register Grove shortcuts
git.add_command(save)
git.add_command(sync)
git.add_command(wip)
git.add_command(undo)
git.add_command(amend)
git.add_command(fast)

# Register workflow commands
git.add_command(ship)
git.add_command(prep)

# Register worktree commands
git.add_command(worktree)
