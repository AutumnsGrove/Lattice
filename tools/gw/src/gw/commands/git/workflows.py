"""Git workflow commands — ship (commit+push) and prep (preflight check).

These are the everyday workflow commands that replace the multi-step
stage → format → check → commit → push cycle with a single command.

- ship: Format → type-check → commit → push (the canonical commit+push)
- prep: Preflight check (dry run of what ship would do)
"""

import json
import subprocess
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from ...git_wrapper import Git, GitError
from ...packages import detect_current_package, load_monorepo
from ...safety.git import (
    GitSafetyConfig,
    GitSafetyError,
    check_git_safety,
    extract_issue_number,
    validate_conventional_commit,
)
from ..context import _get_affected_packages

console = Console()


def _get_staged_file_paths(git: Git) -> list[str]:
    """Get list of staged file paths."""
    status = git.status()
    return [path for _, path in status.staged]



def _run_format_on_staged(git: Git, output_json: bool) -> tuple[bool, str]:
    """Run prettier on staged files. Returns (success, message)."""
    staged_files = _get_staged_file_paths(git)
    if not staged_files:
        return True, "No staged files to format"

    # Filter to formattable extensions
    formattable_exts = {
        ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
        ".svelte", ".css", ".scss", ".postcss",
        ".json", ".html", ".md", ".mdx", ".yaml", ".yml",
    }

    formattable = [
        f for f in staged_files
        if Path(f).suffix.lower() in formattable_exts
    ]

    if not formattable:
        return True, "No formattable files staged"

    # Run prettier on the formattable files
    try:
        result = subprocess.run(
            ["bun", "x", "prettier", "--write"] + formattable,
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode == 0:
            # Re-stage formatted files (prettier may have changed them)
            git.add(formattable)
            return True, f"Formatted {len(formattable)} file(s)"
        else:
            # Try to re-stage anyway (some files may have been formatted)
            try:
                git.add(formattable)
            except GitError:
                pass
            return False, f"Prettier had issues: {result.stderr[:200]}"

    except FileNotFoundError:
        return False, "bun not found — install bun or run `gw fmt` manually"
    except subprocess.TimeoutExpired:
        return False, "Prettier timed out (60s limit)"


def _run_type_check(staged_files: list[str], output_json: bool) -> tuple[bool, str]:
    """Run type checking on affected packages. Returns (success, message)."""
    packages = _get_affected_packages(staged_files)

    if not packages or packages == ["root"]:
        return True, "No package-level changes to type-check"

    monorepo = load_monorepo()
    if not monorepo:
        return True, "Not in a monorepo — skipping type check"

    errors = []
    checked = []

    for pkg_name in packages:
        if pkg_name.startswith("tools/"):
            continue  # Python tools — skip TS type check

        pkg = monorepo.find_package(pkg_name)
        if not pkg:
            continue

        # Check if package has a check script
        if "check" not in pkg.scripts:
            continue

        checked.append(pkg_name)

        try:
            result = subprocess.run(
                ["pnpm", "run", "check"],
                cwd=pkg.path,
                capture_output=True,
                text=True,
                timeout=120,
            )
            if result.returncode != 0:
                errors.append((pkg_name, result.stderr[:300] or result.stdout[:300]))
        except subprocess.TimeoutExpired:
            errors.append((pkg_name, "Type check timed out (120s limit)"))
        except subprocess.SubprocessError as e:
            errors.append((pkg_name, str(e)))

    if not checked:
        return True, "No packages with type checking"

    if errors:
        error_details = "; ".join(f"{name}: {msg}" for name, msg in errors)
        return False, f"Type errors in {len(errors)} package(s): {error_details}"

    return True, f"Type check passed for {', '.join(checked)}"


@click.command()
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--message", "-m", "message", required=True, help="Commit message (conventional format)")
@click.option("--issue", type=int, help="Link to issue number")
@click.option("--no-check", is_flag=True, help="Skip type checking")
@click.option("--no-format", is_flag=True, help="Skip formatting")
@click.option("--all", "-a", "stage_all", is_flag=True, help="Auto-stage all changes before shipping")
@click.argument("remote", default="origin")
@click.pass_context
def ship(
    ctx: click.Context,
    write: bool,
    message: str,
    issue: Optional[int],
    no_check: bool,
    no_format: bool,
    stage_all: bool,
    remote: str,
) -> None:
    """Format, check, commit, and push in one step.

    The canonical commit+push workflow. Runs all safety checks before
    committing, then pushes to the current branch.

    Requires --write flag. Use -a/--all to auto-stage all changes.

    \b
    Steps:
    1. Auto-stage (if --all)
    2. Format staged files with Prettier
    3. Type-check affected packages
    4. Commit with Conventional Commits message
    5. Push to current branch (auto --set-upstream if new)

    \b
    Examples:
        gw git ship --write -m "feat(auth): add session refresh"
        gw git ship --write -m "fix(ui): correct button alignment" --issue 348
        gw git ship --write -m "chore: update deps" --no-check
    """
    output_json = ctx.obj.get("output_json", False)

    # Safety check
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

        # Auto-stage if --all is passed
        if stage_all:
            git.add([], all_files=True)
            if not output_json:
                console.print("[dim]Auto-staged all changes[/dim]")

        # Check for staged changes
        status = git.status()
        if not status.staged:
            if status.unstaged or status.untracked:
                console.print("[yellow]No staged changes to ship[/yellow]")
                console.print("[dim]Use --all / -a to auto-stage, or stage manually: gw git add --write <files>[/dim]")
            else:
                console.print("[yellow]Nothing to ship — working directory clean[/yellow]")
            raise SystemExit(1)

        config = GitSafetyConfig()
        current_branch = git.current_branch()
        staged_files = _get_staged_file_paths(git)

        # Auto-detect issue from branch name
        if issue is None and config.auto_link_issues:
            issue = extract_issue_number(current_branch, config)

        # Add issue reference if not already present
        if issue and f"#{issue}" not in message:
            lines = message.split("\n")
            lines[0] = f"{lines[0]} (#{issue})"
            message = "\n".join(lines)

        # Validate conventional commit format
        valid, error = validate_conventional_commit(message, config)
        if not valid:
            console.print(f"[red]Invalid commit message:[/red] {error}")
            raise SystemExit(1)

        if not output_json:
            console.print(Panel(
                f"Branch: [cyan]{current_branch}[/cyan]\n"
                f"Remote: [cyan]{remote}[/cyan]\n"
                f"Files:  [cyan]{len(staged_files)} staged[/cyan]\n"
                f"Message: [green]{message}[/green]",
                title="[bold]Ship[/bold]",
                border_style="green",
            ))

        results = []

        # Step 1: Format
        if not no_format:
            if not output_json:
                console.print("[dim]Formatting staged files...[/dim]")
            fmt_ok, fmt_msg = _run_format_on_staged(git, output_json)
            results.append(("Format", fmt_ok, fmt_msg))
            if not output_json:
                icon = "✓" if fmt_ok else "✗"
                color = "green" if fmt_ok else "yellow"
                console.print(f"  [{color}]{icon}[/{color}] {fmt_msg}")
            # Format failures are warnings, not blockers
        else:
            results.append(("Format", True, "Skipped"))

        # Step 2: Type check
        if not no_check:
            if not output_json:
                console.print("[dim]Running type checks...[/dim]")
            check_ok, check_msg = _run_type_check(staged_files, output_json)
            results.append(("Check", check_ok, check_msg))
            if not output_json:
                icon = "✓" if check_ok else "⚠"
                color = "green" if check_ok else "yellow"
                console.print(f"  [{color}]{icon}[/{color}] {check_msg}")
            # Type check failures are warnings for ship (prep is stricter)
        else:
            results.append(("Check", True, "Skipped"))

        # Step 3: Commit
        if not output_json:
            console.print("[dim]Committing...[/dim]")
        commit_hash = git.commit(message)
        results.append(("Commit", True, f"Hash: {commit_hash[:8]}"))
        if not output_json:
            console.print(f"  [green]✓[/green] Committed: {message.split(chr(10))[0]}")

        # Step 4: Push
        if not output_json:
            console.print("[dim]Pushing...[/dim]")
        try:
            # Auto set-upstream for new branches
            git.push(remote=remote, branch=current_branch, set_upstream=True)
            results.append(("Push", True, f"{remote}/{current_branch}"))
            if not output_json:
                console.print(f"  [green]✓[/green] Pushed to {remote}/{current_branch}")
        except GitError as push_err:
            push_stderr = push_err.stderr.lower()
            if "non-fast-forward" in push_stderr or "fetch first" in push_stderr:
                console.print("[red]Push failed: remote has newer commits[/red]")
                console.print(
                    "[dim]Run 'gw git sync --write' to rebase and push, "
                    "or pull first with 'gw git pull --write'[/dim]"
                )
            elif "pre-push" in push_stderr:
                console.print("[red]Push blocked by pre-push hook[/red]")
                if push_err.stderr.strip():
                    console.print(f"\n{push_err.stderr.strip()}")
            else:
                console.print(f"[red]Push failed:[/red] {push_err.stderr.strip() or push_err.message}")
            results.append(("Push", False, push_err.message))
            raise SystemExit(1)

        # Summary
        if output_json:
            console.print(json.dumps({
                "shipped": True,
                "hash": commit_hash,
                "message": message,
                "remote": remote,
                "branch": current_branch,
                "issue": issue,
                "steps": [
                    {"name": name, "ok": ok, "detail": detail}
                    for name, ok, detail in results
                ],
            }))
        else:
            console.print(f"\n[bold green]Shipped![/bold green] {commit_hash[:8]} → {remote}/{current_branch}")
            if issue:
                console.print(f"[dim]Linked to issue #{issue}[/dim]")

    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)


