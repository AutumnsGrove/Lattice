"""glimpse browse — interactive page verification with natural language."""

import asyncio
from pathlib import Path

import click
from playwright.async_api import async_playwright

from glimpse.browse.executor import BrowseExecutor
from glimpse.browse.interpreter import parse_instructions
from glimpse.browse.resolver import TargetResolver
from glimpse.capture.console import ConsoleCollector
from glimpse.capture.injector import build_init_script
from glimpse.capture.screenshot import CaptureRequest, CaptureResult
from glimpse.utils.validation import validate_url


@click.command()
@click.argument("url")
@click.option("--do", "-d", "instructions", required=True, help="Natural language instructions")
@click.option("--screenshot-each", is_flag=True, default=False, help="Screenshot after every step")
@click.option("--logs", "-l", is_flag=True, default=False, help="Capture console logs")
@click.option("--auto", is_flag=True, default=False, help="Auto-start dev server")
@click.option("--season", "-s", type=str, default=None, help="Season")
@click.option("--theme", "-t", type=str, default=None, help="Theme: light, dark, system")
@click.option("--output", "-o", type=str, default=None, help="Output directory for screenshots")
@click.option("--timeout", type=int, default=5000, help="Per-action timeout in ms")
@click.pass_context
def browse(
    ctx: click.Context,
    url: str,
    instructions: str,
    screenshot_each: bool,
    logs: bool,
    auto: bool,
    season: str | None,
    theme: str | None,
    output: str | None,
    timeout: int,
) -> None:
    """Browse a page interactively with natural language instructions.

    Examples:

        glimpse browse http://localhost:5173/arbor --do "click the Posts link"

        glimpse browse http://localhost:5173/arbor \\
            --do "click Posts, then click the first post title" --logs --auto
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

    # Parse instructions
    steps = parse_instructions(instructions)
    if not steps:
        output_handler.print_error("No valid instructions found")
        ctx.exit(1)
        return

    # Execute browsing
    output_dir = Path(output) if output else Path(config.output_dir)

    result = asyncio.run(
        _run_browse(
            url=url,
            steps=steps,
            config=config,
            season=season,
            theme=theme,
            logs=effective_logs,
            screenshot_each=screenshot_each,
            output_dir=output_dir,
            timeout_ms=timeout,
        )
    )

    step_results, final_result = result
    step_dicts = [r.to_dict() for r in step_results]

    output_handler.print_browse(step_dicts, final_result)

    if any(r.status == "error" for r in step_results):
        ctx.exit(1)


async def _run_browse(
    url: str,
    steps,
    config,
    season: str | None,
    theme: str | None,
    logs: bool,
    screenshot_each: bool,
    output_dir: Path,
    timeout_ms: int,
):
    """Async browse execution."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=config.headless)
        context = await browser.new_context(
            viewport={"width": config.viewport_width, "height": config.viewport_height},
            device_scale_factor=config.scale,
        )

        # Theme injection
        effective_season = season or config.season
        effective_theme = theme or config.theme
        init_js = build_init_script(
            season=effective_season,
            theme=effective_theme,
            grove_mode=config.grove_mode,
        )
        if init_js:
            await context.add_init_script(init_js)

        page = await context.new_page()

        # Console collector
        collector = None
        if logs:
            collector = ConsoleCollector()
            collector.attach(page)

        # Navigate to starting URL
        await page.goto(url, wait_until="domcontentloaded", timeout=config.timeout_ms)
        await page.wait_for_timeout(config.wait_ms)

        # Execute steps
        resolver = TargetResolver(page)
        executor = BrowseExecutor(
            page=page,
            resolver=resolver,
            collector=collector,
            screenshot_each=screenshot_each,
            output_dir=output_dir,
            timeout_ms=timeout_ms,
        )
        step_results = await executor.execute(steps)

        # Take final screenshot
        output_dir.mkdir(parents=True, exist_ok=True)
        final_path = output_dir / "browse-final.png"
        screenshot_bytes = await page.screenshot(type="png")
        final_path.write_bytes(screenshot_bytes)

        final_result = CaptureResult(
            output_path=final_path,
            url=url,
            season=effective_season,
            theme=effective_theme,
            viewport=(config.viewport_width, config.viewport_height),
            scale=config.scale,
            size_bytes=len(screenshot_bytes),
            console_messages=collector.messages if collector else [],
        )

        await context.close()
        await browser.close()

        return step_results, final_result
