"""Git config management commands."""

import json
from typing import Optional

import click
from rich.table import Table

from ...git_wrapper import Git, GitError
from ...safety.git import GitSafetyError, check_git_safety
from ...ui import console, action, git_error, safety_error


@click.group("config")
def git_config() -> None:
    """View and set Git configuration.

    Get and list are always safe; set requires --write.

    \b
    Examples:
        gw git config list                            # Show all config
        gw git config get user.email                  # Get a value
        gw git config set --write user.name "Autumn"  # Set a value
    """
    pass


@git_config.command("list")
@click.option("--global", "global_scope", is_flag=True, help="Show global config only")
@click.option("--local", "local_scope", is_flag=True, help="Show local (repo) config only")
@click.pass_context
def config_list(ctx: click.Context, global_scope: bool, local_scope: bool) -> None:
    """List Git configuration values.

    Always safe - no --write flag required.

    \b
    Examples:
        gw git config list                 # All config
        gw git config list --global        # Global only
        gw git config list --local         # Repo-local only
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        args = ["config", "--list"]
        if global_scope:
            args.insert(1, "--global")
        elif local_scope:
            args.insert(1, "--local")

        output = git.execute(args)

        if not output.strip():
            if output_json:
                console.print(json.dumps({"config": {}}))
            else:
                console.print("[dim]No configuration found[/dim]")
            return

        # Parse key=value lines
        config = {}
        for line in output.strip().split("\n"):
            if "=" in line:
                key, _, value = line.partition("=")
                config[key] = value

        if output_json:
            console.print(json.dumps({"config": config}, indent=2))
            return

        table = Table(title="Git Config", border_style="green")
        table.add_column("Key", style="cyan")
        table.add_column("Value")

        for key, value in sorted(config.items()):
            table.add_row(key, value)

        console.print(table)

    except GitError as e:
        git_error(e.message)
        raise SystemExit(1)


@git_config.command("get")
@click.argument("key")
@click.pass_context
def config_get(ctx: click.Context, key: str) -> None:
    """Get a Git configuration value.

    Always safe - no --write flag required.

    \b
    Examples:
        gw git config get user.email
        gw git config get user.name
        gw git config get pull.rebase
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        try:
            output = git.execute(["config", "--get", key])
            value = output.strip()
        except GitError:
            if output_json:
                console.print(json.dumps({"key": key, "value": None}))
            else:
                console.print(f"[yellow]Not set:[/yellow] {key}")
            return

        if output_json:
            console.print(json.dumps({"key": key, "value": value}))
        else:
            console.print(f"[cyan]{key}[/cyan] = {value}")

    except GitError as e:
        git_error(e.message)
        raise SystemExit(1)


@git_config.command("set")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--global", "global_scope", is_flag=True, help="Set in global config")
@click.argument("key")
@click.argument("value")
@click.pass_context
def config_set(ctx: click.Context, write: bool, global_scope: bool, key: str, value: str) -> None:
    """Set a Git configuration value.

    Requires --write flag.

    \b
    Examples:
        gw git config set --write user.name "Autumn"
        gw git config set --write --global pull.rebase true
        gw git config set --write core.autocrlf input
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("config_set", write_flag=write)
    except GitSafetyError as e:
        safety_error(e.message, e.suggestion)
        raise SystemExit(1)

    try:
        git = Git()

        args = ["config"]
        if global_scope:
            args.append("--global")
        args.extend([key, value])

        git.execute(args)

        if output_json:
            console.print(json.dumps({"key": key, "value": value, "global": global_scope}))
        else:
            scope = "global" if global_scope else "local"
            action(f"Set ({scope})", f"{key} = {value}")

    except GitError as e:
        git_error(e.message)
        raise SystemExit(1)
