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
#   gfj                            # Find all JavaScript files
#   gfcss                          # Find all CSS files
#   gfmd                           # Find all Markdown files
#   gfjson                         # Find all JSON files
#   gftoml                         # Find all TOML files
#   gfh                            # Find all HTML files
#   gfyaml                         # Find all YAML files
#   gfsh                           # Find all shell scripts
#   gfr "route"                    # Find route handlers
#   gfd                            # Find database queries
#   gfg                            # Find Glass component usage
#   gftest                         # Find test files
#   gftodo                         # Find TODO/FIXME/HACK comments
#   gfconfig                       # Find configuration files
#   gfstore                        # Find Svelte stores
#   gfgrove                        # Find "Grove" references
#   gfbind                         # Find Cloudflare bindings (D1, KV, R2)
#   gfdo                           # Find Durable Object definitions
#   gfd1                           # Find D1 database usage
#   gfr2                           # Find R2 storage usage
#   gfkv                           # Find KV namespace usage
#   gfused "Name"                  # Find where a component is used
#   gflog                          # Find console.log/warn/error
#   gfenv                          # Find environment variables
#   gfrecent [days]                # Find recently modified files
#   gfchanged                      # Find files changed on branch
#   gftag                          # Find changes between git tags
#   gftype                         # Find TypeScript types
#   gfexport                       # Find module exports
#   gfauth                         # Find authentication code
#   gfengine                       # Find engine imports
#   gfagent                        # Quick reference for AI agents
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

# gfcss - Find CSS files
# Usage: gfcss [pattern]
gfcss() {
    local pattern="${1:-}"
    echo -e "${CYAN}🔍 CSS files${pattern:+ matching: $pattern}${NC}"

    if [ -n "$pattern" ]; then
        "$GROVE_FD" -e css "$pattern" "$GROVE_ROOT" --exclude node_modules --exclude '*.min.css'
    else
        "$GROVE_FD" -e css . "$GROVE_ROOT" --exclude node_modules --exclude '*.min.css' | head -50
        echo -e "\n${YELLOW}(Showing first 50 results. Add a pattern to filter.)${NC}"
    fi
}

# gfmd - Find Markdown files
# Usage: gfmd [pattern]
gfmd() {
    local pattern="${1:-}"
    echo -e "${CYAN}🔍 Markdown files${pattern:+ matching: $pattern}${NC}"

    if [ -n "$pattern" ]; then
        "$GROVE_FD" -e md "$pattern" "$GROVE_ROOT" --exclude node_modules
    else
        "$GROVE_FD" -e md . "$GROVE_ROOT" --exclude node_modules | head -50
        echo -e "\n${YELLOW}(Showing first 50 results. Add a pattern to filter.)${NC}"
    fi
}

# gfjson - Find JSON files
# Usage: gfjson [pattern]
gfjson() {
    local pattern="${1:-}"
    echo -e "${CYAN}🔍 JSON files${pattern:+ matching: $pattern}${NC}"

    if [ -n "$pattern" ]; then
        "$GROVE_FD" -e json "$pattern" "$GROVE_ROOT" --exclude node_modules --exclude 'package-lock.json'
    else
        "$GROVE_FD" -e json . "$GROVE_ROOT" --exclude node_modules --exclude 'package-lock.json' | head -50
        echo -e "\n${YELLOW}(Showing first 50 results. Add a pattern to filter.)${NC}"
    fi
}

# gftoml - Find TOML files
# Usage: gftoml [pattern]
gftoml() {
    local pattern="${1:-}"
    echo -e "${CYAN}🔍 TOML files${pattern:+ matching: $pattern}${NC}"

    if [ -n "$pattern" ]; then
        "$GROVE_FD" -e toml "$pattern" "$GROVE_ROOT" --exclude node_modules
    else
        "$GROVE_FD" -e toml . "$GROVE_ROOT" --exclude node_modules | head -50
        echo -e "\n${YELLOW}(Showing first 50 results. Add a pattern to filter.)${NC}"
    fi
}

# gfh - Find HTML files
# Usage: gfh [pattern]
gfh() {
    local pattern="${1:-}"
    echo -e "${CYAN}🔍 HTML files${pattern:+ matching: $pattern}${NC}"

    if [ -n "$pattern" ]; then
        "$GROVE_FD" -e html "$pattern" "$GROVE_ROOT" --exclude node_modules --exclude dist
    else
        "$GROVE_FD" -e html . "$GROVE_ROOT" --exclude node_modules --exclude dist | head -50
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
        echo -e "\n${GREEN}Test Files (.test.ts, .spec.ts):${NC}"
        "$GROVE_FD" "\.(test|spec)\.(ts|js)$" "$GROVE_ROOT" --exclude node_modules | head -30
        echo -e "\n${GREEN}Test Directories:${NC}"
        "$GROVE_FD" -t d "test|tests|__tests__" "$GROVE_ROOT" --exclude node_modules | head -20
    fi
}

# gftodo - Find TODO, FIXME, HACK comments
# Usage: gftodo [type]
# Examples: gftodo, gftodo FIXME, gftodo HACK
gftodo() {
    local type="${1:-}"

    if [ -n "$type" ]; then
        echo -e "${CYAN}🔍 Finding ${type} comments${NC}"
        "$GROVE_RG" --color=always -n "\b${type}\b:?" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --glob '!.git' \
           --type ts --type js --type svelte
    else
        echo -e "${CYAN}🔍 Finding TODO/FIXME/HACK comments${NC}\n"

        echo -e "${YELLOW}TODOs:${NC}"
        "$GROVE_RG" --color=always -n "\bTODO\b:?" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --glob '!.git' \
           --type ts --type js --type svelte | head -20

        echo -e "\n${RED}FIXMEs:${NC}"
        "$GROVE_RG" --color=always -n "\bFIXME\b:?" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --glob '!.git' \
           --type ts --type js --type svelte | head -20

        echo -e "\n${PURPLE}HACKs:${NC}"
        "$GROVE_RG" --color=always -n "\bHACK\b:?" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --glob '!.git' \
           --type ts --type js --type svelte | head -10
    fi
}

# gfconfig - Find configuration files
# Usage: gfconfig [name]
gfconfig() {
    local name="${1:-}"
    echo -e "${CYAN}🔍 Configuration files${name:+ matching: $name}${NC}\n"

    if [ -n "$name" ]; then
        "$GROVE_FD" "$name" "$GROVE_ROOT" --exclude node_modules | "$GROVE_RG" -i "config|rc|\.toml|\.json|\.yaml|\.yml"
    else
        echo -e "${GREEN}Build & Bundler Configs:${NC}"
        "$GROVE_FD" "(vite|svelte|tailwind|postcss|tsconfig|jsconfig)\.config\.(js|ts|mjs)" "$GROVE_ROOT" --exclude node_modules

        echo -e "\n${GREEN}Cloudflare/Wrangler:${NC}"
        "$GROVE_FD" "wrangler" "$GROVE_ROOT" -e toml --exclude node_modules

        echo -e "\n${GREEN}Package Configs:${NC}"
        "$GROVE_FD" "package\.json" "$GROVE_ROOT" --exclude node_modules | head -20

        echo -e "\n${GREEN}TypeScript Configs:${NC}"
        "$GROVE_FD" "tsconfig" "$GROVE_ROOT" -e json --exclude node_modules

        echo -e "\n${GREEN}Other Configs (.rc, .config.*):${NC}"
        "$GROVE_FD" "\.(eslintrc|prettierrc|npmrc)" "$GROVE_ROOT" --exclude node_modules
    fi
}

