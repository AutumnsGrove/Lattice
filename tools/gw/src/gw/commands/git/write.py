"""Write Git commands (Tier 2 - Require --write flag)."""

import json
import os
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt
from rich.table import Table

from ...git_wrapper import Git, GitError
from ...safety.git import (
    GitSafetyConfig,
    GitSafetyError,
    check_git_safety,
    extract_issue_number,
    format_conventional_commit,
    validate_conventional_commit,
)

console = Console()


def require_write(ctx: click.Context) -> None:
    """Check that --write flag is provided."""
    write_flag = ctx.params.get("write", False)
    if not write_flag:
        console.print(
            "[yellow]This operation modifies the repository.[/yellow]\n"
            "Add [bold]--write[/bold] flag to confirm."
        )
        raise SystemExit(1)


@click.command()
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--all", "-A", "all_files", is_flag=True, help="Stage all changes")
@click.argument("paths", nargs=-1)
@click.pass_context
def add(ctx: click.Context, write: bool, all_files: bool, paths: tuple[str, ...]) -> None:
    """Stage files for commit.

    Requires --write flag.

    \b
    Examples:
        gw git add --write src/lib/auth.ts
        gw git add --write .                  # Stage all (with confirmation)
        gw git add --write --all              # Stage all including untracked
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("add", write_flag=write)
    except GitSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        # If staging all, confirm with user
        if all_files or (len(paths) == 1 and paths[0] == "."):
            status = git.status()
            total_changes = len(status.unstaged) + len(status.untracked)

            if total_changes == 0:
                console.print("[dim]No changes to stage[/dim]")
                return

            if not output_json:
                console.print(
                    f"[yellow]About to stage {total_changes} file(s)[/yellow]"
                )

        git.add(list(paths), all_files=all_files)

        if output_json:
            console.print(json.dumps({"staged": list(paths) if paths else ["all"]}))
        else:
            if all_files:
                console.print("[green]Staged all changes[/green]")
            else:
                console.print(f"[green]Staged {len(paths)} file(s)[/green]")

    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)


@click.command()
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--all", "-A", "all_files", is_flag=True, help="Unstage all files")
@click.argument("paths", nargs=-1)
@click.pass_context
def unstage(ctx: click.Context, write: bool, all_files: bool, paths: tuple[str, ...]) -> None:
    """Unstage files from the staging area.

    Requires --write flag.

    \b
    Examples:
        gw git unstage --write src/lib/auth.ts
        gw git unstage --write --all
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("unstage", write_flag=write)
    except GitSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        if all_files:
            git.execute(["reset", "HEAD"])
        else:
            if not paths:
                console.print("[yellow]No files specified. Use --all to unstage all.[/yellow]")
                raise SystemExit(1)
            git.execute(["reset", "HEAD", "--"] + list(paths))

        if output_json:
            console.print(json.dumps({"unstaged": list(paths) if paths else ["all"]}))
        else:
            console.print("[green]Files unstaged[/green]")

    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)