@click.command()
@click.pass_context
def prep(ctx: click.Context) -> None:
    """Pre-commit preflight check — dry run of what ship would do.

    This is a READ operation (no --write needed). It checks:
    1. What's staged vs unstaged
    2. Whether staged files pass Prettier formatting
    3. Whether affected packages pass type checking

    Use before `gw git ship` to preview what would happen.

    \b
    Examples:
        gw git prep                    # Run preflight check
        gw git prep | cat              # Machine-readable output
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        status = git.status()
        staged_files = [path for _, path in status.staged]
        unstaged_files = [path for _, path in status.unstaged]
        current_branch = git.current_branch()

        if not output_json:
            console.print(Panel(
                f"Branch: [cyan]{current_branch}[/cyan]",
                title="[bold]Preflight Check[/bold]",
                border_style="blue",
            ))

        all_pass = True

        # Report: Staging status
        if not output_json:
            table = Table(title="File Status", border_style="blue", show_lines=False)
            table.add_column("Category", style="cyan", width=12)
            table.add_column("Count", style="bold", width=6)
            table.add_column("Files", style="dim")

            staged_preview = ", ".join(staged_files[:5])
            if len(staged_files) > 5:
                staged_preview += f", ... (+{len(staged_files) - 5} more)"

            unstaged_preview = ", ".join(unstaged_files[:5])
            if len(unstaged_files) > 5:
                unstaged_preview += f", ... (+{len(unstaged_files) - 5} more)"

            untracked_preview = ", ".join(status.untracked[:5])
            if len(status.untracked) > 5:
                untracked_preview += f", ... (+{len(status.untracked) - 5} more)"

            table.add_row("Staged", str(len(staged_files)), staged_preview or "(none)")
            table.add_row("Unstaged", str(len(unstaged_files)), unstaged_preview or "(none)")
            table.add_row("Untracked", str(len(status.untracked)), untracked_preview or "(none)")
            console.print(table)
            console.print()

        if not staged_files:
            if output_json:
                console.print(json.dumps({"ready": False, "reason": "Nothing staged"}))
            else:
                console.print("[yellow]Nothing staged — nothing to ship[/yellow]")
                console.print("[dim]Stage changes: gw git add --write <files>[/dim]")
            raise SystemExit(1)

        # Check 1: Prettier formatting
        if not output_json:
            console.print("[dim]Checking formatting...[/dim]")

        formattable_exts = {
            ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
            ".svelte", ".css", ".scss", ".postcss",
            ".json", ".html", ".md", ".mdx", ".yaml", ".yml",
        }

        formattable = [
            f for f in staged_files
            if Path(f).suffix.lower() in formattable_exts
        ]

        fmt_ok = True
        fmt_msg = "No formattable files"

        if formattable:
            try:
                result = subprocess.run(
                    ["bun", "x", "prettier", "--check"] + formattable,
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if result.returncode == 0:
                    fmt_msg = f"All {len(formattable)} file(s) formatted correctly"
                else:
                    fmt_ok = False
                    all_pass = False
                    # Extract unformatted files from stderr
                    fmt_msg = f"{len(formattable)} file(s) need formatting — run `gw fmt` or `gw git ship` will auto-fix"
            except FileNotFoundError:
                fmt_msg = "bun not available — skipping format check"
            except subprocess.TimeoutExpired:
                fmt_msg = "Format check timed out"

        if not output_json:
            icon = "✓" if fmt_ok else "✗"
            color = "green" if fmt_ok else "red"
            console.print(f"  [{color}]{icon}[/{color}] Format: {fmt_msg}")

        # Check 2: Type checking
        if not output_json:
            console.print("[dim]Checking types...[/dim]")

        check_ok, check_msg = _run_type_check(staged_files, output_json)
        if not check_ok:
            all_pass = False

        if not output_json:
            icon = "✓" if check_ok else "✗"
            color = "green" if check_ok else "red"
            console.print(f"  [{color}]{icon}[/{color}] Types: {check_msg}")

        # Summary
        if output_json:
            console.print(json.dumps({
                "ready": all_pass,
                "branch": current_branch,
                "staged": len(staged_files),
                "unstaged": len(unstaged_files),
                "untracked": len(status.untracked),
                "format": {"ok": fmt_ok, "detail": fmt_msg},
                "types": {"ok": check_ok, "detail": check_msg},
                "packages": _get_affected_packages(staged_files),
            }, indent=2))
        else:
            console.print()
            if all_pass:
                console.print("[bold green]Ready to ship![/bold green]")
                console.print("[dim]Run: gw git ship --write -m \"type(scope): message\"[/dim]")
            else:
                console.print("[bold red]Not ready — fix issues above before shipping[/bold red]")
                if not fmt_ok:
                    console.print("[dim]Format fix: gw fmt[/dim]")

        raise SystemExit(0 if all_pass else 1)

    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)


@click.command("pr-prep")
@click.option("--base", default="main", help="Base branch to compare against")
@click.pass_context
def pr_prep(ctx: click.Context, base: str) -> None:
    """PR preparation report — everything needed to create a great PR.

    Analyzes all changes since branching from base, summarizes affected
    packages, counts files/lines, checks push status, and suggests
    a PR title based on commit history.

    This is a READ operation (no --write needed).

    \\b
    Examples:
        gw git pr-prep                 # Compare against main
        gw git pr-prep --base develop  # Compare against develop
    """
    import re as _re

    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()
        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        status = git.status()
        current_branch = git.current_branch()

        if current_branch == base:
            msg = f"Already on {base} — switch to a feature branch first"
            if output_json:
                console.print(json.dumps({"error": msg}))
            else:
                console.print(f"[yellow]{msg}[/yellow]")
            raise SystemExit(1)

        # Get merge base
        try:
            merge_base = git.execute(["merge-base", base, "HEAD"]).strip()
        except GitError:
            merge_base = base

        # Get commits since merge base
        branch_commits = []
        try:
            commit_output = git.execute([
                "log", f"{merge_base}..HEAD",
                "--format=%h%x00%an%x00%aI%x00%s%x00%x1e",
            ])
            for entry in commit_output.split("\x1e"):
                entry = entry.strip()
                if not entry:
                    continue
                parts = entry.split("\x00")
                if len(parts) >= 4:
                    branch_commits.append({
                        "hash": parts[0],
                        "author": parts[1],
                        "date": parts[2],
                        "message": parts[3],
                    })
        except GitError:
            pass

        # Get diff stats against base
        try:
            diff = git.diff(ref=f"{merge_base}...HEAD" if merge_base != base else base, stat_only=True)
        except GitError:
            diff = git.diff(stat_only=True)

        # Affected packages from changed files
        changed_files = [f["path"] for f in diff.files]
        affected = _get_affected_packages(changed_files)

        # Issue from branch name
        issue = git.extract_issue_from_branch(current_branch)

        # Issues referenced in commit messages
        referenced_issues = set()
        if issue:
            referenced_issues.add(issue)
        for c in branch_commits:
            for m in _re.finditer(r'#(\d+)', c.get("message", "")):
                referenced_issues.add(int(m.group(1)))

        # Suggest title from first commit or branch name
        suggested_title = ""
        if branch_commits:
            suggested_title = branch_commits[-1]["message"]
        elif "/" in current_branch:
            parts = current_branch.split("/", 1)
            slug = parts[1] if len(parts) > 1 else parts[0]
            slug = _re.sub(r'^\d+-', '', slug).replace("-", " ").replace("_", " ")
            suggested_title = f"{parts[0]}: {slug}"

        # Check push status
        pushed = status.ahead == 0 and status.upstream is not None
        uncommitted = not status.is_clean
        ready = pushed and not uncommitted

        if output_json:
            console.print(json.dumps({
                "branch": current_branch,
                "base": base,
                "commits": len(branch_commits),
                "files_changed": diff.stats["files_changed"],
                "insertions": diff.stats["additions"],
                "deletions": diff.stats["deletions"],
                "affected_packages": affected,
                "issues_referenced": sorted(referenced_issues),
                "suggested_title": suggested_title,
                "pushed": pushed,
                "uncommitted": uncommitted,
                "ready": ready,
                "ahead": status.ahead,
            }, indent=2))
        else:
            console.print(Panel(
                f"Branch: [cyan]{current_branch}[/cyan] -> [dim]{base}[/dim]\n"
                f"Commits: [bold]{len(branch_commits)}[/bold]  |  "
                f"Files: [bold]{diff.stats['files_changed']}[/bold]  |  "
                f"[green]+{diff.stats['additions']}[/green] [red]-{diff.stats['deletions']}[/red]\n"
                f"Packages: {', '.join(affected) if affected else '[dim]none[/dim]'}\n"
                f"Issues: {', '.join(f'#{i}' for i in sorted(referenced_issues)) if referenced_issues else '[dim]none[/dim]'}",
                title="[bold]PR Preparation[/bold]",
                border_style="blue",
            ))

            console.print()
            checks = [
                ("Committed", status.is_clean, "All changes committed" if status.is_clean else "Uncommitted changes exist"),
                ("Pushed", pushed, "All commits pushed" if pushed else f"{status.ahead} commit(s) not yet pushed"),
            ]
            for label, ok, msg in checks:
                icon = "[green]>[/green]" if ok else "[yellow]~[/yellow]"
                console.print(f"  {icon} {label}: {msg}")

            if suggested_title:
                console.print(f"\n[dim]Suggested title:[/dim] [bold]{suggested_title}[/bold]")

            console.print()
            if ready:
                console.print("[bold green]Ready to create PR![/bold green]")
                title_flag = f'--title "{suggested_title}"' if suggested_title else ''
                console.print(f'[dim]Run: gw gh pr create --write {title_flag}[/dim]')
            else:
                if uncommitted:
                    console.print("[dim]Ship changes first: gw git ship --write -a -m \"...\"[/dim]")
                elif not pushed:
                    console.print("[dim]Push first: gw git push --write[/dim]")

    except GitError as e:
        if output_json:
            console.print(json.dumps({"error": e.message}))
        else:
            console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)
