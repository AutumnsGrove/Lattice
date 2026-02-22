package safety

import "testing"

func TestGitOperationTier(t *testing.T) {
	tests := []struct {
		operation string
		want      Tier
	}{
		// Read operations
		{"status", TierRead},
		{"log", TierRead},
		{"diff", TierRead},
		{"blame", TierRead},
		{"show", TierRead},
		{"fetch", TierRead},
		{"reflog", TierRead},
		{"shortlog", TierRead},
		{"branch_list", TierRead},
		{"worktree_list", TierRead},

		// Write operations
		{"add", TierWrite},
		{"commit", TierWrite},
		{"push", TierWrite},
		{"pull", TierWrite},
		{"branch_create", TierWrite},
		{"checkout", TierWrite},
		{"switch", TierWrite},
		{"stash_push", TierWrite},
		{"save", TierWrite},
		{"wip", TierWrite},
		{"ship", TierWrite},
		{"cherry_pick", TierWrite},

		// Dangerous operations
		{"push_force", TierDangerous},
		{"reset_hard", TierDangerous},
		{"rebase", TierDangerous},
		{"merge", TierDangerous},
		{"clean", TierDangerous},
		{"branch_force_delete", TierDangerous},

		// Unknown → defaults to WRITE
		{"unknown_op", TierWrite},
	}

	for _, tt := range tests {
		got := GitOperationTier(tt.operation)
		if got != tt.want {
			t.Errorf("GitOperationTier(%q) = %s, want %s", tt.operation, got, tt.want)
		}
	}
}

func TestIsProtectedBranch(t *testing.T) {
	protected := []string{"main", "master", "production", "staging"}

	tests := []struct {
		branch string
		want   bool
	}{
		{"main", true},
		{"Main", true},    // case insensitive
		{"MAIN", true},    // case insensitive
		{"master", true},
		{"production", true},
		{"staging", true},
		{"feat/123-auth", false},
		{"develop", false},
		{"main-feature", false}, // partial match should not match
	}

	for _, tt := range tests {
		got := IsProtectedBranch(tt.branch, protected)
		if got != tt.want {
			t.Errorf("IsProtectedBranch(%q) = %v, want %v", tt.branch, got, tt.want)
		}
	}
}

func TestCheckGitSafetyForcePushProtected(t *testing.T) {
	protected := []string{"main", "master", "production"}

	err := CheckGitSafety("push_force", true, true, false, true, "main", protected)
	if err == nil {
		t.Error("force push to main should be blocked")
	}
	safeErr, ok := err.(*SafetyError)
	if !ok {
		t.Fatalf("expected *SafetyError, got %T", err)
	}
	if safeErr.Tier != TierProtected {
		t.Errorf("expected PROTECTED tier, got %s", safeErr.Tier)
	}
}

func TestCheckGitSafetyForcePushFeatureBranch(t *testing.T) {
	protected := []string{"main", "master"}

	err := CheckGitSafety("push_force", true, true, false, true, "feat/123-auth", protected)
	if err != nil {
		t.Errorf("force push to feature branch should be allowed, got: %v", err)
	}
}

func TestCheckGitSafetyReadAlwaysPasses(t *testing.T) {
	err := CheckGitSafety("status", false, false, true, false, "", nil)
	if err != nil {
		t.Errorf("git status should always pass, got: %v", err)
	}
}

func TestCheckGitSafetyAgentModeBlocksDangerous(t *testing.T) {
	err := CheckGitSafety("rebase", true, true, true, false, "", nil)
	if err == nil {
		t.Error("rebase should be blocked in agent mode")
	}
}
