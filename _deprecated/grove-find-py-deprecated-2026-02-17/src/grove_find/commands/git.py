"""Git-related commands for grove-find.

Provides: gf recent, gf changed, gf git blame, gf git history, gf git pickaxe, etc.
"""

from pathlib import Path
from typing import Optional
import typer

from grove_find.core.config import get_config
from grove_find.core.tools import discover_tools, run_tool
from grove_find.output import console, print_header, print_section, print_warning

app = typer.Typer(help="Git operations")


def _run_git(args: list[str], cwd: Path) -> str:
    """Run git command."""
    tools = discover_tools()
    if not tools.git:
        raise typer.Exit(1)

    result = run_tool(tools.git, args, cwd=cwd)
    return result.stdout


def recent_command(days: int = 7) -> None:
    """Find recently modified files."""
    config = get_config()

    print_section(f"Files modified in the last {days} day(s)", "")

    # Use git log for tracked files
    output = _run_git(
        ["log", f"--since={days} days ago", "--name-only", "--pretty=format:"],
        cwd=config.grove_root,
    )

    if output:
        # Filter and dedupe
        files = set()
        for line in output.strip().split("\n"):
            line = line.strip()
            if line and not any(
                exc in line
                for exc in ["node_modules", "dist", ".svelte-kit", "pnpm-lock"]
            ):
                files.add(line)

        sorted_files = sorted(files)[:50]
        console.print_raw("\n".join(sorted_files))

        # Summary by directory
        print_section("Summary by directory", "")
        dirs = {}
        for f in files:
            d = "/".join(f.split("/")[:-1]) if "/" in f else "."
            dirs[d] = dirs.get(d, 0) + 1

        for d, count in sorted(dirs.items(), key=lambda x: -x[1])[:15]:
            console.print(f"  {count:4d}  {d}/")
    else:
        print_warning(f"No files modified in the last {days} days")


@app.command("recent")
def recent_cmd(
    days: int = typer.Argument(7, help="Number of days to look back"),
) -> None:
    """Find recently modified files."""
    recent_command(days)


def changed_command(base: str = "main") -> None:
    """Find files changed on current branch vs base."""
    config = get_config()

    # Get current branch
    current = _run_git(["branch", "--show-current"], cwd=config.grove_root).strip()

    print_section(f"Files changed on {current} vs {base}", "")

    # Get changed files
    output = _run_git(
        ["diff", "--name-only", f"{base}...HEAD"],
        cwd=config.grove_root,
    )

    if output:
        files = [
            f
            for f in output.strip().split("\n")
            if f and "pnpm-lock" not in f and "node_modules" not in f
        ]
        console.print_raw("\n".join(files[:50]))

        # Change summary
        print_section("Change Summary", "")
        stat = _run_git(["diff", "--stat", f"{base}...HEAD"], cwd=config.grove_root)
        if stat:
            # Just the summary line
            lines = stat.strip().split("\n")
            if lines:
                console.print(lines[-1])

        # By file type
        print_section("By Type", "")
        types = {}
        for f in files:
            ext = f.split(".")[-1] if "." in f else "other"
            types[ext] = types.get(ext, 0) + 1
        for ext, count in sorted(types.items(), key=lambda x: -x[1]):
            console.print(f"  {count:4d}  .{ext}")

        # Commits on branch
        print_section("Commits on this branch", "")
        commits = _run_git(["log", "--oneline", f"{base}..HEAD"], cwd=config.grove_root)
        if commits:
            lines = commits.strip().split("\n")[:15]
            console.print_raw("\n".join(lines))
    else:
        print_warning(f"No changes found between {base} and HEAD")


@app.command("changed")
def changed_cmd(
    base: str = typer.Argument("main", help="Base branch to compare against"),
) -> None:
    """Find files changed on current branch vs base."""
    changed_command(base)


@app.command("blame")
def blame_cmd(
    file: str = typer.Argument(..., help="File to blame"),
    line_range: Optional[str] = typer.Argument(None, help="Line range (e.g., 10,50)"),
) -> None:
    """Enhanced git blame with age info."""
    config = get_config()

    print_section(f"Blame for: {file}", "")

    args = ["blame", "--date=relative"]

    if config.is_human_mode:
        args.append("--color-by-age")

    if line_range:
        args.extend(["-L", line_range])

    args.append(file)

    output = _run_git(args, cwd=config.grove_root)
    if output:
        lines = output.strip().split("\n")
        console.print_raw("\n".join(lines[:100]))
        if len(lines) > 100:
            console.print(
                f"\n(Showing first 100 lines. Use gf git blame {file} 1,999 for full file.)"
            )
    else:
        print_warning(f"Could not blame {file}")


