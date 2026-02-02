"""CI pipeline commands - run the full CI locally."""

import json
import subprocess
import sys
import time
from dataclasses import dataclass
from typing import Optional

import click

from ...packages import load_monorepo
from ...ui import console, create_table, error, info, success, warning


@dataclass
class StepResult:
    """Result of a CI step."""

    name: str
    passed: bool
    duration: float
    output: str = ""


@click.command()
@click.option("--package", "-p", help="Run CI for specific package only")
@click.option("--skip-lint", is_flag=True, help="Skip linting step")
@click.option("--skip-check", is_flag=True, help="Skip type checking step")
@click.option("--skip-test", is_flag=True, help="Skip testing step")
@click.option("--skip-build", is_flag=True, help="Skip build step")
@click.option("--fail-fast", is_flag=True, help="Stop on first failure")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
@click.option("--dry-run", is_flag=True, help="Show what would be executed without running")
@click.pass_context
def ci(
    ctx: click.Context,
    package: Optional[str],
    skip_lint: bool,
    skip_check: bool,
    skip_test: bool,
    skip_build: bool,
    fail_fast: bool,
    verbose: bool,
    dry_run: bool,
) -> None:
    """Run the full CI pipeline locally.

    Runs: lint → check → test → build

    Use --skip-* flags to skip individual steps.

    \b
    Examples:
        gw ci                          # Run full CI
        gw ci --fail-fast              # Stop on first failure
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

    if not output_json:
        console.print("\n[bold green]🌲 Grove CI Pipeline[/bold green]\n")

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

    # Filter to specific package if requested
    if package:
        steps = [
            (name, label, _filter_to_package(cmd, package))
            for name, label, cmd in steps
        ]

    # Dry run - show all steps that would run
    if dry_run:
        if output_json:
            console.print(json.dumps({
                "dry_run": True,
                "cwd": str(monorepo.root),
                "package": package or "all",
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
            console.print(f"[bold yellow]DRY RUN[/bold yellow] - Would execute:\n")
            console.print(f"  [cyan]Scope:[/cyan] {package or 'All packages'}")
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
            console.print(f"[dim]▶ {label}...[/dim]")

        step_start = time.time()

        result = subprocess.run(
            cmd,
            cwd=monorepo.root,
            capture_output=True,
            text=True,
        )

        duration = time.time() - step_start
        passed = result.returncode == 0

        results.append(StepResult(
            name=step_name,
            passed=passed,
            duration=duration,
            output=result.stdout + result.stderr if verbose else "",
        ))

        if not output_json:
            if passed:
                console.print(f"  [green]✓[/green] {label} [dim]({duration:.1f}s)[/dim]")
            else:
                console.print(f"  [red]✗[/red] {label} [dim]({duration:.1f}s)[/dim]")
                if verbose:
                    console.print(f"\n[red]{result.stderr}[/red]")

        if not passed:
            all_passed = False
            if fail_fast:
                break

    total_time = time.time() - start_time

    if output_json:
        console.print(json.dumps({
            "passed": all_passed,
            "duration": round(total_time, 2),
            "steps": [
                {
                    "name": r.name,
                    "passed": r.passed,
                    "duration": round(r.duration, 2),
                }
                for r in results
            ],
        }, indent=2))
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
    console.print("[bold]━━━ CI Summary ━━━[/bold]\n")

    table = create_table()
    table.add_column("Step", style="cyan")
    table.add_column("Status", justify="center")
    table.add_column("Duration", justify="right", style="dim")

    for result in results:
        status = "[green]✓ PASS[/green]" if result.passed else "[red]✗ FAIL[/red]"
        table.add_row(result.name.title(), status, f"{result.duration:.1f}s")

    console.print(table)
    console.print()

    if all_passed:
        success(f"CI passed in {total_time:.1f}s")
    else:
        failed_steps = [r.name for r in results if not r.passed]
        error(f"CI failed: {', '.join(failed_steps)}")
        console.print(f"\n[dim]Total time: {total_time:.1f}s[/dim]")
