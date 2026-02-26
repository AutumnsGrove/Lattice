"""glimpse detect — AI-powered element detection via Lumen Gateway."""

import asyncio

import click
from playwright.async_api import async_playwright

from glimpse.capture.injector import build_init_script
from glimpse.utils.browser import find_chromium_executable
from glimpse.detection.a11y import find_in_a11y_tree
from glimpse.detection.heuristics import find_by_heuristic
from glimpse.detection.vision import LumenClient
from glimpse.utils.validation import validate_url


@click.command()
@click.argument("url")
@click.argument("description")
@click.option("--overlay", is_flag=True, default=False, help="Draw bounding box on image")
@click.option("--coords-only", is_flag=True, default=False, help="Just return coordinates")
@click.option("--season", "-s", type=str, default=None, help="Season")
@click.option("--theme", "-t", type=str, default=None, help="Theme")
@click.option("--output", "-o", type=str, default=None, help="Output file path")
@click.pass_context
def detect(
    ctx: click.Context,
    url: str,
    description: str,
    overlay: bool,
    coords_only: bool,
    season: str | None,
    theme: str | None,
    output: str | None,
) -> None:
    """Detect an element on a page using AI-powered vision.

    Requires LUMEN_API_KEY environment variable.

    Examples:

        glimpse detect https://grove.place "the hero section with the forest"

        glimpse detect https://grove.place "navigation bar" --overlay -o nav-detect.png
    """
    config = ctx.obj["config"]
    output_handler = ctx.obj["output"]

    try:
        url = validate_url(url)
    except click.BadParameter as e:
        output_handler.print_error(str(e))
        ctx.exit(1)
        return

    lumen = LumenClient(
        gateway_url=config.lumen_gateway_url,
        model=config.lumen_model,
    )

    if not lumen.configured:
        output_handler.print_error(
            "LUMEN_API_KEY not set. Smart detection requires Lumen Gateway access."
        )
        ctx.exit(2)
        return

    result = asyncio.run(
        _run_detect(
            url=url,
            description=description,
            config=config,
            lumen=lumen,
            season=season,
            theme=theme,
            overlay=overlay,
            coords_only=coords_only,
            output=output,
        )
    )

    if result.get("error"):
        output_handler.print_error(result["error"])
        ctx.exit(1)
    elif coords_only:
        import json, sys
        json.dump(result.get("boxes", []), sys.stdout, indent=2)
        sys.stdout.write("\n")
    else:
        output_handler.print_success(
            f"Detected {len(result.get('boxes', []))} element(s)"
        )
        if result.get("output"):
            output_handler.print_info(f"Saved to: {result['output']}")


async def _run_detect(url, description, config, lumen, season, theme, overlay, coords_only, output):
    """Async detection execution."""
    async with async_playwright() as p:
        launch_opts = {"headless": config.headless}
        executable = find_chromium_executable()
        if executable:
            launch_opts["executable_path"] = executable
        browser = await p.chromium.launch(**launch_opts)
        context = await browser.new_context(
            viewport={"width": config.viewport_width, "height": config.viewport_height},
            device_scale_factor=config.scale,
        )

        try:
            # Theme injection
            init_js = build_init_script(
                season=season or config.season,
                theme=theme or config.theme,
            )
            if init_js:
                await context.add_init_script(init_js)

            page = await context.new_page()
            await page.goto(url, wait_until="domcontentloaded", timeout=config.timeout_ms)
            await page.wait_for_timeout(config.wait_ms)

            # Take screenshot for detection
            screenshot_bytes = await page.screenshot(type="png")

            # Try a11y tree first
            a11y_result = await find_in_a11y_tree(page, description)
            if a11y_result:
                return {
                    "boxes": [{"label": description, "source": "a11y", "name": a11y_result.get("name")}],
                }

            # Try heuristics
            heuristic_locator = await find_by_heuristic(page, description)
            if heuristic_locator:
                box = await heuristic_locator.bounding_box()
                if box:
                    return {
                        "boxes": [{
                            "label": description,
                            "source": "heuristics",
                            "x": box["x"] / config.viewport_width,
                            "y": box["y"] / config.viewport_height,
                            "width": box["width"] / config.viewport_width,
                            "height": box["height"] / config.viewport_height,
                        }],
                    }

            # Fall back to Lumen
            a11y_snapshot = None
            try:
                a11y_snapshot = await page.accessibility.snapshot()
            except Exception:
                pass

            boxes = await lumen.detect(screenshot_bytes, description, a11y_snapshot)

            if not boxes:
                return {"error": f"Could not detect '{description}' on page"}

            result = {"boxes": [{"label": b.label, "confidence": b.confidence,
                        "x": b.x, "y": b.y, "width": b.width, "height": b.height}
                       for b in boxes]}

            if overlay and output:
                # Draw bounding boxes on the image (requires PIL, degrade gracefully)
                try:
                    from PIL import Image, ImageDraw
                    import io

                    img = Image.open(io.BytesIO(screenshot_bytes))
                    draw = ImageDraw.Draw(img)
                    for b in boxes:
                        px = b.to_pixels(img.width, img.height)
                        draw.rectangle(
                            [px["x"], px["y"], px["x"] + px["width"], px["y"] + px["height"]],
                            outline="red",
                            width=3,
                        )
                    img.save(output)
                    result["output"] = output
                except ImportError:
                    pass  # PIL not available, skip overlay

            return result
        finally:
            await context.close()
            await browser.close()
