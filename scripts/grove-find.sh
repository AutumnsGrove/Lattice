#!/bin/bash
#
# grove-find.sh - Blazing fast code search for Grove development
#
# Usage:
#   source scripts/grove-find.sh   # Load functions into shell
#   gf "pattern"                   # Quick search
#   gfc "ClassName"                # Find class/component definition
#   gff "function"                 # Find function definition
#   gfi "import"                   # Find imports of a module
#   gfs                            # Find all Svelte components
#   gft                            # Find all TypeScript files
#   gfr "route"                    # Find route handlers
#   gfd                            # Find database queries
#   gfg                            # Find Glass component usage
#
# Pro tip: Add to your ~/.bashrc or ~/.zshrc:
#   source /path/to/GroveEngine/scripts/grove-find.sh
#

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =============================================================================
# Dependency Checks
# =============================================================================

_grove_check_deps() {
    local missing=0

    if ! command -v rg &> /dev/null; then
        echo -e "${RED}Error: ripgrep (rg) is not installed.${NC}"
        echo -e "  ${CYAN}macOS:${NC}     brew install ripgrep"
        echo -e "  ${CYAN}Ubuntu:${NC}    sudo apt install ripgrep"
        echo -e "  ${CYAN}Arch:${NC}      sudo pacman -S ripgrep"
        echo -e "  ${CYAN}Windows:${NC}   scoop install ripgrep  ${YELLOW}(or winget/choco)${NC}"
        missing=1
    fi

    if ! command -v fd &> /dev/null; then
        echo -e "${RED}Error: fd is not installed.${NC}"
        echo -e "  ${CYAN}macOS:${NC}     brew install fd"
        echo -e "  ${CYAN}Ubuntu:${NC}    sudo apt install fd-find  ${YELLOW}(may need: ln -s \$(which fdfind) ~/.local/bin/fd)${NC}"
        echo -e "  ${CYAN}Arch:${NC}      sudo pacman -S fd"
        echo -e "  ${CYAN}Windows:${NC}   scoop install fd  ${YELLOW}(or winget/choco)${NC}"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        echo -e "\n${YELLOW}Some grove-find functions will not work without these tools.${NC}"
        return 1
    fi
    return 0
}

# Run dependency check on load
_grove_check_deps || true

# Get the Grove root directory (where this script lives)
GROVE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# =============================================================================
# Core Search Functions
# =============================================================================

# gf - General fuzzy search (the main workhorse)
# Usage: gf "pattern" [path]
gf() {
    local pattern="$1"
    local path="${2:-$GROVE_ROOT}"

    if [ -z "$pattern" ]; then
        echo -e "${YELLOW}Usage: gf \"pattern\" [path]${NC}"
        return 1
    fi

    rg --color=always \
       --line-number \
       --no-heading \
       --smart-case \
       "$pattern" "$path" \
       --glob '!node_modules' \
       --glob '!.git' \
       --glob '!dist' \
       --glob '!build' \
       --glob '!*.lock' \
       --glob '!pnpm-lock.yaml'
}

# gfc - Find class/component definitions
# Usage: gfc "ComponentName"
gfc() {
    local name="$1"
    if [ -z "$name" ]; then
        echo -e "${YELLOW}Usage: gfc \"ComponentName\"${NC}"
        return 1
    fi

    echo -e "${CYAN}🔍 Searching for class/component: ${name}${NC}"

    # Search for Svelte component files
    echo -e "\n${GREEN}Svelte Components:${NC}"
    fd -e svelte "$name" "$GROVE_ROOT" --exclude node_modules 2>/dev/null

    # Search for class definitions
    echo -e "\n${GREEN}Class Definitions:${NC}"
    rg --color=always -n "class\s+$name" "$GROVE_ROOT" \
       --glob '!node_modules' --glob '!dist' --type ts --type js

    # Search for interface/type definitions
    echo -e "\n${GREEN}Type/Interface Definitions:${NC}"
    rg --color=always -n "(interface|type)\s+$name" "$GROVE_ROOT" \
       --glob '!node_modules' --glob '!dist' --type ts
}

# gff - Find function definitions
# Usage: gff "functionName"
gff() {
    local name="$1"
    if [ -z "$name" ]; then
        echo -e "${YELLOW}Usage: gff \"functionName\"${NC}"
        return 1
    fi

    echo -e "${CYAN}🔍 Searching for function: ${name}${NC}"

    rg --color=always -n \
       "(function\s+$name|const\s+$name\s*=|let\s+$name\s*=|export\s+(async\s+)?function\s+$name|$name\s*[:=]\s*(async\s+)?\()" \
       "$GROVE_ROOT" \
       --glob '!node_modules' \
       --glob '!dist' \
       --type ts --type js --type svelte
}

# gfi - Find imports of a module
# Usage: gfi "moduleName"
gfi() {
    local name="$1"
    if [ -z "$name" ]; then
        echo -e "${YELLOW}Usage: gfi \"moduleName\"${NC}"
        return 1
    fi

    echo -e "${CYAN}🔍 Searching for imports of: ${name}${NC}"

    rg --color=always -n "import.*['\"].*$name" "$GROVE_ROOT" \
       --glob '!node_modules' \
       --glob '!dist' \
       --type ts --type js --type svelte
}

# =============================================================================
# File Type Searches
# =============================================================================

# gfs - Find all Svelte components
# Usage: gfs [pattern]
gfs() {
    local pattern="${1:-}"
    echo -e "${CYAN}🔍 Svelte components${pattern:+ matching: $pattern}${NC}"

    if [ -n "$pattern" ]; then
        fd -e svelte "$pattern" "$GROVE_ROOT" --exclude node_modules
    else
        fd -e svelte . "$GROVE_ROOT" --exclude node_modules | head -50
        echo -e "\n${YELLOW}(Showing first 50 results. Add a pattern to filter.)${NC}"
    fi
}