# gfyaml - Find YAML files (GitHub Actions, etc.)
# Usage: gfyaml [pattern]
gfyaml() {
    local pattern="${1:-}"
    echo -e "${CYAN}🔍 YAML files${pattern:+ matching: $pattern}${NC}"

    if [ -n "$pattern" ]; then
        "$GROVE_FD" -e yml -e yaml "$pattern" "$GROVE_ROOT" --exclude node_modules
    else
        echo -e "\n${GREEN}GitHub Actions:${NC}"
        "$GROVE_FD" -e yml -e yaml . "$GROVE_ROOT/.github" 2>/dev/null | head -20

        echo -e "\n${GREEN}Other YAML files:${NC}"
        "$GROVE_FD" -e yml -e yaml . "$GROVE_ROOT" --exclude node_modules --exclude .github | head -30
    fi
}

# gfsh - Find shell scripts
# Usage: gfsh [pattern]
gfsh() {
    local pattern="${1:-}"
    echo -e "${CYAN}🔍 Shell scripts${pattern:+ matching: $pattern}${NC}"

    if [ -n "$pattern" ]; then
        "$GROVE_FD" -e sh -e bash -e zsh "$pattern" "$GROVE_ROOT" --exclude node_modules
    else
        "$GROVE_FD" -e sh -e bash -e zsh . "$GROVE_ROOT" --exclude node_modules | head -50
        echo -e "\n${YELLOW}(Showing first 50 results. Add a pattern to filter.)${NC}"
    fi
}

# gfstore - Find Svelte stores
# Usage: gfstore [name]
gfstore() {
    local name="${1:-}"
    echo -e "${CYAN}🔍 Svelte stores${name:+ matching: $name}${NC}\n"

    if [ -n "$name" ]; then
        "$GROVE_RG" --color=always -n "(writable|readable|derived).*$name|$name.*(writable|readable|derived)" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' \
           --type ts --type js --type svelte
    else
        echo -e "${GREEN}Store Files:${NC}"
        "$GROVE_FD" "store" "$GROVE_ROOT" -e ts -e js --exclude node_modules | head -20

        echo -e "\n${GREEN}Store Definitions (writable/readable/derived):${NC}"
        "$GROVE_RG" --color=always -n "export\s+(const|let).*=\s*(writable|readable|derived)" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' \
           --type ts --type js | head -30
    fi
}

# gfgrove - Find "Grove" references across the codebase
# Usage: gfgrove [context]
# Examples: gfgrove, gfgrove auth, gfgrove engine
gfgrove() {
    local context="${1:-}"
    echo -e "${CYAN}🌲 Searching for Grove references${context:+ with context: $context}${NC}\n"

    if [ -n "$context" ]; then
        "$GROVE_RG" --color=always -n -i "grove.*$context|$context.*grove" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --glob '!.git' --glob '!*.lock'
    else
        echo -e "${GREEN}In Code:${NC}"
        "$GROVE_RG" --color=always -n "\bGrove\b" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --glob '!.git' --glob '!*.lock' --glob '!*.md' \
           --type ts --type js --type svelte | head -30

        echo -e "\n${GREEN}In Documentation:${NC}"
        "$GROVE_RG" --color=always -n "\bGrove\b" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!.git' \
           --type md | head -20
    fi
}

# gfbind - Find Cloudflare bindings (D1, KV, R2, DO)
# Usage: gfbind [type]
# Examples: gfbind, gfbind D1, gfbind KV, gfbind R2
gfbind() {
    local type="${1:-}"
    echo -e "${CYAN}☁️  Finding Cloudflare bindings${type:+ of type: $type}${NC}\n"

    if [ -n "$type" ]; then
        case "$type" in
            D1|d1|db)
                "$GROVE_RG" --color=always -n "(platform\.env\.DB|D1Database|\.prepare\(|\.exec\(|\.batch\()" "$GROVE_ROOT" \
                   --glob '!node_modules' --glob '!dist' --type ts --type js
                ;;
            KV|kv)
                "$GROVE_RG" --color=always -n "(platform\.env\.\w*KV|KVNamespace|\.get\(|\.put\(|\.delete\(|\.list\()" "$GROVE_ROOT" \
                   --glob '!node_modules' --glob '!dist' --type ts --type js
                ;;
            R2|r2)
                "$GROVE_RG" --color=always -n "(platform\.env\.\w*BUCKET|R2Bucket|\.put\(|\.get\(|\.head\()" "$GROVE_ROOT" \
                   --glob '!node_modules' --glob '!dist' --type ts --type js
                ;;
            DO|do)
                "$GROVE_RG" --color=always -n "(DurableObject|\.idFromName\(|\.idFromString\(|\.get\(.*stub)" "$GROVE_ROOT" \
                   --glob '!node_modules' --glob '!dist' --type ts --type js
                ;;
            *)
                echo -e "${YELLOW}Unknown binding type: $type${NC}"
                echo "Valid types: D1, KV, R2, DO"
                ;;
        esac
    else
        echo -e "${GREEN}D1 Database:${NC}"
        "$GROVE_RG" --color=always -n "platform\.env\.DB|D1Database" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js | head -15

        echo -e "\n${GREEN}KV Namespaces:${NC}"
        "$GROVE_RG" --color=always -n "KVNamespace|platform\.env\.\w*KV" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js | head -15

        echo -e "\n${GREEN}R2 Buckets:${NC}"
        "$GROVE_RG" --color=always -n "R2Bucket|platform\.env\.\w*BUCKET" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js | head -15

        echo -e "\n${GREEN}Durable Objects:${NC}"
        "$GROVE_RG" --color=always -n "DurableObject|\.idFromName\(" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js | head -15
    fi
}

# gfdo - Find Durable Object definitions and usage
# Usage: gfdo [name]
gfdo() {
    local name="${1:-}"
    echo -e "${CYAN}🔒 Finding Durable Objects${name:+ matching: $name}${NC}\n"

    if [ -n "$name" ]; then
        "$GROVE_RG" --color=always -n "$name" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js | \
           "$GROVE_RG" -i "durable|DO|stub|idFrom"
    else
        echo -e "${GREEN}DO Class Definitions:${NC}"
        "$GROVE_RG" --color=always -n "export\s+class\s+\w+.*implements\s+DurableObject|extends\s+DurableObject" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts

        echo -e "\n${GREEN}DO Files (by naming convention):${NC}"
        "$GROVE_FD" -i "do\.|durable" "$GROVE_ROOT" -e ts --exclude node_modules | head -20

        echo -e "\n${GREEN}DO Stub Usage:${NC}"
        "$GROVE_RG" --color=always -n "\.idFromName\(|\.idFromString\(|\.get\(.*DurableObjectId" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts | head -20

        echo -e "\n${GREEN}Wrangler DO Bindings:${NC}"
        "$GROVE_RG" --color=always -n "\[durable_objects\]" -A 10 "$GROVE_ROOT" \
           --glob 'wrangler*.toml' 2>/dev/null | head -30
    fi
}

