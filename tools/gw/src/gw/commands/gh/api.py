"""API and rate limit commands for GitHub integration."""

import json
from typing import Optional

import click
from rich.console import Console
from rich.table import Table

from ...gh_wrapper import GitHub, GitHubError
from ...safety.github import (
    GitHubSafetyError,
    GitHubSafetyTier,
    check_github_safety,
    get_api_tier_from_method,
)

console = Console()


@click.command("rate-limit")
@click.pass_context
def rate_limit(ctx: click.Context) -> None:
    """Show GitHub API rate limit status.

    Always safe - no --write flag required.

    \b
    Examples:
        gw gh rate-limit
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        gh = GitHub()
        limits = gh.get_rate_limit(force_refresh=True)

        if output_json:
            data = {
                resource: {
                    "limit": limit.limit,
                    "used": limit.used,
                    "remaining": limit.remaining,
                    "reset": limit.reset.isoformat(),
                    "is_low": limit.is_low,
                }
                for resource, limit in limits.items()
            }
            console.print(json.dumps(data, indent=2))
            return

        table = Table(title="GitHub API Rate Limits", border_style="green")
        table.add_column("Resource")
        table.add_column("Used", justify="right")
        table.add_column("Remaining", justify="right")
        table.add_column("Limit", justify="right")
        table.add_column("Resets")

        for resource, limit in sorted(limits.items()):
            # Color code remaining based on threshold
            if limit.is_exhausted:
                remaining_style = "red"
            elif limit.is_low:
                remaining_style = "yellow"
            else:
                remaining_style = "green"

            table.add_row(
                resource.title(),
                str(limit.used),
                f"[{remaining_style}]{limit.remaining}[/{remaining_style}]",
                str(limit.limit),
                limit.reset.strftime("%H:%M:%S"),
            )

        console.print(table)

        # Show warning if any are low
        low_limits = [r for r, l in limits.items() if l.is_low and not l.is_exhausted]
        exhausted = [r for r, l in limits.items() if l.is_exhausted]

        if exhausted:
            console.print(f"\n[red]Exhausted:[/red] {', '.join(exhausted)}")
        if low_limits:
            console.print(f"\n[yellow]Running low:[/yellow] {', '.join(low_limits)}")

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@click.command()
@click.option("--write", is_flag=True, help="Confirm write operation (for POST/PATCH/DELETE)")
@click.option("--force", is_flag=True, help="Confirm destructive operation (for DELETE)")
@click.argument("endpoint")
@click.option("--method", "-X", default="GET", help="HTTP method")
@click.option("-f", "fields", multiple=True, help="Form fields (key=value)")
@click.option("--jq", help="jq filter for output")
@click.pass_context
def api(
    ctx: click.Context,
    write: bool,
    force: bool,
    endpoint: str,
    method: str,
    fields: tuple[str, ...],
    jq: Optional[str],
) -> None:
    """Make raw GitHub API requests.

    GET requests are always safe. POST/PATCH require --write.
    DELETE requires --write --force.

    \b
    Examples:
        gw gh api repos/AutumnsGrove/GroveEngine
        gw gh api user
        gw gh api --write repos/{owner}/{repo}/labels -X POST -f name="bug" -f color="d73a4a"
        gw gh api --write --force repos/{owner}/{repo}/labels/old-label -X DELETE
    """
    output_json = ctx.obj.get("output_json", False)

    # Check safety based on method
    tier = get_api_tier_from_method(method)

    if tier == GitHubSafetyTier.WRITE:
        operation = f"api_{method.lower()}"
        try:
            check_github_safety(operation, write_flag=write)
        except GitHubSafetyError as e:
            console.print(f"[red]Safety check failed:[/red] {e.message}")
            console.print(f"[dim]Add --write for {method} requests[/dim]")
            raise SystemExit(1)

    elif tier == GitHubSafetyTier.DESTRUCTIVE:
        if not write:
            console.print(f"[red]DELETE requires --write flag[/red]")
            raise SystemExit(1)
        if not force:
            console.print(f"[red]DELETE requires --force flag[/red]")
            console.print("[dim]This is a destructive operation[/dim]")
            raise SystemExit(1)

    try:
        gh = GitHub()

        # Parse fields into dict
        fields_dict = {}
        for field in fields:
            if "=" in field:
                key, value = field.split("=", 1)
                fields_dict[key] = value

        result = gh.api(
            endpoint=endpoint,
            method=method.upper(),
            fields=fields_dict if fields_dict else None,
        )

        # Apply jq filter if provided (simplified - just access keys)
        if jq and isinstance(result, dict):
            # Simple key access like ".data" or ".items[]"
            parts = jq.strip(".").split(".")
            for part in parts:
                if part.endswith("[]"):
                    key = part[:-2]
                    result = result.get(key, [])
                else:
                    result = result.get(part, result)

        if isinstance(result, (dict, list)):
            console.print(json.dumps(result, indent=2))
        else:
            console.print(result)

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)
