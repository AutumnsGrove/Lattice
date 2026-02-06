"""File type search commands for grove-find.

Provides: gf svelte, gf ts, gf js, gf css, gf md, gf json, gf toml, gf yaml, gf html, gf shell
Also: gf test, gf config

When fd is not installed, falls back to `rg --files` with glob patterns.
"""

import subprocess
from pathlib import Path
from typing import Optional
import typer

from grove_find.core.config import get_config
from grove_find.core.tools import discover_tools, run_tool
from grove_find.output import console, print_section, print_warning

app = typer.Typer(help="File type searches")


def _find_files(
    extensions: list[str],
    cwd: Path,
    pattern: Optional[str] = None,
    excludes: Optional[list[str]] = None,
    limit: int = 50,
) -> str:
    """Find files by extension using fd (preferred) or rg --files (fallback).

    Args:
        extensions: File extensions to match (e.g. ["svelte"], ["yml", "yaml"])
        cwd: Working directory for the search
        pattern: Optional filename pattern filter
        excludes: Optional glob patterns to exclude (e.g. ["*.d.ts"])
        limit: Max results before truncating
    """
    tools = discover_tools()
    config = get_config()

    if tools.fd:
        # Preferred: use fd
        args = ["--exclude", "node_modules", "--exclude", "dist", "--exclude", ".git"]
        if config.is_human_mode:
            args.append("--color=always")
        else:
            args.append("--color=never")
        for ext in extensions:
            args.extend(["-e", ext])
        if excludes:
            for exc in excludes:
                args.extend(["--exclude", exc])
        if pattern:
            args.append(pattern)
        else:
            args.append(".")
        args.append(str(cwd))
        result = run_tool(tools.fd, args, cwd=cwd)
        output = result.stdout
    else:
        # Fallback: use rg --files with glob patterns
        args = ["--files", "--sort", "path"]
        for ext in extensions:
            args.extend(["-g", f"*.{ext}"])
        if excludes:
            for exc in excludes:
                args.extend(["-g", f"!{exc}"])
        args.append(str(cwd))
        result = run_tool(tools.rg, args, cwd=cwd)
        output = result.stdout
        # If pattern specified, filter the results
        if pattern and output:
            lines = output.strip().split("\n")
            filtered = [l for l in lines if pattern.lower() in l.lower()]
            output = "\n".join(filtered) + "\n" if filtered else ""

    lines = output.strip().split("\n") if output.strip() else []
    if len(lines) > limit:
        return "\n".join(lines[:limit]) + f"\n\n(Showing first {limit} results. Add a pattern to filter.)"
    return output


def _find_files_regex(
    regex: str,
    cwd: Path,
    limit: int = 50,
) -> str:
    """Find files matching a regex pattern using fd or rg --files.

    Args:
        regex: Regex pattern for fd, or translated to globs for rg
        cwd: Working directory
        limit: Max results
    """
    tools = discover_tools()
    config = get_config()

    if tools.fd:
        args = ["--exclude", "node_modules", "--exclude", "dist", "--exclude", ".git"]
        if config.is_human_mode:
            args.append("--color=always")
        else:
            args.append("--color=never")
        args.extend([regex, str(cwd)])
        result = run_tool(tools.fd, args, cwd=cwd)
        output = result.stdout
    else:
        # Fallback: use rg --files then filter with grep-style matching
        args = ["--files", "--sort", "path", str(cwd)]
        result = run_tool(tools.rg, args, cwd=cwd)
        if result.stdout:
            import re
            lines = result.stdout.strip().split("\n")
            try:
                compiled = re.compile(regex)
                filtered = [l for l in lines if compiled.search(l)]
            except re.error:
                filtered = [l for l in lines if regex in l]
            output = "\n".join(filtered) + "\n" if filtered else ""
        else:
            output = ""

    lines = output.strip().split("\n") if output.strip() else []
    if len(lines) > limit:
        return "\n".join(lines[:limit]) + f"\n\n(Showing first {limit} results.)"
    return output