# gfd1 - Find D1 database usage
# Usage: gfd1 [table-or-pattern]
gfd1() {
    local pattern="${1:-}"
    echo -e "${CYAN}🗄️  Finding D1 database usage${pattern:+ matching: $pattern}${NC}\n"

    if [ -n "$pattern" ]; then
        echo -e "${GREEN}Queries mentioning '$pattern':${NC}"
        "$GROVE_RG" --color=always -n "(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP).*$pattern" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js

        echo -e "\n${GREEN}Schema references:${NC}"
        "$GROVE_RG" --color=always -n "$pattern" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' \
           --glob '*.sql' --glob 'schema*' --glob 'migration*'
    else
        echo -e "${GREEN}D1 Database Bindings:${NC}"
        "$GROVE_RG" --color=always -n "platform\.env\.DB|env\.DB|D1Database" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js | head -20

        echo -e "\n${GREEN}Query Operations (.prepare, .exec, .batch):${NC}"
        "$GROVE_RG" --color=always -n "\.prepare\(|\.exec\(|\.batch\(" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js | head -30

        echo -e "\n${GREEN}SQL Files:${NC}"
        "$GROVE_FD" -e sql . "$GROVE_ROOT" --exclude node_modules | head -20

        echo -e "\n${GREEN}Wrangler D1 Config:${NC}"
        "$GROVE_RG" --color=always -n "\[\[d1_databases\]\]" -A 5 "$GROVE_ROOT" \
           --glob 'wrangler*.toml' 2>/dev/null
    fi
}

# gfr2 - Find R2 storage usage
# Usage: gfr2 [pattern]
gfr2() {
    local pattern="${1:-}"
    echo -e "${CYAN}📦 Finding R2 storage usage${pattern:+ matching: $pattern}${NC}\n"

    if [ -n "$pattern" ]; then
        "$GROVE_RG" --color=always -n "$pattern" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js | \
           "$GROVE_RG" -i "r2|bucket|storage|upload|blob"
    else
        echo -e "${GREEN}R2 Bucket Bindings:${NC}"
        "$GROVE_RG" --color=always -n "R2Bucket|platform\.env\.\w*BUCKET|env\.\w*BUCKET" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js | head -20

        echo -e "\n${GREEN}R2 Operations (.put, .get, .head, .delete, .list):${NC}"
        "$GROVE_RG" --color=always -n "bucket\.(put|get|head|delete|list)\(" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js | head -30

        echo -e "\n${GREEN}Upload/Download Patterns:${NC}"
        "$GROVE_RG" --color=always -n "(upload|download|presigned|signedUrl).*[Rr]2|[Rr]2.*(upload|download)" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js | head -20

        echo -e "\n${GREEN}Wrangler R2 Config:${NC}"
        "$GROVE_RG" --color=always -n "\[\[r2_buckets\]\]" -A 5 "$GROVE_ROOT" \
           --glob 'wrangler*.toml' 2>/dev/null
    fi
}

# gfkv - Find KV namespace usage
# Usage: gfkv [key-pattern]
gfkv() {
    local pattern="${1:-}"
    echo -e "${CYAN}🔑 Finding KV namespace usage${pattern:+ matching: $pattern}${NC}\n"

    if [ -n "$pattern" ]; then
        "$GROVE_RG" --color=always -n "$pattern" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js | \
           "$GROVE_RG" -i "kv|namespace|cache|session"
    else
        echo -e "${GREEN}KV Namespace Bindings:${NC}"
        "$GROVE_RG" --color=always -n "KVNamespace|platform\.env\.\w*KV|env\.\w*KV" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js | head -20

        echo -e "\n${GREEN}KV Operations (.get, .put, .delete, .list):${NC}"
        "$GROVE_RG" --color=always -n "\w+KV\.(get|put|delete|list|getWithMetadata)\(" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js | head -30

        echo -e "\n${GREEN}Cache/Session Patterns:${NC}"
        "$GROVE_RG" --color=always -n "(cache|session|token).*KV|KV.*(cache|session|token)" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js | head -20

        echo -e "\n${GREEN}Wrangler KV Config:${NC}"
        "$GROVE_RG" --color=always -n "\[\[kv_namespaces\]\]" -A 5 "$GROVE_ROOT" \
           --glob 'wrangler*.toml' 2>/dev/null
    fi
}

# gfused - Find where a component/function is used (imports + usage)
# Usage: gfused "ComponentName"
gfused() {
    local name="$1"
    if [ -z "$name" ]; then
        echo -e "${YELLOW}Usage: gfused \"ComponentName\"${NC}"
        echo -e "Example: gfused GlassCard"
        return 1
    fi

    echo -e "${CYAN}🔍 Finding usage of: ${name}${NC}\n"

    echo -e "${GREEN}Imports:${NC}"
    "$GROVE_RG" --color=always -n "import.*\{[^}]*\b$name\b[^}]*\}|import\s+$name\s+from|import\s+\*\s+as\s+$name" "$GROVE_ROOT" \
       --glob '!node_modules' --glob '!dist' \
       --type ts --type js --type svelte | head -25

    echo -e "\n${GREEN}JSX/Svelte Usage (<$name):${NC}"
    "$GROVE_RG" --color=always -n "<$name[\s/>]" "$GROVE_ROOT" \
       --glob '!node_modules' --glob '!dist' \
       --type svelte | head -25

    echo -e "\n${GREEN}Function Calls ($name()):${NC}"
    "$GROVE_RG" --color=always -n "\b$name\s*\(" "$GROVE_ROOT" \
       --glob '!node_modules' --glob '!dist' \
       --type ts --type js --type svelte | \
       "$GROVE_RG" -v "(function|const|let|var|import|export)\s+$name" | head -25
}

# =============================================================================
# Debugging & Environment
# =============================================================================

