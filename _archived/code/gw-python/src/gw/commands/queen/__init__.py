"""Queen Firefly Coordinator commands for Grove Wrap.

The Queen commands the swarm. She receives webhooks from Codeberg,
manages the job queue, orchestrates ephemeral runners on Hetzner Cloud,
and streams logs back to you.

All Queen operations communicate with the Cloudflare Worker + Durable Object
that serves as the coordination layer.

Examples:
    gw queen status              # Check swarm status
    gw queen ci list             # List recent CI jobs
    gw queen ci run --latest     # Trigger CI on latest commit
    gw queen logs --follow       # Stream live logs
"""

import click

from .status import status
from .swarm import swarm
from .ignite import ignite
from .fade import fade
from .logs import logs
from .ci import ci


@click.group()
def queen() -> None:
    """Command the Firefly swarm via the Queen coordinator.

    The Queen is a Cloudflare Durable Object that orchestrates ephemeral
    CI runners. She receives webhooks from Codeberg, maintains the job queue,
    and manages the ignite/fade lifecycle of Hetzner VPS instances.

    \b
    Swarm Management:
        gw queen status              # View swarm status and costs
        gw queen swarm warm          # Warm up runner pool
        gw queen swarm freeze        # Fade all runners
        gw queen ignite              # Manually ignite a runner
        gw queen fade <runner>       # Manually fade a runner

    \b
    CI Operations:
        gw queen ci list             # List CI jobs
        gw queen ci view <id>        # View job details and logs
        gw queen ci run --latest     # Run CI on latest commit
        gw queen ci cancel <id>      # Cancel a running job

    \b
    Log Streaming:
        gw queen logs --follow       # Stream live logs from all jobs
        gw queen logs --job <id>     # View logs for specific job

    \b
    The Queen commands the swarm. Long live the Queen.
    """
    pass


# Register subcommands
queen.add_command(status)
queen.add_command(swarm)
queen.add_command(ignite)
queen.add_command(fade)
queen.add_command(logs)
queen.add_command(ci)
