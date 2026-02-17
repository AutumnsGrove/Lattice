"""Main CLI entry point for grove-find.

Provides the `gf` command with subcommands for codebase search.
"""

from typing import Optional
import typer

from grove_find import __version__
from grove_find.core.config import Config, set_config, OutputMode
from grove_find.core.tools import discover_tools, get_install_instructions
from grove_find.output import print_error, print_warning, print_success

# Import command modules (will be added as we implement them)
from grove_find.commands import search, files, git, github, cloudflare, quality, project, infra

# Create the main Typer app
app = typer.Typer(
    name="gf",
    help="Blazing fast codebase search for the Grove ecosystem.",
    no_args_is_help=True,  # Show help when no command given
    rich_markup_mode="rich",
    add_completion=False,
)


def version_callback(value: bool) -> None:
    """Print version and exit."""
    if value:
        print(f"grove-find {__version__}")
        raise typer.Exit()


@app.callback()
def main(
    ctx: typer.Context,
    root: Optional[str] = typer.Option(
        None,
        "--root",
        "-r",
        help="Grove project root (auto-detected if not specified)",
        envvar="GROVE_ROOT",
    ),
    agent: bool = typer.Option(
        False,
        "--agent",
        "-a",
        help="Agent mode: no colors, no emoji, no box-drawing",
        envvar="GF_AGENT",
    ),
    json_output: bool = typer.Option(
        False,
        "--json",
        "-j",
        help="Output as JSON for scripting",
    ),
    verbose: bool = typer.Option(
        False,
        "--verbose",
        "-v",
        help="Enable verbose output",
    ),
    version: bool = typer.Option(
        False,
        "--version",
        callback=version_callback,
        is_eager=True,
        help="Show version and exit",
    ),
) -> None:
    """Grove-find: Blazing fast codebase search.

    Use subcommands for different search types:

    Examples:
        gf search "TODO"       Search for TODO in codebase
        gf class GlassCard     Find class/component definition
        gf func handleSubmit   Find function definition
        gf svelte              List all Svelte files
        gf recent              Show recently modified files
        gf github issue 42     View GitHub issue #42
        gf git blame file.ts   Show git blame for a file
    """
    # Initialize configuration
    try:
        config = Config.from_env_and_cwd(
            root_override=root,
            agent_mode=agent,
            json_mode=json_output,
            verbose=verbose,
        )
        set_config(config)
    except ValueError as e:
        print_error(str(e))
        raise typer.Exit(1)

    # Discover tools
    tools = discover_tools()
    if not tools.has_required_tools:
        missing = tools.get_missing_required()
        print_error(f"Missing required tools: {', '.join(missing)}")
        print(get_install_instructions())
        raise typer.Exit(1)

    # Warn about missing optional tools (fd, gh) — common in remote/web environments
    missing_optional = tools.get_missing_optional()
    if missing_optional and verbose:
        print_warning(
            "Some optional tools are missing (limited functionality):\n  - "
            + "\n  - ".join(missing_optional)
        )

    # Store tools in context for commands to use
    ctx.ensure_object(dict)
    ctx.obj["config"] = config
    ctx.obj["tools"] = tools


# Register command groups
app.add_typer(files.app, name="files", help="File type searches", hidden=True)
app.add_typer(git.app, name="git", help="Git operations")
app.add_typer(github.app, name="github", help="GitHub issue commands")
app.add_typer(cloudflare.app, name="cf", help="Cloudflare bindings")
app.add_typer(quality.app, name="quality", help="Code quality commands", hidden=True)
app.add_typer(project.app, name="project", help="Project health commands", hidden=True)
app.add_typer(infra.app, name="infra", help="Infrastructure commands", hidden=True)


# Primary search command at top level
@app.command("search")
def search_cmd(
    pattern: str = typer.Argument(..., help="Search pattern"),
    path: Optional[str] = typer.Option(
        None, "--path", "-p", help="Limit search to path"
    ),
    file_type: Optional[str] = typer.Option(
        None, "--type", "-t", help="Filter by file type (svelte, ts, js, py, etc.)"
    ),
) -> None:
    """Search for a pattern across the codebase.

    This is the main search command. Examples:
        gf search "TODO"
        gf search "function handleClick" --path src/
        gf search "useEffect" --type ts
    """
    from grove_find.commands.search import search_command

    search_command(pattern, path, file_type)


# Add top-level shortcuts for common commands
# These mirror the shell script's gfc, gff, etc. but as subcommands


@app.command("class")
def class_cmd(
    name: str = typer.Argument(..., help="Class or component name to find"),
) -> None:
    """Find class/component definitions."""
    from grove_find.commands.search import class_command

    class_command(name)


