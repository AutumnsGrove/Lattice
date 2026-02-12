"""Enhanced help display with categorized commands and beautiful formatting."""

from typing import Dict, List, Tuple

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from .ui import create_panel

console = Console()

# Grove-themed color palette (nature-inspired colors supported by Rich)
GROVE_COLORS = {
    "forest_green": "green",           # Forest green for growth
    "bark_brown": "bright_black",      # Dark earth tone
    "sky_blue": "blue",                # Clear sky
    "sunset_orange": "orange3",       # Warm sunset
    "leaf_yellow": "yellow",           # Leaf color
    "river_cyan": "cyan",             # River water
    "moss": "green3",                 # Moss green
    "blossom_pink": "magenta",        # Cherry blossom
}


# Command categories with Grove-themed colors and descriptions
CATEGORIES: Dict[str, Tuple[str, str, List[Tuple[str, str]]]] = {
    "cloudflare": (
        "☁️  Cloudflare",
        GROVE_COLORS["sky_blue"],
        [
            ("d1", "D1 database operations"),
            ("kv", "KV namespace operations"),
            ("r2", "R2 object storage"),
            ("logs", "Stream Worker logs"),
            ("deploy", "Deploy to Cloudflare"),
            ("do", "Durable Objects"),
            ("cache", "Cache management"),
            ("backup", "D1 database backups"),
            ("export", "Zip data exports"),
            ("email", "Email routing"),
            ("social", "Social cross-posting"),
        ],
    ),
    "developer": (
        "🌱 Developer Tools",
        GROVE_COLORS["forest_green"],
        [
            ("dev", "Development server"),
            ("test", "Run tests"),
            ("build", "Build packages"),
            ("check", "Type checking"),
            ("lint", "Lint code"),
            ("ci", "Full CI pipeline"),
            ("packages", "Monorepo packages"),
            ("publish", "Publish packages"),
        ],
    ),
    "git": (
        "🌿 Version Control",
        GROVE_COLORS["leaf_yellow"],
        [
            ("git", "Git operations"),
        ],
    ),
    "github": (
        "🐙 GitHub",
        GROVE_COLORS["blossom_pink"],
        [
            ("gh", "GitHub operations"),
        ],
    ),
    "auth_secrets": (
        "🔐 Auth & Secrets",
        GROVE_COLORS["sunset_orange"],
        [
            ("auth", "Authentication management"),
            ("secret", "Encrypted secrets vault"),
        ],
    ),
    "agent": (
        "🤖 Agent Tools",
        GROVE_COLORS["moss"],
        [
            ("context", "Work session snapshot (start here)"),
        ],
    ),
    "system": (
        "📊 System & Info",
        GROVE_COLORS["river_cyan"],
        [
            ("status", "Show configuration"),
            ("health", "Health check"),
            ("bindings", "Cloudflare bindings"),
            ("doctor", "Diagnostics"),
            ("whoami", "Current context"),
            ("history", "Command history"),
            ("completion", "Shell completions"),
            ("mcp", "MCP server"),
            ("metrics", "Usage metrics"),
        ],
    ),
    "tenant": (
        "🏠 Tenants",
        GROVE_COLORS["bark_brown"],
        [
            ("tenant", "Tenant management"),
        ],
    ),
    "features": (
        "🚩 Feature Flags",
        GROVE_COLORS["moss"],
        [
            ("flag", "Feature flags"),
        ],
    ),
}


def show_categorized_help(version: str = "0.1.0") -> None:
    """Display help with categorized commands in colored boxes.

    Args:
        version: Version string to display
    """
    # Header with Grove branding
    header = Text()
    header.append("╭──────────────────────────────────────────────────────────────╮\n", "dim")
    header.append("│              🌿  G R O V E   W R A P  🌿                     │\n", f"bold {GROVE_COLORS['forest_green']}")
    header.append("│                                                              │\n", "dim")
    header.append("│      One CLI to tend them all — Wrangler, git, and gh        │\n", GROVE_COLORS["sky_blue"])
    header.append("│      wrapped with agent-safe defaults and beautiful output   │\n", GROVE_COLORS["sky_blue"])
    header.append("╰──────────────────────────────────────────────────────────────╯", "dim")
    header.append(f"\n                          [dim]v{version}[/dim]")

    console.print(header)
    console.print()

    # Quick Start section
    quick_start = Text()
    quick_start.append("New to Grove Wrap? Try these commands:\n", "bold")
    quick_start.append("  ", "dim")
    quick_start.append("gw status", f"bold {GROVE_COLORS['river_cyan']}")
    quick_start.append("      Check your setup\n", "dim")
    quick_start.append("  ", "dim")
    quick_start.append("gw health", f"bold {GROVE_COLORS['river_cyan']}")
    quick_start.append("      Run health checks\n", "dim")
    quick_start.append("  ", "dim")
    quick_start.append("gw doctor", f"bold {GROVE_COLORS['river_cyan']}")
    quick_start.append("      Diagnose issues\n", "dim")

    quick_start_panel = Panel(
        quick_start,
        title=f"[bold {GROVE_COLORS['forest_green']}]🌱 Quick Start[/bold {GROVE_COLORS['forest_green']}]",
        border_style=GROVE_COLORS["forest_green"],
        padding=(0, 1),
    )
    console.print(quick_start_panel)
    console.print()

    # Display each category as a colored panel
    for category_key, (title, color, commands) in CATEGORIES.items():
        # Create table for this category
        table = Table(show_header=False, box=None, padding=(0, 1))
        table.add_column("Command", style=f"bold {color}", width=12)
        table.add_column("Description", style="dim")

        for cmd_name, cmd_desc in commands:
            table.add_row(f"  {cmd_name}", cmd_desc)

        # Wrap in a panel with colored border
        panel = Panel(
            table,
            title=f"[bold {color}]{title}[/bold {color}]",
            border_style=color,
            padding=(0, 1),
        )
        console.print(panel)
        console.print()

    # Usage hints
    usage = Text()
    usage.append("💡 ", GROVE_COLORS["leaf_yellow"])
    usage.append("Tips:\n", "bold")
    usage.append("  • Use ", "dim")
    usage.append("--verbose", GROVE_COLORS["leaf_yellow"])
    usage.append(" for debug output\n", "dim")
    usage.append("  • Use ", "dim")
    usage.append("--json", GROVE_COLORS["leaf_yellow"])
    usage.append(" for machine-readable output\n", "dim")
    usage.append("  • Run ", "dim")
    usage.append("gw doctor", f"bold {GROVE_COLORS['river_cyan']}")
    usage.append(" if something's wrong\n", "dim")
    usage.append("  • Most write operations need ", "dim")
    usage.append("--write", f"bold {GROVE_COLORS['sunset_orange']}")
    usage.append(" flag for safety\n", "dim")

    usage_panel = Panel(
        usage,
        title=f"[bold {GROVE_COLORS['leaf_yellow']}]💡 Quick Tips[/bold {GROVE_COLORS['leaf_yellow']}]",
        border_style=GROVE_COLORS["leaf_yellow"],
        padding=(0, 1),
    )
    console.print(usage_panel)
    console.print()

    # Footer
    footer = Text()
    footer.append("For more help on a specific command: ", "dim")
    footer.append("gw <command> --help", f"bold {GROVE_COLORS['sky_blue']}")
    console.print(footer)
    console.print()