"""Rich terminal UI helpers for Grove Wrap."""

from contextlib import contextmanager
from typing import Generator

from rich.console import Console
from rich.panel import Panel
from rich.spinner import Spinner
from rich.table import Table
from rich.text import Text

console = Console()


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
