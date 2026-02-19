"""Worktree commands for simplified multi-branch development."""

import json
import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Optional

import click
from rich.table import Table

from ...ui import console, success, error, info, warning, is_interactive, safety_error
from ...gh_wrapper import GitHub, GitHubError
from ...safety.git import GitSafetyError, check_git_safety

# Worktree directory name (inside repo, gitignored)
WORKTREE_DIR = ".gw-worktrees"


def get_repo_root() -> Path:
    """Get the git repository root."""
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise click.ClickException("Not in a git repository")
    return Path(result.stdout.strip())


def get_worktree_base() -> Path:
    """Get the base directory for gw-managed worktrees."""
    return get_repo_root() / WORKTREE_DIR


def ensure_worktree_dir_exists() -> Path:
    """Ensure the worktree directory exists and is gitignored."""
    base = get_worktree_base()
    base.mkdir(exist_ok=True)

    # Ensure it's gitignored
    gitignore = get_repo_root() / ".gitignore"
    if gitignore.exists():
        content = gitignore.read_text()
        if WORKTREE_DIR not in content:
            with open(gitignore, "a") as f:
                f.write(f"\n# gw-managed worktrees\n{WORKTREE_DIR}/\n")
            info(f"Added {WORKTREE_DIR}/ to .gitignore")

    return base


def resolve_ref(ref: str) -> tuple[str, str, str]:
    """Resolve a reference to a branch name and worktree name.

    Args:
        ref: PR number (920), issue ref (#450), or branch name

    Returns:
        Tuple of (branch_name, worktree_name, ref_type)
    """
    # PR number (just digits)
    if ref.isdigit():
        pr_number = int(ref)
        try:
            gh = GitHub()
            pr = gh.pr_view(pr_number)
            return pr.head_branch, f"pr-{pr_number}", "pr"
        except GitHubError as e:
            raise click.ClickException(f"Could not find PR #{pr_number}: {e.message}")

    # Issue reference (#450)
    if ref.startswith("#") and ref[1:].isdigit():
        issue_number = ref[1:]
        branch_name = f"issue-{issue_number}"
        return branch_name, f"issue-{issue_number}", "issue"

    # Branch name - sanitize for directory name
    safe_name = re.sub(r"[^a-zA-Z0-9_-]", "-", ref)
    return ref, safe_name, "branch"


def get_existing_worktrees() -> list[dict]:
    """Get list of existing git worktrees."""
    result = subprocess.run(
        ["git", "worktree", "list", "--porcelain"],
        capture_output=True,
        text=True,
    )

    worktrees = []
    current = {}

    for line in result.stdout.strip().split("\n"):
        if not line:
            if current:
                worktrees.append(current)
                current = {}
            continue

        if line.startswith("worktree "):
            current["path"] = line[9:]
        elif line.startswith("HEAD "):
            current["head"] = line[5:]
        elif line.startswith("branch "):
            current["branch"] = line[7:].replace("refs/heads/", "")
        elif line == "detached":
            current["detached"] = True
        elif line == "bare":
            current["bare"] = True

    if current:
        worktrees.append(current)

    return worktrees


@click.group()
def worktree() -> None:
    """Manage git worktrees with ease.

    Worktrees let you work on multiple branches simultaneously without
    stashing or losing context. gw manages them in .gw-worktrees/ for
    easy cleanup.

    \b
    Examples:
        gw git worktree create 920       # Create worktree for PR #920
        gw git worktree create #450      # Create worktree for issue-450 branch
        gw git worktree list             # List all worktrees
        gw git worktree remove 920       # Remove and clean up
    """
    pass


