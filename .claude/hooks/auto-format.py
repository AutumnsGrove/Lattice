#!/usr/bin/env python3
# CLAUDE_HOOK_EVENT: PostToolUse
#
# ╔══════════════════════════════════════════════════════════════════╗
# ║  RETIRED — This hook is no longer registered in settings.json  ║
# ║                                                                ║
# ║  Formatting on every Edit/Write was too aggressive for agents: ║
# ║  • Threw off diff reviews with unexpected changes              ║
# ║  • Constantly flipped indentation and quote styles             ║
# ║  • Made agents confused about what they actually changed       ║
# ║                                                                ║
# ║  Formatting now runs at COMMIT TIME via gw:                    ║
# ║  • gw git commit  — formats staged files before committing    ║
# ║  • gw git ship    — formats as step 2 (already did this)      ║
# ║  • gw git save    — formats after staging, before committing  ║
# ║                                                                ║
# ║  All three support --no-format to skip when needed.            ║
# ╚══════════════════════════════════════════════════════════════════╝
#
"""Auto-format files after Claude edits them.

RETIRED: This hook ran Prettier on every Edit/Write tool use. It was too
disruptive for agent workflows — formatting now happens at commit time
through gw git commit/ship/save instead. See the banner above.

Kept for reference. To re-enable, add this to .claude/settings.json hooks.
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
