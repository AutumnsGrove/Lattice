#!/usr/bin/env bats
#
# Tests for grove-find.sh GitHub Issues functions
#
# Covers:
#   - Argument validation
#   - Graceful degradation (no gh installed)
#   - Agent mode output contract (no box-drawing chars)
#   - Integration with mocked gh/git CLIs
#

load 'helpers/setup'

# =============================================================================
# Argument Validation
# =============================================================================

@test "gfissuerefs: no args shows usage and exits 1" {
    run gfissuerefs
    assert_failure
    assert_output --partial "Usage: gfissuerefs"
}

@test "gfissuelink: no args shows usage and exits 1" {
    run gfissuelink
    assert_failure
    assert_output --partial "Usage: gfissuelink"
}

@test "gfissue: no args lists open issues (exit 0)" {
    run gfissue
    assert_success
    assert_output --partial "Open Issues"
}

@test "gfissues: no args defaults to open issues" {
    run gfissues
    assert_success
    assert_output --partial "Filter: open (default)"
}

@test "gfissues: 'closed' passes --state closed to gh" {
    run gfissues closed
    assert_success
    assert_output --partial "Filter: closed"
    assert_output --partial "Initial setup"
}

@test "gfissues: '@autumn' passes --assignee to gh" {
    run gfissues "@autumn"
    assert_success
    assert_output --partial "assigned to autumn"
    assert_output --partial "Auth bug"
}

@test "gfissuestale: custom days parameter is used" {
    run gfissuestale 14
    assert_success
    assert_output --partial "Stale Issues (14+ days)"
}

# =============================================================================
# Graceful Degradation (no gh CLI)
# =============================================================================

@test "gfissue: without gh shows install message and exits 1" {
    # Use a PATH without gh
    PATH="/usr/bin:/bin" run gfissue
    assert_failure
    assert_output --partial "GitHub CLI (gh) required"
    assert_output --partial "brew install gh"
}

@test "gfissues: without gh shows install message and exits 1" {
    PATH="/usr/bin:/bin" run gfissues
    assert_failure
    assert_output --partial "GitHub CLI (gh) required"
}

@test "gfissueboard: without gh shows install message and exits 1" {
    PATH="/usr/bin:/bin" run gfissueboard
    assert_failure
    assert_output --partial "GitHub CLI (gh) required"
}

@test "gfissuemine: without gh shows install message and exits 1" {
    PATH="/usr/bin:/bin" run gfissuemine
    assert_failure
    assert_output --partial "GitHub CLI (gh) required"
}

@test "gfissuestale: without gh shows install message and exits 1" {
    PATH="/usr/bin:/bin" run gfissuestale
    assert_failure
    assert_output --partial "GitHub CLI (gh) required"
}

# =============================================================================
# Agent Mode Contract
# =============================================================================

@test "gfissue: agent mode has no box-drawing characters" {
    run gfissue
    assert_success
    refute_output --partial "╔"
    refute_output --partial "╗"
    refute_output --partial "╚"
    refute_output --partial "╝"
    refute_output --partial "║"
}

@test "gfissue: agent mode uses === header format" {
    run gfissue
    assert_success
    assert_output --partial "=== Open Issues ==="
}

@test "gfissues: agent mode has no box-drawing characters" {
    run gfissues
    assert_success
    refute_output --partial "╔"
    refute_output --partial "╚"
}

@test "gfissues: agent mode uses === header format" {
    run gfissues
    assert_success
    assert_output --partial "=== Issues (filtered) ==="
}

@test "gfissuerefs: agent mode uses === header format" {
    run gfissuerefs 42
    assert_success
    assert_output --partial "=== References to #42 ==="
}

@test "gfissueboard: agent mode uses === header format" {
    run gfissueboard
    assert_success
    assert_output --partial "=== Issue Board ==="
}

@test "gfissuemine: agent mode uses === header format" {
    run gfissuemine
    assert_success
    assert_output --partial "=== My Issues ==="
}

@test "gfissuestale: agent mode uses === header format" {
    run gfissuestale
    assert_success
    assert_output --partial "=== Stale Issues"
}

@test "gfissuelink: agent mode uses === header format" {
    run gfissuelink src/auth.ts
    assert_success
    assert_output --partial "=== Issues Related to File ==="
}

# =============================================================================
# Integration with Mocked gh/git
# =============================================================================

@test "gfissue: lists issues from mock" {
    run gfissue
    assert_success
    assert_output --partial "Auth bug in login flow"
    assert_output --partial "Add dark mode support"
}

@test "gfissue 42: shows issue details" {
    run gfissue 42
    assert_success
    assert_output --partial "=== Issue #42 ==="
    assert_output --partial "Auth bug in login flow"
}

@test "gfissue 42: shows related PRs section" {
    run gfissue 42
    assert_success
    assert_output --partial "Related PRs"
    assert_output --partial "Fix auth redirect"
}

@test "gfissue 42: shows related branches" {
    run gfissue 42
    assert_success
    assert_output --partial "Related Branches"
    assert_output --partial "fix/42-auth-bug"
}

@test "gfissue 42: shows commits mentioning issue" {
    run gfissue 42
    assert_success
    assert_output --partial "Commits Mentioning #42"
    assert_output --partial "resolve redirect loop"
}

@test "gfissue 999: handles non-existent issue gracefully" {
    run gfissue 999
    # Should not crash - the function catches the error
    assert_output --partial "Issue #999"
}

@test "gfissues 'bug': filters by label" {
    run gfissues bug
    assert_success
    assert_output --partial "label \"bug\""
    assert_output --partial "Auth bug"
}

@test "gfissues 'all': shows all states" {
    run gfissues all
    assert_success
    assert_output --partial "Filter: all states"
    assert_output --partial "Update deps"
}

@test "gfissuerefs 42: finds code references" {
    run gfissuerefs 42
    assert_success
    assert_output --partial "In Code"
    # rg should find #42 in our fixture file
    assert_output --partial "auth.ts"
}

@test "gfissuerefs 42: finds commit references" {
    run gfissuerefs 42
    assert_success
    assert_output --partial "In Commits"
    assert_output --partial "resolve redirect loop"
}

@test "gfissuerefs 42: finds branch references" {
    run gfissuerefs 42
    assert_success
    assert_output --partial "In Branches"
    assert_output --partial "fix/42-auth-bug"
}

@test "gfissuerefs 42: finds TODOS.md references" {
    run gfissuerefs 42
    assert_success
    assert_output --partial "In TODOS.md"
    assert_output --partial "Fix login redirect"
}

@test "gfissuerefs 42: shows total reference count" {
    run gfissuerefs 42
    assert_success
    assert_output --partial "Total references found:"
}

@test "gfissueboard: groups issues by labels" {
    run gfissueboard
    assert_success
    assert_output --partial "Issue Board"
}

@test "gfissuemine: shows assigned issues" {
    run gfissuemine
    assert_success
    assert_output --partial "Assigned to: @autumn"
    assert_output --partial "Auth bug"
}

@test "gfissuelink src/auth.ts: finds issue refs in commit history" {
    run gfissuelink src/auth.ts
    assert_success
    assert_output --partial "Commits with Issue Refs"
    assert_output --partial "#42"
}

@test "gfissuestale: uses default 30 days" {
    run gfissuestale
    assert_success
    assert_output --partial "Stale Issues (30+ days)"
}