# gflog - Find console.log/warn/error statements (cleanup before prod!)
# Usage: gflog [level]
# Examples: gflog, gflog error, gflog warn
gflog() {
    local level="${1:-}"
    echo -e "${CYAN}🔍 Finding console statements${level:+ of type: $level}${NC}\n"

    if [ -n "$level" ]; then
        "$GROVE_RG" --color=always -n "console\.$level\(" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --glob '!*.test.*' --glob '!*.spec.*' \
           --type ts --type js --type svelte
    else
        echo -e "${YELLOW}console.log:${NC}"
        "$GROVE_RG" --color=always -n "console\.log\(" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --glob '!*.test.*' --glob '!*.spec.*' \
           --type ts --type js --type svelte | head -20

        echo -e "\n${RED}console.error:${NC}"
        "$GROVE_RG" --color=always -n "console\.error\(" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --glob '!*.test.*' --glob '!*.spec.*' \
           --type ts --type js --type svelte | head -15

        echo -e "\n${PURPLE}console.warn:${NC}"
        "$GROVE_RG" --color=always -n "console\.warn\(" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --glob '!*.test.*' --glob '!*.spec.*' \
           --type ts --type js --type svelte | head -10

        echo -e "\n${CYAN}debugger statements:${NC}"
        "$GROVE_RG" --color=always -n "\bdebugger\b" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' \
           --type ts --type js --type svelte
    fi
}

# gfenv - Find environment variable usage
# Usage: gfenv [var-name]
gfenv() {
    local var="${1:-}"
    echo -e "${CYAN}🔐 Finding environment variables${var:+ matching: $var}${NC}\n"

    if [ -n "$var" ]; then
        "$GROVE_RG" --color=always -n "$var" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' \
           --type ts --type js --type svelte | \
           "$GROVE_RG" -i "env|process|import\.meta"
    else
        echo -e "${GREEN}.env Files:${NC}"
        "$GROVE_FD" "^\.env" "$GROVE_ROOT" --hidden --exclude node_modules 2>/dev/null

        echo -e "\n${GREEN}import.meta.env usage:${NC}"
        "$GROVE_RG" --color=always -n "import\.meta\.env\.\w+" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' \
           --type ts --type js --type svelte | head -20

        echo -e "\n${GREEN}process.env usage:${NC}"
        "$GROVE_RG" --color=always -n "process\.env\.\w+" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' \
           --type ts --type js | head -15

        echo -e "\n${GREEN}platform.env usage (Cloudflare):${NC}"
        "$GROVE_RG" --color=always -n "platform\.env\.\w+" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' \
           --type ts --type js | head -15

        echo -e "\n${GREEN}Env vars in wrangler.toml:${NC}"
        "$GROVE_RG" --color=always -n "\[vars\]" -A 10 "$GROVE_ROOT" \
           --glob 'wrangler*.toml' 2>/dev/null | head -20
    fi
}

# =============================================================================
# Git & Recent Changes
# =============================================================================

# gfrecent - Find recently modified files
# Usage: gfrecent [days]
# Default: 7 days
gfrecent() {
    local days="${1:-7}"
    echo -e "${CYAN}📅 Files modified in the last ${days} day(s)${NC}\n"

    # Use git log for tracked files (more reliable than mtime)
    echo -e "${GREEN}Recently Modified (via git):${NC}"
    git -C "$GROVE_ROOT" log --since="${days} days ago" --name-only --pretty=format: | \
        sort -u | \
        grep -v '^$' | \
        grep -v 'node_modules\|dist\|\.svelte-kit\|pnpm-lock' | \
        head -50

    echo -e "\n${YELLOW}Summary by directory:${NC}"
    git -C "$GROVE_ROOT" log --since="${days} days ago" --name-only --pretty=format: | \
        sort -u | \
        grep -v '^$' | \
        grep -v 'node_modules\|dist\|\.svelte-kit\|pnpm-lock' | \
        sed 's|/[^/]*$||' | \
        sort | uniq -c | sort -rn | head -15
}

# gfchanged - Find files changed on current branch vs main
# Usage: gfchanged [base-branch]
gfchanged() {
    local base="${1:-main}"
    local current
    current=$(git -C "$GROVE_ROOT" branch --show-current)

    echo -e "${CYAN}📝 Files changed on ${current} vs ${base}${NC}\n"

    echo -e "${GREEN}Changed Files:${NC}"
    git -C "$GROVE_ROOT" diff --name-only "${base}...HEAD" 2>/dev/null | \
        grep -v 'node_modules\|pnpm-lock' | head -50

    echo -e "\n${YELLOW}Change Summary:${NC}"
    git -C "$GROVE_ROOT" diff --stat "${base}...HEAD" 2>/dev/null | tail -1

    echo -e "\n${GREEN}By Type:${NC}"
    git -C "$GROVE_ROOT" diff --name-only "${base}...HEAD" 2>/dev/null | \
        grep -v 'node_modules\|pnpm-lock' | \
        sed -n 's/.*\.//p' | \
        sort | uniq -c | sort -rn

    echo -e "\n${PURPLE}Commits on this branch:${NC}"
    git -C "$GROVE_ROOT" log --oneline "${base}..HEAD" 2>/dev/null | head -15
}

# gftag - Find changes between git tags
# Usage: gftag [from-tag] [to-tag]
# Examples: gftag v1.0.0 v1.1.0, gftag v1.0.0 (compares to HEAD)
gftag() {
    local from_tag="$1"
    local to_tag="${2:-HEAD}"

    if [ -z "$from_tag" ]; then
        echo -e "${CYAN}🏷️  Available tags:${NC}\n"
        git -C "$GROVE_ROOT" tag --sort=-version:refname | head -20
        echo -e "\n${YELLOW}Usage: gftag <from-tag> [to-tag]${NC}"
        echo "Example: gftag v1.0.0 v1.1.0"
        return 0
    fi

    echo -e "${CYAN}🏷️  Changes from ${from_tag} to ${to_tag}${NC}\n"

    echo -e "${GREEN}Changed Files:${NC}"
    git -C "$GROVE_ROOT" diff --name-only "${from_tag}..${to_tag}" 2>/dev/null | \
        grep -v 'node_modules\|pnpm-lock' | head -50

    echo -e "\n${YELLOW}Change Summary:${NC}"
    git -C "$GROVE_ROOT" diff --stat "${from_tag}..${to_tag}" 2>/dev/null | tail -3

    echo -e "\n${GREEN}By Type:${NC}"
    git -C "$GROVE_ROOT" diff --name-only "${from_tag}..${to_tag}" 2>/dev/null | \
        grep -v 'node_modules\|pnpm-lock' | \
        sed -n 's/.*\.//p' | \
        sort | uniq -c | sort -rn

    echo -e "\n${PURPLE}Commits between tags:${NC}"
    git -C "$GROVE_ROOT" log --oneline "${from_tag}..${to_tag}" 2>/dev/null | head -20
}

# =============================================================================
# Type System & Exports
# =============================================================================

