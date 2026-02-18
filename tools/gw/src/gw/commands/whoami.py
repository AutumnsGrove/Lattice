"""Identity command - show current user and context."""

import json
import os
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import click

from ..config import GWConfig
from ..packages import extract_package_from_path
from ..ui import console, create_panel, create_table, error, info, success


@click.command()
@click.option("--verbose", "-v", is_flag=True, help="Show detailed information")
@click.pass_context
def whoami(ctx: click.Context, verbose: bool) -> None:
    """Show current user, account, and context.

    Displays your Cloudflare account, current project, and configuration.

    \b
    Examples:
        gw whoami           # Basic identity info
        gw whoami -v        # Verbose with all details
    """
    output_json = ctx.obj.get("output_json", False)
    config: GWConfig = ctx.obj["config"]

    identity: dict[str, Any] = {
        "cloudflare": {},
        "github": {},
        "project": {},
        "vault": {},
        "environment": {},
    }

    # Get Cloudflare account info
    cf_info = _get_cloudflare_info()
    identity["cloudflare"] = cf_info

    # Get GitHub info
    gh_info = _get_github_info()
    identity["github"] = gh_info

    # Get project context
    project_info = _get_project_info()
    identity["project"] = project_info

    # Get vault info
    vault_info = _get_vault_info()
    identity["vault"] = vault_info

    # Get environment info
    env_info = _get_environment_info()
    identity["environment"] = env_info

    if output_json:
        console.print(json.dumps(identity, indent=2, default=str))
        return

    # Human-readable output
    console.print("\n[bold green]🌲 Grove Identity[/bold green]\n")

    # Cloudflare section
    cf_text = _format_cloudflare_section(cf_info)
    console.print(create_panel(cf_text, title="☁️  Cloudflare", style="blue"))
    console.print()

    # GitHub section
    gh_text = _format_github_section(gh_info)
    console.print(create_panel(gh_text, title="🐙 GitHub", style="magenta"))
    console.print()

    # Project section
    proj_text = _format_project_section(project_info)
    console.print(create_panel(proj_text, title="📁 Project", style="cyan"))
    console.print()

    # Vault section
    vault_text = _format_vault_section(vault_info)
    console.print(create_panel(vault_text, title="🔐 Secrets Vault", style="yellow"))

    if verbose:
        console.print()
        env_text = _format_environment_section(env_info)
        console.print(create_panel(env_text, title="⚙️  Environment", style="dim"))


