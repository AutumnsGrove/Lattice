#!/usr/bin/env python3
# CLAUDE_HOOK_EVENT: PostToolUse
"""Auto-format files after Claude edits them.

Runs Prettier on formattable file types after Edit or Write tool use.
This shifts formatting LEFT — catching issues immediately instead of
at pre-commit hook time, eliminating entire agent turns spent on
"fix formatting and recommit" loops.

Uses `bun x prettier` for speed (10-50x faster than npx).
Never blocks — formatting failures are silent (pre-commit hook is the safety net).
"""
import json
import os
import subprocess
import sys

# Formattable file extensions (Prettier-supported types used in Grove)
# NOTE: .md/.mdx excluded — Prettier collapses code blocks inside fences,
# garbling multiline examples in skill files and reference docs.
FORMATTABLE_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".svelte",
    ".css", ".scss", ".postcss",
    ".json",
    ".html",
    ".yaml", ".yml",
}

# Read hook input
input_data = json.load(sys.stdin)

# Only process Edit and Write tools
tool_name = input_data.get("tool_name", "")
if tool_name not in ("Edit", "Write"):
    sys.exit(0)

# Extract file_path from tool input
tool_input = input_data.get("tool_input", {})
file_path = tool_input.get("file_path", "")

if not file_path:
    sys.exit(0)

# Check if file extension is formattable
ext = os.path.splitext(file_path)[1].lower()
if ext not in FORMATTABLE_EXTENSIONS:
    sys.exit(0)

# Check that the file actually exists (Write might have failed)
if not os.path.isfile(file_path):
    sys.exit(0)

# Run prettier silently — never block, never fail the hook
try:
    subprocess.run(
        ["bun", "x", "prettier", "--write", file_path],
        capture_output=True,
        timeout=15,
    )
except (subprocess.SubprocessError, FileNotFoundError, OSError):
    # Prettier not available or failed — that's fine, pre-commit hook
    # will catch it. We never block on formatting.
    pass

sys.exit(0)
