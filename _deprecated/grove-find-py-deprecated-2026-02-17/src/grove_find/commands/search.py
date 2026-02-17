"""Core search commands for grove-find.

Provides: gf search, gf class, gf func, gf usage, gf imports
"""

from pathlib import Path
from typing import Optional
import typer

from grove_find.core.config import get_config
from grove_find.core.tools import discover_tools, find_files, run_tool
from grove_find.output import console, print_section, print_warning

app = typer.Typer(help="Search commands")

# Standard exclusions for all searches
EXCLUDE_GLOBS = [
    "--glob",
    "!node_modules",
    "--glob",
    "!.git",
    "--glob",
    "!dist",
    "--glob",
    "!build",
    "--glob",
    "!*.lock",
    "--glob",
    "!pnpm-lock.yaml",
]


def _run_rg(args: list[str], cwd: Path) -> str:
    """Run ripgrep with standard options."""
    tools = discover_tools()
    if not tools.rg:
        raise typer.Exit(1)

    config = get_config()
    base_args = [
        "--line-number",
        "--no-heading",
        "--smart-case",
    ]

    # Add color based on mode
    if config.is_human_mode:
        base_args.append("--color=always")
    else:
        base_args.append("--color=never")

    result = run_tool(tools.rg, base_args + EXCLUDE_GLOBS + args, cwd=cwd)
    return result.stdout


def _run_fd(args: list[str], cwd: Path) -> str:
    """Run fd with standard options. Returns empty string if fd is not installed."""
    tools = discover_tools()
    if not tools.fd:
        return ""

    config = get_config()
    base_args = ["--exclude", "node_modules", "--exclude", "dist", "--exclude", ".git"]

    # Add color based on mode
    if config.is_human_mode:
        base_args.append("--color=always")
    else:
        base_args.append("--color=never")

    result = run_tool(tools.fd, base_args + args, cwd=cwd)
    return result.stdout


def search_command(pattern: str, path: Optional[str] = None, file_type: Optional[str] = None) -> None:
    """General search across the codebase."""
    config = get_config()
    search_path = Path(path) if path else config.grove_root

    print_section(f"Searching for: {pattern}", "")

    # Build ripgrep args with optional type filter
    rg_args = [pattern]
    if file_type:
        # Map common extensions to ripgrep types or globs
        type_map = {
            "svelte": ["--glob", "*.svelte"],
            "ts": ["--type", "ts"],
            "typescript": ["--type", "ts"],
            "js": ["--type", "js"],
            "javascript": ["--type", "js"],
            "py": ["--type", "py"],
            "python": ["--type", "py"],
            "rust": ["--type", "rust"],
            "go": ["--type", "go"],
            "md": ["--type", "markdown"],
            "markdown": ["--type", "markdown"],
        }

        # Use mapping if available, otherwise assume it's a ripgrep type
        if file_type.lower() in type_map:
            rg_args.extend(type_map[file_type.lower()])
        else:
            # Pass through to ripgrep --type (e.g., "java", "ruby", etc.)
            rg_args.extend(["--type", file_type.lower()])

    rg_args.append(str(search_path))

    output = _run_rg(rg_args, cwd=config.grove_root)
    if output:
        console.print_raw(output.rstrip())
    else:
        print_warning("No results found")


@app.command("pattern")
def search_cmd(
    pattern: str = typer.Argument(..., help="Search pattern"),
    path: Optional[str] = typer.Option(
        None, "--path", "-p", help="Limit search to path"
    ),
    file_type: Optional[str] = typer.Option(
        None, "--type", "-t", help="Filter by file type (svelte, ts, js, py, etc.)"
    ),
) -> None:
    """General search across the codebase."""
    search_command(pattern, path, file_type)


def class_command(name: str) -> None:
    """Find class/component definitions."""
    config = get_config()

    print_section(f"Finding class/component: {name}", "")

    # Search for Svelte component files (uses fd with rg --files fallback)
    print_section("Svelte Components", "")
    file_output = find_files(name, extensions=["svelte"], cwd=config.grove_root)
    if file_output and file_output.strip():
        console.print_raw(file_output.rstrip())
    else:
        console.print("  (no Svelte components found)")

    # Search for component exports inside .svelte files
    print_section("Component Exports", "")
    rg_output = _run_rg(
        [
            f"(export\\s+(let|const|interface)\\s+.*{name}|<script.*>.*{name})",
            "--glob", "*.svelte",
            str(config.grove_root),
        ],
        cwd=config.grove_root,
    )
    if rg_output:
        lines = rg_output.strip().split("\n")[:20]
        console.print_raw("\n".join(lines))
    else:
        console.print("  (no component exports found)")

    # Search for class definitions
    print_section("Class Definitions", "")
    rg_output = _run_rg(
        [f"class\\s+{name}", "--type", "ts", "--type", "js", str(config.grove_root)],
        cwd=config.grove_root,
    )
    if rg_output:
        console.print_raw(rg_output.rstrip())
    else:
        console.print("  (no class definitions found)")

    # Search for type/interface definitions
    print_section("Type/Interface Definitions", "")
    rg_output = _run_rg(
        [f"(interface|type)\\s+{name}", "--type", "ts", str(config.grove_root)],
        cwd=config.grove_root,
    )
    if rg_output:
        console.print_raw(rg_output.rstrip())
    else:
        console.print("  (no type/interface definitions found)")


