"""Main CLI entry point for Grove Wrap."""

import click

from .commands import auth, bindings, cache, db, health, secret, status, tenant
from .commands import backup, deploy, do, email, export, flag, kv, logs, r2, packages, social
from .commands.doctor import doctor
from .commands.whoami import whoami
from .commands.history import history
from .commands.completion import completion
from .commands.mcp import mcp
from .commands.metrics import metrics
from .commands.config_validate import config_validate
from .commands.env_audit import env_audit
from .commands.monorepo_size import monorepo_size
from .commands.context import context
from .commands.git import git
from .commands.gh import gh
from .commands.dev import dev
from .commands.dev.test import test
from .commands.dev.build import build
from .commands.dev.check import check
from .commands.dev.lint import lint
from .commands.dev.ci import ci
from .commands.publish import publish
from .config import GWConfig
from .tracking import TrackedGroup
from .help_formatter import show_categorized_help


class GWGroup(TrackedGroup):
    """Custom Click group that overrides help display."""

    def get_help(self, ctx: click.Context) -> str:
        """Override to show our custom categorized help."""
        # Return a minimal string to avoid duplicate output
        # Our invoke_without_command will show the real help
        return ""

    def main(self, args=None, prog_name=None, complete_var=None, **extra):
        """Override main to handle --help specially."""
        # Check if --help is in args
        if args and "--help" in args:
            show_categorized_help()
            return 0

        # Otherwise use normal Click behavior
        return super().main(args, prog_name, complete_var, **extra)

    def add_command(self, cmd, name=None):
        """Override to prevent Click from adding its own help command."""
        # Don't add if it's Click's default help
        if name == "help" and hasattr(cmd, "_original_help"):
            return self
        return super().add_command(cmd, name)


@click.group(cls=GWGroup, invoke_without_command=True)
@click.option(
    "--json",
    "output_json",
    is_flag=True,
    help="Output machine-readable JSON",
)
@click.option(
    "--verbose",
    is_flag=True,
    help="Enable verbose debug output",
)
@click.option(
    "--help",
    "show_help",
    is_flag=True,
    is_eager=True,
    expose_value=False,
    callback=lambda ctx, param, value: show_categorized_help() or ctx.exit(0) if value else None,
    help="Show this message and exit",
)
@click.pass_context
def main(ctx: click.Context, output_json: bool, verbose: bool) -> None:
    """Grove Wrap - One CLI to tend them all.

    A safety layer wrapping Wrangler, git, and GitHub CLI with agent-safe
    defaults, database protection, and helpful terminal output.
    """
    # Ensure we have a context object
    if ctx.obj is None:
        ctx.obj = {}

    # Load configuration
    ctx.obj["config"] = GWConfig.load()
    ctx.obj["output_json"] = output_json
    ctx.obj["verbose"] = verbose

    # If no command is specified, show our custom help
    if ctx.invoked_subcommand is None:
        show_categorized_help()


# Custom help command
@main.command(name="help")
@click.argument("command_name", required=False)
@click.pass_context
def help_cmd(ctx: click.Context, command_name: str) -> None:
    """Show help for gw or a specific command."""
    if command_name:
        # Get the command and show its help
        cmd = main.get_command(ctx, command_name)
        if cmd:
            click.echo(click.Context(cmd).get_help())
        else:
            click.echo(f"Unknown command: {command_name}")
            click.echo()
            show_categorized_help()
    else:
        show_categorized_help()


# Register command groups
main.add_command(status.status)
main.add_command(health.health)
main.add_command(auth.auth)
main.add_command(bindings.bindings)
main.add_command(db.d1)
main.add_command(tenant.tenant)
main.add_command(secret.secret)
main.add_command(cache.cache)
main.add_command(git)
main.add_command(gh)

# Cloudflare Phase 4-6.5 commands
main.add_command(kv.kv)
main.add_command(r2.r2)
main.add_command(logs.logs)
main.add_command(deploy.deploy)
main.add_command(do.do)
main.add_command(flag.flag)
main.add_command(backup.backup)
main.add_command(export.export)
main.add_command(email.email)
main.add_command(social.social)

# Dev Tools Phase 15-18 commands
main.add_command(dev)
main.add_command(test)
main.add_command(build)
main.add_command(check)
main.add_command(lint)
main.add_command(ci)
main.add_command(packages.packages)
main.add_command(publish)

# Phase 7.5 Quality of Life commands
main.add_command(doctor)
main.add_command(whoami)
main.add_command(history)
main.add_command(completion)

# Phase 7 MCP Server
main.add_command(mcp)

# Metrics
main.add_command(metrics)

# Infrastructure audit commands
main.add_command(config_validate)
main.add_command(env_audit)
main.add_command(monorepo_size)

# Agent-optimized commands
main.add_command(context)


if __name__ == "__main__":
    main()