@click.command()
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--message", "-m", "message", help="Commit message")
@click.option("--issue", type=int, help="Link to issue number")
@click.option("--no-verify", is_flag=True, help="Skip pre-commit hooks")
@click.option("--interactive", "-i", is_flag=True, help="Interactive commit")
@click.pass_context
def commit(
    ctx: click.Context,
    write: bool,
    message: Optional[str],
    issue: Optional[int],
    no_verify: bool,
    interactive: bool,
) -> None:
    """Create a commit with Conventional Commits format.

    Requires --write flag. Enforces Conventional Commits format by default.

    \b
    Format: type(scope): description
    Types: feat, fix, docs, style, refactor, test, chore, perf, ci

    \b
    Examples:
        gw git commit --write -m "feat(auth): add OAuth2 PKCE flow"
        gw git commit --write -m "fix(ui): correct button alignment"
        gw git commit --write --interactive
        gw git commit --write -m "fix: resolve bug" --issue 348
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("commit", write_flag=write)
    except GitSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        # Check for staged changes
        status = git.status()
        if not status.staged:
            console.print("[yellow]No staged changes to commit[/yellow]")
            console.print("[dim]Use 'gw git add --write <files>' to stage changes[/dim]")
            raise SystemExit(1)

        config = GitSafetyConfig()

        # Auto-detect issue from branch name
        if issue is None and config.auto_link_issues:
            branch = git.current_branch()
            issue = extract_issue_number(branch, config)

        # Interactive mode
        if interactive or message is None:
            message = _interactive_commit(config, issue)

        # Add issue reference if not already present
        if issue and f"#{issue}" not in message:
            # Append to first line
            lines = message.split("\n")
            lines[0] = f"{lines[0]} (#{issue})"
            message = "\n".join(lines)

        # Validate conventional commit format
        valid, error = validate_conventional_commit(message, config)
        if not valid:
            console.print(f"[red]Invalid commit message:[/red] {error}")
            raise SystemExit(1)

        # Create commit
        commit_hash = git.commit(message, no_verify=no_verify)

        if output_json:
            console.print(json.dumps({
                "hash": commit_hash,
                "message": message,
                "issue": issue,
            }))
        else:
            console.print(f"[green]Committed:[/green] {message.split(chr(10))[0]}")
            console.print(f"[dim]Hash: {commit_hash[:8]}[/dim]")
            if issue:
                console.print(f"[dim]Linked to issue #{issue}[/dim]")

    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)


def _interactive_commit(config: GitSafetyConfig, issue: Optional[int]) -> str:
    """Run interactive commit message builder."""
    console.print(Panel(
        "Interactive Commit Builder",
        subtitle="Conventional Commits format",
        border_style="green",
    ))

    # Select type
    types_str = ", ".join(config.conventional_types[:7])
    console.print(f"[dim]Types: {types_str}, ...[/dim]")

    type_ = Prompt.ask(
        "Type",
        choices=config.conventional_types,
        default="feat",
    )

    # Optional scope
    scope = Prompt.ask("Scope (optional)", default="")

    # Description
    description = Prompt.ask("Description")

    # Breaking change
    breaking = Confirm.ask("Breaking change?", default=False)

    # Issue linking
    if issue:
        link_issue = Confirm.ask(f"Link to issue #{issue}?", default=True)
        if not link_issue:
            issue = None

    # Build message
    message = format_conventional_commit(
        type_=type_,
        description=description,
        scope=scope if scope else None,
        breaking=breaking,
        issue_number=issue,
    )

    console.print(f"\n[dim]Commit message:[/dim] {message}")

    if not Confirm.ask("Proceed with commit?", default=True):
        raise SystemExit(0)

    return message


@click.command()
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--set-upstream", "-u", is_flag=True, help="Set upstream tracking")
@click.option("--force", "-f", is_flag=True, help="Force push (uses --force-with-lease for safety)")
@click.option("--force-with-lease", is_flag=True, help="Force with lease (same as --force)")
@click.argument("remote", default="origin")
@click.argument("branch", required=False)
@click.pass_context
def push(
    ctx: click.Context,
    write: bool,
    set_upstream: bool,
    force: bool,
    force_with_lease: bool,
    remote: str,
    branch: Optional[str],
) -> None:
    """Push commits to remote.

    Requires --write flag. --force always uses --force-with-lease under the
    hood — gw never does a bare force push.

    \b
    Examples:
        gw git push --write
        gw git push --write -u origin feature/new-thing
        gw git push --write --force
    """
    output_json = ctx.obj.get("output_json", False)
    # --force and --force-with-lease both map to force-with-lease
    use_force_with_lease = force or force_with_lease

    try:
        check_git_safety("push", write_flag=write)
    except GitSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        current_branch = branch or git.current_branch()

        git.push(
            remote=remote,
            branch=current_branch if set_upstream else branch,
            force_with_lease=use_force_with_lease,
            set_upstream=set_upstream,
        )

        if output_json:
            console.print(json.dumps({
                "remote": remote,
                "branch": current_branch,
            }))
        else:
            console.print(f"[green]Pushed to {remote}/{current_branch}[/green]")

    except GitError as e:
        stderr = e.stderr.lower()
        # Pre-push hook failures — now detectable because execute() includes
        # subprocess stdout in the error (hooks write diagnostics there).
        if "pre-push" in stderr:
            console.print("[red]Push blocked by pre-push hook[/red]")
            if e.stderr.strip():
                console.print(f"\n{e.stderr.strip()}")
            console.print(
                "\n[dim]Fix the issues reported above, then push again.\n"
                "To bypass: git push --no-verify[/dim]"
            )
        # Remote has newer commits that need to be integrated
        elif "non-fast-forward" in stderr or "fetch first" in stderr:
            console.print("[red]Remote has newer commits[/red]")
            console.print(
                "[dim]Run 'gw git sync --write' to rebase and push, "
                "or 'gw git push --write --force-with-lease' to overwrite.[/dim]"
            )
        # Other rejection (permissions, protected branch, etc.)
        elif "rejected" in stderr or "failed to push" in stderr:
            console.print("[red]Push rejected[/red]")
            if e.stderr.strip():
                console.print(f"\n{e.stderr.strip()}")
        else:
            console.print(f"[red]Push failed:[/red] {e.stderr.strip() or e.message}")
        raise SystemExit(1)


@click.command()
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--rebase", is_flag=True, help="Use rebase instead of merge")
@click.argument("remote", default="origin")
@click.argument("branch", required=False)
@click.pass_context
def pull(
    ctx: click.Context,
    write: bool,
    rebase: bool,
    remote: str,
    branch: Optional[str],
) -> None:
    """Pull changes from remote.

    Requires --write flag.

    \b
    Examples:
        gw git pull --write
        gw git pull --write --rebase
        gw git pull --write origin main
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("pull", write_flag=write)
    except GitSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        current_branch = branch or git.current_branch()

        git.pull(remote=remote, branch=current_branch, rebase=rebase)

        if output_json:
            console.print(json.dumps({
                "remote": remote,
                "branch": current_branch,
                "rebase": rebase,
            }))
        else:
            console.print(f"[green]Pulled from {remote}/{current_branch}[/green]")
            if rebase:
                console.print("[dim]Used rebase strategy[/dim]")

    except GitError as e:
        stderr = e.stderr.lower()
        if "conflict" in stderr:
            console.print("[red]Pull failed: merge conflicts[/red]")
            console.print(
                "[dim]Resolve conflicts, then 'gw git add --write' "
                "and 'gw git commit --write'[/dim]"
            )
        elif "not possible" in stderr and "unstaged" in stderr:
            console.print("[red]Pull failed: uncommitted changes would be overwritten[/red]")
            console.print(
                "[dim]Commit or stash your changes first, then try again.[/dim]"
            )
        else:
            console.print(f"[red]Pull failed:[/red] {e.stderr.strip() or e.message}")
        raise SystemExit(1)


