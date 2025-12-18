#!/bin/bash
#
# 🌲 GroveEngine Repository Snapshot Generator
#
# Creates a visual snapshot of repository statistics for tracking progress over time.
# Outputs to both a timestamped markdown file and appends to a CSV for trend analysis.
#
# Usage: ./scripts/repo-snapshot.sh [optional-label]
# Example: ./scripts/repo-snapshot.sh "post-auth-refactor"
#
# CSV Schema (14 columns):
#   1. timestamp         - YYYY-MM-DD_HH-MM-SS format
#   2. label             - Snapshot label (version tag or custom name)
#   3. git_hash          - Short git commit hash
#   4. total_code_lines  - Total lines across all code files
#   5. svelte_lines      - Lines of Svelte code
#   6. ts_lines          - Lines of TypeScript code
#   7. js_lines          - Lines of JavaScript code
#   8. css_lines         - Lines of CSS code
#   9. doc_words         - Total words in markdown documentation
#   10. doc_lines        - Total lines in markdown files
#   11. total_files      - Total number of tracked files
#   12. directories      - Total number of directories
#   13. estimated_tokens - Estimated LLM tokens (~4 chars per token)
#   14. commits          - Total git commits at this point
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
SNAPSHOTS_DIR="$PROJECT_ROOT/snapshots"

# Create snapshots directory if it doesn't exist
mkdir -p "$SNAPSHOTS_DIR"

# Timestamp and optional label
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
DATE_HUMAN=$(date +"%B %d, %Y at %H:%M")
LABEL="${1:-snapshot}"
FILENAME="$SNAPSHOTS_DIR/${TIMESTAMP}_${LABEL}.md"
CSV_FILE="$SNAPSHOTS_DIR/history.csv"

echo -e "${CYAN}🌲 GroveEngine Repository Snapshot${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Gathering statistics..."

cd "$PROJECT_ROOT"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

# Paths to exclude from searches
EXCLUDE_PATHS="! -path '*/node_modules/*' ! -path '*/.git/*' ! -path '*/dist/*' ! -path '*/.svelte-kit/*'"

