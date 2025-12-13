#!/bin/bash
#
# 🌲 GroveEngine History Backfill Script
#
# Generates historical snapshots by walking through git history.
# Uses git worktree to safely checkout old commits without affecting your working directory.
#
# Usage: ./scripts/backfill-history.sh [interval]
#   interval: Generate a snapshot every N commits (default: 20)
#
# Example: ./scripts/backfill-history.sh 10  # Every 10 commits
#

set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SNAPSHOTS_DIR="$PROJECT_ROOT/snapshots"
CSV_FILE="$SNAPSHOTS_DIR/history.csv"
WORKTREE_DIR="/tmp/grove-backfill-worktree"

# Interval between snapshots (every N commits)
INTERVAL="${1:-20}"

echo -e "${CYAN}🌲 GroveEngine History Backfill${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Generating snapshots every ${YELLOW}${INTERVAL}${NC} commits..."
echo ""

cd "$PROJECT_ROOT"

# Create fresh CSV with header
echo "timestamp,label,git_hash,total_code_lines,svelte_lines,ts_lines,js_lines,css_lines,doc_words,doc_lines,total_files,directories,estimated_tokens,commits" > "$CSV_FILE"

# Clean up any existing worktree
if [ -d "$WORKTREE_DIR" ]; then
    git worktree remove "$WORKTREE_DIR" --force 2>/dev/null || rm -rf "$WORKTREE_DIR"
fi

