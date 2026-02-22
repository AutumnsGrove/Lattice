"""Worker logs commands - stream and filter Cloudflare Worker logs."""

import json
import subprocess
from typing import Optional

import click

from ..config import GWConfig
from ..ui import console, error, info
from ..wrangler import Wrangler, WranglerError


@click.command()
@click.option("--worker", "-w", default="grove-lattice", help="Worker name (default: grove-lattice)")
@click.option("--format", "-f", "log_format", type=click.Choice(["json", "pretty"]), default="pretty", help="Output format")
@click.option("--status", "-s", type=click.Choice(["ok", "error", "canceled"]), help="Filter by status")
@click.option("--method", "-m", help="Filter by HTTP method (GET, POST, etc.)")
@click.option("--search", help="Filter by message content")
@click.option("--header", multiple=True, help="Filter by header (key:value)")
@click.option("--sampling-rate", type=float, help="Sampling rate (0.0 to 1.0)")
@click.option("--ip", help="Filter by client IP address")
@click.pass_context
def logs(
    ctx: click.Context,
    worker: str,
    log_format: str,
    status: Optional[str],
    method: Optional[str],
    search: Optional[str],
    header: tuple[str, ...],
    sampling_rate: Optional[float],
    ip: Optional[str],
) -> None:
    """Stream real-time Worker logs.

    Always safe - no --write flag required. Press Ctrl+C to stop.

    \b
    Examples:
        gw logs                          # Stream all logs
        gw logs --worker grove-lattice   # Specific worker
        gw logs --status error           # Only errors
        gw logs --method POST            # Only POST requests
        gw logs --search "tenant"        # Search in log content
        gw logs --format json            # JSON output
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)

    # Build wrangler tail command
    cmd = ["wrangler", "tail", worker]

    if log_format == "json" or output_json:
        cmd.append("--format=json")
    else:
        cmd.append("--format=pretty")

    if status:
        cmd.extend(["--status", status])

    if method:
        cmd.extend(["--method", method])

    if search:
        cmd.extend(["--search", search])

    for h in header:
        cmd.extend(["--header", h])

    if sampling_rate is not None:
        cmd.extend(["--sampling-rate", str(sampling_rate)])

    if ip:
        cmd.extend(["--ip-address", ip])

    try:
        if not output_json and log_format == "pretty":
            console.print(f"[dim]Streaming logs for {worker}... (Ctrl+C to stop)[/dim]\n")

        # Run interactively - this will stream until interrupted
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        try:
            # Stream output
            for line in iter(process.stdout.readline, ""):
                if line:
                    # For pretty format, colorize certain patterns
                    if log_format == "pretty" and not output_json:
                        line = _colorize_log_line(line)
                    console.print(line, end="")
        except KeyboardInterrupt:
            process.terminate()
            if not output_json:
                console.print("\n[dim]Log streaming stopped[/dim]")

    except FileNotFoundError:
        if output_json:
            console.print(json.dumps({"error": "wrangler not found"}))
        else:
            error("Wrangler not found - please install it first")
        raise SystemExit(1)
    except Exception as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to stream logs: {e}")
        raise SystemExit(1)


def _colorize_log_line(line: str) -> str:
    """Apply Rich markup to common log patterns."""
    # Color error lines red
    if "ERROR" in line.upper() or "error" in line.lower():
        return f"[red]{line}[/red]"
    # Color warnings yellow
    if "WARN" in line.upper() or "warning" in line.lower():
        return f"[yellow]{line}[/yellow]"
    # Color HTTP methods
    line = line.replace("GET ", "[cyan]GET[/cyan] ")
    line = line.replace("POST ", "[green]POST[/green] ")
    line = line.replace("PUT ", "[yellow]PUT[/yellow] ")
    line = line.replace("DELETE ", "[red]DELETE[/red] ")
    line = line.replace("PATCH ", "[magenta]PATCH[/magenta] ")
    # Color status codes
    if " 200 " in line or " 201 " in line:
        line = line.replace(" 200 ", " [green]200[/green] ")
        line = line.replace(" 201 ", " [green]201[/green] ")
    if " 400 " in line or " 401 " in line or " 403 " in line or " 404 " in line:
        line = line.replace(" 400 ", " [yellow]400[/yellow] ")
        line = line.replace(" 401 ", " [yellow]401[/yellow] ")
        line = line.replace(" 403 ", " [yellow]403[/yellow] ")
        line = line.replace(" 404 ", " [yellow]404[/yellow] ")
    if " 500 " in line or " 502 " in line or " 503 " in line:
        line = line.replace(" 500 ", " [red]500[/red] ")
        line = line.replace(" 502 ", " [red]502[/red] ")
        line = line.replace(" 503 ", " [red]503[/red] ")
    return line
