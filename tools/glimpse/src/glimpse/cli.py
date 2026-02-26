"""Main CLI entry point for Glimpse.

Registers commands and handles global options (--agent, --json, --verbose,
--logs, --auto). Follows the gw pattern: Click group with context object
carrying config + output.

Commands are lazily loaded to avoid importing Playwright on --help/--version.
"""

import importlib

import click

from glimpse import __version__
from glimpse.config import GlimpseConfig
from glimpse.output.formatter import GlimpseOutput


class LazyGroup(click.Group):
    """Click group that defers command imports until invocation.

    This avoids pulling in Playwright (via commands/capture.py → engine.py)
    on every CLI call, saving ~200-400ms on --help, --version, and install.
    """

    _lazy_commands: dict[str, str] = {
        "batch": "glimpse.commands.batch:batch",
        "browse": "glimpse.commands.browse:browse",
        "capture": "glimpse.commands.capture:capture",
        "detect": "glimpse.commands.detect:detect",
        "install": "glimpse.commands.install:install",
        "matrix": "glimpse.commands.matrix:matrix",
        "seed": "glimpse.commands.seed:seed",
        "status": "glimpse.commands.status:status",
        "stop": "glimpse.commands.stop:stop",
    }

    def list_commands(self, ctx: click.Context) -> list[str]:
        return sorted(self._lazy_commands.keys())

    def get_command(self, ctx: click.Context, cmd_name: str) -> click.Command | None:
        if cmd_name not in self._lazy_commands:
            return None
        module_path, attr_name = self._lazy_commands[cmd_name].rsplit(":", 1)
        module = importlib.import_module(module_path)
        return getattr(module, attr_name)


@click.group(cls=LazyGroup, invoke_without_command=True)
@click.option(
    "--agent",
    is_flag=True,
    help="Agent-friendly output (bare paths, errors on stderr)",
)
@click.option(
    "--json",
    "output_json",
    is_flag=True,
    help="Machine-readable JSON output",
)
@click.option(
    "--verbose",
    is_flag=True,
    help="Enable verbose debug output",
)
@click.option(
    "--logs",
    is_flag=True,
    default=False,
    help="Capture browser console output alongside screenshots",
)
@click.option(
    "--auto",
    is_flag=True,
    default=False,
    help="Auto-start dev server if target URL is unreachable",
)
@click.version_option(version=__version__, prog_name="glimpse")
@click.pass_context
def main(
    ctx: click.Context,
    agent: bool,
    output_json: bool,
    verbose: bool,
    logs: bool,
    auto: bool,
) -> None:
    """Glimpse — A quick peek through the trees.

    Capture screenshots of Grove sites with theme control,
    element targeting, console log capture, and agent-friendly output modes.
    """
    # Determine output mode
    if output_json:
        mode = "json"
    elif agent:
        mode = "agent"
    else:
        mode = "human"

    # Load config and set runtime flags
    config = GlimpseConfig.load()
    config.agent_mode = agent
    config.json_mode = output_json
    config.verbose = verbose

    # Build context object for child commands
    ctx.ensure_object(dict)
    ctx.obj["config"] = config
    ctx.obj["output"] = GlimpseOutput(mode=mode)
    ctx.obj["verbose"] = verbose
    ctx.obj["global_logs"] = logs
    ctx.obj["global_auto"] = auto

    # No subcommand → show help
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())
