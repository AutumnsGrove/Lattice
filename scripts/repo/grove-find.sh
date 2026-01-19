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
    echo -e "${CYAN}Counting & Metrics:${NC}"
    echo "  gf-count-lines [path]  - Count lines of code"
    echo "  gf-count-files [path]  - Count files by extension"
    echo "  gf-count-langs [path]  - Count files by language"
    echo "  gf-stats [path]        - Combined statistics summary"
    echo ""
    echo -e "${CYAN}Interactive:${NC}"
    echo "  gfzf              - Interactive file finder (requires fzf)"
    echo ""
    echo -e "${CYAN}Pro Tips:${NC}"
    echo "  - All searches exclude node_modules, dist, and .git"
    echo "  - Use quotes for patterns with spaces"
    echo "  - Combine with | less for paging through results"
    echo "  - Counting commands default to GROVE_ROOT if no path given"
}

# Let user know functions are loaded
echo -e "${GREEN}✓ Grove Find loaded!${NC} Run ${CYAN}gfhelp${NC} for available commands."
