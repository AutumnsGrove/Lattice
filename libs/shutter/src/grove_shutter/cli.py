"""
Command-line interface for Shutter.
"""

import asyncio
import json
import os
import sys
from dataclasses import asdict
from typing import Optional

import typer

from grove_shutter.config import setup_config
from grove_shutter.core import shutter
from grove_shutter.database import clear_offenders, list_offenders


def _serialize_response(obj):
    """Custom serializer for JSON output."""
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def run_extraction(
    url: str,
    query: str,
    model: str = "fast",
    max_tokens: int = 500,
    extended_query: Optional[str] = None,
    dry_run: bool = False,
    timeout: int = 30000,
):
    """Run the extraction and print results."""
    # Set dry-run mode via environment variable
    if dry_run:
        os.environ["SHUTTER_DRY_RUN"] = "1"

    # Run the async shutter function
    result = asyncio.run(
        shutter(
            url=url,
            query=query,
            model=model,
            max_tokens=max_tokens,
            extended_query=extended_query,
            timeout=timeout,
        )
    )

    # Convert to dict and output as JSON
    result_dict = asdict(result)
    print(json.dumps(result_dict, indent=2, default=_serialize_response))


def main():
    """Main CLI entry point with manual argument parsing for flexibility."""
    args = sys.argv[1:]

    # Handle subcommands
    if len(args) >= 1:
        if args[0] == "setup":
            setup_config()
            return

        if args[0] == "offenders":
            offenders = list_offenders()
            if not offenders:
                print("No domains in offenders list.")
                return

            print(f"{'Domain':<40} {'Count':<8} {'Types'}")
            print("-" * 70)
            for offender in offenders:
                types_str = ", ".join(offender.injection_types)
                print(f"{offender.domain:<40} {offender.detection_count:<8} {types_str}")
            print("-" * 70)
            print(f"Total: {len(offenders)} domain(s)")
            return

        if args[0] == "clear-offenders":
            clear_offenders()
            print("Offenders list cleared.")
            return

        if args[0] in ("--help", "-h"):
            print_help()
            return

    # Parse main extraction command
    url = None
    query = None
    model = "fast"
    max_tokens = 500
    extended_query = None
    dry_run = False
    timeout = 30000

    i = 0
    while i < len(args):
        arg = args[i]

        if arg in ("--query", "-q") and i + 1 < len(args):
            query = args[i + 1]
            i += 2
        elif arg in ("--model", "-m") and i + 1 < len(args):
            model = args[i + 1]
            i += 2
        elif arg in ("--max-tokens", "-t") and i + 1 < len(args):
            max_tokens = int(args[i + 1])
            i += 2
        elif arg in ("--extended", "-e") and i + 1 < len(args):
            extended_query = args[i + 1]
            i += 2
        elif arg == "--dry-run":
            dry_run = True
            i += 1
        elif arg == "--timeout" and i + 1 < len(args):
            timeout = int(args[i + 1])
            i += 2
        elif arg in ("--help", "-h"):
            print_help()
            return
        elif not arg.startswith("-") and url is None:
            url = arg
            i += 1
        else:
            print(f"Unknown option: {arg}")
            print_help()
            sys.exit(1)

    # Validate required arguments
    if url is None:
        print("Error: URL argument is required.")
        print()
        print_help()
        sys.exit(1)

    if query is None:
        print("Error: --query option is required.")
        print()
        print_help()
        sys.exit(1)

    # Run extraction
    run_extraction(
        url=url,
        query=query,
        model=model,
        max_tokens=max_tokens,
        extended_query=extended_query,
        dry_run=dry_run,
        timeout=timeout,
    )


def print_help():
    """Print help message."""
    print("""Shutter - Web Content Distillation Service
Open. Capture. Close.

Usage:
  shutter URL --query QUERY [OPTIONS]
  shutter setup          Interactive configuration setup
  shutter offenders      Show domains in offenders list
  shutter clear-offenders    Clear offenders list

Options:
  -q, --query TEXT       What to extract from the page (required)
  -m, --model TEXT       Model tier: fast, accurate, research, code [default: fast]
  -t, --max-tokens INT   Maximum output tokens [default: 500]
  -e, --extended TEXT    Additional extraction instructions
  --dry-run              Use mock responses (no API calls)
  --timeout INT          Fetch timeout in milliseconds [default: 30000]
  -h, --help             Show this message

Examples:
  shutter "https://example.com" --query "What is this page about?"
  shutter "https://example.com/pricing" -q "Extract pricing tiers" -m accurate
  shutter "https://example.com" -q "Extract features" --dry-run
""")


# Keep Typer app for compatibility but use main() as entry point
app = typer.Typer()


@app.callback(invoke_without_command=True)
def typer_main(ctx: typer.Context):
    """Shutter - Web Content Distillation Service."""
    if ctx.invoked_subcommand is None:
        # Fallback to manual parsing
        main()


if __name__ == "__main__":
    main()
