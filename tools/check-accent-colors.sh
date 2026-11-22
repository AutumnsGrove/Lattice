#!/bin/bash
# Check for hardcoded accent colors in source files.
# Mirrors the pre-commit hook logic but runs on all source files (CI) or
# changed files only (PR mode). Exit 1 if violations found.
#
# Usage:
#   ./tools/check-accent-colors.sh              # scan all source files
#   ./tools/check-accent-colors.sh --pr <base>  # scan only files changed since <base>

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

# Determine file list
if [[ "${1:-}" == "--pr" ]]; then
    BASE="${2:-origin/main}"
    FILES=$(git diff --name-only "$BASE"...HEAD -- '*.svelte' '*.css' 2>/dev/null || true)
else
    FILES=$(find apps libs workers services -type f \( -name '*.svelte' -o -name '*.css' \) \
        ! -path '*/.svelte-kit/*' \
        ! -path '*/node_modules/*' \
        ! -path '*/dist/*' \
        ! -path '*/_junkdrawer/*' \
        2>/dev/null || true)
fi

[ -z "$FILES" ] && { echo -e "${GREEN}✓ No files to check${NC}"; exit 0; }

# Green hex patterns (accent greens that should use --grove-accent-* tokens)
PATTERN='#(22c55e|4ade80|16a34a|86efac|15803d|10b981|059669|166534|14532d|dcfce7|bbf7d0|f0fdf4)'

hits=""

while IFS= read -r f; do
    [ -z "$f" ] && continue
    [ ! -f "$f" ] && continue

    # Exempt paths (superset of pre-commit hook exemptions)
    case "$f" in
        _junkdrawer/*|*/_junkdrawer/*) continue ;;
        libs/prism/*) continue ;;
        libs/foliage/src/lib/themes/*) continue ;;
        libs/foliage/src/lib/components/AccentColorPicker*) continue ;;
        libs/foliage/src/lib/components/ColorPanel*) continue ;;
        libs/foliage/src/lib/components/CommunityThemeBrowser*) continue ;;
        libs/foliage/src/routes/*) continue ;;
        libs/gossamer/*) continue ;;
        libs/engine/src/lib/config/presets.ts) continue ;;
        libs/engine/src/lib/heartwood/colors.ts) continue ;;
        libs/engine/src/lib/styles/tokens.css) continue ;;
        *Logo*|*nature/*|*vine-pattern*|*TerrariumGlobe*) continue ;;
        *GroveIsland*|*forest/+page*) continue ;;
        *email*|*template*) continue ;;
        *.test.*|*.spec.*) continue ;;
    esac

    # Search for violations
    while IFS=: read -r line_num line_content; do
        [ -z "$line_num" ] && continue

        # Skip lines with accent-ok suppression
        echo "$line_content" | grep -qi 'accent-ok' && continue

        # Skip CSS variable usage (var(--color-accent, #hex) is correct)
        echo "$line_content" | grep -q 'var(--color-accent' && continue
        echo "$line_content" | grep -q 'var(--color-primary' && continue

        # Skip semantic status colors (success = green is universal UX)
        echo "$line_content" | grep -qi 'color-success\|status-operational\|--status-ready' && continue

        # Skip color picker defaults and placeholders
        echo "$line_content" | grep -qi 'placeholder\|value=' && continue

        # Check 5 lines above for accent-ok comment
        found_ok=false
        for offset in 1 2 3 4 5; do
            check_line=$(sed -n "$((line_num - offset))p" "$f" 2>/dev/null || true)
            if echo "$check_line" | grep -qi 'accent-ok'; then
                found_ok=true
                break
            fi
        done
        $found_ok && continue

        hits="${hits}  ${f}:${line_num}: $(echo "$line_content" | sed 's/^[[:space:]]*//')\n"
    done < <(grep -niE "$PATTERN" "$f" 2>/dev/null || true)
done <<< "$FILES"

if [ -n "$hits" ]; then
    echo -e "${RED}✗ Hardcoded accent colors found${NC}"
    echo -e "${YELLOW}These should use --grove-accent-* tokens from Prism,"
    echo -e "or add // accent-ok if intentional (brand assets, palette defs).${NC}"
    echo ""
    echo -e "$hits"
    echo ""
    echo -e "${YELLOW}Remaining violations are in internal tooling (foliage)."
    echo -e "Add // accent-ok or <!-- accent-ok --> to suppress.${NC}"
    exit 1
else
    echo -e "${GREEN}✓ No hardcoded accent colors (Prism accent gateway enforced)${NC}"
    exit 0
fi
