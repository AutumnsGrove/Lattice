"""Shell completion generation and installation."""

import json
import os
import subprocess
from pathlib import Path
from typing import Optional

import click

from ..completions import (
    generate_bash_completion,
    generate_fish_completion,
    generate_zsh_completion,
)
from ..ui import GROVE_COLORS, CozyGroup, console, error, info, success, warning


COMPLETION_CATEGORIES = {
    "setup": (
        "\U0001f527 Setup",
        GROVE_COLORS["bark_brown"],
        [
            ("install", "Auto-detect and install completions"),
            ("uninstall", "Remove installed completions"),
        ],
    ),
    "generate": (
        "\u2728 Generate",
        GROVE_COLORS["river_cyan"],
        [
            ("bash", "Generate bash completion script"),
            ("zsh", "Generate zsh completion script"),
            ("fish", "Generate fish completion script"),
        ],
    ),
}


@click.group(cls=CozyGroup, cozy_categories=COMPLETION_CATEGORIES, cozy_show_safety=False)
def completion() -> None:
    """Shell completion generation."""
    pass


@completion.command("install")
@click.option("--shell", type=click.Choice(["bash", "zsh", "fish"]), help="Shell to install for")
@click.option("--dry-run", is_flag=True, help="Show what would be done")
@click.pass_context
def completion_install(ctx: click.Context, shell: Optional[str], dry_run: bool) -> None:
    """Install completions for your shell.

    Auto-detects your shell if not specified.

    \b
    Examples:
        gw completion install          # Auto-detect
        gw completion install --shell zsh
        gw completion install --dry-run
    """
    output_json = ctx.obj.get("output_json", False)

    # Detect shell
    if not shell:
        shell = _detect_shell()

    if not shell:
        if output_json:
            console.print(json.dumps({"error": "Could not detect shell"}))
        else:
            error("Could not detect shell. Use --shell to specify.")
        ctx.exit(1)

    # Get completion script and install path
    if shell == "bash":
        script = generate_bash_completion()
        install_path = Path.home() / ".bash_completion.d" / "gw"
        rc_file = Path.home() / ".bashrc"
        source_line = f'[ -f "{install_path}" ] && source "{install_path}"'
    elif shell == "zsh":
        script = generate_zsh_completion()
        install_path = Path.home() / ".zfunc" / "_gw"
        rc_file = Path.home() / ".zshrc"
        source_line = None  # zsh auto-loads from fpath
    elif shell == "fish":
        script = generate_fish_completion()
        install_path = Path.home() / ".config" / "fish" / "completions" / "gw.fish"
        rc_file = None  # Fish auto-loads from completions dir
        source_line = None

    if output_json:
        console.print(json.dumps({
            "shell": shell,
            "install_path": str(install_path),
            "rc_file": str(rc_file) if rc_file else None,
            "dry_run": dry_run,
        }))
        if dry_run:
            return

    if dry_run:
        console.print(f"[bold yellow]DRY RUN[/bold yellow] - Would install for {shell}:\n")
        console.print(f"  [cyan]Completion script:[/cyan] {install_path}")
        if rc_file and source_line:
            console.print(f"  [cyan]Source line added to:[/cyan] {rc_file}")
        return

    # Create directory if needed
    install_path.parent.mkdir(parents=True, exist_ok=True)

    # Write completion script
    install_path.write_text(script)
    success(f"Installed completion script to {install_path}")

    # For zsh, ensure fpath is set up
    if shell == "zsh":
        zshrc = Path.home() / ".zshrc"
        zshrc_content = zshrc.read_text() if zshrc.exists() else ""
        fpath_line = 'fpath=(~/.zfunc $fpath)'

        if fpath_line not in zshrc_content and "~/.zfunc" not in zshrc_content:
            info(f"Add this to your ~/.zshrc:\n  {fpath_line}\n  autoload -Uz compinit && compinit")
        else:
            info("Run 'autoload -Uz compinit && compinit' or restart your shell")

    # For bash, add source line if needed
    elif shell == "bash" and rc_file and source_line:
        rc_content = rc_file.read_text() if rc_file.exists() else ""
        if source_line not in rc_content:
            with open(rc_file, "a") as f:
                f.write(f"\n# Grove Wrap completion\n{source_line}\n")
            info(f"Added source line to {rc_file}")

        info(f"Run 'source {rc_file}' or restart your shell")

    elif shell == "fish":
        info("Fish will auto-load the completion. Restart your shell to activate.")


@completion.command("bash")
@click.pass_context
def completion_bash(ctx: click.Context) -> None:
    """Generate bash completion script.

    \b
    Examples:
        gw completion bash > ~/.bash_completion.d/gw
        gw completion bash | sudo tee /etc/bash_completion.d/gw
    """
    console.print(generate_bash_completion())


@completion.command("zsh")
@click.pass_context
def completion_zsh(ctx: click.Context) -> None:
    """Generate zsh completion script.

    \b
    Examples:
        gw completion zsh > ~/.zfunc/_gw
        # Then add ~/.zfunc to fpath in .zshrc:
        # fpath=(~/.zfunc $fpath)
        # autoload -Uz compinit && compinit
    """
    console.print(generate_zsh_completion())


@completion.command("fish")
@click.pass_context
def completion_fish(ctx: click.Context) -> None:
    """Generate fish completion script.

    \b
    Examples:
        gw completion fish > ~/.config/fish/completions/gw.fish
    """
    console.print(generate_fish_completion())


@completion.command("uninstall")
@click.option("--shell", type=click.Choice(["bash", "zsh", "fish"]), help="Shell to uninstall from")
@click.pass_context
def completion_uninstall(ctx: click.Context, shell: Optional[str]) -> None:
    """Remove installed completions.

    \b
    Examples:
        gw completion uninstall
        gw completion uninstall --shell zsh
    """
    output_json = ctx.obj.get("output_json", False)

    if not shell:
        shell = _detect_shell()

    if not shell:
        if output_json:
            console.print(json.dumps({"error": "Could not detect shell"}))
        else:
            error("Could not detect shell. Use --shell to specify.")
        ctx.exit(1)

    # Get install path
    if shell == "bash":
        install_path = Path.home() / ".bash_completion.d" / "gw"
    elif shell == "zsh":
        install_path = Path.home() / ".zfunc" / "_gw"
    elif shell == "fish":
        install_path = Path.home() / ".config" / "fish" / "completions" / "gw.fish"

    if install_path.exists():
        install_path.unlink()
        if output_json:
            console.print(json.dumps({"removed": str(install_path)}))
        else:
            success(f"Removed {install_path}")
    else:
        if output_json:
            console.print(json.dumps({"message": "Not installed"}))
        else:
            info(f"Completion not installed at {install_path}")


def _detect_shell() -> Optional[str]:
    """Detect the current shell."""
    shell_env = os.environ.get("SHELL", "")

    if "zsh" in shell_env:
        return "zsh"
    elif "bash" in shell_env:
        return "bash"
    elif "fish" in shell_env:
        return "fish"

    # Try to detect from running process
    try:
        result = subprocess.run(
            ["ps", "-p", str(os.getppid()), "-o", "comm="],
            capture_output=True,
            text=True,
            timeout=5,
        )
        shell_name = result.stdout.strip()
        if "zsh" in shell_name:
            return "zsh"
        elif "bash" in shell_name:
            return "bash"
        elif "fish" in shell_name:
            return "fish"
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    return None
