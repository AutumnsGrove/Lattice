"""Rich terminal UI helpers for Grove Wrap."""

import os
import sys
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Generator

from rich.console import Console
from rich.panel import Panel
from rich.spinner import Spinner
from rich.table import Table
from rich.text import Text

console = Console()


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
