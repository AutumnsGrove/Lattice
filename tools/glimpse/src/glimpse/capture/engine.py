"""Playwright-based capture engine for Glimpse.

Manages browser lifecycle and executes screenshot captures with
Grove theme injection via localStorage pre-seeding and optional
console log collection.

Includes CDN font interception: when running locally, external font
requests to cdn.grove.place are served from libs/engine/static/fonts/
so screenshots render correctly without internet access.
"""

import asyncio
import mimetypes
import time
from pathlib import Path

from playwright.async_api import async_playwright, Browser, BrowserContext, Route

from glimpse.capture.console import ConsoleCollector
from glimpse.capture.injector import build_init_script
from glimpse.capture.screenshot import A11ySummary, CaptureRequest, CaptureResult, ConsoleMessage
from glimpse.utils.browser import find_chromium_executable
from glimpse.seed.discovery import find_grove_root


# Backward-compat alias (was private, now public in utils.browser)
_find_chromium_executable = find_chromium_executable


class CaptureEngine:
    """Manages a Playwright browser instance for screenshot captures.

    Usage as a context manager:
        async with CaptureEngine() as engine:
            result = await engine.capture(request)

    Or manual lifecycle:
        engine = CaptureEngine()
        await engine.start()
        result = await engine.capture(request)
        await engine.stop()
    """

    def __init__(self, headless: bool = True) -> None:
        self._headless = headless
        self._playwright = None
        self._browser: Browser | None = None

    async def start(self) -> None:
        """Launch the Chromium browser."""
        self._playwright = await async_playwright().start()

        launch_opts: dict = {"headless": self._headless}

        # If Playwright can't find its expected browser, try an installed one
        executable = _find_chromium_executable()
        if executable:
            launch_opts["executable_path"] = executable

        self._browser = await self._playwright.chromium.launch(**launch_opts)

    async def stop(self) -> None:
        """Close browser and cleanup Playwright."""
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None

    async def __aenter__(self) -> "CaptureEngine":
        await self.start()
        return self

    async def __aexit__(self, *exc) -> None:
        await self.stop()

    async def capture(self, request: CaptureRequest) -> CaptureResult:
        """Execute a single screenshot capture.

        Steps:
        1. Create isolated browser context with viewport + scale
        2. Pre-seed localStorage if season/theme is set (avoids theme flash)
        3. Attach console collector if --logs requested
        4. Navigate to URL, wait for domcontentloaded
        5. Wait for render settle (configurable delay or networkidle)
        6. Capture screenshot (full page, selector, or viewport)
        7. Save to output path, record metadata + console messages
        """
        if not self._browser:
            return CaptureResult(
                url=request.url,
                error="Browser not started. Call start() or use as context manager.",
            )

        start_time = time.monotonic()
        context: BrowserContext | None = None

        try:
            # 1. Create browser context with viewport settings
            context = await self._browser.new_context(
                viewport={"width": request.width, "height": request.height},
                device_scale_factor=request.scale,
            )

            # 2. Pre-seed localStorage for theme injection (before navigation)
            if not request.no_inject:
                init_js = build_init_script(
                    season=request.season,
                    theme=request.theme,
                    grove_mode=request.grove_mode,
                )
                if init_js:
                    await context.add_init_script(init_js)

            page = await context.new_page()

            # 2b. Intercept CDN font requests → serve from local static/fonts/
            grove_root = find_grove_root()
            if grove_root:
                fonts_dir = grove_root / "libs" / "engine" / "static" / "fonts"
                if fonts_dir.exists():
                    async def _handle_font_route(route: Route) -> None:
                        url = route.request.url
                        # Extract filename from CDN URL
                        filename = url.rsplit("/", 1)[-1]
                        local_path = fonts_dir / filename
                        if local_path.exists():
                            content_type = mimetypes.guess_type(filename)[0] or "font/ttf"
                            await route.fulfill(
                                status=200,
                                content_type=content_type,
                                body=local_path.read_bytes(),
                            )
                        else:
                            await route.abort("blockedbyclient")

                    await page.route("**/cdn.grove.place/fonts/**", _handle_font_route)

            # 3. Attach console collector before navigation
            collector = None
            if request.logs:
                collector = ConsoleCollector()
                collector.attach(page)

            # 4. Navigate to URL and capture HTTP status
            http_status = 0
            try:
                response = await page.goto(
                    request.url,
                    wait_until="domcontentloaded",
                    timeout=request.timeout_ms,
                )
                if response:
                    http_status = response.status
            except Exception as e:
                return CaptureResult(
                    url=request.url,
                    error=f"Navigation failed: {e}",
                    console_messages=collector.messages if collector else [],
                )

            # 5. Wait for render settle
            if request.wait_for:
                # Wait for specific CSS selector to appear
                try:
                    await page.wait_for_selector(
                        request.wait_for,
                        timeout=request.timeout_ms,
                    )
                except Exception:
                    # Surface the timeout as a warning so callers know the
                    # selector never appeared. Inject into console messages
                    # so it flows through human/agent/JSON output naturally.
                    if collector is None:
                        collector = ConsoleCollector()
                    collector._messages.append(ConsoleMessage(
                        level="warning",
                        text=(
                            f"--wait-for selector '{request.wait_for}' timed out; "
                            f"captured page in current state"
                        ),
                    ))
            elif request.wait_strategy == "networkidle":
                try:
                    await page.wait_for_load_state("networkidle", timeout=request.timeout_ms)
                except Exception:
                    pass  # Best-effort; proceed with capture
            elif request.wait_ms > 0:
                await page.wait_for_timeout(request.wait_ms)

            # 5b. Collect page metadata (title + a11y snapshot)
            page_title = await page.title() or ""
            a11y = await self._collect_a11y(page)

            # 6. Capture screenshot
            screenshot_opts: dict = {
                "type": request.format,
            }

            if request.format == "jpeg":
                screenshot_opts["quality"] = request.quality

            output_path = request.output_path or Path("screenshot.png")

            # Screenshot timeout: use the request timeout so it doesn't
            # hang on unreachable font CDNs or slow resource loads.
            screenshot_opts["timeout"] = request.timeout_ms

            if request.selector:
                # Element capture
                try:
                    locator = page.locator(request.selector)
                    await locator.wait_for(timeout=5000)
                    screenshot_bytes = await locator.screenshot(**screenshot_opts)
                except Exception as e:
                    return CaptureResult(
                        url=request.url,
                        season=request.season,
                        theme=request.theme,
                        viewport=(request.width, request.height),
                        scale=request.scale,
                        error=f"Selector '{request.selector}' not found: {e}",
                        console_messages=collector.messages if collector else [],
                    )
            elif request.full_page:
                screenshot_bytes = await page.screenshot(
                    full_page=True,
                    **screenshot_opts,
                )
            else:
                screenshot_bytes = await page.screenshot(**screenshot_opts)

            # 7. Save to file
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(screenshot_bytes)

            duration_ms = int((time.monotonic() - start_time) * 1000)

            return CaptureResult(
                output_path=output_path,
                url=request.url,
                season=request.season,
                theme=request.theme,
                viewport=(request.width, request.height),
                scale=request.scale,
                size_bytes=len(screenshot_bytes),
                duration_ms=duration_ms,
                http_status=http_status,
                page_title=page_title,
                a11y=a11y,
                console_messages=collector.messages if collector else [],
            )

        except Exception as e:
            return CaptureResult(
                url=request.url,
                season=request.season,
                theme=request.theme,
                viewport=(request.width, request.height),
                scale=request.scale,
                error=f"Capture failed: {e}",
            )

        finally:
            if context:
                await context.close()

    async def _collect_a11y(self, page) -> A11ySummary:
        """Collect a brief accessibility snapshot from the page.

        Uses JavaScript evaluation rather than Playwright's a11y tree API
        for speed — we only need counts and heading text, not the full tree.
        """
        try:
            data = await page.evaluate("""() => {
                const headings = [];
                document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
                    const text = h.textContent?.trim().substring(0, 80) || '';
                    if (text) headings.push(h.tagName.toLowerCase() + ': ' + text);
                });
                const landmarks = [];
                const roles = ['banner', 'navigation', 'main', 'complementary',
                               'contentinfo', 'search', 'form', 'region'];
                roles.forEach(role => {
                    if (document.querySelector(`[role="${role}"]`))
                        landmarks.push(role);
                });
                // Also check semantic HTML elements
                if (!landmarks.includes('banner') && document.querySelector('header'))
                    landmarks.push('banner');
                if (!landmarks.includes('navigation') && document.querySelector('nav'))
                    landmarks.push('navigation');
                if (!landmarks.includes('main') && document.querySelector('main'))
                    landmarks.push('main');
                if (!landmarks.includes('contentinfo') && document.querySelector('footer'))
                    landmarks.push('contentinfo');

                const images = document.querySelectorAll('img');
                let missingAlt = 0;
                images.forEach(img => {
                    if (!img.alt && !img.getAttribute('aria-label')
                        && !img.getAttribute('aria-labelledby')
                        && img.getAttribute('role') !== 'presentation') {
                        missingAlt++;
                    }
                });

                return {
                    title: document.title || '',
                    headings: headings.slice(0, 20),
                    landmarks: [...new Set(landmarks)],
                    linkCount: document.querySelectorAll('a[href]').length,
                    imageCount: images.length,
                    imagesMissingAlt: missingAlt,
                };
            }""")
            return A11ySummary(
                page_title=data.get("title", ""),
                heading_count=len(data.get("headings", [])),
                headings=data.get("headings", []),
                landmark_count=len(data.get("landmarks", [])),
                landmarks=data.get("landmarks", []),
                link_count=data.get("linkCount", 0),
                image_count=data.get("imageCount", 0),
                images_missing_alt=data.get("imagesMissingAlt", 0),
            )
        except Exception:
            return A11ySummary()

    async def capture_many(
        self,
        requests: list[CaptureRequest],
        concurrency: int = 4,
    ) -> list[CaptureResult]:
        """Execute multiple captures in parallel with bounded concurrency.

        Uses asyncio.Semaphore to limit parallel browser contexts.
        Returns results in the same order as the input requests.
        """
        semaphore = asyncio.Semaphore(concurrency)

        async def _bounded_capture(req: CaptureRequest) -> CaptureResult:
            async with semaphore:
                return await self.capture(req)

        return await asyncio.gather(
            *[_bounded_capture(req) for req in requests]
        )


def run_capture(request: CaptureRequest, headless: bool = True) -> CaptureResult:
    """Synchronous bridge to the async capture engine.

    Spins up a new event loop, launches a browser, captures one screenshot,
    and tears everything down. Designed for the Click command layer.
    """

    async def _run() -> CaptureResult:
        async with CaptureEngine(headless=headless) as engine:
            return await engine.capture(request)

    return asyncio.run(_run())


def run_capture_many(
    requests: list[CaptureRequest],
    headless: bool = True,
    concurrency: int = 4,
) -> list[CaptureResult]:
    """Synchronous bridge for parallel captures.

    Spins up one browser, captures all screenshots in parallel, and
    tears everything down. Designed for matrix and batch commands.
    """

    async def _run() -> list[CaptureResult]:
        async with CaptureEngine(headless=headless) as engine:
            return await engine.capture_many(requests, concurrency=concurrency)

    return asyncio.run(_run())
