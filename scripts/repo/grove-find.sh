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
# Binary Discovery (find tools even if not in PATH)
# =============================================================================

# Search for a binary in common locations, returning the full path
# This is more robust than relying on PATH, which can be unreliable in sourced scripts
_grove_find_binary() {
    local name="$1"
    local search_paths=(
        "/opt/homebrew/bin"           # Apple Silicon Homebrew
        "/usr/local/bin"              # Intel Mac Homebrew / Linux
        "$HOME/.local/bin"            # User-local installs
        "$HOME/bin"                   # User bin
        "$HOME/.cargo/bin"            # Rust/cargo installs (common for rg)
        "/usr/bin"                    # System binaries
    )

    # First try command -v (works if already in PATH)
    local found
    found=$(command -v "$name" 2>/dev/null)
    if [ -n "$found" ] && [ -x "$found" ]; then
        echo "$found"
        return 0
    fi

    # Search known locations
    for p in "${search_paths[@]}"; do
        if [ -x "$p/$name" ]; then
            echo "$p/$name"
            return 0
        fi
    done

    return 1
}

# Discover and store binary paths (these are used by all functions)
GROVE_RG=""
GROVE_FD=""

_grove_discover_tools() {
    GROVE_RG=$(_grove_find_binary "rg")
    GROVE_FD=$(_grove_find_binary "fd")

    # On Ubuntu, fd might be called fdfind
    if [ -z "$GROVE_FD" ]; then
        GROVE_FD=$(_grove_find_binary "fdfind")
    fi
}

# Run discovery
_grove_discover_tools

# =============================================================================
# Dependency Checks
# =============================================================================

_grove_check_deps() {
    local missing=0

    if [ -z "$GROVE_RG" ]; then
        echo -e "${RED}Error: ripgrep (rg) is not installed.${NC}"
        echo -e "  ${CYAN}macOS:${NC}     brew install ripgrep"
        echo -e "  ${CYAN}Ubuntu:${NC}    sudo apt install ripgrep"
        echo -e "  ${CYAN}Arch:${NC}      sudo pacman -S ripgrep"
        echo -e "  ${CYAN}Windows:${NC}   scoop install ripgrep  ${YELLOW}(or winget/choco)${NC}"
        missing=1
    else
        echo -e "${GREEN}✓${NC} Found rg at: ${CYAN}$GROVE_RG${NC}"
    fi

    if [ -z "$GROVE_FD" ]; then
        echo -e "${RED}Error: fd is not installed.${NC}"
        echo -e "  ${CYAN}macOS:${NC}     brew install fd"
        echo -e "  ${CYAN}Ubuntu:${NC}    sudo apt install fd-find  ${YELLOW}(may need: ln -s \$(which fdfind) ~/.local/bin/fd)${NC}"
        echo -e "  ${CYAN}Arch:${NC}      sudo pacman -S fd"
        echo -e "  ${CYAN}Windows:${NC}   scoop install fd  ${YELLOW}(or winget/choco)${NC}"
        missing=1
    else
        echo -e "${GREEN}✓${NC} Found fd at: ${CYAN}$GROVE_FD${NC}"
    fi

    if [ $missing -eq 1 ]; then
        echo -e "\n${YELLOW}Some grove-find functions will not work without these tools.${NC}"
        return 1
    fi
    return 0
}

# Run dependency check on load
_grove_check_deps || true

# Get the Grove root directory (script is in scripts/repo/, so go up 2 levels)
# Works in both bash and zsh
if [ -n "${BASH_SOURCE[0]:-}" ]; then
    GROVE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
elif [ -n "${(%):-%x}" ]; then
    GROVE_ROOT="$(cd "$(dirname "${(%):-%x}")/../.." && pwd)"
else
    # Fallback: assume we're in the GroveEngine directory
    GROVE_ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)" || GROVE_ROOT="$HOME/Documents/Projects/GroveEngine"
