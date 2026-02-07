"""MCP Server for Grove Wrap - Exposes gw commands as MCP tools.

This module implements the Model Context Protocol (MCP) server that allows
Claude Code to call gw commands directly without shell permissions.

Safety tiers:
- READ: Always safe, no confirmation needed
- WRITE: Returns confirmation message, agent can proceed
- BLOCKED: Dangerous operations blocked in MCP mode entirely

Usage:
    gw mcp serve

Claude Code settings.json:
    {
        "mcpServers": {
            "grove-wrap": {
                "command": "gw",
                "args": ["mcp", "serve"]
            }
        }
    }
"""

import json
import os
import re
from typing import Any, Optional

from mcp.server.fastmcp import FastMCP

from .config import GWConfig
from .wrangler import Wrangler, WranglerError
from .git_wrapper import Git, GitError
from .gh_wrapper import GitHub, GitHubError
from .packages import load_monorepo, detect_current_package

# Enable agent mode for all MCP operations
os.environ["GW_AGENT_MODE"] = "1"

# Pre-compiled regex for SQL identifier validation (performance optimization)
_SQL_IDENTIFIER_PATTERN = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_]*$')

# Initialize the MCP server
mcp = FastMCP("Grove Wrap")

# Load configuration once at startup
_config: Optional[GWConfig] = None


def get_config() -> GWConfig:
    """Get or load the gw configuration."""
    global _config
    if _config is None:
        _config = GWConfig.load()
    return _config


# =============================================================================
# DATABASE TOOLS (READ)
# =============================================================================


