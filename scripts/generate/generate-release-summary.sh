#!/bin/bash
#
# 🌲 Lattice Release Summary Generator
#
# Generates meaningful release summaries using LLM analysis of git commits.
# Integrates with the auto-tag workflow to create summaries for each version.
#
# Usage: ./scripts/generate-release-summary.sh <version-tag> [previous-tag]
# Example: ./scripts/generate-release-summary.sh v0.9.0 v0.8.6
#
# Requirements:
# - OPENROUTER_API_KEY environment variable
# - curl, jq installed
#

set -e

# Colors for terminal output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory and project root
# Script is at scripts/generate/generate-release-summary.sh, so go up two directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
SUMMARIES_DIR="$PROJECT_ROOT/snapshots/summaries"

# Create summaries directory if it doesn't exist
mkdir -p "$SUMMARIES_DIR"

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}Error: Version tag required${NC}"
    echo "Usage: $0 <version-tag> [previous-tag]"
    exit 1
fi

VERSION_TAG="$1"
PREVIOUS_TAG="${2:-}"

echo -e "${CYAN}🌲 Generating Release Summary for $VERSION_TAG${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$PROJECT_ROOT"

# ============================================================================
# FIND PREVIOUS TAG
# ============================================================================

if [ -z "$PREVIOUS_TAG" ]; then
    echo -e "Finding previous version tag..."

    # Get all tags sorted by version
    PREV_TAG=$(git tag -l 'v*' --sort=-v:refname | grep -v "^$VERSION_TAG$" | head -1)

    if [ -z "$PREV_TAG" ]; then
        echo -e "${YELLOW}No previous tag found. Using initial commit.${NC}"
        PREV_TAG=$(git rev-list --max-parents=0 HEAD)
    else
        PREVIOUS_TAG="$PREV_TAG"
        echo -e "Previous tag: ${GREEN}$PREVIOUS_TAG${NC}"
    fi
else
    echo -e "Using provided previous tag: ${GREEN}$PREVIOUS_TAG${NC}"
fi

# ============================================================================
# GATHER COMMIT DATA
# ============================================================================

echo ""
echo -e "Gathering commits between $PREVIOUS_TAG and $VERSION_TAG..."

# Get commit range
if git rev-parse "$VERSION_TAG" >/dev/null 2>&1; then
    COMMIT_RANGE="$PREVIOUS_TAG..$VERSION_TAG"
else
    # If version tag doesn't exist yet, use HEAD
    COMMIT_RANGE="$PREVIOUS_TAG..HEAD"
fi

# Extract commits with format: <type>(<scope>): <subject>
COMMITS=$(git log "$COMMIT_RANGE" --format="%s" --no-merges 2>/dev/null || echo "")

if [ -z "$COMMITS" ]; then
    echo -e "${YELLOW}No commits found in range${NC}"
    exit 0
fi

COMMIT_COUNT=$(echo "$COMMITS" | wc -l | tr -d ' ')
echo -e "Found ${GREEN}$COMMIT_COUNT${NC} commits"

# ============================================================================
# ANALYZE COMMIT TYPES
# ============================================================================

echo -e "Analyzing commit types..."

# Count by type (using grep | wc -l to avoid grep's exit code 1 on no matches)
FEAT_COUNT=$(echo "$COMMITS" | grep "^feat" | wc -l | tr -d ' ')
FIX_COUNT=$(echo "$COMMITS" | grep "^fix" | wc -l | tr -d ' ')
REFACTOR_COUNT=$(echo "$COMMITS" | grep "^refactor" | wc -l | tr -d ' ')
DOCS_COUNT=$(echo "$COMMITS" | grep "^docs" | wc -l | tr -d ' ')
CHORE_COUNT=$(echo "$COMMITS" | grep "^chore" | wc -l | tr -d ' ')
TEST_COUNT=$(echo "$COMMITS" | grep "^test" | wc -l | tr -d ' ')
PERF_COUNT=$(echo "$COMMITS" | grep "^perf" | wc -l | tr -d ' ')

echo -e "  Features:    ${GREEN}$FEAT_COUNT${NC}"
echo -e "  Fixes:       ${GREEN}$FIX_COUNT${NC}"
echo -e "  Refactoring: ${GREEN}$REFACTOR_COUNT${NC}"
echo -e "  Docs:        ${GREEN}$DOCS_COUNT${NC}"
echo -e "  Tests:       ${GREEN}$TEST_COUNT${NC}"
echo -e "  Performance: ${GREEN}$PERF_COUNT${NC}"