fi

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

    "$GROVE_RG" --color=always \
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
    "$GROVE_FD" -e svelte "$name" "$GROVE_ROOT" --exclude node_modules 2>/dev/null

    # Search for class definitions
    echo -e "\n${GREEN}Class Definitions:${NC}"
    "$GROVE_RG" --color=always -n "class\s+$name" "$GROVE_ROOT" \
       --glob '!node_modules' --glob '!dist' --type ts --type js

    # Search for interface/type definitions
    echo -e "\n${GREEN}Type/Interface Definitions:${NC}"
    "$GROVE_RG" --color=always -n "(interface|type)\s+$name" "$GROVE_ROOT" \
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

    "$GROVE_RG" --color=always -n \
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

    "$GROVE_RG" --color=always -n "import.*['\"].*$name" "$GROVE_ROOT" \
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
        "$GROVE_FD" -e svelte "$pattern" "$GROVE_ROOT" --exclude node_modules
    else
        "$GROVE_FD" -e svelte . "$GROVE_ROOT" --exclude node_modules | head -50
        echo -e "\n${YELLOW}(Showing first 50 results. Add a pattern to filter.)${NC}"
    fi
}

# gft - Find TypeScript files
# Usage: gft [pattern]
gft() {
    local pattern="${1:-}"
    echo -e "${CYAN}🔍 TypeScript files${pattern:+ matching: $pattern}${NC}"

    if [ -n "$pattern" ]; then
        "$GROVE_FD" -e ts "$pattern" "$GROVE_ROOT" --exclude node_modules --exclude '*.d.ts'
    else
        "$GROVE_FD" -e ts . "$GROVE_ROOT" --exclude node_modules --exclude '*.d.ts' | head -50
        echo -e "\n${YELLOW}(Showing first 50 results. Add a pattern to filter.)${NC}"
    fi
}

# gfj - Find JavaScript files
# Usage: gfj [pattern]
gfj() {
    local pattern="${1:-}"
    echo -e "${CYAN}🔍 JavaScript files${pattern:+ matching: $pattern}${NC}"

    if [ -n "$pattern" ]; then
        "$GROVE_FD" -e js "$pattern" "$GROVE_ROOT" --exclude node_modules --exclude '*.min.js'
    else
        "$GROVE_FD" -e js . "$GROVE_ROOT" --exclude node_modules --exclude '*.min.js' | head -50
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
        "$GROVE_FD" "+page" "$GROVE_ROOT" --exclude node_modules | "$GROVE_RG" -i "$pattern"
        "$GROVE_FD" "+server" "$GROVE_ROOT" --exclude node_modules | "$GROVE_RG" -i "$pattern"
    else
        echo -e "\n${GREEN}Page Routes:${NC}"
        "$GROVE_FD" "+page.svelte" "$GROVE_ROOT" --exclude node_modules | head -30
        echo -e "\n${GREEN}API Routes:${NC}"
        "$GROVE_FD" "+server.ts" "$GROVE_ROOT" --exclude node_modules | head -30
    fi
}

# gfd - Find database queries
# Usage: gfd [table-name]
gfd() {
    local table="${1:-}"
    echo -e "${CYAN}🔍 Database queries${table:+ for table: $table}${NC}"

    if [ -n "$table" ]; then
        "$GROVE_RG" --color=always -n "(SELECT|INSERT|UPDATE|DELETE).*$table" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' \
           --type ts --type js
    else
        "$GROVE_RG" --color=always -n "db\.(prepare|exec|batch)" "$GROVE_ROOT" \
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
        "$GROVE_RG" --color=always -n "Glass.*variant.*['\"]$variant" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' \
           --type svelte --type ts
    else
        "$GROVE_RG" --color=always -n "<Glass" "$GROVE_ROOT" \
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
        "$GROVE_FD" "spec" "$GROVE_ROOT/docs" | "$GROVE_RG" -i "$name"
    else
        "$GROVE_FD" "spec.md" "$GROVE_ROOT/docs" | head -30
    fi
}

# gftest - Find test files
# Usage: gftest [name]
gftest() {
    local name="${1:-}"
    echo -e "${CYAN}🔍 Test files${name:+ matching: $name}${NC}"

    if [ -n "$name" ]; then
        "$GROVE_FD" "test|spec" "$GROVE_ROOT" -e ts -e js --exclude node_modules | "$GROVE_RG" -i "$name"
    else
        "$GROVE_FD" "test|spec" "$GROVE_ROOT" -e ts -e js --exclude node_modules | head -30
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
    file=$("$GROVE_FD" . "$GROVE_ROOT" --exclude node_modules --exclude dist --exclude .git \
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
    echo "  gfj [pattern]     - Find JavaScript files"
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
