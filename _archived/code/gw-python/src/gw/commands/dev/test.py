"""Test running commands."""

import json
import subprocess
from typing import Optional

import click

from ...packages import (
    Package,
    PackageType,
    detect_current_package,
    load_monorepo,
)
from ...ui import console, create_table, error, info, success, warning


@click.command()
@click.option("--package", "-p", help="Package name (default: auto-detect)")
@click.option("--all", "run_all", is_flag=True, help="Run tests for all packages")
@click.option("--watch", "-w", is_flag=True, help="Watch mode (re-run on changes)")
@click.option("--coverage", "-c", is_flag=True, help="Generate coverage report")
@click.option("--filter", "-k", "test_filter", help="Filter tests by name pattern")
@click.option("--ui", is_flag=True, help="Open Vitest UI (TypeScript packages)")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
@click.option("--dry-run", is_flag=True, help="Show what would be executed without running")
@click.argument("extra_args", nargs=-1, type=click.UNPROCESSED)
@click.pass_context
def test(
    ctx: click.Context,
    package: Optional[str],
    run_all: bool,
    watch: bool,
    coverage: bool,
    test_filter: Optional[str],
    ui: bool,
    verbose: bool,
    dry_run: bool,
    extra_args: tuple,
) -> None:
    """Run tests for packages.

    Auto-detects the current package or use --package to specify.
    Use --all to run tests across all packages.

    \b
    Examples:
        gw test                        # Test current package
        gw test --all                  # Test all packages
        gw test -w                     # Watch mode
        gw test -c                     # With coverage
        gw test -k "auth"              # Filter by name
        gw test --package engine       # Test specific package
        gw test --dry-run              # Preview command
    """
    output_json = ctx.obj.get("output_json", False)

    if run_all:
        _run_all_tests(output_json, watch, coverage, verbose)
        return

    # Find the package
    pkg = _resolve_package(package)
    if not pkg:
        if output_json:
            console.print(json.dumps({"error": "No package found"}))
        else:
            error("No package found. Run from a package directory or use --package")
            info("Or use --all to run all tests")
        raise SystemExit(1)

    # Check if test script exists
    if not pkg.has_script.get("test"):
        if output_json:
            console.print(json.dumps({"error": f"Package '{pkg.name}' has no test script"}))
        else:
            error(f"Package '{pkg.name}' has no test script")
        raise SystemExit(1)

    # Build command based on package type
    if pkg.package_type == PackageType.PYTHON:
        cmd = _build_python_test_cmd(pkg, watch, coverage, test_filter, verbose, extra_args)
    else:
        cmd = _build_node_test_cmd(pkg, watch, coverage, test_filter, ui, verbose, extra_args)

    # Dry run - just show what would be executed
    if dry_run:
        if output_json:
            console.print(json.dumps({
                "dry_run": True,
                "package": pkg.name,
                "cwd": str(pkg.path),
                "command": cmd,
            }, indent=2))
        else:
            console.print(f"[bold yellow]DRY RUN[/bold yellow] - Would execute:\n")
            console.print(f"  [cyan]Package:[/cyan] {pkg.name}")
            console.print(f"  [cyan]Directory:[/cyan] {pkg.path}")
            console.print(f"  [cyan]Command:[/cyan] {' '.join(cmd)}")
        return

    if not output_json:
        console.print(f"[dim]Testing {pkg.name}...[/dim]")
        console.print(f"[dim]Command: {' '.join(cmd)}[/dim]\n")

    result = subprocess.run(cmd, cwd=pkg.path)

    if output_json:
        console.print(json.dumps({
            "package": pkg.name,
            "passed": result.returncode == 0,
            "returncode": result.returncode,
        }))
    else:
        if result.returncode == 0:
            success(f"Tests passed for {pkg.name}")
        else:
            error(f"Tests failed for {pkg.name}")

    raise SystemExit(result.returncode)


def _build_python_test_cmd(
    pkg: Package,
    watch: bool,
    coverage: bool,
    test_filter: Optional[str],
    verbose: bool,
    extra_args: tuple,
) -> list[str]:
    """Build pytest command."""
    cmd = ["uv", "run", "pytest"]

    if watch:
        # pytest-watch
        cmd = ["uv", "run", "ptw", "--"]

    if coverage:
        cmd.extend(["--cov", "--cov-report=term-missing"])

    if test_filter:
        cmd.extend(["-k", test_filter])

    if verbose:
        cmd.append("-v")

    cmd.extend(extra_args)
    return cmd


def _build_node_test_cmd(
    pkg: Package,
    watch: bool,
    coverage: bool,
    test_filter: Optional[str],
    ui: bool,
    verbose: bool,
    extra_args: tuple,
) -> list[str]:
    """Build vitest command."""
    # Determine which script to use
    if watch and "test" in pkg.scripts:
        # test usually runs in watch mode
        cmd = ["pnpm", "run", "test"]
    elif "test:run" in pkg.scripts and not watch:
        cmd = ["pnpm", "run", "test:run"]
    elif "test" in pkg.scripts:
        cmd = ["pnpm", "run", "test"]
    else:
        cmd = ["pnpm", "exec", "vitest"]

    # Add vitest flags via --
    extra = []

    if ui:
        extra.append("--ui")

    if coverage:
        extra.append("--coverage")

    if test_filter:
        extra.extend(["-t", test_filter])

    if verbose:
        extra.append("--reporter=verbose")

    if extra:
        cmd.append("--")
        cmd.extend(extra)

    cmd.extend(extra_args)
    return cmd


def _run_all_tests(output_json: bool, watch: bool, coverage: bool, verbose: bool) -> None:
    """Run tests for all packages in the monorepo."""
    monorepo = load_monorepo()
    if not monorepo:
        if output_json:
            console.print(json.dumps({"error": "Not in a monorepo"}))
        else:
            error("Not in a monorepo")
        raise SystemExit(1)

    if not output_json:
        console.print("[bold]Running tests for all packages...[/bold]\n")

    # Use pnpm's recursive run
    script = "test" if watch else "test:run"
    cmd = ["pnpm", "-r", "run", script]

    if verbose:
        cmd.insert(1, "--reporter-hide-prefix")

    result = subprocess.run(cmd, cwd=monorepo.root)

    if output_json:
        console.print(json.dumps({
            "all": True,
            "passed": result.returncode == 0,
        }))

    raise SystemExit(result.returncode)


def _resolve_package(name: Optional[str]) -> Optional[Package]:
    """Resolve package by name or auto-detect."""
    if name:
        monorepo = load_monorepo()
        if monorepo:
            return monorepo.find_package(name)
        return None

    return detect_current_package()
