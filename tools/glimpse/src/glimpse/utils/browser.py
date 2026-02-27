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

    # Search patterns ordered by preference: full browser, then headless shell
    patterns = [
        "chromium-*/chrome-linux/chrome",
        "chromium-*/chrome-linux64/chrome",
        "chromium_headless_shell-*/chrome-linux/headless_shell",
        "chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell",
    ]

    for cache_dir in search_dirs:
        if not cache_dir.is_dir():
            continue
        # Look for chromium binaries, newest first per pattern
        for pattern in patterns:
            candidates = sorted(cache_dir.glob(pattern), reverse=True)
            for candidate in candidates:
                if candidate.is_file():
                    return str(candidate)

    return None
