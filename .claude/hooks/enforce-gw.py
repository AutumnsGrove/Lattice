#!/usr/bin/env python3
# CLAUDE_HOOK_EVENT: PreToolUse
"""Enforce gw (Grove Wrap) for all write operations.

Blocks raw git, gh, wrangler, and dev tool WRITE commands, redirecting
agents to use gw equivalents with proper safety tiers, Conventional
Commits enforcement, and agent-mode detection.

Strategy: Allow read-only commands for speed, block writes to force gw.

Exceptions:
- wrangler d1 — allowed (complex enough that raw access is useful)
- vitest, playwright, svelte-check, tsc — allowed (low risk, testing)
- git status/log/diff/show/blame/branch (list) — allowed (reads)
- gh pr view/list, gh issue view/list — allowed (reads)
"""
import json
import re
import sys

# Read hook input — fail open on bad input
try:
    input_data = json.load(sys.stdin)
except (json.JSONDecodeError, ValueError):
    sys.exit(0)

# Only process Bash commands
if not isinstance(input_data, dict) or input_data.get("tool_name") != "Bash":
    sys.exit(0)

# Get the command
tool_input = input_data.get("tool_input", {})
command = tool_input.get("command", "")

# Skip if command is empty
if not command.strip():
    sys.exit(0)


def block(message: str) -> None:
    """Block the command with a helpful redirect message."""
    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "block",
            "message": message,
        }
    }
    print(json.dumps(output))
    sys.exit(0)


# =============================================================================
# HELPER: Extract the first meaningful command from a pipeline/chain
# =============================================================================

def extract_commands(cmd: str) -> list[str]:
    """Extract individual commands from a chained command string.

    Splits on &&, ;, and | to find all commands, then returns them
    for individual checking.
    """
    # Split on chain operators, keeping it simple
    parts = re.split(r'\s*(?:&&|;|\|)\s*', cmd)
    return [p.strip() for p in parts if p.strip()]


# =============================================================================
# GIT COMMANDS
# =============================================================================

# Read-only git commands (always allowed)
GIT_READ_COMMANDS = {
    "status", "log", "diff", "show", "blame", "shortlog",
    "describe", "remote", "tag", "ls-files", "ls-tree",
    "rev-parse", "rev-list", "reflog", "config",
    "fetch",  # Read-only: fetches refs without changing working tree
}

# Git commands that are blocked with redirects
GIT_WRITE_REDIRECTS = {
    "commit":       "gw git commit --write -m \"type(scope): message\"",
    "push":         "gw git push --write",
    "add":          "gw git add --write <files>",
    "stash":        "gw git stash --write",
    "pull":         "gw git pull --write",
    "switch":       "gw git switch <branch>",
    "rebase":       "gw git rebase --write --force",
    "merge":        "gw git merge --write --force",
    "reset":        "gw git reset --write [--force]",
    "cherry-pick":  "gw git cherry-pick --write <commit>",
    "revert":       "gw git commit --write (after manual revert)",
    "rm":           "gw git add --write (stage removals)",
    "mv":           "gw git add --write (stage moves)",
    "restore":      "Use gw git stash or gw git switch instead",
    "worktree":     "gw git worktree ...",
}

# Destructive commands — blocked entirely, no redirect
GIT_DESTRUCTIVE = {"clean"}


def check_git(cmd_str: str) -> None:
    """Check a git command and block if it's a write operation."""
    # Parse the git subcommand
    match = re.match(r'^git\s+(.+)', cmd_str)
    if not match:
        return

    rest = match.group(1).strip()

    # Extract the subcommand (first non-flag token)
    tokens = rest.split()
    subcommand = None
    for token in tokens:
        if not token.startswith("-"):
            subcommand = token
            break

    if not subcommand:
        return

    # Special case: "git branch" without -d/-D is a read (list branches)
    if subcommand == "branch":
        if not any(flag in tokens for flag in ["-d", "-D", "--delete", "-m", "-M", "--move", "-c", "-C", "--copy"]):
            return  # Just listing branches — allow
        block(
            "Use **gw** for branch operations:\n"
            "- Delete: `gw git branch --write --delete <name>`\n"
            "- Create: `gw git branch --write <name>`"
        )

    # Special case: "git checkout" — read if checking out a file, write if branch
    if subcommand == "checkout":
        # "git checkout -- ." or "git checkout -- <file>" is destructive
        if "--" in tokens and "." in tokens:
            block(
                "**BLOCKED** — `git checkout -- .` discards all changes.\n"
                "This is destructive and cannot be undone.\n\n"
                "If you need to discard changes, let the user decide."
            )
        # "git checkout <branch>" is a switch
        block(
            "Use **gw** for switching branches:\n"
            "- `gw git switch <branch>`\n"
            "- `gw git switch -c <new-branch>` (create and switch)"
        )

    # Allow read-only commands
    if subcommand in GIT_READ_COMMANDS:
        return

    # Block destructive commands entirely
    if subcommand in GIT_DESTRUCTIVE:
        block(
            f"**BLOCKED** — `git {subcommand}` is destructive and has no gw equivalent.\n"
            "This command cannot be run by agents."
        )

    # Block write commands with redirect
    if subcommand in GIT_WRITE_REDIRECTS:
        redirect = GIT_WRITE_REDIRECTS[subcommand]
        block(
            f"Use **gw** instead of raw git for write operations:\n\n"
            f"- `git {subcommand} ...` → `{redirect}`\n\n"
            "gw enforces safety tiers, Conventional Commits, and agent protections."
        )

    # Catch-all: unknown git write commands
    # If we don't recognize it, allow it (fail open for reads)
    # but block if it looks like a known write pattern
    return


