package cmd

import (
	"testing"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/safety"
)

func TestParseBisectOutput(t *testing.T) {
	tests := []struct {
		name      string
		stdout    string
		wantSteps string
		wantFound bool
		wantHash  string
	}{
		{
			name:      "bisecting with steps",
			stdout:    "Bisecting: 3 revisions left to test after this (roughly 2 steps)\n[abc1234] Some commit message",
			wantSteps: "~2 steps remaining",
			wantFound: false,
			wantHash:  "",
		},
		{
			name:      "bisecting single revision",
			stdout:    "Bisecting: 1 revision left to test after this (roughly 1 step)\n[def5678] Another commit",
			wantSteps: "~1 steps remaining",
			wantFound: false,
			wantHash:  "",
		},
		{
			name:      "no match",
			stdout:    "Some other git output\nnothing relevant here",
			wantSteps: "",
			wantFound: false,
			wantHash:  "",
		},
		{
			name:      "empty output",
			stdout:    "",
			wantSteps: "",
			wantFound: false,
			wantHash:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			steps, found, hash := parseBisectOutput(tt.stdout)
			if steps != tt.wantSteps {
				t.Errorf("steps = %q, want %q", steps, tt.wantSteps)
			}
			if found != tt.wantFound {
				t.Errorf("found = %v, want %v", found, tt.wantFound)
			}
			if hash != tt.wantHash {
				t.Errorf("hash = %q, want %q", hash, tt.wantHash)
			}
		})
	}
}

func TestParseBisectFound(t *testing.T) {
	tests := []struct {
		name     string
		stdout   string
		wantHash string
	}{
		{
			name:     "first bad commit found",
			stdout:   "abc1234def5678901234567890abcdef12345678 is the first bad commit\ncommit abc1234def5678901234567890abcdef12345678\nAuthor: Alice <alice@example.com>",
			wantHash: "abc1234def5678901234567890abcdef12345678",
		},
		{
			name:     "short hash first bad commit",
			stdout:   "abc1234 is the first bad commit\nSome details...",
			wantHash: "abc1234",
		},
		{
			name:     "not found yet",
			stdout:   "Bisecting: 5 revisions left to test after this (roughly 3 steps)",
			wantHash: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, found, hash := parseBisectOutput(tt.stdout)
			if tt.wantHash != "" {
				if !found {
					t.Error("expected found=true")
				}
				if hash != tt.wantHash {
					t.Errorf("hash = %q, want %q", hash, tt.wantHash)
				}
			} else {
				if found {
					t.Error("expected found=false")
				}
			}
		})
	}
}

func TestBisectRunSafetyInAgentMode(t *testing.T) {
	// bisect_run is DANGEROUS tier — should be blocked in agent mode
	err := safety.CheckGitSafety("bisect_run", true, true, true, false, "", nil)
	if err == nil {
		t.Error("bisect_run should be blocked in agent mode")
	}
	safeErr, ok := err.(*safety.SafetyError)
	if !ok {
		t.Fatalf("expected *SafetyError, got %T", err)
	}
	if safeErr.Tier != safety.TierDangerous {
		t.Errorf("expected DANGEROUS tier, got %s", safeErr.Tier)
	}
}

func TestBisectStatusReadTier(t *testing.T) {
	// bisect_status is READ tier — should pass without any flags
	err := safety.CheckGitSafety("bisect_status", false, false, true, false, "", nil)
	if err != nil {
		t.Errorf("bisect_status should pass in agent mode without flags, got: %v", err)
	}
}

func TestBisectLogReadTier(t *testing.T) {
	// bisect_log is READ tier — should pass without any flags
	err := safety.CheckGitSafety("bisect_log", false, false, true, false, "", nil)
	if err != nil {
		t.Errorf("bisect_log should pass in agent mode without flags, got: %v", err)
	}
}

func TestBisectWriteRequiresFlag(t *testing.T) {
	// bisect_start is WRITE tier — should require --write in non-interactive mode
	err := safety.CheckGitSafety("bisect_start", false, false, false, false, "", nil)
	if err == nil {
		t.Error("bisect_start should require --write flag")
	}

	// Should pass with --write
	err = safety.CheckGitSafety("bisect_start", true, false, false, false, "", nil)
	if err != nil {
		t.Errorf("bisect_start should pass with --write, got: %v", err)
	}
}
