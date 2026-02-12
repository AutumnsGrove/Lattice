"""Context command — one-shot work session snapshot for agents.

Eliminates the context assembly tax: instead of running 3-5 commands
to orient at the start of every session, `gw context` gives you
everything in a single structured response.

Combines:
- git status (branch, tracking, staged/unstaged/untracked)
- recent commits
- affected packages from changed files
- issue number from branch name
- TODO count in changed files
- stash count
"""

import json
import re
import subprocess
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from ..git_wrapper import Git, GitError
from ..packages import load_monorepo, find_monorepo_root

console = Console()


def _get_affected_packages(file_paths: list[str]) -> list[str]:
    """Determine which packages are affected by a list of file paths.

    This is a shared utility extracted from workflows.py so that
    context, ci --affected, and ship can all use it.

    Returns package directory names (e.g., ['engine', 'landing']).
    """
    packages = set()
    for filepath in file_paths:
        parts = Path(filepath).parts
        if len(parts) >= 2 and parts[0] == "packages":
            packages.add(parts[1])
        elif len(parts) >= 2 and parts[0] == "tools":
            packages.add(f"tools/{parts[1]}")
        elif len(parts) == 1:
            packages.add("root")
    return sorted(packages)


def _count_todos_in_files(file_paths: list[str], root: Path) -> int:
    """Count TODO/FIXME/HACK comments in the given files.

    Uses errors="replace" to handle binary content that slips past the
    extension filter (e.g., .js files that are actually sourcemaps).
    Only catches specific filesystem errors to avoid masking bugs.
    """
    if not file_paths:
        return 0

    count = 0
    skipped: list[str] = []
    for filepath in file_paths:
        full_path = root / filepath
        if not full_path.exists() or full_path.is_dir():
            continue
        # Only check text-like files
        suffix = full_path.suffix.lower()
        if suffix not in {
            ".ts", ".tsx", ".js", ".jsx", ".svelte", ".py",
            ".css", ".scss", ".md", ".mdx", ".html",
        }:
            continue
        try:
            text = full_path.read_text(errors="replace")
            count += len(re.findall(r'\b(TODO|FIXME|HACK)\b', text))
        except PermissionError:
            skipped.append(filepath)
        except FileNotFoundError:
            # File listed in git status but deleted before we read it
            continue
    return count


@click.command()
@click.pass_context
def context(ctx: click.Context) -> None:
    """One-shot work session snapshot — everything you need to orient.

    Always safe — no --write flag needed. Returns structured JSON
    combining git status, recent commits, affected packages, issue
    context, and TODO counts.

    This is the first command an agent should run at session start.

    \\b
    Examples:
        gw context                    # Rich terminal output
        gw --json context             # Structured JSON for agents
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        if not git.is_repo():
            if output_json:
                console.print(json.dumps({"error": "Not a git repository"}))
            else:
                console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        # Gather all context in one pass
        status = git.status()
        commits = git.log(limit=5)
        stashes = git.stash_list()

        # All changed file paths (staged + unstaged + untracked)
        all_changed = (
            [path for _, path in status.staged]
            + [path for _, path in status.unstaged]
            + status.untracked
        )
        staged_paths = [path for _, path in status.staged]

        # Affected packages
        affected = _get_affected_packages(all_changed)

        # Issue from branch name
        issue = git.extract_issue_from_branch(status.branch)

        # Monorepo root for TODO counting
        root = find_monorepo_root() or Path.cwd()
        todo_count = _count_todos_in_files(all_changed, root)

        # Check if branch has a remote PR (best-effort)
        pr_url = None

        if output_json:
            data = {
                "branch": status.branch,
                "upstream": status.upstream,
                "ahead": status.ahead,
                "behind": status.behind,
                "is_clean": status.is_clean,
                "is_detached": status.is_detached,
                "issue": issue,
                "staged": [
                    {"status": s, "path": p} for s, p in status.staged
                ],
                "unstaged": [
                    {"status": s, "path": p} for s, p in status.unstaged
                ],
                "untracked": status.untracked,
                "affected_packages": affected,
                "recent_commits": [
                    {
                        "hash": c.short_hash,
                        "message": c.subject,
                        "author": c.author,
                        "date": c.date,
                    }
                    for c in commits
                ],
                "stash_count": len(stashes),
                "todos_in_changed_files": todo_count,
            }
            console.print(json.dumps(data, indent=2))
        else:
            # Rich terminal output
            _print_rich_context(
                status, commits, affected, issue, stashes,
                todo_count, all_changed, staged_paths,
            )

    except GitError as e:
        if output_json:
            console.print(json.dumps({"error": e.message}))
        else:
            console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)


def _print_rich_context(
    status,
    commits,
    affected,
    issue,
    stashes,
    todo_count,
    all_changed,
    staged_paths,
) -> None:
    """Print rich terminal output for context command."""
    # Header
    branch_display = f"[cyan]{status.branch}[/cyan]"
    if status.upstream:
        tracking = f" -> [dim]{status.upstream}[/dim]"
        sync_info = ""
        if status.ahead:
            sync_info += f" [green]+{status.ahead}[/green]"
        if status.behind:
            sync_info += f" [red]-{status.behind}[/red]"
        branch_display += tracking + sync_info

    issue_display = f"  Issue: [yellow]#{issue}[/yellow]" if issue else ""

    console.print(Panel(
        f"Branch: {branch_display}{issue_display}\n"
        f"Files:  [green]{len(status.staged)} staged[/green], "
        f"[yellow]{len(status.unstaged)} unstaged[/yellow], "
        f"[dim]{len(status.untracked)} untracked[/dim]\n"
        f"Packages: {', '.join(affected) if affected else '[dim]none[/dim]'}\n"
        f"TODOs: {todo_count} in changed files  |  "
        f"Stashes: {len(stashes)}",
        title="[bold]Work Session Context[/bold]",
        border_style="green",
    ))

    # Recent commits
    if commits:
        table = Table(
            title="Recent Commits",
            border_style="dim",
            show_lines=False,
            padding=(0, 1),
        )
        table.add_column("Hash", style="cyan", width=8)
        table.add_column("Message")
        table.add_column("Author", style="dim", width=15)

        for c in commits[:5]:
            table.add_row(c.short_hash, c.subject, c.author)

        console.print(table)

    # Changed files summary
    if staged_paths:
        console.print(f"\n[bold green]Staged ({len(staged_paths)}):[/bold green]")
        for path in staged_paths[:10]:
            console.print(f"  [green]+[/green] {path}")
        if len(staged_paths) > 10:
            console.print(f"  [dim]... +{len(staged_paths) - 10} more[/dim]")

    if status.unstaged:
        console.print(f"\n[bold yellow]Unstaged ({len(status.unstaged)}):[/bold yellow]")
        for _, path in status.unstaged[:10]:
            console.print(f"  [yellow]~[/yellow] {path}")
        if len(status.unstaged) > 10:
            console.print(f"  [dim]... +{len(status.unstaged) - 10} more[/dim]")

    if status.is_clean:
        console.print("\n[dim]Working directory clean[/dim]")
