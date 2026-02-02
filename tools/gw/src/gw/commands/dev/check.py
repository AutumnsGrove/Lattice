"""Type checking commands."""

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
@click.option("--all", "check_all", is_flag=True, help="Check all packages")
@click.option("--watch", "-w", is_flag=True, help="Watch mode")
@click.option("--strict", is_flag=True, help="Strict mode (fail on warnings)")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
@click.option("--dry-run", is_flag=True, help="Show what would be executed without running")
@click.argument("extra_args", nargs=-1, type=click.UNPROCESSED)
@click.pass_context
def check(
    ctx: click.Context,
    package: Optional[str],
    check_all: bool,
    watch: bool,
    strict: bool,
    verbose: bool,
    dry_run: bool,
    extra_args: tuple,
) -> None:
    """Run type checking.

    For TypeScript/Svelte: runs svelte-check
    For Python: runs mypy

    \b
    Examples:
        gw check                       # Check current package
        gw check --all                 # Check all packages
        gw check -w                    # Watch mode
        gw check --strict              # Fail on warnings
        gw check --package engine      # Check specific package
        gw check --dry-run             # Preview command
    """
    output_json = ctx.obj.get("output_json", False)

    if check_all:
        _check_all(output_json, strict, verbose, dry_run)
        return

    # Find the package
    pkg = _resolve_package(package)
    if not pkg:
        if output_json:
            console.print(json.dumps({"error": "No package found"}))
        else:
            error("No package found. Run from a package directory or use --package")
            info("Or use --all to check all packages")
        raise SystemExit(1)

    # Build command based on package type
    if pkg.package_type == PackageType.PYTHON:
        cmd = _build_python_check_cmd(pkg, watch, strict, verbose, extra_args)
    else:
        cmd = _build_node_check_cmd(pkg, watch, strict, verbose, extra_args)

    # Dry run - show what would be executed
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
        console.print(f"[dim]Type checking {pkg.name}...[/dim]")
        console.print(f"[dim]Command: {' '.join(cmd)}[/dim]\n")

    result = subprocess.run(cmd, cwd=pkg.path)

    if output_json:
        console.print(json.dumps({
            "package": pkg.name,
            "passed": result.returncode == 0,
        }))
    else:
        if result.returncode == 0:
            success(f"Type check passed for {pkg.name}")
        else:
            error(f"Type check failed for {pkg.name}")

    raise SystemExit(result.returncode)


def _build_python_check_cmd(
    pkg: Package,
    watch: bool,
    strict: bool,
    verbose: bool,
    extra_args: tuple,
) -> list[str]:
    """Build mypy command for Python packages."""
    cmd = ["uv", "run", "mypy", "."]

    if strict:
        cmd.append("--strict")

    if verbose:
        cmd.append("--verbose")

    # mypy doesn't have native watch mode, but dmypy can be used
    # For simplicity, we just run once

    cmd.extend(extra_args)
    return cmd


def _build_node_check_cmd(
    pkg: Package,
    watch: bool,
    strict: bool,
    verbose: bool,
    extra_args: tuple,
) -> list[str]:
    """Build svelte-check/tsc command for Node packages."""
    # Most packages have a check script
    if "check" in pkg.scripts:
        cmd = ["pnpm", "run", "check"]
    else:
        # Fall back to svelte-check directly
        cmd = ["pnpm", "exec", "svelte-check", "--tsconfig", "./tsconfig.json"]

    # Add flags
    extra = []

    if watch:
        extra.append("--watch")

    if strict:
        extra.append("--fail-on-warnings")

    if extra:
        cmd.append("--")
        cmd.extend(extra)

    cmd.extend(extra_args)
    return cmd


def _check_all(output_json: bool, strict: bool, verbose: bool, dry_run: bool = False) -> None:
    """Run type checking for all packages."""
    monorepo = load_monorepo()
    if not monorepo:
        if output_json:
            console.print(json.dumps({"error": "Not in a monorepo"}))
        else:
            error("Not in a monorepo")
        raise SystemExit(1)

    # Run check for all packages
    cmd = ["pnpm", "-r", "run", "check"]

    # Dry run
    if dry_run:
        if output_json:
            console.print(json.dumps({
                "dry_run": True,
                "all": True,
                "cwd": str(monorepo.root),
                "command": cmd,
            }, indent=2))
        else:
            console.print(f"[bold yellow]DRY RUN[/bold yellow] - Would execute:\n")
            console.print(f"  [cyan]Scope:[/cyan] All packages")
            console.print(f"  [cyan]Directory:[/cyan] {monorepo.root}")
            console.print(f"  [cyan]Command:[/cyan] {' '.join(cmd)}")
        return

    if not output_json:
        console.print("[bold]Type checking all packages...[/bold]\n")

    result = subprocess.run(cmd, cwd=monorepo.root)

    if output_json:
        console.print(json.dumps({
            "all": True,
            "passed": result.returncode == 0,
        }))
    else:
        if result.returncode == 0:
            success("All type checks passed")
        else:
            error("Type check failed")

    raise SystemExit(result.returncode)


def _resolve_package(name: Optional[str]) -> Optional[Package]:
    """Resolve package by name or auto-detect."""
    if name:
        monorepo = load_monorepo()
        if monorepo:
            return monorepo.find_package(name)
        return None

    return detect_current_package()
