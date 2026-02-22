"""CI pipeline commands - run the full CI locally.

Enhanced with:
- --affected: Only run CI for packages with changes (uses git status)
- --diagnose: Structured error output when steps fail
"""

import json
import re
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import click

from ...git_wrapper import Git, GitError
from ...packages import load_monorepo
from ...ui import console, create_table, error, info, success, warning
from ..context import _get_affected_packages


@dataclass
class StepResult:
    """Result of a CI step."""

    name: str
    passed: bool
    duration: float
    output: str = ""
    errors: list[dict] = field(default_factory=list)


def _parse_typescript_errors(output: str) -> list[dict]:
    """Parse TypeScript error output into structured error objects."""
    errors = []
    # Match patterns like: src/lib/auth.ts(45,12): error TS2322: ...
    # or: src/lib/auth.ts:45:12 - error TS2322: ...
    for match in re.finditer(
        r'([^\s:]+\.(?:ts|tsx|svelte|js|jsx))[:(](\d+)[,:](\d+)[):]?\s*[-:]?\s*error\s+(TS\d+):\s*(.+)',
        output,
    ):
        errors.append({
            "file": match.group(1),
            "line": int(match.group(2)),
            "col": int(match.group(3)),
            "code": match.group(4),
            "message": match.group(5).strip(),
        })
    return errors


def _parse_lint_errors(output: str) -> list[dict]:
    """Parse ESLint/lint error output into structured error objects."""
    errors = []
    # Match: /path/file.ts:10:5  error  Description  rule-name
    for match in re.finditer(
        r'([^\s]+\.(?:ts|tsx|svelte|js|jsx)):(\d+):(\d+)\s+(error|warning)\s+(.+?)\s{2,}(\S+)',
        output,
    ):
        errors.append({
            "file": match.group(1),
            "line": int(match.group(2)),
            "col": int(match.group(3)),
            "severity": match.group(4),
            "message": match.group(5).strip(),
            "rule": match.group(6),
        })
    return errors


def _parse_test_errors(output: str) -> list[dict]:
    """Parse test failure output into structured error objects."""
    errors = []
    # Match Vitest failures: FAIL src/tests/auth.test.ts > suite > test name
    for match in re.finditer(
        r'FAIL\s+(.+?)\s+>\s+(.+)',
        output,
    ):
        errors.append({
            "file": match.group(1).strip(),
            "test": match.group(2).strip(),
        })
    return errors