# gftype - Find TypeScript type/interface definitions
# Usage: gftype [name]
gftype() {
    local name="${1:-}"
    echo -e "${CYAN}📐 Finding TypeScript types${name:+ matching: $name}${NC}\n"

    if [ -n "$name" ]; then
        "$GROVE_RG" --color=always -n "(type|interface|enum)\s+$name" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts

        echo -e "\n${GREEN}Usage of $name:${NC}"
        "$GROVE_RG" --color=always -n ":\s*$name\b|<$name>|as\s+$name" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts | head -20
    else
        echo -e "${GREEN}Type Definitions:${NC}"
        "$GROVE_RG" --color=always -n "^export\s+(type|interface)\s+\w+" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --glob '!*.d.ts' --type ts | head -30

        echo -e "\n${GREEN}Enums:${NC}"
        "$GROVE_RG" --color=always -n "^export\s+enum\s+\w+" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts | head -15

        echo -e "\n${GREEN}Type Files (*.types.ts, types/*.ts):${NC}"
        "$GROVE_FD" "types?" "$GROVE_ROOT" -e ts --exclude node_modules --exclude '*.d.ts' | head -20
    fi
}

# gfexport - Find exports from modules
# Usage: gfexport [pattern]
gfexport() {
    local pattern="${1:-}"
    echo -e "${CYAN}📤 Finding exports${pattern:+ matching: $pattern}${NC}\n"

    if [ -n "$pattern" ]; then
        "$GROVE_RG" --color=always -n "export\s+(default\s+)?(const|let|function|class|type|interface|enum)\s+.*$pattern" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js

        echo -e "\n${GREEN}Re-exports:${NC}"
        "$GROVE_RG" --color=always -n "export\s+\{[^}]*$pattern" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js | head -15
    else
        echo -e "${GREEN}Default Exports:${NC}"
        "$GROVE_RG" --color=always -n "export\s+default" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js --type svelte | head -20

        echo -e "\n${GREEN}Named Exports:${NC}"
        "$GROVE_RG" --color=always -n "^export\s+(const|let|function|class|async function)" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --type ts --type js | head -25

        echo -e "\n${GREEN}Barrel Exports (index.ts):${NC}"
        "$GROVE_FD" "index.ts" "$GROVE_ROOT" --exclude node_modules | head -20
    fi
}

# =============================================================================
# Authentication & Engine
# =============================================================================

# gfauth - Find authentication-related code
# Usage: gfauth [aspect]
# Examples: gfauth, gfauth session, gfauth token, gfauth login
gfauth() {
    local aspect="${1:-}"
    echo -e "${CYAN}🔐 Finding authentication code${aspect:+ related to: $aspect}${NC}\n"

    if [ -n "$aspect" ]; then
        "$GROVE_RG" --color=always -n "$aspect" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' \
           --type ts --type js --type svelte | \
           "$GROVE_RG" -i "auth|session|token|login|logout|user|credential|oauth|jwt"
    else
        echo -e "${GREEN}Auth Files:${NC}"
        "$GROVE_FD" -i "auth|login|session" "$GROVE_ROOT" -e ts -e js -e svelte --exclude node_modules | head -20

        echo -e "\n${GREEN}Session Handling:${NC}"
        "$GROVE_RG" --color=always -n "(session|getSession|createSession|destroySession)" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' \
           --type ts --type js | head -20

        echo -e "\n${GREEN}Token Operations:${NC}"
        "$GROVE_RG" --color=always -n "(token|jwt|accessToken|refreshToken|bearer)" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' -i \
           --type ts --type js | head -15

        echo -e "\n${GREEN}OAuth/Login:${NC}"
        "$GROVE_RG" --color=always -n "(oauth|login|logout|signIn|signOut|authenticate)" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' -i \
           --type ts --type js --type svelte | head -15

        echo -e "\n${GREEN}Heartwood/GroveAuth:${NC}"
        "$GROVE_RG" --color=always -n "(heartwood|groveauth|GroveAuth)" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' -i \
           --type ts --type js | head -15
    fi
}

# gfengine - Find @autumnsgrove/groveengine imports and usage
# Usage: gfengine [module]
# Examples: gfengine, gfengine ui, gfengine stores, gfengine utils
gfengine() {
    local module="${1:-}"
    echo -e "${CYAN}🌲 Finding engine imports${module:+ from: $module}${NC}\n"

    if [ -n "$module" ]; then
        "$GROVE_RG" --color=always -n "@autumnsgrove/groveengine/$module" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --glob '!packages/engine' \
           --type ts --type js --type svelte
    else
        echo -e "${GREEN}Engine Imports by Module:${NC}"

        echo -e "\n${PURPLE}UI Components:${NC}"
        "$GROVE_RG" --color=always -n "@autumnsgrove/groveengine/ui" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --glob '!packages/engine' \
           --type ts --type js --type svelte | head -15

        echo -e "\n${PURPLE}Utilities:${NC}"
        "$GROVE_RG" --color=always -n "@autumnsgrove/groveengine/utils" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --glob '!packages/engine' \
           --type ts --type js --type svelte | head -10

        echo -e "\n${PURPLE}Stores:${NC}"
        "$GROVE_RG" --color=always -n "@autumnsgrove/groveengine/ui/stores" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --glob '!packages/engine' \
           --type ts --type js --type svelte | head -10

        echo -e "\n${PURPLE}Auth:${NC}"
        "$GROVE_RG" --color=always -n "@autumnsgrove/groveengine/auth" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --glob '!packages/engine' \
           --type ts --type js --type svelte | head -10

        echo -e "\n${YELLOW}Apps using the engine:${NC}"
        "$GROVE_RG" -l "@autumnsgrove/groveengine" "$GROVE_ROOT" \
           --glob '!node_modules' --glob '!dist' --glob '!packages/engine' \
           --type ts --type js --type svelte | \
           sed 's|.*/||; s|/.*||' | sort -u
    fi
}

# =============================================================================
# Agent-Friendly Quick Reference
# =============================================================================

# gfagent - Condensed command reference for AI agents
# Usage: gfagent
# This outputs a compact, copy-paste friendly reference
gfagent() {
    cat << 'AGENT_HELP'
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    GROVE-FIND: Agent Quick Reference                          ║
╚═══════════════════════════════════════════════════════════════════════════════╝

CORE SEARCH
  gf "pattern"        Search entire codebase
  gfc "Name"          Find class/component definition
  gff "func"          Find function definition
  gfi "module"        Find imports of module
  gfused "Name"       Find where component/function is used (imports + JSX + calls)

FILE TYPES
  gfs/gft/gfj         Svelte / TypeScript / JavaScript
  gfcss/gfmd/gfjson   CSS / Markdown / JSON
  gftoml/gfh/gfyaml   TOML / HTML / YAML
  gfsh                Shell scripts

SVELTEKIT & DOMAIN
  gfr [route]         Find routes (+page, +server)
  gfd [table]         Find database queries
  gfg [variant]       Find Glass components
  gftest [name]       Find test files
  gfconfig            Find all config files
  gfstore [name]      Find Svelte stores

DEVELOPMENT WORKFLOW
  gftodo              Find TODO/FIXME/HACK (gftodo FIXME for just FIXMEs)
  gflog               Find console.log/warn/error (cleanup!)
  gfenv [var]         Find .env files and env var usage
  gfgrove [ctx]       Find "Grove" references

GIT & RECENT CHANGES
  gfrecent [days]     Files modified in last N days (default: 7)
  gfchanged [base]    Files changed on current branch vs main
  gftag [from] [to]   Changes between git tags

CLOUDFLARE
  gfbind [type]       All CF bindings overview
  gfd1 [table]        D1 database usage
  gfr2 [pattern]      R2 storage operations
  gfkv [key]          KV namespace usage
  gfdo [name]         Durable Objects

CODE QUALITY
  gftype [name]       Find TypeScript types/interfaces
  gfexport [pattern]  Find module exports
  gfauth [aspect]     Find authentication code
  gfengine [module]   Find @autumnsgrove/groveengine imports

METRICS
  gf-stats [path]     Full statistics summary
  gf-count-lines      Lines of code by language
  gf-count-files      Files by extension

PRO TIPS
  • All commands accept optional pattern/filter arguments
  • Pipe to `| less` for paging, `| wc -l` for counts
  • gfrecent 1 → files changed today
  • gfchanged → great for PR scope review
  • gfengine → verify engine-first pattern compliance
AGENT_HELP
}

