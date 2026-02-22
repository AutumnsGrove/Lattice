"""Dangerous Git commands (Tier 3 - Require --write --force, blocked in agent mode)."""

import json
from typing import Optional

import click
from rich.panel import Panel
from rich.prompt import Confirm, Prompt

from ...git_wrapper import Git, GitError
from ...safety.git import (
    GitSafetyConfig,
    GitSafetyError,
    check_git_safety,
    is_agent_mode,
    is_protected_branch,
)
from ...ui import console, action, git_error, hint, not_a_repo, safety_error


@click.command("force-push")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--force", is_flag=True, help="Confirm dangerous operation")
@click.argument("remote", default="origin")
@click.argument("branch", required=False)
@click.pass_context
def push_force(
    ctx: click.Context,
    write: bool,
    force: bool,
    remote: str,
    branch: Optional[str],
) -> None:
    """Force push to remote (DANGEROUS).

    Requires --write --force flags. BLOCKED in agent mode.
    Cannot force-push to protected branches (main, production, staging).

    \b
    Examples:
        gw git force-push --write --force origin feature/my-branch
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        if not git.is_repo():
            not_a_repo()

        target_branch = branch or git.current_branch()

        try:
            check_git_safety(
                "push_force",
                write_flag=write,
                force_flag=force,
                target_branch=target_branch,
            )
        except GitSafetyError as e:
            safety_error(e.message, e.suggestion)
            raise SystemExit(1)

        # Additional warning and confirmation
        if not output_json:
            console.print(Panel(
                f"[bold red]WARNING: Force Push[/bold red]\n\n"
                f"This will overwrite remote history on [cyan]{remote}/{target_branch}[/cyan].\n"
                f"Any commits on the remote not in your local branch will be lost.",
                title="Dangerous Operation",
                border_style="red",
            ))

            # Show what will be overwritten
            ahead, behind = git.get_commits_ahead_behind(target_branch)
            if behind > 0:
                console.print(
                    f"\n[yellow]Remote has {behind} commit(s) not in your local branch[/yellow]"
                )

            confirm_text = f"FORCE PUSH {target_branch}"
            user_input = Prompt.ask(f"Type '{confirm_text}' to confirm")
            if user_input != confirm_text:
                console.print("[dim]Aborted[/dim]")
                raise SystemExit(0)

        git.push(remote=remote, branch=target_branch, force=True)

        if output_json:
            console.print(json.dumps({
                "remote": remote,
                "branch": target_branch,
                "force": True,
            }))
        else:
            action("Force pushed to", f"{remote}/{target_branch}")

    except GitError as e:
        git_error(e.message)
        raise SystemExit(1)


@click.command()
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--force", is_flag=True, help="Confirm dangerous operation")
@click.option("--hard", is_flag=True, help="Hard reset (discards changes)")
@click.option("--soft", is_flag=True, help="Soft reset (keeps changes staged)")
@click.option("--mixed", is_flag=True, help="Mixed reset (default, unstages)")
@click.argument("ref", default="HEAD")
@click.pass_context
def reset(
    ctx: click.Context,
    write: bool,
    force: bool,
    hard: bool,
    soft: bool,
    mixed: bool,
    ref: str,
) -> None:
    """Reset current HEAD to specified state (DANGEROUS for --hard).

    Hard reset requires --write --force and is BLOCKED in agent mode.
    Soft/mixed reset requires --write only.

    \b
    Examples:
        gw git reset --write HEAD~1                    # Mixed reset (undo commit)
        gw git reset --write --soft HEAD~1             # Soft reset (keep staged)
        gw git reset --write --force --hard HEAD~3     # Hard reset (DANGEROUS)
    """
    output_json = ctx.obj.get("output_json", False)

    # Determine mode
    if hard:
        mode = "hard"
        operation = "reset_hard"
    elif soft:
        mode = "soft"
        operation = "reset_mixed"  # Soft is still tier 2
    else:
        mode = "mixed"
        operation = "reset_mixed"

    try:
        git = Git()

        if not git.is_repo():
            not_a_repo()

        try:
            check_git_safety(operation, write_flag=write, force_flag=force)
        except GitSafetyError as e:
            safety_error(e.message, e.suggestion)
            raise SystemExit(1)

        # For hard reset, show what will be lost and confirm
        if hard and not output_json:
            console.print(Panel(
                f"[bold red]WARNING: Hard Reset[/bold red]\n\n"
                f"This will discard all uncommitted changes and reset to [cyan]{ref}[/cyan].\n"
                f"Any work not committed will be permanently lost.",
                title="Dangerous Operation",
                border_style="red",
            ))

            # Show commits that will be "lost" (still recoverable via reflog)
            commits = git.log(limit=10)
            ref_hash = git.execute(["rev-parse", ref]).strip()

            lost_commits = []
            for c in commits:
                if c.hash == ref_hash:
                    break
                lost_commits.append(c)

            if lost_commits:
                console.print(f"\n[yellow]The following {len(lost_commits)} commit(s) will be reset:[/yellow]")
                for c in lost_commits:
                    console.print(f"  [dim]{c.short_hash}[/dim] {c.subject}")

            confirm_text = "RESET HARD"
            user_input = Prompt.ask(f"Type '{confirm_text}' to confirm")
            if user_input != confirm_text:
                console.print("[dim]Aborted[/dim]")
                raise SystemExit(0)

        git.reset(ref, mode)

        if output_json:
            console.print(json.dumps({
                "ref": ref,
                "mode": mode,
            }))
        else:
            action("Reset to", f"{ref} ({mode})")

    except GitError as e:
        git_error(e.message)
        raise SystemExit(1)


@click.command()
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--force", is_flag=True, help="Confirm dangerous operation")
@click.option("--continue", "continue_rebase", is_flag=True, help="Continue rebase")
@click.option("--abort", "abort_rebase", is_flag=True, help="Abort rebase")
@click.argument("onto", required=False)
@click.pass_context
def rebase(
    ctx: click.Context,
    write: bool,
    force: bool,
    continue_rebase: bool,
    abort_rebase: bool,
    onto: Optional[str],
) -> None:
    """Rebase current branch onto another (DANGEROUS).

    Requires --write --force flags. BLOCKED in agent mode.
    Rewrites commit history - use with caution on shared branches.

    \b
    Examples:
        gw git rebase --write --force main        # Rebase onto main
        gw git rebase --write --continue          # Continue after resolving conflicts
        gw git rebase --write --abort             # Abort in-progress rebase
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        if not git.is_repo():
            not_a_repo()

        # Continue/abort are safer operations
        if continue_rebase or abort_rebase:
            check_git_safety("rebase", write_flag=write, force_flag=True)
        else:
            if not onto:
                console.print("[yellow]Branch to rebase onto required[/yellow]")
                raise SystemExit(1)

            try:
                check_git_safety("rebase", write_flag=write, force_flag=force)
            except GitSafetyError as e:
                safety_error(e.message, e.suggestion)
                raise SystemExit(1)

            # Warning and confirmation
            if not output_json:
                current_branch = git.current_branch()

                console.print(Panel(
                    f"[bold yellow]WARNING: Rebase[/bold yellow]\n\n"
                    f"This will replay commits from [cyan]{current_branch}[/cyan] onto [cyan]{onto}[/cyan].\n"
                    f"Commit history will be rewritten.",
                    title="Dangerous Operation",
                    border_style="yellow",
                ))

                confirm_text = "REBASE"
                user_input = Prompt.ask(f"Type '{confirm_text}' to confirm")
                if user_input != confirm_text:
                    console.print("[dim]Aborted[/dim]")
                    raise SystemExit(0)

        git.rebase(
            onto=onto or "",
            continue_rebase=continue_rebase,
            abort_rebase=abort_rebase,
        )

        if output_json:
            action_name = "continued" if continue_rebase else "aborted" if abort_rebase else "rebased"
            console.print(json.dumps({
                "action": action_name,
                "onto": onto,
            }))
        else:
            if continue_rebase:
                action("Rebase", "continued")
            elif abort_rebase:
                action("Rebase", "aborted")
            else:
                action("Rebased onto", onto)

    except GitError as e:
        git_error(e.message)
        if "conflict" in e.stderr.lower():
            hint("Resolve conflicts, then 'gw git rebase --write --continue'")
        raise SystemExit(1)


