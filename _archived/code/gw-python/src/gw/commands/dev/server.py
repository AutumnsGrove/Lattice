"""Development server commands."""

import json
import os
import signal
import subprocess
import sys
from pathlib import Path
from typing import Optional

import click

from ...packages import (
    Package,
    PackageType,
    detect_current_package,
    load_monorepo,
)
from ...ui import console, create_table, error, info, success, warning


# Track running dev servers (PID file location)
DEV_PIDS_DIR = Path.home() / ".grove" / "dev-pids"


@click.command("start")
@click.option("--package", "-p", help="Package name (default: auto-detect)")
@click.option("--port", type=int, help="Port to run on (if supported)")
@click.option("--host", default="localhost", help="Host to bind to")
@click.option("--background", "-b", is_flag=True, help="Run in background")
@click.pass_context
def dev_start(
    ctx: click.Context,
    package: Optional[str],
    port: Optional[int],
    host: str,
    background: bool,
) -> None:
    """Start a development server.

    Auto-detects the current package or specify with --package.

    \b
    Examples:
        gw dev start                    # Start current package
        gw dev start --package engine   # Start specific package
        gw dev start --port 3001        # Custom port
        gw dev start -b                 # Run in background
    """
    output_json = ctx.obj.get("output_json", False)

    # Find the package
    pkg = _resolve_package(package)
    if not pkg:
        if output_json:
            console.print(json.dumps({"error": "No package found"}))
        else:
            error("No package found. Run from a package directory or use --package")
        raise SystemExit(1)

    # Check if dev script exists
    if not pkg.has_script.get("dev"):
        if output_json:
            console.print(json.dumps({"error": f"Package '{pkg.name}' has no dev script"}))
        else:
            error(f"Package '{pkg.name}' has no dev script")
        raise SystemExit(1)

    # Build command
    if pkg.package_type == PackageType.PYTHON:
        cmd = ["uv", "run", "dev"]
    else:
        cmd = ["pnpm", "run", "dev"]

    # Add port if specified (for vite-based projects)
    env = os.environ.copy()
    if port:
        env["PORT"] = str(port)
        # Vite uses --port
        if pkg.package_type in (PackageType.SVELTEKIT, PackageType.LIBRARY):
            cmd.extend(["--", "--port", str(port)])

    if host != "localhost":
        env["HOST"] = host
        if pkg.package_type in (PackageType.SVELTEKIT, PackageType.LIBRARY):
            cmd.extend(["--host", host])

    if background:
        _start_background(pkg, cmd, env, output_json)
    else:
        _start_foreground(pkg, cmd, env, output_json)


def _start_foreground(pkg: Package, cmd: list[str], env: dict, output_json: bool) -> None:
    """Start dev server in foreground."""
    if not output_json:
        console.print(f"[dim]Starting {pkg.name}...[/dim]")
        console.print(f"[dim]Command: {' '.join(cmd)}[/dim]\n")

    try:
        process = subprocess.Popen(
            cmd,
            cwd=pkg.path,
            env=env,
        )
        process.wait()
    except KeyboardInterrupt:
        if not output_json:
            console.print("\n[dim]Shutting down...[/dim]")
        process.terminate()
        process.wait()


def _start_background(pkg: Package, cmd: list[str], env: dict, output_json: bool) -> None:
    """Start dev server in background."""
    DEV_PIDS_DIR.mkdir(parents=True, exist_ok=True)
    pid_file = DEV_PIDS_DIR / f"{pkg.name}.pid"

    # Check if already running
    if pid_file.exists():
        try:
            pid = int(pid_file.read_text().strip())
            os.kill(pid, 0)  # Check if process exists
            if output_json:
                console.print(json.dumps({"error": f"Already running (PID {pid})"}))
            else:
                warning(f"{pkg.name} is already running (PID {pid})")
                info("Stop it first with: gw dev stop")
            raise SystemExit(1)
        except (ProcessLookupError, ValueError):
            pid_file.unlink()  # Clean up stale PID file

    # Start process
    log_file = DEV_PIDS_DIR / f"{pkg.name}.log"
    with open(log_file, "w") as log:
        process = subprocess.Popen(
            cmd,
            cwd=pkg.path,
            env=env,
            stdout=log,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )

    # Save PID
    pid_file.write_text(str(process.pid))

    if output_json:
        console.print(json.dumps({
            "package": pkg.name,
            "pid": process.pid,
            "log": str(log_file),
            "started": True,
        }))
    else:
        success(f"Started {pkg.name} in background (PID {process.pid})")
        console.print(f"[dim]Logs: {log_file}[/dim]")
        console.print(f"[dim]Stop with: gw dev stop --package {pkg.name}[/dim]")