@app.command("func")
def func_cmd(
    name: str = typer.Argument(..., help="Function name to find"),
) -> None:
    """Find function definitions."""
    from grove_find.commands.search import func_command

    func_command(name)


@app.command("usage")
def usage_cmd(
    name: str = typer.Argument(..., help="Component/function name to find usages of"),
) -> None:
    """Find where a component or function is used."""
    from grove_find.commands.search import usage_command

    usage_command(name)


@app.command("imports")
def imports_cmd(
    module: str = typer.Argument(..., help="Module name to find imports of"),
) -> None:
    """Find imports of a module."""
    from grove_find.commands.search import imports_command

    imports_command(module)


# File type shortcuts
@app.command("svelte")
def svelte_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Optional filter pattern"),
) -> None:
    """Find Svelte component files."""
    from grove_find.commands.files import svelte_command

    svelte_command(pattern)


@app.command("ts")
def ts_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Optional filter pattern"),
) -> None:
    """Find TypeScript files."""
    from grove_find.commands.files import ts_command

    ts_command(pattern)


@app.command("js")
def js_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Optional filter pattern"),
) -> None:
    """Find JavaScript files."""
    from grove_find.commands.files import js_command

    js_command(pattern)


@app.command("css")
def css_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Optional filter pattern"),
) -> None:
    """Find CSS files."""
    from grove_find.commands.files import css_command

    css_command(pattern)


@app.command("md")
def md_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Optional filter pattern"),
) -> None:
    """Find Markdown files."""
    from grove_find.commands.files import md_command

    md_command(pattern)


@app.command("json")
def json_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Optional filter pattern"),
) -> None:
    """Find JSON files."""
    from grove_find.commands.files import json_command

    json_command(pattern)


@app.command("toml")
def toml_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Optional filter pattern"),
) -> None:
    """Find TOML files."""
    from grove_find.commands.files import toml_command

    toml_command(pattern)


@app.command("yaml")
def yaml_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Optional filter pattern"),
) -> None:
    """Find YAML files."""
    from grove_find.commands.files import yaml_command

    yaml_command(pattern)


@app.command("html")
def html_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Optional filter pattern"),
) -> None:
    """Find HTML files."""
    from grove_find.commands.files import html_command

    html_command(pattern)


@app.command("shell")
def shell_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Optional filter pattern"),
) -> None:
    """Find shell script files."""
    from grove_find.commands.files import shell_command

    shell_command(pattern)


# Git shortcuts
@app.command("recent")
def recent_cmd(
    days: int = typer.Argument(7, help="Number of days to look back"),
) -> None:
    """Find recently modified files."""
    from grove_find.commands.git import recent_command

    recent_command(days)


@app.command("changed")
def changed_cmd(
    base: str = typer.Argument("main", help="Base branch to compare against"),
) -> None:
    """Find files changed on current branch vs base."""
    from grove_find.commands.git import changed_command

    changed_command(base)


# Project health shortcuts
@app.command("todo")
def todo_cmd(
    type_filter: Optional[str] = typer.Argument(
        None, help="Filter by type (TODO, FIXME, HACK)"
    ),
) -> None:
    """Find TODO/FIXME/HACK comments."""
    from grove_find.commands.project import todo_command

    todo_command(type_filter)


@app.command("log")
def log_cmd(
    level: Optional[str] = typer.Argument(
        None, help="Log level to filter (log, warn, error)"
    ),
) -> None:
    """Find console.log/warn/error statements."""
    from grove_find.commands.project import log_command

    log_command(level)


@app.command("env")
def env_cmd(
    var: Optional[str] = typer.Argument(
        None, help="Environment variable name to search"
    ),
) -> None:
    """Find environment variable usage."""
    from grove_find.commands.project import env_command

    env_command(var)


@app.command("stats")
def stats_cmd() -> None:
    """Show project git statistics."""
    from grove_find.commands.project import stats_command

    stats_command()


@app.command("briefing")
def briefing_cmd() -> None:
    """Daily briefing with issues and TODOs."""
    from grove_find.commands.project import briefing_command

    briefing_command()


# Domain-specific shortcuts
@app.command("routes")
def routes_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Route pattern to filter"),
    guards: bool = typer.Option(False, "--guards", "-g", help="Show auth guards and protected routes"),
) -> None:
    """Find SvelteKit routes."""
    from grove_find.commands.quality import routes_command

    routes_command(pattern, guards=guards)


@app.command("db")
def db_cmd(
    table: Optional[str] = typer.Argument(
        None, help="Table name to search queries for"
    ),
) -> None:
    """Find database queries."""
    from grove_find.commands.quality import db_command

    db_command(table)


