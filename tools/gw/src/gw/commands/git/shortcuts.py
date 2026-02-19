"""Grove Git shortcuts - convenient aliases for common workflows."""

import json
from datetime import datetime
from typing import Optional

import click
from rich.panel import Panel

from ...git_wrapper import Git, GitError
from ...safety.git import (
    GitSafetyConfig,
    GitSafetyError,
    check_git_safety,
    format_conventional_commit,
    validate_conventional_commit,
)
from ...ui import console, action, git_error, hint, not_a_repo, safety_error


@click.command()
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--message", "-m", help="Commit message (conventional format)")
@click.argument("remote", default="origin")
@click.pass_context
def fast(ctx: click.Context, write: bool, message: Optional[str], remote: str) -> None:
    """Fast commit and push: skip all hooks.

    Requires --write flag. This is a speed shortcut that:
    1. Stages all changes
    2. Commits with --no-verify (skips pre-commit hooks)
    3. Pushes with --no-verify (skips pre-push hooks)

    Still enforces Conventional Commits format for message validation.

    \b
    Examples:
        gw git fast --write -m "fix(api): quick hotfix"
        gw git fast --write -m "chore: checkpoint"
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("save", write_flag=write)
    except GitSafetyError as e:
        safety_error(e.message, e.suggestion)
        raise SystemExit(1)

    if not message:
        console.print("[yellow]Commit message required for fast mode[/yellow]")
        hint("Use: gw git fast --write -m \"type(scope): description\"")
        raise SystemExit(1)

    # Still validate conventional commit format
    config = GitSafetyConfig()
    valid, error = validate_conventional_commit(message, config)
    if not valid:
        console.print(f"[red]Invalid commit message:[/red] {error}")
        raise SystemExit(1)

    try:
        git = Git()

        if not git.is_repo():
            not_a_repo()

        # Check for changes
        status = git.status()
        if status.is_clean:
            console.print("[dim]No changes to commit[/dim]")
            return

        current_branch = git.current_branch()

        if not output_json:
            console.print(Panel(
                f"[bold yellow]Fast Mode[/bold yellow] (hooks skipped)\n\n"
                f"Branch: [cyan]{current_branch}[/cyan]\n"
                f"Remote: [cyan]{remote}[/cyan]",
                title="Quick Commit & Push",
                border_style="yellow",
            ))

        # Step 1: Stage all
        git.add([], all_files=True)
        total_staged = len(status.staged) + len(status.unstaged) + len(status.untracked)
        if not output_json:
            hint(f"Staged {total_staged} file(s)")

        # Step 2: Commit with --no-verify
        commit_hash = git.commit(message, no_verify=True)
        if not output_json:
            hint(f"Committed: {message}")

        # Step 3: Push with --no-verify to skip pre-push hooks
        git.execute(["push", "--no-verify", remote, current_branch])

        if output_json:
            console.print(json.dumps({
                "hash": commit_hash,
                "message": message,
                "remote": remote,
                "branch": current_branch,
                "hooks_skipped": True,
            }))
        else:
            action("Done!", f"Pushed to {remote}/{current_branch}")
            hint(f"Commit: {commit_hash[:8]}")
            hint("All hooks were skipped")

    except GitError as e:
        git_error(e.message)
        raise SystemExit(1)


@click.command()
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--message", "-m", help="Custom commit message")
@click.pass_context
def save(ctx: click.Context, write: bool, message: Optional[str]) -> None:
    """Quick save: stage all changes and create a WIP commit.

    Requires --write flag. This is a convenience shortcut that:
    1. Stages all changes (including untracked)
    2. Creates a commit with a WIP message

    \b
    Examples:
        gw git save --write                            # Stage all + WIP commit
        gw git save --write -m "checkpoint before refactor"
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("save", write_flag=write)
    except GitSafetyError as e:
        safety_error(e.message, e.suggestion)
        raise SystemExit(1)

    try:
        git = Git()

        if not git.is_repo():
            not_a_repo()

        # Check for changes
        status = git.status()
        if status.is_clean:
            console.print("[dim]No changes to save[/dim]")
            return

        # Stage all changes
        git.add([], all_files=True)

        # Create commit message
        if not message:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
            message = f"wip: work in progress ({timestamp})"

        # Commit
        commit_hash = git.commit(message)

        if output_json:
            console.print(json.dumps({
                "hash": commit_hash,
                "message": message,
                "files_staged": len(status.staged) + len(status.unstaged) + len(status.untracked),
            }))
        else:
            total_changes = len(status.staged) + len(status.unstaged) + len(status.untracked)
            action("Staged", f"{total_changes} file(s)")
            action("Committed", message)
            hint(f"Hash: {commit_hash[:8]}")

    except GitError as e:
        git_error(e.message)
        raise SystemExit(1)