# =============================================================================
# Counting & Metrics Functions
# =============================================================================
#
# Architecture: Dual-Mode Design
# --------------------------------
# These functions provide both interactive and scriptable modes to support
# different use cases:
#
# **Interactive Mode** (user-facing commands):
#   - gf-count-lines, gf-count-files, gf-count-langs, gf-stats
#   - Formatted output with colors, labels, and thousand separators
#   - Designed for terminal display and human readability
#   - Use for ad-hoc code metrics and exploration
#
# **Scriptable Mode** (internal helpers):
#   - _grove_count_lines_pattern, _grove_count_files_pattern, etc.
#   - Raw numeric output, no formatting
#   - Used by repo-snapshot.sh for automated repository metrics
#   - Consistent exclusions and counting logic across all workflows
#
# Benefits:
#   - Single source of truth for counting algorithms
#   - Eliminates code duplication between manual and automated workflows
#   - Easy to test and maintain
#   - Scriptable functions can be composed in CI/CD pipelines
#
# =============================================================================

# Shared helper: Build find command with standard exclusions
# Returns a find command string (use with eval)
_grove_build_find_cmd() {
    local path="$1"
    local pattern="$2"

    echo "find \"$path\" -name \"$pattern\" ! -path '*/node_modules/*' ! -path '*/.git/*' ! -path '*/dist/*' ! -path '*/.svelte-kit/*' -type f"
}

# Shared helper: Format number with thousand separators
# Used by all counting functions for consistent output
_grove_format_num() {
    echo "$1" | sed ':a;s/\B[0-9]\{3\}\>$/,&/;ta'
}

