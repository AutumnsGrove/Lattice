"""Bindings command - shows all Cloudflare bindings from wrangler.toml files."""

import json
from pathlib import Path
from typing import Any

import click

try:
    import tomllib
except ImportError:
    import tomli as tomllib

from ..ui import console, create_table, info, warning


def find_wrangler_configs(root: Path) -> list[Path]:
    """Find all wrangler.toml files, excluding deprecated directories."""
    configs = []
    for config_path in root.rglob("wrangler.toml"):
        # Skip deprecated and node_modules directories
        path_str = str(config_path)
        if "_deprecated" in path_str or "node_modules" in path_str:
            continue
        configs.append(config_path)
    return sorted(configs)


def parse_wrangler_config(config_path: Path) -> dict[str, Any]:
    """Parse a wrangler.toml file and extract bindings."""
    with open(config_path, "rb") as f:
        data = tomllib.load(f)

    # Extract package name from path
    parts = config_path.parts
    if "packages" in parts:
        idx = parts.index("packages")
        if idx + 1 < len(parts):
            package = parts[idx + 1]
        else:
            package = config_path.parent.name
    elif "workers" in parts:
        idx = parts.index("workers")
        if idx + 1 < len(parts):
            package = f"workers/{parts[idx + 1]}"
        else:
            package = config_path.parent.name
    else:
        package = config_path.parent.name

    result = {
        "name": data.get("name", "unknown"),
        "package": package,
        "path": str(config_path),
        "d1_databases": [],
        "kv_namespaces": [],
        "r2_buckets": [],
        "services": [],
        "durable_objects": [],
        "ai": None,
        "secrets_store": [],
    }

    # D1 Databases
    for db in data.get("d1_databases", []):
        result["d1_databases"].append(
            {
                "binding": db.get("binding"),
                "database_name": db.get("database_name"),
                "database_id": db.get("database_id"),
            }
        )

    # KV Namespaces
    for kv in data.get("kv_namespaces", []):
        result["kv_namespaces"].append(
            {
                "binding": kv.get("binding"),
                "id": kv.get("id"),
            }
        )

    # R2 Buckets
    for r2 in data.get("r2_buckets", []):
        result["r2_buckets"].append(
            {
                "binding": r2.get("binding"),
                "bucket_name": r2.get("bucket_name"),
            }
        )

    # Service Bindings
    for svc in data.get("services", []):
        result["services"].append(
            {
                "binding": svc.get("binding"),
                "service": svc.get("service"),
            }
        )

    # Durable Objects
    do_config = data.get("durable_objects", {})
    for do in do_config.get("bindings", []):
        result["durable_objects"].append(
            {
                "binding": do.get("name"),
                "class_name": do.get("class_name"),
                "script_name": do.get("script_name"),
            }
        )

    # AI Binding
    ai_config = data.get("ai")
    if ai_config:
        result["ai"] = ai_config.get("binding")

    # Secrets Store
    for store in data.get("secrets_store", []):
        result["secrets_store"].append(
            {
                "binding": store.get("binding"),
                "id": store.get("id"),
            }
        )

    return result


def find_project_root() -> Path:
    """Find the project root by looking for package.json or .git."""
    current = Path.cwd()
    while current != current.parent:
        if (current / "package.json").exists() or (current / ".git").exists():
            return current
        current = current.parent
    return Path.cwd()