def _find_dirs(
    pattern: str,
    cwd: Path,
    limit: int = 20,
) -> str:
    """Find directories matching a pattern using fd or find (fallback).

    Args:
        pattern: Directory name pattern (regex for fd, glob for find)
        cwd: Working directory
        limit: Max results
    """
    tools = discover_tools()

    if tools.fd:
        config = get_config()
        args = ["--exclude", "node_modules", "--exclude", "dist", "--exclude", ".git"]
        if config.is_human_mode:
            args.append("--color=always")
        else:
            args.append("--color=never")
        args.extend(["-t", "d", pattern, str(cwd)])
        result = run_tool(tools.fd, args, cwd=cwd)
        output = result.stdout
    else:
        # Fallback: use find
        result = subprocess.run(
            [
                "find", str(cwd),
                "-type", "d",
                "-regextype", "posix-extended",
                "-regex", f".*({pattern})",
                "-not", "-path", "*/node_modules/*",
                "-not", "-path", "*/.git/*",
                "-not", "-path", "*/dist/*",
            ],
            capture_output=True, text=True, cwd=cwd,
        )
        output = result.stdout

    lines = output.strip().split("\n") if output.strip() else []
    if len(lines) > limit:
        return "\n".join(lines[:limit])
    return output


def _file_search(
    extension: str,
    pattern: Optional[str],
    description: str,
    excludes: Optional[list[str]] = None,
) -> None:
    """Generic file search by extension."""
    config = get_config()

    if pattern:
        print_section(f"{description} matching: {pattern}", "")
    else:
        print_section(description, "")

    output = _find_files(
        extensions=[extension],
        cwd=config.grove_root,
        pattern=pattern,
        excludes=excludes,
    )
    if output.strip():
        console.print_raw(output.rstrip())
    else:
        print_warning("No files found")


def svelte_command(pattern: Optional[str] = None) -> None:
    """Find Svelte component files."""
    _file_search("svelte", pattern, "Svelte components")


@app.command("svelte")
def svelte_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find Svelte component files."""
    svelte_command(pattern)


def ts_command(pattern: Optional[str] = None) -> None:
    """Find TypeScript files."""
    _file_search("ts", pattern, "TypeScript files", excludes=["*.d.ts"])


@app.command("ts")
def ts_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find TypeScript files."""
    ts_command(pattern)


def js_command(pattern: Optional[str] = None) -> None:
    """Find JavaScript files."""
    _file_search("js", pattern, "JavaScript files", excludes=["*.min.js"])


@app.command("js")
def js_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find JavaScript files."""
    js_command(pattern)


def css_command(pattern: Optional[str] = None) -> None:
    """Find CSS files."""
    _file_search("css", pattern, "CSS files", excludes=["*.min.css"])


@app.command("css")
def css_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find CSS files."""
    css_command(pattern)


def md_command(pattern: Optional[str] = None) -> None:
    """Find Markdown files."""
    _file_search("md", pattern, "Markdown files")


@app.command("md")
def md_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find Markdown files."""
    md_command(pattern)


def json_command(pattern: Optional[str] = None) -> None:
    """Find JSON files."""
    _file_search("json", pattern, "JSON files", excludes=["package-lock.json"])


@app.command("json")
def json_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find JSON files."""
    json_command(pattern)


def toml_command(pattern: Optional[str] = None) -> None:
    """Find TOML files."""
    _file_search("toml", pattern, "TOML files")


@app.command("toml")
def toml_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find TOML files."""
    toml_command(pattern)


def yaml_command(pattern: Optional[str] = None) -> None:
    """Find YAML files."""
    config = get_config()

    if pattern:
        print_section(f"YAML files matching: {pattern}", "")
    else:
        print_section("YAML files", "")

    output = _find_files(
        extensions=["yml", "yaml"],
        cwd=config.grove_root,
        pattern=pattern,
    )
    if output.strip():
        console.print_raw(output.rstrip())
    else:
        print_warning("No files found")


@app.command("yaml")
def yaml_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find YAML files."""
    yaml_command(pattern)


def html_command(pattern: Optional[str] = None) -> None:
    """Find HTML files."""
    _file_search("html", pattern, "HTML files")


