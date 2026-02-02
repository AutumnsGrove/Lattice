"""Build commands."""

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
@click.option("--all", "build_all", is_flag=True, help="Build all packages")
@click.option("--production", "--prod", is_flag=True, help="Production build")
@click.option("--clean", is_flag=True, help="Clean before building")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
@click.option("--dry-run", is_flag=True, help="Show what would be executed without running")
@click.argument("extra_args", nargs=-1, type=click.UNPROCESSED)
@click.pass_context
def build(
    ctx: click.Context,
    package: Optional[str],
    build_all: bool,
    production: bool,
    clean: bool,
    verbose: bool,
    dry_run: bool,
    extra_args: tuple,
) -> None:
    """Build packages.

    Auto-detects the current package or use --package to specify.
    Use --all to build all packages with proper dependency ordering.

    \b
    Examples:
        gw build                       # Build current package
        gw build --all                 # Build all packages
        gw build --prod                # Production build
        gw build --clean               # Clean then build
        gw build --package engine      # Build specific package
        gw build --dry-run             # Preview command
    """
    output_json = ctx.obj.get("output_json", False)

    if build_all:
        _build_all(output_json, production, clean, verbose, dry_run)
        return

    # Find the package
    pkg = _resolve_package(package)
    if not pkg:
        if output_json:
            console.print(json.dumps({"error": "No package found"}))
        else:
            error("No package found. Run from a package directory or use --package")
            info("Or use --all to build all packages")
        raise SystemExit(1)

    # Check if build script exists
    if not pkg.has_script.get("build"):
        if output_json:
            console.print(json.dumps({"error": f"Package '{pkg.name}' has no build script"}))
        else:
            error(f"Package '{pkg.name}' has no build script")
        raise SystemExit(1)

    # Build command based on package type
    if pkg.package_type == PackageType.PYTHON:
        cmd = _build_python_cmd(pkg, production, verbose, extra_args)
    elif pkg.package_type == PackageType.ZIG:
        cmd = _build_zig_cmd(pkg, production, verbose, extra_args)
    else:
        cmd = _build_node_cmd(pkg, production, verbose, extra_args)

    # Dry run - show what would be executed
    if dry_run:
        if output_json:
            console.print(json.dumps({
                "dry_run": True,
                "package": pkg.name,
                "cwd": str(pkg.path),
                "command": cmd,
                "clean": clean,
            }, indent=2))
        else:
            console.print(f"[bold yellow]DRY RUN[/bold yellow] - Would execute:\n")
            console.print(f"  [cyan]Package:[/cyan] {pkg.name}")
            console.print(f"  [cyan]Directory:[/cyan] {pkg.path}")
            if clean:
                console.print(f"  [cyan]Clean:[/cyan] Yes")
            console.print(f"  [cyan]Command:[/cyan] {' '.join(cmd)}")
        return

    # Clean first if requested
    if clean:
        _clean_package(pkg, output_json)

    if not output_json:
        console.print(f"[dim]Building {pkg.name}...[/dim]")
        console.print(f"[dim]Command: {' '.join(cmd)}[/dim]\n")

    result = subprocess.run(cmd, cwd=pkg.path)

    if output_json:
        console.print(json.dumps({
            "package": pkg.name,
            "success": result.returncode == 0,
        }))
    else:
        if result.returncode == 0:
            success(f"Built {pkg.name}")
        else:
            error(f"Build failed for {pkg.name}")

    raise SystemExit(result.returncode)


def _build_python_cmd(
    pkg: Package,
    production: bool,
    verbose: bool,
    extra_args: tuple,
) -> list[str]:
    """Build command for Python packages."""
    cmd = ["uv", "build"]
    cmd.extend(extra_args)
    return cmd


def _build_zig_cmd(
    pkg: Package,
    production: bool,
    verbose: bool,
    extra_args: tuple,
) -> list[str]:
    """Build command for Zig packages."""
    cmd = ["pnpm", "run", "build"]
    cmd.extend(extra_args)
    return cmd


def _build_node_cmd(
    pkg: Package,
    production: bool,
    verbose: bool,
    extra_args: tuple,
) -> list[str]:
    """Build command for Node packages."""
    cmd = ["pnpm", "run", "build"]
    cmd.extend(extra_args)
    return cmd


def _clean_package(pkg: Package, output_json: bool) -> None:
    """Clean build artifacts for a package."""
    if not output_json:
        console.print(f"[dim]Cleaning {pkg.name}...[/dim]")

    if "clean" in pkg.scripts:
        subprocess.run(["pnpm", "run", "clean"], cwd=pkg.path, capture_output=True)
    else:
        import shutil
        for dir_name in ["dist", ".svelte-kit", "build", "node_modules/.cache"]:
            dir_path = pkg.path / dir_name
            if dir_path.exists():
                shutil.rmtree(dir_path)


def _build_all(output_json: bool, production: bool, clean: bool, verbose: bool, dry_run: bool = False) -> None:
    """Build all packages in the monorepo."""
    monorepo = load_monorepo()
    if not monorepo:
        if output_json:
            console.print(json.dumps({"error": "Not in a monorepo"}))
        else:
            error("Not in a monorepo")
        raise SystemExit(1)

    cmd = ["pnpm", "-r", "run", "build"]

    # Dry run
    if dry_run:
        if output_json:
            console.print(json.dumps({
                "dry_run": True,
                "all": True,
                "cwd": str(monorepo.root),
                "command": cmd,
                "clean": clean,
            }, indent=2))
        else:
            console.print(f"[bold yellow]DRY RUN[/bold yellow] - Would execute:\n")
            console.print(f"  [cyan]Scope:[/cyan] All packages")
            console.print(f"  [cyan]Directory:[/cyan] {monorepo.root}")
            if clean:
                console.print(f"  [cyan]Clean:[/cyan] Yes (pnpm -r run clean)")
            console.print(f"  [cyan]Command:[/cyan] {' '.join(cmd)}")
        return

    if not output_json:
        console.print("[bold]Building all packages...[/bold]\n")

    # Clean all if requested
    if clean:
        if not output_json:
            console.print("[dim]Cleaning all packages...[/dim]")
        subprocess.run(["pnpm", "-r", "run", "clean"], cwd=monorepo.root, capture_output=True)

    result = subprocess.run(cmd, cwd=monorepo.root)

    if output_json:
        console.print(json.dumps({
            "all": True,
            "success": result.returncode == 0,
        }))
    else:
        if result.returncode == 0:
            success("All packages built successfully")
        else:
            error("Build failed")

    raise SystemExit(result.returncode)


def _resolve_package(name: Optional[str]) -> Optional[Package]:
    """Resolve package by name or auto-detect."""
    if name:
        monorepo = load_monorepo()
        if monorepo:
            return monorepo.find_package(name)
        return None

    return detect_current_package()
