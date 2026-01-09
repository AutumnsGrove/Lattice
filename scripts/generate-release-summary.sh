#!/bin/bash
#
# 🌲 GroveEngine Release Summary Generator
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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
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

# Count by type
FEAT_COUNT=$(echo "$COMMITS" | grep -c "^feat" || echo 0)
FIX_COUNT=$(echo "$COMMITS" | grep -c "^fix" || echo 0)
REFACTOR_COUNT=$(echo "$COMMITS" | grep -c "^refactor" || echo 0)
DOCS_COUNT=$(echo "$COMMITS" | grep -c "^docs" || echo 0)
CHORE_COUNT=$(echo "$COMMITS" | grep -c "^chore" || echo 0)
TEST_COUNT=$(echo "$COMMITS" | grep -c "^test" || echo 0)
PERF_COUNT=$(echo "$COMMITS" | grep -c "^perf" || echo 0)

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
You are analyzing git commits for a release of Grove, a multi-tenant blog platform built with SvelteKit and Cloudflare Workers.

Here are the commits for version $VERSION_TAG:

$COMMIT_LIST

Please create a concise 2-4 sentence summary of this release for display on a public roadmap page. Focus on:
1. Major new features or capabilities
2. Significant improvements or changes
3. Important bug fixes
4. Overall theme or direction of this release

The summary should be in a warm, friendly tone that matches Grove's voice. Avoid technical jargon where possible. Make it engaging for users to read.

Respond with ONLY the summary text, no additional formatting or labels.
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
            \"temperature\": 0.7,
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

# Get list of features (limit to 10 most significant)
FEATURES=$(echo "$COMMITS" | grep "^feat" | head -10 | sed 's/^feat[^:]*: //' || echo "")

# Get list of fixes (limit to 10)
FIXES=$(echo "$COMMITS" | grep "^fix" | head -10 | sed 's/^fix[^:]*: //' || echo "")

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

# Build features array (if any)
FEATURES_JSON="[]"
if [ -n "$FEATURES" ]; then
    FEATURES_JSON=$(echo "$FEATURES" | jq -R . | jq -s .)
fi

# Build fixes array (if any)
FIXES_JSON="[]"
if [ -n "$FIXES" ]; then
    FIXES_JSON=$(echo "$FIXES" | jq -R . | jq -s .)
fi

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
  "highlights": {
    "features": ${FEATURES_JSON},
    "fixes": ${FIXES_JSON}
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
echo -e "${CYAN}Stats:${NC} $COMMIT_COUNT commits ($FEAT_COUNT features, $FIX_COUNT fixes)"
echo ""

exit 0
