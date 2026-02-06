"""Infrastructure and health commands for grove-find.

Provides: gf large, gf orphaned, gf migrations, gf flags, gf workers, gf emails, gf deps, gf config
"""

import re
from pathlib import Path
from typing import Optional
import typer

from grove_find.core.config import get_config
from grove_find.core.tools import discover_tools, find_files, find_files_by_glob, run_tool
from grove_find.output import console, print_header, print_section, print_warning

app = typer.Typer(help="Infrastructure commands")


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


def _count_lines(file_path: Path) -> int:
    """Count lines in a file efficiently."""
    try:
        with open(file_path, "rb") as f:
            return sum(1 for _ in f)
    except (OSError, PermissionError):
        return 0


# =============================================================================
# gf large — Find oversized files
# =============================================================================


def large_command(threshold: int = 500) -> None:
    """Find files over N lines, sorted by size."""
    config = get_config()

    print_header(f"Files over {threshold} lines", "")

    # Find all source files
    extensions = ["svelte", "ts", "js"]
    all_files: list[tuple[int, str]] = []

    for ext in extensions:
        output = find_files("", extensions=[ext], cwd=config.grove_root)
        if output and output.strip():
            for filepath in output.strip().split("\n"):
                filepath = filepath.strip()
                if not filepath:
                    continue
                # Skip node_modules, dist, _deprecated, .git
                if any(skip in filepath for skip in ["node_modules", "/dist/", "/.git/"]):
                    continue
                line_count = _count_lines(Path(filepath))
                if line_count >= threshold:
                    all_files.append((line_count, filepath))

    all_files.sort(key=lambda x: -x[0])

    if not all_files:
        console.print(f"  No files over {threshold} lines found")
        return

    # Group by type
    svelte_files = [(c, f) for c, f in all_files if f.endswith(".svelte")]
    ts_files = [(c, f) for c, f in all_files if f.endswith(".ts") and not f.endswith(".test.ts") and not f.endswith(".spec.ts")]
    test_files = [(c, f) for c, f in all_files if ".test." in f or ".spec." in f]

    if svelte_files:
        print_section(f"Svelte Components ({len(svelte_files)})", "")
        for count, filepath in svelte_files[:15]:
            try:
                rel = str(Path(filepath).relative_to(config.grove_root))
            except ValueError:
                rel = filepath
            console.print(f"  {count:>5} lines  {rel}")

    if ts_files:
        print_section(f"TypeScript/JavaScript ({len(ts_files)})", "")
        for count, filepath in ts_files[:15]:
            try:
                rel = str(Path(filepath).relative_to(config.grove_root))
            except ValueError:
                rel = filepath
            console.print(f"  {count:>5} lines  {rel}")

    if test_files:
        print_section(f"Test Files ({len(test_files)})", "")
        for count, filepath in test_files[:10]:
            try:
                rel = str(Path(filepath).relative_to(config.grove_root))
            except ValueError:
                rel = filepath
            console.print(f"  {count:>5} lines  {rel}")

    console.print(f"\n  Total: {len(all_files)} files over {threshold} lines")


# =============================================================================
# gf orphaned — Find components not imported anywhere
# =============================================================================


