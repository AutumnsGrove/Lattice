"""CI job commands for Queen Firefly."""

# NOTE - NONE OF THIS WORKS YET

import json
from typing import Optional

import click
import requests
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.live import Live

from ...config import GWConfig
from ...ui import is_interactive

console = Console()

# Queen API endpoint (configured in ~/.grove/gw.toml)
DEFAULT_QUEEN_URL = "https://queen.grove.place"


def get_queen_url(config: GWConfig) -> str:
    """Get Queen coordinator URL from config."""
    return getattr(config, 'queen_url', DEFAULT_QUEEN_URL)


@click.group()
def ci() -> None:
    """CI job operations via the Queen.

    List, view, run, and manage CI jobs. The Queen receives webhooks
    from Codeberg automatically, but you can also trigger jobs manually.

    \b
    Examples:
        gw queen ci list                    # List all jobs
        gw queen ci list --status pending   # List pending jobs
        gw queen ci view 127               # View job #127
        gw queen ci run --latest           # Run CI on latest commit
        gw queen ci run --commit abc123    # Run CI on specific commit
        gw queen ci rerun 127              # Re-run a job
        gw queen ci cancel 127             # Cancel a running job
        gw queen ci logs 127 --follow      # Stream logs for job
    """
    pass


@ci.command("list")
@click.option("--status", type=click.Choice(['pending', 'running', 'success', 'failure', 'all']), default='all')
@click.option("--limit", default=20, help="Maximum jobs to show")
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
@click.pass_context
def ci_list(ctx, status: str, limit: int, output_json: bool):
    """List CI jobs."""
    config = ctx.obj['config']
    queen_url = get_queen_url(config)
    
    try:
        response = requests.get(f"{queen_url}/api/jobs", params={
            'status': status if status != 'all' else None,
            'limit': limit
        })
        response.raise_for_status()
        data = response.json()
        
        if output_json:
            click.echo(json.dumps(data, indent=2))
            return
        
        if not data['jobs']:
            console.print("[dim]No jobs found.[/dim]")
            return
        
        table = Table(title=f"CI Jobs ({status})")
        table.add_column("ID", style="cyan", no_wrap=True)
        table.add_column("Commit", style="dim", no_wrap=True)
        table.add_column("Branch", style="magenta")
        table.add_column("Status", style="green")
        table.add_column("Runner", style="blue")
        table.add_column("Duration", justify="right")
        table.add_column("Message", max_width=40)
        
        for job in data['jobs']:
            status_style = {
                'pending': 'dim',
                'claimed': 'yellow',
                'running': 'blue',
                'success': 'green',
                'failure': 'red',
                'cancelled': 'dim'
            }.get(job['status'], 'white')
            
            duration = "-"
            if job.get('startedAt') and job.get('completedAt'):
                # Calculate duration
                duration = "~2m"  # Simplified
            elif job.get('startedAt'):
                duration = "running..."
            
            table.add_row(
                str(job['id'][:8]),
                job['commit'][:7],
                job['branch'],
                f"[{status_style}]{job['status']}[/{status_style}]",
                job.get('runnerId', '-')[:8] if job.get('runnerId') else '-',
                duration,
                job['message'][:40]
            )
        
        console.print(table)
        
    except requests.RequestException as e:
        console.print(f"[red]Failed to connect to Queen: {e}[/red]")
        raise click.Exit(1)


@ci.command("view")
@click.argument("job_id")
@click.option("--json", "output_json", is_flag=True)
@click.pass_context
def ci_view(ctx, job_id: str, output_json: bool):
    """View details of a specific CI job."""
    config = ctx.obj['config']
    queen_url = get_queen_url(config)
    
    try:
        response = requests.get(f"{queen_url}/api/jobs/{job_id}")
        response.raise_for_status()
        data = response.json()
        
        if output_json:
            click.echo(json.dumps(data, indent=2))
            return
        
        job = data['job']
        
        # Build info panel
        info = f"""
[bold]Job {job['id']}[/bold]

Commit: [cyan]{job['commit']}[/cyan]
Branch: [magenta]{job['branch']}[/magenta]
Author: {job['author']}
Status: [bold]{job['status']}[/bold]
Runner: {job.get('runnerId', 'Not assigned')}

Created: {job['createdAt']}
Started: {job.get('startedAt', 'Not started')}
Completed: {job.get('completedAt', 'Not completed')}

Message:
{job['message']}
        """.strip()
        
        console.print(Panel(info, title="Job Details", border_style="blue"))
        
        # Show recent logs
        if data.get('logs'):
            console.print("\n[bold]Recent Logs:[/bold]")
            for line in data['logs'][-20:]:
                console.print(line)
        
    except requests.RequestException as e:
        console.print(f"[red]Failed to fetch job: {e}[/red]")
        raise click.Exit(1)


