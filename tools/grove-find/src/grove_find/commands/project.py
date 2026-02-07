"""Project health commands for grove-find.

Provides: gf todo, gf log, gf env, gf stats, gf briefing
"""

from pathlib import Path
from typing import Optional
from datetime import datetime
import typer

from grove_find.core.config import get_config
from grove_find.core.tools import discover_tools, find_files, find_files_by_glob, run_tool
from grove_find.output import console, print_header, print_section, print_warning

app = typer.Typer(help="Project health commands")


def _run_rg(args: list[str], cwd: Path) -> str:
    """Run ripgrep with standard options."""
    tools = discover_tools()
    if not tools.rg:
        raise typer.Exit(1)

    config = get_config()
    base_args = ["--line-number", "--no-heading", "--smart-case"]
    excludes = ["--glob", "!node_modules", "--glob", "!.git", "--glob", "!dist"]

    if config.is_human_mode:
        base_args.append("--color=always")
    else:
        base_args.append("--color=never")

    result = run_tool(tools.rg, base_args + excludes + args, cwd=cwd)
    return result.stdout


def _run_fd(args: list[str], cwd: Path) -> str:
    """Run fd with standard options. Returns empty string if fd is not installed."""
    tools = discover_tools()
    if not tools.fd:
        return ""

    config = get_config()
    base_args = ["--exclude", "node_modules", "--exclude", "dist", "--exclude", ".git"]

    if config.is_human_mode:
        base_args.append("--color=always")
    else:
        base_args.append("--color=never")

    result = run_tool(tools.fd, base_args + args, cwd=cwd)
    return result.stdout


def _run_git(args: list[str], cwd: Path) -> str:
    """Run git command."""
    tools = discover_tools()
    if not tools.git:
        return ""
    result = run_tool(tools.git, args, cwd=cwd)
    return result.stdout


def _run_gh(args: list[str], cwd: Path) -> tuple[str, bool]:
    """Run gh command, returning (output, success)."""
    tools = discover_tools()
    if not tools.gh:
        return "", False

    try:
        result = run_tool(tools.gh, args, cwd=cwd, check=False)
        return result.stdout, result.returncode == 0
    except Exception:
        return "", False


