"""Swarm management commands for Queen Firefly.

Control the warm pool of CI runners—warm them up for fast builds,
freeze them to save costs, or check their status.
"""

# NOTE - NONE OF THIS WORKS YET

import json
import time
from typing import Optional

import click
import requests
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from ...config import GWConfig

console = Console()

DEFAULT_QUEEN_URL = "https://queen.grove.place"


def get_queen_url(config: GWConfig) -> str:
    """Get Queen coordinator URL from config."""
    return getattr(config, 'queen_url', DEFAULT_QUEEN_URL)


@click.group()
def swarm() -> None:
    """Manage the Firefly swarm (runner pool).

    The swarm is the collection of CI runners—warm runners that stay
    ready for fast job startup, and ephemeral runners that ignite on
    demand and fade when done.

    \b
    Examples:
        gw queen swarm status         # Show swarm status
        gw queen swarm warm           # Warm up default pool
        gw queen swarm warm -c 3     # Warm up 3 runners
        gw queen swarm freeze         # Fade all warm runners
        gw queen swarm config        # Show current configuration
    """
    pass


@swarm.command("status")
@click.option("--watch", "-w", is_flag=True, help="Watch for changes")
@click.option("--interval", default=5, help="Refresh interval in seconds")
@click.pass_context
def swarm_status(ctx, watch: bool, interval: int):
    """Show current swarm status."""
    config = ctx.obj['config']
    queen_url = get_queen_url(config)
    
    def fetch_status():
        try:
            response = requests.get(f"{queen_url}/api/status")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            console.print(f"[red]Failed to connect to Queen: {e}[/red]")
            return None
    
    def render_status(data):
        if not data:
            return
        
        # Swarm composition
        warm = data['runners']['warm']
        ephemeral = data['runners']['ephemeral']
        
        swarm_table = Table(title="Swarm Composition")
        swarm_table.add_column("Type", style="cyan")
        swarm_table.add_column("Ready", justify="right")
        swarm_table.add_column("Working", justify="right")
        swarm_table.add_column("Igniting", justify="right")
        swarm_table.add_column("Fading", justify="right")
        swarm_table.add_column("Total", justify="right")
        
        swarm_table.add_row(
            "Warm",
            str(warm['ready']),
            str(warm['working']),
            "-",
            "-",
            str(warm['ready'] + warm['working'])
        )
        swarm_table.add_row(
            "Ephemeral",
            "-",
            str(ephemeral['working']),
            str(ephemeral['igniting']),
            str(ephemeral['fading']),
            str(ephemeral['working'] + ephemeral['igniting'] + ephemeral['fading'])
        )
        
        # Job queue
        queue_table = Table(title="Job Queue")
        queue_table.add_column("Status", style="magenta")
        queue_table.add_column("Count", justify="right")
        
        queue = data['queue']
        queue_table.add_row("Pending", str(queue['pending']))
        queue_table.add_row("Running", str(queue['running']))
        queue_table.add_row("Completed (24h)", str(queue['completed']))
        
        # Costs
        cost_panel = Panel(
            f"Today: [green]€{data['costs']['today']:.4f}[/green]\n"
            f"This Month: [green]€{data['costs']['thisMonth']:.4f}[/green]",
            title="Costs",
            border_style="green"
        )
        
        console.print(swarm_table)
        console.print(queue_table)
        console.print(cost_panel)
    
    if watch:
        with console.status("[bold green]Watching swarm..."):
            while True:
                console.clear()
                data = fetch_status()
                render_status(data)
                console.print(f"\n[dim]Refreshing in {interval}s (Ctrl+C to stop)[/dim]")
                time.sleep(interval)
    else:
        data = fetch_status()
        render_status(data)