@app.command("glass")
def glass_cmd(
    variant: Optional[str] = typer.Argument(None, help="Glass variant to filter"),
) -> None:
    """Find Glass component usage."""
    from grove_find.commands.quality import glass_command

    glass_command(variant)


@app.command("test")
def test_cmd(
    name: Optional[str] = typer.Argument(None, help="Test file name to filter"),
) -> None:
    """Find test files."""
    from grove_find.commands.files import test_command

    test_command(name)


@app.command("config")
def config_cmd(
    name: Optional[str] = typer.Argument(None, help="Config file name to filter"),
) -> None:
    """Find configuration files."""
    from grove_find.commands.files import config_command

    config_command(name)


@app.command("store")
def store_cmd(
    name: Optional[str] = typer.Argument(None, help="Store name to filter"),
) -> None:
    """Find Svelte stores."""
    from grove_find.commands.quality import store_command

    store_command(name)


# Infrastructure commands
@app.command("large")
def large_cmd(
    threshold: int = typer.Argument(500, help="Minimum line count threshold"),
) -> None:
    """Find oversized files (>N lines)."""
    from grove_find.commands.infra import large_command

    large_command(threshold)


@app.command("orphaned")
def orphaned_cmd() -> None:
    """Find Svelte components not imported anywhere."""
    from grove_find.commands.infra import orphaned_command

    orphaned_command()


@app.command("migrations")
def migrations_cmd() -> None:
    """List D1 migrations across all packages."""
    from grove_find.commands.infra import migrations_command

    migrations_command()


@app.command("flags")
def flags_cmd(
    name: Optional[str] = typer.Argument(None, help="Flag name to search for"),
) -> None:
    """Find feature flag definitions and usage."""
    from grove_find.commands.infra import flags_command

    flags_command(name)


@app.command("workers")
def workers_cmd() -> None:
    """List Cloudflare Worker configurations."""
    from grove_find.commands.infra import workers_command

    workers_command()


@app.command("emails")
def emails_cmd() -> None:
    """Find email templates and send functions."""
    from grove_find.commands.infra import emails_command

    emails_command()


@app.command("deps")
def deps_cmd(
    package: Optional[str] = typer.Argument(None, help="Package name to inspect"),
) -> None:
    """Show workspace dependency graph."""
    from grove_find.commands.infra import deps_command

    deps_command(package)


@app.command("config-diff")
def config_diff_cmd(
    config_type: Optional[str] = typer.Argument(
        None, help="Config type (tailwind, svelte, tsconfig, vitest)"
    ),
) -> None:
    """Compare configuration files across packages."""
    from grove_find.commands.infra import config_diff_command

    config_diff_command(config_type)


@app.command("type")
def type_cmd(
    name: Optional[str] = typer.Argument(None, help="Type name to find"),
) -> None:
    """Find TypeScript type/interface definitions."""
    from grove_find.commands.quality import type_command

    type_command(name)


@app.command("export")
def export_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Export pattern to filter"),
) -> None:
    """Find module exports."""
    from grove_find.commands.quality import export_command

    export_command(pattern)


@app.command("auth")
def auth_cmd(
    aspect: Optional[str] = typer.Argument(
        None, help="Auth aspect to filter (session, token, etc.)"
    ),
) -> None:
    """Find authentication code."""
    from grove_find.commands.quality import auth_command

    auth_command(aspect)


@app.command("engine")
def engine_cmd(
    module: Optional[str] = typer.Argument(
        None, help="Engine module to filter (ui, stores, utils)"
    ),
) -> None:
    """Find @autumnsgrove/groveengine imports."""
    from grove_find.commands.quality import engine_command

    engine_command(module)


# Impact analysis commands (agent-optimized)
@app.command("impact")
def impact_cmd(
    file_path: str = typer.Argument(..., help="File path to analyze"),
) -> None:
    """Full impact analysis — who imports, what tests, which routes."""
    from grove_find.commands.impact import impact_command

    impact_command(file_path)


@app.command("test-for")
def test_for_cmd(
    file_path: str = typer.Argument(..., help="File path to find tests for"),
) -> None:
    """Find tests that cover a specific file."""
    from grove_find.commands.impact import test_for_command

    test_for_command(file_path)


@app.command("diff-summary")
def diff_summary_cmd(
    base: str = typer.Argument("HEAD", help="Base ref to compare against"),
) -> None:
    """Structured diff summary with per-file line counts and package breakdown."""
    from grove_find.commands.impact import diff_summary_command

    diff_summary_command(base)


if __name__ == "__main__":
    app()
