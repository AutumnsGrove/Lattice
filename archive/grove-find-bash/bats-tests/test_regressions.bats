#!/usr/bin/env bats
#
# Regression tests for grove-find.sh
#
# Tests for specific bugs that were fixed, to prevent them from returning.
#

load 'helpers/setup'

# =============================================================================
# Math Expression Bug (empty branch_refs)
# =============================================================================
# Bug: When branch_refs was empty, the arithmetic expression in gfissuerefs
# could fail with "invalid arithmetic operator" because wc -l on empty input
# or the variable itself contained unexpected whitespace.
#
# Fix: The -n checks ensure empty variables skip the arithmetic entirely.

@test "gfissuerefs: empty branch_refs doesn't cause math expression error" {
    # Issue #99 has no branches matching (mock git returns nothing for grep on #99)
    # but may have code refs if rg finds something. The key test: no crash.
    run gfissuerefs 99
    assert_success
    # Should complete without bash arithmetic errors
    refute_output --partial "invalid arithmetic"
    refute_output --partial "syntax error"
    assert_output --partial "Total references found:"
}

@test "gfissuerefs: all refs empty gives total = 0 without crash" {
    # Use an issue number that won't match anything in fixtures or mocks
    # Mock git returns nothing for --grep=#9999
    # rg won't find #9999 in fixture files
    # No branches match 9999
    run gfissuerefs 9999
    assert_success
    refute_output --partial "invalid arithmetic"
    assert_output --partial "Total references found: 0"
}
