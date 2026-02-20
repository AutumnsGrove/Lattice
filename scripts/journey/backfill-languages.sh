#!/bin/bash
#
# Backfill New Language Columns for history.csv
#
# Iterates through each row in history.csv, checks out the corresponding
# git commit by hash, counts the new languages (Python, Go, SQL, Shell, TSX),
# and writes an updated CSV with all 23 columns.
#
# The script also recalculates total_code_lines to include all 9 languages.
#
# Usage:
#   bash scripts/journey/backfill-languages.sh                # Run backfill
#   bash scripts/journey/backfill-languages.sh --dry-run      # Preview only
#
# What this does:
#   1. Reads snapshots/history.csv (18-column format)
#   2. For each row, checks out the git commit
#   3. Counts py, go, sql, sh, tsx lines at that commit
#   4. Recalculates total_code_lines = sum of all 9 languages
#   5. Writes updated 23-column CSV
#   6. Copies to apps/landing/static/data/history.csv
#   7. Restores the original branch
#
# Note: Rows where the git hash can't be found get 0 for new languages
# and keep their original total_code_lines.

set -e

# Parse arguments
DRY_RUN=false
if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    echo "=== DRY RUN MODE — no files will be modified ==="
    echo ""
fi

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

INPUT_CSV="$PROJECT_ROOT/snapshots/history.csv"
OUTPUT_CSV="$PROJECT_ROOT/snapshots/history.csv.new"
LANDING_CSV="$PROJECT_ROOT/apps/landing/static/data/history.csv"

if [ ! -f "$INPUT_CSV" ]; then
    echo "ERROR: $INPUT_CSV not found"
    exit 1
fi

# Save current branch/state to restore later
ORIGINAL_REF=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || git rev-parse HEAD)
echo "Current branch: $ORIGINAL_REF"
echo "Input CSV: $INPUT_CSV"
echo ""

# Ensure working tree is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "WARNING: Working tree has uncommitted changes."
    echo "Stashing changes before backfill..."
    git stash push -m "backfill-languages: auto-stash" --include-untracked
    STASHED=true
else
    STASHED=false
fi

# Count lines of code for a given file extension at the current checkout
# Excludes node_modules, .git, dist, .svelte-kit
count_lines_for_ext() {
    local ext="$1"
    find . -name "*.$ext" \
        ! -path "*/node_modules/*" \
        ! -path "*/.git/*" \
        ! -path "*/dist/*" \
        ! -path "*/.svelte-kit/*" \
        -type f -exec cat {} + 2>/dev/null | wc -l | tr -d ' '
}

# Write the new CSV header
NEW_HEADER="timestamp,label,git_hash,total_code_lines,svelte_lines,ts_lines,js_lines,css_lines,doc_words,doc_lines,total_files,directories,estimated_tokens,commits,test_files,test_lines,bundle_size_kb,npm_unpacked_size,py_lines,go_lines,sql_lines,sh_lines,tsx_lines"

if [ "$DRY_RUN" = false ]; then
    echo "$NEW_HEADER" > "$OUTPUT_CSV"
fi

echo "=== Backfilling language counts ==="
echo ""

# Process each data row (skip header)
ROW_NUM=0
TOTAL_ROWS=$(tail -n +2 "$INPUT_CSV" | wc -l | tr -d ' ')

tail -n +2 "$INPUT_CSV" | while IFS=',' read -r timestamp label git_hash total_code_lines svelte_lines ts_lines js_lines css_lines doc_words doc_lines total_files directories estimated_tokens commits test_files test_lines bundle_size_kb npm_unpacked_size rest; do
    ROW_NUM=$((ROW_NUM + 1))

    # Handle npm_unpacked_size — if the original CSV only had 17 columns,
    # npm_unpacked_size might be empty
    if [ -z "$npm_unpacked_size" ]; then
        npm_unpacked_size=0
    fi

    echo -n "[$ROW_NUM/$TOTAL_ROWS] $label ($git_hash)..."

    # Try to check out this commit
    PY_LINES=0
    GO_LINES=0
    SQL_LINES=0
    SH_LINES=0
    TSX_LINES=0

    if git cat-file -t "$git_hash" &>/dev/null; then
        # Commit exists — check it out and count
        git checkout --quiet "$git_hash" 2>/dev/null

        PY_LINES=$(count_lines_for_ext "py")
        GO_LINES=$(count_lines_for_ext "go")
        SQL_LINES=$(count_lines_for_ext "sql")
        SH_LINES=$(count_lines_for_ext "sh")
        TSX_LINES=$(count_lines_for_ext "tsx")

        # Recalculate total to include all 9 languages
        NEW_TOTAL=$((svelte_lines + ts_lines + js_lines + css_lines + PY_LINES + GO_LINES + SQL_LINES + SH_LINES + TSX_LINES))

        echo " py=$PY_LINES go=$GO_LINES sql=$SQL_LINES sh=$SH_LINES tsx=$TSX_LINES | total: $total_code_lines -> $NEW_TOTAL"
    else
        echo " SKIP (commit not found) — using 0 for new languages"
        NEW_TOTAL=$total_code_lines
    fi

    if [ "$DRY_RUN" = false ]; then
        echo "$timestamp,$label,$git_hash,$NEW_TOTAL,$svelte_lines,$ts_lines,$js_lines,$css_lines,$doc_words,$doc_lines,$total_files,$directories,$estimated_tokens,$commits,$test_files,$test_lines,$bundle_size_kb,$npm_unpacked_size,$PY_LINES,$GO_LINES,$SQL_LINES,$SH_LINES,$TSX_LINES" >> "$OUTPUT_CSV"
    fi
done

# Restore original branch
echo ""
echo "Restoring to $ORIGINAL_REF..."
git checkout --quiet "$ORIGINAL_REF" 2>/dev/null

# Restore stashed changes if we stashed
if [ "$STASHED" = true ]; then
    echo "Restoring stashed changes..."
    git stash pop --quiet 2>/dev/null || true
fi

if [ "$DRY_RUN" = true ]; then
    echo ""
    echo "=== DRY RUN COMPLETE — no files modified ==="
    exit 0
fi

# Replace original CSV and copy to landing
echo ""
echo "Replacing $INPUT_CSV with updated data..."
mv "$OUTPUT_CSV" "$INPUT_CSV"

echo "Copying to $LANDING_CSV..."
cp "$INPUT_CSV" "$LANDING_CSV"

echo ""
echo "=== Backfill complete! ==="
echo "  Updated: $INPUT_CSV"
echo "  Synced:  $LANDING_CSV"
echo "  Rows:    $TOTAL_ROWS"
echo "  Columns: 18 -> 23 (added py_lines, go_lines, sql_lines, sh_lines, tsx_lines)"