@click.command()
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("remote", default="origin")
@click.argument("base_branch", default="main")
@click.pass_context
def sync(ctx: click.Context, write: bool, remote: str, base_branch: str) -> None:
    """Sync with remote: fetch, rebase on base branch, and push.

    Requires --write flag. This is a convenience shortcut that:
    1. Fetches from remote
    2. Rebases current branch onto base branch
    3. Pushes to remote

    \b
    Examples:
        gw git sync --write                  # Sync with origin/main
        gw git sync --write origin develop   # Sync with origin/develop
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("sync", write_flag=write)
    except GitSafetyError as e:
        safety_error(e.message, e.suggestion)
        raise SystemExit(1)

    try:
        git = Git()

        if not git.is_repo():
            not_a_repo()

        # SAFETY: Refuse to sync with a dirty working tree.
        # Rebasing with unstaged changes can silently lose work.
        # The user must decide how to handle their WIP — never auto-stash.
        status = git.status()
        if status.unstaged or status.untracked:
            dirty_count = len(status.unstaged) + len(status.untracked)
            console.print(
                f"[red]Cannot sync: working tree has {dirty_count} "
                f"uncommitted file(s)[/red]"
            )
            console.print(
                "\n[yellow]Your options:[/yellow]\n"
                "  1. Use a worktree (best):   [dim]gw git worktree create --write -n my-feature[/dim]\n"
                "     Then sync main separately — no conflicts, no stashing.\n"
                "  2. Commit WIP to a branch:  [dim]gw git save --write[/dim]\n"
                "  3. Stash manually:          [dim]gw git stash --write[/dim]\n"
                "  4. Discard changes:         [dim]git checkout -- .[/dim]\n"
                "\n[dim]gw will never auto-stash your work. "
                "You decide what happens to it.[/dim]"
            )
            raise SystemExit(1)

        current_branch = git.current_branch()

        if not output_json:
            console.print(Panel(
                f"Syncing [cyan]{current_branch}[/cyan] with [cyan]{remote}/{base_branch}[/cyan]",
                title="Sync",
                border_style="green",
            ))

        # Step 1: Fetch
        if not output_json:
            console.print("[dim]Fetching from remote...[/dim]")
        git.fetch(remote, prune=True)

        # Step 2: Rebase
        if not output_json:
            console.print(f"[dim]Rebasing onto {remote}/{base_branch}...[/dim]")
        git.rebase(f"{remote}/{base_branch}")

        # Step 3: Push
        # Try regular push first — after rebasing local-only commits onto
        # the fetched remote, the result is often a fast-forward. Only fall
        # back to --force-with-lease when needed (e.g. a feature branch
        # with rewritten commits that was already pushed).
        if not output_json:
            console.print("[dim]Pushing to remote...[/dim]")
        try:
            git.push(remote=remote, branch=current_branch)
        except GitError as push_err:
            push_stderr = push_err.stderr.lower()
            if "non-fast-forward" in push_stderr or "fetch first" in push_stderr:
                if not output_json:
                    console.print(
                        "[dim]Fast-forward not possible, retrying with --force-with-lease...[/dim]"
                    )
                git.push(remote=remote, branch=current_branch, force_with_lease=True)
            else:
                raise

        if output_json:
            console.print(json.dumps({
                "branch": current_branch,
                "remote": remote,
                "base": base_branch,
                "synced": True,
            }))
        else:
            action("Synced", f"branch is up to date with {remote}/{base_branch}")

    except GitError as e:
        stderr = e.stderr.lower()
        if "conflict" in stderr:
            git_error("Rebase conflict")
            hint("Resolve conflicts, then 'gw git rebase --write --continue'")
        elif "pre-push" in stderr:
            git_error("Sync completed but push blocked by pre-push hook")
            if e.stderr.strip():
                console.print(f"\n{e.stderr.strip()}")
            hint("Fix the issues above, then 'gw git push --write'.\nTo bypass: git push --no-verify")
        else:
            git_error(e.message)
        raise SystemExit(1)


@click.command()
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.pass_context
def wip(ctx: click.Context, write: bool) -> None:
    """Create a WIP commit that skips pre-commit hooks.

    Requires --write flag. This is useful for quick checkpoints
    when you don't want to run linting/tests.

    The commit message includes [skip ci] to prevent CI runs.

    \b
    Examples:
        gw git wip --write
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("wip", write_flag=write)
    except GitSafetyError as e:
        safety_error(e.message, e.suggestion)
        raise SystemExit(1)

    try:
        git = Git()

        if not git.is_repo():
            not_a_repo()

        # Check for staged changes
        status = git.status()
        if not status.staged and not status.unstaged and not status.untracked:
            console.print("[dim]No changes to commit[/dim]")
            return

        # Stage all if nothing is staged
        if not status.staged:
            git.add([], all_files=True)

        # Create WIP commit with --no-verify
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        message = f"wip: {timestamp} [skip ci]"

        commit_hash = git.commit(message, no_verify=True)

        if output_json:
            console.print(json.dumps({
                "hash": commit_hash,
                "message": message,
            }))
        else:
            action("Committed", message)
            hint(f"Hash: {commit_hash[:8]}")
            hint("Pre-commit hooks skipped")

    except GitError as e:
        git_error(e.message)
        raise SystemExit(1)


