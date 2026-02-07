"""Config validation command - scan wrangler.toml files for mismatches."""

import json
from collections import defaultdict
from pathlib import Path

import click

try:
    import tomllib
except ImportError:
    import tomli as tomllib

from ..ui import console, create_table, error, info, success, warning


@click.command("config-validate")
@click.option("--fix-report", is_flag=True, help="Generate a fix report with expected values")
@click.pass_context
def config_validate(ctx: click.Context, fix_report: bool) -> None:
    """Validate wrangler.toml configs across the monorepo.

    Checks for mismatched binding IDs, inconsistent names, and missing bindings
    across all wrangler.toml files.

    \b
    Examples:
        gw config-validate              # Run validation
        gw config-validate --fix-report # Show what should be fixed
    """
    output_json = ctx.obj.get("output_json", False)

    # Find project root
    root = _find_root()
    if not root:
        error("Not in a project directory")
        raise SystemExit(1)

    # Find all wrangler.toml files
    wrangler_files = sorted(root.rglob("wrangler.toml"))
    wrangler_files = [f for f in wrangler_files if "node_modules" not in str(f) and "_deprecated" not in str(f)]

    if not wrangler_files:
        info("No wrangler.toml files found")
        return

    issues = []
    binding_registry: dict[str, dict[str, list[str]]] = {
        "d1": defaultdict(list),
        "kv": defaultdict(list),
        "r2": defaultdict(list),
    }
    id_registry: dict[str, dict[str, set]] = {
        "d1": defaultdict(set),
        "kv": defaultdict(set),
    }

    for wrangler_path in wrangler_files:
        try:
            with open(wrangler_path, "rb") as f:
                data = tomllib.load(f)
        except Exception as e:
            issues.append({
                "file": str(wrangler_path),
                "type": "parse_error",
                "message": f"Failed to parse: {e}",
            })
            continue

        try:
            rel = str(wrangler_path.relative_to(root))
        except ValueError:
            rel = str(wrangler_path)

        # Check D1 databases
        for db in data.get("d1_databases", []):
            binding = db.get("binding", "?")
            db_name = db.get("database_name", "?")
            db_id = db.get("database_id", "")
            binding_registry["d1"][binding].append(rel)
            if db_id:
                id_registry["d1"][binding].add(db_id)

        # Check KV namespaces
        for kv in data.get("kv_namespaces", []):
            binding = kv.get("binding", "?")
            kv_id = kv.get("id", "")
            binding_registry["kv"][binding].append(rel)
            if kv_id:
                id_registry["kv"][binding].add(kv_id)

        # Check R2 buckets
        for r2 in data.get("r2_buckets", []):
            binding = r2.get("binding", "?")
            binding_registry["r2"][binding].append(rel)

        # Check for missing name
        if "name" not in data:
            issues.append({
                "file": rel,
                "type": "missing_name",
                "message": "No 'name' field in wrangler.toml",
            })

        # Check for compatibility_date
        if "compatibility_date" not in data:
            issues.append({
                "file": rel,
                "type": "missing_compat_date",
                "message": "No 'compatibility_date' — may use outdated behavior",
            })

    # Check for ID mismatches (same binding name, different IDs)
    for binding_type in ["d1", "kv"]:
        for binding_name, ids in id_registry[binding_type].items():
            if len(ids) > 1:
                files = binding_registry[binding_type][binding_name]
                issues.append({
                    "type": "id_mismatch",
                    "binding_type": binding_type.upper(),
                    "binding": binding_name,
                    "ids": list(ids),
                    "files": files,
                    "message": f"{binding_type.upper()} binding '{binding_name}' has {len(ids)} different IDs across {len(files)} files",
                })

    if output_json:
        console.print(json.dumps({
            "files_scanned": len(wrangler_files),
            "issues": issues,
            "bindings": {
                k: {name: files for name, files in v.items()}
                for k, v in binding_registry.items()
            },
        }, indent=2))
        return

    console.print("\n[bold green]Config Validation[/bold green]\n")
    info(f"Scanned {len(wrangler_files)} wrangler.toml files")
    console.print()

    if not issues:
        success("All configs are consistent!")
        return

    # Display issues
    table = create_table(title=f"Issues ({len(issues)})")
    table.add_column("Type", style="yellow")
    table.add_column("Details", style="cyan")
    table.add_column("File(s)", style="dim")

    for issue in issues:
        if issue["type"] == "id_mismatch":
            files_str = "\n".join(issue.get("files", [])[:3])
            if len(issue.get("files", [])) > 3:
                files_str += f"\n... +{len(issue['files']) - 3} more"
            table.add_row(
                f"[red]ID Mismatch[/red]",
                issue["message"],
                files_str,
            )
        else:
            table.add_row(
                issue["type"].replace("_", " ").title(),
                issue["message"],
                issue.get("file", ""),
            )

    console.print(table)
    console.print()

    if fix_report:
        console.print("[bold]Fix Report:[/bold]\n")
        for binding_type in ["d1", "kv"]:
            for binding_name, ids in id_registry[binding_type].items():
                if len(ids) > 1:
                    console.print(f"  {binding_type.upper()} '{binding_name}':")
                    for bid in sorted(ids):
                        console.print(f"    ID: {bid}")
                    console.print(f"    [yellow]Pick ONE ID and update all files[/yellow]")
                    console.print()

    warning(f"{len(issues)} issue(s) found")


def _find_root() -> Path | None:
    """Find project root."""
    current = Path.cwd()
    while current != current.parent:
        if (current / "pnpm-workspace.yaml").exists() or (current / ".git").exists():
            return current
        current = current.parent
    return None
