"""glimpse install — first-time browser setup.

Wraps `playwright install chromium` with friendly messaging.
Checks for an existing compatible browser first to avoid unnecessary
downloads (important in sandboxed/offline environments).
"""

import subprocess
import sys

import click

from glimpse.utils.browser import find_chromium_executable


@click.command()
@click.option("--force", is_flag=True, default=False, help="Force reinstall even if browser exists")
@click.pass_context
def install(ctx: click.Context, force: bool) -> None:
    """Install Playwright's Chromium browser for captures."""
    output = ctx.obj["output"]

    # Check if a compatible browser already exists
    if not force:
        existing = find_chromium_executable()
        if existing:
            output.print_success(f"Chromium already available: {existing}")
            output.print_info("Use --force to reinstall.")
            return

    output.print_info("Installing Chromium for Glimpse captures...")
    output.print_info("This only needs to happen once.\n")

    try:
        result = subprocess.run(
            [sys.executable, "-m", "playwright", "install", "chromium"],
            capture_output=False,
            text=True,
        )

        if result.returncode == 0:
            output.print_success("Chromium installed! You're ready to capture.")
        else:
            # Download failed — check if we have a fallback
            fallback = find_chromium_executable()
            if fallback:
                output.print_info(
                    "Download failed, but a compatible Chromium was found "
                    f"at: {fallback}"
                )
                output.print_success("Glimpse can use the existing browser.")
            else:
                output.print_error(
                    "Browser installation failed. "
                    "Try running: playwright install chromium"
                )
                ctx.exit(1)

    except FileNotFoundError:
        output.print_error(
            "Playwright not found. Make sure glimpse is installed correctly."
        )
        ctx.exit(1)
