"""glimpse capture — single screenshot command.

This is the core command. Takes a URL and produces a screenshot with
optional theme injection, element targeting, console log capture,
and viewport control.
"""

import click

from glimpse.capture.engine import run_capture
from glimpse.capture.screenshot import CaptureRequest
from glimpse.utils.naming import resolve_output_path
from glimpse.utils.validation import (
    validate_url,
    validate_viewport,
    validate_quality,
    validate_format,
    validate_season,
    validate_theme,
    validate_scale,
    validate_wait,
)


@click.command()
@click.argument("url")
@click.option(
    "--season", "-s",
    type=str,
    default=None,
    help="Season: spring, summer, autumn, winter, midnight",
)
@click.option(
    "--theme", "-t",
    type=str,
    default=None,
    help="Theme: light, dark, system",
)
@click.option(
    "--grove-mode", "-g",
    type=bool,
    default=None,
    help="Enable/disable grove terminology",
)
@click.option(
    "--selector", "-S",
    type=str,
    default=None,
    help="CSS selector to capture a specific element",
)
@click.option(
    "--output", "-o",
    type=str,
    default=None,
    help="Output file path (auto-generated if omitted)",
)
@click.option(
    "--width", "-w",
    type=int,
    default=None,
    help="Viewport width (default: 1920)",
)
@click.option(
    "--height",
    type=int,
    default=None,
    help="Viewport height (default: 1080)",
)
@click.option(
    "--scale",
    type=int,
    default=None,
    help="Device scale factor: 1 for 1x, 2 for retina (default: 2)",
)
@click.option(
    "--full-page", "-f",
    is_flag=True,
    default=False,
    help="Capture entire scrollable page",
)
@click.option(
    "--wait",
    type=int,
    default=None,
    help="Wait time in ms after theme injection (default: 500)",
)
@click.option(
    "--quality", "-q",
    type=int,
    default=None,
    help="JPEG quality 1-100 (default: 90, ignored for PNG)",
)
@click.option(
    "--format",
    "fmt",
    type=str,
    default=None,
    help="Output format: png, jpeg (default: png)",
)
@click.option(
    "--no-inject",
    is_flag=True,
    default=False,
    help="Skip theme injection (capture as-is)",
)
@click.option(
    "--logs", "-l",
    is_flag=True,
    default=False,
    help="Capture browser console output alongside screenshot",
)
@click.option(
    "--auto",
    is_flag=True,
    default=False,
    help="Auto-start dev server if target URL is unreachable",
)
@click.pass_context
def capture(
    ctx: click.Context,
    url: str,
    season: str | None,
    theme: str | None,
    grove_mode: bool | None,
    selector: str | None,
    output: str | None,
    width: int | None,
    height: int | None,
    scale: int | None,
    full_page: bool,
    wait: int | None,
    quality: int | None,
    fmt: str | None,
    no_inject: bool,
    logs: bool,
    auto: bool,
) -> None:
    """Capture a screenshot of a URL.

    Examples:

        glimpse capture https://grove.place

        glimpse capture https://grove.place --season autumn --theme dark --logs

        glimpse capture https://grove.place --selector ".hero-section" -o hero.png
    """
    config = ctx.obj["config"]
    output_handler = ctx.obj["output"]

    # Merge global flags from parent group
    effective_logs = logs or ctx.obj.get("global_logs", False) or config.logs
    effective_auto = auto or ctx.obj.get("global_auto", False)

    # Validate URL
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

    # Merge CLI flags with config defaults
    effective_season = season
    effective_theme = theme
    effective_width = width or config.viewport_width
    effective_height = height or config.viewport_height
    effective_scale = scale or config.scale
    effective_wait = wait if wait is not None else config.wait_ms
    effective_quality = quality or config.quality
    effective_fmt = fmt or config.format

    # Use config defaults for season/theme if not specified on CLI
    if effective_season is None and config.season:
        effective_season = config.season
    if effective_theme is None and config.theme:
        effective_theme = config.theme

    # Validate parameters
    try:
        validate_viewport(effective_width, effective_height)
        validate_quality(effective_quality)
        validate_scale(effective_scale)
        validate_wait(effective_wait)
        effective_fmt = validate_format(effective_fmt)
        if effective_season:
            effective_season = validate_season(effective_season)
        if effective_theme:
            effective_theme = validate_theme(effective_theme)
    except click.BadParameter as e:
        output_handler.print_error(str(e))
        ctx.exit(1)
        return

    # Resolve output path
    output_path = resolve_output_path(
        output=output,
        url=url,
        season=season,  # Only explicit CLI season in filename
        theme=theme,    # Only explicit CLI theme in filename
        selector=selector,
        fmt=effective_fmt,
        output_dir=config.output_dir,
    )

    # Build capture request
    request = CaptureRequest(
        url=url,
        season=effective_season,
        theme=effective_theme,
        grove_mode=grove_mode if grove_mode is not None else config.grove_mode,
        selector=selector,
        width=effective_width,
        height=effective_height,
        scale=effective_scale,
        full_page=full_page,
        wait_ms=effective_wait,
        output_path=output_path,
        format=effective_fmt,
        quality=effective_quality,
        no_inject=no_inject,
        timeout_ms=config.timeout_ms,
        logs=effective_logs,
    )

    # Execute capture
    result = run_capture(request, headless=config.headless)

    # Output result
    output_handler.print_capture(result)

    if not result.success:
        ctx.exit(1)
