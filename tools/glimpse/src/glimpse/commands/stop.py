"""glimpse stop — stop a dev server that Glimpse started via --auto."""

import click

from glimpse.server.manager import ServerManager


@click.command()
@click.pass_context
def stop(ctx: click.Context) -> None:
    """Stop any dev server that Glimpse started via --auto.

    Only stops servers tracked by Glimpse's PID file. Never kills
    servers started by the developer directly.
    """
    config = ctx.obj["config"]
    output_handler = ctx.obj["output"]

    mgr = ServerManager(config)
    ok, msg = mgr.stop_server()

    if ok:
        output_handler.print_success("Dev server stopped")
    else:
        output_handler.print_error(msg)
        ctx.exit(1)
