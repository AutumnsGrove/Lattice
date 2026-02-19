#!/bin/bash
# verify-engine-exports.sh — Barrel Export Chain Verifier
#
# Catches the #1 Grove engine footgun: adding a .svelte component file
# without exporting it from the barrel index.ts, leaving consumers with
# a broken import at runtime.
#
# Checks:
#   1. Every .svelte file has a matching export in its parent's index.ts
#   2. Every component directory with an index.ts is reachable from
#      either the root ui/index.ts or a package.json sub-path export
#
# Usage:
#   ./tools/verify-engine-exports.sh          # Check everything
#   ./tools/verify-engine-exports.sh --quiet  # Only show errors (for hooks)

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
DIM='\033[0;90m'
NC='\033[0m'

QUIET=false
if [[ "${1:-}" == "--quiet" ]]; then
    QUIET=true
fi

# Paths (relative to repo root)
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
ENGINE_UI="$REPO_ROOT/libs/engine/src/lib/ui"
COMPONENTS_DIR="$ENGINE_UI/components"
ROOT_INDEX="$ENGINE_UI/index.ts"
PACKAGE_JSON="$REPO_ROOT/libs/engine/package.json"

if [ ! -d "$COMPONENTS_DIR" ]; then
    echo -e "${RED}✗ Engine components directory not found: $COMPONENTS_DIR${NC}"
    exit 1
fi

errors=0
warnings=0
checked=0

# ============================================================================
# CHECK 1: Every .svelte file is exported from its barrel index.ts
# ============================================================================
if [ "$QUIET" = false ]; then
    echo -e "${YELLOW}🔗 Checking engine barrel exports...${NC}"
    echo ""
fi

# Find all .svelte files in component directories
while IFS= read -r svelte_file; do
    dir="$(dirname "$svelte_file")"
    filename="$(basename "$svelte_file" .svelte)"

    # Find the nearest barrel index.ts (walk up at most 1 level)
    barrel=""
    if [ -f "$dir/index.ts" ]; then
        barrel="$dir/index.ts"
    elif [ -f "$(dirname "$dir")/index.ts" ]; then
        # For nested dirs (e.g., nature/trees/TreePine.svelte → nature/index.ts)
        barrel="$(dirname "$dir")/index.ts"
    fi

    if [ -z "$barrel" ]; then
        # No barrel file — skip (e.g., primitives/)
        continue
    fi

    checked=$((checked + 1))

    # Check if the component name appears in the barrel file
    # Matches patterns like:
    #   export { default as ComponentName } from "./ComponentName.svelte"
    #   export { default as ComponentName } from "./subdir/ComponentName.svelte"
    #   export { default as ComponentName } from "./ComponentName"
    #   export * from "./subdir"  (re-exports that might include it)
    if grep -q "$filename" "$barrel" 2>/dev/null; then
        # Found — component is referenced in the barrel
        :
    else
        # Check if a wildcard re-export covers it (e.g., export * from "./trees")
        subdir_name="$(basename "$dir")"
        parent_barrel="$(dirname "$dir")/index.ts"
        if [ "$barrel" != "$parent_barrel" ] && [ -f "$parent_barrel" ] && grep -q "from.*[\"']\./$subdir_name[\"']" "$parent_barrel" 2>/dev/null; then
            # Covered by a wildcard re-export from parent — check the local barrel
            if [ -f "$dir/index.ts" ] && grep -q "$filename" "$dir/index.ts" 2>/dev/null; then
                :
            else
                rel_path="${svelte_file#$REPO_ROOT/}"
                rel_barrel="${dir}/index.ts"
                rel_barrel="${rel_barrel#$REPO_ROOT/}"
                echo -e "${RED}  ✗ ${NC}${filename}${RED} not exported${NC}"
                echo -e "    ${DIM}File:   ${rel_path}${NC}"
                echo -e "    ${DIM}Barrel: ${rel_barrel}${NC}"
                echo -e "    ${BLUE}Add: export { default as ${filename} } from \"./${filename}.svelte\";${NC}"
                echo ""
                errors=$((errors + 1))
            fi
        else
            rel_path="${svelte_file#$REPO_ROOT/}"
            rel_barrel="${barrel#$REPO_ROOT/}"
            echo -e "${RED}  ✗ ${NC}${filename}${RED} not exported${NC}"
            echo -e "    ${DIM}File:   ${rel_path}${NC}"
            echo -e "    ${DIM}Barrel: ${rel_barrel}${NC}"
            echo -e "    ${BLUE}Add: export { default as ${filename} } from \"./${filename}.svelte\";${NC}"
            echo ""
            errors=$((errors + 1))
        fi
    fi
done < <(find "$COMPONENTS_DIR" -name "*.svelte" -not -path "*/primitives/*" | sort)

# ============================================================================
# CHECK 2: Every barrel directory is reachable via package.json exports
# ============================================================================
if [ "$QUIET" = false ]; then
    echo -e "${YELLOW}📦 Checking package.json export paths...${NC}"
    echo ""
fi

# Read package.json exports keys
pkg_exports=$(node -e "
  const pkg = require('$PACKAGE_JSON');
  Object.keys(pkg.exports || {}).forEach(k => console.log(k));
" 2>/dev/null || echo "")

# Also read root ui/index.ts re-exports
root_reexports=$(grep 'export \*' "$ROOT_INDEX" 2>/dev/null | sed 's/.*from.*["'"'"']\.\///' | sed 's/\.js["'"'"'].*//' | sed 's/["'"'"'].*//' || echo "")

while IFS= read -r barrel_dir; do
    [ -z "$barrel_dir" ] && continue
    [ ! -f "$barrel_dir/index.ts" ] && continue

    # Get the category name relative to components/
    category="${barrel_dir#$COMPONENTS_DIR/}"

    # Skip nested subdirs (only check top-level categories)
    if [[ "$category" == */* ]]; then
        continue
    fi

    # Check if reachable via package.json sub-path (./ui/category)
    pkg_path="./ui/$category"
    if echo "$pkg_exports" | grep -q "^${pkg_path}$"; then
        :
    elif echo "$root_reexports" | grep -q "components/$category/index"; then
        # Reachable via root ui/index.ts wildcard
        :
    else
        rel_dir="${barrel_dir#$REPO_ROOT/}"
        echo -e "${YELLOW}  ⚠ ${NC}${category}${YELLOW} has no package.json export path${NC}"
        echo -e "    ${DIM}Directory: ${rel_dir}${NC}"
        echo -e "    ${DIM}Not in ./ui/${category} export or root ui/index.ts${NC}"
        echo ""
        warnings=$((warnings + 1))
    fi
done < <(find "$COMPONENTS_DIR" -maxdepth 1 -type d | sort)

# ============================================================================
# RESULTS
# ============================================================================
if [ "$QUIET" = false ]; then
    echo -e "${DIM}Checked $checked components across $(find "$COMPONENTS_DIR" -maxdepth 1 -type d | wc -l | tr -d ' ') categories${NC}"
    echo ""
fi

if [ $errors -gt 0 ]; then
    echo -e "${RED}✗ Found $errors unexported component(s)${NC}"
    if [ $warnings -gt 0 ]; then
        echo -e "${YELLOW}  Plus $warnings unreachable barrel warning(s)${NC}"
    fi
    exit 1
elif [ $warnings -gt 0 ]; then
    echo -e "${GREEN}✓ All components exported from barrels${NC}"
    echo -e "${YELLOW}  $warnings unreachable barrel warning(s) (may be intentional)${NC}"
    exit 0
else
    echo -e "${GREEN}✓ All $checked components exported and reachable${NC}"
    exit 0
fi