@click.command()
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--delete", "-d", is_flag=True, help="Delete branch")
@click.option("--from", "start_point", help="Create branch from this ref")
@click.option("--list", "-l", "list_branches", is_flag=True, help="List branches")
@click.argument("name", required=False)
@click.pass_context
def branch(
    ctx: click.Context,
    write: bool,
    delete: bool,
    start_point: Optional[str],
    list_branches: bool,
    name: Optional[str],
) -> None:
    """Create, delete, or list branches.

    Requires --write flag for create/delete.

    \b
    Examples:
        gw git branch --list                          # List branches (no --write)
        gw git branch --write feature/348-new-thing   # Create branch
        gw git branch --write --from main feature/349 # Create from ref
        gw git branch --write --delete old-branch     # Delete branch
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        # List branches (read-only)
        if list_branches or (not name and not delete):
            check_git_safety("branch_list", write_flag=True)  # Always allowed

            output = git.execute(["branch", "-a", "-v"])

            if output_json:
                branches = []
                for line in output.strip().split("\n"):
                    if line.strip():
                        is_current = line.startswith("*")
                        parts = line.lstrip("* ").split()
                        branches.append({
                            "name": parts[0],
                            "hash": parts[1] if len(parts) > 1 else "",
                            "current": is_current,
                        })
                console.print(json.dumps({"branches": branches}))
            else:
                console.print(output)
            return

        # Create or delete branch
        operation = "branch_delete" if delete else "branch_create"

        try:
            check_git_safety(operation, write_flag=write)
        except GitSafetyError as e:
            console.print(f"[red]Safety check failed:[/red] {e.message}")
            if e.suggestion:
                console.print(f"[dim]{e.suggestion}[/dim]")
            raise SystemExit(1)

        if not name:
            console.print("[yellow]Branch name required[/yellow]")
            raise SystemExit(1)

        if delete:
            git.branch_delete(name)
            if output_json:
                console.print(json.dumps({"deleted": name}))
            else:
                console.print(f"[green]Deleted branch: {name}[/green]")
        else:
            git.branch_create(name, start_point)
            if output_json:
                console.print(json.dumps({"created": name}))
            else:
                console.print(f"[green]Created branch: {name}[/green]")
                console.print(f"[dim]Switch with: gw git switch {name}[/dim]")

    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)


@click.command()
@click.argument("branch_name")
@click.option("--create", "-c", is_flag=True, help="Create branch if not exists")
@click.pass_context
def switch(ctx: click.Context, branch_name: str, create: bool) -> None:
    """Switch to a branch.

    This is a safe operation (no --write needed) unless creating.

    \b
    Examples:
        gw git switch main
        gw git switch feature/348-new-thing
        gw git switch -c new-branch   # Create and switch
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        # Switch is generally safe, but creating requires write
        if create:
            check_git_safety("checkout", write_flag=True)
        else:
            check_git_safety("branch_list", write_flag=True)  # Read-only allowed

        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        git.switch(branch_name, create=create)

        if output_json:
            console.print(json.dumps({"branch": branch_name}))
        else:
            console.print(f"[green]Switched to branch: {branch_name}[/green]")

    except GitSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)
    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)