# ============================================================================
# GENERATE SUMMARY WITH LLM
# ============================================================================

echo ""
echo -e "Generating summary with LLM..."

# Check for API key
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo -e "${RED}Error: OPENROUTER_API_KEY environment variable not set${NC}"
    echo -e "${YELLOW}Skipping LLM summary generation${NC}"

    # Create basic summary without LLM
    SUMMARY="Version $VERSION_TAG includes $FEAT_COUNT new features, $FIX_COUNT bug fixes, and $REFACTOR_COUNT refactoring changes."
else
    # Prepare commit list for LLM (limit to 100 most recent to avoid token limits)
    COMMIT_LIST=$(echo "$COMMITS" | head -100)

    # Create prompt for LLM
    read -r -d '' PROMPT <<EOF || true
You are writing a release summary for Grove — a blogging platform built by a queer indie developer for friends, writers, and people who want their own corner of the internet.

These are the git commits for version $VERSION_TAG:

$COMMIT_LIST

Write a 2-4 sentence summary for the public roadmap page. This is the developer talking directly to the people who use Grove.

VOICE RULES:
- Sound like a person, not a product. You're telling a friend what you built this week over tea.
- Be specific about what actually changed. Name the features. Don't generalize into "powerful new tools" or "significant improvements."
- Understated confidence. You built something good — you don't need to sell it.
- Skip the exclamation marks. Skip "exciting." Skip "we're thrilled." Skip "it's all about making X better." None of that.
- Technical specifics are fine when they matter (people who use Grove understand what a Durable Object is).
- If a release is mostly infrastructure or bug fixes, just say that honestly. Not every release needs to sound momentous.

ANTI-EXAMPLES (never write like this):
- "This release brings powerful new tools for creators and developers!"
- "We've made significant strides in security and stability."
- "It's all about giving you more control and a smoother experience."
- "Overall, this update focuses on building a more robust platform."

GOOD EXAMPLES:
- "Loom finally has proper rate limiting, and the auto-save actually syncs to the server now instead of just pretending to. Also rewired how Meadow handles feeds — it pulls from the community timeline instead of polling each site individually."
- "Mostly an infrastructure release. Migrated four workers to the new Infra SDK, which means they all get proper error handling and observability for free. Fixed a layout bug on mobile that's been bothering me for weeks."
- "Added Shelves — a way to collect and organize links on your site. Think bookmarks, but prettier and public. Also rebuilt Glimpse from scratch so content suggestions actually make sense now."

Respond with ONLY the summary text. No labels, no markdown formatting.
EOF

    # Call OpenRouter API
    # Using deepseek-v3.2 for cost-effectiveness (~$0.55/million tokens)
    RESPONSE=$(curl -s https://openrouter.ai/api/v1/chat/completions \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $OPENROUTER_API_KEY" \
        -H "HTTP-Referer: https://grove.place" \
        -H "X-Title: Grove Release Summary Generator" \
        -d "{
            \"model\": \"deepseek/deepseek-v3.2\",
            \"messages\": [
                {
                    \"role\": \"user\",
                    \"content\": $(echo "$PROMPT" | jq -Rs .)
                }
            ],
            \"temperature\": 0.5,
            \"max_tokens\": 300
        }")

    # Extract summary from response
    SUMMARY=$(echo "$RESPONSE" | jq -r '.choices[0].message.content' 2>/dev/null || echo "")

    if [ -z "$SUMMARY" ] || [ "$SUMMARY" = "null" ]; then
        echo -e "${RED}Error: Failed to generate summary${NC}"

        # Extract only error message (avoid logging sensitive data)
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message // "Unknown error"' 2>/dev/null || echo "API call failed")
        echo -e "${YELLOW}Error: $ERROR_MSG${NC}"

        # Fallback to basic summary
        SUMMARY="Version $VERSION_TAG includes $FEAT_COUNT new features, $FIX_COUNT bug fixes, and $REFACTOR_COUNT refactoring changes."
    else
        echo -e "${GREEN}✓ Summary generated${NC}"
    fi
fi

# ============================================================================
# EXTRACT KEY CHANGES
# ============================================================================

echo -e "Extracting key changes..."

# Extract commits by type, REVERSED (oldest first = foundational work first).
# Preserves scope from conventional commits: "feat(engine): add X" → "add X"
# but also extracts scope separately for structured data.