@app.command("class")
def class_cmd(
    name: str = typer.Argument(..., help="Class or component name"),
) -> None:
    """Find class/component definitions."""
    class_command(name)


def func_command(name: str) -> None:
    """Find function definitions."""
    config = get_config()

    print_section(f"Finding function: {name}", "")

    # Pattern matches various function definition styles
    pattern = (
        f"(function\\s+{name}|"
        f"const\\s+{name}\\s*=|"
        f"let\\s+{name}\\s*=|"
        f"export\\s+(async\\s+)?function\\s+{name}|"
        f"{name}\\s*[:=]\\s*(async\\s+)?\\()"
    )

    output = _run_rg(
        [pattern, "--glob", "*.{ts,js,svelte}", str(config.grove_root)],
        cwd=config.grove_root,
    )

    if output:
        console.print_raw(output.rstrip())
    else:
        print_warning(f"No function '{name}' found")


@app.command("func")
def func_cmd(
    name: str = typer.Argument(..., help="Function name"),
) -> None:
    """Find function definitions."""
    func_command(name)


def usage_command(name: str) -> None:
    """Find where a component/function is used."""
    config = get_config()

    print_section(f"Finding usage of: {name}", "")

    # Search for imports
    print_section("Imports", "")
    import_pattern = (
        f"import.*\\{{[^}}]*\\b{name}\\b[^}}]*\\}}|"
        f"import\\s+{name}\\s+from|"
        f"import\\s+\\*\\s+as\\s+{name}"
    )
    rg_output = _run_rg(
        [import_pattern, "--glob", "*.{ts,js,svelte}", str(config.grove_root)],
        cwd=config.grove_root,
    )
    if rg_output:
        lines = rg_output.strip().split("\n")
        console.print_raw("\n".join(lines[:25]))
        if len(lines) > 25:
            console.print(f"  ... and {len(lines) - 25} more")
    else:
        console.print("  (no imports found)")

    # Search for JSX/Svelte usage
    print_section("JSX/Svelte Usage", "")
    jsx_pattern = f"<{name}[\\s/>]"
    rg_output = _run_rg(
        [jsx_pattern, "--glob", "*.svelte", str(config.grove_root)],
        cwd=config.grove_root,
    )
    if rg_output:
        lines = rg_output.strip().split("\n")
        console.print_raw("\n".join(lines[:25]))
        if len(lines) > 25:
            console.print(f"  ... and {len(lines) - 25} more")
    else:
        console.print("  (no JSX/Svelte usage found)")

    # Search for function calls
    print_section("Function Calls", "")
    call_pattern = f"\\b{name}\\s*\\("
    rg_output = _run_rg(
        [call_pattern, "--glob", "*.{ts,js,svelte}", str(config.grove_root)],
        cwd=config.grove_root,
    )
    if rg_output:
        # Filter out definitions
        lines = [
            line
            for line in rg_output.strip().split("\n")
            if not any(
                kw in line
                for kw in ["function ", "const ", "let ", "var ", "import ", "export "]
            )
        ]
        if lines:
            console.print_raw("\n".join(lines[:25]))
            if len(lines) > 25:
                console.print(f"  ... and {len(lines) - 25} more")
        else:
            console.print("  (no function calls found)")
    else:
        console.print("  (no function calls found)")


@app.command("usage")
def usage_cmd(
    name: str = typer.Argument(..., help="Component or function name"),
) -> None:
    """Find where a component/function is used."""
    usage_command(name)


def imports_command(module: str) -> None:
    """Find imports of a module."""
    config = get_config()

    print_section(f"Finding imports of: {module}", "")

    pattern = f"import.*['\"].*{module}"
    output = _run_rg(
        [pattern, "--glob", "*.{ts,js,svelte}", str(config.grove_root)],
        cwd=config.grove_root,
    )

    if output:
        console.print_raw(output.rstrip())
    else:
        print_warning(f"No imports of '{module}' found")


@app.command("imports")
def imports_cmd(
    module: str = typer.Argument(..., help="Module name"),
) -> None:
    """Find imports of a module."""
    imports_command(module)