@click.command()
@click.argument(
    "action",
    required=False,
    default=None,
    type=click.Choice(["pop", "apply", "drop", "list"], case_sensitive=False),
)
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--message", "-m", help="Stash message")
@click.option("--list", "list_stashes", is_flag=True, help="List stashes")
@click.option("--pop", is_flag=True, help="Pop most recent stash")
@click.option("--apply", "apply_stash", is_flag=True, help="Apply stash without removing")
@click.option("--drop", is_flag=True, help="Drop a stash")
@click.option("--index", type=int, default=0, help="Stash index for pop/apply/drop")
@click.pass_context
def stash(
    ctx: click.Context,
    action: Optional[str],
    write: bool,
    message: Optional[str],
    list_stashes: bool,
    pop: bool,
    apply_stash: bool,
    drop: bool,
    index: int,
) -> None:
    """Stash changes for later.

    Requires --write flag for push/pop/apply/drop. List is always safe.

    Accepts git-style positional actions (pop, apply, drop, list) as well as flags.

    \b
    Examples:
        gw git stash --list                          # List stashes
        gw git stash list                            # List stashes (positional)
        gw git stash --write                         # Stash changes
        gw git stash --write -m "WIP: auth flow"     # Stash with message
        gw git stash --write --pop                   # Pop most recent
        gw git stash --write pop                     # Pop most recent (positional)
        gw git stash --write --apply --index 2       # Apply specific stash
        gw git stash --write --drop --index 0        # Drop stash
    """
    # Map positional action to flags for unified handling
    if action:
        action_lower = action.lower()
        if action_lower == "pop":
            pop = True
        elif action_lower == "apply":
            apply_stash = True
        elif action_lower == "drop":
            drop = True
        elif action_lower == "list":
            list_stashes = True

    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        # List stashes (read-only)
        if list_stashes:
            stashes = git.stash_list()

            if output_json:
                console.print(json.dumps({"stashes": stashes}))
            else:
                if not stashes:
                    console.print("[dim]No stashes[/dim]")
                else:
                    table = Table(title="Stashes", border_style="green")
                    table.add_column("Index", style="cyan")
                    table.add_column("Description")

                    for s in stashes:
                        table.add_row(str(s["index"]), s["description"])

                    console.print(table)
            return

        # Write operations
        operation = "stash_push"
        if pop:
            operation = "stash_pop"
        elif apply_stash:
            operation = "stash_apply"
        elif drop:
            operation = "stash_drop"

        try:
            check_git_safety(operation, write_flag=write)
        except GitSafetyError as e:
            console.print(f"[red]Safety check failed:[/red] {e.message}")
            if e.suggestion:
                console.print(f"[dim]{e.suggestion}[/dim]")
            raise SystemExit(1)

        if pop:
            git.stash_pop(index)
            if output_json:
                console.print(json.dumps({"popped": index}))
            else:
                console.print(f"[green]Popped stash@{{{index}}}[/green]")
        elif apply_stash:
            git.stash_apply(index)
            if output_json:
                console.print(json.dumps({"applied": index}))
            else:
                console.print(f"[green]Applied stash@{{{index}}}[/green]")
        elif drop:
            git.stash_drop(index)
            if output_json:
                console.print(json.dumps({"dropped": index}))
            else:
                console.print(f"[green]Dropped stash@{{{index}}}[/green]")
        else:
            # SAFETY: Warn when stash is called non-interactively.
            # AI agents should NEVER stash user WIP to work around
            # sync/push failures. The user decides what happens to
            # their working tree.
            if not os.isatty(0):
                console.print(
                    "[bold red]AGENT SAFETY BLOCK:[/bold red] "
                    "Stashing is not allowed from non-interactive contexts.\n"
                    "[yellow]AI agents must NEVER stash user work to fix "
                    "push/sync conflicts.[/yellow]\n"
                    "[dim]Tell the user the operation needs a clean tree "
                    "and let them decide how to proceed.[/dim]"
                )
                raise SystemExit(1)

            # Push to stash
            git.stash_push(message)
            if output_json:
                console.print(json.dumps({"stashed": True, "message": message}))
            else:
                console.print("[green]Stashed changes[/green]")
                if message:
                    console.print(f"[dim]Message: {message}[/dim]")

    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)


