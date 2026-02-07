"""Package discovery commands - inspect the monorepo structure."""

import json
import tomllib
from typing import Optional

import click

from ..packages import (
    Package,
    PackageType,
    detect_current_package,
    load_monorepo,
)
from ..ui import console, create_table, error, info, success


@click.group()
@click.pass_context
def packages(ctx: click.Context) -> None:
    """Monorepo package discovery.

    Inspect packages in the GroveEngine monorepo.

    \b
    Examples:
        gw packages list               # List all packages
        gw packages info               # Info about current package
        gw packages info engine        # Info about specific package
    """
    pass


@packages.command("list")
@click.option("--type", "-t", "pkg_type", help="Filter by package type")
@click.option("--scripts", "-s", "script_filter", help="Filter by available script (e.g., test, build, dev)")
@click.pass_context
def packages_list(ctx: click.Context, pkg_type: Optional[str], script_filter: Optional[str]) -> None:
    """List all packages in the monorepo.

    \b
    Examples:
        gw packages list
        gw packages list --type sveltekit
        gw packages list --type python
        gw packages list --scripts test
        gw packages list --scripts build
    """
    output_json = ctx.obj.get("output_json", False)

    monorepo = load_monorepo()
    if not monorepo:
        if output_json:
            console.print(json.dumps({"error": "Not in a monorepo"}))
        else:
            error("Not in a monorepo")
        raise SystemExit(1)

    packages_to_show = monorepo.packages

    # Filter by type if specified
    if pkg_type:
        try:
            filter_type = PackageType(pkg_type.lower())
            packages_to_show = [
                p for p in packages_to_show if p.package_type == filter_type
            ]
        except ValueError:
            valid_types = ", ".join(
                t.value for t in PackageType if t != PackageType.UNKNOWN
            )
            if output_json:
                console.print(
                    json.dumps({"error": f"Invalid type. Valid: {valid_types}"})
                )
            else:
                error(f"Invalid package type. Valid types: {valid_types}")
            raise SystemExit(1)

    # Filter by script availability
    if script_filter:
        packages_to_show = [
            p for p in packages_to_show if p.has_script.get(script_filter, False)
        ]

    if output_json:
        console.print(
            json.dumps(
                {
                    "root": str(monorepo.root),
                    "package_manager": monorepo.package_manager,
                    "packages": [p.to_dict() for p in packages_to_show],
                },
                indent=2,
            )
        )
        return

    console.print(f"\n[bold green]Monorepo: {monorepo.root.name}[/bold green]")
    console.print(f"[dim]Package Manager: {monorepo.package_manager}[/dim]\n")

    if not packages_to_show:
        info("No packages found matching criteria")
        return

    # Group by type
    by_type: dict[PackageType, list[Package]] = {}
    for pkg in packages_to_show:
        if pkg.package_type not in by_type:
            by_type[pkg.package_type] = []
        by_type[pkg.package_type].append(pkg)

    for ptype, pkgs in sorted(by_type.items(), key=lambda x: x[0].value):
        type_table = create_table(title=f"{ptype.value.title()} ({len(pkgs)})")
        type_table.add_column("Name", style="cyan")
        type_table.add_column("Path", style="dim")
        type_table.add_column("Scripts", style="green")

        for pkg in sorted(pkgs, key=lambda p: p.name):
            rel_path = pkg.path.relative_to(monorepo.root)
            available = []
            if pkg.has_script.get("dev"):
                available.append("dev")
            if pkg.has_script.get("test"):
                available.append("test")
            if pkg.has_script.get("build"):
                available.append("build")
            if pkg.has_script.get("check"):
                available.append("check")

            type_table.add_row(
                pkg.name,
                str(rel_path),
                ", ".join(available) or "-",
            )

        console.print(type_table)
        console.print()


@packages.command("info")
@click.argument("name", required=False)
@click.pass_context
def packages_info(ctx: click.Context, name: Optional[str]) -> None:
    """Show detailed info about a package.

    If no name is provided, shows info about the current package.

    \b
    Examples:
        gw packages info               # Current package
        gw packages info engine        # Specific package
    """
    output_json = ctx.obj.get("output_json", False)

    if name:
        monorepo = load_monorepo()
        if not monorepo:
            if output_json:
                console.print(json.dumps({"error": "Not in a monorepo"}))
            else:
                error("Not in a monorepo")
            raise SystemExit(1)

        pkg = monorepo.find_package(name)
    else:
        pkg = detect_current_package()

    if not pkg:
        if output_json:
            console.print(json.dumps({"error": "Package not found"}))
        else:
            error("Package not found")
            info("Run from a package directory or specify a package name")
        raise SystemExit(1)

    if output_json:
        console.print(json.dumps(pkg.to_dict(), indent=2))
        return

    console.print(f"\n[bold green]{pkg.name}[/bold green]")
    console.print(f"Type: [cyan]{pkg.package_type.value}[/cyan]")
    console.print(f"Path: [dim]{pkg.path}[/dim]\n")

    if pkg.scripts:
        console.print("[bold]Scripts:[/bold]")
        for script_name, script_cmd in sorted(pkg.scripts.items()):
            # Truncate long commands
            cmd_display = (
                script_cmd if len(script_cmd) < 50 else script_cmd[:47] + "..."
            )
            console.print(f"  [cyan]{script_name}[/cyan]: [dim]{cmd_display}[/dim]")
        console.print()

    console.print("[bold]Available Commands:[/bold]")
    for cmd, available in pkg.has_script.items():
        status = "[green]✓[/green]" if available else "[dim]✗[/dim]"
        console.print(f"  {status} gw {cmd}")