@swarm.command("warm")
@click.option("--count", "-c", default=1, help="Number of runners to warm")
@click.option("--duration", "-d", type=int, help="Auto-fade after N minutes")
@click.option("--wait", "-w", is_flag=True, help="Wait for runners to be ready")
@click.pass_context
def swarm_warm(ctx, count: int, duration: Optional[int], wait: bool):
    """Warm up runners (add to warm pool).

    Warming creates new VPS instances that stay ready to execute jobs.
    This eliminates the 30-60 second cold start time for ephemeral runners.

    \b
    Examples:
        gw queen swarm warm                    # Warm 1 runner
        gw queen swarm warm -c 3              # Warm 3 runners
        gw queen swarm warm -c 2 -d 120       # Warm 2 for 2 hours
        gw queen swarm warm --wait            # Wait until ready
    """
    config = ctx.obj['config']
    queen_url = get_queen_url(config)
    
    console.print(f"[yellow]Warming {count} runner(s)...[/yellow]")
    if duration:
        console.print(f"[dim]Will auto-fade after {duration} minutes[/dim]")
    
    try:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("Igniting runners...", total=None)
            
            response = requests.post(f"{queen_url}/api/runners/warm", json={
                'count': count,
                'durationMinutes': duration
            })
            response.raise_for_status()
            data = response.json()
            
            progress.update(task, description=f"[green]Ignited {len(data['runners'])} runner(s)[/green]")
        
        # Show runner details
        table = Table(title="New Runners")
        table.add_column("ID", style="cyan")
        table.add_column("IP", style="blue")
        table.add_column("Status", style="yellow")
        table.add_column("ETA", style="dim")
        
        for runner in data['runners']:
            table.add_row(
                runner['id'][:8],
                runner.get('ip', 'Provisioning...'),
                runner['status'],
                "~45s" if runner['status'] == 'igniting' else "Ready"
            )
        
        console.print(table)
        
        if wait:
            console.print("[dim]Waiting for runners to be ready...[/dim]")
            # Poll until ready
            while True:
                time.sleep(5)
                status_resp = requests.get(f"{queen_url}/api/status")
                status_data = status_resp.json()
                
                ready = status_data['runners']['warm']['ready']
                if ready >= count:
                    console.print(f"[green]{count} runner(s) ready![/green]")
                    break
                console.print(f"[dim]{ready}/{count} ready...[/dim]")
        
    except requests.RequestException as e:
        console.print(f"[red]Failed to warm swarm: {e}[/red]")
        raise click.Exit(1)


@swarm.command("freeze")
@click.option("--force", is_flag=True, help="Fade even working runners")
@click.confirmation_option(prompt="Fade all warm runners? This may cancel running jobs.")
@click.pass_context
def swarm_freeze(ctx, force: bool):
    """Freeze the swarm (fade all warm runners).

    This reduces costs to near-zero by destroying all warm runners.
    Jobs will still run, but they'll use cold-start ephemeral runners
    (30-60 second delay).

    Use this when you're done developing for the day.
    """
    config = ctx.obj['config']
    queen_url = get_queen_url(config)
    
    console.print("[yellow]Freezing swarm...[/yellow]")
    
    try:
        response = requests.post(f"{queen_url}/api/runners/freeze", json={
            'force': force
        })
        response.raise_for_status()
        data = response.json()
        
        faded = data.get('faded', [])
        console.print(f"[green]Faded {len(faded)} runner(s)[/green]")
        
        if faded:
            console.print("\n[dim]Faded runners:[/dim]")
            for runner_id in faded:
                console.print(f"  • {runner_id}")
        
        console.print("\n[dim]Swarm is now frozen. New jobs will ignite ephemeral runners.[/dim]")
        
    except requests.RequestException as e:
        console.print(f"[red]Failed to freeze swarm: {e}[/red]")
        raise click.Exit(1)


