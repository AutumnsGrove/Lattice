"""GitHub issue commands for grove-find.

Provides: gf github issue, gf github issues, gf github board, gf github mine, etc.
Gracefully handles missing gh CLI.
"""

from pathlib import Path
from typing import Optional
import json as json_lib
import typer

from grove_find.core.config import get_config
from grove_find.core.tools import discover_tools, run_tool
from grove_find.output import (
    console,
    print_header,
    print_section,
    print_warning,
    print_error,
)

app = typer.Typer(help="GitHub issue commands")


def _check_gh() -> bool:
    """Check if gh CLI is available."""
    tools = discover_tools()
    return tools.has_gh


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


def _run_git(args: list[str], cwd: Path) -> str:
    """Run git command."""
    tools = discover_tools()
    if not tools.git:
        return ""
    result = run_tool(tools.git, args, cwd=cwd)
    return result.stdout


def _run_rg(args: list[str], cwd: Path) -> str:
    """Run ripgrep command."""
    tools = discover_tools()
    if not tools.rg:
        return ""

    config = get_config()
    base_args = ["--line-number", "--no-heading"]
    if config.is_human_mode:
        base_args.append("--color=always")
    else:
        base_args.append("--color=never")

    excludes = [
        "--glob",
        "!node_modules",
        "--glob",
        "!.git",
        "--glob",
        "!dist",
        "--glob",
        "!pnpm-lock.yaml",
        "--glob",
        "!*.lock",
    ]

    result = run_tool(tools.rg, base_args + excludes + args, cwd=cwd)
    return result.stdout


@app.command("issue")
def issue_cmd(
    number: Optional[int] = typer.Argument(None, help="Issue number to view"),
) -> None:
    """View a specific issue or list recent open issues."""
    config = get_config()

    if not _check_gh():
        print_error("GitHub CLI (gh) required. Install: brew install gh")
        raise typer.Exit(1)

    if number is None:
        # List recent open issues
        print_header("Open Issues", "")

        output, success = _run_gh(
            ["issue", "list", "--state", "open", "--limit", "20"], cwd=config.grove_root
        )
        if success and output:
            console.print_raw(output.rstrip())
        else:
            console.print("  (unable to fetch issues)")

        # Count
        output, _ = _run_gh(
            ["issue", "list", "--state", "open", "--json", "number"],
            cwd=config.grove_root,
        )
        if output:
            try:
                count = len(json_lib.loads(output))
                console.print(f"\nTotal open: {count}")
            except json_lib.JSONDecodeError:
                pass

        console.print("Use 'gf github issue <number>' for details")
    else:
        # Show specific issue
        print_header(f"Issue #{number}", "")

        output, success = _run_gh(["issue", "view", str(number)], cwd=config.grove_root)
        if success and output:
            console.print_raw(output.rstrip())
        else:
            print_error(f"Issue #{number} not found")
            return

        # Related PRs
        print_section("Related PRs", "")
        output, success = _run_gh(
            ["pr", "list", "--state", "all", "--search", f"#{number}", "--limit", "10"],
            cwd=config.grove_root,
        )
        if success and output.strip():
            console.print_raw(output.rstrip())
        else:
            console.print("  No PRs reference this issue")

        # Related branches
        print_section("Related Branches", "")
        branches = _run_git(["branch", "-a"], cwd=config.grove_root)
        if branches:
            related = [b.strip() for b in branches.split("\n") if str(number) in b]
            if related:
                console.print_raw("\n".join(related))
            else:
                console.print(f"  No branches reference #{number} in their name")

        # Commits mentioning issue
        print_section(f"Commits Mentioning #{number}", "")
        commits = _run_git(
            ["log", "--oneline", "--all", f"--grep=#{number}"], cwd=config.grove_root
        )
        if commits.strip():
            lines = commits.strip().split("\n")[:10]
            console.print_raw("\n".join(lines))
        else:
            console.print(f"  No commits mention #{number}")