# Get all commits in reverse chronological order (oldest first)
COMMITS=($(git rev-list --reverse HEAD))
TOTAL_COMMITS=${#COMMITS[@]}

echo -e "Found ${GREEN}${TOTAL_COMMITS}${NC} commits in history"
echo ""

# Calculate which commits to snapshot
SNAPSHOT_COUNT=0
SNAPSHOTS_TO_GENERATE=()

for ((i=0; i<TOTAL_COMMITS; i+=INTERVAL)); do
    SNAPSHOTS_TO_GENERATE+=("${COMMITS[$i]}")
done

# Always include the latest commit
LATEST="${COMMITS[$((TOTAL_COMMITS-1))]}"
if [[ ! " ${SNAPSHOTS_TO_GENERATE[@]} " =~ " ${LATEST} " ]]; then
    SNAPSHOTS_TO_GENERATE+=("$LATEST")
fi

echo -e "Will generate ${GREEN}${#SNAPSHOTS_TO_GENERATE[@]}${NC} snapshots"
echo ""

# Function to count stats at a specific commit
count_stats() {
    local worktree="$1"
    local commit_num="$2"

    cd "$worktree"

    # Count lines by file type
    local ts_lines=$(find . -name "*.ts" ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" -type f -exec cat {} + 2>/dev/null | wc -l | tr -d ' ')
    local svelte_lines=$(find . -name "*.svelte" ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" -type f -exec cat {} + 2>/dev/null | wc -l | tr -d ' ')
    local js_lines=$(find . -name "*.js" ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" -type f -exec cat {} + 2>/dev/null | wc -l | tr -d ' ')
    local css_lines=$(find . -name "*.css" ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" -type f -exec cat {} + 2>/dev/null | wc -l | tr -d ' ')

    # Count documentation
    local md_words=0
    local md_lines=0
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            local lines=$(wc -l < "$file" 2>/dev/null || echo 0)
            local words=$(wc -w < "$file" 2>/dev/null || echo 0)
            md_lines=$((md_lines + lines))
            md_words=$((md_words + words))
        fi
    done < <(find . -name "*.md" ! -path "*/node_modules/*" ! -path "*/.git/*" -type f 2>/dev/null)

    # Count files
    local ts_files=$(find . -name "*.ts" ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" -type f 2>/dev/null | wc -l | tr -d ' ')
    local svelte_files=$(find . -name "*.svelte" ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" -type f 2>/dev/null | wc -l | tr -d ' ')
    local js_files=$(find . -name "*.js" ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" -type f 2>/dev/null | wc -l | tr -d ' ')
    local css_files=$(find . -name "*.css" ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" -type f 2>/dev/null | wc -l | tr -d ' ')
    local md_files=$(find . -name "*.md" ! -path "*/node_modules/*" ! -path "*/.git/*" -type f 2>/dev/null | wc -l | tr -d ' ')
    local json_files=$(find . -name "*.json" ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" -type f 2>/dev/null | wc -l | tr -d ' ')

    local total_code=$((ts_lines + svelte_lines + js_lines + css_lines))
    local total_files=$((ts_files + svelte_files + js_files + css_files + md_files + json_files))
    local directories=$(find . -type d ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" 2>/dev/null | wc -l | tr -d ' ')

    # Character counts for token estimation
    local code_chars=$(find . \( -name "*.ts" -o -name "*.js" -o -name "*.svelte" -o -name "*.css" \) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" -type f -exec cat {} + 2>/dev/null | wc -c | tr -d ' ')
    local md_chars=0
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            local chars=$(wc -c < "$file" 2>/dev/null || echo 0)
            md_chars=$((md_chars + chars))
        fi
    done < <(find . -name "*.md" ! -path "*/node_modules/*" ! -path "*/.git/*" -type f 2>/dev/null)

    local total_chars=$((code_chars + md_chars))
    local estimated_tokens=$((total_chars / 4))

    # Return values via echo (will be captured)
    echo "$total_code,$svelte_lines,$ts_lines,$js_lines,$css_lines,$md_words,$md_lines,$total_files,$directories,$estimated_tokens"
}

# Process each snapshot commit
CURRENT=0
for COMMIT in "${SNAPSHOTS_TO_GENERATE[@]}"; do
    CURRENT=$((CURRENT + 1))

    # Get commit info
    COMMIT_DATE=$(git show -s --format='%ci' "$COMMIT" | cut -d' ' -f1)
    COMMIT_HASH=$(git rev-parse --short "$COMMIT")
    COMMIT_NUM=$(git rev-list --count "$COMMIT")
    COMMIT_MSG=$(git show -s --format='%s' "$COMMIT" | head -c 30)

    echo -ne "  [${CURRENT}/${#SNAPSHOTS_TO_GENERATE[@]}] ${COMMIT_DATE} (${COMMIT_HASH})... "

    # Create worktree at this commit
    git worktree add "$WORKTREE_DIR" "$COMMIT" --quiet 2>/dev/null

    # Gather stats
    STATS=$(count_stats "$WORKTREE_DIR" "$COMMIT_NUM")

    # Clean up worktree
    cd "$PROJECT_ROOT"
    git worktree remove "$WORKTREE_DIR" --force 2>/dev/null || rm -rf "$WORKTREE_DIR"

    # Create timestamp from commit date
    TIMESTAMP="${COMMIT_DATE}_00-00-00"

    # Determine label
    if [ "$COMMIT" = "$LATEST" ]; then
        LABEL="current"
    else
        LABEL="commit-${COMMIT_NUM}"
    fi

    # Append to CSV
    echo "${TIMESTAMP},${LABEL},${COMMIT_HASH},${STATS},${COMMIT_NUM}" >> "$CSV_FILE"

    echo -e "${GREEN}✓${NC}"
done

# Also sync to landing
mkdir -p "$PROJECT_ROOT/landing/static/data"
cp "$CSV_FILE" "$PROJECT_ROOT/landing/static/data/history.csv"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Backfill complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Generated ${CYAN}${#SNAPSHOTS_TO_GENERATE[@]}${NC} historical snapshots"
echo -e "  CSV saved to: ${CYAN}${CSV_FILE}${NC}"
echo -e "  Synced to: ${CYAN}landing/static/data/history.csv${NC}"
echo ""
echo -e "  ${YELLOW}Tip:${NC} View the timeline at /journey on your landing page"
echo ""