@swarm.command("config")
@click.option("--min-warm", type=int, help="Minimum warm runners")
@click.option("--max-warm", type=int, help="Maximum warm runners")
@click.option("--max-total", type=int, help="Maximum total runners (hard limit)")
@click.option("--fade-after", type=int, help="Fade warm runners after N minutes idle")
@click.option("--set", "set_config", is_flag=True, help="Apply configuration changes")
@click.pass_context
def swarm_config(ctx, min_warm: Optional[int], max_warm: Optional[int],
                 max_total: Optional[int], fade_after: Optional[int],
                 set_config: bool):
    """View or configure swarm behavior.

    Without --set, shows current configuration.
    With --set, applies new configuration.

    \b
    Examples:
        gw queen swarm config                    # View current config
        gw queen swarm config --min-warm 2       # Set min warm to 2
        gw queen swarm config --set              # Apply changes
    """
    config = ctx.obj['config']
    queen_url = get_queen_url(config)
    
    if set_config:
        # Build update payload
        updates = {}
        if min_warm is not None:
            updates['minWarmRunners'] = min_warm
        if max_warm is not None:
            updates['maxWarmRunners'] = max_warm
        if max_total is not None:
            updates['maxTotalRunners'] = max_total
        if fade_after is not None:
            updates['fadeAfterIdleMinutes'] = fade_after
        
        if not updates:
            console.print("[yellow]No changes specified. Use --min-warm, --max-warm, etc.[/yellow]")
            return
        
        try:
            response = requests.post(f"{queen_url}/api/config", json=updates)
            response.raise_for_status()
            console.print("[green]Configuration updated[/green]")
        except requests.RequestException as e:
            console.print(f"[red]Failed to update config: {e}[/red]")
            raise click.Exit(1)
    
    # Fetch and display current config
    try:
        response = requests.get(f"{queen_url}/api/config")
        response.raise_for_status()
        cfg = response.json()
        
        console.print(Panel(
            f"""
[bold]Swarm Configuration[/bold]

Pool Settings:
  Min Warm Runners: {cfg['minWarmRunners']}
  Max Warm Runners: {cfg['maxWarmRunners']}
  Max Total Runners: {cfg['maxTotalRunners']}

Scaling:
  Fade After Idle: {cfg['fadeAfterIdleMinutes']} minutes
  Ephemeral Fade: {cfg['ephemeralFadeAfterMinutes']} minutes
  Scale Up Threshold: {cfg['scaleUpThreshold']} queued jobs

Cost Optimization:
  Current mode: {'[green]Active[/green]' if cfg['minWarmRunners'] > 0 else '[yellow]Frozen[/yellow]'}
  Estimated monthly (active): €{cfg['estimatedCost']['active']:.2f}
  Estimated monthly (frozen): €{cfg['estimatedCost']['frozen']:.2f}
            """.strip(),
            title="Configuration",
            border_style="blue"
        ))
        
    except requests.RequestException as e:
        console.print(f"[red]Failed to fetch config: {e}[/red]")
        raise click.Exit(1)


@swarm.command("scale")
@click.argument("target", type=int)
@click.pass_context
def swarm_scale(ctx, target: int):
    """Scale warm pool to specific size.

    This is a convenience wrapper around warm/freeze commands.
    If target > current warm, ignites new runners.
    If target < current warm, fades excess runners.

    \b
    Examples:
        gw queen swarm scale 0     # Freeze (same as 'freeze')
        gw queen swarm scale 2     # Ensure 2 warm runners
        gw queen swarm scale 5     # Scale up to 5 runners
    """
    config = ctx.obj['config']
    queen_url = get_queen_url(config)
    
    try:
        # Get current status
        status_resp = requests.get(f"{queen_url}/api/status")
        status_data = status_resp.json()
        current_warm = status_data['runners']['warm']['ready'] + status_data['runners']['warm']['working']
        
        if target == current_warm:
            console.print(f"[dim]Already at {target} warm runners[/dim]")
            return
        
        if target > current_warm:
            # Need to warm up more
            to_add = target - current_warm
            console.print(f"[yellow]Scaling up: {current_warm} → {target} (+{to_add})[/yellow]")
            
            response = requests.post(f"{queen_url}/api/runners/warm", json={'count': to_add})
            response.raise_for_status()
            console.print(f"[green]Ignited {to_add} runner(s)[/green]")
        
        else:
            # Need to fade some
            to_remove = current_warm - target
            console.print(f"[yellow]Scaling down: {current_warm} → {target} (-{to_remove})[/yellow]")
            
            response = requests.post(f"{queen_url}/api/runners/scale-down", json={
                'count': to_remove
            })
            response.raise_for_status()
            data = response.json()
            console.print(f"[green]Faded {len(data['faded'])} runner(s)[/green]")
        
    except requests.RequestException as e:
        console.print(f"[red]Failed to scale swarm: {e}[/red]")
        raise click.Exit(1)