@app.command("issues")
def issues_cmd(
    filter_arg: Optional[str] = typer.Argument(
        None, help="Filter: label, 'closed', 'all', or @username"
    ),
) -> None:
    """List issues with flexible filtering."""
    config = get_config()

    if not _check_gh():
        print_error("GitHub CLI (gh) required. Install: brew install gh")
        raise typer.Exit(1)

    print_header("Issues (filtered)", "")

    if not filter_arg:
        console.print("Filter: open (default)\n")
        output, _ = _run_gh(
            ["issue", "list", "--state", "open", "--limit", "30"], cwd=config.grove_root
        )
    elif filter_arg == "closed":
        console.print("Filter: closed\n")
        output, _ = _run_gh(
            ["issue", "list", "--state", "closed", "--limit", "30"],
            cwd=config.grove_root,
        )
    elif filter_arg == "all":
        console.print("Filter: all states\n")
        output, _ = _run_gh(
            ["issue", "list", "--state", "all", "--limit", "30"], cwd=config.grove_root
        )
    elif filter_arg.startswith("@"):
        assignee = filter_arg[1:]
        console.print(f"Filter: assigned to {assignee}\n")
        output, _ = _run_gh(
            [
                "issue",
                "list",
                "--state",
                "open",
                "--assignee",
                assignee,
                "--limit",
                "30",
            ],
            cwd=config.grove_root,
        )
    else:
        # Try as label
        console.print(f'Filter: label "{filter_arg}"\n')
        output, success = _run_gh(
            [
                "issue",
                "list",
                "--state",
                "open",
                "--label",
                filter_arg,
                "--limit",
                "30",
            ],
            cwd=config.grove_root,
        )
        if not output.strip():
            console.print(
                f'No issues with label "{filter_arg}". Trying keyword search...\n'
            )
            output, _ = _run_gh(
                [
                    "issue",
                    "list",
                    "--state",
                    "open",
                    "--search",
                    filter_arg,
                    "--limit",
                    "30",
                ],
                cwd=config.grove_root,
            )

    if output:
        console.print_raw(output.rstrip())
    else:
        console.print("  No issues found")


@app.command("board")
def board_cmd() -> None:
    """Board-style overview of open issues grouped by label."""
    config = get_config()

    if not _check_gh():
        print_error("GitHub CLI (gh) required. Install: brew install gh")
        raise typer.Exit(1)

    print_header("Issue Board", "")

    # Get all open issues with labels
    output, success = _run_gh(
        [
            "issue",
            "list",
            "--state",
            "open",
            "--limit",
            "100",
            "--json",
            "number,title,labels,assignees,updatedAt",
        ],
        cwd=config.grove_root,
    )

    if not success or not output.strip() or output.strip() == "[]":
        console.print("No open issues found")
        return

    try:
        issues = json_lib.loads(output)
    except json_lib.JSONDecodeError:
        console.print("Could not parse issues")
        return

    # Group by labels
    label_issues = {}
    unlabeled = []

    for issue in issues:
        labels = issue.get("labels", [])
        if not labels:
            unlabeled.append(issue)
        else:
            for label in labels:
                label_name = label.get("name", "unknown")
                if label_name not in label_issues:
                    label_issues[label_name] = []
                label_issues[label_name].append(issue)

    # Print by label
    for label_name in sorted(label_issues.keys()):
        print_section(label_name, "")
        for issue in label_issues[label_name][:10]:
            console.print(f"  #{issue['number']}  {issue['title'][:60]}")
        console.print()

    # Unlabeled
    print_section("Unlabeled", "")
    if unlabeled:
        for issue in unlabeled[:10]:
            console.print(f"  #{issue['number']}  {issue['title'][:60]}")
    else:
        console.print("  (all issues are labeled)")

    # Summary
    print_section("Summary", "")
    console.print(f"  Total open: {len(issues)}")
    console.print("  By label:")
    for label, items in sorted(label_issues.items(), key=lambda x: -len(x[1])):
        console.print(f"    {len(items):4d}  {label}")


@app.command("mine")
def mine_cmd() -> None:
    """Show issues assigned to you."""
    config = get_config()

    if not _check_gh():
        print_error("GitHub CLI (gh) required. Install: brew install gh")
        raise typer.Exit(1)

    print_header("My Issues", "")

    # Get username
    output, success = _run_gh(["api", "user", "--jq", ".login"], cwd=config.grove_root)
    if not success or not output.strip():
        print_error(
            "Could not determine your GitHub username. Run 'gh auth login' first."
        )
        raise typer.Exit(1)

    username = output.strip()
    console.print(f"Assigned to: @{username}\n")

    # Open issues assigned to me
    print_section("Open (assigned to me)", "")
    output, _ = _run_gh(
        ["issue", "list", "--state", "open", "--assignee", username, "--limit", "30"],
        cwd=config.grove_root,
    )
    if output.strip():
        console.print_raw(output.rstrip())
    else:
        console.print("  No open issues assigned to you")

    # Recently closed by me
    print_section("Recently Closed (by me)", "")
    output, _ = _run_gh(
        ["issue", "list", "--state", "closed", "--assignee", username, "--limit", "10"],
        cwd=config.grove_root,
    )
    if output.strip():
        console.print_raw(output.rstrip())
    else:
        console.print("  (none)")

    # Issues I created
    print_section("Created by Me (open)", "")
    output, _ = _run_gh(
        ["issue", "list", "--state", "open", "--author", username, "--limit", "10"],
        cwd=config.grove_root,
    )
    if output.strip():
        console.print_raw(output.rstrip())
    else:
        console.print("  (none)")


