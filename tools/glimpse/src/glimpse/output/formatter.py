"""Mode-aware output formatting for Glimpse.

Three modes matching the gw/gf pattern:
  - human: Rich panels, colors, emoji, season flair
  - agent: Bare file path on stdout, diagnostics after, [FAIL] on failure
  - json:  Structured JSON dict on stdout
"""

import json
import re
import sys

from rich.console import Console
from rich.panel import Panel

from glimpse.capture.screenshot import CaptureResult


# Season emoji for human-mode flair
SEASON_EMOJI = {
    "spring": "\U0001f331",    # 🌱
    "summer": "\u2600\ufe0f",  # ☀️
    "autumn": "\U0001f342",    # 🍂
    "winter": "\u2744\ufe0f",  # ❄️
    "midnight": "\U0001f319",  # 🌙
}

THEME_EMOJI = {
    "light": "\u2600\ufe0f",  # ☀️
    "dark": "\U0001f319",      # 🌙
    "system": "\U0001f5a5\ufe0f",  # 🖥️
}


class GlimpseOutput:
    """Mode-aware output handler for Glimpse captures."""

    def __init__(self, mode: str = "human") -> None:
        """Initialize with output mode: 'human', 'agent', or 'json'."""
        self.mode = mode
        self._console = Console(stderr=True) if mode != "human" else Console()

    def print_capture(self, result: CaptureResult) -> None:
        """Print a capture result in the appropriate mode."""
        if self.mode == "json":
            self._print_json(result)
        elif self.mode == "agent":
            self._print_agent(result)
        else:
            self._print_human(result)

    def print_error(self, message: str) -> None:
        """Print an error message."""
        if self.mode == "json":
            json.dump({"error": message}, sys.stdout)
            sys.stdout.write("\n")
        elif self.mode == "agent":
            print(f"[FAIL] {message}", file=sys.stdout)
        else:
            self._console.print(f"[red]Error:[/red] {message}")

    def print_success(self, message: str) -> None:
        """Print a success message (human mode only, ignored in agent/json)."""
        if self.mode == "human":
            self._console.print(f"[green]\u2713[/green] {message}")

    def print_info(self, message: str) -> None:
        """Print an info message (human mode only, ignored in agent/json)."""
        if self.mode == "human":
            self._console.print(f"[dim]{message}[/dim]")

    def print_status(self, checks: dict) -> None:
        """Print a status readiness report.

        checks: dict with keys like 'browser', 'server', 'database', 'config',
        each with 'ok' (bool), 'detail' (str), and optional 'suggestions' (list).
        """
        if self.mode == "json":
            json.dump(checks, sys.stdout, indent=2)
            sys.stdout.write("\n")
            return

        if self.mode == "agent":
            ready = all(v.get("ok", False) for v in checks.values() if isinstance(v, dict))
            status = "READY" if ready else "NOT_READY"
            print(f"[STATUS] {status}", file=sys.stdout)
            for key, val in checks.items():
                if isinstance(val, dict):
                    mark = "OK" if val.get("ok") else "FAIL"
                    print(f"  {key}: [{mark}] {val.get('detail', '')}", file=sys.stdout)
            return

        # Human mode — Rich panel
        lines = []
        for key, val in checks.items():
            if isinstance(val, dict):
                if val.get("ok"):
                    lines.append(f"  [green]\u2713[/green] {key.title()}: {val.get('detail', '')}")
                else:
                    lines.append(f"  [red]\u2717[/red] {key.title()}: {val.get('detail', '')}")

        content = "\n".join(lines)
        self._console.print()
        self._console.print(Panel(content, title="Glimpse Status", style="blue", expand=False))

        # Suggestions
        suggestions = checks.get("suggestions", [])
        if suggestions:
            self._console.print()
            self._console.print(f"  Run: {' && '.join(suggestions)}")
        self._console.print()

    def print_browse(self, steps: list[dict], result: CaptureResult | None = None) -> None:
        """Print browse step results.

        steps: list of dicts with 'action', 'status', 'screenshot' (optional), 'error' (optional)
        result: final CaptureResult if a final screenshot was taken
        """
        if self.mode == "json":
            output = {"steps": steps}
            if result:
                output["final"] = result.to_dict()
            json.dump(output, sys.stdout, indent=2)
            sys.stdout.write("\n")
            return

        if self.mode == "agent":
            for i, step in enumerate(steps, 1):
                status = "OK" if step.get("status") == "success" else "FAIL"
                line = f"[{status}] Step {i}: {step.get('action', '?')}"
                if step.get("screenshot"):
                    line += f" -> {step['screenshot']}"
                print(line, file=sys.stdout)
            if result and result.success:
                print(str(result.output_path), file=sys.stdout)
                self._print_agent_console(result)
            elif result and result.error:
                print(f"[FAIL] {result.error}", file=sys.stdout)
            return

        # Human mode
        self._console.print()
        for i, step in enumerate(steps, 1):
            if step.get("status") == "success":
                self._console.print(f"  [green]\u2713[/green] Step {i}: {step.get('action', '?')}")
            else:
                self._console.print(f"  [red]\u2717[/red] Step {i}: {step.get('action', '?')}")
                if step.get("error"):
                    self._console.print(f"    [dim]{step['error']}[/dim]")
            if step.get("screenshot"):
                self._console.print(f"    [dim]\u2192 {step['screenshot']}[/dim]")
        if result:
            self._console.print()
            self.print_capture(result)

    def _print_human(self, result: CaptureResult) -> None:
        """Rich panel output with season flair."""
        if not result.success:
            self._console.print(f"[red]\u2717 Capture failed:[/red] {result.error}")
            if result.console_messages:
                self._print_human_console(result)
            return

        lines = []

        # Season + theme line
        if result.season:
            emoji = SEASON_EMOJI.get(result.season, "")
            lines.append(f"  Season:  {result.season} {emoji}")
        if result.theme:
            emoji = THEME_EMOJI.get(result.theme, "")
            lines.append(f"  Theme:   {result.theme} {emoji}")

        # Viewport
        w, h = result.viewport
        lines.append(f"  Size:    {w}\u00d7{h} @{result.scale}x")

        # File info
        size_str = _format_bytes(result.size_bytes)
        duration_str = f"{result.duration_ms}ms"
        lines.append("")
        lines.append(
            f"  [green]\u2713[/green] Captured \u2192 {result.output_path} "
            f"({size_str}, {duration_str})"
        )

        # Build the panel title from the URL
        title = f"Glimpse \u2014 {_display_url(result.url)}"

        content = "\n".join(lines)
        self._console.print()
        self._console.print(Panel(content, title=title, style="green", expand=False))

        # Console output section
        if result.console_messages:
            self._print_human_console(result)

        self._console.print()

    def _print_human_console(self, result: CaptureResult) -> None:
        """Print console messages in human mode."""
        errors = result.error_count
        warnings = result.warning_count
        counts = []
        if errors:
            counts.append(f"{errors} error{'s' if errors != 1 else ''}")
        if warnings:
            counts.append(f"{warnings} warning{'s' if warnings != 1 else ''}")
        header = f"Console ({', '.join(counts)}):" if counts else "Console:"

        self._console.print(f"\n  {header}")
        for msg in result.console_messages:
            if msg.level == "error":
                prefix = "[red]\u2717 [ERROR][/red]"
            elif msg.level == "warning":
                prefix = "[yellow]\u26a0 [WARN][/yellow]"
            else:
                continue  # Only show errors and warnings in human mode
            location = ""
            if msg.url:
                location = f" ({msg.url}"
                if msg.line:
                    location += f":{msg.line}"
                    if msg.col:
                        location += f":{msg.col}"
                location += ")"
            self._console.print(f"  {prefix} {msg.text}{location}")

    def _print_agent(self, result: CaptureResult) -> None:
        """Bare path on stdout for agent consumption. [FAIL] on failure."""
        if result.success:
            print(str(result.output_path), file=sys.stdout)
            self._print_agent_console(result)
        else:
            print(f"[FAIL] {result.error}", file=sys.stdout)

    def _print_agent_console(self, result: CaptureResult) -> None:
        """Print console messages in agent mode (after the screenshot path)."""
        for msg in result.console_messages:
            if msg.level == "error":
                location = ""
                if msg.url:
                    location = f" ({msg.url}"
                    if msg.line:
                        location += f":{msg.line}"
                        if msg.col:
                            location += f":{msg.col}"
                    location += ")"
                print(f"[ERROR] {msg.text}{location}", file=sys.stdout)
            elif msg.level == "warning":
                location = ""
                if msg.url:
                    location = f" ({msg.url}"
                    if msg.line:
                        location += f":{msg.line}"
                        if msg.col:
                            location += f":{msg.col}"
                    location += ")"
                print(f"[WARN] {msg.text}{location}", file=sys.stdout)

    def _print_json(self, result: CaptureResult) -> None:
        """Structured JSON on stdout."""
        json.dump(result.to_dict(), sys.stdout, indent=2)
        sys.stdout.write("\n")


def _format_bytes(size: int) -> str:
    """Format byte count as human-readable string."""
    if size < 1024:
        return f"{size} B"
    elif size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    else:
        return f"{size / (1024 * 1024):.1f} MB"


def _display_url(url: str) -> str:
    """Strip scheme from URL for display."""
    return re.sub(r"^https?://", "", url).rstrip("/")