@mcp.tool()
def grove_db_query(sql: str, database: str = "lattice") -> str:
    """Execute a read-only SQL query against a D1 database.

    Args:
        sql: The SQL query to execute (SELECT only, no writes)
        database: Database alias (lattice, groveauth, clearing, amber)

    Returns:
        JSON string with query results
    """
    config = get_config()
    wrangler = Wrangler(config)

    # Resolve database alias
    db_info = config.databases.get(database)
    db_name = db_info.name if db_info else database

    # Safety check - block write operations
    sql_upper = sql.upper().strip()
    if any(sql_upper.startswith(kw) for kw in ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE"]):
        return json.dumps({
            "error": "Write operations blocked in MCP mode",
            "hint": "Use gw d1 query --write from the terminal for write operations"
        })

    try:
        result = wrangler.execute(
            ["d1", "execute", db_name, "--remote", "--json", "--command", sql]
        )
        # Parse wrangler output
        data = json.loads(result)
        if isinstance(data, list) and len(data) > 0:
            return json.dumps({"results": data[0].get("results", [])}, indent=2)
        return json.dumps({"results": []})
    except (WranglerError, json.JSONDecodeError) as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def grove_db_tables(database: str = "lattice") -> str:
    """List all tables in a D1 database.

    Args:
        database: Database alias (lattice, groveauth, clearing, amber)

    Returns:
        JSON string with table names
    """
    config = get_config()
    wrangler = Wrangler(config)

    db_info = config.databases.get(database)
    db_name = db_info.name if db_info else database

    try:
        result = wrangler.execute([
            "d1", "execute", db_name, "--remote", "--json", "--command",
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ])
        data = json.loads(result)
        if isinstance(data, list) and len(data) > 0:
            tables = [row["name"] for row in data[0].get("results", [])]
            return json.dumps({"database": database, "tables": tables}, indent=2)
        return json.dumps({"database": database, "tables": []})
    except (WranglerError, json.JSONDecodeError) as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def grove_db_schema(table: str, database: str = "lattice") -> str:
    """Get the schema for a table in a D1 database.

    Args:
        table: Table name
        database: Database alias

    Returns:
        JSON string with column definitions
    """
    # Security: Validate table name to prevent SQL injection
    if not _SQL_IDENTIFIER_PATTERN.match(table):
        return json.dumps({"error": "Invalid table name"})

    config = get_config()
    wrangler = Wrangler(config)

    db_info = config.databases.get(database)
    db_name = db_info.name if db_info else database

    try:
        result = wrangler.execute([
            "d1", "execute", db_name, "--remote", "--json", "--command",
            f"PRAGMA table_info({table})"
        ])
        data = json.loads(result)
        if isinstance(data, list) and len(data) > 0:
            columns = data[0].get("results", [])
            return json.dumps({
                "database": database,
                "table": table,
                "columns": columns
            }, indent=2)
        return json.dumps({"error": f"Table '{table}' not found"})
    except (WranglerError, json.JSONDecodeError) as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def grove_tenant_lookup(identifier: str, lookup_type: str = "subdomain") -> str:
    """Look up a Grove tenant by subdomain, email, or ID.

    Args:
        identifier: The value to search for
        lookup_type: Type of lookup - "subdomain", "email", or "id"

    Returns:
        JSON string with tenant information
    """
    config = get_config()
    wrangler = Wrangler(config)

    db_info = config.databases.get("lattice")
    db_name = db_info.name if db_info else "grove-engine-db"

    # Build query based on lookup type
    field_map = {"subdomain": "subdomain", "email": "email", "id": "id"}
    field = field_map.get(lookup_type, "subdomain")

    # Escape single quotes
    safe_id = identifier.replace("'", "''")
    query = f"SELECT * FROM tenants WHERE {field} = '{safe_id}'"

    try:
        result = wrangler.execute([
            "d1", "execute", db_name, "--remote", "--json", "--command", query
        ])
        data = json.loads(result)
        if isinstance(data, list) and len(data) > 0:
            results = data[0].get("results", [])
            if results:
                return json.dumps({"tenant": results[0]}, indent=2)
            return json.dumps({"error": "Tenant not found"})
        return json.dumps({"error": "Tenant not found"})
    except (WranglerError, json.JSONDecodeError) as e:
        return json.dumps({"error": str(e)})


# =============================================================================
# CACHE TOOLS
# =============================================================================


@mcp.tool()
def grove_cache_list(prefix: str = "", limit: int = 100) -> str:
    """List cache keys from the CACHE_KV namespace.

    Args:
        prefix: Optional prefix to filter keys
        limit: Maximum keys to return (default 100, max 1000)

    Returns:
        JSON string with cache keys
    """
    # Security: Cap limit to prevent DoS
    limit = min(max(1, limit), 1000)

    config = get_config()
    wrangler = Wrangler(config)

    try:
        cmd = ["kv", "key", "list", "--namespace-id", config.kv_namespaces.get("cache", {}).get("id", "")]
        if prefix:
            cmd.extend(["--prefix", prefix])

        result = wrangler.execute(cmd, use_json=True)
        keys = json.loads(result)
        return json.dumps({"keys": keys[:limit]}, indent=2)
    except (WranglerError, json.JSONDecodeError) as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def grove_cache_purge(key: str = "", tenant: str = "") -> str:
    """Purge cache keys. Requires specifying key or tenant.

    Args:
        key: Specific cache key to purge
        tenant: Tenant subdomain to purge all keys for

    Returns:
        JSON string with purge confirmation
    """
    if not key and not tenant:
        return json.dumps({"error": "Specify either 'key' or 'tenant' to purge"})

    config = get_config()
    wrangler = Wrangler(config)
    namespace_id = config.kv_namespaces.get("cache", {}).get("id", "")

    try:
        if key:
            wrangler.execute(["kv", "key", "delete", key, "--namespace-id", namespace_id])
            return json.dumps({"purged": key, "status": "success"})
        elif tenant:
            # List and delete all keys for tenant
            result = wrangler.execute([
                "kv", "key", "list", "--namespace-id", namespace_id,
                "--prefix", f"cache:{tenant}:"
            ], use_json=True)
            keys = json.loads(result)
            purged = []
            for k in keys:
                key_name = k.get("name", "")
                wrangler.execute(["kv", "key", "delete", key_name, "--namespace-id", namespace_id])
                purged.append(key_name)
            return json.dumps({"tenant": tenant, "purged": purged, "count": len(purged)})
    except (WranglerError, json.JSONDecodeError) as e:
        return json.dumps({"error": str(e)})


# =============================================================================
# KV TOOLS
# =============================================================================


@mcp.tool()
def grove_kv_get(key: str, namespace: str = "cache") -> str:
    """Get a value from a KV namespace.

    Args:
        key: The key to retrieve
        namespace: Namespace alias (cache, flags)

    Returns:
        JSON string with the value
    """
    config = get_config()
    wrangler = Wrangler(config)
    namespace_id = config.kv_namespaces.get(namespace, {}).get("id", "")

    try:
        result = wrangler.execute([
            "kv", "key", "get", key, "--namespace-id", namespace_id
        ])
        # Try to parse as JSON, otherwise return as string
        try:
            value = json.loads(result)
            return json.dumps({"key": key, "value": value}, indent=2)
        except json.JSONDecodeError:
            return json.dumps({"key": key, "value": result.strip()})
    except WranglerError as e:
        return json.dumps({"error": str(e)})


# =============================================================================
# R2 TOOLS
# =============================================================================


@mcp.tool()
def grove_r2_list(bucket: str = "grove-media", prefix: str = "") -> str:
    """List objects in an R2 bucket.

    Args:
        bucket: Bucket name (default: grove-media)
        prefix: Optional prefix to filter objects

    Returns:
        JSON string with object list
    """
    config = get_config()
    wrangler = Wrangler(config)

    try:
        cmd = ["r2", "object", "list", bucket]
        if prefix:
            cmd.extend(["--prefix", prefix])

        result = wrangler.execute(cmd, use_json=True)
        objects = json.loads(result)
        return json.dumps({"bucket": bucket, "objects": objects}, indent=2)
    except (WranglerError, json.JSONDecodeError) as e:
        return json.dumps({"error": str(e)})


# =============================================================================
# STATUS TOOLS
# =============================================================================


@mcp.tool()
def grove_status() -> str:
    """Get Grove infrastructure status.

    Returns:
        JSON string with status information
    """
    config = get_config()

    status = {
        "databases": list(config.databases.keys()),
        "kv_namespaces": list(config.kv_namespaces.keys()),
        "r2_buckets": [b.name for b in config.r2_buckets] if hasattr(config, 'r2_buckets') else [],
        "agent_mode": os.environ.get("GW_AGENT_MODE") == "1",
    }

    return json.dumps(status, indent=2)


@mcp.tool()
def grove_health() -> str:
    """Check Grove service health.

    Returns:
        JSON string with health check results
    """
    config = get_config()
    wrangler = Wrangler(config)

    health = {"services": []}

    # Check database connectivity
    try:
        db_info = config.databases.get("lattice")
        if db_info:
            wrangler.execute([
                "d1", "execute", db_info.name, "--remote", "--json", "--command",
                "SELECT 1"
            ])
            health["services"].append({"name": "lattice", "status": "ok"})
    except WranglerError:
        health["services"].append({"name": "lattice", "status": "error"})

    return json.dumps(health, indent=2)


# =============================================================================
# GIT TOOLS (READ)
# =============================================================================


@mcp.tool()
def grove_git_status() -> str:
    """Get git repository status.

    Returns:
        JSON string with branch, staged, unstaged, and untracked files
    """
    try:
        git = Git()
        if not git.is_repo():
            return json.dumps({"error": "Not a git repository"})

        status = git.status()
        return json.dumps({
            "branch": status.branch,
            "upstream": status.upstream,
            "ahead": status.ahead,
            "behind": status.behind,
            "is_clean": status.is_clean,
            "staged": [{"status": s, "path": p} for s, p in status.staged],
            "unstaged": [{"status": s, "path": p} for s, p in status.unstaged],
            "untracked": status.untracked,
        }, indent=2)
    except GitError as e:
        return json.dumps({"error": e.message})


@mcp.tool()
def grove_git_log(limit: int = 10, author: str = "", since: str = "") -> str:
    """Get git commit history.

    Args:
        limit: Maximum commits to show (default 10, max 100)
        author: Filter by author
        since: Filter by date (e.g., "3 days ago")

    Returns:
        JSON string with commit history
    """
    # Security: Cap limit to prevent excessive output
    limit = min(max(1, limit), 100)

    try:
        git = Git()
        if not git.is_repo():
            return json.dumps({"error": "Not a git repository"})

        commits = git.log(limit=limit, author=author if author else None, since=since if since else None)
        return json.dumps({
            "commits": [
                {
                    "hash": c.hash,
                    "short_hash": c.short_hash,
                    "author": c.author,
                    "date": c.date,
                    "message": c.message,
                }
                for c in commits
            ]
        }, indent=2)
    except GitError as e:
        return json.dumps({"error": e.message})


@mcp.tool()
def grove_git_diff(staged: bool = False, file: str = "") -> str:
    """Get git diff output.

    Args:
        staged: Show staged changes instead of unstaged
        file: Specific file to diff (optional)

    Returns:
        JSON string with diff content
    """
    try:
        git = Git()
        if not git.is_repo():
            return json.dumps({"error": "Not a git repository"})

        diff = git.diff(staged=staged, file=file if file else None)
        return json.dumps({
            "staged": staged,
            "file": file or "all",
            "diff": diff,
        }, indent=2)
    except GitError as e:
        return json.dumps({"error": e.message})


# =============================================================================
# GIT TOOLS (WRITE)
# =============================================================================


@mcp.tool()
def grove_git_commit(message: str, files: str = "") -> str:
    """Create a git commit.

    Args:
        message: Commit message (should follow Conventional Commits)
        files: Comma-separated files to stage, or empty for all staged

    Returns:
        JSON string with commit result
    """
    try:
        git = Git()
        if not git.is_repo():
            return json.dumps({"error": "Not a git repository"})

        # Stage files if specified
        if files:
            file_list = [f.strip() for f in files.split(",")]
            for f in file_list:
                git.add(f)

        # Check if there are staged changes
        status = git.status()
        if not status.staged:
            return json.dumps({"error": "No staged changes to commit"})

        # Create commit
        result = git.commit(message)
        return json.dumps({
            "status": "committed",
            "message": message,
            "hash": result.get("hash", ""),
        }, indent=2)
    except GitError as e:
        return json.dumps({"error": e.message})


@mcp.tool()
def grove_git_push(remote: str = "origin", branch: str = "") -> str:
    """Push commits to remote repository.

    Args:
        remote: Remote name (default: origin)
        branch: Branch to push (default: current branch)

    Returns:
        JSON string with push result
    """
    try:
        git = Git()
        if not git.is_repo():
            return json.dumps({"error": "Not a git repository"})

        status = git.status()
        target_branch = branch or status.branch

        # Safety check - block force push in MCP mode
        if target_branch in ["main", "master", "production", "staging"]:
            if status.ahead == 0:
                return json.dumps({"error": "Nothing to push"})

        result = git.push(remote=remote, branch=target_branch)
        return json.dumps({
            "status": "pushed",
            "remote": remote,
            "branch": target_branch,
        }, indent=2)
    except GitError as e:
        return json.dumps({"error": e.message})


# =============================================================================
# GITHUB TOOLS (READ)
# =============================================================================


@mcp.tool()
def grove_gh_pr_list(state: str = "open", limit: int = 10) -> str:
    """List pull requests.

    Args:
        state: PR state - open, closed, merged, all
        limit: Maximum PRs to show (max 100)

    Returns:
        JSON string with PR list
    """
    # Security: Cap limit
    limit = min(max(1, limit), 100)

    try:
        gh = GitHub()
        prs = gh.pr_list(state=state, limit=limit)
        return json.dumps({"pull_requests": prs}, indent=2)
    except GitHubError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def grove_gh_pr_view(number: int) -> str:
    """View pull request details.

    Args:
        number: PR number

    Returns:
        JSON string with PR details
    """
    try:
        gh = GitHub()
        pr = gh.pr_view(number)
        return json.dumps({"pull_request": pr}, indent=2)
    except GitHubError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def grove_gh_issue_list(state: str = "open", limit: int = 10, labels: str = "") -> str:
    """List issues.

    Args:
        state: Issue state - open, closed, all
        limit: Maximum issues to show (max 100)
        labels: Comma-separated labels to filter by

    Returns:
        JSON string with issue list
    """
    # Security: Cap limit
    limit = min(max(1, limit), 100)

    try:
        gh = GitHub()
        label_list = [l.strip() for l in labels.split(",")] if labels else None
        issues = gh.issue_list(state=state, limit=limit, labels=label_list)
        return json.dumps({"issues": issues}, indent=2)
    except GitHubError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def grove_gh_issue_view(number: int) -> str:
    """View issue details.

    Args:
        number: Issue number

    Returns:
        JSON string with issue details
    """
    try:
        gh = GitHub()
        issue = gh.issue_view(number)
        return json.dumps({"issue": issue}, indent=2)
    except GitHubError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def grove_gh_run_list(workflow: str = "", limit: int = 10) -> str:
    """List workflow runs.

    Args:
        workflow: Workflow file name to filter (e.g., "ci.yml")
        limit: Maximum runs to show (max 100)

    Returns:
        JSON string with run list
    """
    # Security: Cap limit
    limit = min(max(1, limit), 100)

    try:
        gh = GitHub()
        runs = gh.run_list(workflow=workflow if workflow else None, limit=limit)
        return json.dumps({"runs": runs}, indent=2)
    except GitHubError as e:
        return json.dumps({"error": str(e)})


# =============================================================================
# GITHUB TOOLS (WRITE)
# =============================================================================


@mcp.tool()
def grove_gh_pr_create(title: str, body: str = "", base: str = "main") -> str:
    """Create a pull request.

    Args:
        title: PR title
        body: PR description
        base: Base branch (default: main)

    Returns:
        JSON string with created PR details
    """
    try:
        gh = GitHub()
        pr = gh.pr_create(title=title, body=body, base=base)
        return json.dumps({
            "status": "created",
            "pull_request": pr,
        }, indent=2)
    except GitHubError as e:
        return json.dumps({"error": str(e)})


# =============================================================================
# DEV TOOLS
# =============================================================================


@mcp.tool()
def grove_packages_list() -> str:
    """List packages in the monorepo.

    Returns:
        JSON string with package list
    """
    monorepo = load_monorepo()
    if not monorepo:
        return json.dumps({"error": "Not in a monorepo"})

    packages = []
    for pkg in monorepo.packages:
        packages.append({
            "name": pkg.name,
            "path": str(pkg.path),
            "type": pkg.package_type.value,
            "has_tests": pkg.has_script.get("test", False),
            "has_build": pkg.has_script.get("build", False),
        })

    return json.dumps({"packages": packages}, indent=2)


@mcp.tool()
def grove_dev_status() -> str:
    """Get dev server status.

    Returns:
        JSON string with running server info
    """
    # Check for running dev processes
    import subprocess
    try:
        result = subprocess.run(
            ["pgrep", "-f", "wrangler dev"],
            capture_output=True,
            text=True,
        )
        pids = result.stdout.strip().split("\n") if result.stdout.strip() else []

        return json.dumps({
            "running": len(pids) > 0,
            "processes": len(pids),
        }, indent=2)
    except subprocess.SubprocessError:
        return json.dumps({"running": False, "processes": 0})


@mcp.tool()
def grove_test_run(package: str = "") -> str:
    """Run tests for a package.

    Args:
        package: Package name (auto-detects if not specified)

    Returns:
        JSON string with test results
    """
    import subprocess

    monorepo = load_monorepo()
    if not monorepo:
        return json.dumps({"error": "Not in a monorepo"})

    # Find package
    if package:
        pkg = monorepo.find_package(package)
    else:
        pkg = detect_current_package()

    if not pkg:
        return json.dumps({"error": "Could not detect package"})

    try:
        result = subprocess.run(
            ["pnpm", "run", "test:run"],
            cwd=pkg.path,
            capture_output=True,
            text=True,
            timeout=300,
        )
        return json.dumps({
            "package": pkg.name,
            "passed": result.returncode == 0,
            "output": result.stdout[-2000:] if len(result.stdout) > 2000 else result.stdout,
        }, indent=2)
    except subprocess.TimeoutExpired:
        return json.dumps({"error": "Test timeout (5 minutes)"})
    except subprocess.SubprocessError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def grove_build(package: str = "") -> str:
    """Build a package.

    Args:
        package: Package name (auto-detects if not specified)

    Returns:
        JSON string with build results
    """
    import subprocess

    monorepo = load_monorepo()
    if not monorepo:
        return json.dumps({"error": "Not in a monorepo"})

    if package:
        pkg = monorepo.find_package(package)
    else:
        pkg = detect_current_package()

    if not pkg:
        return json.dumps({"error": "Could not detect package"})

    try:
        result = subprocess.run(
            ["pnpm", "run", "build"],
            cwd=pkg.path,
            capture_output=True,
            text=True,
            timeout=300,
        )
        return json.dumps({
            "package": pkg.name,
            "success": result.returncode == 0,
            "output": result.stdout[-2000:] if len(result.stdout) > 2000 else result.stdout,
        }, indent=2)
    except subprocess.TimeoutExpired:
        return json.dumps({"error": "Build timeout (5 minutes)"})
    except subprocess.SubprocessError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def grove_ci() -> str:
    """Run the full CI pipeline locally.

    Returns:
        JSON string with CI results for each step
    """
    import subprocess
    import time

    monorepo = load_monorepo()
    if not monorepo:
        return json.dumps({"error": "Not in a monorepo"})

    steps = [
        ("lint", ["pnpm", "-r", "run", "lint"]),
        ("check", ["pnpm", "-r", "run", "check"]),
        ("test", ["pnpm", "-r", "run", "test:run"]),
        ("build", ["pnpm", "-r", "run", "build"]),
    ]

    results = []
    all_passed = True
    start_time = time.time()

    for name, cmd in steps:
        step_start = time.time()
        try:
            result = subprocess.run(
                cmd,
                cwd=monorepo.root,
                capture_output=True,
                text=True,
                timeout=600,
            )
            passed = result.returncode == 0
            results.append({
                "step": name,
                "passed": passed,
                "duration": round(time.time() - step_start, 2),
            })
            if not passed:
                all_passed = False
        except subprocess.TimeoutExpired:
            results.append({"step": name, "passed": False, "error": "timeout"})
            all_passed = False
        except subprocess.SubprocessError as e:
            results.append({"step": name, "passed": False, "error": str(e)})
            all_passed = False

    return json.dumps({
        "passed": all_passed,
        "duration": round(time.time() - start_time, 2),
        "steps": results,
    }, indent=2)


# =============================================================================
# BINDINGS TOOLS (READ)
# =============================================================================


@mcp.tool()
def grove_bindings(
    binding_type: str = "all",
    package_filter: str = "",
) -> str:
    """List Cloudflare bindings from all wrangler.toml files.

    Scans the monorepo for D1 databases, KV namespaces, R2 buckets,
    Durable Objects, service bindings, and AI bindings.

    Args:
        binding_type: Filter by type: d1, kv, r2, do, services, ai, or all
        package_filter: Filter by package name (substring match)
    """
    from .commands.bindings import find_project_root, find_wrangler_configs, parse_wrangler_config

    try:
        root = find_project_root()
        configs = find_wrangler_configs(root)

        if not configs:
            return json.dumps({"bindings": [], "message": "No wrangler.toml files found"})

        all_bindings = []
        for config_path in configs:
            try:
                parsed = parse_wrangler_config(config_path)
                if package_filter and package_filter.lower() not in parsed["package"].lower():
                    continue
                all_bindings.append(parsed)
            except Exception:
                continue

        # Filter by type if specified
        if binding_type != "all":
            type_map = {
                "d1": "d1_databases",
                "kv": "kv_namespaces",
                "r2": "r2_buckets",
                "do": "durable_objects",
                "services": "services",
                "ai": "ai",
            }
            key = type_map.get(binding_type)
            if key:
                filtered = []
                for pkg in all_bindings:
                    if key == "ai":
                        if pkg.get("ai"):
                            filtered.append({"package": pkg["package"], "ai": pkg["ai"]})
                    elif pkg.get(key):
                        filtered.append({"package": pkg["package"], key: pkg[key]})
                return json.dumps({"bindings": filtered, "type": binding_type}, indent=2)

        return json.dumps({
            "scanned_files": len(configs),
            "bindings": all_bindings,
        }, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})


# =============================================================================
# SERVER ENTRY POINT
# =============================================================================


def run_server():
    """Run the MCP server with stdio transport."""
    mcp.run()


if __name__ == "__main__":
    run_server()
