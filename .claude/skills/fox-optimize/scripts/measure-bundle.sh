#!/usr/bin/env bash
# Fox Optimize — Bundle Size Measurement Script
#
# Usage:
#   ./measure-bundle.sh [package-filter]
#
# Examples:
#   ./measure-bundle.sh                          # Measure all apps
#   ./measure-bundle.sh @autumnsgrove/lattice    # Engine only
#   ./measure-bundle.sh grove-landing            # Landing app only
#
# Saves results to /tmp/fox-bundle-report.txt for before/after comparison.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../../../" && pwd)"
REPORT="/tmp/fox-bundle-report.txt"
FILTER="${1:-}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🦊 Fox Bundle Measurement${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

measure_package() {
    local name="$1"
    local build_dir="$2"

    if [ ! -d "$build_dir" ]; then
        echo -e "  ${YELLOW}⚠ $name: no build output found${NC}"
        return
    fi

    local total_js=$(find "$build_dir" -name "*.js" -exec du -cb {} + 2>/dev/null | tail -1 | cut -f1)
    local total_css=$(find "$build_dir" -name "*.css" -exec du -cb {} + 2>/dev/null | tail -1 | cut -f1)
    local total_all=$(du -sb "$build_dir" 2>/dev/null | cut -f1)

    total_js=${total_js:-0}
    total_css=${total_css:-0}
    total_all=${total_all:-0}

    local js_kb=$((total_js / 1024))
    local css_kb=$((total_css / 1024))
    local all_kb=$((total_all / 1024))

    # Color coding based on thresholds
    local js_color=$GREEN
    [ "$js_kb" -gt 150 ] && js_color=$YELLOW
    [ "$js_kb" -gt 300 ] && js_color=$RED

    echo -e "  ${CYAN}$name${NC}"
    echo -e "    JS:    ${js_color}${js_kb}kb${NC}"
    echo -e "    CSS:   ${GREEN}${css_kb}kb${NC}"
    echo -e "    Total: ${all_kb}kb"

    # Append to report for comparison
    echo "$name|js=$total_js|css=$total_css|total=$total_all|$(date +%s)" >> "$REPORT"
}

cd "$REPO_ROOT"

# Build
echo -e "${CYAN}Building...${NC}"
if [ -n "$FILTER" ]; then
    pnpm --filter "$FILTER" build 2>&1 | tail -3
else
    pnpm run build 2>&1 | tail -3
fi
echo ""

# Save previous report for comparison
PREV_REPORT="/tmp/fox-bundle-report-prev.txt"
if [ -f "$REPORT" ]; then
    cp "$REPORT" "$PREV_REPORT"
fi
> "$REPORT"

echo -e "${CYAN}Measuring bundle sizes...${NC}"
echo ""

# Measure each known build output
if [ -z "$FILTER" ] || [ "$FILTER" = "@autumnsgrove/lattice" ]; then
    measure_package "engine" "libs/engine/dist"
fi

if [ -z "$FILTER" ] || [ "$FILTER" = "grove-landing" ]; then
    measure_package "landing" "apps/landing/.svelte-kit/output/client"
fi

if [ -z "$FILTER" ] || [ "$FILTER" = "grove-plant" ]; then
    measure_package "plant" "apps/plant/.svelte-kit/output/client"
fi

echo ""

# Compare with previous if available
if [ -f "$PREV_REPORT" ]; then
    echo -e "${CYAN}Comparison with previous measurement:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    while IFS='|' read -r name js_field css_field total_field _timestamp; do
        prev_total=$(grep "^$name|" "$PREV_REPORT" 2>/dev/null | head -1 | sed 's/.*total=\([0-9]*\).*/\1/')
        curr_total=$(echo "$total_field" | sed 's/total=//')

        if [ -n "$prev_total" ] && [ "$prev_total" != "0" ]; then
            delta=$((curr_total - prev_total))
            delta_kb=$((delta / 1024))
            pct=$(echo "scale=1; $delta * 100 / $prev_total" | bc 2>/dev/null || echo "0")

            if [ "$delta" -gt 0 ]; then
                echo -e "  $name: ${RED}+${delta_kb}kb (+${pct}%)${NC}"
            elif [ "$delta" -lt 0 ]; then
                echo -e "  $name: ${GREEN}${delta_kb}kb (${pct}%)${NC}"
            else
                echo -e "  $name: ${GREEN}no change${NC}"
            fi
        fi
    done < "$REPORT"
fi

echo ""
echo -e "${CYAN}Report saved to: $REPORT${NC}"
echo -e "${CYAN}Run again after changes to compare.${NC}"
