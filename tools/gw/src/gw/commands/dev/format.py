"""Formatting commands - prettier, black, and friends."""

import json
import subprocess
from pathlib import Path
from typing import Optional

import click

from ...packages import (
    Package,
    PackageType,
    detect_current_package,
    load_monorepo,
)
from ...ui import console, error, info, success, warning


@click.command("fmt")
@click.option("--package", "-p", help="Package name (default: auto-detect)")
@click.option("--all", "fmt_all", is_flag=True, help="Format all packages")
@click.option("--check", "check_only", is_flag=True, help="Check only, don't write changes")
@click.option("--write", "write_flag", is_flag=True, help="Write changes (default behavior)")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
@click.option("--dry-run", is_flag=True, help="Show what would be executed without running")
@click.argument("files", nargs=-1, type=click.Path())
@click.pass_context
def fmt(
    ctx: click.Context,
    package: Optional[str],
    fmt_all: bool,
    check_only: bool,
    write_flag: bool,
    verbose: bool,
    dry_run: bool,
    files: tuple,
) -> None:
    """Format code with prettier (JS/TS/Svelte) and black (Python).

    By default, formats files in place. Use --check to only verify formatting.

    \b
    Examples:
        gw fmt                         # Format current package
        gw fmt --all                   # Format all packages
        gw fmt --check                 # Check without writing
        gw fmt src/lib/utils.ts        # Format specific file(s)
        gw fmt --package engine        # Format specific package
        gw fmt --dry-run               # Preview command
    """
    output_json = ctx.obj.get("output_json", False)

    if fmt_all:
        _fmt_all(output_json, check_only, verbose, dry_run)
        return

    # Find the package
    pkg = _resolve_package(package)
    if not pkg:
        if output_json:
            console.print(json.dumps({"error": "No package found"}))
        else:
            error("No package found. Run from a package directory or use --package")
            info("Or use --all to format all packages")
        raise SystemExit(1)

    # Build command based on package type
    if pkg.package_type == PackageType.PYTHON:
        cmd = _build_python_fmt_cmd(pkg, check_only, verbose, files)
        formatter = "black + ruff"
    else:
        cmd = _build_node_fmt_cmd(pkg, check_only, verbose, files)
        formatter = "prettier"

    # Dry run - show what would be executed
    if dry_run:
        if output_json:
            console.print(json.dumps({
                "dry_run": True,
                "package": pkg.name,
                "cwd": str(pkg.path),
                "command": cmd,
                "check_only": check_only,
                "formatter": formatter,
            }, indent=2))
        else:
            console.print(f"[bold yellow]DRY RUN[/bold yellow] - Would execute:\n")
            console.print(f"  [cyan]Package:[/cyan] {pkg.name}")
            console.print(f"  [cyan]Directory:[/cyan] {pkg.path}")
            console.print(f"  [cyan]Formatter:[/cyan] {formatter}")
            console.print(f"  [cyan]Mode:[/cyan] {'Check only' if check_only else 'Format in place'}")
            console.print(f"  [cyan]Command:[/cyan] {' '.join(cmd)}")
        return

    if not output_json:
        action = "Checking format of" if check_only else "Formatting"
        console.print(f"[dim]{action} {pkg.name} with {formatter}...[/dim]")
        console.print(f"[dim]Command: {' '.join(cmd)}[/dim]\n")

    result = subprocess.run(cmd, cwd=pkg.path)

    if output_json:
        console.print(json.dumps({
            "package": pkg.name,
            "passed": result.returncode == 0,
            "check_only": check_only,
            "formatter": formatter,
        }))
    else:
        if result.returncode == 0:
            if check_only:
                success(f"Format check passed for {pkg.name}")
            else:
                success(f"Formatted {pkg.name}")
        else:
            if check_only:
                error(f"Format check failed for {pkg.name}")
                info("Run without --check to auto-format")
            else:
                error(f"Formatting failed for {pkg.name}")

    raise SystemExit(result.returncode)


def _build_python_fmt_cmd(
    pkg: Package,
    check_only: bool,
    verbose: bool,
    files: tuple,
) -> list[str]:
    """Build black + ruff format command for Python packages."""
    # Use ruff format (it's faster and includes black-style formatting)
    cmd = ["uv", "run", "ruff", "format"]

    if check_only:
        cmd.append("--check")

    if verbose:
        cmd.append("--verbose")

    if files:
        cmd.extend(files)
    else:
        cmd.append(".")

    return cmd


