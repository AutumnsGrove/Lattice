"""glimpse matrix — generate all season x theme screenshot combinations."""

import click

from glimpse.capture.engine import run_capture_many
from glimpse.capture.screenshot import CaptureRequest
from glimpse.utils.naming import resolve_output_path
from glimpse.utils.validation import validate_url


SEASONS = ["spring", "summer", "autumn", "winter", "midnight"]
THEMES = ["light", "dark"]


@click.command()
@click.argument("url")
@click.option(
    "--seasons",
    type=str,
    default=None,
    help="Comma-separated seasons (default: all five)",
)
@click.option(
    "--themes",
    type=str,
    default=None,
    help="Comma-separated themes (default: light,dark)",
)
@click.option(
    "--concurrency",
    type=int,
    default=4,
    help="Maximum parallel captures (default: 4)",
)
@click.option("--logs", "-l", is_flag=True, default=False, help="Capture console logs")
@click.option("--output", "-o", type=str, default=None, help="Output directory")
@click.option("--selector", "-S", type=str, default=None, help="CSS selector")
@click.option("--full-page", "-f", is_flag=True, default=False, help="Full page capture")
@click.pass_context
def matrix(
    ctx: click.Context,
    url: str,
    seasons: str | None,
    themes: str | None,
    concurrency: int,
    logs: bool,
    output: str | None,
    selector: str | None,
    full_page: bool,
) -> None:
    """Generate all season x theme screenshot combinations.

    Examples:

        glimpse matrix https://grove.place

        glimpse matrix http://localhost:5173/?subdomain=autumn --seasons autumn,winter --logs
    """
    config = ctx.obj["config"]
    output_handler = ctx.obj["output"]

    try:
        url = validate_url(url)
    except click.BadParameter as e:
        output_handler.print_error(str(e))
        ctx.exit(1)
        return

    effective_logs = logs or ctx.obj.get("global_logs", False) or config.logs
    season_list = seasons.split(",") if seasons else SEASONS
    theme_list = themes.split(",") if themes else THEMES
    output_dir = output or config.output_dir

    # Build capture requests for all combinations
    requests = []
    for season in season_list:
        for theme in theme_list:
            output_path = resolve_output_path(
                output=None,
                url=url,
                season=season.strip(),
                theme=theme.strip(),
                selector=selector,
                fmt=config.format,
                output_dir=output_dir,
            )
            requests.append(
                CaptureRequest(
                    url=url,
                    season=season.strip(),
                    theme=theme.strip(),
                    selector=selector,
                    width=config.viewport_width,
                    height=config.viewport_height,
                    scale=config.scale,
                    full_page=full_page,
                    wait_ms=config.wait_ms,
                    output_path=output_path,
                    format=config.format,
                    quality=config.quality,
                    timeout_ms=config.timeout_ms,
                    logs=effective_logs,
                )
            )

    output_handler.print_info(
        f"Capturing {len(requests)} combinations ({len(season_list)} seasons x {len(theme_list)} themes)..."
    )

    # Execute all captures in parallel
    results = run_capture_many(
        requests,
        headless=config.headless,
        concurrency=concurrency,
    )

    # Output results
    failures = 0
    for result in results:
        output_handler.print_capture(result)
        if not result.success:
            failures += 1

    if failures:
        output_handler.print_error(f"{failures}/{len(results)} captures failed")
        ctx.exit(1)
    else:
        output_handler.print_success(f"All {len(results)} captures complete")