@click.command()
@click.option(
    "--type",
    "-t",
    "binding_type",
    type=click.Choice(["d1", "kv", "r2", "do", "services", "ai", "all"]),
    default="all",
    help="Filter by binding type",
)
@click.option(
    "--package",
    "-p",
    "package_filter",
    help="Filter by package name",
)
@click.pass_context
def bindings(ctx: click.Context, binding_type: str, package_filter: str | None) -> None:
    """Show all Cloudflare bindings from wrangler.toml files.

    Scans the monorepo for wrangler.toml files and displays all configured
    bindings including D1 databases, KV namespaces, R2 buckets, Durable Objects,
    and service bindings.

    Examples:

        gw bindings              # Show all bindings

        gw bindings -t d1        # Show only D1 databases

        gw bindings -t kv        # Show only KV namespaces

        gw bindings -p engine    # Show bindings for engine package
    """
    output_json: bool = ctx.obj.get("output_json", False)

    # Find project root and all wrangler configs
    root = find_project_root()
    configs = find_wrangler_configs(root)

    if not configs:
        warning("No wrangler.toml files found")
        return

    # Parse all configs
    all_bindings = []
    for config_path in configs:
        try:
            parsed = parse_wrangler_config(config_path)
            if (
                package_filter
                and package_filter.lower() not in parsed["package"].lower()
            ):
                continue
            all_bindings.append(parsed)
        except Exception as e:
            if ctx.obj.get("verbose"):
                warning(f"Failed to parse {config_path}: {e}")

    if output_json:
        console.print(json.dumps(all_bindings, indent=2))
        return

    # Human-readable output
    console.print("\n[bold green]Cloudflare Bindings[/bold green]\n")
    info(f"Scanned {len(configs)} wrangler.toml files from {root}")
    console.print()

    # D1 Databases
    if binding_type in ("all", "d1"):
        d1_table = create_table(title="D1 Databases")
        d1_table.add_column("Package", style="cyan")
        d1_table.add_column("Binding", style="green")
        d1_table.add_column("Database", style="magenta")
        d1_table.add_column("ID", style="yellow")

        has_d1 = False
        for pkg in all_bindings:
            for db in pkg["d1_databases"]:
                has_d1 = True
                d1_table.add_row(
                    pkg["package"],
                    db["binding"],
                    db["database_name"],
                    (db["database_id"][:12] + "...") if db["database_id"] else "-",
                )

        if has_d1:
            console.print(d1_table)
            console.print()

    # KV Namespaces
    if binding_type in ("all", "kv"):
        kv_table = create_table(title="KV Namespaces")
        kv_table.add_column("Package", style="cyan")
        kv_table.add_column("Binding", style="green")
        kv_table.add_column("ID", style="yellow")

        has_kv = False
        for pkg in all_bindings:
            for kv in pkg["kv_namespaces"]:
                has_kv = True
                kv_table.add_row(
                    pkg["package"],
                    kv["binding"],
                    (kv["id"][:12] + "...") if kv["id"] else "-",
                )

        if has_kv:
            console.print(kv_table)
            console.print()

    # R2 Buckets
    if binding_type in ("all", "r2"):
        r2_table = create_table(title="R2 Buckets")
        r2_table.add_column("Package", style="cyan")
        r2_table.add_column("Binding", style="green")
        r2_table.add_column("Bucket", style="magenta")

        has_r2 = False
        for pkg in all_bindings:
            for r2 in pkg["r2_buckets"]:
                has_r2 = True
                r2_table.add_row(
                    pkg["package"],
                    r2["binding"],
                    r2["bucket_name"] or "-",
                )

        if has_r2:
            console.print(r2_table)
            console.print()

    # Durable Objects
    if binding_type in ("all", "do"):
        do_table = create_table(title="Durable Objects")
        do_table.add_column("Package", style="cyan")
        do_table.add_column("Binding", style="green")
        do_table.add_column("Class", style="magenta")
        do_table.add_column("Script", style="yellow")

        has_do = False
        for pkg in all_bindings:
            for do in pkg["durable_objects"]:
                has_do = True
                do_table.add_row(
                    pkg["package"],
                    do["binding"],
                    do["class_name"] or "-",
                    do["script_name"] or "(local)",
                )

        if has_do:
            console.print(do_table)
            console.print()

    # Service Bindings
    if binding_type in ("all", "services"):
        svc_table = create_table(title="Service Bindings")
        svc_table.add_column("Package", style="cyan")
        svc_table.add_column("Binding", style="green")
        svc_table.add_column("Service", style="magenta")

        has_svc = False
        for pkg in all_bindings:
            for svc in pkg["services"]:
                has_svc = True
                svc_table.add_row(
                    pkg["package"],
                    svc["binding"],
                    svc["service"] or "-",
                )

        if has_svc:
            console.print(svc_table)
            console.print()

    # AI Bindings
    if binding_type in ("all", "ai"):
        ai_table = create_table(title="Workers AI")
        ai_table.add_column("Package", style="cyan")
        ai_table.add_column("Binding", style="green")

        has_ai = False
        for pkg in all_bindings:
            if pkg["ai"]:
                has_ai = True
                ai_table.add_row(pkg["package"], pkg["ai"])

        if has_ai:
            console.print(ai_table)
            console.print()
