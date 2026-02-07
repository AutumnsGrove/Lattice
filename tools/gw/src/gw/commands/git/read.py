"""Read-only Git commands (Tier 1 - Always Safe)."""

import json
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax
from rich.table import Table
from rich.text import Text

from ...git_wrapper import Git, GitError

console = Console()


@click.command()
@click.option("--short", "-s", is_flag=True, help="Show short format")
@click.option("--porcelain", is_flag=True, help="Machine-readable output")
@click.pass_context
def status(ctx: click.Context, short: bool, porcelain: bool) -> None:
    """Show working tree status.

    Always safe - no --write flag required.

    \b
    Examples:
        gw git status           # Rich formatted status
        gw git status --short   # Compact output
        gw git status --porcelain  # Machine-readable
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        git_status = git.status()

        if output_json or porcelain:
            data = {
                "branch": git_status.branch,
                "upstream": git_status.upstream,
                "ahead": git_status.ahead,
                "behind": git_status.behind,
                "is_clean": git_status.is_clean,
                "is_detached": git_status.is_detached,
                "staged": [{"status": s, "path": p} for s, p in git_status.staged],
                "unstaged": [{"status": s, "path": p} for s, p in git_status.unstaged],
                "untracked": git_status.untracked,
            }
            console.print(json.dumps(data, indent=2))
            return

        if short:
            _print_short_status(git_status)
        else:
            _print_rich_status(git_status)

    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)


def _print_short_status(status) -> None:
    """Print compact status format."""
    # Branch info
    branch_info = f"## {status.branch}"
    if status.upstream:
        if status.ahead or status.behind:
            branch_info += f"...{status.upstream}"
            parts = []
            if status.ahead:
                parts.append(f"ahead {status.ahead}")
            if status.behind:
                parts.append(f"behind {status.behind}")
            branch_info += f" [{', '.join(parts)}]"

    console.print(branch_info)

    # Changes
    for s, path in status.staged:
        console.print(f"[green]{s}[/green]  {path}")
    for s, path in status.unstaged:
        console.print(f"[red] {s}[/red] {path}")
    for path in status.untracked:
        console.print(f"[dim]??[/dim] {path}")


def _print_rich_status(status) -> None:
    """Print Rich formatted status."""
    # Branch panel
    branch_text = Text()
    branch_text.append("On branch ", style="dim")
    branch_text.append(status.branch, style="bold green")

    if status.is_detached:
        branch_text.append(" (detached)", style="yellow")

    if status.upstream:
        branch_text.append("\n")
        branch_text.append("Tracking ", style="dim")
        branch_text.append(status.upstream, style="cyan")

        if status.ahead or status.behind:
            parts = []
            if status.ahead:
                parts.append(f"[green]+{status.ahead}[/green] ahead")
            if status.behind:
                parts.append(f"[red]-{status.behind}[/red] behind")
            branch_text.append(f" ({', '.join(parts)})")

    console.print(Panel(branch_text, title="Branch", border_style="green"))

    if status.is_clean:
        console.print("\n[green]Working tree clean[/green]")
        return

    # Staged changes
    if status.staged:
        table = Table(title="Staged Changes", border_style="green")
        table.add_column("Status", style="green", width=8)
        table.add_column("File")

        status_names = {
            "M": "modified",
            "A": "added",
            "D": "deleted",
            "R": "renamed",
            "C": "copied",
        }

        for s, path in status.staged:
            table.add_row(status_names.get(s, s), path)

        console.print(table)

    # Unstaged changes
    if status.unstaged:
        table = Table(title="Unstaged Changes", border_style="yellow")
        table.add_column("Status", style="yellow", width=8)
        table.add_column("File")

        status_names = {
            "M": "modified",
            "D": "deleted",
            "U": "conflict",
        }

        for s, path in status.unstaged:
            table.add_row(status_names.get(s, s), path)

        console.print(table)

    # Untracked files
    if status.untracked:
        table = Table(title="Untracked Files", border_style="dim")
        table.add_column("File", style="dim")

        for path in status.untracked:
            table.add_row(path)

        console.print(table)


@click.command()
@click.option("--limit", "-n", default=10, help="Number of commits to show")
@click.option("--oneline", is_flag=True, help="One line per commit")
@click.option("--author", help="Filter by author")
@click.option("--since", help="Show commits since date (e.g., '3 days ago')")
@click.option("--file", "file_path", help="Show commits for specific file")
@click.pass_context
def log(
    ctx: click.Context,
    limit: int,
    oneline: bool,
    author: Optional[str],
    since: Optional[str],
    file_path: Optional[str],
) -> None:
    """Show commit log.

    Always safe - no --write flag required.

    \b
    Examples:
        gw git log                    # Last 10 commits
        gw git log --limit 25         # More commits
        gw git log --oneline          # Compact format
        gw git log --author autumn    # Filter by author
        gw git log --since "3 days"   # Recent commits
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        commits = git.log(
            limit=limit,
            author=author,
            since=since,
            file_path=file_path,
        )

        if output_json:
            data = [
                {
                    "hash": c.hash,
                    "short_hash": c.short_hash,
                    "author": c.author,
                    "author_email": c.author_email,
                    "date": c.date,
                    "subject": c.subject,
                    "body": c.body,
                }
                for c in commits
            ]
            console.print(json.dumps(data, indent=2))
            return

        if oneline:
            for commit in commits:
                console.print(
                    f"[yellow]{commit.short_hash}[/yellow] {commit.subject}"
                )
        else:
            for commit in commits:
                console.print(
                    f"[yellow]commit {commit.hash}[/yellow]"
                )
                console.print(f"Author: {commit.author} <{commit.author_email}>")
                console.print(f"Date:   {commit.date}")
                console.print()
                console.print(f"    {commit.subject}")
                if commit.body:
                    for line in commit.body.strip().split("\n"):
                        console.print(f"    {line}")
                console.print()

    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)


