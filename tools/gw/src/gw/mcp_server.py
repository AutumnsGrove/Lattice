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
from pathlib import Path
from typing import Any, Optional

from mcp.server.fastmcp import FastMCP

from .config import GWConfig
from .wrangler import Wrangler, WranglerError
from .git_wrapper import Git, GitError
from .gh_wrapper import GitHub, GitHubError
from .packages import load_monorepo, detect_current_package, find_monorepo_root
from .commands.context import _get_affected_packages, _count_todos_in_files

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


@mcp.tool()
def grove_git_ship(message: str, files: str = "", issue: int = 0, no_check: bool = False) -> str:
    """Format, check, commit, and push in one step.

    The canonical commit+push workflow. Formats staged files, runs type
    checks on affected packages, creates a commit, and pushes.

    Args:
        message: Commit message (Conventional Commits format required)
        files: Comma-separated files to stage first, or empty for already-staged
        issue: Issue number to link (0 = auto-detect from branch)
        no_check: Skip type checking step

    Returns:
        JSON string with ship result
    """
    import subprocess

    try:
        git = Git()
        if not git.is_repo():
            return json.dumps({"error": "Not a git repository"})

        # Stage files if specified
        if files:
            file_list = [f.strip() for f in files.split(",")]
            for f in file_list:
                git.add(f)

        status = git.status()
        if not status.staged:
            return json.dumps({"error": "No staged changes to ship"})

        staged_files = [path for _, path in status.staged]

        # Format staged files
        formattable_exts = {
            ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
            ".svelte", ".css", ".scss", ".postcss",
            ".json", ".html", ".md", ".mdx", ".yaml", ".yml",
        }
        formattable = [f for f in staged_files if os.path.splitext(f)[1].lower() in formattable_exts]

        fmt_result = "skipped"
        if formattable:
            try:
                subprocess.run(
                    ["bun", "x", "prettier", "--write"] + formattable,
                    capture_output=True, timeout=60,
                )
                git.add(formattable)
                fmt_result = f"formatted {len(formattable)} files"
            except (subprocess.SubprocessError, FileNotFoundError):
                fmt_result = "formatter not available"

        # Commit
        full_message = message
        if issue:
            if f"#{issue}" not in full_message:
                full_message = f"{full_message} (#{issue})"

        result = git.commit(full_message)
        commit_hash = result if isinstance(result, str) else result.get("hash", "")

        # Push
        current_branch = git.current_branch()
        try:
            git.push(remote="origin", branch=current_branch, set_upstream=True)
            push_result = f"origin/{current_branch}"
        except GitError as e:
            return json.dumps({
                "error": f"Committed ({commit_hash[:8]}) but push failed: {e.message}",
                "hash": commit_hash[:8],
                "hint": "Run 'gw git push --write' to retry push",
            })

        return json.dumps({
            "shipped": True,
            "hash": commit_hash[:8] if isinstance(commit_hash, str) else "",
            "message": full_message,
            "pushed_to": push_result,
            "formatted": fmt_result,
        }, indent=2)

    except GitError as e:
        return json.dumps({"error": e.message})


