package cmd

import (
	"strings"
	"testing"
)

func TestSlugify(t *testing.T) {
	tests := []struct {
		input  string
		maxLen int
		want   string
	}{
		{"Hello World", 50, "hello-world"},
		{"Fix: the bug in auth", 50, "fix-the-bug-in-auth"},
		{"  spaces  everywhere  ", 50, "spaces-everywhere"},
		{"UPPERCASE TITLE", 50, "uppercase-title"},
		{"special!@#$%chars", 50, "special-chars"},
		{"a---b---c", 50, "a-b-c"},
		{"trailing-dash-", 50, "trailing-dash"},
		{"-leading-dash", 50, "leading-dash"},
		{"", 50, ""},
		{"a very long title that should be truncated to fifty characters max", 20, "a-very-long-title-th"},
		{"truncate-at-dash---", 10, "truncate-a"},
		{"numbers123and456", 50, "numbers123and456"},
	}
	for _, tt := range tests {
		got := slugify(tt.input, tt.maxLen)
		if got != tt.want {
			t.Errorf("slugify(%q, %d) = %q, want %q", tt.input, tt.maxLen, got, tt.want)
		}
	}
}

func TestBranchNameForIssue(t *testing.T) {
	tests := []struct {
		number string
		title  string
		labels []string
		want   string
	}{
		{"42", "Add login page", nil, "feat/issue-42-add-login-page"},
		{"42", "Add login page", []string{"enhancement"}, "feat/issue-42-add-login-page"},
		{"99", "Fix broken auth", []string{"bug"}, "fix/issue-99-fix-broken-auth"},
		{"99", "Fix broken auth", []string{"priority", "bug"}, "fix/issue-99-fix-broken-auth"},
		{"1", "Simple", []string{}, "feat/issue-1-simple"},
		{"7", "Bug Fix", []string{"BUG"}, "fix/issue-7-bug-fix"},
	}
	for _, tt := range tests {
		got := branchNameForIssue(tt.number, tt.title, tt.labels)
		if got != tt.want {
			t.Errorf("branchNameForIssue(%q, %q, %v) = %q, want %q",
				tt.number, tt.title, tt.labels, got, tt.want)
		}
	}
}

func TestParseWorktreeListPorcelain(t *testing.T) {
	input := `worktree /Users/autumn/Projects/Lattice
HEAD abc1234567890
branch refs/heads/main

worktree /Users/autumn/.worktrees/issue-42
HEAD def5678901234
branch refs/heads/feat/issue-42-add-login

`
	trees := parseWorktreeListPorcelain(input)
	if len(trees) != 2 {
		t.Fatalf("expected 2 worktrees, got %d", len(trees))
	}

	if trees[0].Path != "/Users/autumn/Projects/Lattice" {
		t.Errorf("tree[0].Path = %q, want /Users/autumn/Projects/Lattice", trees[0].Path)
	}
	if trees[0].Branch != "main" {
		t.Errorf("tree[0].Branch = %q, want main", trees[0].Branch)
	}
	if trees[0].Head != "abc1234567890" {
		t.Errorf("tree[0].Head = %q, want abc1234567890", trees[0].Head)
	}

	if trees[1].Branch != "feat/issue-42-add-login" {
		t.Errorf("tree[1].Branch = %q, want feat/issue-42-add-login", trees[1].Branch)
	}
}

func TestParseWorktreeListPorcelainEmpty(t *testing.T) {
	trees := parseWorktreeListPorcelain("")
	if len(trees) != 0 {
		t.Errorf("expected 0 worktrees, got %d", len(trees))
	}
}

func TestParseWorktreeListPorcelainBare(t *testing.T) {
	input := `worktree /Users/autumn/Projects/Lattice.git
HEAD abc1234567890
bare

`
	trees := parseWorktreeListPorcelain(input)
	if len(trees) != 1 {
		t.Fatalf("expected 1 worktree, got %d", len(trees))
	}
	if !trees[0].Bare {
		t.Error("expected bare to be true")
	}
}

func TestMatchWorktreeByIssueNumber(t *testing.T) {
	// Test the branch-matching logic used by resolveWorktreeByIssue.
	// We test the matching directly since resolveWorktreeByIssue depends on
	// gwexec.GitOutput which requires a real git repo.
	input := `worktree /Users/autumn/Projects/Lattice
HEAD abc1234567890
branch refs/heads/main

worktree /Users/autumn/.worktrees/issue-1349
HEAD def5678901234
branch refs/heads/fix/issue-1349-fix-inconsistent-lantern-icons

worktree /Users/autumn/.worktrees/issue-1434
HEAD 789012345abcd
branch refs/heads/feat/issue-1434-allow-worktree-finish-to-accept-an-issue-number

`
	trees := parseWorktreeListPorcelain(input)

	tests := []struct {
		number    string
		wantPath  string
		wantCount int
	}{
		{"1349", "/Users/autumn/.worktrees/issue-1349", 1},
		{"1434", "/Users/autumn/.worktrees/issue-1434", 1},
		{"9999", "", 0},
	}

	for _, tt := range tests {
		needle := "issue-" + tt.number + "-"
		var matches []worktreeInfo
		for _, tr := range trees {
			if strings.Contains(tr.Branch, needle) {
				matches = append(matches, tr)
			}
		}
		if len(matches) != tt.wantCount {
			t.Errorf("issue %s: got %d matches, want %d", tt.number, len(matches), tt.wantCount)
			continue
		}
		if tt.wantCount == 1 && matches[0].Path != tt.wantPath {
			t.Errorf("issue %s: got path %q, want %q", tt.number, matches[0].Path, tt.wantPath)
		}
	}
}