@app.command("history")
def history_cmd(
    file: str = typer.Argument(..., help="File to show history for"),
    count: int = typer.Option(20, "-n", "--count", help="Number of commits to show"),
) -> None:
    """Commit history for a specific file."""
    config = get_config()

    print_section(f"History for: {file}", "")

    # Commits
    print_section("Commits", "")
    output = _run_git(
        ["log", "--oneline", "-n", str(count), "--follow", "--", file],
        cwd=config.grove_root,
    )
    if output:
        console.print_raw(output.rstrip())
    else:
        print_warning(f"No history found for {file}")
        return

    # Total commits
    print_section("Change frequency", "")
    total = _run_git(
        ["log", "--oneline", "--follow", "--", file],
        cwd=config.grove_root,
    )
    total_count = len(total.strip().split("\n")) if total.strip() else 0
    console.print(f"  Total commits touching this file: {total_count}")

    # Contributors
    print_section("Contributors", "")
    authors = _run_git(
        ["log", "--format=%an", "--follow", "--", file],
        cwd=config.grove_root,
    )
    if authors:
        author_counts = {}
        for author in authors.strip().split("\n"):
            author_counts[author] = author_counts.get(author, 0) + 1
        for author, count in sorted(author_counts.items(), key=lambda x: -x[1])[:10]:
            console.print(f"  {count:4d}  {author}")


@app.command("pickaxe")
def pickaxe_cmd(
    search: str = typer.Argument(..., help="String to find additions/removals of"),
    path: Optional[str] = typer.Argument(None, help="Limit to path"),
) -> None:
    """Find commits that added/removed a string.

    This is incredibly powerful for finding when something was introduced.
    """
    config = get_config()

    print_section(f"Finding commits that added/removed: {search}", "")

    args = ["log", "-S", search, "--oneline", "--all"]
    if path:
        args.extend(["--", path])

    output = _run_git(args, cwd=config.grove_root)
    if output:
        lines = output.strip().split("\n")[:30]
        console.print_raw("\n".join(lines))
        console.print("\nTip: Use 'git show <hash>' to see the full commit")
    else:
        print_warning(f"No commits found that added/removed '{search}'")


@app.command("commits")
def commits_cmd(
    count: int = typer.Argument(15, help="Number of commits to show"),
) -> None:
    """Recent commits with stats."""
    config = get_config()

    print_section(f"Recent {count} commits", "")

    output = _run_git(
        ["log", "--oneline", "--stat", "-n", str(count)],
        cwd=config.grove_root,
    )
    if output:
        # Filter out noisy files
        lines = [
            line
            for line in output.split("\n")
            if "node_modules" not in line and "pnpm-lock" not in line
        ]
        console.print_raw("\n".join(lines[:100]))

    # Today's commits
    print_section("Today's commits", "")
    today = _run_git(["log", "--oneline", "--since=midnight"], cwd=config.grove_root)
    if today.strip():
        console.print_raw(today.rstrip())
    else:
        console.print("  (none)")

    # This week count
    print_section("This week", "")
    week = _run_git(["log", "--oneline", "--since=1 week ago"], cwd=config.grove_root)
    week_count = len(week.strip().split("\n")) if week.strip() else 0
    console.print(f"  {week_count} commits in the last 7 days")


@app.command("churn")
def churn_cmd(
    days: int = typer.Argument(30, help="Days to analyze"),
) -> None:
    """Find files that change most frequently (hotspots)."""
    config = get_config()

    print_section(f"Code Churn: Most frequently changed files (last {days} days)", "")

    output = _run_git(
        ["log", f"--since={days} days ago", "--name-only", "--pretty=format:"],
        cwd=config.grove_root,
    )

    if output:
        # Count occurrences
        file_counts = {}
        for line in output.strip().split("\n"):
            line = line.strip()
            if line and not any(
                exc in line
                for exc in ["node_modules", "pnpm-lock", "dist", ".svelte-kit"]
            ):
                file_counts[line] = file_counts.get(line, 0) + 1

        # Top 20
        print_section("Top 20 Hotspots", "")
        sorted_files = sorted(file_counts.items(), key=lambda x: -x[1])[:20]
        for file, count in sorted_files:
            console.print(f"  {count:4d} changes: {file}")

        # By directory
        print_section("By Directory", "")
        dir_counts = {}
        for file, count in file_counts.items():
            d = "/".join(file.split("/")[:-1]) if "/" in file else "."
            dir_counts[d] = dir_counts.get(d, 0) + count

        sorted_dirs = sorted(dir_counts.items(), key=lambda x: -x[1])[:10]
        for d, count in sorted_dirs:
            console.print(f"  {count:4d} changes: {d}/")

        console.print("\nTip: High churn files often have bugs or need refactoring")
    else:
        print_warning(f"No changes found in the last {days} days")


