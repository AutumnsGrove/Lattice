"""Git command group for Grove Wrap."""

import click

from ...ui import GROVE_COLORS, CozyGroup

from .read import diff, log, show, status, blame, fetch, reflog, shortlog
from .write import add, branch, checkout, cherry_pick, commit, pull, push, stash, switch, unstage, restore, clean
from .danger import merge, push_force, rebase, reset
from .shortcuts import amend, fast, save, sync, undo, wip
from .workflows import prep, pr_prep, ship
from .worktree import worktree
from .remote import remote
from .tag import tag
from .config_cmd import git_config

# Command categories for the categorized help display
GIT_CATEGORIES = {
    "read": (
        "\U0001f4d6 Read (Always Safe)",
        GROVE_COLORS["forest_green"],
        [
            ("status", "Show working tree status"),
            ("log", "Show commit log"),
            ("diff", "Show changes between commits"),
            ("show", "Show commit details"),
            ("blame", "Show line-by-line authorship"),
            ("fetch", "Fetch refs from remote"),
            ("reflog", "Show reference log"),
            ("shortlog", "Summarize commits by author"),
        ],
    ),
    "write": (
        "\u270f\ufe0f  Write (Require --write)",
        GROVE_COLORS["leaf_yellow"],
        [
            ("add", "Stage files for commit"),
            ("commit", "Create a commit"),
            ("push", "Push commits to remote"),
            ("pull", "Pull changes from remote"),
            ("branch", "Create, delete, or list branches"),
            ("switch", "Switch to a branch"),
            ("checkout", "Switch to a branch (alias)"),
            ("stash", "Stash changes for later"),
            ("unstage", "Unstage files"),
            ("restore", "Restore working tree files"),
            ("cherry-pick", "Cherry-pick commits"),
        ],
    ),
    "dangerous": (
        "\U0001f525 Dangerous (--write --force)",
        "red",
        [
            ("force-push", "Force push to remote"),
            ("reset", "Reset HEAD to a state"),
            ("rebase", "Rebase onto another branch"),
            ("merge", "Merge a branch"),
            ("clean", "Remove untracked files"),
        ],
    ),
    "shortcuts": (
        "\u26a1 Shortcuts",
        GROVE_COLORS["river_cyan"],
        [
            ("save", "Quick save: stage all + WIP commit"),
            ("wip", "WIP commit (skips hooks)"),
            ("fast", "Fast commit + push (skips hooks)"),
            ("sync", "Fetch, rebase, and push"),
            ("undo", "Undo last commit (keep staged)"),
            ("amend", "Amend last commit message"),
        ],
    ),
    "workflows": (
        "\U0001f680 Workflows",
        GROVE_COLORS["blossom_pink"],
        [
            ("ship", "Format, check, commit, and push"),
            ("prep", "Preflight check (dry run)"),
            ("pr-prep", "PR preparation report"),
        ],
    ),
    "management": (
        "\U0001f527 Management",
        GROVE_COLORS["bark_brown"],
        [
            ("worktree", "Manage git worktrees"),
            ("remote", "Manage remote repositories"),
            ("tag", "Manage tags"),
            ("config", "View and set git config"),
        ],
    ),
}


@click.group(cls=CozyGroup, cozy_categories=GIT_CATEGORIES)
def git() -> None:
    """Git operations with safety guards."""
    pass


# Register read commands
git.add_command(status)
git.add_command(log)
git.add_command(diff)
git.add_command(blame)
git.add_command(show)
git.add_command(fetch)
git.add_command(reflog)
git.add_command(shortlog)

# Register write commands
git.add_command(add)
git.add_command(commit)
git.add_command(pull)
git.add_command(push)
git.add_command(branch)
git.add_command(stash)
git.add_command(switch)
git.add_command(checkout)
git.add_command(unstage)
git.add_command(cherry_pick, name="cherry-pick")
git.add_command(restore)
git.add_command(clean)

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
git.add_command(pr_prep, name="pr-prep")

# Register worktree commands
git.add_command(worktree)

# Register group commands
git.add_command(remote)
git.add_command(tag)
git.add_command(git_config)