@click.command()
@click.option("--package", "-p", help="Run CI for specific package only")
@click.option("--affected", is_flag=True, help="Only run CI for packages with changes (from git status)")
@click.option("--skip-lint", is_flag=True, help="Skip linting step")
@click.option("--skip-check", is_flag=True, help="Skip type checking step")
@click.option("--skip-test", is_flag=True, help="Skip testing step")
@click.option("--skip-build", is_flag=True, help="Skip build step")
@click.option("--fail-fast", is_flag=True, help="Stop on first failure")
@click.option("--diagnose", is_flag=True, help="Show structured error diagnostics on failure")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
@click.option("--dry-run", is_flag=True, help="Show what would be executed without running")
@click.pass_context
def ci(
    ctx: click.Context,
    package: Optional[str],
    affected: bool,
    skip_lint: bool,
    skip_check: bool,
    skip_test: bool,
    skip_build: bool,
    fail_fast: bool,
    diagnose: bool,
    verbose: bool,
    dry_run: bool,
) -> None:
    """Run the full CI pipeline locally.

    Runs: lint -> check -> test -> build

    Use --skip-* flags to skip individual steps.
    Use --affected to only check packages with uncommitted changes.
    Use --diagnose for structured error output when steps fail.

    \\b
    Examples:
        gw ci                          # Run full CI
        gw ci --affected               # Only changed packages
        gw ci --affected --fail-fast   # Fast feedback loop
        gw ci --diagnose               # Structured errors on failure
        gw ci --skip-lint              # Skip linting
        gw ci --package engine         # CI for specific package
        gw ci --dry-run                # Preview all steps
    """
    output_json = ctx.obj.get("output_json", False)

    monorepo = load_monorepo()
    if not monorepo:
        if output_json:
            console.print(json.dumps({"error": "Not in a monorepo"}))
        else:
            error("Not in a monorepo")
        raise SystemExit(1)

    # --affected: detect packages from git changes
    affected_packages: list[str] = []
    if affected and not package:
        try:
            git = Git()
            status = git.status()
            all_changed = (
                [path for _, path in status.staged]
                + [path for _, path in status.unstaged]
                + status.untracked
            )
            affected_packages = [
                p for p in _get_affected_packages(all_changed)
                if p != "root"
            ]

            if not affected_packages:
                if output_json:
                    console.print(json.dumps({
                        "passed": True,
                        "message": "No packages affected by current changes",
                        "duration": 0,
                        "steps": [],
                    }))
                else:
                    info("No packages affected by current changes — nothing to check")
                return
        except GitError:
            # Fall back to running everything if git fails
            affected_packages = []

    if not output_json:
        scope_msg = ""
        if package:
            scope_msg = f" [cyan]({package})[/cyan]"
        elif affected_packages:
            scope_msg = f" [cyan]({', '.join(affected_packages)})[/cyan]"
        console.print(f"\n[bold green]Grove CI Pipeline[/bold green]{scope_msg}\n")

    # Build steps
    steps = []
    if not skip_lint:
        steps.append(("lint", "Linting", ["pnpm", "-r", "run", "lint"]))
    if not skip_check:
        steps.append(("check", "Type Checking", ["pnpm", "-r", "run", "check"]))
    if not skip_test:
        steps.append(("test", "Testing", ["pnpm", "-r", "run", "test:run"]))
    if not skip_build:
        steps.append(("build", "Building", ["pnpm", "-r", "run", "build"]))

    # Filter to specific package(s)
    if package:
        steps = [
            (name, label, _filter_to_package(cmd, package))
            for name, label, cmd in steps
        ]
    elif affected_packages:
        # Run for each affected package
        filtered_steps = []
        for name, label, cmd in steps:
            for pkg in affected_packages:
                pkg_label = f"{label} ({pkg})"
                filtered_steps.append(
                    (f"{name}:{pkg}", pkg_label, _filter_to_package(cmd, pkg))
                )
        steps = filtered_steps

    # Dry run - show all steps that would run
    if dry_run:
        if output_json:
            console.print(json.dumps({
                "dry_run": True,
                "cwd": str(monorepo.root),
                "package": package or "all",
                "affected_packages": affected_packages if affected else [],
                "steps": [
                    {
                        "name": name,
                        "label": label,
                        "command": cmd,
                    }
                    for name, label, cmd in steps
                ],
            }, indent=2))
        else:
            scope = package or (', '.join(affected_packages) if affected_packages else 'All packages')
            console.print(f"[bold yellow]DRY RUN[/bold yellow] - Would execute:\n")
            console.print(f"  [cyan]Scope:[/cyan] {scope}")
            console.print(f"  [cyan]Directory:[/cyan] {monorepo.root}")
            console.print(f"  [cyan]Steps:[/cyan]\n")
            for i, (name, label, cmd) in enumerate(steps, 1):
                console.print(f"    {i}. {label}")
                console.print(f"       [dim]{' '.join(cmd)}[/dim]")
        return

    results: list[StepResult] = []
    all_passed = True
    start_time = time.time()

    for step_name, label, cmd in steps:
        if not output_json:
            console.print(f"[dim]> {label}...[/dim]")

        step_start = time.time()

        result = subprocess.run(
            cmd,
            cwd=monorepo.root,
            capture_output=True,
            text=True,
        )

        duration = time.time() - step_start
        passed = result.returncode == 0
        combined_output = result.stdout + result.stderr

        # Parse errors if diagnose mode is on and step failed
        step_errors: list[dict] = []
        if not passed and diagnose:
            base_step = step_name.split(":")[0]
            if base_step == "check":
                step_errors = _parse_typescript_errors(combined_output)
            elif base_step == "lint":
                step_errors = _parse_lint_errors(combined_output)
            elif base_step == "test":
                step_errors = _parse_test_errors(combined_output)

        results.append(StepResult(
            name=step_name,
            passed=passed,
            duration=duration,
            output=combined_output if (verbose or diagnose) else "",
            errors=step_errors,
        ))

        if not output_json:
            if passed:
                console.print(f"  [green]>[/green] {label} [dim]({duration:.1f}s)[/dim]")
            else:
                console.print(f"  [red]x[/red] {label} [dim]({duration:.1f}s)[/dim]")
                if verbose:
                    console.print(f"\n[red]{result.stderr}[/red]")
                if diagnose and step_errors:
                    console.print(f"\n  [bold red]Diagnostics ({len(step_errors)} errors):[/bold red]")
                    for err in step_errors[:10]:
                        if "file" in err and "line" in err:
                            console.print(f"    [cyan]{err['file']}:{err['line']}[/cyan] {err.get('message', err.get('test', ''))}")
                        elif "test" in err:
                            console.print(f"    [cyan]{err.get('file', '?')}[/cyan] > {err['test']}")
                    if len(step_errors) > 10:
                        console.print(f"    [dim]... +{len(step_errors) - 10} more[/dim]")

        if not passed:
            all_passed = False
            if fail_fast:
                break

    total_time = time.time() - start_time

    if output_json:
        data = {
            "passed": all_passed,
            "duration": round(total_time, 2),
            "affected_packages": affected_packages if affected else [],
            "steps": [
                {
                    "name": r.name,
                    "passed": r.passed,
                    "duration": round(r.duration, 2),
                    **({"errors": r.errors} if r.errors else {}),
                }
                for r in results
            ],
        }
        console.print(json.dumps(data, indent=2))
    else:
        console.print()
        _print_summary(results, all_passed, total_time)

    raise SystemExit(0 if all_passed else 1)


def _filter_to_package(cmd: list[str], package: str) -> list[str]:
    """Modify command to filter to a specific package."""
    # Replace -r with --filter
    if "-r" in cmd:
        idx = cmd.index("-r")
        return cmd[:idx] + ["--filter", package] + cmd[idx + 1:]
    return cmd


def _print_summary(results: list[StepResult], all_passed: bool, total_time: float) -> None:
    """Print CI summary."""
    console.print("[bold]--- CI Summary ---[/bold]\n")

    table = create_table()
    table.add_column("Step", style="cyan")
    table.add_column("Status", justify="center")
    table.add_column("Duration", justify="right", style="dim")

    for result in results:
        status = "[green]> PASS[/green]" if result.passed else "[red]x FAIL[/red]"
        table.add_row(result.name.title(), status, f"{result.duration:.1f}s")

    console.print(table)
    console.print()

    if all_passed:
        success(f"CI passed in {total_time:.1f}s")
    else:
        failed_steps = [r.name for r in results if not r.passed]
        error(f"CI failed: {', '.join(failed_steps)}")
        console.print(f"\n[dim]Total time: {total_time:.1f}s[/dim]")