# Count lines of code for a given file pattern
count_lines() {
    local pattern="$1"
    find . -name "$pattern" ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" ! -path "*/.svelte-kit/*" -type f -exec cat {} + 2>/dev/null | wc -l | tr -d ' '
}

# Count number of files matching a pattern
count_files() {
    local pattern="$1"
    find . -name "$pattern" ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" ! -path "*/.svelte-kit/*" -type f 2>/dev/null | wc -l | tr -d ' '
}

# ============================================================================
# GATHER STATISTICS
# ============================================================================

echo -n "  Counting TypeScript..."
TS_LINES=$(count_lines "*.ts")
TS_FILES=$(count_files "*.ts")
echo -e " ${GREEN}✓${NC}"

echo -n "  Counting Svelte..."
SVELTE_LINES=$(count_lines "*.svelte")
SVELTE_FILES=$(count_files "*.svelte")
echo -e " ${GREEN}✓${NC}"

echo -n "  Counting JavaScript..."
JS_LINES=$(count_lines "*.js")
JS_FILES=$(count_files "*.js")
echo -e " ${GREEN}✓${NC}"

echo -n "  Counting CSS..."
CSS_LINES=$(count_lines "*.css")
CSS_FILES=$(count_files "*.css")
echo -e " ${GREEN}✓${NC}"

echo -n "  Counting Documentation..."
MD_LINES=0
MD_WORDS=0
MD_CHARS=0
MD_FILES=0
while IFS= read -r file; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file" 2>/dev/null || echo 0)
        words=$(wc -w < "$file" 2>/dev/null || echo 0)
        chars=$(wc -c < "$file" 2>/dev/null || echo 0)
        MD_LINES=$((MD_LINES + lines))
        MD_WORDS=$((MD_WORDS + words))
        MD_CHARS=$((MD_CHARS + chars))
        MD_FILES=$((MD_FILES + 1))
    fi
done < <(find . -name "*.md" ! -path "*/node_modules/*" ! -path "*/.git/*" -type f 2>/dev/null)
echo -e " ${GREEN}✓${NC}"

echo -n "  Counting JSON files..."
JSON_FILES=$(count_files "*.json")
echo -e " ${GREEN}✓${NC}"

echo -n "  Analyzing code characters..."
CODE_CHARS=$(find . \( -name "*.ts" -o -name "*.js" -o -name "*.svelte" -o -name "*.css" -o -name "*.html" \) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" ! -path "*/.svelte-kit/*" -type f -exec cat {} + 2>/dev/null | wc -c | tr -d ' ')
echo -e " ${GREEN}✓${NC}"

echo -n "  Counting directories..."
TOTAL_DIRS=$(find . -type d ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" ! -path "*/.svelte-kit/*" | wc -l | tr -d ' ')
echo -e " ${GREEN}✓${NC}"

echo -n "  Reading git history..."
GIT_COMMITS=$(git rev-list --count HEAD 2>/dev/null || echo "0")
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo -e " ${GREEN}✓${NC}"

# Calculate totals
TOTAL_CODE_LINES=$((TS_LINES + SVELTE_LINES + JS_LINES + CSS_LINES))
TOTAL_FILES=$((TS_FILES + SVELTE_FILES + JS_FILES + CSS_FILES + MD_FILES + JSON_FILES))
TOTAL_CHARS=$((CODE_CHARS + MD_CHARS))
ESTIMATED_TOKENS=$((TOTAL_CHARS / 4))

# Calculate percentages
if [ "$TOTAL_CODE_LINES" -gt 0 ]; then
    SVELTE_PCT=$((SVELTE_LINES * 100 / TOTAL_CODE_LINES))
    TS_PCT=$((TS_LINES * 100 / TOTAL_CODE_LINES))
    JS_PCT=$((JS_LINES * 100 / TOTAL_CODE_LINES))
    CSS_PCT=$((CSS_LINES * 100 / TOTAL_CODE_LINES))
else
    SVELTE_PCT=0
    TS_PCT=0
    JS_PCT=0
    CSS_PCT=0
fi

# Book pages estimate (roughly 500 words per page)
BOOK_PAGES=$((MD_WORDS / 500))

# Format numbers with commas
format_number() {
    echo "$1" | sed ':a;s/\B[0-9]\{3\}\>$/,&/;ta'
}

TOTAL_CODE_FMT=$(format_number $TOTAL_CODE_LINES)
SVELTE_LINES_FMT=$(format_number $SVELTE_LINES)
TS_LINES_FMT=$(format_number $TS_LINES)
JS_LINES_FMT=$(format_number $JS_LINES)
CSS_LINES_FMT=$(format_number $CSS_LINES)
MD_LINES_FMT=$(format_number $MD_LINES)
MD_WORDS_FMT=$(format_number $MD_WORDS)
TOTAL_CHARS_FMT=$(format_number $TOTAL_CHARS)
ESTIMATED_TOKENS_FMT=$(format_number $ESTIMATED_TOKENS)
CODE_TOKENS_FMT=$(format_number $((CODE_CHARS / 4)))
DOC_TOKENS_FMT=$(format_number $((MD_CHARS / 4)))

# Generate bar for visualization (max 50 chars)
generate_bar() {
    local value=$1
    local max=$2
    local width=50

    if [ "$max" -eq 0 ]; then
        printf '%.0s-' $(seq 1 $width)
        return
    fi

    local filled=$((value * width / max))
    local unfilled=$((width - filled))

    # Use simple ASCII characters for compatibility
    local i
    for ((i=0; i<filled; i++)); do printf '#'; done
    for ((i=0; i<unfilled; i++)); do printf '.'; done
}

echo ""
echo -e "${GREEN}Statistics gathered!${NC}"
echo ""
echo -e "Generating snapshot..."

# ============================================================================
# GENERATE SNAPSHOT FILE
# ============================================================================

cat > "$FILENAME" << SNAPSHOT
# 🌲 GroveEngine Repository Snapshot

**Generated:** ${DATE_HUMAN}
**Label:** ${LABEL}
**Git:** \`${GIT_HASH}\` on \`${GIT_BRANCH}\`

---

\`\`\`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║     🌲  G R O V E   E N G I N E   •   R E P O S I T O R Y   S T A T S  🌲     ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

                     ╭──────────────────────────────────╮
                     │      TOTAL LINES OF CODE         │
                     │                                  │
                     │          ██████  ${TOTAL_CODE_FMT}          │
                     │                                  │
                     ╰──────────────────────────────────╯

┌─────────────────────────────────────────────────────────────────────────────┐
│                        CODE COMPOSITION BY LANGUAGE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Svelte     $(generate_bar $SVELTE_LINES $TOTAL_CODE_LINES)  ${SVELTE_LINES_FMT}   │
│   (${SVELTE_PCT}%)                                                                  │
│                                                                             │
│   TypeScript $(generate_bar $TS_LINES $TOTAL_CODE_LINES)  ${TS_LINES_FMT}   │
│   (${TS_PCT}%)                                                                      │
│                                                                             │
│   JavaScript $(generate_bar $JS_LINES $TOTAL_CODE_LINES)  ${JS_LINES_FMT}   │
│   (${JS_PCT}%)                                                                      │
│                                                                             │
│   CSS        $(generate_bar $CSS_LINES $TOTAL_CODE_LINES)  ${CSS_LINES_FMT}   │
│   (${CSS_PCT}%)                                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           📚 DOCUMENTATION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│       ┌───────────────┐    ┌───────────────┐    ┌───────────────┐          │
│       │    ${MD_LINES_FMT}     │    │   ${MD_WORDS_FMT}     │    │     ${MD_FILES}       │          │
│       │    LINES      │    │    WORDS      │    │    FILES      │          │
│       └───────────────┘    └───────────────┘    └───────────────┘          │
│                                                                             │
│                   That's roughly a ${BOOK_PAGES}-page book! 📖                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          🔮 TOKEN ESTIMATION                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│       TOTAL PROJECT: ~${TOTAL_CHARS_FMT} CHARACTERS                               │
│                                                                             │
│       ╔═════════════════════════════════════════╗                           │
│       ║                                         ║                           │
│       ║     ~${ESTIMATED_TOKENS_FMT} TOKENS (ESTIMATED)         ║                           │
│       ║                                         ║                           │
│       ║     Code:   ~${CODE_TOKENS_FMT} tokens             ║                           │
│       ║     Docs:   ~${DOC_TOKENS_FMT} tokens             ║                           │
│       ║                                         ║                           │
│       ╚═════════════════════════════════════════╝                           │
│                                                                             │
│       * Estimation based on ~4 characters per token                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           📁 FILE BREAKDOWN                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│     .svelte  $(generate_bar $SVELTE_FILES $TOTAL_FILES)  ${SVELTE_FILES} files    │
│     .md      $(generate_bar $MD_FILES $TOTAL_FILES)  ${MD_FILES} files    │
│     .ts      $(generate_bar $TS_FILES $TOTAL_FILES)  ${TS_FILES} files    │
│     .js      $(generate_bar $JS_FILES $TOTAL_FILES)  ${JS_FILES} files    │
│     .json    $(generate_bar $JSON_FILES $TOTAL_FILES)  ${JSON_FILES} files    │
│     .css     $(generate_bar $CSS_FILES $TOTAL_FILES)  ${CSS_FILES} files    │
│                                                              ───────────   │
│                                               TOTAL:          ${TOTAL_FILES} files    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          🏗️  PROJECT STRUCTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│             GroveEngine/                                                    │
│             │                                                               │
│             ├── packages/                                                   │
│             │   ├── 🌲 engine ────────── Core CMS engine                    │
│             │   ├── 🌿 example-site ──── Demo/test site                     │
│             │   └── 🛤️  grove-router ──── Routing library                   │
│             │                                                               │
│             ├── landing/ ─────────────── Marketing site                     │
│             ├── docs/ ────────────────── Specifications                     │
│             ├── AgentUsage/ ──────────── Dev workflows                      │
│             └── archives/ ────────────── Historical docs                    │
│                                                                             │
│             📂 ${TOTAL_DIRS} directories total                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            🔄 GIT HISTORY                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        ○─○─○─○─○─○─○─○─○─○──▶                               │
│                                                                             │
│                          ${GIT_COMMITS} COMMITS                                        │
│                                                                             │
│                      Building something beautiful,                          │
│                         one commit at a time 🌱                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                            ✨ SUMMARY ✨                                      ║
║                                                                               ║
║      CODE         DOCS          TOKENS        FILES       COMMITS            ║
║    ─────────   ──────────    ──────────    ─────────    ─────────            ║
║     ${TOTAL_CODE_FMT}      ${MD_WORDS_FMT}       ~${ESTIMATED_TOKENS_FMT}       ${TOTAL_FILES}          ${GIT_COMMITS}                ║
║     lines        words        estimated     total        total               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

                ╭─────────────────────────────────────────╮
                │                                         │
                │   "A midnight tea shop and the clarity  │
                │    of good documentation..."            │
                │                                         │
                │             🌲 GroveEngine 🌲           │
                │                                         │
                ╰─────────────────────────────────────────╯
\`\`\`

---

## Raw Data

| Metric | Value |
|--------|-------|
| Total Code Lines | ${TOTAL_CODE_LINES} |
| Svelte Lines | ${SVELTE_LINES} |
| TypeScript Lines | ${TS_LINES} |
| JavaScript Lines | ${JS_LINES} |
| CSS Lines | ${CSS_LINES} |
| Documentation Words | ${MD_WORDS} |
| Documentation Lines | ${MD_LINES} |
| Total Files | ${TOTAL_FILES} |
| Total Directories | ${TOTAL_DIRS} |
| Estimated Tokens | ${ESTIMATED_TOKENS} |
| Git Commits | ${GIT_COMMITS} |

SNAPSHOT

# ============================================================================
# UPDATE HISTORY CSV
# ============================================================================

# Create CSV header if file doesn't exist
if [ ! -f "$CSV_FILE" ]; then
    echo "timestamp,label,git_hash,total_code_lines,svelte_lines,ts_lines,js_lines,css_lines,doc_words,doc_lines,total_files,directories,estimated_tokens,commits" > "$CSV_FILE"
fi

# Append data row
echo "${TIMESTAMP},${LABEL},${GIT_HASH},${TOTAL_CODE_LINES},${SVELTE_LINES},${TS_LINES},${JS_LINES},${CSS_LINES},${MD_WORDS},${MD_LINES},${TOTAL_FILES},${TOTAL_DIRS},${ESTIMATED_TOKENS},${GIT_COMMITS}" >> "$CSV_FILE"

# ============================================================================
# OUTPUT SUMMARY
# ============================================================================

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Snapshot created successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  📄 Snapshot: ${CYAN}${FILENAME}${NC}"
echo -e "  📊 History:  ${CYAN}${CSV_FILE}${NC}"
echo ""
echo -e "  ${YELLOW}Quick Stats:${NC}"
echo -e "    • ${TOTAL_CODE_FMT} lines of code"
echo -e "    • ${MD_WORDS_FMT} words of documentation"
echo -e "    • ~${ESTIMATED_TOKENS_FMT} estimated tokens"
echo -e "    • ${TOTAL_FILES} files across ${TOTAL_DIRS} directories"
echo -e "    • ${GIT_COMMITS} commits"
echo ""
echo -e "  ${CYAN}Tip:${NC} Run with a label to mark milestones:"
echo -e "       ./scripts/repo-snapshot.sh \"v1.0-release\""
echo ""
