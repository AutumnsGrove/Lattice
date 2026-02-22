"""Monorepo size command - disk usage and LOC by package."""

import json
import subprocess
from pathlib import Path
from typing import Optional

import click

from ..packages import load_monorepo
from ..ui import console, create_table, error, info, success, warning


@click.command("monorepo-size")
@click.option("--sort", "-s", "sort_by", type=click.Choice(["name", "loc", "disk"]),
              default="loc", help="Sort packages by field")
@click.pass_context
def monorepo_size(ctx: click.Context, sort_by: str) -> None:
    """Show disk usage and lines of code by package.

    Provides a quick overview of monorepo size distribution, including
    source LOC (excluding node_modules/dist) and disk usage.

    \b
    Examples:
        gw monorepo-size              # Show all packages sorted by LOC
        gw monorepo-size --sort disk  # Sort by disk usage
        gw monorepo-size --sort name  # Sort alphabetically
    """
    output_json = ctx.obj.get("output_json", False)

    monorepo = load_monorepo()
    if not monorepo:
        error("Not in a monorepo")
        raise SystemExit(1)

    results = []
    total_loc = 0
    total_disk = 0

    for pkg in monorepo.packages:
        loc = _count_source_loc(pkg.path)
        disk = _get_disk_usage(pkg.path)
        total_loc += loc
        total_disk += disk

        results.append({
            "name": pkg.name,
            "type": pkg.package_type.value,
            "path": str(pkg.path.relative_to(monorepo.root)),
            "loc": loc,
            "disk_bytes": disk,
            "disk_human": _human_size(disk),
        })

    # Sort
    if sort_by == "loc":
        results.sort(key=lambda x: -x["loc"])
    elif sort_by == "disk":
        results.sort(key=lambda x: -x["disk_bytes"])
    else:
        results.sort(key=lambda x: x["name"])

    if output_json:
        console.print(json.dumps({
            "packages": results,
            "total_loc": total_loc,
            "total_disk_bytes": total_disk,
            "total_disk_human": _human_size(total_disk),
        }, indent=2))
        return

    console.print("\n[bold green]Monorepo Size Report[/bold green]\n")

    table = create_table(title=f"Packages ({len(results)})")
    table.add_column("Package", style="cyan")
    table.add_column("Type", style="dim")
    table.add_column("Source LOC", justify="right", style="green")
    table.add_column("Disk", justify="right", style="yellow")

    for r in results:
        loc_str = f"{r['loc']:,}" if r["loc"] > 0 else "-"
        table.add_row(r["name"], r["type"], loc_str, r["disk_human"])

    console.print(table)
    console.print()
    console.print(f"[bold]Total source LOC:[/bold] {total_loc:,}")
    console.print(f"[bold]Total disk usage:[/bold] {_human_size(total_disk)}")
    console.print(f"[dim](LOC counts .ts/.js/.svelte files, excludes node_modules/dist)[/dim]")


def _count_source_loc(package_path: Path) -> int:
    """Count lines of source code in a package (excluding node_modules, dist)."""
    total = 0
    extensions = {".ts", ".js", ".svelte", ".css"}

    for ext in extensions:
        for filepath in package_path.rglob(f"*{ext}"):
            path_str = str(filepath)
            if any(skip in path_str for skip in ["node_modules", "/dist/", "/.git/", "_deprecated"]):
                continue
            try:
                with open(filepath, "rb") as f:
                    total += sum(1 for _ in f)
            except (OSError, PermissionError):
                continue

    return total


def _get_disk_usage(package_path: Path) -> int:
    """Get disk usage of a package directory (excluding node_modules)."""
    total = 0
    try:
        for filepath in package_path.rglob("*"):
            if filepath.is_file():
                path_str = str(filepath)
                if "node_modules" in path_str:
                    continue
                try:
                    total += filepath.stat().st_size
                except OSError:
                    continue
    except OSError:
        pass
    return total


def _human_size(size_bytes: int) -> str:
    """Convert bytes to human-readable size."""
    if size_bytes == 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB"]
    for unit in units:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}" if unit != "B" else f"{size_bytes} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"
