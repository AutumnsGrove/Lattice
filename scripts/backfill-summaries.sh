#!/bin/bash
#
# 🌲 Backfill Release Summaries
#
# Generates summaries for all historical versions in history.csv
#
# Usage: ./scripts/backfill-summaries.sh
#

set -e

# Colors for terminal output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CSV_FILE="$PROJECT_ROOT/snapshots/history.csv"

echo -e "${CYAN}🌲 Backfilling Release Summaries${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$PROJECT_ROOT"

# Check if history.csv exists
if [ ! -f "$CSV_FILE" ]; then
    echo -e "${YELLOW}No history.csv found${NC}"
    exit 0
fi

# Read versions from CSV (skip header, filter for v* tags)
VERSIONS=$(tail -n +2 "$CSV_FILE" | cut -d',' -f2 | grep '^v' || echo "")

if [ -z "$VERSIONS" ]; then
    echo -e "${YELLOW}No versions found in history.csv${NC}"
    exit 0
fi

echo "Found versions to process:"
echo "$VERSIONS" | sed 's/^/  /'
echo ""

# Process each version
PREV_HASH=""
while IFS=',' read -r timestamp label git_hash rest; do
    # Skip header
    if [ "$label" = "label" ]; then
        continue
    fi

    # Only process version tags
    if [[ ! "$label" =~ ^v ]]; then
        continue
    fi

    echo -e "${CYAN}Processing $label...${NC}"

    # Check if summary already exists
    SUMMARY_FILE="$PROJECT_ROOT/snapshots/summaries/${label}.json"
    if [ -f "$SUMMARY_FILE" ]; then
        echo -e "  ${GREEN}✓ Summary already exists, skipping${NC}"
        PREV_HASH="$git_hash"
        continue
    fi

    # Generate summary
    if [ -z "$PREV_HASH" ]; then
        # First version - compare against initial commit
        echo "  First version, using all commits up to $git_hash"
        PREV_HASH=$(git rev-list --max-parents=0 HEAD)
    fi

    echo "  Comparing $PREV_HASH..$git_hash"

    # Check if we have commits in this range
    COMMIT_COUNT=$(git log "$PREV_HASH..$git_hash" --oneline --no-merges 2>/dev/null | wc -l | tr -d ' ')

    if [ "$COMMIT_COUNT" -eq 0 ]; then
        echo -e "  ${YELLOW}No commits found, skipping${NC}"
        PREV_HASH="$git_hash"
        continue
    fi

    # Generate summary using the commit hash range
    ./scripts/generate-release-summary.sh "$label" "$PREV_HASH" 2>&1 | sed 's/^/  /'

    PREV_HASH="$git_hash"
    echo ""

done < "$CSV_FILE"

echo -e "${GREEN}✓ Backfill complete${NC}"
echo ""
echo "Generated summaries are in: snapshots/summaries/"
echo ""
echo "To sync to landing page, run:"
echo "  mkdir -p landing/static/data/summaries"
echo "  cp -r snapshots/summaries/* landing/static/data/summaries/"
