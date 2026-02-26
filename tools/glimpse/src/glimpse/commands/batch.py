"""glimpse batch — run captures from a YAML config file."""

from pathlib import Path

import click
import yaml

from glimpse.capture.engine import run_capture_many
from glimpse.capture.screenshot import CaptureRequest
from glimpse.utils.naming import resolve_output_path
from glimpse.utils.validation import validate_url


@click.command()
@click.argument("config_file", type=click.Path(exists=True))
@click.option("--dry-run", is_flag=True, default=False, help="Show what would be captured")
@click.pass_context
def batch(ctx: click.Context, config_file: str, dry_run: bool) -> None:
    """Run captures from a YAML configuration file.

    Examples:

        glimpse batch screenshots.yaml

        glimpse batch screenshots.yaml --dry-run
    """
    app_config = ctx.obj["config"]
    output_handler = ctx.obj["output"]

    # Parse YAML config
    try:
        with open(config_file) as f:
            batch_config = yaml.safe_load(f)
    except (yaml.YAMLError, OSError) as e:
        output_handler.print_error(f"Failed to parse {config_file}: {e}")
        ctx.exit(1)
        return

    if not batch_config or "captures" not in batch_config:
        output_handler.print_error(f"No 'captures' section found in {config_file}")
        ctx.exit(1)
        return

    defaults = batch_config.get("defaults", {})
    captures = batch_config["captures"]

    # Build capture requests
    requests = []
    for entry in captures:
        url = entry.get("url", defaults.get("url"))
        if not url:
            output_handler.print_error("Capture entry missing 'url'")
            continue

        try:
            url = validate_url(url)
        except click.BadParameter as e:
            output_handler.print_error(f"Invalid URL '{url}': {e}")
            continue

        # Merge entry with defaults
        name = entry.get("name", "")
        season = entry.get("season", defaults.get("season"))
        theme = entry.get("theme", defaults.get("theme"))
        viewport = entry.get("viewport", defaults.get("viewport", {}))
        width = viewport.get("width", defaults.get("viewport", {}).get("width", app_config.viewport_width))
        height = viewport.get("height", defaults.get("viewport", {}).get("height", app_config.viewport_height))
        scale = entry.get("scale", defaults.get("scale", app_config.scale))
        wait = entry.get("wait", defaults.get("wait", app_config.wait_ms))
        fmt = entry.get("format", defaults.get("format", app_config.format))
        quality = entry.get("quality", defaults.get("quality", app_config.quality))
        logs = entry.get("logs", defaults.get("logs", False))
        output_dir = entry.get("output_dir", defaults.get("output_dir", app_config.output_dir))

        # Handle matrix entries (all season x theme combos)
        if entry.get("matrix"):
            from glimpse.commands.matrix import SEASONS, THEMES
            for s in SEASONS:
                for t in THEMES:
                    output_path = resolve_output_path(
                        output=None, url=url, season=s, theme=t,
                        fmt=fmt, output_dir=output_dir,
                    )
                    if name:
                        output_path = output_path.parent / f"{name}-{s}-{t}.{fmt}"
                    requests.append(CaptureRequest(
                        url=url, season=s, theme=t, width=width, height=height,
                        scale=scale, wait_ms=wait, output_path=output_path,
                        format=fmt, quality=quality, timeout_ms=app_config.timeout_ms,
                        logs=logs,
                    ))
        else:
            output_path = resolve_output_path(
                output=None, url=url, season=season, theme=theme,
                fmt=fmt, output_dir=output_dir,
            )
            if name:
                suffix = f".{fmt}"
                parts = [name]
                if season:
                    parts.append(season)
                if theme:
                    parts.append(theme)
                output_path = output_path.parent / f"{'-'.join(parts)}{suffix}"

            requests.append(CaptureRequest(
                url=url, season=season, theme=theme, width=width, height=height,
                scale=scale, wait_ms=wait, output_path=output_path, format=fmt,
                quality=quality, timeout_ms=app_config.timeout_ms, logs=logs,
            ))

    if not requests:
        output_handler.print_error("No valid captures found in config")
        ctx.exit(1)
        return

    if dry_run:
        for req in requests:
            output_handler.print_info(
                f"Would capture: {req.url} -> {req.output_path} "
                f"(season={req.season}, theme={req.theme})"
            )
        output_handler.print_success(f"{len(requests)} captures planned")
        return

    output_handler.print_info(f"Running {len(requests)} captures...")

    concurrency = max(1, min(int(defaults.get("concurrency", 4)), 20))
    results = run_capture_many(requests, headless=app_config.headless, concurrency=concurrency)

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