@worktree.command("create")
@click.argument("ref")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--new", "-n", is_flag=True, help="Create new branch if it doesn't exist")
@click.option("--no-install", is_flag=True, help="Skip dependency installation")
@click.pass_context
def worktree_create(ctx: click.Context, ref: str, write: bool, new: bool, no_install: bool) -> None:
    """Create a worktree for a PR, issue, or branch.

    REF can be:
    - A PR number (920) - looks up the PR's branch
    - An issue ref (#450) - uses issue-450 branch
    - A branch name (feature/foo)

    Automatically installs dependencies (pnpm install) unless --no-install.

    \b
    Examples:
        gw git worktree create --write 920
        gw git worktree create --write #450 --new
        gw git worktree create --write feature/auth
        gw git worktree create --write feature/auth --no-install
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("worktree_create", write_flag=write)
    except GitSafetyError as e:
        safety_error(e.message, e.suggestion)
        raise SystemExit(1)

    branch_name, worktree_name, ref_type = resolve_ref(ref)

    base = ensure_worktree_dir_exists()
    worktree_path = base / worktree_name

    if worktree_path.exists():
        if output_json:
            console.print(json.dumps({"error": "Worktree already exists", "path": str(worktree_path)}))
        else:
            warning(f"Worktree already exists at {worktree_path}")
            info(f"Use: cd {worktree_path}")
        raise SystemExit(1)

    # Check if branch exists
    branch_exists = subprocess.run(
        ["git", "rev-parse", "--verify", f"refs/heads/{branch_name}"],
        capture_output=True,
    ).returncode == 0

    # Also check remote
    remote_exists = subprocess.run(
        ["git", "rev-parse", "--verify", f"refs/remotes/origin/{branch_name}"],
        capture_output=True,
    ).returncode == 0

    if not branch_exists and not remote_exists:
        if new:
            # Create new branch with worktree
            info(f"Creating new branch '{branch_name}'...")
            result = subprocess.run(
                ["git", "worktree", "add", "-b", branch_name, str(worktree_path)],
                capture_output=True,
                text=True,
            )
        else:
            if output_json:
                console.print(json.dumps({"error": f"Branch '{branch_name}' not found", "hint": "Use --new to create it"}))
            else:
                error(f"Branch '{branch_name}' not found")
                info("Use --new to create it, or check the branch name")
            raise SystemExit(1)
    else:
        # Fetch remote branch if needed
        if remote_exists and not branch_exists:
            info(f"Fetching remote branch '{branch_name}'...")
            subprocess.run(["git", "fetch", "origin", branch_name], capture_output=True)

        result = subprocess.run(
            ["git", "worktree", "add", str(worktree_path), branch_name],
            capture_output=True,
            text=True,
        )

    if result.returncode != 0:
        if output_json:
            console.print(json.dumps({"error": result.stderr.strip()}))
        else:
            error(f"Failed to create worktree: {result.stderr.strip()}")
        raise SystemExit(1)

    # Auto-install dependencies
    deps_installed = False
    if not no_install:
        package_json = worktree_path / "package.json"
        if package_json.exists():
            if not output_json:
                info("Installing dependencies (pnpm install)...")
            install_result = subprocess.run(
                ["pnpm", "install", "--frozen-lockfile"],
                capture_output=True,
                text=True,
                cwd=worktree_path,
            )
            if install_result.returncode == 0:
                deps_installed = True
                if not output_json:
                    success("Dependencies installed")
            else:
                # Try without frozen lockfile
                install_result = subprocess.run(
                    ["pnpm", "install"],
                    capture_output=True,
                    text=True,
                    cwd=worktree_path,
                )
                if install_result.returncode == 0:
                    deps_installed = True
                    if not output_json:
                        success("Dependencies installed")
                else:
                    if not output_json:
                        warning("Could not install dependencies — run pnpm install manually")

    if output_json:
        console.print(json.dumps({
            "created": True,
            "path": str(worktree_path),
            "branch": branch_name,
            "ref_type": ref_type,
            "deps_installed": deps_installed,
        }))
    else:
        success(f"Created worktree for {ref_type} at:")
        console.print(f"  [cyan]{worktree_path}[/cyan]")
        console.print()
        info(f"Branch: {branch_name}")
        console.print()
        console.print("[dim]To enter:[/dim]")
        console.print(f"  cd {worktree_path}")
        console.print()
        console.print("[dim]Or open in VS Code:[/dim]")
        console.print(f"  code {worktree_path}")


@worktree.command("list")
@click.pass_context
def worktree_list(ctx: click.Context) -> None:
    """List all worktrees.

    Shows both gw-managed worktrees and any others.
    """
    output_json = ctx.obj.get("output_json", False)

    worktrees = get_existing_worktrees()
    base = get_worktree_base()

    if output_json:
        data = []
        for wt in worktrees:
            is_managed = str(base) in wt.get("path", "")
            data.append({
                "path": wt.get("path"),
                "branch": wt.get("branch"),
                "head": wt.get("head"),
                "managed": is_managed,
            })
        console.print(json.dumps(data, indent=2))
        return

    if not worktrees:
        info("No worktrees found")
        return

    table = Table(title="Git Worktrees", border_style="green")
    table.add_column("Path", style="cyan")
    table.add_column("Branch", style="green")
    table.add_column("Type", style="dim")

    for wt in worktrees:
        path = wt.get("path", "")
        branch = wt.get("branch", "")

        if wt.get("bare"):
            wt_type = "bare"
        elif str(base) in path:
            wt_type = "gw-managed"
        elif path == str(get_repo_root()):
            wt_type = "main"
        else:
            wt_type = "external"

        # Shorten path for display
        display_path = path
        if str(base) in path:
            display_path = path.replace(str(base), f"./{WORKTREE_DIR}")

        table.add_row(display_path, branch or "(detached)", wt_type)

    console.print(table)


@worktree.command("cd")
@click.argument("ref")
@click.pass_context
def worktree_cd(ctx: click.Context, ref: str) -> None:
    """Print the path to a worktree (for shell cd).

    Usage: cd $(gw git worktree cd 920)

    \b
    Examples:
        cd $(gw git worktree cd 920)
        cd $(gw git worktree cd feature-auth)
    """
    _, worktree_name, _ = resolve_ref(ref)
    base = get_worktree_base()
    worktree_path = base / worktree_name

    if not worktree_path.exists():
        # Try to find by partial match
        if base.exists():
            for p in base.iterdir():
                if worktree_name in p.name:
                    print(p)
                    return

        error(f"Worktree not found: {worktree_name}")
        raise SystemExit(1)

    # Just print the path - no formatting for shell use
    print(worktree_path)


@worktree.command("open")
@click.argument("ref")
@click.option("--editor", "-e", default="code", help="Editor command (default: code)")
@click.pass_context
def worktree_open(ctx: click.Context, ref: str, editor: str) -> None:
    """Open a worktree in VS Code (or other editor).

    \b
    Examples:
        gw git worktree open 920
        gw git worktree open 920 --editor cursor
    """
    _, worktree_name, _ = resolve_ref(ref)
    base = get_worktree_base()
    worktree_path = base / worktree_name

    if not worktree_path.exists():
        error(f"Worktree not found: {worktree_name}")
        info(f"Create it first: gw git worktree create --write {ref}")
        raise SystemExit(1)

    result = subprocess.run([editor, str(worktree_path)])

    if result.returncode == 0:
        success(f"Opened {worktree_path} in {editor}")
    else:
        error(f"Failed to open with {editor}")


@worktree.command("remove")
@click.argument("ref")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--force", is_flag=True, help="Force remove even with uncommitted changes")
@click.pass_context
def worktree_remove(ctx: click.Context, ref: str, write: bool, force: bool) -> None:
    """Remove a worktree and clean up.

    This removes the worktree directory and cleans up git refs.

    \b
    Examples:
        gw git worktree remove --write 920
        gw git worktree remove --write --force 920
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("worktree_remove", write_flag=write, force_flag=force)
    except GitSafetyError as e:
        safety_error(e.message, e.suggestion)
        raise SystemExit(1)

    _, worktree_name, _ = resolve_ref(ref)
    base = get_worktree_base()
    worktree_path = base / worktree_name

    if not worktree_path.exists():
        if output_json:
            console.print(json.dumps({"error": "Worktree not found"}))
        else:
            error(f"Worktree not found: {worktree_name}")
        raise SystemExit(1)

    # Remove using git worktree remove
    cmd = ["git", "worktree", "remove", str(worktree_path)]
    if force:
        cmd.append("--force")

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        if "contains modified or untracked files" in result.stderr:
            if output_json:
                console.print(json.dumps({"error": "Worktree has uncommitted changes", "hint": "Use --force"}))
            else:
                error("Worktree has uncommitted changes")
                info("Use --force to remove anyway, or commit/stash your changes first")
            raise SystemExit(1)
        else:
            if output_json:
                console.print(json.dumps({"error": result.stderr.strip()}))
            else:
                error(f"Failed to remove: {result.stderr.strip()}")
            raise SystemExit(1)

    # Double-check directory is gone
    if worktree_path.exists():
        shutil.rmtree(worktree_path)

    if output_json:
        console.print(json.dumps({"removed": worktree_name}))
    else:
        success(f"Removed worktree: {worktree_name}")