# =============================================================================
# GITHUB (gh) COMMANDS
# =============================================================================

# Read-only gh patterns (always allowed)
GH_READ_PATTERNS = [
    r'^gh\s+pr\s+(view|list|diff|checks|status)',
    r'^gh\s+issue\s+(view|list|status)',
    r'^gh\s+run\s+(view|list|watch)',
    r'^gh\s+repo\s+(view|list|clone)',
    r'^gh\s+release\s+(view|list)',
    r'^gh\s+api\s+(?!.*-X\s+(POST|PUT|PATCH|DELETE))',  # GET api calls
    r'^gh\s+auth\s+(status|token)',
    r'^gh\s+search\s+',
]

# Write gh commands with redirects
GH_WRITE_REDIRECTS = {
    r'gh\s+pr\s+create':    "gw gh pr create --write",
    r'gh\s+pr\s+merge':     "gw gh pr merge --write",
    r'gh\s+pr\s+close':     "gw gh pr close --write",
    r'gh\s+pr\s+comment':   "gw gh pr comment --write",
    r'gh\s+pr\s+review':    "gw gh pr review --write",
    r'gh\s+pr\s+edit':      "gw gh pr edit --write",
    r'gh\s+issue\s+create': "gw gh issue create --write",
    r'gh\s+issue\s+close':  "gw gh issue close --write",
    r'gh\s+issue\s+comment': "gw gh issue comment --write",
    r'gh\s+issue\s+edit':   "gw gh issue edit --write",
    r'gh\s+release\s+create': "gw gh release create --write",
    r'gh\s+release\s+delete': "gw gh release delete --write",
}


def check_gh(cmd_str: str) -> None:
    """Check a gh command and block if it's a write operation."""
    if not re.match(r'^gh\s+', cmd_str):
        return

    # Allow read-only patterns
    for pattern in GH_READ_PATTERNS:
        if re.match(pattern, cmd_str):
            return

    # Block write patterns with redirects
    for pattern, redirect in GH_WRITE_REDIRECTS.items():
        if re.search(pattern, cmd_str):
            block(
                f"Use **gw** instead of raw gh for write operations:\n\n"
                f"- `{cmd_str.split()[0]} {cmd_str.split()[1]} {cmd_str.split()[2] if len(cmd_str.split()) > 2 else '...'}` → `{redirect}`\n\n"
                "gw enforces safety tiers and rate-limit awareness."
            )

    # Check for POST/PUT/PATCH/DELETE API calls
    if re.match(r'^gh\s+api\s+', cmd_str):
        if re.search(r'-X\s+(POST|PUT|PATCH|DELETE)', cmd_str):
            block(
                "Use **gw** for write API calls:\n\n"
                "- `gh api -X POST ...` → `gw gh api --write ...`\n\n"
                "gw enforces safety tiers for GitHub API mutations."
            )

    # Unknown gh command — allow (fail open for reads)
    return


# =============================================================================
# WRANGLER COMMANDS
# =============================================================================