def todo_command(type_filter: Optional[str] = None) -> None:
    """Find TODO/FIXME/HACK comments."""
    config = get_config()

    if type_filter:
        print_section(f"Finding {type_filter} comments", "")
        output = _run_rg(
            [
                f"\\b{type_filter}\\b:?",
                "--glob",
                "*.{ts,js,svelte}",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            console.print_raw(output.rstrip())
        else:
            console.print(f"  No {type_filter} comments found")
    else:
        print_section("TODO/FIXME/HACK Comments", "")

        # TODOs
        print_section("TODOs", "")
        output = _run_rg(
            ["\\bTODO\\b:?", "--glob", "*.{ts,js,svelte}", str(config.grove_root)],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:20]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # FIXMEs
        print_section("FIXMEs", "")
        output = _run_rg(
            ["\\bFIXME\\b:?", "--glob", "*.{ts,js,svelte}", str(config.grove_root)],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:20]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # HACKs
        print_section("HACKs", "")
        output = _run_rg(
            ["\\bHACK\\b:?", "--glob", "*.{ts,js,svelte}", str(config.grove_root)],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:10]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")


@app.command("todo")
def todo_cmd(
    type_filter: Optional[str] = typer.Argument(
        None, help="Filter by type (TODO, FIXME, HACK)"
    ),
) -> None:
    """Find TODO/FIXME/HACK comments."""
    todo_command(type_filter)


def log_command(level: Optional[str] = None) -> None:
    """Find console.log/warn/error statements."""
    config = get_config()

    excludes = ["--glob", "!*.test.*", "--glob", "!*.spec.*"]

    if level:
        print_section(f"console.{level} statements", "")
        output = _run_rg(
            [
                f"console\\.{level}\\(",
                "--glob",
                "*.{ts,js,svelte}",
                str(config.grove_root),
            ]
            + excludes,
            cwd=config.grove_root,
        )
        if output:
            console.print_raw(output.rstrip())
        else:
            console.print(f"  No console.{level} found")
    else:
        print_section("Console Statements", "")

        # console.log
        print_section("console.log", "")
        output = _run_rg(
            ["console\\.log\\(", "--glob", "*.{ts,js,svelte}", str(config.grove_root)]
            + excludes,
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:20]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # console.error
        print_section("console.error", "")
        output = _run_rg(
            ["console\\.error\\(", "--glob", "*.{ts,js,svelte}", str(config.grove_root)]
            + excludes,
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:15]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # console.warn
        print_section("console.warn", "")
        output = _run_rg(
            ["console\\.warn\\(", "--glob", "*.{ts,js,svelte}", str(config.grove_root)]
            + excludes,
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:10]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # debugger
        print_section("debugger statements", "")
        output = _run_rg(
            ["\\bdebugger\\b", "--glob", "*.{ts,js,svelte}", str(config.grove_root)],
            cwd=config.grove_root,
        )
        if output:
            console.print_raw(output.rstrip())
        else:
            console.print("  (none found)")


@app.command("log")
def log_cmd(
    level: Optional[str] = typer.Argument(None, help="Log level (log, warn, error)"),
) -> None:
    """Find console.log/warn/error statements."""
    log_command(level)


def env_command(var: Optional[str] = None) -> None:
    """Find environment variable usage."""
    config = get_config()

    if var:
        print_section(f"Environment variable: {var}", "")
        output = _run_rg(
            [var, "--glob", "*.{ts,js,svelte}", str(config.grove_root)],
            cwd=config.grove_root,
        )
        if output:
            lines = [
                l
                for l in output.strip().split("\n")
                if any(kw in l for kw in ["env", "process", "import.meta"])
            ]
            if lines:
                console.print_raw("\n".join(lines[:30]))
            else:
                console.print("  (no env-related matches)")
        else:
            console.print("  (not found)")
    else:
        print_section("Environment Variables", "")

        # .env files
        print_section(".env Files", "")
        output = _run_fd(
            ["--hidden", "^\\.env", str(config.grove_root)], cwd=config.grove_root
        )
        if output:
            console.print_raw(output.rstrip())
        else:
            console.print("  (none found)")

        # import.meta.env
        print_section("import.meta.env usage", "")
        output = _run_rg(
            [
                "import\\.meta\\.env\\.\\w+",
                "--glob",
                "*.{ts,js,svelte}",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:20]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # process.env
        print_section("process.env usage", "")
        output = _run_rg(
            [
                "process\\.env\\.\\w+",
                "--type",
                "ts",
                "--type",
                "js",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:15]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # platform.env (Cloudflare)
        print_section("platform.env usage (Cloudflare)", "")
        output = _run_rg(
            [
                "platform\\.env\\.\\w+",
                "--type",
                "ts",
                "--type",
                "js",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:15]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # wrangler.toml vars
        print_section("Env vars in wrangler.toml", "")
        output = _run_rg(
            [
                "\\[vars\\]",
                "-A",
                "10",
                "--glob",
                "wrangler*.toml",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:20]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none configured)")


@app.command("env")
def env_cmd(
    var: Optional[str] = typer.Argument(None, help="Environment variable name"),
) -> None:
    """Find environment variable usage."""
    env_command(var)


def stats_command() -> None:
    """Show project git statistics."""
    config = get_config()

    print_header("Project Git Stats Snapshot", "")

    # Current branch
    branch = _run_git(["branch", "--show-current"], cwd=config.grove_root).strip()
    console.print(f"Current Branch: {branch}")

    # Commit stats
    print_section("Commit Stats", "")
    total = _run_git(["rev-list", "--count", "HEAD"], cwd=config.grove_root).strip()
    console.print(f"  Total commits: {total}")

    today = _run_git(["log", "--oneline", "--since=midnight"], cwd=config.grove_root)
    today_count = len(today.strip().split("\n")) if today.strip() else 0
    console.print(f"  Today: {today_count}")

    week = _run_git(["log", "--oneline", "--since=1 week ago"], cwd=config.grove_root)
    week_count = len(week.strip().split("\n")) if week.strip() else 0
    console.print(f"  This week: {week_count}")

    month = _run_git(["log", "--oneline", "--since=1 month ago"], cwd=config.grove_root)
    month_count = len(month.strip().split("\n")) if month.strip() else 0
    console.print(f"  This month: {month_count}")

    # Branch stats
    print_section("Branch Stats", "")
    all_branches = _run_git(["branch", "-a"], cwd=config.grove_root)
    all_count = len(all_branches.strip().split("\n")) if all_branches.strip() else 0
    console.print(f"  Total branches: {all_count}")

    local = _run_git(["branch"], cwd=config.grove_root)
    local_count = len(local.strip().split("\n")) if local.strip() else 0
    console.print(f"  Local branches: {local_count}")

    # Contributors
    print_section("Contributors", "")
    shortlog = _run_git(["shortlog", "-sn", "--no-merges"], cwd=config.grove_root)
    if shortlog:
        lines = shortlog.strip().split("\n")[:5]
        console.print_raw("\n".join(lines))

    # Tags
    print_section("Tag Stats", "")
    tags = _run_git(["tag"], cwd=config.grove_root)
    tag_count = len(tags.strip().split("\n")) if tags.strip() else 0
    console.print(f"  Total tags: {tag_count}")

    latest_tag = _run_git(
        ["describe", "--tags", "--abbrev=0"], cwd=config.grove_root
    ).strip()
    console.print(f"  Latest tag: {latest_tag or 'none'}")

    # GitHub stats
    tools = discover_tools()
    if tools.has_gh:
        print_section("GitHub Stats (via gh)", "")

        open_prs, _ = _run_gh(["pr", "list", "--state", "open"], cwd=config.grove_root)
        pr_count = len(open_prs.strip().split("\n")) if open_prs.strip() else 0
        console.print(f"  Open PRs: {pr_count}")

        open_issues, _ = _run_gh(
            ["issue", "list", "--state", "open"], cwd=config.grove_root
        )
        issue_count = len(open_issues.strip().split("\n")) if open_issues.strip() else 0
        console.print(f"  Open issues: {issue_count}")
    else:
        console.print("\nInstall GitHub CLI (gh) for PR/issue stats")

    # Working directory
    print_section("Working Directory", "")
    status = _run_git(["status", "--short"], cwd=config.grove_root)
    status_count = len(status.strip().split("\n")) if status.strip() else 0
    if status_count == 0:
        console.print("  Status: Clean")
    else:
        console.print(f"  Status: {status_count} uncommitted changes")

    stashes = _run_git(["stash", "list"], cwd=config.grove_root)
    stash_count = len(stashes.strip().split("\n")) if stashes.strip() else 0
    console.print(f"  Stashes: {stash_count}")


@app.command("stats")
def stats_cmd() -> None:
    """Show project git statistics."""
    stats_command()


def briefing_command() -> None:
    """Daily briefing with issues and TODOs."""
    config = get_config()

    print_header("Daily Briefing", "")

    today = datetime.now().strftime("%A, %B %d, %Y")
    console.print(f"Date: {today}\n")

    # Current status
    print_section("Current Status", "")
    branch = _run_git(["branch", "--show-current"], cwd=config.grove_root).strip()
    console.print(f"  Branch: {branch}")

    uncommitted = _run_git(["status", "--short"], cwd=config.grove_root)
    uncommitted_count = (
        len(uncommitted.strip().split("\n")) if uncommitted.strip() else 0
    )
    if uncommitted_count > 0:
        console.print(f"  {uncommitted_count} uncommitted changes")
    else:
        console.print("  Working directory clean")

    # GitHub issues
    tools = discover_tools()
    if tools.has_gh:
        print_section("Priority Issues", "")

        # Critical
        critical, _ = _run_gh(
            [
                "issue",
                "list",
                "--state",
                "open",
                "--label",
                "priority-critical",
                "--limit",
                "5",
            ],
            cwd=config.grove_root,
        )
        if critical.strip():
            console.print("  CRITICAL:")
            for line in critical.strip().split("\n"):
                console.print(f"    {line}")
            console.print()

        # High
        high, _ = _run_gh(
            [
                "issue",
                "list",
                "--state",
                "open",
                "--label",
                "priority-high",
                "--limit",
                "5",
            ],
            cwd=config.grove_root,
        )
        if high.strip():
            console.print("  HIGH:")
            for line in high.strip().split("\n"):
                console.print(f"    {line}")
            console.print()

        # Count
        open_issues, _ = _run_gh(
            ["issue", "list", "--state", "open", "--json", "number"],
            cwd=config.grove_root,
        )
        if open_issues:
            import json

            try:
                count = len(json.loads(open_issues))
                console.print(f"  Total open issues: {count}")
            except json.JSONDecodeError:
                pass
        console.print("  View all: gh issue list --state open")
    else:
        console.print("\nGitHub CLI (gh) not available - install for issue tracking")

    # TODOs in code
    print_section("Oldest TODO Comments in Code", "")
    console.print("  (These have been waiting the longest!)\n")

    todo_output = _run_rg(
        [
            "\\bTODO\\b",
            "--glob",
            "!*.md",
            "--glob",
            "*.{ts,js,svelte}",
            str(config.grove_root),
        ],
        cwd=config.grove_root,
    )
    if todo_output:
        lines = todo_output.strip().split("\n")[:10]
        for line in lines:
            console.print(f"  {line[:100]}")
    else:
        console.print("  No TODOs found!")

    # Yesterday's commits
    print_section("Yesterday's Commits", "")
    yesterday = _run_git(
        ["log", "--oneline", "--since=yesterday", "--until=midnight"],
        cwd=config.grove_root,
    )
    if yesterday.strip():
        lines = yesterday.strip().split("\n")[:5]
        console.print_raw("\n".join(lines))
    else:
        console.print("  No commits yesterday")

    # Project structure counts
    print_section("Project Structure", "")
    page_routes = find_files_by_glob("**/+page.svelte", cwd=config.grove_root)
    page_count = len(page_routes.strip().split("\n")) if page_routes.strip() else 0
    console.print(f"  Page routes: {page_count}")

    api_routes = find_files_by_glob("**/+server.ts", cwd=config.grove_root)
    api_count = len(api_routes.strip().split("\n")) if api_routes.strip() else 0
    console.print(f"  API routes: {api_count}")

    components = find_files("", extensions=["svelte"], cwd=config.grove_root)
    comp_count = len(components.strip().split("\n")) if components.strip() else 0
    console.print(f"  Svelte components: {comp_count}")

    # Migration count
    migration_count = 0
    for migrations_dir in config.grove_root.rglob("migrations"):
        if "node_modules" in str(migrations_dir) or "_deprecated" in str(migrations_dir):
            continue
        if migrations_dir.is_dir():
            migration_count += len(list(migrations_dir.glob("*.sql")))
    if migration_count > 0:
        console.print(f"  D1 migrations: {migration_count}")

    # Largest component
    large_files: list[tuple[int, str]] = []
    svelte_output = find_files("", extensions=["svelte"], cwd=config.grove_root)
    if svelte_output and svelte_output.strip():
        for filepath in svelte_output.strip().split("\n"):
            filepath = filepath.strip()
            if not filepath or "node_modules" in filepath or "_deprecated" in filepath:
                continue
            try:
                with open(filepath, "rb") as lf:
                    line_count = sum(1 for _ in lf)
                if line_count > 200:
                    try:
                        rel = str(Path(filepath).relative_to(config.grove_root))
                    except ValueError:
                        rel = filepath
                    large_files.append((line_count, rel))
            except OSError:
                continue
    if large_files:
        large_files.sort(key=lambda x: -x[0])
        console.print(f"  Largest component: {large_files[0][1]} ({large_files[0][0]} lines)")

    # Hot files
    print_section("Hot Files (Changed This Week)", "")
    week_files = _run_git(
        ["log", "--since=1 week ago", "--name-only", "--pretty=format:"],
        cwd=config.grove_root,
    )
    if week_files:
        file_counts = {}
        for line in week_files.strip().split("\n"):
            line = line.strip()
            if line and not any(
                exc in line for exc in ["node_modules", "pnpm-lock", "dist"]
            ):
                file_counts[line] = file_counts.get(line, 0) + 1

        sorted_files = sorted(file_counts.items(), key=lambda x: -x[1])[:10]
        for f, count in sorted_files:
            console.print(f"  {count} changes: {f}")
    else:
        console.print("  No changes this week")

    console.print("\nReady to build something great!")


@app.command("briefing")
def briefing_cmd() -> None:
    """Daily briefing with issues and TODOs."""
    briefing_command()
