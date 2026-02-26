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
    """Poll a URL until it responds with a 2xx status or timeout.

    Returns (True, "") on success or (False, error_message) on failure.
    """
    deadline = time.monotonic() + (timeout_ms / 1000)
    last_error = ""

    async with httpx.AsyncClient(timeout=5.0) as client:
        while time.monotonic() < deadline:
            try:
                resp = await client.get(url)
                if 200 <= resp.status_code < 400:
                    return True, ""
                last_error = f"HTTP {resp.status_code}"
            except httpx.ConnectError:
                last_error = "connection refused"
            except httpx.TimeoutException:
                last_error = "request timeout"
            except Exception as e:
                last_error = str(e)

            await asyncio.sleep(interval_ms / 1000)

    return False, f"health check failed after {timeout_ms}ms: {last_error}"


def check_server_reachable(url: str, timeout_s: float = 3.0) -> bool:
    """Synchronous check if a URL is reachable. Returns True/False."""
    try:
        with httpx.Client(timeout=timeout_s) as client:
            resp = client.get(url)
            return 200 <= resp.status_code < 400
    except Exception:
        return False