@click.command("cherry-pick")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("commits", nargs=-1, required=True)
@click.pass_context
def cherry_pick(ctx: click.Context, write: bool, commits: tuple[str, ...]) -> None:
    """Cherry-pick one or more commits onto the current branch.

    Requires --write flag. Validates that commits exist before applying.

    \b
    Examples:
        gw git cherry-pick --write abc1234
        gw git cherry-pick --write abc1234 def5678
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("commit", write_flag=write)
    except GitSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        # Validate commits exist before attempting cherry-pick
        for commit_ref in commits:
            try:
                git.execute(["cat-file", "-t", commit_ref])
            except GitError:
                console.print(f"[red]Commit not found:[/red] {commit_ref}")
                console.print("[dim]Verify the commit hash exists with: gw git log[/dim]")
                raise SystemExit(1)

        # Apply cherry-pick
        applied = []
        for commit_ref in commits:
            git.execute(["cherry-pick", commit_ref])
            short_hash = git.execute(["rev-parse", "--short", commit_ref]).strip()
            applied.append(short_hash)

        if output_json:
            console.print(json.dumps({
                "cherry_picked": applied,
                "count": len(applied),
            }))
        else:
            for h in applied:
                console.print(f"[green]Cherry-picked:[/green] {h}")
            if len(applied) > 1:
                console.print(f"[dim]Applied {len(applied)} commits[/dim]")

    except GitError as e:
        stderr = e.stderr.lower()
        if "conflict" in stderr:
            console.print("[red]Cherry-pick conflict[/red]")
            console.print(
                "[dim]Resolve conflicts, then:\n"
                "  git add <resolved-files>\n"
                "  git cherry-pick --continue\n\n"
                "Or abort with: git cherry-pick --abort[/dim]"
            )
        else:
            console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)