# Internal helper: Count lines for a specific pattern (scriptable/quiet mode)
# Returns just the number, no formatting
# Used by repo-snapshot.sh for repository metrics
# Performance: Uses find with xargs wc -l for better performance than cat
#
# Error handling: Returns 0 if no files match the pattern or on any error.
# This is intentional - an empty directory should show 0 lines, not an error.
_grove_count_lines_pattern() {
    local pattern="$1"
    local path="${2:-$GROVE_ROOT}"

    local cmd
    cmd=$(_grove_build_find_cmd "$path" "$pattern")

    # Use xargs with wc -l, then take the total from the last line
    # wc -l outputs a "total" line when processing multiple files
    # If no files match, awk returns empty string, fallback to 0
    local result
    result=$(eval "$cmd" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')

    # Explicit fallback: if result is empty or non-numeric, return 0
    if [ -z "$result" ] || ! [[ "$result" =~ ^[0-9]+$ ]]; then
        echo "0"
    else
        echo "$result"
    fi
}

# Internal helper: Count files for a specific pattern (scriptable/quiet mode)
# Returns just the number, no formatting
_grove_count_files_pattern() {
    local pattern="$1"
    local path="${2:-$GROVE_ROOT}"

    local cmd
    cmd=$(_grove_build_find_cmd "$path" "$pattern")
    eval "$cmd" 2>/dev/null | wc -l | tr -d ' '
}

# gf-count-lines - Count lines in files
# Usage: gf-count-lines [path]
#
# Note: TypeScript counts exclude .d.ts declaration files by design, as these
# are typically auto-generated type definitions rather than authored code.
gf-count-lines() {
    local path="${1:-$GROVE_ROOT}"

    if [ ! -d "$path" ] && [ ! -f "$path" ]; then
        echo -e "${RED}Error: Path does not exist: $path${NC}"
        return 1
    fi

    echo -e "${CYAN}📊 Counting lines in: ${path}${NC}\n"

    # If it's a single file, just count it
    if [ -f "$path" ]; then
        local lines
        lines=$(wc -l < "$path" 2>/dev/null | tr -d ' ')
        echo -e "  Total lines: ${GREEN}${lines}${NC}"
        return 0
    fi

    # For directories, count by file type
    local ts_lines svelte_lines js_lines css_lines md_lines total_lines

    # Count TypeScript lines (special handling for .d.ts exclusion)
    # Why not use _grove_count_lines_pattern?
    #   - TypeScript requires excluding .d.ts files (auto-generated type definitions)
    #   - The shared helper doesn't support exclusion patterns
    #   - Could refactor _grove_count_lines_pattern to accept exclusions, but
    #     TypeScript is currently the only case that needs this
    # Decision: Keep explicit until we have multiple exclusion cases
    ts_lines=$(find "$path" -name "*.ts" ! -name "*.d.ts" \
        ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" ! -path "*/.svelte-kit/*" \
        -type f 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')

    # Explicit empty result handling (same pattern as _grove_count_lines_pattern)
    if [ -z "$ts_lines" ] || ! [[ "$ts_lines" =~ ^[0-9]+$ ]]; then
        ts_lines=0
    fi

    # Use shared helper for other file types
    svelte_lines=$(_grove_count_lines_pattern "*.svelte" "$path")
    js_lines=$(_grove_count_lines_pattern "*.js" "$path")
    css_lines=$(_grove_count_lines_pattern "*.css" "$path")
    md_lines=$(_grove_count_lines_pattern "*.md" "$path")

    total_lines=$((ts_lines + svelte_lines + js_lines + css_lines + md_lines))

    echo -e "  ${GREEN}TypeScript:${NC}  $(_grove_format_num $ts_lines) lines"
    echo -e "  ${GREEN}Svelte:${NC}      $(_grove_format_num $svelte_lines) lines"
    echo -e "  ${GREEN}JavaScript:${NC}  $(_grove_format_num $js_lines) lines"
    echo -e "  ${GREEN}CSS:${NC}         $(_grove_format_num $css_lines) lines"
    echo -e "  ${GREEN}Markdown:${NC}    $(_grove_format_num $md_lines) lines"
    echo -e "  ${CYAN}────────────────────────${NC}"
    echo -e "  ${YELLOW}Total:${NC}       $(_grove_format_num $total_lines) lines"
}

# gf-count-files - Count files by extension
# Usage: gf-count-files [path]
gf-count-files() {
    local path="${1:-$GROVE_ROOT}"

    if [ ! -d "$path" ]; then
        echo -e "${RED}Error: Path is not a directory: $path${NC}"
        return 1
    fi

    echo -e "${CYAN}📁 Counting files in: ${path}${NC}\n"

    # Use fd if available, otherwise fall back to find
    local cmd
    if [ -n "$GROVE_FD" ]; then
        # Get all files, exclude common directories
        cmd="$GROVE_FD -t f . \"$path\" --exclude node_modules --exclude .git --exclude dist --exclude .svelte-kit"
    else
        cmd="find \"$path\" -type f ! -path '*/node_modules/*' ! -path '*/.git/*' ! -path '*/dist/*' ! -path '*/.svelte-kit/*'"
    fi

    # Get files and extract extensions, then count
    eval "$cmd" | \
        sed -n 's/.*\.//p' | \
        sort | \
        uniq -c | \
        sort -rn | \
        awk '{printf "  %-15s %s files\n", "." $2 ":", $1}'

    # Show total
    local total
    total=$(eval "$cmd" | wc -l | tr -d ' ')
    echo -e "\n  ${YELLOW}Total:${NC}          $total files"
}

# gf-count-langs - Count files by language/type
# Usage: gf-count-langs [path]
#
# Performance optimized: Uses a single find command with case matching
# instead of 10 separate find operations
gf-count-langs() {
    local path="${1:-$GROVE_ROOT}"

    if [ ! -d "$path" ]; then
        echo -e "${RED}Error: Path is not a directory: $path${NC}"
        return 1
    fi

    echo -e "${CYAN}🔤 Counting files by language in: ${path}${NC}\n"

    # Single find command with case matching for better performance
    # Counts each file type in one pass through the directory tree
    local counts
    counts=$(find "$path" -type f \
        ! -path "*/node_modules/*" \
        ! -path "*/.git/*" \
        ! -path "*/dist/*" \
        ! -path "*/.svelte-kit/*" \
        2>/dev/null | awk '
        /\.ts$/ {ts++}
        /\.svelte$/ {svelte++}
        /\.js$/ {js++}
        /\.css$/ {css++}
        /\.md$/ {md++}
        /\.json$/ {json++}
        /\.toml$/ {toml++}
        /\.yml$/ {yaml++}
        /\.yaml$/ {yaml++}
        /\.sql$/ {sql++}
        /\.sh$/ {sh++}
        END {
            print ts+0, svelte+0, js+0, css+0, md+0, json+0, toml+0, yaml+0, sql+0, sh+0
        }
    ')

    # Parse the counts
    read -r ts_files svelte_files js_files css_files md_files json_files toml_files yaml_files sql_files sh_files <<< "$counts"

    total_files=$((ts_files + svelte_files + js_files + css_files + md_files + json_files + toml_files + yaml_files + sql_files + sh_files))

    echo -e "  ${GREEN}TypeScript:${NC}  $ts_files files"
    echo -e "  ${GREEN}Svelte:${NC}      $svelte_files files"
    echo -e "  ${GREEN}JavaScript:${NC}  $js_files files"
    echo -e "  ${GREEN}CSS:${NC}         $css_files files"
    echo -e "  ${GREEN}Markdown:${NC}    $md_files files"
    echo -e "  ${GREEN}JSON:${NC}        $json_files files"
    echo -e "  ${GREEN}TOML:${NC}        $toml_files files"
    echo -e "  ${GREEN}YAML:${NC}        $yaml_files files"
    echo -e "  ${GREEN}SQL:${NC}         $sql_files files"
    echo -e "  ${GREEN}Shell:${NC}       $sh_files files"
    echo -e "  ${CYAN}────────────────────────${NC}"
    echo -e "  ${YELLOW}Total:${NC}       $total_files files"
}

# Internal helper: Optimized all-in-one stats gathering
# Performs a single directory traversal instead of multiple separate scans
# Returns a tab-separated string with all metrics for gf-stats
#
# Performance: O(n) single pass vs O(3n) for separate function calls
_grove_stats_optimized() {
    local path="$1"

    # Single find command that processes each file once
    find "$path" -type f \
        ! -path "*/node_modules/*" \
        ! -path "*/.git/*" \
        ! -path "*/dist/*" \
        ! -path "*/.svelte-kit/*" \
        2>/dev/null | awk '
        # Count files by extension
        /\.ts$/ && !/\.d\.ts$/ {
            ts_files++
            cmd = "wc -l \"" $0 "\" 2>/dev/null"
            cmd | getline result
            close(cmd)
            split(result, parts)
            ts_lines += parts[1]
        }
        /\.svelte$/ {
            svelte_files++
            cmd = "wc -l \"" $0 "\" 2>/dev/null"
            cmd | getline result
            close(cmd)
            split(result, parts)
            svelte_lines += parts[1]
        }
        /\.js$/ {
            js_files++
            cmd = "wc -l \"" $0 "\" 2>/dev/null"
            cmd | getline result
            close(cmd)
            split(result, parts)
            js_lines += parts[1]
        }
        /\.css$/ {
            css_files++
            cmd = "wc -l \"" $0 "\" 2>/dev/null"
            cmd | getline result
            close(cmd)
            split(result, parts)
            css_lines += parts[1]
        }
        /\.md$/ {
            md_files++
            cmd = "wc -l \"" $0 "\" 2>/dev/null"
            cmd | getline result
            close(cmd)
            split(result, parts)
            md_lines += parts[1]
        }
        /\.json$/ {json_files++}
        /\.toml$/ {toml_files++}
        /\.yml$/ {yaml_files++}
        /\.yaml$/ {yaml_files++}
        /\.sql$/ {sql_files++}
        /\.sh$/ {sh_files++}
        END {
            # Output format: ts_lines svelte_lines js_lines css_lines md_lines ts_files svelte_files js_files css_files md_files json_files toml_files yaml_files sql_files sh_files
            printf "%d\t%d\t%d\t%d\t%d\t%d\t%d\t%d\t%d\t%d\t%d\t%d\t%d\t%d\t%d",
                ts_lines+0, svelte_lines+0, js_lines+0, css_lines+0, md_lines+0,
                ts_files+0, svelte_files+0, js_files+0, css_files+0, md_files+0,
                json_files+0, toml_files+0, yaml_files+0, sql_files+0, sh_files+0
        }
    '
}

# gf-stats - Combined statistics summary
# Usage: gf-stats [path]
#
# Performance: Uses optimized single-pass directory traversal instead of
# calling gf-count-lines, gf-count-langs, and gf-count-files separately.
# This reduces file system operations from O(3n) to O(n).
gf-stats() {
    local path="${1:-$GROVE_ROOT}"

    if [ ! -d "$path" ] && [ ! -f "$path" ]; then
        echo -e "${RED}Error: Path does not exist: $path${NC}"
        return 1
    fi

    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║           Grove Code Statistics Summary                      ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}\n"
    echo -e "${YELLOW}Path:${NC} $path\n"

    # If it's a file, just show line count
    if [ -f "$path" ]; then
        gf-count-lines "$path"
        return 0
    fi

    # For directories, use optimized single-pass gathering
    local stats
    stats=$(_grove_stats_optimized "$path")

    # Parse the tab-separated output
    IFS=$'\t' read -r ts_lines svelte_lines js_lines css_lines md_lines \
        ts_files svelte_files js_files css_files md_files \
        json_files toml_files yaml_files sql_files sh_files <<< "$stats"

    # Calculate totals
    local total_lines=$((ts_lines + svelte_lines + js_lines + css_lines + md_lines))
    local total_files=$((ts_files + svelte_files + js_files + css_files + md_files + json_files + toml_files + yaml_files + sql_files + sh_files))

    # Display Lines of Code
    echo -e "${PURPLE}═══ Lines of Code ═══${NC}\n"
    echo -e "  ${GREEN}TypeScript:${NC}  $(_grove_format_num $ts_lines) lines"
    echo -e "  ${GREEN}Svelte:${NC}      $(_grove_format_num $svelte_lines) lines"
    echo -e "  ${GREEN}JavaScript:${NC}  $(_grove_format_num $js_lines) lines"
    echo -e "  ${GREEN}CSS:${NC}         $(_grove_format_num $css_lines) lines"
    echo -e "  ${GREEN}Markdown:${NC}    $(_grove_format_num $md_lines) lines"
    echo -e "  ${CYAN}────────────────────────${NC}"
    echo -e "  ${YELLOW}Total:${NC}       $(_grove_format_num $total_lines) lines"

    # Display File Counts by Language
    echo -e "\n${PURPLE}═══ File Counts by Language ═══${NC}\n"
    echo -e "  ${GREEN}TypeScript:${NC}  $ts_files files"
    echo -e "  ${GREEN}Svelte:${NC}      $svelte_files files"
    echo -e "  ${GREEN}JavaScript:${NC}  $js_files files"
    echo -e "  ${GREEN}CSS:${NC}         $css_files files"
    echo -e "  ${GREEN}Markdown:${NC}    $md_files files"
    echo -e "  ${GREEN}JSON:${NC}        $json_files files"
    echo -e "  ${GREEN}TOML:${NC}        $toml_files files"
    echo -e "  ${GREEN}YAML:${NC}        $yaml_files files"
    echo -e "  ${GREEN}SQL:${NC}         $sql_files files"
    echo -e "  ${GREEN}Shell:${NC}       $sh_files files"
    echo -e "  ${CYAN}────────────────────────${NC}"
    echo -e "  ${YELLOW}Total:${NC}       $total_files files"

    # Display Extension Summary
    echo -e "\n${PURPLE}═══ File Counts by Extension ═══${NC}\n"
    gf-count-files "$path"
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
    echo -e "${GREEN}Grove Find - Blazing Fast Code Search & Metrics${NC}"
    echo ""
    echo -e "${CYAN}Core Commands:${NC}"
    echo "  gf \"pattern\"      - General search across codebase"
    echo "  gfc \"Name\"        - Find class/component definitions"
    echo "  gff \"func\"        - Find function definitions"
    echo "  gfi \"module\"      - Find imports of a module"
    echo "  gfused \"Name\"     - Find where a component/function is used"
    echo ""
    echo -e "${CYAN}File Type Searches:${NC}"
    echo "  gfs [pattern]     - Find Svelte components"
    echo "  gft [pattern]     - Find TypeScript files"
    echo "  gfj [pattern]     - Find JavaScript files"
    echo "  gfcss [pattern]   - Find CSS files"
    echo "  gfmd [pattern]    - Find Markdown files"
    echo "  gfjson [pattern]  - Find JSON files"
    echo "  gftoml [pattern]  - Find TOML files"
    echo "  gfh [pattern]     - Find HTML files"
    echo "  gfyaml [pattern]  - Find YAML files"
    echo "  gfsh [pattern]    - Find shell scripts"
    echo ""
    echo -e "${CYAN}Domain Searches:${NC}"
    echo "  gfr [route]       - Find SvelteKit routes"
    echo "  gfd [table]       - Find database queries"
    echo "  gfg [variant]     - Find Glass component usage"
    echo "  gfspec [name]     - Find spec documents"
    echo "  gftest [name]     - Find test files"
    echo "  gfconfig [name]   - Find configuration files"
    echo "  gfstore [name]    - Find Svelte stores"
    echo ""
    echo -e "${CYAN}Development Workflow:${NC}"
    echo "  gftodo [type]     - Find TODO/FIXME/HACK comments"
    echo "  gflog [level]     - Find console.log/warn/error (cleanup!)"
    echo "  gfenv [var]       - Find .env files and env var usage"
    echo "  gfgrove [context] - Find Grove references in codebase"
    echo ""
    echo -e "${CYAN}Git & Recent Changes:${NC}"
    echo "  gfrecent [days]   - Files modified in last N days (default: 7)"
    echo "  gfchanged [base]  - Files changed on branch vs main"
    echo "  gftag [from] [to] - Changes between git tags"
    echo ""
    echo -e "${CYAN}Cloudflare/Infrastructure:${NC}"
    echo "  gfbind [type]     - Find CF bindings (D1, KV, R2, DO)"
    echo "  gfdo [name]       - Find Durable Object definitions"
    echo "  gfd1 [table]      - Find D1 database usage & queries"
    echo "  gfr2 [pattern]    - Find R2 storage/upload operations"
    echo "  gfkv [key]        - Find KV namespace usage"
    echo ""
    echo -e "${CYAN}Code Quality:${NC}"
    echo "  gftype [name]     - Find TypeScript types/interfaces"
    echo "  gfexport [name]   - Find module exports"
    echo "  gfauth [aspect]   - Find authentication code"
    echo "  gfengine [module] - Find @autumnsgrove/groveengine imports"
    echo ""
    echo -e "${CYAN}Counting & Metrics:${NC}"
    echo "  gf-count-lines [path]  - Count lines of code"
    echo "  gf-count-files [path]  - Count files by extension"
    echo "  gf-count-langs [path]  - Count files by language"
    echo "  gf-stats [path]        - Combined statistics summary"
    echo ""
    echo -e "${CYAN}Interactive & Agent:${NC}"
    echo "  gfzf              - Interactive file finder (requires fzf)"
    echo "  gfagent           - Compact reference for AI agents"
    echo ""
    echo -e "${CYAN}Pro Tips:${NC}"
    echo "  - All searches exclude node_modules, dist, and .git"
    echo "  - Use quotes for patterns with spaces"
    echo "  - Combine with | less for paging through results"
    echo "  - gfrecent 1 → files changed today"
    echo "  - gfchanged → great for PR scope review"
    echo "  - gfengine → verify engine-first pattern compliance"
}

# Let user know functions are loaded
echo -e "${GREEN}✓ Grove Find loaded!${NC} Run ${CYAN}gfhelp${NC} for available commands."
