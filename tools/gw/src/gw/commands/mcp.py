"""MCP server command - start Grove Wrap as an MCP server."""

import json

import click

from ..ui import console, create_panel, error, info, success


@click.group()
def mcp() -> None:
    """MCP server for Claude Code integration.

    Expose gw commands as MCP tools that Claude Code can call directly.

    \b
    Setup in Claude Code settings.json:
        {
            "mcpServers": {
                "grove-wrap": {
                    "command": "gw",
                    "args": ["mcp", "serve"]
                }
            }
        }

    \b
    Examples:
        gw mcp serve       # Start MCP server (stdio transport)
        gw mcp tools       # List available MCP tools
    """
    pass


@mcp.command("serve")
@click.pass_context
def mcp_serve(ctx: click.Context) -> None:
    """Start the MCP server.

    Runs with stdio transport for Claude Code integration.
    All read operations are always safe.
    Write operations require explicit tool calls.

    \b
    Dangerous operations (force-push, reset --hard) are blocked.
    """
    # Import here to avoid loading MCP deps until needed
    from ..mcp_server import run_server

    # Run the server (blocks until terminated)
    run_server()


@mcp.command("tools")
@click.pass_context
def mcp_tools(ctx: click.Context) -> None:
    """List available MCP tools.

    Shows all tools exposed by the MCP server with their descriptions.
    """
    output_json = ctx.obj.get("output_json", False)

    # Tool definitions
    tools = [
        # Database
        {"name": "grove_db_query", "category": "Database", "description": "Execute read-only SQL query", "safety": "READ"},
        {"name": "grove_db_tables", "category": "Database", "description": "List tables in database", "safety": "READ"},
        {"name": "grove_db_schema", "category": "Database", "description": "Get table schema", "safety": "READ"},
        {"name": "grove_tenant_lookup", "category": "Database", "description": "Look up tenant info", "safety": "READ"},

        # Cache
        {"name": "grove_cache_list", "category": "Cache", "description": "List cache keys", "safety": "READ"},
        {"name": "grove_cache_purge", "category": "Cache", "description": "Purge cache keys", "safety": "WRITE"},

        # KV/R2
        {"name": "grove_kv_get", "category": "KV", "description": "Get KV value", "safety": "READ"},
        {"name": "grove_r2_list", "category": "R2", "description": "List R2 objects", "safety": "READ"},

        # Status
        {"name": "grove_status", "category": "Status", "description": "Infrastructure status", "safety": "READ"},
        {"name": "grove_health", "category": "Status", "description": "Health check", "safety": "READ"},

        # Git READ
        {"name": "grove_git_status", "category": "Git", "description": "Repository status", "safety": "READ"},
        {"name": "grove_git_log", "category": "Git", "description": "Commit history", "safety": "READ"},
        {"name": "grove_git_diff", "category": "Git", "description": "Show changes", "safety": "READ"},

        # Git WRITE
        {"name": "grove_git_commit", "category": "Git", "description": "Create commit", "safety": "WRITE"},
        {"name": "grove_git_push", "category": "Git", "description": "Push to remote", "safety": "WRITE"},

        # GitHub READ
        {"name": "grove_gh_pr_list", "category": "GitHub", "description": "List pull requests", "safety": "READ"},
        {"name": "grove_gh_pr_view", "category": "GitHub", "description": "View PR details", "safety": "READ"},
        {"name": "grove_gh_issue_list", "category": "GitHub", "description": "List issues", "safety": "READ"},
        {"name": "grove_gh_issue_view", "category": "GitHub", "description": "View issue details", "safety": "READ"},
        {"name": "grove_gh_run_list", "category": "GitHub", "description": "List workflow runs", "safety": "READ"},

        # GitHub WRITE
        {"name": "grove_gh_pr_create", "category": "GitHub", "description": "Create pull request", "safety": "WRITE"},

        # Bindings
        {"name": "grove_bindings", "category": "Bindings", "description": "List Cloudflare bindings", "safety": "READ"},

        # Dev Tools
        {"name": "grove_packages_list", "category": "Dev", "description": "List monorepo packages", "safety": "READ"},
        {"name": "grove_dev_status", "category": "Dev", "description": "Dev server status", "safety": "READ"},
        {"name": "grove_test_run", "category": "Dev", "description": "Run package tests", "safety": "WRITE"},
        {"name": "grove_build", "category": "Dev", "description": "Build package", "safety": "WRITE"},
        {"name": "grove_ci", "category": "Dev", "description": "Run CI pipeline", "safety": "WRITE"},

        # Infrastructure Audit
        {"name": "grove_config_validate", "category": "Audit", "description": "Validate wrangler.toml configs", "safety": "READ"},
        {"name": "grove_env_audit", "category": "Audit", "description": "Audit env vars across configs", "safety": "READ"},
        {"name": "grove_monorepo_size", "category": "Audit", "description": "Package size report", "safety": "READ"},
    ]

    if output_json:
        console.print(json.dumps({"tools": tools}, indent=2))
        return

    console.print("\n[bold green]🌲 Grove Wrap MCP Tools[/bold green]\n")

    # Group by category
    categories = {}
    for tool in tools:
        cat = tool["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(tool)

    for category, cat_tools in categories.items():
        console.print(f"[bold cyan]{category}[/bold cyan]")
        for tool in cat_tools:
            safety_color = "green" if tool["safety"] == "READ" else "yellow"
            console.print(f"  [{safety_color}]{tool['safety']:5}[/{safety_color}] {tool['name']}")
            console.print(f"         [dim]{tool['description']}[/dim]")
        console.print()

    console.print("[dim]READ = Always safe, WRITE = Confirmation may be needed[/dim]")


@mcp.command("config")
@click.pass_context
def mcp_config(ctx: click.Context) -> None:
    """Show Claude Code configuration snippet.

    Outputs the JSON configuration to add to Claude Code settings.
    """
    output_json = ctx.obj.get("output_json", False)

    config = {
        "mcpServers": {
            "grove-wrap": {
                "command": "gw",
                "args": ["mcp", "serve"]
            }
        }
    }

    if output_json:
        console.print(json.dumps(config, indent=2))
        return

    console.print("\n[bold green]Claude Code Configuration[/bold green]\n")
    console.print("Add this to your Claude Code settings.json:\n")
    console.print(create_panel(
        json.dumps(config, indent=2),
        title="mcpServers",
        style="cyan"
    ))
    console.print()
    info("On macOS: ~/Library/Application Support/Claude/claude_desktop_config.json")
    info("On Linux: ~/.config/Claude/claude_desktop_config.json")