@app.command("branches")
def branches_cmd() -> None:
    """List branches with useful info."""
    config = get_config()

    print_section("Git Branches", "")

    current = _run_git(["branch", "--show-current"], cwd=config.grove_root).strip()
    console.print(f"Current: {current}")

    print_section("Local Branches (by last commit)", "")
    output = _run_git(
        [
            "for-each-ref",
            "--sort=-committerdate",
            "refs/heads/",
            "--format=%(refname:short)|%(committerdate:relative)|%(subject)",
        ],
        cwd=config.grove_root,
    )
    if output:
        for line in output.strip().split("\n")[:15]:
            parts = line.split("|")
            if len(parts) >= 3:
                branch, date, subject = parts[0], parts[1], parts[2]
                if branch == current:
                    console.print(f"  * {branch} ({date})")
                else:
                    console.print(f"    {branch} ({date})")
                console.print(f"      {subject[:60]}")

    print_section("Remote Branches", "")
    remotes = _run_git(["branch", "-r"], cwd=config.grove_root)
    if remotes:
        lines = remotes.strip().split("\n")[:10]
        console.print_raw("\n".join(lines))

    print_section("Merged to main (safe to delete)", "")
    merged = _run_git(["branch", "--merged", "main"], cwd=config.grove_root)
    if merged:
        branches = [
            b.strip()
            for b in merged.strip().split("\n")
            if "main" not in b and "master" not in b and "*" not in b
        ]
        if branches:
            console.print_raw("\n".join(branches[:10]))
        else:
            console.print("  (none)")
    else:
        console.print("  (none)")


@app.command("pr")
def pr_cmd(
    base: str = typer.Argument("main", help="Base branch"),
) -> None:
    """PR preparation summary."""
    config = get_config()

    current = _run_git(["branch", "--show-current"], cwd=config.grove_root).strip()

    print_header("PR Summary", "")

    console.print(f"Branch: {current} -> {base}")

    # Commits
    print_section("Commits to be merged", "")
    commits = _run_git(["log", "--oneline", f"{base}..HEAD"], cwd=config.grove_root)
    if commits.strip():
        console.print_raw(commits.rstrip())
        commit_count = len(commits.strip().split("\n"))
        console.print(f"\nTotal: {commit_count} commits")
    else:
        console.print("  (no commits)")
        return

    # Files changed
    print_section("Files Changed", "")
    files = _run_git(["diff", "--name-status", f"{base}...HEAD"], cwd=config.grove_root)
    if files:
        lines = [l for l in files.strip().split("\n") if "pnpm-lock" not in l][:30]
        console.print_raw("\n".join(lines))

    # Stats
    print_section("Change Stats", "")
    stats = _run_git(["diff", "--stat", f"{base}...HEAD"], cwd=config.grove_root)
    if stats:
        console.print(stats.strip().split("\n")[-1])

    # Suggested description
    print_section("Suggested PR Description", "")
    console.print("(Copy this as a starting point)\n")
    console.print("## Summary")
    commit_subjects = _run_git(
        ["log", "--format=- %s", f"{base}..HEAD"], cwd=config.grove_root
    )
    if commit_subjects:
        lines = commit_subjects.strip().split("\n")[:10]
        console.print_raw("\n".join(lines))

    console.print("\n## Files Changed")
    changed = _run_git(["diff", "--name-only", f"{base}...HEAD"], cwd=config.grove_root)
    if changed:
        for f in changed.strip().split("\n")[:15]:
            if "pnpm-lock" not in f:
                console.print(f"- {f}")

    console.print("\n## Test Plan")
    console.print("- [ ] Tested locally")
    console.print("- [ ] No console errors")


@app.command("wip")
def wip_cmd() -> None:
    """Work in progress status."""
    config = get_config()

    print_section("Work in Progress", "")

    branch = _run_git(["branch", "--show-current"], cwd=config.grove_root).strip()
    console.print(f"Branch: {branch}")

    # Staged
    print_section("Staged Changes", "")
    staged = _run_git(["diff", "--cached", "--name-status"], cwd=config.grove_root)
    if staged.strip():
        console.print_raw(staged.rstrip()[:500])
    else:
        console.print("  (nothing staged)")

    # Unstaged
    print_section("Unstaged Changes", "")
    unstaged = _run_git(["diff", "--name-status"], cwd=config.grove_root)
    if unstaged.strip():
        console.print_raw(unstaged.rstrip()[:500])
    else:
        console.print("  (no unstaged changes)")

    # Untracked
    print_section("Untracked Files", "")
    untracked = _run_git(
        ["ls-files", "--others", "--exclude-standard"], cwd=config.grove_root
    )
    if untracked.strip():
        files = [
            f
            for f in untracked.strip().split("\n")
            if not any(exc in f for exc in ["node_modules", "dist", ".svelte-kit"])
        ]
        if files:
            console.print_raw("\n".join(files[:15]))
        else:
            console.print("  (no untracked files)")
    else:
        console.print("  (no untracked files)")

    # Summary
    print_section("Summary", "")
    staged_count = len(staged.strip().split("\n")) if staged.strip() else 0
    unstaged_count = len(unstaged.strip().split("\n")) if unstaged.strip() else 0
    untracked_filtered = [
        f
        for f in (untracked.strip().split("\n") if untracked.strip() else [])
        if not any(exc in f for exc in ["node_modules", "dist"])
    ]
    untracked_count = len(untracked_filtered) if untracked_filtered[0] else 0

    console.print(f"  Staged:    {staged_count}")
    console.print(f"  Unstaged:  {unstaged_count}")
    console.print(f"  Untracked: {untracked_count}")

    if staged_count > 0:
        console.print("\nReady to commit!")