# Helper: extract commit messages for a type, oldest-first, with limit
extract_type() {
    local type="$1"
    local limit="${2:-15}"
    echo "$COMMITS" | grep "^${type}" | tac | head -"$limit" | sed 's/^[^:]*: //' || echo ""
}

# Helper: extract unique scopes for a type
extract_scopes() {
    local type="$1"
    echo "$COMMITS" | grep "^${type}(" | sed 's/^[^(]*(\([^)]*\)).*/\1/' | sort -u || echo ""
}

FEATURES=$(extract_type "feat" 15)
FIXES=$(extract_type "fix" 15)
REFACTORS=$(extract_type "refactor" 10)
DOCS=$(extract_type "docs" 10)
PERF=$(extract_type "perf" 10)
TESTS=$(extract_type "test" 10)
CHORES=$(extract_type "chore" 10)

# Extract scopes to show where work happened
ALL_SCOPES=$(echo "$COMMITS" | grep '(' | sed 's/^[^(]*(\([^)]*\)).*/\1/' | sort | uniq -c | sort -rn | head -10 | awk '{print $2}' || echo "")

# ============================================================================
# GET METADATA
# ============================================================================

# Get commit date
if git rev-parse "$VERSION_TAG" >/dev/null 2>&1; then
    COMMIT_DATE=$(git log -1 --format=%cd --date=iso "$VERSION_TAG")
else
    COMMIT_DATE=$(git log -1 --format=%cd --date=iso HEAD)
fi

# Get commit hash
if git rev-parse "$VERSION_TAG" >/dev/null 2>&1; then
    COMMIT_HASH=$(git rev-parse --short "$VERSION_TAG")
else
    COMMIT_HASH=$(git rev-parse --short HEAD)
fi

# ============================================================================
# CREATE JSON OUTPUT
# ============================================================================

echo -e "Creating JSON summary..."

OUTPUT_FILE="$SUMMARIES_DIR/${VERSION_TAG}.json"

# Build JSON arrays for each type
to_json_array() {
    local input="$1"
    if [ -n "$input" ]; then
        echo "$input" | jq -R . | jq -s .
    else
        echo "[]"
    fi
}

FEATURES_JSON=$(to_json_array "$FEATURES")
FIXES_JSON=$(to_json_array "$FIXES")
REFACTORS_JSON=$(to_json_array "$REFACTORS")
DOCS_JSON=$(to_json_array "$DOCS")
PERF_JSON=$(to_json_array "$PERF")
TESTS_JSON=$(to_json_array "$TESTS")
CHORES_JSON=$(to_json_array "$CHORES")
SCOPES_JSON=$(to_json_array "$ALL_SCOPES")

# Create JSON structure
cat > "$OUTPUT_FILE" <<EOF
{
  "version": "${VERSION_TAG}",
  "date": "${COMMIT_DATE}",
  "commitHash": "${COMMIT_HASH}",
  "summary": $(echo "$SUMMARY" | jq -Rs .),
  "stats": {
    "totalCommits": ${COMMIT_COUNT},
    "features": ${FEAT_COUNT},
    "fixes": ${FIX_COUNT},
    "refactoring": ${REFACTOR_COUNT},
    "docs": ${DOCS_COUNT},
    "tests": ${TEST_COUNT},
    "performance": ${PERF_COUNT}
  },
  "scopes": ${SCOPES_JSON},
  "highlights": {
    "features": ${FEATURES_JSON},
    "fixes": ${FIXES_JSON},
    "refactoring": ${REFACTORS_JSON},
    "docs": ${DOCS_JSON},
    "performance": ${PERF_JSON},
    "tests": ${TESTS_JSON},
    "chores": ${CHORES_JSON}
  }
}
EOF

echo -e "${GREEN}✓ Summary saved to: $OUTPUT_FILE${NC}"
echo ""

# ============================================================================
# DISPLAY SUMMARY
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Release Summary for $VERSION_TAG${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "$SUMMARY"
echo ""
echo -e "${CYAN}Stats:${NC} $COMMIT_COUNT commits ($FEAT_COUNT feat, $FIX_COUNT fix, $REFACTOR_COUNT refactor, $DOCS_COUNT docs, $PERF_COUNT perf, $TEST_COUNT test)"
if [ -n "$ALL_SCOPES" ]; then
    echo -e "${CYAN}Scopes:${NC} $(echo "$ALL_SCOPES" | paste -sd ', ' -)"
fi
echo ""

exit 0
