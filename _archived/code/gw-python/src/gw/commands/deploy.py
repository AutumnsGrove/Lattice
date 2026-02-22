"""Deploy commands - deploy Workers to Cloudflare."""

import json
import subprocess
from pathlib import Path
from typing import Optional

import click

from ..config import GWConfig
from ..ui import console, error, info, success, warning
from ..wrangler import Wrangler, WranglerError


@click.command()
@click.option("--write", is_flag=True, help="Confirm deployment")
@click.option("--env", "-e", help="Environment to deploy to (production, staging)")
@click.option("--dry-run", is_flag=True, help="Show what would be deployed without deploying")
@click.option("--minify/--no-minify", default=True, help="Minify output (default: yes)")
@click.option("--keep-vars", is_flag=True, help="Keep existing environment variables")
@click.argument("worker", default="grove-lattice")
@click.pass_context
def deploy(
    ctx: click.Context,
    write: bool,
    env: Optional[str],
    dry_run: bool,
    minify: bool,
    keep_vars: bool,
    worker: str,
) -> None:
    """Deploy a Worker to Cloudflare.

    Requires --write flag to perform actual deployment.

    \b
    Examples:
        gw deploy --dry-run              # Preview deployment
        gw deploy --write                # Deploy to production
        gw deploy --write --env staging  # Deploy to staging
        gw deploy --write grove-auth     # Deploy specific worker
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)

    # Dry run doesn't require --write
    if not dry_run and not write:
        if output_json:
            console.print(json.dumps({"error": "Deployment requires --write flag"}))
        else:
            error("Deployment requires --write flag")
            info("Add --write to confirm deployment, or --dry-run to preview")
        raise SystemExit(1)

    # Build wrangler deploy command
    cmd = ["wrangler", "deploy"]

    if env:
        cmd.extend(["--env", env])

    if dry_run:
        cmd.append("--dry-run")

    if not minify:
        cmd.append("--no-minify")

    if keep_vars:
        cmd.append("--keep-vars")

    # Output format
    if output_json:
        cmd.append("--json")

    try:
        if not output_json and not dry_run:
            console.print(f"[bold]Deploying {worker}...[/bold]\n")

        # Run deployment
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            if output_json:
                console.print(json.dumps({
                    "error": result.stderr or "Deployment failed",
                    "output": result.stdout,
                }))
            else:
                error("Deployment failed")
                if result.stderr:
                    console.print(f"[red]{result.stderr}[/red]")
                if result.stdout:
                    console.print(result.stdout)
            raise SystemExit(1)

        if output_json:
            # Try to parse wrangler's JSON output
            try:
                data = json.loads(result.stdout)
                console.print(json.dumps(data, indent=2))
            except json.JSONDecodeError:
                console.print(json.dumps({
                    "deployed": True,
                    "worker": worker,
                    "env": env,
                    "dry_run": dry_run,
                    "output": result.stdout,
                }))
        else:
            # Pretty print the output
            console.print(result.stdout)
            if dry_run:
                info("Dry run complete - no changes made")
            else:
                success(f"Deployed {worker}" + (f" to {env}" if env else ""))

    except FileNotFoundError:
        if output_json:
            console.print(json.dumps({"error": "wrangler not found"}))
        else:
            error("Wrangler not found - please install it first")
        raise SystemExit(1)