@app.command("html")
def html_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find HTML files."""
    html_command(pattern)


def shell_command(pattern: Optional[str] = None) -> None:
    """Find shell script files."""
    config = get_config()

    if pattern:
        print_section(f"Shell scripts matching: {pattern}", "")
    else:
        print_section("Shell scripts", "")

    output = _find_files(
        extensions=["sh", "bash", "zsh"],
        cwd=config.grove_root,
        pattern=pattern,
    )
    if output.strip():
        console.print_raw(output.rstrip())
    else:
        print_warning("No files found")


@app.command("shell")
def shell_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find shell script files."""
    shell_command(pattern)


def test_command(name: Optional[str] = None) -> None:
    """Find test files."""
    config = get_config()

    if name:
        print_section(f"Test files matching: {name}", "")
    else:
        print_section("Test files", "")

    output = _find_files_regex(
        regex=r"\.(test|spec)\.(ts|js)$",
        cwd=config.grove_root,
    )
    output = output.strip()

    if name and output:
        lines = [line for line in output.split("\n") if name.lower() in line.lower()]
        if lines:
            console.print_raw("\n".join(lines[:30]))
        else:
            print_warning("No matching test files found")
    elif output:
        lines = output.split("\n")
        console.print_raw("\n".join(lines[:30]))
        if len(lines) > 30:
            console.print(f"\n(Showing first 30 of {len(lines)} test files)")
    else:
        print_warning("No test files found")

    # Also show test directories
    print_section("Test Directories", "")
    dir_output = _find_dirs(
        pattern=r"test|tests|__tests__",
        cwd=config.grove_root,
    )
    if dir_output.strip():
        lines = dir_output.strip().split("\n")
        console.print_raw("\n".join(lines[:20]))
    else:
        console.print("  (no test directories found)")


@app.command("test")
def test_cmd(
    name: Optional[str] = typer.Argument(None, help="Test file name filter"),
) -> None:
    """Find test files."""
    test_command(name)


def config_command(name: Optional[str] = None) -> None:
    """Find configuration files."""
    config = get_config()

    if name:
        print_section(f"Configuration files matching: {name}", "")
    else:
        print_section("Configuration files", "")

    if name:
        # Search for specific config by name
        output = _find_files_regex(
            regex=name,
            cwd=config.grove_root,
        )
        if output.strip():
            lines = [
                line
                for line in output.strip().split("\n")
                if any(
                    kw in line.lower()
                    for kw in ["config", "rc", ".toml", ".json", ".yaml", ".yml"]
                )
            ]
            if lines:
                console.print_raw("\n".join(lines))
            else:
                print_warning("No matching config files found")
        else:
            print_warning("No matching config files found")
    else:
        # Show categorized config files
        print_section("Build & Bundler Configs", "")
        output = _find_files_regex(
            regex=r"(vite|svelte|tailwind|postcss|tsconfig|jsconfig)\.config\.(js|ts|mjs)",
            cwd=config.grove_root,
        )
        if output.strip():
            console.print_raw(output.rstrip())
        else:
            console.print("  (none found)")

        print_section("Wrangler Configs", "")
        output = _find_files(
            extensions=["toml"],
            cwd=config.grove_root,
            pattern="wrangler",
        )
        if output.strip():
            console.print_raw(output.rstrip())
        else:
            console.print("  (none found)")

        print_section("Package Configs", "")
        output = _find_files_regex(
            regex=r"package\.json$",
            cwd=config.grove_root,
        )
        if output.strip():
            lines = output.strip().split("\n")
            console.print_raw("\n".join(lines[:20]))
        else:
            console.print("  (none found)")

        print_section("TypeScript Configs", "")
        output = _find_files(
            extensions=["json"],
            cwd=config.grove_root,
            pattern="tsconfig",
        )
        if output.strip():
            console.print_raw(output.rstrip())
        else:
            console.print("  (none found)")


@app.command("config")
def config_cmd(
    name: Optional[str] = typer.Argument(None, help="Config file name filter"),
) -> None:
    """Find configuration files."""
    config_command(name)