def _build_node_fmt_cmd(
    pkg: Package,
    check_only: bool,
    verbose: bool,
    files: tuple,
) -> list[str]:
    """Build prettier command for Node packages."""
    # Check if package has format script
    if "format" in pkg.scripts:
        if check_only and "format:check" in pkg.scripts:
            return ["pnpm", "run", "format:check"]
        elif not check_only:
            return ["pnpm", "run", "format"]

    # Fall back to prettier directly
    cmd = ["pnpm", "exec", "prettier"]

    if check_only:
        cmd.append("--check")
    else:
        cmd.append("--write")

    # Add common patterns if no files specified
    if files:
        cmd.extend(files)
    else:
        cmd.extend([
            "src/**/*.{ts,js,svelte,css,json}",
            "*.{ts,js,json}",
        ])

    return cmd


def _fmt_all(output_json: bool, check_only: bool, verbose: bool, dry_run: bool = False) -> None:
    """Run formatting for all packages."""
    monorepo = load_monorepo()
    if not monorepo:
        if output_json:
            console.print(json.dumps({"error": "Not in a monorepo"}))
        else:
            error("Not in a monorepo")
        raise SystemExit(1)

    # Run format for all packages - check if there's a root format script
    root_pkg_json = monorepo.root / "package.json"
    has_root_format = False

    if root_pkg_json.exists():
        import json as json_mod
        pkg_data = json_mod.loads(root_pkg_json.read_text())
        scripts = pkg_data.get("scripts", {})
        if check_only:
            has_root_format = "format:check" in scripts
        else:
            has_root_format = "format" in scripts

    if has_root_format:
        script = "format:check" if check_only else "format"
        cmd = ["pnpm", "run", script]
    else:
        # Run prettier from root with common patterns
        cmd = ["pnpm", "exec", "prettier"]
        if check_only:
            cmd.append("--check")
        else:
            cmd.append("--write")
        cmd.extend([
            # Old layout
            "packages/*/src/**/*.{ts,js,svelte,css}",
            # New categorized layout
            "apps/*/src/**/*.{ts,js,svelte,css}",
            "services/*/src/**/*.{ts,js,svelte,css}",
            "workers/*/src/**/*.{ts,js,svelte,css}",
            "libs/*/src/**/*.{ts,js,svelte,css}",
            "**/*.json",
            "--ignore-path", ".gitignore",
        ])

    # Dry run
    if dry_run:
        if output_json:
            console.print(json.dumps({
                "dry_run": True,
                "all": True,
                "cwd": str(monorepo.root),
                "command": cmd,
                "check_only": check_only,
            }, indent=2))
        else:
            console.print(f"[bold yellow]DRY RUN[/bold yellow] - Would execute:\n")
            console.print(f"  [cyan]Scope:[/cyan] All packages")
            console.print(f"  [cyan]Directory:[/cyan] {monorepo.root}")
            console.print(f"  [cyan]Mode:[/cyan] {'Check only' if check_only else 'Format in place'}")
            console.print(f"  [cyan]Command:[/cyan] {' '.join(cmd)}")
        return

    if not output_json:
        action = "Checking format of" if check_only else "Formatting"
        console.print(f"[bold]{action} all packages...[/bold]\n")

    result = subprocess.run(cmd, cwd=monorepo.root)

    if output_json:
        console.print(json.dumps({
            "all": True,
            "passed": result.returncode == 0,
            "check_only": check_only,
        }))
    else:
        if result.returncode == 0:
            if check_only:
                success("Format check passed for all packages")
            else:
                success("Formatted all packages")
        else:
            if check_only:
                error("Format check failed")
                info("Run without --check to auto-format")
            else:
                error("Formatting failed")

    raise SystemExit(result.returncode)


def _resolve_package(name: Optional[str]) -> Optional[Package]:
    """Resolve package by name or auto-detect."""
    if name:
        monorepo = load_monorepo()
        if monorepo:
            return monorepo.find_package(name)
        return None

    return detect_current_package()
