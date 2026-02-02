"""Main CLI entry point for Grove Wrap."""

import click

from .commands import auth, bindings, cache, db, health, secret, status, tenant
from .commands import backup, deploy, do, email, flag, kv, logs, r2, packages
from .commands.doctor import doctor
from .commands.whoami import whoami
from .commands.history import history
from .commands.completion import completion
from .commands.mcp import mcp
from .commands.git import git
from .commands.gh import gh
from .commands.dev import dev
from .commands.dev.test import test
from .commands.dev.build import build
from .commands.dev.check import check
from .commands.dev.lint import lint
from .commands.dev.ci import ci
from .config import GWConfig


@click.group()
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
@click.pass_context
def main(ctx: click.Context, output_json: bool, verbose: bool) -> None:
    """Grove Wrap - A friendly fence around Wrangler's garden.

    A safety layer for Cloudflare operations with database protection,
    configuration management, and helpful terminal output.
    """
    # Ensure we have a context object
    if ctx.obj is None:
        ctx.obj = {}

    # Load configuration
    ctx.obj["config"] = GWConfig.load()
    ctx.obj["output_json"] = output_json
    ctx.obj["verbose"] = verbose


# Register command groups
main.add_command(status.status)
main.add_command(health.health)
main.add_command(auth.auth)
main.add_command(bindings.bindings)
main.add_command(db.db)
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
main.add_command(email.email)

# Dev Tools Phase 15-18 commands
main.add_command(dev)
main.add_command(test)
main.add_command(build)
main.add_command(check)
main.add_command(lint)
main.add_command(ci)
main.add_command(packages.packages)

# Phase 7.5 Quality of Life commands
main.add_command(doctor)
main.add_command(whoami)
main.add_command(history)
main.add_command(completion)

# Phase 7 MCP Server
main.add_command(mcp)


if __name__ == "__main__":
    main()