@packages.command("current")
@click.pass_context
def packages_current(ctx: click.Context) -> None:
    """Show the current package based on working directory.

    \b
    Examples:
        gw packages current
    """
    output_json = ctx.obj.get("output_json", False)

    pkg = detect_current_package()

    if not pkg:
        if output_json:
            console.print(json.dumps({"in_package": False}))
        else:
            info("Not currently in a package directory")
        return

    if output_json:
        console.print(
            json.dumps(
                {
                    "in_package": True,
                    "package": pkg.to_dict(),
                },
                indent=2,
            )
        )
    else:
        console.print(
            f"Current package: [cyan]{pkg.name}[/cyan] ({pkg.package_type.value})"
        )


@packages.command("deps")
@click.argument("name", required=False)
@click.option("--dev", is_flag=True, help="Include devDependencies")
@click.option("--peer", is_flag=True, help="Include peerDependencies")
@click.pass_context
def packages_deps(
    ctx: click.Context, name: Optional[str], dev: bool, peer: bool
) -> None:
    """List dependencies for a package.

    Replaces the need for: cat package.json | jq '.dependencies'

    If no name is provided, shows deps for the current package.

    \b
    Examples:
        gw packages deps                # Current package deps
        gw packages deps engine         # Engine package deps
        gw packages deps engine --dev   # Include devDependencies
    """
    output_json = ctx.obj.get("output_json", False)

    if name:
        monorepo = load_monorepo()
        if not monorepo:
            if output_json:
                console.print(json.dumps({"error": "Not in a monorepo"}))
            else:
                error("Not in a monorepo")
            raise SystemExit(1)
        pkg = monorepo.find_package(name)
    else:
        pkg = detect_current_package()

    if not pkg:
        if output_json:
            console.print(json.dumps({"error": "Package not found"}))
        else:
            error("Package not found")
            info("Run from a package directory or specify a package name")
        raise SystemExit(1)

    # Read the package.json to get dependencies
    package_json_path = pkg.path / "package.json"
    pyproject_path = pkg.path / "pyproject.toml"

    deps_data = {
        "package": pkg.name,
        "dependencies": {},
        "devDependencies": {},
        "peerDependencies": {},
    }

    if package_json_path.exists():
        with open(package_json_path) as f:
            pkg_json = json.load(f)
        deps_data["dependencies"] = pkg_json.get("dependencies", {})
        if dev:
            deps_data["devDependencies"] = pkg_json.get("devDependencies", {})
        if peer:
            deps_data["peerDependencies"] = pkg_json.get("peerDependencies", {})
    elif pyproject_path.exists():
        # For Python packages, try to parse pyproject.toml
        try:
            with open(pyproject_path, "rb") as f:
                pyproject = tomllib.load(f)
            deps_data["dependencies"] = {
                d: "*" for d in pyproject.get("project", {}).get("dependencies", [])
            }
            if dev:
                dev_deps = (
                    pyproject.get("project", {})
                    .get("optional-dependencies", {})
                    .get("dev", [])
                )
                deps_data["devDependencies"] = {d: "*" for d in dev_deps}
        except Exception:
            pass
    else:
        if output_json:
            console.print(
                json.dumps({"error": "No package.json or pyproject.toml found"})
            )
        else:
            error("No package.json or pyproject.toml found")
        raise SystemExit(1)

    if output_json:
        console.print(json.dumps(deps_data, indent=2))
        return

    console.print(f"\n[bold green]{pkg.name}[/bold green] dependencies\n")

    if deps_data["dependencies"]:
        dep_table = create_table(title="Dependencies")
        dep_table.add_column("Package", style="cyan")
        dep_table.add_column("Version", style="dim")
        for dep_name, version in sorted(deps_data["dependencies"].items()):
            dep_table.add_row(dep_name, version)
        console.print(dep_table)
        console.print()

    if dev and deps_data["devDependencies"]:
        dev_table = create_table(title="Dev Dependencies")
        dev_table.add_column("Package", style="cyan")
        dev_table.add_column("Version", style="dim")
        for dep_name, version in sorted(deps_data["devDependencies"].items()):
            dev_table.add_row(dep_name, version)
        console.print(dev_table)
        console.print()

    if peer and deps_data["peerDependencies"]:
        peer_table = create_table(title="Peer Dependencies")
        peer_table.add_column("Package", style="cyan")
        peer_table.add_column("Version", style="dim")
        for dep_name, version in sorted(deps_data["peerDependencies"].items()):
            peer_table.add_row(dep_name, version)
        console.print(peer_table)

    if (
        not deps_data["dependencies"]
        and not (dev and deps_data["devDependencies"])
        and not (peer and deps_data["peerDependencies"])
    ):
        info("No dependencies found")
