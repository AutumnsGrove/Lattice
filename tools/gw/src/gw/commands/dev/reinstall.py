"""Reinstall UV tools command."""

import subprocess
from pathlib import Path

import click
from rich.console import Console

from ...ui import success, error, info

console = Console()


@click.command()
@click.pass_context
def reinstall(ctx: click.Context) -> None:
    """Reinstall gw as a global UV tool.

    After making changes to tools/gw, the global command won't see
    your changes until you reinstall it.

    \b
    Examples:
        gw dev reinstall              # Reinstall gw
    """
    # Find the tools directory by locating the git repository root
    # This works both when running from source and from the installed tool
    tools_root = None
    found_via_git = False
    
    # Method 1: Search upward from current working directory for .git
    cwd = Path.cwd()
    current = cwd
    while current != current.parent:
        if (current / ".git").exists():
            tools_root = current / "tools"
            found_via_git = True
            break
        current = current.parent
    
    # Method 2: Fallback to relative path from __file__ if running from source
    if tools_root is None or not tools_root.exists():
        this_file = Path(__file__).resolve()
        gw_root = this_file.parent.parent.parent.parent.parent  # tools/gw
        tools_root = gw_root.parent  # tools/

    if not tools_root.exists():
        error(f"Could not find tools directory")
        info("Please run this command from within the GroveEngine repository")
        ctx.exit(1)

    # If we didn't find via git search, we're likely running from installed location
    # In that case, verify we have valid source directories (they should have pyproject.toml)
    if not found_via_git:
        gw_path = tools_root / "gw"
        if not (gw_path.exists() and (gw_path / "pyproject.toml").exists()):
            error(f"Not running from a valid source directory")
            info(f"Current directory: {cwd}")
            info(f"Please run this command from within the GroveEngine repository")
            ctx.exit(1)

    gw_path = tools_root / "gw"

    if not gw_path.exists():
        error(f"Tool directory not found: {gw_path}")
        ctx.exit(1)

    info(f"Reinstalling gw from {gw_path}...")

    try:
        result = subprocess.run(
            ["uv", "tool", "install", str(gw_path), "--force", "--reinstall"],
            capture_output=True,
            text=True,
        )

        if result.returncode == 0:
            console.print()
            success("Reinstalled gw!")
            info("Run 'gw --help' to verify")
        else:
            error(f"Failed to reinstall gw: {result.stderr.strip()}")
            ctx.exit(1)

    except FileNotFoundError:
        error("UV not found. Install it from https://docs.astral.sh/uv/")
        ctx.exit(1)
    except Exception as e:
        error(f"Failed to reinstall gw: {e}")
        ctx.exit(1)