@click.command("stop")
@click.option("--package", "-p", help="Package name (default: auto-detect)")
@click.option("--all", "stop_all", is_flag=True, help="Stop all dev servers")
@click.pass_context
def dev_stop(ctx: click.Context, package: Optional[str], stop_all: bool) -> None:
    """Stop a development server.

    \b
    Examples:
        gw dev stop                    # Stop current package
        gw dev stop --package engine   # Stop specific package
        gw dev stop --all              # Stop all dev servers
    """
    output_json = ctx.obj.get("output_json", False)

    if stop_all:
        _stop_all(output_json)
        return

    # Find the package
    pkg = _resolve_package(package)
    if not pkg:
        if output_json:
            console.print(json.dumps({"error": "No package found"}))
        else:
            error("No package found. Run from a package directory or use --package")
        raise SystemExit(1)

    pid_file = DEV_PIDS_DIR / f"{pkg.name}.pid"
    if not pid_file.exists():
        if output_json:
            console.print(json.dumps({"error": f"{pkg.name} is not running"}))
        else:
            warning(f"{pkg.name} is not running in background")
        return

    try:
        pid = int(pid_file.read_text().strip())
        os.killpg(os.getpgid(pid), signal.SIGTERM)
        pid_file.unlink()

        if output_json:
            console.print(json.dumps({"package": pkg.name, "stopped": True}))
        else:
            success(f"Stopped {pkg.name}")
    except (ProcessLookupError, ValueError) as e:
        pid_file.unlink()
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            warning(f"Process not found, cleaned up PID file")


def _stop_all(output_json: bool) -> None:
    """Stop all running dev servers."""
    if not DEV_PIDS_DIR.exists():
        if output_json:
            console.print(json.dumps({"stopped": []}))
        else:
            info("No dev servers running")
        return

    stopped = []
    for pid_file in DEV_PIDS_DIR.glob("*.pid"):
        name = pid_file.stem
        try:
            pid = int(pid_file.read_text().strip())
            os.killpg(os.getpgid(pid), signal.SIGTERM)
            stopped.append(name)
        except (ProcessLookupError, ValueError):
            pass
        pid_file.unlink()

    if output_json:
        console.print(json.dumps({"stopped": stopped}))
    else:
        if stopped:
            success(f"Stopped: {', '.join(stopped)}")
        else:
            info("No dev servers were running")


@click.command("restart")
@click.option("--package", "-p", help="Package name (default: auto-detect)")
@click.pass_context
def dev_restart(ctx: click.Context, package: Optional[str]) -> None:
    """Restart a development server.

    \b
    Examples:
        gw dev restart
        gw dev restart --package engine
    """
    # Stop then start
    ctx.invoke(dev_stop, package=package)
    ctx.invoke(dev_start, package=package, background=True)


@click.command("logs")
@click.option("--package", "-p", help="Package name (default: auto-detect)")
@click.option("--follow", "-f", is_flag=True, help="Follow log output")
@click.option("--lines", "-n", default=50, help="Number of lines to show")
@click.pass_context
def dev_logs(
    ctx: click.Context,
    package: Optional[str],
    follow: bool,
    lines: int,
) -> None:
    """Show development server logs.

    \b
    Examples:
        gw dev logs
        gw dev logs -f                 # Follow logs
        gw dev logs -n 100             # Last 100 lines
    """
    output_json = ctx.obj.get("output_json", False)

    pkg = _resolve_package(package)
    if not pkg:
        if output_json:
            console.print(json.dumps({"error": "No package found"}))
        else:
            error("No package found")
        raise SystemExit(1)

    log_file = DEV_PIDS_DIR / f"{pkg.name}.log"
    if not log_file.exists():
        if output_json:
            console.print(json.dumps({"error": f"No logs for {pkg.name}"}))
        else:
            warning(f"No logs found for {pkg.name}")
            info("Is it running in background? Use: gw dev start -b")
        return

    if follow:
        # Use tail -f
        subprocess.run(["tail", "-f", str(log_file)])
    else:
        # Read last N lines
        subprocess.run(["tail", "-n", str(lines), str(log_file)])


def _resolve_package(name: Optional[str]) -> Optional[Package]:
    """Resolve package by name or auto-detect."""
    if name:
        monorepo = load_monorepo()
        if monorepo:
            return monorepo.find_package(name)
        return None

    return detect_current_package()
