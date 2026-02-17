"""Code quality and domain-specific commands for grove-find.

Provides: gf type, gf export, gf auth, gf engine, gf routes, gf db, gf glass, gf store
"""

from pathlib import Path
from typing import Optional
import typer

from grove_find.core.config import get_config
from grove_find.core.tools import discover_tools, find_files, find_files_by_glob, run_tool
from grove_find.output import console, print_section, print_warning

app = typer.Typer(help="Code quality commands")


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


def _run_fd(args: list[str], cwd: Path) -> str:
    """Run fd with standard options. Returns empty string if fd is not installed."""
    tools = discover_tools()
    if not tools.fd:
        return ""

    config = get_config()
    base_args = ["--exclude", "node_modules", "--exclude", "dist", "--exclude", ".git"]

    if config.is_human_mode:
        base_args.append("--color=always")
    else:
        base_args.append("--color=never")

    result = run_tool(tools.fd, base_args + args, cwd=cwd)
    return result.stdout


def type_command(name: Optional[str] = None) -> None:
    """Find TypeScript type/interface definitions."""
    config = get_config()

    if name:
        print_section(f"Finding type: {name}", "")

        # Definition
        output = _run_rg(
            [
                f"(type|interface|enum)\\s+{name}",
                "--type",
                "ts",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            console.print_raw(output.rstrip())
        else:
            console.print("  (no definition found)")

        # Usage
        print_section(f"Usage of {name}", "")
        output = _run_rg(
            [
                f":\\s*{name}\\b|<{name}>|as\\s+{name}",
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
            console.print("  (no usage found)")
    else:
        print_section("TypeScript Types", "")

        # Type definitions
        print_section("Type Definitions", "")
        output = _run_rg(
            [
                "^export\\s+(type|interface)\\s+\\w+",
                "--glob",
                "!*.d.ts",
                "--type",
                "ts",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:30]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # Enums
        print_section("Enums", "")
        output = _run_rg(
            ["^export\\s+enum\\s+\\w+", "--type", "ts", str(config.grove_root)],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:15]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # Type files
        print_section("Type Files", "")
        output = _run_fd(
            ["types?", "-e", "ts", "--exclude", "*.d.ts", str(config.grove_root)],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:20]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")


@app.command("type")
def type_cmd(
    name: Optional[str] = typer.Argument(None, help="Type name to find"),
) -> None:
    """Find TypeScript type/interface definitions."""
    type_command(name)


def export_command(pattern: Optional[str] = None) -> None:
    """Find module exports."""
    config = get_config()

    if pattern:
        print_section(f"Exports matching: {pattern}", "")

        output = _run_rg(
            [
                f"export\\s+(default\\s+)?(const|let|function|class|type|interface|enum)\\s+.*{pattern}",
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
            console.print("  (no exports found)")

        # Re-exports
        print_section("Re-exports", "")
        output = _run_rg(
            [
                f"export\\s+\\{{[^}}]*{pattern}",
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
            console.print("  (none found)")
    else:
        print_section("Module Exports", "")

        # Default exports
        print_section("Default Exports", "")
        output = _run_rg(
            ["export\\s+default", "--glob", "*.{ts,js,svelte}", str(config.grove_root)],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:20]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # Named exports
        print_section("Named Exports", "")
        output = _run_rg(
            [
                "^export\\s+(const|let|function|class|async function)",
                "--type",
                "ts",
                "--type",
                "js",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:25]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # Barrel exports
        print_section("Barrel Exports (index.ts)", "")
        output = _run_fd(["index.ts", str(config.grove_root)], cwd=config.grove_root)
        if output:
            lines = output.strip().split("\n")[:20]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")


@app.command("export")
def export_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Export pattern to filter"),
) -> None:
    """Find module exports."""
    export_command(pattern)


def auth_command(aspect: Optional[str] = None) -> None:
    """Find authentication code."""
    config = get_config()

    if aspect:
        print_section(f"Auth code related to: {aspect}", "")
        output = _run_rg(
            [aspect, "--glob", "*.{ts,js,svelte}", str(config.grove_root)],
            cwd=config.grove_root,
        )
        if output:
            lines = [
                l
                for l in output.strip().split("\n")
                if any(
                    kw in l.lower()
                    for kw in [
                        "auth",
                        "session",
                        "token",
                        "login",
                        "logout",
                        "user",
                        "credential",
                        "oauth",
                        "jwt",
                    ]
                )
            ]
            if lines:
                console.print_raw("\n".join(lines[:30]))
            else:
                console.print("  (no auth-related matches)")
        else:
            console.print("  (no matches)")
    else:
        print_section("Authentication Code", "")

        # Auth files
        print_section("Auth Files", "")
        output = _run_fd(
            [
                "-i",
                "auth|login|session",
                "-e",
                "ts",
                "-e",
                "js",
                "-e",
                "svelte",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:20]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # Session handling
        print_section("Session Handling", "")
        output = _run_rg(
            [
                "(session|getSession|createSession|destroySession)",
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

        # Token operations
        print_section("Token Operations", "")
        output = _run_rg(
            [
                "(token|jwt|accessToken|refreshToken|bearer)",
                "-i",
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
            console.print("  (none found)")

        # Heartwood/GroveAuth
        print_section("Heartwood/GroveAuth", "")
        output = _run_rg(
            [
                "(heartwood|groveauth|GroveAuth)",
                "-i",
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
            console.print("  (none found)")


@app.command("auth")
def auth_cmd(
    aspect: Optional[str] = typer.Argument(
        None, help="Auth aspect (session, token, etc.)"
    ),
) -> None:
    """Find authentication code."""
    auth_command(aspect)


def engine_command(module: Optional[str] = None) -> None:
    """Find @autumnsgrove/lattice imports."""
    config = get_config()

    if module:
        print_section(f"Engine imports from: {module}", "")
        output = _run_rg(
            [
                f"@autumnsgrove/lattice/{module}",
                "--glob",
                "!packages/engine",
                "--glob",
                "*.{ts,js,svelte}",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            console.print_raw(output.rstrip())
        else:
            console.print("  (no imports found)")
    else:
        print_section("Engine Imports by Module", "")

        # UI Components
        print_section("UI Components", "")
        output = _run_rg(
            [
                "@autumnsgrove/lattice/ui",
                "--glob",
                "!packages/engine",
                "--glob",
                "*.{ts,js,svelte}",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:15]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # Utilities
        print_section("Utilities", "")
        output = _run_rg(
            [
                "@autumnsgrove/lattice/utils",
                "--glob",
                "!packages/engine",
                "--glob",
                "*.{ts,js,svelte}",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:10]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # Stores
        print_section("Stores", "")
        output = _run_rg(
            [
                "@autumnsgrove/lattice/ui/stores",
                "--glob",
                "!packages/engine",
                "--glob",
                "*.{ts,js,svelte}",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:10]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # Auth
        print_section("Auth", "")
        output = _run_rg(
            [
                "@autumnsgrove/lattice/auth",
                "--glob",
                "!packages/engine",
                "--glob",
                "*.{ts,js,svelte}",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:10]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # Apps using engine
        print_section("Apps using the engine", "")
        output = _run_rg(
            [
                "@autumnsgrove/lattice",
                "-l",
                "--glob",
                "!packages/engine",
                "--glob",
                "*.{ts,js,svelte}",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            # Extract unique directories
            dirs = set()
            for line in output.strip().split("\n"):
                parts = line.split("/")
                if len(parts) > 1:
                    dirs.add(parts[0])
            console.print_raw("\n".join(sorted(dirs)))
        else:
            console.print("  (none found)")


@app.command("engine")
def engine_cmd(
    module: Optional[str] = typer.Argument(
        None, help="Engine module (ui, stores, utils)"
    ),
) -> None:
    """Find @autumnsgrove/lattice imports."""
    engine_command(module)


def routes_command(pattern: Optional[str] = None, guards: bool = False) -> None:
    """Find SvelteKit routes."""
    config = get_config()

    if guards:
        print_section("Route Guards (Auth/Redirect)", "")

        # Find +page.server.ts and +layout.server.ts with auth patterns
        print_section("Server Load Functions with Auth", "")
        output = _run_rg(
            [
                "(redirect|session|auth|locals\\.user|locals\\.session)",
                "--glob", "**/+page.server.ts",
                "--glob", "**/+layout.server.ts",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:30]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (no auth guards found)")

        # Find hooks with auth
        print_section("Auth Hooks (hooks.server.ts)", "")
        output = _run_rg(
            [
                "(handle|auth|session|redirect)",
                "--glob", "**/hooks.server.ts",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:20]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (no auth hooks found)")

        # Protected vs public routes summary
        print_section("Protected Routes Summary", "")
        server_files = find_files_by_glob("**/+page.server.ts", cwd=config.grove_root)
        if server_files and server_files.strip():
            protected = []
            for filepath in server_files.strip().split("\n"):
                filepath = filepath.strip()
                if not filepath or "node_modules" in filepath:
                    continue
                try:
                    content = Path(filepath).read_text()
                    if any(kw in content for kw in ["redirect", "session", "locals.user"]):
                        try:
                            rel = str(Path(filepath).relative_to(config.grove_root))
                        except ValueError:
                            rel = filepath
                        protected.append(rel)
                except OSError:
                    continue
            if protected:
                console.print(f"  {len(protected)} protected routes:")
                for route in protected[:15]:
                    console.print(f"    {route}")
                if len(protected) > 15:
                    console.print(f"    ... and {len(protected) - 15} more")
            else:
                console.print("  (no protected routes detected)")
        return

    if pattern:
        print_section(f"SvelteKit routes matching: {pattern}", "")

        # Find page routes matching pattern (uses fd with rg fallback)
        output = find_files_by_glob("**/+page.svelte", cwd=config.grove_root)
        if output and output.strip():
            lines = [
                l for l in output.strip().split("\n") if pattern.lower() in l.lower()
            ]
            if lines:
                console.print_raw("\n".join(lines[:30]))
            else:
                console.print("  (no matching page routes)")
        else:
            console.print("  (no page routes found)")

        # Find API routes matching pattern
        output = find_files_by_glob("**/+server.ts", cwd=config.grove_root)
        if output and output.strip():
            lines = [
                l for l in output.strip().split("\n") if pattern.lower() in l.lower()
            ]
            if lines:
                console.print_raw("\n".join(lines[:30]))
            else:
                console.print("  (no matching API routes)")
    else:
        print_section("SvelteKit Routes", "")

        # Page routes
        print_section("Page Routes", "")
        output = find_files_by_glob("**/+page.svelte", cwd=config.grove_root)
        if output and output.strip():
            lines = output.strip().split("\n")[:30]
            console.print_raw("\n".join(lines))
            console.print(f"  ({len(output.strip().split(chr(10)))} total)")
        else:
            console.print("  (none found)")

        # API routes
        print_section("API Routes", "")
        output = find_files_by_glob("**/+server.ts", cwd=config.grove_root)
        if output and output.strip():
            lines = output.strip().split("\n")[:30]
            console.print_raw("\n".join(lines))
            console.print(f"  ({len(output.strip().split(chr(10)))} total)")
        else:
            console.print("  (none found)")

        # Layout routes
        print_section("Layouts", "")
        output = find_files_by_glob("**/+layout.svelte", cwd=config.grove_root)
        if output and output.strip():
            lines = output.strip().split("\n")[:20]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # Error pages
        print_section("Error Pages", "")
        output = find_files_by_glob("**/+error.svelte", cwd=config.grove_root)
        if output and output.strip():
            lines = output.strip().split("\n")[:20]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")


@app.command("routes")
def routes_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Route pattern to filter"),
    guards: bool = typer.Option(False, "--guards", "-g", help="Show auth guards and protected routes"),
) -> None:
    """Find SvelteKit routes."""
    routes_command(pattern, guards=guards)


def db_command(table: Optional[str] = None) -> None:
    """Find database queries."""
    config = get_config()

    if table:
        print_section(f"Database queries for: {table}", "")
        output = _run_rg(
            [
                f"(SELECT|INSERT|UPDATE|DELETE).*{table}",
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
    else:
        print_section("Database Queries", "")
        output = _run_rg(
            [
                "db\\.(prepare|exec|batch)",
                "--type",
                "ts",
                "--type",
                "js",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:50]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")


@app.command("db")
def db_cmd(
    table: Optional[str] = typer.Argument(None, help="Table name to search"),
) -> None:
    """Find database queries."""
    db_command(table)


def glass_command(variant: Optional[str] = None) -> None:
    """Find Glass component usage."""
    config = get_config()

    if variant:
        print_section(f"Glass components with variant: {variant}", "")
        output = _run_rg(
            [
                f"Glass.*variant.*['\\\"{variant}]",
                "--glob",
                "*.{svelte,ts}",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            console.print_raw(output.rstrip())
        else:
            console.print("  (none found)")
    else:
        print_section("Glass Component Usage", "")
        output = _run_rg(
            ["<Glass", "--glob", "*.svelte", str(config.grove_root)],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:50]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")


@app.command("glass")
def glass_cmd(
    variant: Optional[str] = typer.Argument(None, help="Glass variant to filter"),
) -> None:
    """Find Glass component usage."""
    glass_command(variant)


def store_command(name: Optional[str] = None) -> None:
    """Find Svelte stores and reactive state."""
    config = get_config()

    if name:
        print_section(f"Svelte stores/state matching: {name}", "")

        # Svelte 4 stores
        output = _run_rg(
            [
                f"(writable|readable|derived).*{name}|{name}.*(writable|readable|derived)",
                "--glob",
                "*.{ts,js,svelte}",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            console.print_raw(output.rstrip())

        # Svelte 5 runes
        rune_output = _run_rg(
            [
                f"(\\$state|\\$derived|\\$effect|\\$bindable).*{name}|{name}.*(\\$state|\\$derived|\\$effect|\\$bindable)",
                "--glob",
                "*.{ts,js,svelte}",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if rune_output:
            console.print_raw(rune_output.rstrip())

        if not output and not rune_output:
            console.print("  (none found)")
    else:
        print_section("Svelte Stores & Reactive State", "")

        # Store files (uses fd with rg fallback, exclude _deprecated)
        print_section("Store Files", "")
        output = find_files("store", extensions=["ts", "js"], cwd=config.grove_root)
        if output and output.strip():
            lines = [l for l in output.strip().split("\n") if "_deprecated" not in l]
            if lines:
                console.print_raw("\n".join(lines[:20]))
            else:
                console.print("  (none found)")
        else:
            console.print("  (none found)")

        # Svelte 4 store definitions
        print_section("Svelte 4 Stores (writable/readable/derived)", "")
        output = _run_rg(
            [
                "export\\s+(const|let).*=\\s*(writable|readable|derived)",
                "--type",
                "ts",
                "--type",
                "js",
                "--glob",
                "!_deprecated",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:30]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (none found)")

        # Svelte 5 rune-based reactive state
        print_section("Svelte 5 Runes ($state/$derived/$effect)", "")
        rune_output = _run_rg(
            [
                "\\$state\\(|\\$state\\.snapshot|\\$derived\\(|\\$derived\\.by|\\$effect\\(|\\$bindable\\(",
                "--glob",
                "*.{ts,js,svelte}",
                "--glob",
                "!_deprecated",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if rune_output:
            lines = rune_output.strip().split("\n")[:30]
            console.print_raw("\n".join(lines))
            total = len(rune_output.strip().split("\n"))
            if total > 30:
                console.print(f"  ... and {total - 30} more")
        else:
            console.print("  (none found)")


@app.command("store")
def store_cmd(
    name: Optional[str] = typer.Argument(None, help="Store name to filter"),
) -> None:
    """Find Svelte stores."""
    store_command(name)
