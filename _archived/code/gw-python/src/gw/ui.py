"""Rich terminal UI helpers for Grove Wrap."""

import os
import sys
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Generator

import click
from rich.console import Console
from rich.panel import Panel
from rich.spinner import Spinner
from rich.table import Table
from rich.text import Text

console = Console()

# Grove-themed color palette (nature-inspired, single source of truth)
GROVE_COLORS = {
    "forest_green": "green",
    "bark_brown": "bright_black",
    "sky_blue": "blue",
    "sunset_orange": "orange3",
    "leaf_yellow": "yellow",
    "river_cyan": "cyan",
    "moss": "green3",
    "blossom_pink": "magenta",
}


# ── Cozy Group ────────────────────────────────────────────────────────
#
# Reusable Click group class that renders categorized Rich panels.
# Use cls=CozyGroup with any @click.group() to get warm help output.
#
# Categories format: dict[str, tuple[title, color, list[tuple[name, desc]]]]
#   e.g. {"read": ("📖 Read", "green", [("list", "List all"), ...])}


class CozyGroup(click.Group):
    """Click group with categorized Rich panel help display.

    Usage:
        @click.group(cls=CozyGroup, cozy_categories={...})
        def my_group():
            '''Group description.'''
            pass
    """

    def __init__(
        self,
        *args,
        cozy_categories: dict | None = None,
        cozy_show_safety: bool = True,
        **kwargs,
    ):
        super().__init__(*args, **kwargs)
        self.cozy_categories = cozy_categories or {}
        self.cozy_show_safety = cozy_show_safety

    def format_help(self, ctx: click.Context, formatter: click.HelpFormatter) -> None:
        """Override to show categorized help with Rich panels."""
        # Header
        cmd_path = ctx.command_path
        subtitle = self.help.split("\n")[0].strip() if self.help else ""

        header = Text()
        header.append(cmd_path, f"bold {GROVE_COLORS['forest_green']}")
        if subtitle:
            header.append(f" — {subtitle}\n", "dim")
        else:
            header.append("\n")
        console.print(header)

        # Category panels
        for _key, (title, color, commands) in self.cozy_categories.items():
            table = Table(show_header=False, box=None, padding=(0, 1))
            table.add_column("Command", style=f"bold {color}", width=14)
            table.add_column("Description", style="dim")

            for cmd_name, cmd_desc in commands:
                table.add_row(f"  {cmd_name}", cmd_desc)

            panel = Panel(
                table,
                title=f"[bold {color}]{title}[/bold {color}]",
                border_style=color,
                padding=(0, 1),
            )
            console.print(panel)

        # Safety tiers footer (optional)
        if self.cozy_show_safety:
            tips = Text()
            tips.append("\U0001f6e1\ufe0f  ", GROVE_COLORS["leaf_yellow"])
            tips.append("Safety Tiers:\n", "bold")
            tips.append("  READ     ", f"bold {GROVE_COLORS['forest_green']}")
            tips.append("Always safe — no flags needed\n", "dim")
            tips.append("  WRITE    ", f"bold {GROVE_COLORS['leaf_yellow']}")
            tips.append("Requires ", "dim")
            tips.append("--write", f"bold {GROVE_COLORS['leaf_yellow']}")
            tips.append(" flag\n", "dim")
            tips.append("  DANGER   ", "bold red")
            tips.append("Requires ", "dim")
            tips.append("--write --force", "bold red")
            tips.append("\n", "dim")

            tips_panel = Panel(
                tips,
                border_style=GROVE_COLORS["leaf_yellow"],
                padding=(0, 1),
            )
            console.print(tips_panel)

        console.print()


# ── Git-specific UI helpers ───────────────────────────────────────────


def git_error(msg: str) -> None:
    """Print a git error and exit."""
    console.print(f"[red]Git error:[/red] {msg}")


def safety_error(msg: str, suggestion: str | None = None) -> None:
    """Print a safety check failure with optional suggestion."""
    console.print(f"[red]Safety check failed:[/red] {msg}")
    if suggestion:
        console.print(f"[dim]{suggestion}[/dim]")


def action(verb: str, detail: str) -> None:
    """Print a successful action (e.g. 'Committed', 'Pushed')."""
    console.print(f"[green]{verb}:[/green] {detail}")


def hint(msg: str) -> None:
    """Print a dim hint or suggestion."""
    console.print(f"[dim]{msg}[/dim]")


def step(ok: bool, msg: str) -> None:
    """Print a step result line with ✓ or ✗ icon."""
    icon = "✓" if ok else "✗"
    color = "green" if ok else "red"
    console.print(f"  [{color}]{icon}[/{color}] {msg}")


