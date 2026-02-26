"""Action executor for Glimpse browse — runs parsed actions on a Playwright page."""

import asyncio
from dataclasses import dataclass, field
from pathlib import Path

from playwright.async_api import Page

from glimpse.browse.interpreter import ActionStep
from glimpse.browse.resolver import TargetResolver
from glimpse.capture.console import ConsoleCollector
from glimpse.capture.screenshot import ConsoleMessage


@dataclass
class BrowseStepResult:
    """Result of executing a single browse action step."""

    action: str
    status: str  # "success" or "error"
    screenshot: str | None = None
    error: str | None = None

    def to_dict(self) -> dict:
        d: dict = {"action": self.action, "status": self.status}
        if self.screenshot:
            d["screenshot"] = self.screenshot
        if self.error:
            d["error"] = self.error
        return d


class BrowseExecutor:
    """Execute browse action steps on a Playwright page."""

    def __init__(
        self,
        page: Page,
        resolver: TargetResolver,
        collector: ConsoleCollector | None = None,
        screenshot_each: bool = False,
        output_dir: Path | None = None,
        timeout_ms: int = 5000,
    ) -> None:
        self._page = page
        self._resolver = resolver
        self._collector = collector
        self._screenshot_each = screenshot_each
        self._output_dir = output_dir or Path("screenshots")
        self._timeout_ms = timeout_ms

    async def execute(self, steps: list[ActionStep]) -> list[BrowseStepResult]:
        """Execute all action steps in sequence."""
        results = []

        for i, step in enumerate(steps, 1):
            result = await self._execute_step(step, i)
            results.append(result)

            if result.status == "error":
                break  # Stop on first error

        return results

    async def _execute_step(self, step: ActionStep, step_num: int) -> BrowseStepResult:
        """Execute a single action step."""
        try:
            if step.verb == "click":
                return await self._do_click(step, step_num)
            elif step.verb == "fill":
                return await self._do_fill(step, step_num)
            elif step.verb == "hover":
                return await self._do_hover(step, step_num)
            elif step.verb == "scroll":
                return await self._do_scroll(step, step_num)
            elif step.verb == "wait":
                return await self._do_wait(step, step_num)
            elif step.verb == "press":
                return await self._do_press(step, step_num)
            elif step.verb == "goto":
                return await self._do_goto(step, step_num)
            else:
                return BrowseStepResult(
                    action=step.raw,
                    status="error",
                    error=f"Unknown action: {step.raw}",
                )
        except Exception as e:
            return BrowseStepResult(
                action=step.raw or step.verb,
                status="error",
                error=str(e),
            )

    async def _do_click(self, step: ActionStep, step_num: int) -> BrowseStepResult:
        """Click on an element."""
        locator = await self._resolver.resolve(step.target)
        if not locator:
            return BrowseStepResult(
                action=f"click {step.target}",
                status="error",
                error=f"Element not found: {step.target}",
            )

        await locator.click(timeout=self._timeout_ms)
        await self._settle()
        screenshot = await self._maybe_screenshot(step_num)

        return BrowseStepResult(
            action=f"click {step.target}",
            status="success",
            screenshot=screenshot,
        )

    async def _do_fill(self, step: ActionStep, step_num: int) -> BrowseStepResult:
        """Fill an input element."""
        locator = await self._resolver.resolve(step.target)
        if not locator:
            return BrowseStepResult(
                action=f"fill {step.target}",
                status="error",
                error=f"Input not found: {step.target}",
            )

        await locator.fill(step.value, timeout=self._timeout_ms)
        await self._settle()
        screenshot = await self._maybe_screenshot(step_num)

        return BrowseStepResult(
            action=f"fill {step.target} with {step.value}",
            status="success",
            screenshot=screenshot,
        )

    async def _do_hover(self, step: ActionStep, step_num: int) -> BrowseStepResult:
        """Hover over an element."""
        locator = await self._resolver.resolve(step.target)
        if not locator:
            return BrowseStepResult(
                action=f"hover {step.target}",
                status="error",
                error=f"Element not found: {step.target}",
            )

        await locator.hover(timeout=self._timeout_ms)
        await self._settle()
        screenshot = await self._maybe_screenshot(step_num)

        return BrowseStepResult(
            action=f"hover {step.target}",
            status="success",
            screenshot=screenshot,
        )

    async def _do_scroll(self, step: ActionStep, step_num: int) -> BrowseStepResult:
        """Scroll the page."""
        parts = step.value.split(":")
        direction = parts[0] if parts else "down"
        try:
            amount = int(parts[1]) if len(parts) > 1 else 3
        except ValueError:
            amount = 3

        delta = amount * 300  # pixels per scroll unit
        if direction == "up":
            delta = -delta

        await self._page.mouse.wheel(0, delta)
        await self._settle()
        screenshot = await self._maybe_screenshot(step_num)

        return BrowseStepResult(
            action=f"scroll {direction}",
            status="success",
            screenshot=screenshot,
        )

    async def _do_wait(self, step: ActionStep, step_num: int) -> BrowseStepResult:
        """Wait for a specified duration."""
        try:
            seconds = int(step.value) if step.value else 1
        except ValueError:
            seconds = 1
        await self._page.wait_for_timeout(seconds * 1000)

        return BrowseStepResult(action=f"wait {seconds}s", status="success")

    async def _do_press(self, step: ActionStep, step_num: int) -> BrowseStepResult:
        """Press a keyboard key."""
        await self._page.keyboard.press(step.value)
        await self._settle()
        screenshot = await self._maybe_screenshot(step_num)

        return BrowseStepResult(
            action=f"press {step.value}",
            status="success",
            screenshot=screenshot,
        )

    async def _do_goto(self, step: ActionStep, step_num: int) -> BrowseStepResult:
        """Navigate to a URL or path."""
        target = step.value
        if target.startswith("/"):
            # Relative path — prepend current origin
            url = self._page.url
            from urllib.parse import urlparse
            parsed = urlparse(url)
            target = f"{parsed.scheme}://{parsed.netloc}{target}"

        await self._page.goto(target, wait_until="domcontentloaded")
        await self._settle()
        screenshot = await self._maybe_screenshot(step_num)

        return BrowseStepResult(
            action=f"goto {step.value}",
            status="success",
            screenshot=screenshot,
        )

    async def _settle(self) -> None:
        """Wait briefly for the page to settle after an action."""
        await self._page.wait_for_timeout(300)

    async def _maybe_screenshot(self, step_num: int) -> str | None:
        """Take a screenshot if --screenshot-each is enabled."""
        if not self._screenshot_each:
            return None

        self._output_dir.mkdir(parents=True, exist_ok=True)
        path = self._output_dir / f"browse-step-{step_num}.png"
        await self._page.screenshot(path=str(path), type="png")
        return str(path)