@ci.command("run")
@click.option("--latest", is_flag=True, help="Run CI on latest commit")
@click.option("--commit", help="Run CI on specific commit SHA")
@click.option("--branch", default="main", help="Branch to run on")
@click.option("--repo", default="AutumnsGrove/GroveEngine", help="Repository")
@click.pass_context
def ci_run(ctx, latest: bool, commit: Optional[str], branch: str, repo: str):
    """Manually trigger a CI job.

    By default, Codeberg webhooks trigger jobs automatically. This command
    is useful for re-running CI or testing specific commits.

    \b
    Examples:
        gw queen ci run --latest
        gw queen ci run --commit abc123 --branch feature/new
    """
    if not latest and not commit:
        console.print("[red]Error: Use --latest or specify --commit[/red]")
        raise click.Exit(1)
    
    config = ctx.obj['config']
    queen_url = get_queen_url(config)
    
    # If --latest, we'd need to fetch the latest commit from Codeberg
    # For now, this is a placeholder
    
    console.print(f"[yellow]Triggering CI for {repo}@{branch}...[/yellow]")
    
    try:
        response = requests.post(f"{queen_url}/api/jobs", json={
            'repository': repo,
            'branch': branch,
            'commit': commit or 'latest',
            'manual': True
        })
        response.raise_for_status()
        data = response.json()
        
        console.print(f"[green]Job created: {data['jobId']}[/green]")
        console.print(f"View with: gw queen ci view {data['jobId']}")
        
    except requests.RequestException as e:
        console.print(f"[red]Failed to trigger job: {e}[/red]")
        raise click.Exit(1)


@ci.command("cancel")
@click.argument("job_id")
@click.pass_context
def ci_cancel(ctx, job_id: str):
    """Cancel a running CI job."""
    config = ctx.obj['config']
    queen_url = get_queen_url(config)
    
    try:
        response = requests.post(f"{queen_url}/api/jobs/{job_id}/cancel")
        response.raise_for_status()
        console.print(f"[green]Job {job_id} cancelled[/green]")
    except requests.RequestException as e:
        console.print(f"[red]Failed to cancel job: {e}[/red]")
        raise click.Exit(1)


@ci.command("logs")
@click.argument("job_id")
@click.option("--follow", "-f", is_flag=True, help="Follow log output")
@click.option("--tail", default=50, help="Number of lines to show")
@click.pass_context
def ci_logs(ctx, job_id: str, follow: bool, tail: int):
    """View logs for a CI job.

    Use --follow to stream logs in real-time via WebSocket.
    """
    config = ctx.obj['config']
    queen_url = get_queen_url(config)
    
    if follow:
        # WebSocket connection for live logs
        import websocket
        
        ws_url = queen_url.replace('https://', 'wss://')
        ws = websocket.create_connection(f"{ws_url}/ws/logs?job={job_id}")
        
        console.print(f"[dim]Streaming logs for job {job_id}...[/dim]")
        console.print("[dim]Press Ctrl+C to stop[/dim]\n")
        
        try:
            while True:
                message = ws.recv()
                click.echo(message)
        except KeyboardInterrupt:
            ws.close()
            console.print("\n[dim]Stopped.[/dim]")
    else:
        # Fetch historical logs
        try:
            response = requests.get(f"{queen_url}/api/jobs/{job_id}/logs", params={'tail': tail})
            response.raise_for_status()
            data = response.json()
            
            for line in data['logs']:
                click.echo(line)
                
        except requests.RequestException as e:
            console.print(f"[red]Failed to fetch logs: {e}[/red]")
            raise click.Exit(1)


@ci.command("costs")
@click.option("--today", is_flag=True, help="Show today's costs")
@click.option("--this-month", is_flag=True, help="Show this month's costs")
@click.option("--job", help="Show cost breakdown for specific job")
@click.pass_context
def ci_costs(ctx, today: bool, this_month: bool, job: Optional[str]):
    """Show cost breakdown for CI operations."""
    config = ctx.obj['config']
    queen_url = get_queen_url(config)
    
    try:
        response = requests.get(f"{queen_url}/api/costs", params={
            'today': today,
            'month': this_month,
            'job': job
        })
        response.raise_for_status()
        data = response.json()
        
        console.print(Panel(
            f"""
[bold]Firefly CI Costs[/bold]

Today: €{data['today']:.4f}
This Month: €{data['month']:.4f}

Breakdown:
  Warm runners: €{data['breakdown']['warm']:.4f}
  Ephemeral: €{data['breakdown']['ephemeral']:.4f}
  Storage: €{data['breakdown']['storage']:.4f}

Total jobs: {data['jobs']['total']}
Total compute hours: {data['compute']['hours']:.2f}
            """.strip(),
            title="Cost Analysis",
            border_style="green"
        ))
        
    except requests.RequestException as e:
        console.print(f"[red]Failed to fetch costs: {e}[/red]")
        raise click.Exit(1)
