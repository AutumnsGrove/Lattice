"""Cloudflare binding commands for grove-find.

Provides: gf cf, gf cf d1, gf cf kv, gf cf r2, gf cf do
"""

from pathlib import Path
from typing import Optional
import typer

from grove_find.core.config import get_config
from grove_find.core.tools import discover_tools, run_tool
from grove_find.output import console, print_section, print_warning

app = typer.Typer(help="Cloudflare bindings")


def _run_rg(args: list[str], cwd: Path) -> str:
    """Run ripgrep with standard options."""
    tools = discover_tools()
    if not tools.rg:
        raise typer.Exit(1)

    config = get_config()
    base_args = ["--line-number", "--no-heading", "--smart-case"]
    excludes = ["--glob", "!node_modules", "--glob", "!.git", "--glob", "!dist"]

    if config.is_human_mode:
        base_args.append("--color=always")
    else:
        base_args.append("--color=never")

    result = run_tool(tools.rg, base_args + excludes + args, cwd=cwd)
    return result.stdout


@app.callback(invoke_without_command=True)
def cf_default(ctx: typer.Context) -> None:
    """Cloudflare bindings overview."""
    if ctx.invoked_subcommand is None:
        # Show all bindings
        config = get_config()

        print_section("Cloudflare Bindings Overview", "")

        # D1
        print_section("D1 Database", "")
        output = _run_rg(
            [
                "platform\\.env\\.DB|D1Database",
                "--type",
                "ts",
                "--type",
                "js",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:15]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (no D1 usage found)")

        # KV
        print_section("KV Namespaces", "")
        output = _run_rg(
            [
                "KVNamespace|platform\\.env\\.\\w*KV",
                "--type",
                "ts",
                "--type",
                "js",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:15]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (no KV usage found)")

        # R2
        print_section("R2 Buckets", "")
        output = _run_rg(
            [
                "R2Bucket|platform\\.env\\.\\w*BUCKET",
                "--type",
                "ts",
                "--type",
                "js",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:15]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (no R2 usage found)")

        # DO
        print_section("Durable Objects", "")
        output = _run_rg(
            [
                "DurableObject|\\.idFromName\\(",
                "--type",
                "ts",
                "--type",
                "js",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:15]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (no DO usage found)")


@app.command("d1")
def d1_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Table or pattern to search"),
) -> None:
    """Find D1 database usage."""
    config = get_config()

    if pattern:
        print_section(f"D1 usage matching: {pattern}", "")

        # Queries mentioning pattern
        print_section("Queries", "")
        output = _run_rg(
            [
                f"(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP).*{pattern}",
                "--type",
                "ts",
                "--type",
                "js",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            console.print_raw(output.rstrip())
        else:
            console.print("  (no queries found)")

        # Schema references
        print_section("Schema references", "")
        output = _run_rg(
            [
                pattern,
                "--glob",
                "*.sql",
                "--glob",
                "*schema*",
                "--glob",
                "*migration*",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            console.print_raw(output.rstrip())
        else:
            console.print("  (no schema references found)")
    else:
        print_section("D1 Database Usage", "")

        # Bindings
        print_section("D1 Database Bindings", "")
        output = _run_rg(
            [
                "platform\\.env\\.DB|env\\.DB|D1Database",
                "--type",
                "ts",
                "--type",
                "js",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:20]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # Query operations
        print_section("Query Operations", "")
        output = _run_rg(
            [
                "\\.prepare\\(|\\.exec\\(|\\.batch\\(",
                "--type",
                "ts",
                "--type",
                "js",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:30]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # SQL files
        print_section("SQL Files", "")
        tools = discover_tools()
        if tools.fd:
            result = run_tool(
                tools.fd,
                ["--exclude", "node_modules", "-e", "sql", ".", str(config.grove_root)],
                cwd=config.grove_root,
            )
            if result.stdout:
                lines = result.stdout.strip().split("\n")[:20]
                console.print_raw("\n".join(lines))
            else:
                console.print("  (none found)")

        # Wrangler config
        print_section("Wrangler D1 Config", "")
        output = _run_rg(
            [
                "\\[\\[d1_databases\\]\\]",
                "-A",
                "5",
                "--glob",
                "wrangler*.toml",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            console.print_raw(output.rstrip())
        else:
            console.print("  (not configured in wrangler.toml)")


@app.command("kv")
def kv_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Key pattern to search"),
) -> None:
    """Find KV namespace usage."""
    config = get_config()

    if pattern:
        print_section(f"KV usage matching: {pattern}", "")
        output = _run_rg(
            [pattern, "--type", "ts", "--type", "js", str(config.grove_root)],
            cwd=config.grove_root,
        )
        if output:
            # Filter for KV-related
            lines = [
                l
                for l in output.strip().split("\n")
                if any(
                    kw in l.lower() for kw in ["kv", "namespace", "cache", "session"]
                )
            ]
            if lines:
                console.print_raw("\n".join(lines[:30]))
            else:
                console.print("  (no KV-related matches)")
        else:
            console.print("  (no matches)")
    else:
        print_section("KV Namespace Usage", "")

        # Bindings
        print_section("KV Namespace Bindings", "")
        output = _run_rg(
            [
                "KVNamespace|platform\\.env\\.\\w*KV|env\\.\\w*KV",
                "--type",
                "ts",
                "--type",
                "js",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:20]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # Operations
        print_section("KV Operations", "")
        output = _run_rg(
            [
                "\\w+KV\\.(get|put|delete|list|getWithMetadata)\\(",
                "--type",
                "ts",
                "--type",
                "js",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:30]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # Wrangler config
        print_section("Wrangler KV Config", "")
        output = _run_rg(
            [
                "\\[\\[kv_namespaces\\]\\]",
                "-A",
                "5",
                "--glob",
                "wrangler*.toml",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            console.print_raw(output.rstrip())
        else:
            console.print("  (not configured)")


@app.command("r2")
def r2_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Pattern to search"),
) -> None:
    """Find R2 storage usage."""
    config = get_config()

    if pattern:
        print_section(f"R2 usage matching: {pattern}", "")
        output = _run_rg(
            [pattern, "--type", "ts", "--type", "js", str(config.grove_root)],
            cwd=config.grove_root,
        )
        if output:
            lines = [
                l
                for l in output.strip().split("\n")
                if any(
                    kw in l.lower()
                    for kw in ["r2", "bucket", "storage", "upload", "blob"]
                )
            ]
            if lines:
                console.print_raw("\n".join(lines[:30]))
            else:
                console.print("  (no R2-related matches)")
        else:
            console.print("  (no matches)")
    else:
        print_section("R2 Storage Usage", "")

        # Bindings
        print_section("R2 Bucket Bindings", "")
        output = _run_rg(
            [
                "R2Bucket|platform\\.env\\.\\w*BUCKET|env\\.\\w*BUCKET",
                "--type",
                "ts",
                "--type",
                "js",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:20]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # Operations
        print_section("R2 Operations", "")
        output = _run_rg(
            [
                "bucket\\.(put|get|head|delete|list)\\(",
                "--type",
                "ts",
                "--type",
                "js",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:30]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # Wrangler config
        print_section("Wrangler R2 Config", "")
        output = _run_rg(
            [
                "\\[\\[r2_buckets\\]\\]",
                "-A",
                "5",
                "--glob",
                "wrangler*.toml",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            console.print_raw(output.rstrip())
        else:
            console.print("  (not configured)")


@app.command("do")
def do_cmd(
    name: Optional[str] = typer.Argument(None, help="Durable Object name to search"),
) -> None:
    """Find Durable Object definitions and usage."""
    config = get_config()

    if name:
        print_section(f"Durable Objects matching: {name}", "")
        output = _run_rg(
            [name, "--type", "ts", "--type", "js", str(config.grove_root)],
            cwd=config.grove_root,
        )
        if output:
            lines = [
                l
                for l in output.strip().split("\n")
                if any(kw in l.lower() for kw in ["durable", "do", "stub", "idfrom"])
            ]
            if lines:
                console.print_raw("\n".join(lines[:30]))
            else:
                console.print("  (no DO-related matches)")
        else:
            console.print("  (no matches)")
    else:
        print_section("Durable Objects", "")

        # Class definitions
        print_section("DO Class Definitions", "")
        output = _run_rg(
            [
                "export\\s+class\\s+\\w+.*implements\\s+DurableObject|extends\\s+DurableObject",
                "--type",
                "ts",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            console.print_raw(output.rstrip())
        else:
            console.print("  (none found)")

        # DO files
        print_section("DO Files (by naming)", "")
        tools = discover_tools()
        if tools.fd:
            result = run_tool(
                tools.fd,
                [
                    "--exclude",
                    "node_modules",
                    "-i",
                    "do\\.|durable",
                    "-e",
                    "ts",
                    str(config.grove_root),
                ],
                cwd=config.grove_root,
            )
            if result.stdout:
                lines = result.stdout.strip().split("\n")[:20]
                console.print_raw("\n".join(lines))
            else:
                console.print("  (none found)")

        # Stub usage
        print_section("DO Stub Usage", "")
        output = _run_rg(
            [
                "\\.idFromName\\(|\\.idFromString\\(|\\.get\\(.*DurableObjectId",
                "--type",
                "ts",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:20]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # Wrangler config
        print_section("Wrangler DO Bindings", "")
        output = _run_rg(
            [
                "\\[durable_objects\\]",
                "-A",
                "10",
                "--glob",
                "wrangler*.toml",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            console.print_raw(output.rstrip()[:500])
        else:
            console.print("  (not configured)")
