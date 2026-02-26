"""Browser discovery utilities for Glimpse."""

import os
from pathlib import Path


def find_chromium_executable() -> str | None:
    """Auto-detect an installed Chromium from the Playwright cache.

    Searches standard Playwright cache locations for any installed
    Chromium binary. Returns the most recent version found, or None
    to let Playwright use its default resolution.
    """
    # Check env var first, then standard cache locations
    search_dirs = []
    env_path = os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "")
    if env_path:
        search_dirs.append(Path(env_path))
    search_dirs.append(Path.home() / ".cache" / "ms-playwright")
    search_dirs.append(Path("/root/.cache/ms-playwright"))

    for cache_dir in search_dirs:
        if not cache_dir.is_dir():
            continue
        # Look for chromium-* directories (not headless_shell), newest first
        candidates = sorted(cache_dir.glob("chromium-*/chrome-linux/chrome"), reverse=True)
        for candidate in candidates:
            if candidate.is_file():
                return str(candidate)

    return None