@worktree.command("prune")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--merged", is_flag=True, help="Only remove worktrees for merged PRs/branches")
@click.pass_context
def worktree_prune(ctx: click.Context, write: bool, merged: bool) -> None:
    """Remove stale worktrees.

    Removes worktrees that reference branches that no longer exist.
    With --merged, also removes worktrees for branches that have been merged.

    \b
    Examples:
        gw git worktree prune --write
        gw git worktree prune --write --merged
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("worktree_prune", write_flag=write)
    except GitSafetyError as e:
        safety_error(e.message, e.suggestion)
        raise SystemExit(1)

    # First, run git worktree prune to clean up stale refs
    result = subprocess.run(
        ["git", "worktree", "prune"],
        capture_output=True,
        text=True,
    )

    removed = []
    base = get_worktree_base()

    if merged and base.exists():
        # Get list of merged branches
        merged_result = subprocess.run(
            ["git", "branch", "--merged", "main"],
            capture_output=True,
            text=True,
        )
        merged_branches = set(
            b.strip().lstrip("* ")
            for b in merged_result.stdout.strip().split("\n")
            if b.strip() and not b.strip().startswith("*")
        )

        # Check each managed worktree
        for worktree_dir in base.iterdir():
            if not worktree_dir.is_dir():
                continue

            # Try to determine the branch
            worktrees = get_existing_worktrees()
            for wt in worktrees:
                if wt.get("path") == str(worktree_dir):
                    branch = wt.get("branch", "")
                    if branch in merged_branches:
                        # Remove this worktree
                        subprocess.run(
                            ["git", "worktree", "remove", "--force", str(worktree_dir)],
                            capture_output=True,
                        )
                        if worktree_dir.exists():
                            shutil.rmtree(worktree_dir)
                        removed.append(worktree_dir.name)

    if output_json:
        console.print(json.dumps({"pruned": removed}))
    else:
        if removed:
            success(f"Pruned {len(removed)} worktree(s):")
            for name in removed:
                console.print(f"  - {name}")
        else:
            info("No stale worktrees to prune")


@worktree.command("clean")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--force", is_flag=True, help="Force remove even with uncommitted changes")
@click.pass_context
def worktree_clean(ctx: click.Context, write: bool, force: bool) -> None:
    """Remove ALL gw-managed worktrees.

    Nuclear option: removes the entire .gw-worktrees directory.

    \b
    Examples:
        gw git worktree clean --write
        gw git worktree clean --write --force
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("worktree_clean", write_flag=write, force_flag=force)
    except GitSafetyError as e:
        safety_error(e.message, e.suggestion)
        raise SystemExit(1)

    base = get_worktree_base()

    if not base.exists():
        if output_json:
            console.print(json.dumps({"cleaned": 0}))
        else:
            info("No gw-managed worktrees to clean")
        return

    # Confirm if interactive and not forced
    if not output_json and is_interactive() and not force:
        from rich.prompt import Confirm
        worktree_count = len([d for d in base.iterdir() if d.is_dir()])
        if not Confirm.ask(f"Remove all {worktree_count} gw-managed worktrees?", default=False):
            console.print("[dim]Aborted[/dim]")
            raise SystemExit(0)

    # Remove each worktree properly
    removed = []
    for worktree_dir in list(base.iterdir()):
        if not worktree_dir.is_dir():
            continue

        cmd = ["git", "worktree", "remove", str(worktree_dir)]
        if force:
            cmd.append("--force")

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0 and force:
            # Force delete the directory anyway
            shutil.rmtree(worktree_dir, ignore_errors=True)

        removed.append(worktree_dir.name)

    # Clean up the base directory if empty
    if base.exists() and not any(base.iterdir()):
        base.rmdir()

    # Prune any stale refs
    subprocess.run(["git", "worktree", "prune"], capture_output=True)

    if output_json:
        console.print(json.dumps({"cleaned": len(removed), "worktrees": removed}))
    else:
        success(f"Cleaned {len(removed)} worktree(s)")