# gft - Find TypeScript files
# Usage: gft [pattern]
gft() {
    local pattern="${1:-}"
    echo -e "${CYAN}🔍 TypeScript files${pattern:+ matching: $pattern}${NC}"

    if [ -n "$pattern" ]; then
        fd -e ts "$pattern" "$GROVE_ROOT" --exclude node_modules --exclude '*.d.ts'
    else
        fd -e ts . "$GROVE_ROOT" --exclude node_modules --exclude '*.d.ts' | head -50
        echo -e "\n${YELLOW}(Showing first 50 results. Add a pattern to filter.)${NC}"
    fi
}

# =============================================================================
# Domain-Specific Searches
# =============================================================================

# gfr - Find route handlers
# Usage: gfr [route-pattern]
gfr() {
    local pattern="${1:-}"
    echo -e "${CYAN}🔍 SvelteKit routes${pattern:+ matching: $pattern}${NC}"

    if [ -n "$pattern" ]; then
        fd "+page" "$GROVE_ROOT" --exclude node_modules | rg -i "$pattern"
        fd "+server" "$GROVE_ROOT" --exclude node_modules | rg -i "$pattern"
    else
        echo -e "\n${GREEN}Page Routes:${NC}"
        fd "+page.svelte" "$GROVE_ROOT" --exclude node_modules | head -30
        echo -e "\n${GREEN}API Routes:${NC}"
        fd "+server.ts" "$GROVE_ROOT" --exclude node_modules | head -30
    fi
}

# gfd - Find database queries
# Usage: gfd [table-name]
gfd() {
    local table="${1:-}"
    echo -e "${CYAN}🔍 Database queries${table:+ for table: $table}${NC}"

    if [ -n "$table" ]; then
        rg --color=always -n "(SELECT|INSERT|UPDATE|DELETE).*$table" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' \
           --type ts --type js
    else
        rg --color=always -n "db\.(prepare|exec|batch)" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' \
           --type ts --type js | head -50
    fi
}

# gfg - Find Glass component usage
# Usage: gfg [variant]
gfg() {
    local variant="${1:-}"
    echo -e "${CYAN}🔍 Glass component usage${variant:+ with variant: $variant}${NC}"

    if [ -n "$variant" ]; then
        rg --color=always -n "Glass.*variant.*['\"]$variant" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' \
           --type svelte --type ts
    else
        rg --color=always -n "<Glass" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' \
           --type svelte | head -50
    fi
}

# gfspec - Find specs
# Usage: gfspec [name]
gfspec() {
    local name="${1:-}"
    echo -e "${CYAN}🔍 Spec files${name:+ matching: $name}${NC}"

    if [ -n "$name" ]; then
        fd "spec" "$GROVE_ROOT/docs" | rg -i "$name"
    else
        fd "spec.md" "$GROVE_ROOT/docs" | head -30
    fi
}

# gftest - Find test files
# Usage: gftest [name]
gftest() {
    local name="${1:-}"
    echo -e "${CYAN}🔍 Test files${name:+ matching: $name}${NC}"

    if [ -n "$name" ]; then
        fd "test|spec" "$GROVE_ROOT" -e ts -e js --exclude node_modules | rg -i "$name"
    else
        fd "test|spec" "$GROVE_ROOT" -e ts -e js --exclude node_modules | head -30
    fi
}

# =============================================================================
# Interactive/TUI Functions
# =============================================================================

# gfi - Interactive search using fzf (if available)
gfzf() {
    if ! command -v fzf &> /dev/null; then
        echo -e "${RED}fzf is not installed. Install with: brew install fzf${NC}"
        return 1
    fi

    local file
    file=$(fd . "$GROVE_ROOT" --exclude node_modules --exclude dist --exclude .git \
           | fzf --preview 'bat --color=always --style=numbers --line-range=:500 {}' \
                 --preview-window=right:60%)

    if [ -n "$file" ]; then
        echo "$file"
    fi
}

# =============================================================================
# Utility Functions
# =============================================================================

# gfhelp - Show help
gfhelp() {
    echo -e "${GREEN}Grove Find - Blazing Fast Code Search${NC}"
    echo ""
    echo -e "${CYAN}Core Commands:${NC}"
    echo "  gf \"pattern\"      - General search across codebase"
    echo "  gfc \"Name\"        - Find class/component definitions"
    echo "  gff \"func\"        - Find function definitions"
    echo "  gfi \"module\"      - Find imports of a module"
    echo ""
    echo -e "${CYAN}File Type Searches:${NC}"
    echo "  gfs [pattern]     - Find Svelte components"
    echo "  gft [pattern]     - Find TypeScript files"
    echo ""
    echo -e "${CYAN}Domain Searches:${NC}"
    echo "  gfr [route]       - Find SvelteKit routes"
    echo "  gfd [table]       - Find database queries"
    echo "  gfg [variant]     - Find Glass component usage"
    echo "  gfspec [name]     - Find spec documents"
    echo "  gftest [name]     - Find test files"
    echo ""
    echo -e "${CYAN}Interactive:${NC}"
    echo "  gfzf              - Interactive file finder (requires fzf)"
    echo ""
    echo -e "${CYAN}Pro Tips:${NC}"
    echo "  - All searches exclude node_modules, dist, and .git"
    echo "  - Use quotes for patterns with spaces"
    echo "  - Combine with | less for paging through results"
}

# Let user know functions are loaded
echo -e "${GREEN}✓ Grove Find loaded!${NC} Run ${CYAN}gfhelp${NC} for available commands."