@click.command()
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--force", is_flag=True, help="Confirm dangerous operation (for conflicts)")
@click.option("--no-ff", is_flag=True, help="Create merge commit even for fast-forward")
@click.option("--squash", is_flag=True, help="Squash commits")
@click.option("--abort", "abort_merge", is_flag=True, help="Abort merge")
@click.argument("branch")
@click.pass_context
def merge(
    ctx: click.Context,
    write: bool,
    force: bool,
    no_ff: bool,
    squash: bool,
    abort_merge: bool,
    branch: str,
) -> None:
    """Merge a branch into current branch.

    Requires --write flag. If conflicts would occur, requires --force.
    BLOCKED in agent mode when targeting protected branches.

    \b
    Examples:
        gw git merge --write feature/new-thing
        gw git merge --write --no-ff feature/bugfix
        gw git merge --write --squash feature/large-feature
        gw git merge --write --abort   # Abort merge in progress
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        if not git.is_repo():
            not_a_repo()

        current_branch = git.current_branch()

        # Check if merging into protected branch in agent mode
        config = GitSafetyConfig()
        if is_agent_mode() and is_protected_branch(current_branch, config):
            git_error(f"Cannot merge into protected branch '{current_branch}' in agent mode")
            raise SystemExit(1)

        try:
            check_git_safety("merge", write_flag=write, force_flag=force)
        except GitSafetyError as e:
            safety_error(e.message, e.suggestion)
            raise SystemExit(1)

        if abort_merge:
            git.merge(branch="", abort_merge=True)
            if output_json:
                console.print(json.dumps({"action": "aborted"}))
            else:
                action("Merge", "aborted")
            return

        # Check for potential conflicts
        if not output_json:
            # Dry-run to check for conflicts
            try:
                git.execute(["merge", "--no-commit", "--no-ff", branch])
                git.execute(["merge", "--abort"])
            except GitError:
                console.print(Panel(
                    f"[bold yellow]WARNING: Merge Conflicts[/bold yellow]\n\n"
                    f"Merging [cyan]{branch}[/cyan] into [cyan]{current_branch}[/cyan] will cause conflicts.\n"
                    f"You will need to resolve them manually.",
                    title="Merge Warning",
                    border_style="yellow",
                ))

                if not force:
                    console.print(
                        "[dim]Add --force to proceed with conflicting merge[/dim]"
                    )
                    raise SystemExit(1)

                if not Confirm.ask("Proceed with merge?", default=False):
                    console.print("[dim]Aborted[/dim]")
                    raise SystemExit(0)

        git.merge(branch, no_ff=no_ff, squash=squash)

        if output_json:
            console.print(json.dumps({
                "merged": branch,
                "into": current_branch,
                "squash": squash,
            }))
        else:
            action("Merged", f"{branch} into {current_branch}")
            if squash:
                hint("Squashed - don't forget to commit")

    except GitError as e:
        git_error(e.message)
        if "conflict" in e.stderr.lower():
            conflicted = git.get_conflicted_files()
            if conflicted:
                console.print("\n[yellow]Conflicted files:[/yellow]")
                for f in conflicted:
                    console.print(f"  {f}")
            hint("\nResolve conflicts, then commit. Or 'gw git merge --write --abort'")
        raise SystemExit(1)