@mcp.tool()
def grove_git_prep() -> str:
    """Pre-commit preflight check — dry run of what ship would do.

    Checks staging status, formatting, and type checking without
    making any changes. Use before grove_git_ship to preview.

    Returns:
        JSON string with preflight check results
    """
    import subprocess
    from pathlib import Path

    try:
        git = Git()
        if not git.is_repo():
            return json.dumps({"error": "Not a git repository"})

        status = git.status()
        staged_files = [path for _, path in status.staged]

        if not staged_files:
            return json.dumps({"ready": False, "reason": "Nothing staged"})

        # Check formatting
        formattable_exts = {
            ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
            ".svelte", ".css", ".scss", ".postcss",
            ".json", ".html", ".md", ".mdx", ".yaml", ".yml",
        }
        formattable = [f for f in staged_files if Path(f).suffix.lower() in formattable_exts]

        fmt_ok = True
        if formattable:
            try:
                result = subprocess.run(
                    ["bun", "x", "prettier", "--check"] + formattable,
                    capture_output=True, text=True, timeout=30,
                )
                fmt_ok = result.returncode == 0
            except (subprocess.SubprocessError, FileNotFoundError):
                pass  # Can't check — assume ok

        return json.dumps({
            "ready": fmt_ok,
            "branch": status.branch,
            "staged": len(staged_files),
            "unstaged": len(status.unstaged),
            "untracked": len(status.untracked),
            "format_ok": fmt_ok,
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
# CONTEXT TOOLS (READ) — Agent-optimized session snapshots
# =============================================================================


@mcp.tool()
def grove_context() -> str:
    """Get a one-shot work session snapshot — branch, changes, packages, issues, recent commits.

    This is the first tool an agent should call at session start. Eliminates
    the need for 3-5 separate commands to orient.

    Returns JSON with: branch, upstream, staged/unstaged/untracked files,
    affected packages, issue number (from branch), recent commits, TODO count.
    """
    try:
        git = Git()
        if not git.is_repo():
            return json.dumps({"error": "Not a git repository"})

        status = git.status()
        commits = git.log(limit=5)
        stashes = git.stash_list()

        all_changed = (
            [path for _, path in status.staged]
            + [path for _, path in status.unstaged]
            + status.untracked
        )

        affected = _get_affected_packages(all_changed)
        issue = git.extract_issue_from_branch(status.branch)

        root = find_monorepo_root() or Path.cwd()
        todo_count = _count_todos_in_files(all_changed, root)

        return json.dumps({
            "branch": status.branch,
            "upstream": status.upstream,
            "ahead": status.ahead,
            "behind": status.behind,
            "is_clean": status.is_clean,
            "issue": issue,
            "staged": [{"status": s, "path": p} for s, p in status.staged],
            "unstaged": [{"status": s, "path": p} for s, p in status.unstaged],
            "untracked": status.untracked,
            "affected_packages": affected,
            "recent_commits": [
                {"hash": c.short_hash, "message": c.subject, "author": c.author}
                for c in commits
            ],
            "stash_count": len(stashes),
            "todos_in_changed_files": todo_count,
        }, indent=2)

    except GitError as e:
        return json.dumps({"error": str(e)})
    except Exception as e:
        return json.dumps({"error": str(e)})


# =============================================================================
# CODEBASE SEARCH TOOLS (READ) — gf capabilities via MCP
# =============================================================================


@mcp.tool()
def grove_search(pattern: str, file_type: str = "", path: str = "") -> str:
    """Search the codebase using ripgrep.

    Fast full-text search across all source files, excluding
    node_modules, dist, build, and lock files.

    Args:
        pattern: Search pattern (regex supported)
        file_type: Optional file type filter (ts, svelte, py, css, etc.)
        path: Optional path to limit search to
    """
    import subprocess
    args = [
        "rg", "--line-number", "--no-heading", "--smart-case",
        "--color=never", "--max-count=50",
        "--glob", "!node_modules", "--glob", "!.git",
        "--glob", "!dist", "--glob", "!build",
        "--glob", "!*.lock", "--glob", "!pnpm-lock.yaml",
    ]
    if file_type:
        args.extend(["--type", file_type])
    args.append(pattern)
    if path:
        args.append(path)

    try:
        result = subprocess.run(
            args, capture_output=True, text=True, timeout=30,
        )
        output = result.stdout.strip()
        if not output:
            return json.dumps({"matches": [], "total": 0})

        matches = []
        for line in output.split("\n")[:50]:
            parts = line.split(":", 2)
            if len(parts) >= 3:
                matches.append({
                    "file": parts[0],
                    "line": int(parts[1]) if parts[1].isdigit() else 0,
                    "content": parts[2].strip(),
                })
        return json.dumps({"matches": matches, "total": len(matches)}, indent=2)
    except (subprocess.SubprocessError, subprocess.TimeoutExpired):
        return json.dumps({"error": "Search failed or timed out"})


@mcp.tool()
def grove_find_usage(name: str) -> str:
    """Find where a component, function, or module is used (imported/referenced).

    Searches for import statements and direct references across
    TypeScript, JavaScript, and Svelte files.

    Args:
        name: Component or function name to find usages of
    """
    import subprocess
    args = [
        "rg", "--line-number", "--no-heading", "--smart-case",
        "--color=never", "--max-count=30",
        "--glob", "!node_modules", "--glob", "!.git",
        "--glob", "!dist", "--glob", "!build",
        "--type", "ts", "--type", "svelte",
        name,
    ]
    try:
        result = subprocess.run(
            args, capture_output=True, text=True, timeout=30,
        )
        output = result.stdout.strip()
        if not output:
            return json.dumps({"usages": [], "total": 0})

        usages = []
        for line in output.split("\n")[:30]:
            parts = line.split(":", 2)
            if len(parts) >= 3:
                usages.append({
                    "file": parts[0],
                    "line": int(parts[1]) if parts[1].isdigit() else 0,
                    "content": parts[2].strip(),
                })
        return json.dumps({"name": name, "usages": usages, "total": len(usages)}, indent=2)
    except (subprocess.SubprocessError, subprocess.TimeoutExpired):
        return json.dumps({"error": "Search failed or timed out"})


@mcp.tool()
def grove_find_definition(name: str) -> str:
    """Find class, function, or type definitions by name.

    Searches for definition patterns: class Name, function name,
    const name, export function name, interface Name, type Name.

    Args:
        name: Name to find the definition of
    """
    import subprocess
    patterns = [
        f"(class|interface|type|enum)\\s+{re.escape(name)}",
        f"(export\\s+)?(function|const|let|var)\\s+{re.escape(name)}",
        f"export\\s+default\\s+(class|function)\\s+{re.escape(name)}",
    ]
    combined_pattern = "|".join(f"({p})" for p in patterns)

    args = [
        "rg", "--line-number", "--no-heading", "--smart-case",
        "--color=never", "--max-count=20",
        "--glob", "!node_modules", "--glob", "!.git",
        "--glob", "!dist", "--glob", "!*.test.*", "--glob", "!*.spec.*",
        combined_pattern,
    ]
    try:
        result = subprocess.run(
            args, capture_output=True, text=True, timeout=30,
        )
        output = result.stdout.strip()
        if not output:
            return json.dumps({"definitions": [], "total": 0})

        definitions = []
        for line in output.split("\n")[:20]:
            parts = line.split(":", 2)
            if len(parts) >= 3:
                definitions.append({
                    "file": parts[0],
                    "line": int(parts[1]) if parts[1].isdigit() else 0,
                    "content": parts[2].strip(),
                })
        return json.dumps({"name": name, "definitions": definitions, "total": len(definitions)}, indent=2)
    except (subprocess.SubprocessError, subprocess.TimeoutExpired):
        return json.dumps({"error": "Search failed or timed out"})


@mcp.tool()
def grove_find_routes(pattern: str = "") -> str:
    """Find SvelteKit routes in the codebase.

    Lists route directories and their server/page files.
    Optionally filter by a pattern.

    Args:
        pattern: Optional pattern to filter routes
    """
    import subprocess
    args = [
        "rg", "--files", "--color=never",
        "--glob", "!node_modules", "--glob", "!.git",
        "--glob", "**/routes/**/{+page,+layout,+server,+page.server,+layout.server}.*",
    ]
    try:
        result = subprocess.run(
            args, capture_output=True, text=True, timeout=30,
        )
        output = result.stdout.strip()
        if not output:
            return json.dumps({"routes": [], "total": 0})

        routes = []
        for line in output.split("\n"):
            line = line.strip()
            if line and (not pattern or pattern.lower() in line.lower()):
                routes.append(line)

        return json.dumps({"routes": sorted(routes), "total": len(routes)}, indent=2)
    except (subprocess.SubprocessError, subprocess.TimeoutExpired):
        return json.dumps({"error": "Search failed or timed out"})


@mcp.tool()
def grove_impact(file_path: str) -> str:
    """Analyze the impact of changing a file — who imports it, what tests cover it, which routes use it.

    Args:
        file_path: Path to the file to analyze (relative to repo root)
    """
    import subprocess
    from pathlib import Path

    stem = Path(file_path).stem
    results = {"target": file_path, "importers": [], "tests": [], "routes": []}

    # Find importers
    try:
        result = subprocess.run(
            ["rg", "-l", "--color=never", "--type", "ts", "--type", "svelte",
             "--glob", "!node_modules", "--glob", "!.git",
             f"(from|import).*{re.escape(stem)}"],
            capture_output=True, text=True, timeout=30,
        )
        for line in result.stdout.strip().split("\n"):
            line = line.strip()
            if line and line != file_path:
                results["importers"].append(line)
    except (subprocess.SubprocessError, subprocess.TimeoutExpired):
        pass

    # Find tests
    try:
        result = subprocess.run(
            ["rg", "-l", "--color=never",
             "--glob", "*.test.*", "--glob", "*.spec.*",
             "--glob", "!node_modules", "--glob", "!.git",
             stem],
            capture_output=True, text=True, timeout=30,
        )
        for line in result.stdout.strip().split("\n"):
            line = line.strip()
            if line:
                results["tests"].append(line)
    except (subprocess.SubprocessError, subprocess.TimeoutExpired):
        pass

    # Find route usage
    try:
        result = subprocess.run(
            ["rg", "-l", "--color=never",
             "--glob", "**/routes/**",
             "--glob", "!node_modules", "--glob", "!.git",
             stem],
            capture_output=True, text=True, timeout=30,
        )
        for line in result.stdout.strip().split("\n"):
            line = line.strip()
            if line and line != file_path:
                results["routes"].append(line)
    except (subprocess.SubprocessError, subprocess.TimeoutExpired):
        pass

    return json.dumps(results, indent=2)


# =============================================================================
# SERVER ENTRY POINT
# =============================================================================


def run_server():
    """Run the MCP server with stdio transport."""
    mcp.run()


if __name__ == "__main__":
    run_server()