@app.command("stash")
def stash_cmd(
    index: Optional[int] = typer.Argument(None, help="Stash index to show details"),
) -> None:
    """List stashes with preview."""
    config = get_config()

    print_section("Git Stashes", "")

    stash_list = _run_git(["stash", "list"], cwd=config.grove_root)

    if not stash_list.strip():
        console.print("No stashes found")
        return

    if index is not None:
        # Show specific stash
        print_section(f"Stash {index} details", "")
        output = _run_git(
            ["stash", "show", "-p", f"stash@{{{index}}}"], cwd=config.grove_root
        )
        if output:
            lines = output.strip().split("\n")[:50]
            console.print_raw("\n".join(lines))
    else:
        # List all stashes
        print_section("Stash List", "")
        console.print_raw(stash_list.rstrip())

        print_section("Stash Contents Preview", "")
        stashes = stash_list.strip().split("\n")
        for i, _ in enumerate(stashes[:5]):
            console.print(f"\nstash@{{{i}}}:")
            show = _run_git(["stash", "show", f"stash@{{{i}}}"], cwd=config.grove_root)
            if show:
                lines = show.strip().split("\n")[:5]
                for line in lines:
                    console.print(f"  {line}")

        console.print("\nUse 'gf git stash <n>' to see full diff of stash n")
        console.print("Use 'git stash pop' to apply and remove latest stash")


@app.command("reflog")
def reflog_cmd(
    count: int = typer.Argument(20, help="Number of entries to show"),
) -> None:
    """Recent reflog entries (recovery helper)."""
    config = get_config()

    print_section(f"Git Reflog (last {count} entries)", "")
    console.print("Use this to recover lost commits or undo mistakes\n")

    output = _run_git(
        ["reflog", "-n", str(count), "--format=%h %gd %cr %gs"],
        cwd=config.grove_root,
    )
    if output:
        console.print_raw(output.rstrip())

    print_section("Recovery Tips", "")
    console.print("  - git checkout <hash>        # View a past state")
    console.print("  - git branch recover <hash>  # Create branch from past state")
    console.print(
        "  - git reset --hard <hash>    # Restore to past state (DESTRUCTIVE)"
    )


@app.command("tag")
def tag_cmd(
    from_tag: Optional[str] = typer.Argument(None, help="From tag"),
    to_tag: str = typer.Argument("HEAD", help="To tag or HEAD"),
) -> None:
    """Find changes between git tags."""
    config = get_config()

    if not from_tag:
        print_section("Available tags", "")
        output = _run_git(["tag", "--sort=-version:refname"], cwd=config.grove_root)
        if output:
            lines = output.strip().split("\n")[:20]
            console.print_raw("\n".join(lines))
        console.print("\nUsage: gf git tag <from-tag> [to-tag]")
        console.print("Example: gf git tag v1.0.0 v1.1.0")
        return

    print_section(f"Changes from {from_tag} to {to_tag}", "")

    # Changed files
    print_section("Changed Files", "")
    files = _run_git(
        ["diff", "--name-only", f"{from_tag}..{to_tag}"], cwd=config.grove_root
    )
    if files:
        filtered = [
            f
            for f in files.strip().split("\n")
            if "pnpm-lock" not in f and "node_modules" not in f
        ]
        console.print_raw("\n".join(filtered[:50]))

    # Stats
    print_section("Change Summary", "")
    stats = _run_git(["diff", "--stat", f"{from_tag}..{to_tag}"], cwd=config.grove_root)
    if stats:
        lines = stats.strip().split("\n")[-3:]
        console.print_raw("\n".join(lines))

    # Commits
    print_section("Commits between tags", "")
    commits = _run_git(
        ["log", "--oneline", f"{from_tag}..{to_tag}"], cwd=config.grove_root
    )
    if commits:
        lines = commits.strip().split("\n")[:20]
        console.print_raw("\n".join(lines))
