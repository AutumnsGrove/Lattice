"""Publish commands - npm and package registry workflows."""

import json
import re
import subprocess
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm

from ..ui import success, error, info, warning, is_interactive
from ..packages import load_monorepo

console = Console()

# Registry configurations
GITHUB_REGISTRY = "https://npm.pkg.github.com"
NPM_REGISTRY = "https://registry.npmjs.org"


@click.group()
def publish() -> None:
    """Publish packages to registries.

    Handles the registry swap workflow for publishing to npm while
    keeping GitHub Packages as the default.

    \\b
    Examples:
        gw publish npm --bump patch        # Bump patch, publish to npm
        gw publish npm --bump minor        # Bump minor version
        gw publish npm --dry-run           # Preview without publishing
    """
    pass


@publish.command("npm")
@click.option("--bump", type=click.Choice(["patch", "minor", "major"]), help="Version bump type")
@click.option("--version", "explicit_version", help="Explicit version (e.g., 1.0.0)")
@click.option("--package", "-p", default="@autumnsgrove/lattice", help="Package to publish (default: lattice)")
@click.option("--dry-run", is_flag=True, help="Preview without executing")
@click.option("--skip-build", is_flag=True, help="Skip the build step")
@click.option("--skip-commit", is_flag=True, help="Skip git commit and push")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.pass_context
def npm_publish(
    ctx: click.Context,
    bump: Optional[str],
    explicit_version: Optional[str],
    package: str,
    dry_run: bool,
    skip_build: bool,
    skip_commit: bool,
    write: bool,
) -> None:
    """Publish a package to npm with registry swap.

    This command automates the npm publish workflow:

    \\b
    1. Bump version in package.json
    2. Swap publishConfig to npm registry
    3. Build the package
    4. Publish to npm
    5. Swap publishConfig BACK to GitHub Packages
    6. Commit version bump
    7. Push to remote

    The --write flag is required to actually execute (safety first!).

    \\b
    Examples:
        gw publish npm --bump patch --write     # Patch bump and publish
        gw publish npm --bump minor --write     # Minor bump and publish
        gw publish npm --version 1.0.0 --write  # Explicit version
        gw publish npm --dry-run                # Preview the workflow
    """
    output_json = ctx.obj.get("output_json", False)

    # Require --write flag for actual execution
    if not write and not dry_run:
        if output_json:
            console.print(json.dumps({"error": "Use --write to confirm or --dry-run to preview"}))
        else:
            error("This command modifies package.json and publishes to npm")
            info("Use --write to confirm, or --dry-run to preview")
        raise SystemExit(1)

    # Require version bump specification
    if not bump and not explicit_version:
        if output_json:
            console.print(json.dumps({"error": "Specify --bump or --version"}))
        else:
            error("Specify version: --bump patch|minor|major or --version X.Y.Z")
        raise SystemExit(1)

    # Find the package
    monorepo = load_monorepo()
    if not monorepo:
        error("Not in a monorepo")
        raise SystemExit(1)

    pkg = monorepo.find_package(package)
    if not pkg:
        error(f"Package not found: {package}")
        info(f"Available packages: {', '.join(p.name for p in monorepo.packages)}")
        raise SystemExit(1)

    package_json_path = pkg.path / "package.json"
    if not package_json_path.exists():
        error(f"No package.json at {package_json_path}")
        raise SystemExit(1)

    # Read current package.json
    package_data = json.loads(package_json_path.read_text())
    current_version = package_data.get("version", "0.0.0")
    package_name = package_data.get("name", package)

    # Calculate new version
    if explicit_version:
        new_version = explicit_version
    else:
        new_version = _bump_version(current_version, bump)

    # Show the plan
    if not output_json:
        console.print()
        console.print(Panel(
            f"[bold]Package:[/bold] {package_name}\n"
            f"[bold]Version:[/bold] {current_version} → [green]{new_version}[/green]\n"
            f"[bold]Registry:[/bold] {NPM_REGISTRY}\n"
            f"[bold]Build:[/bold] {'Skip' if skip_build else 'pnpm run package'}\n"
            f"[bold]Commit:[/bold] {'Skip' if skip_commit else f'chore: bump version to {new_version}'}",
            title="📦 npm Publish Plan",
            border_style="green" if not dry_run else "yellow",
        ))
        console.print()

    if dry_run:
        if output_json:
            console.print(json.dumps({
                "dry_run": True,
                "package": package_name,
                "current_version": current_version,
                "new_version": new_version,
                "steps": [
                    "Bump version",
                    "Swap registry to npm",
                    "Build package" if not skip_build else "(skip build)",
                    "Publish to npm",
                    "Swap registry back to GitHub",
                    "Commit version bump" if not skip_commit else "(skip commit)",
                    "Push to remote" if not skip_commit else "(skip push)",
                ],
            }, indent=2))
        else:
            info("DRY RUN - No changes made")
        return

    # Confirm if interactive
    if is_interactive():
        if not Confirm.ask(f"Publish {package_name}@{new_version} to npm?", default=True):
            console.print("[dim]Aborted[/dim]")
            raise SystemExit(0)

    # Step 1: Bump version
    info(f"Step 1/6: Bumping version to {new_version}...")
    package_data["version"] = new_version
    package_json_path.write_text(json.dumps(package_data, indent=2) + "\n")
    success(f"Version bumped to {new_version}")

    # Step 2: Swap to npm registry
    info("Step 2/6: Swapping registry to npm...")
    original_publish_config = package_data.get("publishConfig", {}).copy()
    package_data["publishConfig"] = {
        "registry": NPM_REGISTRY,
        "access": "public",
    }
    package_json_path.write_text(json.dumps(package_data, indent=2) + "\n")
    success("Registry swapped to npm")

    try:
        # Step 3: Build
        if not skip_build:
            info("Step 3/6: Building package...")
            result = subprocess.run(
                ["pnpm", "run", "package"],
                cwd=pkg.path,
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                error(f"Build failed: {result.stderr}")
                raise SystemExit(1)
            success("Package built")
        else:
            info("Step 3/6: Skipping build")

        # Step 4: Publish to npm
        info("Step 4/6: Publishing to npm...")
        result = subprocess.run(
            ["npm", "publish", "--access", "public"],
            cwd=pkg.path,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            error(f"Publish failed: {result.stderr}")
            # Show common errors
            if "EOTP" in result.stderr:
                warning("OTP/2FA error - ensure your npm token has 'Bypass 2FA' enabled")
                info("See: https://www.npmjs.com/settings/autumnsgrove/tokens")
            elif "403" in result.stderr:
                warning("403 error - you may have already published this version")
            raise SystemExit(1)

        # Check for success message
        if f"+ {package_name}@{new_version}" in result.stdout:
            success(f"Published {package_name}@{new_version} to npm!")
        else:
            success("Published to npm")
            console.print(f"[dim]{result.stdout}[/dim]")

    finally:
        # Step 5: ALWAYS swap back to GitHub registry
        info("Step 5/6: Swapping registry back to GitHub...")
        package_data["publishConfig"] = {"registry": GITHUB_REGISTRY}
        package_json_path.write_text(json.dumps(package_data, indent=2) + "\n")
        success("Registry restored to GitHub Packages")

    # Step 6: Commit and push
    if not skip_commit:
        info("Step 6/6: Committing and pushing...")
        subprocess.run(
            ["git", "add", str(package_json_path)],
            cwd=monorepo.root,
            capture_output=True,
        )
        result = subprocess.run(
            ["git", "commit", "-m", f"chore: bump {package} version to {new_version}"],
            cwd=monorepo.root,
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            success("Version bump committed")
            # Push
            result = subprocess.run(
                ["git", "push"],
                cwd=monorepo.root,
                capture_output=True,
                text=True,
            )
            if result.returncode == 0:
                success("Pushed to remote")
            else:
                warning(f"Push failed: {result.stderr}")
        else:
            warning(f"Commit failed: {result.stderr}")
    else:
        info("Step 6/6: Skipping commit and push")

    # Final summary
    if output_json:
        console.print(json.dumps({
            "published": True,
            "package": package_name,
            "version": new_version,
            "registry": NPM_REGISTRY,
        }))
    else:
        console.print()
        console.print(Panel(
            f"✅ [bold green]Successfully published![/bold green]\n\n"
            f"Package: {package_name}@{new_version}\n"
            f"Registry: npm\n\n"
            f"[dim]Verify: npm view {package_name} version[/dim]",
            title="🎉 Published",
            border_style="green",
        ))


def _bump_version(current: str, bump_type: str) -> str:
    """Bump a semver version string.

    Args:
        current: Current version (e.g., "1.2.3")
        bump_type: Type of bump (patch, minor, major)

    Returns:
        New version string
    """
    match = re.match(r"(\d+)\.(\d+)\.(\d+)", current)
    if not match:
        raise click.ClickException(f"Invalid version format: {current}")

    major, minor, patch = map(int, match.groups())

    if bump_type == "patch":
        patch += 1
    elif bump_type == "minor":
        minor += 1
        patch = 0
    elif bump_type == "major":
        major += 1
        minor = 0
        patch = 0

    return f"{major}.{minor}.{patch}"