# D1 exception: all wrangler d1 commands are allowed
# Read-only wrangler commands
WRANGLER_READ_PATTERNS = [
    r'^wrangler\s+d1\s+',           # ALL D1 commands — explicit exception
    r'^wrangler\s+kv:key\s+get\s+',
    r'^wrangler\s+kv:key\s+list',
    r'^wrangler\s+kv\s+key\s+get\s+',
    r'^wrangler\s+kv\s+key\s+list',
    r'^wrangler\s+kv\s+namespace\s+list',
    r'^wrangler\s+r2\s+object\s+get\s+',
    r'^wrangler\s+r2\s+bucket\s+list',
    r'^wrangler\s+whoami',
    r'^wrangler\s+--version',
    r'^wrangler\s+--help',
    r'^wrangler\s+dev\s+',          # Local dev server (read-ish)
    r'^wrangler\s+tail\s+',         # Log tailing (read)
    r'^wrangler\s+types\s+',        # Type generation (read)
]

# Write wrangler commands with redirects
WRANGLER_WRITE_REDIRECTS = {
    r'wrangler\s+deploy':              "gw deploy --write",
    r'wrangler\s+pages\s+deploy':      "gw deploy --write",
    r'wrangler\s+publish':             "gw deploy --write",
    r'wrangler\s+secret\s+put':        "gw secret set --write",
    r'wrangler\s+secret\s+delete':     "gw secret delete --write",
    r'wrangler\s+kv:key\s+put':        "gw kv put --write",
    r'wrangler\s+kv:key\s+delete':     "gw kv delete --write",
    r'wrangler\s+kv\s+key\s+put':      "gw kv put --write",
    r'wrangler\s+kv\s+key\s+delete':   "gw kv delete --write",
    r'wrangler\s+r2\s+object\s+put':   "gw r2 put --write",
    r'wrangler\s+r2\s+object\s+delete': "gw r2 rm --write",
    r'wrangler\s+r2\s+bucket\s+create': "gw r2 bucket create --write",
    r'wrangler\s+r2\s+bucket\s+delete': "gw r2 bucket delete --write",
}


def check_wrangler(cmd_str: str) -> None:
    """Check a wrangler command and block if it's a write operation."""
    if not re.match(r'^wrangler\s+', cmd_str):
        return

    # Allow read-only patterns (including D1 exception)
    for pattern in WRANGLER_READ_PATTERNS:
        if re.match(pattern, cmd_str):
            return

    # Block write patterns with redirects
    for pattern, redirect in WRANGLER_WRITE_REDIRECTS.items():
        if re.search(pattern, cmd_str):
            block(
                f"Use **gw** instead of raw wrangler for write operations:\n\n"
                f"→ `{redirect}`\n\n"
                "gw enforces safety tiers and audit logging for Cloudflare operations."
            )

    # Unknown wrangler command — allow (fail open)
    return


# =============================================================================
# DEV TOOL COMMANDS
# =============================================================================

def check_dev_tools(cmd_str: str) -> None:
    """Check dev tool commands and redirect to gw equivalents."""
    # prettier --write → gw fmt
    if re.match(r'^prettier\s+--write\s+', cmd_str) or re.match(r'^prettier\s+.*--write', cmd_str):
        block(
            "Use **gw fmt** instead of raw prettier:\n\n"
            "- `prettier --write <files>` → `gw fmt`\n"
            "- `prettier --write .` → `gw fmt --all`\n\n"
            "Note: Files are also auto-formatted by the PostToolUse hook after every edit."
        )

    # eslint → gw lint
    if re.match(r'^eslint\s+', cmd_str):
        block(
            "Use **gw lint** instead of raw eslint:\n\n"
            "- `eslint <files>` → `gw lint`\n\n"
            "gw auto-detects the package and runs the correct linter."
        )

    # npm publish → gw publish npm --write
    if re.match(r'^npm\s+publish', cmd_str):
        # Note: block-npm.py allows npm publish, but we redirect to gw
        block(
            "Use **gw publish** instead of raw npm publish:\n\n"
            "- `npm publish` → `gw publish npm --write`\n\n"
            "gw handles registry swap and version verification."
        )

    # pnpm dev / bun run dev → gw dev start
    # (Not blocking these — they're common enough and low risk)


# =============================================================================
# MAIN: Check all commands in the chain
# =============================================================================

commands = extract_commands(command)

for cmd in commands:
    cmd_stripped = cmd.strip()

    # Skip empty commands
    if not cmd_stripped:
        continue

    # Skip commands that start with gw (already using gw!)
    if cmd_stripped.startswith("gw ") or cmd_stripped == "gw":
        continue

    # Check each command type
    check_git(cmd_stripped)
    check_gh(cmd_stripped)
    check_wrangler(cmd_stripped)
    check_dev_tools(cmd_stripped)

# =============================================================================
# If we get here, allow the command
# =============================================================================
sys.exit(0)
