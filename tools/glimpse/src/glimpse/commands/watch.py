"""glimpse watch — keep browser warm for rapid re-captures.

Instead of cold-starting a browser for every capture (launch → navigate →
screenshot → close), watch keeps a persistent browser and re-captures on
demand via a trigger file or interval.

Designed for the agent iterate loop: edit code → trigger → see result → repeat.
Each capture takes ~200ms with a warm browser vs ~1s cold.
"""

import asyncio
import signal
import sys
import time
from pathlib import Path

import click

from glimpse.capture.engine import CaptureEngine
from glimpse.capture.screenshot import CaptureRequest
from glimpse.utils.naming import resolve_output_path
from glimpse.utils.validation import (
    validate_url,
    validate_season,
    validate_theme,
)


@click.command()
@click.argument("url")
@click.option("--season", "-s", type=str, default=None, help="Season")
@click.option("--theme", "-t", type=str, default=None, help="Theme: light, dark, system")
@click.option("--logs", "-l", is_flag=True, default=False, help="Capture console logs")
@click.option("--auto", is_flag=True, default=False, help="Auto-start dev server")
@click.option("--output", "-o", type=str, default=None, help="Output file path")
@click.option(
    "--interval", "-i",
    type=float,
    default=0,
    help="Auto-recapture every N seconds (0 = trigger-only mode)",
)
@click.option(
    "--trigger",
    type=str,
    default=".glimpse/trigger",
    help="Trigger file path — touch this file to trigger a recapture",
)
@click.option("--once", is_flag=True, default=False, help="Capture once with warm browser then exit")
@click.pass_context
def watch(
    ctx: click.Context,
    url: str,
    season: str | None,
    theme: str | None,
    logs: bool,
    auto: bool,
    output: str | None,
    interval: float,
    trigger: str,
    once: bool,
) -> None:
    """Keep browser warm for rapid re-captures.

    Three modes:

    \b
      # Trigger mode (default): touch .glimpse/trigger to re-capture
      glimpse watch http://localhost:5173/?subdomain=midnight-bloom --auto
      # Then from another terminal or agent:
      touch .glimpse/trigger

    \b
      # Interval mode: auto-recapture every 5 seconds
      glimpse watch http://localhost:5173/ --interval 5 --auto

    \b
      # One-shot warm: single capture with warm browser, then exit
      glimpse watch http://localhost:5173/ --once --auto

    The warm browser cuts capture time from ~1s to ~200ms.
    """
    config = ctx.obj["config"]
    output_handler = ctx.obj["output"]

    effective_logs = logs or ctx.obj.get("global_logs", False) or config.logs
    effective_auto = auto or ctx.obj.get("global_auto", False)

    try:
        url = validate_url(url)
    except click.BadParameter as e:
        output_handler.print_error(str(e))
        ctx.exit(1)
        return

    # Auto-start server if requested
    if effective_auto:
        from glimpse.server.manager import ServerManager

        mgr = ServerManager(config)
        ok, err = mgr.ensure_server(url)
        if not ok:
            output_handler.print_error(f"Server not reachable: {err}")
            ctx.exit(1)
            return

    # Validate season/theme
    effective_season = season or config.season
    effective_theme = theme or config.theme
    try:
        if effective_season:
            effective_season = validate_season(effective_season)
        if effective_theme:
            effective_theme = validate_theme(effective_theme)
    except click.BadParameter as e:
        output_handler.print_error(str(e))
        ctx.exit(1)
        return

    asyncio.run(
        _run_watch(
            url=url,
            season=effective_season,
            theme=effective_theme,
            logs=effective_logs,
            output=output,
            config=config,
            output_handler=output_handler,
            interval=interval,
            trigger_path=trigger,
            once=once,
        )
    )


async def _run_watch(
    url: str,
    season: str | None,
    theme: str | None,
    logs: bool,
    output: str | None,
    config,
    output_handler,
    interval: float,
    trigger_path: str,
    once: bool,
) -> None:
    """Main watch loop with warm browser."""
    engine = CaptureEngine(headless=config.headless)
    await engine.start()

    # Set up trigger file
    trigger = Path(trigger_path)
    trigger.parent.mkdir(parents=True, exist_ok=True)
    # Clear any stale trigger
    trigger.unlink(missing_ok=True)

    # Handle graceful shutdown
    shutdown = asyncio.Event()
    loop = asyncio.get_event_loop()

    def _signal_handler():
        shutdown.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _signal_handler)

    capture_count = 0

    try:
        if not once and not config.agent_mode:
            if interval > 0:
                print(f"Watching {url} (every {interval}s, Ctrl+C to stop)", file=sys.stderr)
            else:
                print(f"Watching {url} (touch {trigger_path} to capture, Ctrl+C to stop)", file=sys.stderr)

        while not shutdown.is_set():
            # Build a fresh request each time (output path may vary)
            output_path = resolve_output_path(
                output=output,
                url=url,
                season=season,
                theme=theme,
                selector=None,
                fmt=config.format,
                output_dir=config.output_dir,
            )

            request = CaptureRequest(
                url=url,
                season=season,
                theme=theme,
                width=config.viewport_width,
                height=config.viewport_height,
                scale=config.scale,
                wait_ms=config.wait_ms,
                output_path=output_path,
                format=config.format,
                quality=config.quality,
                timeout_ms=config.timeout_ms,
                logs=logs,
            )

            result = await engine.capture(request)
            capture_count += 1
            output_handler.print_capture(result)

            if once:
                break

            # Wait for next trigger
            if interval > 0:
                # Interval mode: sleep then re-capture
                try:
                    await asyncio.wait_for(shutdown.wait(), timeout=interval)
                    break  # shutdown was set
                except asyncio.TimeoutError:
                    continue  # interval elapsed, re-capture
            else:
                # Trigger mode: poll for trigger file
                while not shutdown.is_set():
                    if trigger.exists():
                        trigger.unlink(missing_ok=True)
                        break  # Trigger detected, re-capture
                    try:
                        await asyncio.wait_for(shutdown.wait(), timeout=0.2)
                        break  # shutdown was set
                    except asyncio.TimeoutError:
                        continue
                if shutdown.is_set():
                    break

    finally:
        await engine.stop()
        if not once and not config.agent_mode:
            print(f"\nStopped after {capture_count} capture(s)", file=sys.stderr)
