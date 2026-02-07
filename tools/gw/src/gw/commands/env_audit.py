"""Environment audit command - cross-reference env vars across configs and code."""

import json
import re
import subprocess
from collections import defaultdict
from pathlib import Path
from typing import Optional

import click

try:
    import tomllib
except ImportError:
    import tomli as tomllib

from ..ui import console, create_table, error, info, success, warning


@click.command("env-audit")
@click.option("--package", "-p", "package_filter", help="Filter by package name")
@click.pass_context
def env_audit(ctx: click.Context, package_filter: Optional[str]) -> None:
    """Audit environment variables across code and config.

    Cross-references env vars used in code (platform.env, import.meta.env)
    with those declared in wrangler.toml [vars] sections and .dev.vars files.

    \b
    Examples:
        gw env-audit                # Full audit
        gw env-audit -p engine      # Audit engine package only
    """
    output_json = ctx.obj.get("output_json", False)

    root = _find_root()
    if not root:
        error("Not in a project directory")
        raise SystemExit(1)

    # 1. Collect env vars declared in wrangler.toml [vars]
    declared_vars: dict[str, dict[str, str]] = {}  # {package: {VAR_NAME: value}}
    wrangler_files = sorted(root.rglob("wrangler.toml"))
    wrangler_files = [f for f in wrangler_files if "node_modules" not in str(f) and "_deprecated" not in str(f)]

    for wrangler_path in wrangler_files:
        try:
            with open(wrangler_path, "rb") as f:
                data = tomllib.load(f)
        except Exception:
            continue

        pkg_name = _get_package_name(wrangler_path, root)
        if package_filter and package_filter.lower() not in pkg_name.lower():
            continue

        vars_section = data.get("vars", {})
        if vars_section:
            declared_vars[pkg_name] = {str(k): str(v) for k, v in vars_section.items()}

    # 2. Collect env vars from .dev.vars files
    dev_vars: dict[str, set[str]] = {}
    for dev_file in root.rglob(".dev.vars"):
        if "node_modules" in str(dev_file):
            continue
        pkg_name = _get_package_name(dev_file, root)
        if package_filter and package_filter.lower() not in pkg_name.lower():
            continue
        try:
            content = dev_file.read_text()
            vars_found = set()
            for line in content.split("\n"):
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    var_name = line.split("=", 1)[0].strip()
                    vars_found.add(var_name)
            if vars_found:
                dev_vars[pkg_name] = vars_found
        except OSError:
            continue

    # 3. Find env vars used in code via ripgrep
    used_vars: dict[str, set[str]] = defaultdict(set)

    # platform.env.* (Cloudflare Workers)
    try:
        result = subprocess.run(
            ["rg", "--no-heading", "-o", r"platform\.env\.(\w+)", "--color=never",
             "--glob", "!node_modules", "--glob", "!dist", str(root)],
            capture_output=True, text=True, timeout=30,
        )
        for line in result.stdout.strip().split("\n"):
            if not line:
                continue
            parts = line.split(":", 1)
            if len(parts) == 2:
                filepath = parts[0]
                pkg_name = _get_package_name(Path(filepath), root)
                if package_filter and package_filter.lower() not in pkg_name.lower():
                    continue
                match = re.search(r"platform\.env\.(\w+)", parts[1])
                if match:
                    used_vars[pkg_name].add(match.group(1))
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    # import.meta.env.* (Vite/SvelteKit)
    try:
        result = subprocess.run(
            ["rg", "--no-heading", "-o", r"import\.meta\.env\.(\w+)", "--color=never",
             "--glob", "!node_modules", "--glob", "!dist", str(root)],
            capture_output=True, text=True, timeout=30,
        )
        for line in result.stdout.strip().split("\n"):
            if not line:
                continue
            parts = line.split(":", 1)
            if len(parts) == 2:
                filepath = parts[0]
                pkg_name = _get_package_name(Path(filepath), root)
                if package_filter and package_filter.lower() not in pkg_name.lower():
                    continue
                match = re.search(r"import\.meta\.env\.(\w+)", parts[1])
                if match:
                    used_vars[pkg_name].add(match.group(1))
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    # 4. Cross-reference
    all_packages = set(list(declared_vars.keys()) + list(dev_vars.keys()) + list(used_vars.keys()))

    audit_results = []
    for pkg in sorted(all_packages):
        declared = set(declared_vars.get(pkg, {}).keys())
        dev = dev_vars.get(pkg, set())
        used = used_vars.get(pkg, set())

        # Skip Vite builtins
        used_filtered = {v for v in used if not v.startswith("VITE_") or v in declared or v in dev}

        used_but_undeclared = used_filtered - declared - dev - {"MODE", "DEV", "PROD", "SSR", "BASE_URL"}
        declared_but_unused = declared - used

        audit_results.append({
            "package": pkg,
            "declared": sorted(declared),
            "dev_vars": sorted(dev),
            "used": sorted(used),
            "used_but_undeclared": sorted(used_but_undeclared),
            "declared_but_unused": sorted(declared_but_unused),
        })

    if output_json:
        console.print(json.dumps({"audit": audit_results}, indent=2))
        return

    console.print("\n[bold green]Environment Variable Audit[/bold green]\n")
    info(f"Scanned {len(wrangler_files)} wrangler.toml files, {len(all_packages)} packages")
    console.print()

    has_issues = False
    for result in audit_results:
        if not result["used_but_undeclared"] and not result["declared_but_unused"]:
            continue

        has_issues = True
        console.print(f"[bold cyan]{result['package']}[/bold cyan]")

        if result["used_but_undeclared"]:
            for var in result["used_but_undeclared"]:
                console.print(f"  [red]MISSING[/red] {var} — used in code but not in wrangler.toml or .dev.vars")

        if result["declared_but_unused"]:
            for var in result["declared_but_unused"]:
                console.print(f"  [yellow]UNUSED[/yellow] {var} — declared but not referenced in code")

        console.print()

    if not has_issues:
        success("All env vars are consistent!")
    else:
        # Summary
        total_missing = sum(len(r["used_but_undeclared"]) for r in audit_results)
        total_unused = sum(len(r["declared_but_unused"]) for r in audit_results)
        if total_missing:
            warning(f"{total_missing} env var(s) used in code but not declared")
        if total_unused:
            info(f"{total_unused} env var(s) declared but not used in code")


def _find_root() -> Path | None:
    """Find project root."""
    current = Path.cwd()
    while current != current.parent:
        if (current / "pnpm-workspace.yaml").exists() or (current / ".git").exists():
            return current
        current = current.parent
    return None


def _get_package_name(filepath: Path, root: Path) -> str:
    """Extract package name from file path."""
    try:
        rel = str(filepath.relative_to(root))
    except ValueError:
        return str(filepath.parent.name)

    parts = rel.split("/")
    if "packages" in parts:
        idx = parts.index("packages")
        if idx + 1 < len(parts):
            return parts[idx + 1]
    elif "workers" in parts:
        idx = parts.index("workers")
        if idx + 1 < len(parts):
            return f"workers/{parts[idx + 1]}"
    elif "tools" in parts:
        idx = parts.index("tools")
        if idx + 1 < len(parts):
            return f"tools/{parts[idx + 1]}"

    return parts[0] if parts else "root"
