"""Automatic metrics tracking for gw commands."""

import os
import sys
import time
from typing import Any, Optional

import click

from .commands.metrics import record_metric


class TrackedGroup(click.Group):
    """A Click Group that automatically tracks command execution metrics."""

    def invoke(self, ctx: click.Context) -> Any:
        """Invoke the command and track metrics."""
        # Don't track the metrics command itself (would be recursive)
        if ctx.invoked_subcommand == "metrics":
            return super().invoke(ctx)

        # Parse command from sys.argv for accurate tracking
        # sys.argv looks like: ['gw', 'git', 'status'] or ['gw', 'db', 'tables']
        args = sys.argv[1:]  # Skip 'gw'
        command_group = args[0] if args else "main"
        command = args[1] if len(args) > 1 and not args[1].startswith("-") else command_group

        # Skip tracking for help commands
        if "--help" in args or "-h" in args:
            return super().invoke(ctx)

        # Track start time
        start_time = time.time()

        # Track if this is a write operation
        is_write = "--write" in sys.argv

        # Track if running in agent/MCP mode
        agent_mode = os.environ.get("GW_AGENT_MODE") == "1"
        is_mcp = os.environ.get("GW_MCP_MODE") == "1"

        success = True
        error_type = None
        error_message = None
        exit_code = 0

        try:
            result = super().invoke(ctx)
            return result
        except click.ClickException as e:
            success = False
            error_type = type(e).__name__
            error_message = str(e.message) if hasattr(e, 'message') else str(e)
            exit_code = e.exit_code if hasattr(e, 'exit_code') else 1
            raise
        except Exception as e:
            success = False
            error_type = type(e).__name__
            error_message = str(e)
            exit_code = 1
            raise
        finally:
            # Calculate duration
            duration_ms = int((time.time() - start_time) * 1000)

            # Record the metric
            record_metric(
                command_group=command_group,
                command=command,
                subcommand=None,
                success=success,
                exit_code=exit_code,
                error_type=error_type,
                error_message=error_message,
                duration_ms=duration_ms,
                is_write=is_write,
                is_mcp=is_mcp,
                agent_mode=agent_mode,
            )


class TrackedCommand(click.Command):
    """A Click Command that tracks its own execution metrics."""

    def invoke(self, ctx: click.Context) -> Any:
        """Invoke the command and track metrics."""
        # Get command info
        command_parts = ctx.command_path.split()
        command_group = command_parts[1] if len(command_parts) > 1 else "main"
        command = command_parts[-1] if len(command_parts) > 1 else "main"

        # Track start time
        start_time = time.time()

        # Track if this is a write operation
        is_write = "--write" in sys.argv

        # Track if running in agent/MCP mode
        agent_mode = os.environ.get("GW_AGENT_MODE") == "1"
        is_mcp = os.environ.get("GW_MCP_MODE") == "1"

        success = True
        error_type = None
        error_message = None
        exit_code = 0

        try:
            result = super().invoke(ctx)
            return result
        except click.ClickException as e:
            success = False
            error_type = type(e).__name__
            error_message = str(e.message) if hasattr(e, 'message') else str(e)
            exit_code = e.exit_code if hasattr(e, 'exit_code') else 1
            raise
        except Exception as e:
            success = False
            error_type = type(e).__name__
            error_message = str(e)
            exit_code = 1
            raise
        finally:
            # Calculate duration
            duration_ms = int((time.time() - start_time) * 1000)

            # Record the metric (skip metrics commands)
            if command_group != "metrics":
                record_metric(
                    command_group=command_group,
                    command=command,
                    success=success,
                    exit_code=exit_code,
                    error_type=error_type,
                    error_message=error_message,
                    duration_ms=duration_ms,
                    is_write=is_write,
                    is_mcp=is_mcp,
                    agent_mode=agent_mode,
                )


def track_mcp_call(tool_name: str):
    """Decorator for MCP tool functions to track their execution."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            success = True
            error_type = None
            error_message = None

            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                error_type = type(e).__name__
                error_message = str(e)
                raise
            finally:
                duration_ms = int((time.time() - start_time) * 1000)

                # Parse tool name (e.g., "grove_db_query" -> "db", "query")
                parts = tool_name.replace("grove_", "").split("_", 1)
                command_group = parts[0] if parts else "unknown"
                command = parts[1] if len(parts) > 1 else parts[0]

                record_metric(
                    command_group=command_group,
                    command=command,
                    success=success,
                    error_type=error_type,
                    error_message=error_message,
                    duration_ms=duration_ms,
                    is_write=False,  # MCP tools determine this internally
                    is_mcp=True,
                    agent_mode=True,
                )

        return wrapper
    return decorator
