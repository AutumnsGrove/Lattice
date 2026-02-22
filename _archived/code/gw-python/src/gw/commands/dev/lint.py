"""Linting commands."""

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
from ...ui import console, error, info, success, warning


@click.command()
@click.option("--package", "-p", help="Package name (default: auto-detect)")
@click.option("--all", "lint_all", is_flag=True, help="Lint all packages")
@click.option("--fix", is_flag=True, help="Auto-fix issues where possible")
@click.option("--write", "write_flag", is_flag=True, help="Confirm auto-fix (alias for --fix)")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
@click.option("--dry-run", is_flag=True, help="Show what would be executed without running")
@click.argument("extra_args", nargs=-1, type=click.UNPROCESSED)
@click.pass_context
def lint(
    ctx: click.Context,
    package: Optional[str],
    lint_all: bool,
    fix: bool,
    write_flag: bool,
    verbose: bool,
    dry_run: bool,
    extra_args: tuple,
) -> None:
    """Run linting.

    For TypeScript: runs eslint/prettier
    For Python: runs ruff

    Use --fix or --write to auto-fix issues.

    \b
    Examples:
        gw lint                        # Lint current package
        gw lint --all                  # Lint all packages
        gw lint --fix                  # Auto-fix issues
        gw lint --package engine       # Lint specific package
        gw lint --dry-run              # Preview command
    """
    output_json = ctx.obj.get("output_json", False)
    should_fix = fix or write_flag

    if lint_all:
        _lint_all(output_json, should_fix, verbose, dry_run)
        return

    # Find the package
    pkg = _resolve_package(package)
    if not pkg:
        if output_json:
            console.print(json.dumps({"error": "No package found"}))
        else:
            error("No package found. Run from a package directory or use --package")
            info("Or use --all to lint all packages")
        raise SystemExit(1)

    # Build command based on package type
    if pkg.package_type == PackageType.PYTHON:
        cmd = _build_python_lint_cmd(pkg, should_fix, verbose, extra_args)
    else:
        cmd = _build_node_lint_cmd(pkg, should_fix, verbose, extra_args)

    # Dry run - show what would be executed
    if dry_run:
        if output_json:
            console.print(json.dumps({
                "dry_run": True,
                "package": pkg.name,
                "cwd": str(pkg.path),
                "command": cmd,
                "fix": should_fix,
            }, indent=2))
        else:
            console.print(f"[bold yellow]DRY RUN[/bold yellow] - Would execute:\n")
            console.print(f"  [cyan]Package:[/cyan] {pkg.name}")
            console.print(f"  [cyan]Directory:[/cyan] {pkg.path}")
            if should_fix:
                console.print(f"  [cyan]Mode:[/cyan] Auto-fix")
            console.print(f"  [cyan]Command:[/cyan] {' '.join(cmd)}")
        return

    if not output_json:
        action = "Fixing" if should_fix else "Linting"
        console.print(f"[dim]{action} {pkg.name}...[/dim]")
        console.print(f"[dim]Command: {' '.join(cmd)}[/dim]\n")

    result = subprocess.run(cmd, cwd=pkg.path)

    if output_json:
        console.print(json.dumps({
            "package": pkg.name,
            "passed": result.returncode == 0,
            "fixed": should_fix,
        }))
    else:
        if result.returncode == 0:
            if should_fix:
                success(f"Fixed lint issues in {pkg.name}")
            else:
                success(f"Lint passed for {pkg.name}")
        else:
            error(f"Lint failed for {pkg.name}")
            if not should_fix:
                info("Run with --fix to auto-fix issues")

    raise SystemExit(result.returncode)


def _build_python_lint_cmd(
    pkg: Package,
    fix: bool,
    verbose: bool,
    extra_args: tuple,
) -> list[str]:
    """Build ruff command for Python packages."""
    cmd = ["uv", "run", "ruff", "check", "."]

    if fix:
        cmd.append("--fix")

    if verbose:
        cmd.append("--verbose")

    cmd.extend(extra_args)
    return cmd


def _build_node_lint_cmd(
    pkg: Package,
    fix: bool,
    verbose: bool,
    extra_args: tuple,
) -> list[str]:
    """Build eslint/prettier command for Node packages."""
    # Check if package has lint script
    if "lint" in pkg.scripts:
        cmd = ["pnpm", "run", "lint"]
        if fix and "lint:fix" in pkg.scripts:
            cmd = ["pnpm", "run", "lint:fix"]
    else:
        # Fall back to eslint directly
        cmd = ["pnpm", "exec", "eslint", "src"]
        if fix:
            cmd.append("--fix")

    cmd.extend(extra_args)
    return cmd


def _lint_all(output_json: bool, fix: bool, verbose: bool, dry_run: bool = False) -> None:
    """Run linting for all packages."""
    monorepo = load_monorepo()
    if not monorepo:
        if output_json:
            console.print(json.dumps({"error": "Not in a monorepo"}))
        else:
            error("Not in a monorepo")
        raise SystemExit(1)

    # Run lint for all packages
    script = "lint:fix" if fix else "lint"
    cmd = ["pnpm", "-r", "run", script]

    # Dry run
    if dry_run:
        if output_json:
            console.print(json.dumps({
                "dry_run": True,
                "all": True,
                "cwd": str(monorepo.root),
                "command": cmd,
                "fix": fix,
            }, indent=2))
        else:
            console.print(f"[bold yellow]DRY RUN[/bold yellow] - Would execute:\n")
            console.print(f"  [cyan]Scope:[/cyan] All packages")
            console.print(f"  [cyan]Directory:[/cyan] {monorepo.root}")
            if fix:
                console.print(f"  [cyan]Mode:[/cyan] Auto-fix")
            console.print(f"  [cyan]Command:[/cyan] {' '.join(cmd)}")
        return

    if not output_json:
        action = "Fixing" if fix else "Linting"
        console.print(f"[bold]{action} all packages...[/bold]\n")

    result = subprocess.run(cmd, cwd=monorepo.root)

    if output_json:
        console.print(json.dumps({
            "all": True,
            "passed": result.returncode == 0,
            "fixed": fix,
        }))
    else:
        if result.returncode == 0:
            if fix:
                success("Fixed lint issues in all packages")
            else:
                success("All lint checks passed")
        else:
            error("Lint failed")

    raise SystemExit(result.returncode)


def _resolve_package(name: Optional[str]) -> Optional[Package]:
    """Resolve package by name or auto-detect."""
    if name:
        monorepo = load_monorepo()
        if monorepo:
            return monorepo.find_package(name)
        return None

    return detect_current_package()