@click.command()
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.pass_context
def undo(ctx: click.Context, write: bool) -> None:
    """Undo the last commit, keeping changes staged.

    Requires --write flag. This is a soft reset that:
    1. Undoes the last commit
    2. Keeps all changes staged for recommitting

    \b
    Examples:
        gw git undo --write
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("undo", write_flag=write)
    except GitSafetyError as e:
        safety_error(e.message, e.suggestion)
        raise SystemExit(1)

    try:
        git = Git()

        if not git.is_repo():
            not_a_repo()

        # Get the commit we're about to undo
        commits = git.log(limit=1)
        if not commits:
            console.print("[yellow]No commits to undo[/yellow]")
            return

        last_commit = commits[0]

        # Soft reset to undo commit but keep changes staged
        git.reset("HEAD~1", mode="soft")

        if output_json:
            console.print(json.dumps({
                "undone": {
                    "hash": last_commit.hash,
                    "subject": last_commit.subject,
                },
            }))
        else:
            action("Undid commit", last_commit.subject)
            hint(f"Hash: {last_commit.short_hash}")
            hint("Changes are staged, ready to recommit")

    except GitError as e:
        git_error(e.message)
        raise SystemExit(1)


@click.command()
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--message", "-m", help="New commit message")
@click.pass_context
def amend(ctx: click.Context, write: bool, message: Optional[str]) -> None:
    """Amend the last commit message.

    Requires --write flag. If no message is provided, uses the existing message.

    \b
    Examples:
        gw git amend --write -m "feat(auth): add OAuth2 session refresh"
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("amend", write_flag=write)
    except GitSafetyError as e:
        safety_error(e.message, e.suggestion)
        raise SystemExit(1)

    try:
        git = Git()

        if not git.is_repo():
            not_a_repo()

        # Get current commit message if not provided
        if not message:
            commits = git.log(limit=1)
            if not commits:
                console.print("[yellow]No commits to amend[/yellow]")
                return
            message = commits[0].subject
            if commits[0].body:
                message += "\n\n" + commits[0].body

        # Amend the commit
        git.execute(["commit", "--amend", "-m", message])

        # Get new hash
        new_hash = git.execute(["rev-parse", "HEAD"]).strip()

        if output_json:
            console.print(json.dumps({
                "hash": new_hash,
                "message": message.split("\n")[0],
            }))
        else:
            action("Amended", message.split(chr(10))[0])
            hint(f"New hash: {new_hash[:8]}")

    except GitError as e:
        git_error(e.message)
        raise SystemExit(1)
