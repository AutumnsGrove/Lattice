#!/bin/bash
#
# Shared BATS test setup for grove-find.sh
#
# Provides:
#   - Agent mode enabled (GF_AGENT=1)
#   - GROVE_ROOT pointed at a temp directory with fixture files
#   - Mock gh and git binaries prepended to PATH
#   - GROVE_RG set to real rg (for code search tests)
#   - grove-find.sh sourced and ready to use
#

# Load BATS assertion libraries
load '/opt/homebrew/lib/bats-support/load.bash'
load '/opt/homebrew/lib/bats-assert/load.bash'

# Directory where this setup file lives
HELPERS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURES_DIR="$(cd "$HELPERS_DIR/../fixtures" && pwd)"
REPO_DIR="$(cd "$HELPERS_DIR/../.." && pwd)"

setup() {
    # Enable agent mode (no colors, no box-drawing characters)
    export GF_AGENT=1

    # Source grove-find.sh FIRST with real PATH intact
    # This discovers real rg/fd and defines all gf* functions
    source "$REPO_DIR/grove-find.sh"

    # Save the real GROVE_RG (pointing to actual rg binary)
    local real_rg="$GROVE_RG"

    # Create a temp directory to act as GROVE_ROOT
    export GROVE_ROOT="$(mktemp -d)"

    # Create minimal fixture files inside the fake repo
    mkdir -p "$GROVE_ROOT/src"

    cat > "$GROVE_ROOT/src/auth.ts" <<'SRC'
// Fix for #42 - resolved auth bug
// See #7 for context
export function login() { /* #42 */ }
SRC

    cat > "$GROVE_ROOT/TODOS.md" <<'TODOS'
# TODOs

- [ ] Fix login redirect (#42)
- [ ] Add dark mode (#15)
- [x] Update deps (#7)
TODOS

    # Initialize a real git repo in the temp dir (using real git, before mocks)
    command git -C "$GROVE_ROOT" init -q 2>/dev/null
    command git -C "$GROVE_ROOT" add -A 2>/dev/null
    command git -C "$GROVE_ROOT" \
        -c user.email="test@test.com" -c user.name="Test" \
        commit -q -m "Initial commit for #42 fix" 2>/dev/null

    # NOW prepend mock fixtures to PATH (gh/git calls from functions use mocks)
    export PATH="$FIXTURES_DIR:$PATH"

    # Restore real GROVE_RG (so rg-based searches work against fixture files)
    export GROVE_RG="$real_rg"
}

teardown() {
    # Clean up temp directory
    if [ -n "$GROVE_ROOT" ] && [ -d "$GROVE_ROOT" ]; then
        rm -rf "$GROVE_ROOT"
    fi
}

# Helper: run a function with gh removed from PATH to test graceful degradation
run_without_gh() {
    # Remove fixtures dir from PATH so the mock gh isn't found,
    # and also ensure real gh isn't found by using a minimal PATH
    local clean_path=""
    local IFS=':'
    for p in $PATH; do
        if [ "$p" != "$FIXTURES_DIR" ]; then
            clean_path="${clean_path:+$clean_path:}$p"
        fi
    done

    # Replace gh in fixtures with a non-executable to simulate "not installed"
    # Instead, just run with PATH that doesn't include fixtures or real gh
    PATH="/usr/bin:/bin" run "$@"
}