@click.command()
@click.option("--staged", is_flag=True, help="Show staged changes")
@click.option("--stat", "stat_only", is_flag=True, help="Show only statistics")
@click.option("--path", "-p", "file_path", help="Diff specific file or directory")
@click.argument("args", nargs=-1)
@click.pass_context
def diff(
    ctx: click.Context,
    staged: bool,
    stat_only: bool,
    file_path: Optional[str],
    args: tuple[str, ...],
) -> None:
    """Show changes between commits, commit and working tree, etc.

    Always safe - no --write flag required.

    Positional args are interpreted as: [REF] [-- PATH]. Use --path for explicit
    path filtering, or use git-style -- separator.

    \b
    Examples:
        gw git diff                        # Unstaged changes
        gw git diff --staged               # Staged changes
        gw git diff main                   # Compare to branch
        gw git diff HEAD~3                 # Last 3 commits
        gw git diff --stat                 # Summary only
        gw git diff --staged -p src/       # Staged changes in src/
        gw git diff --staged -- src/       # Same, git-style separator
        gw git diff main...HEAD            # Branch comparison
    """
    # Parse positional args: support [REF] and [-- PATH] patterns
    ref: Optional[str] = None
    separator_seen = False

    for arg in args:
        if arg == "--":
            separator_seen = True
            continue
        if separator_seen:
            # Everything after -- is a path
            file_path = arg
        elif file_path is None and (arg.startswith("/") or arg.startswith(".")
                                    or arg.endswith("/") or "/" in arg):
            # Looks like a path (contains slashes, starts with . or /)
            file_path = arg
        else:
            ref = arg
    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        git_diff = git.diff(
            staged=staged,
            ref=ref,
            stat_only=stat_only,
            file_path=file_path,
        )

        if output_json:
            data = {
                "files": git_diff.files,
                "stats": git_diff.stats,
            }
            console.print(json.dumps(data, indent=2))
            return

        if stat_only or not git_diff.raw:
            # Show statistics
            if not git_diff.files:
                console.print("[dim]No changes[/dim]")
                return

            table = Table(border_style="green")
            table.add_column("File")
            table.add_column("Additions", style="green", justify="right")
            table.add_column("Deletions", style="red", justify="right")

            for f in git_diff.files:
                table.add_row(
                    f["path"],
                    f"+{f['additions']}",
                    f"-{f['deletions']}",
                )

            console.print(table)
            console.print(
                f"\n[dim]{git_diff.stats['files_changed']} files changed, "
                f"[green]+{git_diff.stats['additions']}[/green] insertions, "
                f"[red]-{git_diff.stats['deletions']}[/red] deletions[/dim]"
            )
        else:
            # Show full diff with syntax highlighting
            syntax = Syntax(
                git_diff.raw,
                "diff",
                theme="monokai",
                line_numbers=False,
            )
            console.print(syntax)

    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)


@click.command()
@click.argument("file_path")
@click.option(
    "--line",
    "-L",
    "line_range",
    help="Line range (e.g., 50-75)",
)
@click.pass_context
def blame(ctx: click.Context, file_path: str, line_range: Optional[str]) -> None:
    """Show what revision and author last modified each line.

    Always safe - no --write flag required.

    \b
    Examples:
        gw git blame src/lib/auth.ts
        gw git blame src/lib/auth.ts --line 50-75
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        line_start = None
        line_end = None

        if line_range:
            parts = line_range.split("-")
            if len(parts) == 2:
                line_start = int(parts[0])
                line_end = int(parts[1])

        output = git.blame(file_path, line_start, line_end)

        if output_json:
            # Parse blame output into structured data
            lines = []
            for line in output.strip().split("\n"):
                lines.append({"raw": line})
            console.print(json.dumps({"lines": lines}, indent=2))
            return

        # Show blame output with syntax highlighting
        syntax = Syntax(output, "text", theme="monokai", line_numbers=False)
        console.print(syntax)

    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)


@click.command()
@click.argument("ref", default="HEAD")
@click.option("--stat", "stat_only", is_flag=True, help="Show only file changes")
@click.pass_context
def show(ctx: click.Context, ref: str, stat_only: bool) -> None:
    """Show commit details.

    Always safe - no --write flag required.

    \b
    Examples:
        gw git show              # Show HEAD commit
        gw git show abc123       # Show specific commit
        gw git show HEAD~2       # Show 2 commits ago
        gw git show --stat       # Just file changes
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        output = git.show(ref, stat_only)

        if output_json:
            console.print(json.dumps({"output": output}, indent=2))
            return

        # Show with syntax highlighting
        syntax = Syntax(output, "diff", theme="monokai", line_numbers=False)
        console.print(syntax)

    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)
