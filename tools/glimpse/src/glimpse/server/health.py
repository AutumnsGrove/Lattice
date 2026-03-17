"""HTTP health polling for dev server readiness.

Polls a URL until it returns a successful response or times out.
Uses httpx for async HTTP with configurable timeout.
"""

import asyncio
import time

import httpx


async def poll_until_ready(
    url: str,
    timeout_ms: int = 30000,
    interval_ms: int = 500,
) -> tuple[bool, str]:
    """Poll a URL until the server responds (any HTTP status) or timeout.

    Any HTTP response means the server is alive — even 404/500 pages are
    fully rendered by SvelteKit and useful for screenshot verification.

    Returns (True, "") on success or (False, error_message) on failure.
    """
    deadline = time.monotonic() + (timeout_ms / 1000)
    last_error = ""

    async with httpx.AsyncClient(timeout=5.0) as client:
        while time.monotonic() < deadline:
            try:
                resp = await client.get(url)
                # Any HTTP response means the server is alive and serving.
                # SvelteKit renders error pages (404, 500) as full HTML —
                # these are valid capture targets for visual verification.
                return True, ""
            except httpx.ConnectError:
                last_error = "connection refused"
            except httpx.TimeoutException:
                last_error = "request timeout"
            except Exception as e:
                last_error = str(e)

            await asyncio.sleep(interval_ms / 1000)

    return False, f"health check failed after {timeout_ms}ms: {last_error}"


def check_server_reachable(url: str, timeout_s: float = 3.0) -> bool:
    """Synchronous check if a URL is reachable. Returns True/False.

    Any HTTP response counts as reachable — the server is up even if it
    returns 404 or 500. Only connection failures mean "not reachable."
    """
    try:
        with httpx.Client(timeout=timeout_s) as client:
            resp = client.get(url)
            # Any response = server is alive
            return True
    except Exception:
        return False