def orphaned_command() -> None:
    """Find Svelte components not imported anywhere."""
    config = get_config()

    print_header("Orphaned Svelte Components", "")
    console.print("  Searching for .svelte files with zero imports...\n")

    # Get all svelte files
    output = find_files("", extensions=["svelte"], cwd=config.grove_root)
    if not output or not output.strip():
        console.print("  No Svelte files found")
        return

    all_svelte = [f.strip() for f in output.strip().split("\n") if f.strip()]

    # Filter out route files (+page, +layout, +error) and _deprecated
    component_files = []
    for filepath in all_svelte:
        name = Path(filepath).name
        if name.startswith("+"):
            continue  # Route files are implicitly used by SvelteKit
        if "_deprecated" in filepath:
            continue
        component_files.append(filepath)

    orphaned = []
    for filepath in component_files:
        component_name = Path(filepath).stem  # e.g., "GlassCard"
        escaped_name = re.escape(component_name)

        # Check if this component is imported anywhere
        rg_output = _run_rg(
            [
                f"(import.*{escaped_name}|<{escaped_name}[\\s/>])",
                "--glob", "*.{ts,js,svelte}",
                "-l",  # files-with-matches only (fast)
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )

        if not rg_output or not rg_output.strip():
            orphaned.append(filepath)
        else:
            # Check it's not only imported by itself
            import_files = [f.strip() for f in rg_output.strip().split("\n") if f.strip()]
            other_files = [f for f in import_files if f != filepath]
            if not other_files:
                orphaned.append(filepath)

    if orphaned:
        print_section(f"Orphaned Components ({len(orphaned)})", "")
        for filepath in sorted(orphaned):
            try:
                rel = str(Path(filepath).relative_to(config.grove_root))
            except ValueError:
                rel = filepath
            console.print(f"  {rel}")
        console.print(f"\n  {len(orphaned)} components with no external imports")
        console.print("  These may be safe to remove or may be dynamically loaded")
    else:
        console.print("  All components are imported somewhere!")


# =============================================================================
# gf migrations — List D1 migrations across packages
# =============================================================================


def migrations_command() -> None:
    """List D1 migrations across all packages."""
    config = get_config()

    print_header("D1 Migrations", "")

    # Find all migration directories
    migration_dirs = []
    for migrations_dir in config.grove_root.rglob("migrations"):
        if "node_modules" in str(migrations_dir) or "_deprecated" in str(migrations_dir):
            continue
        if migrations_dir.is_dir():
            sql_files = sorted(migrations_dir.glob("*.sql"))
            if sql_files:
                migration_dirs.append((migrations_dir, sql_files))

    if not migration_dirs:
        console.print("  No migration directories found")
        return

    total_migrations = 0
    for migrations_dir, sql_files in sorted(migration_dirs, key=lambda x: str(x[0])):
        try:
            rel_dir = str(migrations_dir.relative_to(config.grove_root))
        except ValueError:
            rel_dir = str(migrations_dir)

        # Extract package name from path
        parts = rel_dir.split("/")
        if "packages" in parts:
            idx = parts.index("packages")
            pkg_name = parts[idx + 1] if idx + 1 < len(parts) else rel_dir
        elif "workers" in parts:
            idx = parts.index("workers")
            pkg_name = f"workers/{parts[idx + 1]}" if idx + 1 < len(parts) else rel_dir
        else:
            pkg_name = rel_dir

        count = len(sql_files)
        total_migrations += count
        first = sql_files[0].stem if sql_files else "?"
        last = sql_files[-1].stem if sql_files else "?"

        print_section(f"{pkg_name} ({count} migrations)", "")
        console.print(f"  Path: {rel_dir}")
        console.print(f"  Range: {first} → {last}")

        # Show last 5 migrations
        recent = sql_files[-5:]
        for sql_file in recent:
            console.print(f"    {sql_file.name}")

        if count > 5:
            console.print(f"    ... and {count - 5} earlier")

    console.print(f"\n  Total: {total_migrations} migrations across {len(migration_dirs)} databases")


# =============================================================================
# gf flags — Find feature flag definitions and usage
# =============================================================================


def flags_command(name: Optional[str] = None) -> None:
    """Find feature flag definitions and usage."""
    config = get_config()

    if name:
        print_section(f"Feature flag: {name}", "")
        output = _run_rg(
            [name, "--glob", "*.{ts,js,svelte,sql}", str(config.grove_root)],
            cwd=config.grove_root,
        )
        if output:
            lines = [l for l in output.strip().split("\n") if any(
                kw in l.lower() for kw in ["flag", "graft", "feature", "toggle", name.lower()]
            )]
            if lines:
                console.print_raw("\n".join(lines[:30]))
            else:
                console.print_raw(output.rstrip())
        else:
            console.print("  (not found)")
    else:
        print_header("Feature Flags (Grafts)", "")

        # Graft definitions in migrations
        print_section("Graft Definitions (migrations)", "")
        output = _run_rg(
            [
                "INSERT.*grafts|CREATE.*grafts",
                "--glob", "*.sql",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            console.print_raw(output.rstrip())
        else:
            console.print("  (none found)")

        # Graft checks in code
        print_section("Graft Checks in Code", "")
        output = _run_rg(
            [
                "(isGraftEnabled|checkGraft|graft|feature_flag|FLAGS_KV)",
                "--glob", "*.{ts,js,svelte}",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:25]
            console.print_raw("\n".join(lines))
            total = len(output.strip().split("\n"))
            if total > 25:
                console.print(f"  ... and {total - 25} more")
        else:
            console.print("  (none found)")

        # Graft manifest/inventory
        print_section("Graft Inventory Files", "")
        output = find_files("graft", extensions=["ts", "js", "json"], cwd=config.grove_root)
        if output and output.strip():
            console.print_raw(output.rstrip())
        else:
            console.print("  (none found)")


# =============================================================================
# gf workers — List worker entry points, crons, DOs, queues
# =============================================================================


def workers_command() -> None:
    """List Cloudflare Worker configurations."""
    config = get_config()

    print_header("Cloudflare Workers", "")

    # Find wrangler.toml files
    wrangler_files = sorted(config.grove_root.rglob("wrangler.toml"))
    wrangler_files = [f for f in wrangler_files if "node_modules" not in str(f) and "_deprecated" not in str(f)]

    if not wrangler_files:
        console.print("  No wrangler.toml files found")
        return

    for wrangler_path in wrangler_files:
        try:
            rel = str(wrangler_path.parent.relative_to(config.grove_root))
        except ValueError:
            rel = str(wrangler_path.parent)

        # Read the file for key patterns
        try:
            content = wrangler_path.read_text()
        except OSError:
            continue

        name = "unknown"
        for line in content.split("\n"):
            if line.strip().startswith("name"):
                name = line.split("=", 1)[1].strip().strip('"').strip("'")
                break

        details = []
        if "[triggers]" in content or "crons" in content:
            details.append("cron")
        if "[durable_objects]" in content:
            details.append("DO")
        if "[[queues" in content or "[queues]" in content:
            details.append("queues")
        if "[[d1_databases" in content:
            details.append("D1")
        if "[[kv_namespaces" in content:
            details.append("KV")
        if "[[r2_buckets" in content:
            details.append("R2")
        if "[ai]" in content:
            details.append("AI")
        if "[[services" in content:
            details.append("services")

        detail_str = ", ".join(details) if details else "basic"
        console.print(f"  {name:<30} [{detail_str}]")
        console.print(f"    {rel}/wrangler.toml")

    console.print(f"\n  Total: {len(wrangler_files)} workers/apps")

    # Durable Object classes
    print_section("Durable Object Classes", "")
    output = _run_rg(
        [
            "export\\s+class\\s+\\w+.*DurableObject",
            "--glob", "*.ts",
            str(config.grove_root),
        ],
        cwd=config.grove_root,
    )
    if output:
        console.print_raw(output.rstrip())
    else:
        console.print("  (none found)")

    # Cron triggers
    print_section("Cron Triggers", "")
    output = _run_rg(
        [
            "crons\\s*=|scheduled.*fetch",
            "--glob", "*.{toml,ts}",
            str(config.grove_root),
        ],
        cwd=config.grove_root,
    )
    if output:
        console.print_raw(output.rstrip())
    else:
        console.print("  (none found)")


# =============================================================================
# gf emails — Find email templates and send functions
# =============================================================================


def emails_command() -> None:
    """Find email templates and send functions."""
    config = get_config()

    print_header("Email System", "")

    # Email template files
    print_section("Email Template Files", "")
    output = find_files("email", extensions=["ts", "js", "svelte"], cwd=config.grove_root)
    if output and output.strip():
        lines = [l for l in output.strip().split("\n") if "_deprecated" not in l]
        if lines:
            console.print_raw("\n".join(lines[:20]))
    else:
        console.print("  (none found)")

    # Send functions
    print_section("Email Send Functions", "")
    output = _run_rg(
        [
            "(sendEmail|send_email|sendMail|emailService|mailSend|resend\\.emails)",
            "--glob", "*.{ts,js}",
            str(config.grove_root),
        ],
        cwd=config.grove_root,
    )
    if output:
        lines = output.strip().split("\n")[:20]
        console.print_raw("\n".join(lines))
    else:
        console.print("  (none found)")

    # Email types/templates
    print_section("Email Types & Templates", "")
    output = _run_rg(
        [
            "(EmailTemplate|emailType|email_type|template.*email|subject.*email)",
            "-i",
            "--glob", "*.{ts,js}",
            str(config.grove_root),
        ],
        cwd=config.grove_root,
    )
    if output:
        lines = output.strip().split("\n")[:15]
        console.print_raw("\n".join(lines))
    else:
        console.print("  (none found)")


# =============================================================================
# gf deps — Cross-package workspace dependency graph
# =============================================================================


def deps_command(package: Optional[str] = None) -> None:
    """Show workspace dependency graph."""
    config = get_config()

    if package:
        # Validate package name — reject path traversal attempts
        if ".." in package or "/" in package or "\\" in package:
            print_warning("Invalid package name — must be a simple name like 'engine'")
            return

        package_dir = config.grove_root / "packages" / package
        if not package_dir.is_dir():
            print_warning(f"Package not found: packages/{package}")
            return

        print_header(f"Dependencies of: {package}", "")

        # Find imports from workspace packages
        print_section("Workspace Imports", "")
        output = _run_rg(
            [
                "@autumnsgrove/",
                "--glob", "*.{ts,js,svelte}",
                str(package_dir),
            ],
            cwd=config.grove_root,
        )
        if output:
            lines = output.strip().split("\n")[:30]
            console.print_raw("\n".join(lines))
        else:
            console.print("  (no workspace imports)")

        # Find who imports this package
        print_section(f"Packages importing {package}", "")
        output = _run_rg(
            [
                f"@autumnsgrove/.*{package}|from.*['\"].*/{package}",
                "--glob", "*.{ts,js,svelte}",
                "-l",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if output:
            # Group by package directory
            packages = set()
            for line in output.strip().split("\n"):
                parts = line.split("/")
                if "packages" in parts:
                    idx = parts.index("packages")
                    if idx + 1 < len(parts) and parts[idx + 1] != package:
                        packages.add(parts[idx + 1])
                elif "workers" in parts:
                    idx = parts.index("workers")
                    if idx + 1 < len(parts):
                        packages.add(f"workers/{parts[idx + 1]}")
            for pkg in sorted(packages):
                console.print(f"  {pkg}")
            if not packages:
                console.print("  (no external consumers)")
        else:
            console.print("  (no external consumers)")
    else:
        print_header("Workspace Dependency Graph", "")

        # Find all workspace cross-references
        output = _run_rg(
            [
                "@autumnsgrove/",
                "--glob", "*.{ts,js,svelte}",
                "-l",
                str(config.grove_root),
            ],
            cwd=config.grove_root,
        )
        if not output:
            console.print("  No workspace imports found")
            return

        # Build dependency map
        dep_map: dict[str, set[str]] = {}
        for filepath in output.strip().split("\n"):
            filepath = filepath.strip()
            if not filepath or "_deprecated" in filepath:
                continue
            parts = filepath.split("/")

            # Determine source package
            source = None
            if "packages" in parts:
                idx = parts.index("packages")
                if idx + 1 < len(parts):
                    source = parts[idx + 1]
            elif "workers" in parts:
                idx = parts.index("workers")
                if idx + 1 < len(parts):
                    source = f"workers/{parts[idx + 1]}"

            if source:
                if source not in dep_map:
                    dep_map[source] = set()

                # Read the file to find what it imports
                try:
                    file_content = Path(filepath).read_text()
                    for line in file_content.split("\n"):
                        if "@autumnsgrove/" in line and "import" in line:
                            # Extract package name from import
                            for part in line.split("@autumnsgrove/"):
                                if part and not part.startswith("import"):
                                    pkg = part.split("/")[0].split("'")[0].split('"')[0].strip()
                                    if pkg and pkg != source:
                                        dep_map[source].add(pkg)
                except (OSError, UnicodeDecodeError) as exc:
                    if config.verbose:
                        console.print(f"  [dim]skipped {filepath}: {exc}[/dim]")
                    continue

        for pkg in sorted(dep_map.keys()):
            deps = dep_map[pkg]
            if deps:
                dep_list = ", ".join(sorted(deps))
                console.print(f"  {pkg} → {dep_list}")

        console.print(f"\n  {len(dep_map)} packages with workspace dependencies")


# =============================================================================
# gf config diff — Compare configs across packages
# =============================================================================


def config_diff_command(config_type: Optional[str] = None) -> None:
    """Compare configuration files across packages."""
    config = get_config()

    if config_type == "tailwind" or config_type is None:
        print_section("Tailwind Configs", "")
        tw_files = sorted(config.grove_root.rglob("tailwind.config.*"))
        tw_files = [f for f in tw_files if "node_modules" not in str(f) and "_deprecated" not in str(f)]

        if tw_files:
            console.print(f"  {len(tw_files)} tailwind config files:")
            for tw in tw_files:
                try:
                    rel = str(tw.relative_to(config.grove_root))
                except ValueError:
                    rel = str(tw)
                lines = _count_lines(tw)
                console.print(f"    {lines:>4} lines  {rel}")

            # Check for grove color definitions
            output = _run_rg(
                [
                    "grove.*:\\s*\\{",
                    "--glob", "tailwind.config.*",
                    str(config.grove_root),
                ],
                cwd=config.grove_root,
            )
            if output:
                count = len(output.strip().split("\n"))
                console.print(f"\n  grove color palette defined in {count} files (potential duplication)")
        else:
            console.print("  (none found)")

    if config_type == "svelte" or config_type is None:
        print_section("Svelte Configs", "")
        sv_files = sorted(config.grove_root.rglob("svelte.config.*"))
        sv_files = [f for f in sv_files if "node_modules" not in str(f) and "_deprecated" not in str(f)]

        if sv_files:
            console.print(f"  {len(sv_files)} svelte config files:")
            for sv in sv_files:
                try:
                    rel = str(sv.relative_to(config.grove_root))
                except ValueError:
                    rel = str(sv)
                # Check for CSRF config
                try:
                    content = sv.read_text()
                    has_csrf = "csrf" in content.lower()
                    adapter = "cloudflare" if "cloudflare" in content else "auto" if "auto" in content else "?"
                    console.print(f"    {rel}  (adapter: {adapter}{', csrf' if has_csrf else ''})")
                except OSError:
                    console.print(f"    {rel}")

            # Flag CSRF inconsistency
            csrf_count = 0
            for sv in sv_files:
                try:
                    if "csrf" in sv.read_text().lower():
                        csrf_count += 1
                except OSError:
                    pass
            if 0 < csrf_count < len(sv_files):
                console.print(f"\n  WARNING: CSRF config in {csrf_count}/{len(sv_files)} files (inconsistent!)")
        else:
            console.print("  (none found)")

    if config_type == "tsconfig" or config_type is None:
        print_section("TypeScript Configs", "")
        ts_files = sorted(config.grove_root.rglob("tsconfig.json"))
        ts_files = [f for f in ts_files if "node_modules" not in str(f) and "_deprecated" not in str(f)]

        if ts_files:
            console.print(f"  {len(ts_files)} tsconfig files")
            for ts in ts_files[:15]:
                try:
                    rel = str(ts.relative_to(config.grove_root))
                except ValueError:
                    rel = str(ts)
                console.print(f"    {rel}")
            if len(ts_files) > 15:
                console.print(f"    ... and {len(ts_files) - 15} more")
        else:
            console.print("  (none found)")

    if config_type == "vitest" or config_type is None:
        print_section("Vitest Configs", "")
        vi_files = sorted(config.grove_root.rglob("vitest.config.*"))
        vi_files = [f for f in vi_files if "node_modules" not in str(f) and "_deprecated" not in str(f)]

        if vi_files:
            console.print(f"  {len(vi_files)} vitest config files:")
            for vi in vi_files:
                try:
                    rel = str(vi.relative_to(config.grove_root))
                except ValueError:
                    rel = str(vi)
                console.print(f"    {rel}")
        else:
            console.print("  (none found)")