@app.command("stale")
def stale_cmd(
    days: int = typer.Argument(30, help="Days of inactivity"),
) -> None:
    """Find issues with no recent activity."""
    config = get_config()

    if not _check_gh():
        print_error("GitHub CLI (gh) required. Install: brew install gh")
        raise typer.Exit(1)

    print_header(f"Stale Issues ({days}+ days)", "")

    # Calculate cutoff date
    from datetime import datetime, timedelta

    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    console.print(f"Issues with no activity since {cutoff}:\n")

    # Get open issues with dates
    output, success = _run_gh(
        [
            "issue",
            "list",
            "--state",
            "open",
            "--limit",
            "100",
            "--json",
            "number,title,labels,updatedAt,assignees",
        ],
        cwd=config.grove_root,
    )

    if not success or not output.strip():
        console.print("Could not fetch issues")
        return

    try:
        issues = json_lib.loads(output)
    except json_lib.JSONDecodeError:
        console.print("Could not parse issues")
        return

    # Filter stale
    stale = []
    for issue in issues:
        updated = issue.get("updatedAt", "")[:10]  # YYYY-MM-DD
        if updated < cutoff:
            stale.append((updated, issue))

    if stale:
        stale.sort(key=lambda x: x[0])  # Oldest first
        console.print("#\tLast Updated\tTitle")
        for updated, issue in stale[:30]:
            console.print(f"#{issue['number']}\t{updated}\t{issue['title'][:50]}")
        console.print(f"\nTotal stale: {len(stale)} issues")
    else:
        console.print(f"No stale issues! All issues have activity within {days} days.")


@app.command("refs")
def refs_cmd(
    number: int = typer.Argument(..., help="Issue number to find references"),
) -> None:
    """Find where an issue is referenced across the project."""
    config = get_config()

    print_header(f"References to #{number}", "")

    # In code
    print_section("In Code", "")
    code_refs = _run_rg(
        [f"#{number}\\b", str(config.grove_root)], cwd=config.grove_root
    )
    if code_refs.strip():
        lines = code_refs.strip().split("\n")[:20]
        console.print_raw("\n".join(lines))
    else:
        console.print(f"  No code references to #{number}")

    # In commits
    print_section("In Commits", "")
    commits = _run_git(
        ["log", "--oneline", "--all", f"--grep=#{number}"], cwd=config.grove_root
    )
    if commits.strip():
        lines = commits.strip().split("\n")[:15]
        console.print_raw("\n".join(lines))
    else:
        console.print(f"  No commits mention #{number}")

    # In branches
    print_section("In Branches", "")
    branches = _run_git(["branch", "-a"], cwd=config.grove_root)
    if branches:
        related = [b.strip() for b in branches.split("\n") if str(number) in b]
        if related:
            console.print_raw("\n".join(related))
        else:
            console.print(f"  No branches reference #{number}")

    # In PRs
    if _check_gh():
        print_section("In Pull Requests", "")
        output, success = _run_gh(
            ["pr", "list", "--state", "all", "--search", f"#{number}", "--limit", "10"],
            cwd=config.grove_root,
        )
        if success and output.strip():
            console.print_raw(output.rstrip())
        else:
            console.print(f"  No PRs reference #{number}")


@app.command("link")
def link_cmd(
    filepath: str = typer.Argument(..., help="File path to find related issues"),
) -> None:
    """Find issues related to a specific file."""
    config = get_config()

    print_header("Issues Related to File", "")
    console.print(f"File: {filepath}\n")

    # Commits with issue refs
    print_section("Commits with Issue Refs", "")
    commits = _run_git(
        ["log", "--oneline", "--all", "--", filepath], cwd=config.grove_root
    )
    if commits.strip():
        # Filter to those mentioning issues
        lines = [l for l in commits.strip().split("\n") if "#" in l][:20]
        if lines:
            console.print_raw("\n".join(lines))
        else:
            console.print("  No commits mentioning issues found for this file")
    else:
        console.print("  No commits found for this file")

    # Extract issue numbers
    print_section("Referenced Issues", "")
    if commits.strip():
        import re

        issue_numbers = set(re.findall(r"#(\d+)", commits))
        if issue_numbers and _check_gh():
            for num in sorted(issue_numbers, key=int):
                output, success = _run_gh(
                    [
                        "issue",
                        "view",
                        num,
                        "--json",
                        "number,title,state",
                        "--jq",
                        '"#\\(.number) [\\(.state)] \\(.title)"',
                    ],
                    cwd=config.grove_root,
                )
                if success and output.strip():
                    console.print(f"  {output.strip()}")
        elif issue_numbers:
            for num in sorted(issue_numbers, key=int):
                console.print(f"  #{num}")
        else:
            console.print("  No issue references found in this file's history")
    else:
        console.print("  No issue references found")
