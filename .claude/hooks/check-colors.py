#!/usr/bin/env python3
# CLAUDE_HOOK_EVENT: PreToolUse
"""Block standard Tailwind color classes that aren't in the Grove palette.

Grove uses a custom design system (tailwind.preset.js) with semantic tokens.
Standard Tailwind colors like gray-*, neutral-*, red-*, blue-* etc. are NOT
defined — they generate no CSS and render as transparent/invisible.

This hook catches agents writing bad color classes BEFORE the edit lands,
the same way enforce-gw.py catches raw git commands.

Escape hatch: Include "brand-color: intentional" in a nearby comment to
suppress checking for that edit (used for platform brand colors, game UI, etc.)
"""
import json
import os
import re
import sys

# Read hook input
input_data = json.load(sys.stdin)

# Only process Edit and Write tools
tool_name = input_data.get("tool_name", "")
if tool_name not in ("Edit", "Write"):
    sys.exit(0)

tool_input = input_data.get("tool_input", {})
file_path = tool_input.get("file_path", "")

# Only check UI files where Tailwind classes are used
CHECKED_EXTENSIONS = {".svelte", ".css", ".postcss", ".html"}
ext = os.path.splitext(file_path)[1].lower()
if ext not in CHECKED_EXTENSIONS:
    sys.exit(0)

# Skip config/preset files (they define the system itself)
basename = os.path.basename(file_path)
if basename in ("tailwind.preset.js", "tailwind.config.js", "tailwind.config.ts"):
    sys.exit(0)

# Get the content being written
if tool_name == "Edit":
    content = tool_input.get("new_string", "")
elif tool_name == "Write":
    content = tool_input.get("content", "")
else:
    sys.exit(0)

if not content:
    sys.exit(0)

# Escape hatch: if the content includes the intentional marker, skip
if "brand-color: intentional" in content:
    sys.exit(0)

# =============================================================================
# BANNED COLOR FAMILIES
# Standard Tailwind colors not in the Grove palette
# =============================================================================

BANNED_FAMILIES = {
    # Grays (use foreground-*, surface-*, muted-*, border-*)
    "gray", "slate", "zinc", "neutral", "stone",
    # Reds (use error, destructive)
    "red",
    # Blues (use info)
    "blue",
    # Greens (use success, or grove-* for brand green)
    "green", "emerald",
    # Ambers/Yellows (use warning)
    "amber", "yellow", "orange",
    # Purples (use accent)
    "purple", "violet", "indigo", "fuchsia",
    # Pinks (use accent or destructive)
    "pink", "rose",
    # Others
    "teal", "cyan", "sky", "lime",
}

# Tailwind utility prefixes that take color values
UTILITY_PREFIXES = (
    "bg", "text", "border", "ring", "divide", "outline",
    "from", "to", "via",  # gradients
    "shadow", "decoration", "placeholder", "caret", "fill", "stroke",
    "accent",
)

# Build the regex: match Tailwind color classes including variant prefixes
# Matches: bg-gray-500, dark:text-neutral-100, hover:border-red-300/50, etc.
prefix_pattern = "|".join(re.escape(p) for p in UTILITY_PREFIXES)
family_pattern = "|".join(re.escape(f) for f in BANNED_FAMILIES)

# Pattern: optional variant prefix(es), utility prefix, banned color family, shade number
# Handles: bg-gray-500, dark:hover:text-red-300, bg-amber-100/80, etc.
COLOR_REGEX = re.compile(
    rf'(?:[\w-]+:)*'              # optional variant prefixes (dark:, hover:, etc.)
    rf'(?:{prefix_pattern})-'     # utility prefix (bg-, text-, border-, etc.)
    rf'({family_pattern})-'       # banned color family
    rf'\d+'                       # shade number (50, 100, ..., 950)
    rf'(?:/\d+)?'                 # optional opacity modifier (/50, /80)
)

# Suggestion map: banned family → Grove alternative
SUGGESTIONS = {
    "gray":    "surface-*, foreground-muted, border-border, muted",
    "slate":   "surface-*, foreground-muted, border-border, muted",
    "zinc":    "surface-*, foreground-muted, border-border, muted",
    "neutral": "surface-*, foreground-muted, border-border, muted",
    "stone":   "surface-*, foreground-muted, border-border, muted",
    "red":     "error, destructive, bg-error-bg",
    "rose":    "error, destructive, bg-error-bg",
    "pink":    "accent, destructive",
    "blue":    "info, bg-info-bg, text-info",
    "sky":     "info, bg-info-bg",
    "cyan":    "info, bg-info-bg",
    "teal":    "info, success",
    "green":   "success, bg-success-bg, grove-*",
    "emerald": "success, bg-success-bg, grove-*",
    "lime":    "success, grove-*",
    "amber":   "warning, bg-warning-bg, text-warning",
    "yellow":  "warning, bg-warning-bg",
    "orange":  "warning, bg-warning-bg",
    "purple":  "accent, bg-accent-subtle",
    "violet":  "accent, bg-accent-subtle",
    "indigo":  "accent, bg-accent-subtle",
    "fuchsia": "accent",
}


def block(message: str) -> None:
    """Block the tool use with a helpful message."""
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
# SCAN CONTENT
# =============================================================================

matches = COLOR_REGEX.findall(content)

if not matches:
    sys.exit(0)

# Deduplicate and collect suggestions
found_families = sorted(set(matches))
lines = []
for family in found_families:
    suggestion = SUGGESTIONS.get(family, "check tailwind.preset.js")
    lines.append(f"  • `{family}-*` → use **{suggestion}**")

# Find the actual class names for the error message
actual_classes = sorted(set(COLOR_REGEX.findall(content)))
examples = sorted(set(m.group(0) for m in COLOR_REGEX.finditer(content)))[:5]

block(
    f"**Grove color violation** in `{os.path.basename(file_path)}`\n\n"
    f"Found standard Tailwind color classes not in the Grove palette:\n"
    + "\n".join(f"  `{ex}`" for ex in examples) + "\n\n"
    "These classes generate **no CSS** and render as transparent/invisible.\n\n"
    "**Use Grove tokens instead:**\n"
    + "\n".join(lines) + "\n\n"
    "Full palette reference: `AGENT.md` → *Verify Colors Exist*\n"
    "Escape hatch: add `brand-color: intentional` comment if deliberate."
)