def not_a_repo() -> None:
    """Print 'Not a git repository' and exit."""
    console.print("[red]Not a git repository[/red]")
    raise SystemExit(1)


def relative_time(iso_str: str) -> str:
    """Convert an ISO 8601 timestamp to a human-friendly relative string.

    Args:
        iso_str: ISO 8601 timestamp (e.g. "2026-02-16T12:00:00Z")

    Returns:
        Relative time string like "2 min ago", "1 hr ago", "3 days ago"
    """
    if not iso_str:
        return ""
    try:
        # Handle Z suffix for Python < 3.11 compat
        ts = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        delta = now - ts
        seconds = int(delta.total_seconds())

        if seconds < 0:
            return "just now"
        if seconds < 60:
            return "just now"
        if seconds < 3600:
            m = seconds // 60
            return f"{m} min ago"
        if seconds < 86400:
            h = seconds // 3600
            return f"{h} hr ago" if h == 1 else f"{h} hrs ago"
        days = seconds // 86400
        if days == 1:
            return "yesterday"
        if days < 30:
            return f"{days} days ago"
        months = days // 30
        return f"{months} mo ago" if months == 1 else f"{months} mos ago"
    except (ValueError, TypeError):
        return iso_str


def render_comments(comments: list, title: str = "Comments") -> None:
    """Render a list of comment objects with Rich formatting.

    Works with any object that has: .author, .body, .created_at,
    .is_review_comment, .path, .line attributes.
    """
    from rich.markdown import Markdown  # local import to keep ui.py lean

    if not comments:
        console.print("\n[dim]No comments.[/dim]")
        return

    console.print(f"\n[bold]{title}[/bold] [dim]({len(comments)})[/dim]")
    for c in comments:
        comment_type = "[dim](review)[/dim] " if c.is_review_comment else ""
        location = ""
        if c.path:
            location = f" [cyan]{c.path}[/cyan]"
            if c.line:
                location += f":[cyan]{c.line}[/cyan]"

        console.print(
            f"\n{comment_type}[bold]{c.author}[/bold]{location} "
            f"[dim]{relative_time(c.created_at)}[/dim]"
        )
        console.print(Markdown(c.body))
        console.print("[dim]" + "─" * 40 + "[/dim]")


def is_interactive() -> bool:
    """Check if we're running in an interactive terminal.

    Returns False when:
    - stdin is not a TTY (piped input, CI, agents)
    - GW_AGENT_MODE is set
    - Running as MCP server
    - NO_INTERACTIVE env var is set

    Use this to skip confirmation prompts in non-interactive contexts.

    Returns:
        True if interactive prompts are safe to use
    """
    # Not a TTY = definitely not interactive
    if not sys.stdin.isatty():
        return False

    # Agent mode explicitly set
    if os.environ.get("GW_AGENT_MODE"):
        return False

    # MCP server mode
    if os.environ.get("GW_MCP_SERVER"):
        return False

    # Generic escape hatch
    if os.environ.get("NO_INTERACTIVE"):
        return False

    return True


def create_table(
    title: str = "",
    show_header: bool = True,
    header_style: str = "bold magenta",
) -> Table:
    """Create a Rich table with Grove styling.

    Args:
        title: Optional table title
        show_header: Whether to show header row
        header_style: Style for header

    Returns:
        Configured Table instance
    """
    table = Table(
        title=title,
        show_header=show_header,
        header_style=header_style,
        border_style="green",
    )
    return table


def create_panel(
    content: str,
    title: str = "",
    style: str = "green",
    expand: bool = True,
) -> Panel:
    """Create a Rich panel with Grove styling.

    Args:
        content: Panel content
        title: Optional panel title
        style: Border style
        expand: Whether panel expands to console width

    Returns:
        Configured Panel instance
    """
    return Panel(
        content,
        title=title,
        style=style,
        expand=expand,
    )


def success(message: str) -> None:
    """Print a success message.

    Args:
        message: Message to display
    """
    console.print(f"[green]✓[/green] {message}")


def error(message: str) -> None:
    """Print an error message.

    Args:
        message: Message to display
    """
    console.print(f"[red]✗[/red] {message}")


def warning(message: str) -> None:
    """Print a warning message.

    Args:
        message: Message to display
    """
    console.print(f"[yellow]⚠[/yellow] {message}")


def info(message: str) -> None:
    """Print an info message.

    Args:
        message: Message to display
    """
    console.print(f"[blue]ℹ[/blue] {message}")


@contextmanager
def spinner(text: str = "Loading...") -> Generator[None, None, None]:
    """Context manager for spinner animation.

    Args:
        text: Text to display with spinner

    Yields:
        None
    """
    with console.status(f"[bold green]{text}[/bold green]"):
        yield