@worktree.command("status")
@click.pass_context
def worktree_status(ctx: click.Context) -> None:
    """Show status of all gw-managed worktrees.

    Displays branch, dirty state, and ahead/behind counts for each worktree.
    This is a read-only command (no --write needed).

    \b
    Examples:
        gw git worktree status
    """
    output_json = ctx.obj.get("output_json", False)

    base = get_worktree_base()
    worktrees = get_existing_worktrees()

    if not worktrees:
        if output_json:
            console.print(json.dumps([]))
        else:
            info("No worktrees found")
        return

    statuses = []

    for wt in worktrees:
        path = wt.get("path", "")
        branch = wt.get("branch", "")
        is_main = path == str(get_repo_root())
        is_managed = str(base) in path

        # Get dirty state and ahead/behind
        dirty_count = 0
        ahead = 0
        behind = 0

        try:
            status_result = subprocess.run(
                ["git", "status", "--porcelain"],
                capture_output=True,
                text=True,
                cwd=path,
            )
            if status_result.returncode == 0:
                lines = [l for l in status_result.stdout.strip().split("\n") if l]
                dirty_count = len(lines)

            # Get ahead/behind
            ab_result = subprocess.run(
                ["git", "rev-list", "--left-right", "--count",
                 f"origin/{branch}...{branch}"],
                capture_output=True,
                text=True,
                cwd=path,
            )
            if ab_result.returncode == 0:
                parts = ab_result.stdout.strip().split()
                if len(parts) >= 2:
                    behind = int(parts[0])
                    ahead = int(parts[1])
        except Exception:
            pass

        entry = {
            "path": path,
            "branch": branch,
            "type": "main" if is_main else ("gw-managed" if is_managed else "external"),
            "dirty": dirty_count,
            "ahead": ahead,
            "behind": behind,
        }
        statuses.append(entry)

    if output_json:
        console.print(json.dumps(statuses, indent=2))
        return

    table = Table(title="Worktree Status", border_style="green")
    table.add_column("Worktree", style="cyan")
    table.add_column("Branch", style="green")
    table.add_column("State", style="yellow")
    table.add_column("Sync", style="dim")

    for s in statuses:
        # Display path
        display_path = s["path"]
        if str(base) in display_path:
            display_path = display_path.replace(str(base), f"./{WORKTREE_DIR}")
        if s["type"] == "main":
            display_path = f"{display_path} (main)"

        # State column
        if s["dirty"] > 0:
            state = f"[yellow]{s['dirty']} changed[/yellow]"
        else:
            state = "[green]clean[/green]"

        # Sync column
        sync_parts = []
        if s["ahead"] > 0:
            sync_parts.append(f"[green]+{s['ahead']}[/green]")
        if s["behind"] > 0:
            sync_parts.append(f"[red]-{s['behind']}[/red]")
        sync_text = " ".join(sync_parts) if sync_parts else "[dim]up to date[/dim]"

        table.add_row(display_path, s["branch"] or "(detached)", state, sync_text)

    console.print(table)


