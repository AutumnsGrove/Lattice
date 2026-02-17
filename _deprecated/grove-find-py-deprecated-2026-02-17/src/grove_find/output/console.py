"""Console output with mode-aware formatting.

Provides Rich console output for human mode, and clean text for agent mode.
The abstraction ensures all output respects the current output mode.
"""

from typing import Optional
import sys

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from grove_find.core.config import get_config, OutputMode


class GroveFindConsole:
    """Mode-aware console for grove-find output.

    In human mode: Rich formatting with colors, emoji, and box-drawing
    In agent mode: Clean text with === headers and no decorations
    In JSON mode: Structured output (handled separately by commands)
    """

    def __init__(self) -> None:
        self._console = Console()

    @property
    def _is_agent_mode(self) -> bool:
        """Check if we're in agent mode."""
        try:
            config = get_config()
            return config.output_mode == OutputMode.AGENT
        except RuntimeError:
            # Config not initialized yet, check env directly
            import os

            return bool(os.environ.get("GF_AGENT"))

    def print(self, *args, **kwargs) -> None:
        """Print to console, respecting output mode."""
        if self._is_agent_mode:
            # Strip Rich markup for agent mode
            text = " ".join(str(arg) for arg in args)
            # Remove Rich tags like [green] [/green]
            import re

            text = re.sub(r"\[/?[^\]]+\]", "", text)
            print(text, file=sys.stdout)
        else:
            self._console.print(*args, **kwargs)

    def print_raw(self, text: str) -> None:
        """Print raw text without any formatting."""
        print(text, file=sys.stdout)

    @property
    def rich_console(self) -> Console:
        """Get the underlying Rich console for direct access."""
        return self._console


# Global console instance
console = GroveFindConsole()


def print_header(title: str, emoji: str = "") -> None:
    """Print a major section header.

    Human mode: Rich panel with emoji
    Agent mode: === Title ===
    """
    try:
        config = get_config()
        is_agent = config.output_mode == OutputMode.AGENT
    except RuntimeError:
        import os

        is_agent = bool(os.environ.get("GF_AGENT"))

    if is_agent:
        print(f"=== {title} ===")
        print()
    else:
        display_title = f"{emoji} {title}" if emoji else title
        console.rich_console.print(
            Panel(
                Text(display_title, justify="center"),
                style="cyan",
                expand=True,
            )
        )
        console.print()


def print_section(title: str, emoji: str = "") -> None:
    """Print a subsection header.

    Human mode: Colored title with emoji
    Agent mode: --- Title ---
    """
    try:
        config = get_config()
        is_agent = config.output_mode == OutputMode.AGENT
    except RuntimeError:
        import os

        is_agent = bool(os.environ.get("GF_AGENT"))

    if is_agent:
        print(f"--- {title} ---")
    else:
        display_title = f"{emoji} {title}" if emoji else title
        console.print(f"[bold magenta]{display_title}[/bold magenta]")


def print_error(message: str) -> None:
    """Print an error message."""
    try:
        config = get_config()
        is_agent = config.output_mode == OutputMode.AGENT
    except RuntimeError:
        import os

        is_agent = bool(os.environ.get("GF_AGENT"))

    if is_agent:
        print(f"ERROR: {message}")
    else:
        console.print(f"[red]Error:[/red] {message}")


def print_warning(message: str) -> None:
    """Print a warning message."""
    try:
        config = get_config()
        is_agent = config.output_mode == OutputMode.AGENT
    except RuntimeError:
        import os

        is_agent = bool(os.environ.get("GF_AGENT"))

    if is_agent:
        print(f"WARNING: {message}")
    else:
        console.print(f"[yellow]Warning:[/yellow] {message}")


def print_success(message: str) -> None:
    """Print a success message."""
    try:
        config = get_config()
        is_agent = config.output_mode == OutputMode.AGENT
    except RuntimeError:
        import os

        is_agent = bool(os.environ.get("GF_AGENT"))

    if is_agent:
        print(f"OK: {message}")
    else:
        console.print(f"[green]OK:[/green] {message}")


def print_info(message: str) -> None:
    """Print an info message."""
    try:
        config = get_config()
        is_agent = config.output_mode == OutputMode.AGENT
    except RuntimeError:
        import os

        is_agent = bool(os.environ.get("GF_AGENT"))

    if is_agent:
        print(message)
    else:
        console.print(f"[blue]{message}[/blue]")


def create_table(
    title: str = "",
    columns: Optional[list[str]] = None,
    show_header: bool = True,
) -> Table:
    """Create a Rich table with Grove styling.

    In agent mode, tables are rendered as plain text.
    """
    table = Table(
        title=title if title else None,
        show_header=show_header,
        header_style="bold magenta",
        border_style="green",
    )
    if columns:
        for col in columns:
            table.add_column(col)
    return table
