"""Impact analysis commands for grove-find.

Provides: gf impact, gf test-for, gf diff-summary

These commands answer the questions agents ask most often:
- "What breaks if I change this file?"
- "Which tests should I run for these changes?"
- "What's the structured summary of current changes?"
"""

import json
import re
import subprocess
from pathlib import Path
from typing import Optional

import typer

from grove_find.core.config import get_config
from grove_find.core.tools import discover_tools, run_tool
from grove_find.output import console, print_section, print_warning

app = typer.Typer(help="Impact analysis commands")

# Standard exclusions
EXCLUDE_GLOBS = [
    "--glob", "!node_modules",
    "--glob", "!.git",
    "--glob", "!dist",
    "--glob", "!build",
    "--glob", "!*.lock",
    "--glob", "!pnpm-lock.yaml",
]


def _run_rg(args: list[str], cwd: Path) -> str:
    """Run ripgrep with standard options."""
    tools = discover_tools()
    if not tools.rg:
        return ""

    config = get_config()
    base_args = [
        "--line-number",
        "--no-heading",
        "--smart-case",
        "--color=never",
    ]

    result = run_tool(tools.rg, base_args + EXCLUDE_GLOBS + args, cwd=cwd)
    return result.stdout


def _get_git_root() -> Optional[Path]:
    """Get the git repository root."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True,
        )
        if result.returncode == 0:
            return Path(result.stdout.strip())
    except (subprocess.SubprocessError, FileNotFoundError):
        pass
    return None


def impact_command(file_path: str) -> None:
    """Full impact analysis for a file or symbol.

    Shows:
    - Direct importers (who imports this file?)
    - Test coverage (which tests cover this?)
    - Route exposure (is this used in routes?)
    - Affected packages
    """
    config = get_config()
    root = config.grove_root
    target = Path(file_path)

    # Normalize to relative path
    try:
        target_rel = target.relative_to(root)
    except ValueError:
        target_rel = target

    target_str = str(target_rel)

    # Determine the module name (for import matching)
    # Strip extension for import resolution
    stem = target_rel.stem
    parent = str(target_rel.parent)

    output_json = config.json_mode

    # 1. Find direct importers
    # Search for imports of this file's path (with various import styles)
    import_patterns = []

    # TypeScript/JS imports: from '...path...' or import '...path...'
    # Strip the extension and packages prefix for import matching
    import_path = str(target_rel).replace(".ts", "").replace(".js", "").replace(".svelte", "")
    if import_path.startswith("packages/"):
        # Convert packages/engine/src/lib/thing -> $lib/thing style
        parts = import_path.split("/")
        if len(parts) > 3 and parts[2] == "src":
            lib_path = "/".join(parts[3:])
            import_patterns.append(lib_path)

    import_patterns.append(stem)
    import_patterns.append(target_str)

    importers = []
    for pattern in import_patterns:
        # Escape dots for regex
        escaped = re.escape(pattern)
        rg_output = _run_rg(
            [f"(from|import).*{escaped}", "--type", "ts", "--type", "svelte", "-l"],
            cwd=root,
        )
        for line in rg_output.strip().split("\n"):
            line = line.strip()
            if line and line != target_str and line not in importers:
                importers.append(line)

    # 2. Find test files
    tests = []
    # Look for test files that reference this module
    test_rg = _run_rg(
        [stem, "--glob", "*.test.*", "--glob", "*.spec.*", "-l"],
        cwd=root,
    )
    for line in test_rg.strip().split("\n"):
        line = line.strip()
        if line:
            tests.append(line)

    # Also find co-located test files
    test_siblings = [
        target_rel.with_suffix(".test.ts"),
        target_rel.with_suffix(".spec.ts"),
        target_rel.with_name(f"{stem}.test.ts"),
        target_rel.with_name(f"{stem}.spec.ts"),
    ]
    for sibling in test_siblings:
        sibling_path = root / sibling
        if sibling_path.exists() and str(sibling) not in tests:
            tests.append(str(sibling))

    # 3. Route exposure
    routes = []
    route_rg = _run_rg(
        [stem, "--glob", "**/routes/**", "-l"],
        cwd=root,
    )
    for line in route_rg.strip().split("\n"):
        line = line.strip()
        if line and line != target_str:
            routes.append(line)

    # 4. Affected packages
    affected = set()
    all_files = [target_str] + importers + tests + routes
    for f in all_files:
        parts = Path(f).parts
        if len(parts) >= 2 and parts[0] == "packages":
            affected.add(parts[1])
        elif len(parts) >= 2 and parts[0] == "tools":
            affected.add(f"tools/{parts[1]}")

    if output_json:
        data = {
            "target": target_str,
            "importers": importers,
            "importers_count": len(importers),
            "tests": tests,
            "tests_count": len(tests),
            "routes": routes,
            "routes_count": len(routes),
            "affected_packages": sorted(affected),
        }
        console.print(json.dumps(data, indent=2))
    else:
        print_section(f"Impact Analysis: {target_str}", "")

        if importers:
            console.print(f"\n[bold cyan]Direct Importers ({len(importers)}):[/bold cyan]")
            for f in importers[:20]:
                console.print(f"  {f}")
            if len(importers) > 20:
                console.print(f"  [dim]... +{len(importers) - 20} more[/dim]")
        else:
            console.print("\n[dim]No direct importers found[/dim]")

        if tests:
            console.print(f"\n[bold green]Test Coverage ({len(tests)}):[/bold green]")
            for f in tests:
                console.print(f"  {f}")
        else:
            console.print("\n[yellow]No test coverage found[/yellow]")

        if routes:
            console.print(f"\n[bold blue]Route Exposure ({len(routes)}):[/bold blue]")
            for f in routes:
                console.print(f"  {f}")

        if affected:
            console.print(f"\n[bold]Affected Packages:[/bold] {', '.join(sorted(affected))}")


def test_for_command(file_path: str) -> None:
    """Find tests that cover a specific file.

    Searches for:
    - Co-located test files (same directory, .test.ts/.spec.ts)
    - Test files that import the target
    - Integration tests that reference the module name
    """
    config = get_config()
    root = config.grove_root
    target = Path(file_path)
    output_json = config.json_mode

    try:
        target_rel = target.relative_to(root)
    except ValueError:
        target_rel = target

    stem = target_rel.stem
    target_str = str(target_rel)

    tests = []

    # 1. Co-located test files
    co_located_patterns = [
        target_rel.with_suffix(".test.ts"),
        target_rel.with_suffix(".spec.ts"),
        target_rel.with_suffix(".test.tsx"),
        target_rel.with_suffix(".spec.tsx"),
        target_rel.with_name(f"{stem}.test.ts"),
        target_rel.with_name(f"{stem}.spec.ts"),
    ]
    for pattern in co_located_patterns:
        full = root / pattern
        if full.exists():
            tests.append({"file": str(pattern), "type": "co-located"})

    # 2. Test files that reference this module
    rg_output = _run_rg(
        [stem, "--glob", "*.test.*", "--glob", "*.spec.*", "-l"],
        cwd=root,
    )
    for line in rg_output.strip().split("\n"):
        line = line.strip()
        if line and not any(t["file"] == line for t in tests):
            tests.append({"file": line, "type": "references"})

    # 3. Integration test directories
    rg_integration = _run_rg(
        [stem, "--glob", "**/tests/integration/**", "-l"],
        cwd=root,
    )
    for line in rg_integration.strip().split("\n"):
        line = line.strip()
        if line and not any(t["file"] == line for t in tests):
            tests.append({"file": line, "type": "integration"})

    if output_json:
        console.print(json.dumps({
            "target": target_str,
            "tests": tests,
            "total": len(tests),
        }, indent=2))
    else:
        if tests:
            print_section(f"Tests for: {target_str}", f"Found {len(tests)} test file(s)")
            for t in tests:
                type_badge = f"[dim]({t['type']})[/dim]"
                console.print(f"  {t['file']} {type_badge}")
        else:
            console.print(f"[yellow]No tests found for {target_str}[/yellow]")
            console.print("[dim]Consider adding a test file![/dim]")


def diff_summary_command(base: str = "HEAD") -> None:
    """Structured diff summary optimized for agents.

    Shows files changed with line counts, package breakdown,
    and change categories — all parseable as JSON.
    """
    config = get_config()
    output_json = config.json_mode

    try:
        # Get numstat for structured data
        result = subprocess.run(
            ["git", "diff", "--numstat", base],
            capture_output=True, text=True,
            cwd=config.grove_root,
        )
        if result.returncode != 0:
            console.print("[red]git diff failed[/red]")
            raise typer.Exit(1)

        files = []
        total_add = 0
        total_del = 0
        packages = set()

        for line in result.stdout.strip().split("\n"):
            if not line or "\t" not in line:
                continue
            parts = line.split("\t")
            if len(parts) >= 3:
                add = int(parts[0]) if parts[0] != "-" else 0
                delete = int(parts[1]) if parts[1] != "-" else 0
                path = parts[2]

                total_add += add
                total_del += delete

                # Determine package
                path_parts = Path(path).parts
                pkg = "root"
                if len(path_parts) >= 2 and path_parts[0] == "packages":
                    pkg = path_parts[1]
                elif len(path_parts) >= 2 and path_parts[0] == "tools":
                    pkg = f"tools/{path_parts[1]}"
                packages.add(pkg)

                # Categorize the change
                ext = Path(path).suffix.lower()
                category = "other"
                if ext in (".ts", ".tsx", ".js", ".jsx"):
                    category = "code"
                elif ext in (".svelte",):
                    category = "component"
                elif ext in (".css", ".scss", ".postcss"):
                    category = "style"
                elif ext in (".test.ts", ".spec.ts") or "test" in path.lower():
                    category = "test"
                elif ext in (".md", ".mdx"):
                    category = "docs"
                elif ext in (".json", ".toml", ".yaml", ".yml"):
                    category = "config"

                files.append({
                    "path": path,
                    "additions": add,
                    "deletions": delete,
                    "package": pkg,
                    "category": category,
                })

        if output_json:
            console.print(json.dumps({
                "base": base,
                "files": files,
                "total_files": len(files),
                "total_additions": total_add,
                "total_deletions": total_del,
                "packages": sorted(packages),
            }, indent=2))
        else:
            print_section("Diff Summary", f"vs {base}")

            console.print(
                f"[bold]{len(files)}[/bold] files  |  "
                f"[green]+{total_add}[/green] [red]-{total_del}[/red]  |  "
                f"Packages: {', '.join(sorted(packages))}"
            )

            if files:
                console.print()
                for f in files[:30]:
                    add_str = f"[green]+{f['additions']}[/green]" if f["additions"] else ""
                    del_str = f"[red]-{f['deletions']}[/red]" if f["deletions"] else ""
                    console.print(f"  {add_str} {del_str} {f['path']}")
                if len(files) > 30:
                    console.print(f"  [dim]... +{len(files) - 30} more files[/dim]")

    except subprocess.SubprocessError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1)