@worktree.command("finish")
@click.argument("ref")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--push/--no-push", default=True, help="Push branch before removing (default: push)")
@click.option("--delete-branch", is_flag=True, help="Also delete the local branch after removing")
@click.pass_context
def worktree_finish(ctx: click.Context, ref: str, write: bool, push: bool, delete_branch: bool) -> None:
    """Finish work in a worktree: push, then remove.

    Pushes all commits on the branch, removes the worktree directory,
    and optionally deletes the local branch. One command to wrap up.

    Refuses to finish if the worktree has uncommitted changes.

    \b
    Examples:
        gw git worktree finish --write signpost
        gw git worktree finish --write 920 --delete-branch
        gw git worktree finish --write feature/auth --no-push
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("worktree_finish", write_flag=write)
    except GitSafetyError as e:
        safety_error(e.message, e.suggestion)
        raise SystemExit(1)

    _, worktree_name, _ = resolve_ref(ref)
    base = get_worktree_base()
    worktree_path = base / worktree_name

    if not worktree_path.exists():
        error(f"Worktree not found: {worktree_name}")
        raise SystemExit(1)

    # Get the branch name from the worktree
    branch_result = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        capture_output=True,
        text=True,
        cwd=worktree_path,
    )
    if branch_result.returncode != 0:
        error("Could not determine branch in worktree")
        raise SystemExit(1)

    branch_name = branch_result.stdout.strip()

    # SAFETY: Check for uncommitted changes
    status_result = subprocess.run(
        ["git", "status", "--porcelain"],
        capture_output=True,
        text=True,
        cwd=worktree_path,
    )
    dirty_files = [l for l in status_result.stdout.strip().split("\n") if l]
    if dirty_files:
        error(f"Worktree has {len(dirty_files)} uncommitted file(s)")
        console.print(
            "\n[yellow]Commit or discard changes before finishing:[/yellow]\n"
            f"  cd {worktree_path}\n"
            "  git add . && git commit -m 'your message'\n"
        )
        raise SystemExit(1)

    if not output_json:
        console.print(f"[dim]Finishing worktree: {worktree_name} (branch: {branch_name})[/dim]")

    # Step 1: Push if requested
    pushed = False
    if push:
        if not output_json:
            info(f"Pushing {branch_name} to origin...")
        push_result = subprocess.run(
            ["git", "push", "-u", "origin", branch_name],
            capture_output=True,
            text=True,
            cwd=worktree_path,
        )
        if push_result.returncode == 0:
            pushed = True
            if not output_json:
                success(f"Pushed {branch_name}")
        else:
            warning(f"Push failed: {push_result.stderr.strip()}")
            if not output_json:
                info("Continuing with removal anyway (commits are safe locally)")

    # Step 2: Remove the worktree
    remove_result = subprocess.run(
        ["git", "worktree", "remove", str(worktree_path)],
        capture_output=True,
        text=True,
    )
    if remove_result.returncode != 0:
        error(f"Failed to remove worktree: {remove_result.stderr.strip()}")
        raise SystemExit(1)

    # Double-check cleanup
    if worktree_path.exists():
        shutil.rmtree(worktree_path)

    if not output_json:
        success(f"Removed worktree: {worktree_name}")

    # Step 3: Optionally delete local branch
    branch_deleted = False
    if delete_branch and branch_name not in ("main", "master", "develop"):
        del_result = subprocess.run(
            ["git", "branch", "-d", branch_name],
            capture_output=True,
            text=True,
        )
        if del_result.returncode == 0:
            branch_deleted = True
            if not output_json:
                success(f"Deleted local branch: {branch_name}")
        else:
            if not output_json:
                warning(f"Could not delete branch (may not be merged): {del_result.stderr.strip()}")

    if output_json:
        console.print(json.dumps({
            "finished": True,
            "worktree": worktree_name,
            "branch": branch_name,
            "pushed": pushed,
            "branch_deleted": branch_deleted,
        }))
    else:
        console.print()
        success("Done! Worktree cleaned up.")
        if pushed:
            console.print(f"[dim]Branch {branch_name} is on origin — create a PR when ready[/dim]")