def _get_cloudflare_info() -> dict[str, Any]:
    """Get Cloudflare account information from wrangler."""
    info: dict[str, Any] = {
        "authenticated": False,
        "email": None,
        "account_id": None,
        "account_name": None,
    }

    try:
        result = subprocess.run(
            ["wrangler", "whoami"],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode == 0:
            output = result.stdout
            info["authenticated"] = "You are logged in" in output

            # Parse output for details
            for line in output.split("\n"):
                line = line.strip()
                if "@" in line and "." in line and not line.startswith("│"):
                    # Likely an email
                    info["email"] = line
                if "Account ID" in line:
                    parts = line.split(":")
                    if len(parts) > 1:
                        info["account_id"] = parts[-1].strip()
                if "Account Name" in line:
                    parts = line.split(":")
                    if len(parts) > 1:
                        info["account_name"] = parts[-1].strip()

    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    return info


def _get_github_info() -> dict[str, Any]:
    """Get GitHub account information from gh CLI."""
    info: dict[str, Any] = {
        "authenticated": False,
        "username": None,
        "scopes": [],
    }

    try:
        # Check auth status
        result = subprocess.run(
            ["gh", "auth", "status"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            info["authenticated"] = True
            output = result.stderr + result.stdout  # gh auth status outputs to stderr

            for line in output.split("\n"):
                if "Logged in to" in line and "as" in line:
                    # Extract username
                    parts = line.split("as")
                    if len(parts) > 1:
                        username = parts[-1].strip().split()[0]
                        info["username"] = username.rstrip(")")

    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    return info


def _get_project_info() -> dict[str, Any]:
    """Get current project context."""
    cwd = Path.cwd()

    info: dict[str, Any] = {
        "directory": str(cwd),
        "name": cwd.name,
        "is_monorepo": False,
        "monorepo_root": None,
        "current_package": None,
        "wrangler_config": None,
        "git_branch": None,
        "git_remote": None,
    }

    # Check for monorepo
    workspace_file = cwd / "pnpm-workspace.yaml"
    monorepo_root = cwd
    if not workspace_file.exists():
        for parent in cwd.parents:
            if (parent / "pnpm-workspace.yaml").exists():
                monorepo_root = parent
                workspace_file = parent / "pnpm-workspace.yaml"
                break

    if workspace_file.exists():
        info["is_monorepo"] = True
        info["monorepo_root"] = str(monorepo_root)
        info["name"] = monorepo_root.name

        # Detect current package
        if cwd != monorepo_root:
            rel_path = cwd.relative_to(monorepo_root)
            pkg = extract_package_from_path(str(rel_path))
            if pkg:
                info["current_package"] = pkg

    # Check for wrangler.toml
    wrangler_toml = cwd / "wrangler.toml"
    if not wrangler_toml.exists() and info["current_package"]:
        pkg_id = info["current_package"]
        if "/" in pkg_id:
            # New layout (apps/landing) or tools/workers — path is the identifier
            wrangler_toml = monorepo_root / pkg_id / "wrangler.toml"
        else:
            # Old layout — bare name lives under packages/
            wrangler_toml = monorepo_root / "packages" / pkg_id / "wrangler.toml"
    if wrangler_toml.exists():
        info["wrangler_config"] = str(wrangler_toml)

    # Get git info
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
            cwd=cwd,
        )
        if result.returncode == 0:
            info["git_branch"] = result.stdout.strip()

        result = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            capture_output=True,
            text=True,
            timeout=5,
            cwd=cwd,
        )
        if result.returncode == 0:
            info["git_remote"] = result.stdout.strip()

    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    return info


def _get_vault_info() -> dict[str, Any]:
    """Get secrets vault information."""
    vault_path = Path.home() / ".grove" / "secrets.enc"

    info: dict[str, Any] = {
        "exists": vault_path.exists(),
        "path": str(vault_path),
        "secrets_count": 0,
        "last_modified": None,
    }

    if vault_path.exists():
        stat = vault_path.stat()
        info["last_modified"] = datetime.fromtimestamp(stat.st_mtime).isoformat()

        # Try to count secrets (would need vault access, so estimate from file size)
        # For now, just indicate it exists
        info["secrets_count"] = "?"  # Would need to unlock to count

    return info


def _get_environment_info() -> dict[str, Any]:
    """Get environment information."""
    return {
        "agent_mode": os.environ.get("GW_AGENT_MODE", "0") == "1",
        "cf_api_token_set": bool(os.environ.get("CF_API_TOKEN")),
        "shell": os.environ.get("SHELL", "unknown"),
        "term": os.environ.get("TERM", "unknown"),
        "editor": os.environ.get("EDITOR", os.environ.get("VISUAL", "not set")),
    }


def _format_cloudflare_section(info: dict[str, Any]) -> str:
    """Format Cloudflare section for display."""
    if not info["authenticated"]:
        return "[red]Not authenticated[/red]\nRun: wrangler login"

    lines = []
    if info["email"]:
        lines.append(f"Email: [cyan]{info['email']}[/cyan]")
    if info["account_name"]:
        lines.append(f"Account: {info['account_name']}")
    if info["account_id"]:
        lines.append(f"Account ID: [dim]{info['account_id'][:8]}...[/dim]")

    return "\n".join(lines) if lines else "[green]Authenticated[/green]"


def _format_github_section(info: dict[str, Any]) -> str:
    """Format GitHub section for display."""
    if not info["authenticated"]:
        return "[yellow]Not authenticated[/yellow]\nRun: gh auth login"

    lines = []
    if info["username"]:
        lines.append(f"Username: [cyan]@{info['username']}[/cyan]")
    else:
        lines.append("[green]Authenticated[/green]")

    return "\n".join(lines)


def _format_project_section(info: dict[str, Any]) -> str:
    """Format project section for display."""
    lines = []

    lines.append(f"Directory: [dim]{info['directory']}[/dim]")

    if info["is_monorepo"]:
        lines.append(f"Monorepo: [cyan]{info['name']}[/cyan]")
        if info["current_package"]:
            lines.append(f"Package: [green]{info['current_package']}[/green]")
    else:
        lines.append(f"Project: {info['name']}")

    if info["git_branch"]:
        lines.append(f"Branch: [magenta]{info['git_branch']}[/magenta]")

    if info["git_remote"]:
        # Shorten git remote for display
        remote = info["git_remote"]
        if "github.com" in remote:
            remote = remote.replace("https://github.com/", "").replace(".git", "")
            remote = remote.replace("git@github.com:", "").replace(".git", "")
        lines.append(f"Remote: [dim]{remote}[/dim]")

    return "\n".join(lines)


def _format_vault_section(info: dict[str, Any]) -> str:
    """Format vault section for display."""
    if not info["exists"]:
        return "[yellow]Not initialized[/yellow]\nRun: gw secret init"

    lines = []
    lines.append("[green]Initialized[/green]")
    if info["last_modified"]:
        # Parse and format nicely
        dt = datetime.fromisoformat(info["last_modified"])
        lines.append(f"Last modified: [dim]{dt.strftime('%Y-%m-%d %H:%M')}[/dim]")

    return "\n".join(lines)


def _format_environment_section(info: dict[str, Any]) -> str:
    """Format environment section for display."""
    lines = []

    if info["agent_mode"]:
        lines.append("Mode: [yellow]Agent Mode[/yellow] (GW_AGENT_MODE=1)")
    else:
        lines.append("Mode: Human")

    lines.append(f"CF_API_TOKEN: {'[green]Set[/green]' if info['cf_api_token_set'] else '[dim]Not set[/dim]'}")
    lines.append(f"Shell: {info['shell']}")
    lines.append(f"Editor: {info['editor']}")

    return "\n".join(lines)
