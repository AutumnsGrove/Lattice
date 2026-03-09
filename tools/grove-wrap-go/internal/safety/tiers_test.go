package safety

import (
	"testing"
)

func TestTierString(t *testing.T) {
	tests := []struct {
		tier Tier
		want string
	}{
		{TierRead, "READ"},
		{TierWrite, "WRITE"},
		{TierDangerous, "DANGEROUS"},
		{TierProtected, "PROTECTED"},
		{Tier(99), "UNKNOWN"},
	}
	for _, tt := range tests {
		if got := tt.tier.String(); got != tt.want {
			t.Errorf("Tier(%d).String() = %q, want %q", tt.tier, got, tt.want)
		}
	}
}

func TestTierDescription(t *testing.T) {
	if desc := TierRead.Description(); desc == "" {
		t.Error("TierRead.Description() should not be empty")
	}
	if desc := TierProtected.Description(); desc == "" {
		t.Error("TierProtected.Description() should not be empty")
	}
}

func TestCheckReadAlwaysAllowed(t *testing.T) {
	err := Check(CheckOpts{
		Operation: "status",
		Tier:      TierRead,
	})
	if err != nil {
		t.Errorf("READ tier should always be allowed, got: %v", err)
	}
}

func TestCheckWriteRequiresFlag(t *testing.T) {
	// Without --write flag and not interactive → error
	err := Check(CheckOpts{
		Operation:   "commit",
		Tier:        TierWrite,
		WriteFlag:   false,
		Interactive: false,
	})
	if err == nil {
		t.Error("WRITE tier without --write should fail")
	}
	safeErr, ok := err.(*SafetyError)
	if !ok {
		t.Fatalf("expected *SafetyError, got %T", err)
	}
	if safeErr.Tier != TierWrite {
		t.Errorf("expected tier WRITE, got %s", safeErr.Tier)
	}
}

func TestCheckWriteAllowedWithFlag(t *testing.T) {
	err := Check(CheckOpts{
		Operation: "commit",
		Tier:      TierWrite,
		WriteFlag: true,
	})
	if err != nil {
		t.Errorf("WRITE tier with --write should pass, got: %v", err)
	}
}

func TestCheckWriteAutoImpliedInteractive(t *testing.T) {
	// Interactive human should auto-imply --write
	err := Check(CheckOpts{
		Operation:   "commit",
		Tier:        TierWrite,
		WriteFlag:   false,
		Interactive: true,
		AgentMode:   false,
	})
	if err != nil {
		t.Errorf("WRITE tier in interactive mode should auto-pass, got: %v", err)
	}
}

func TestCheckWriteNotAutoImpliedAgent(t *testing.T) {
	// Agent mode should NOT auto-imply --write
	err := Check(CheckOpts{
		Operation:   "commit",
		Tier:        TierWrite,
		WriteFlag:   false,
		Interactive: true,
		AgentMode:   true,
	})
	if err == nil {
		t.Error("WRITE tier in agent mode without --write should fail")
	}
}

func TestCheckDangerousBlockedInAgentMode(t *testing.T) {
	err := Check(CheckOpts{
		Operation: "reset_hard",
		Tier:      TierDangerous,
		WriteFlag: true,
		ForceFlag: true,
		AgentMode: true,
	})
	if err == nil {
		t.Error("DANGEROUS tier should be blocked in agent mode")
	}
}

func TestCheckDangerousRequiresBothFlags(t *testing.T) {
	// Only --write, missing --force
	err := Check(CheckOpts{
		Operation: "reset_hard",
		Tier:      TierDangerous,
		WriteFlag: true,
		ForceFlag: false,
	})
	if err == nil {
		t.Error("DANGEROUS tier without --force should fail")
	}

	// Only --force, missing --write
	err = Check(CheckOpts{
		Operation: "reset_hard",
		Tier:      TierDangerous,
		WriteFlag: false,
		ForceFlag: true,
	})
	if err == nil {
		t.Error("DANGEROUS tier without --write should fail")
	}
}

func TestCheckDangerousAllowedWithBothFlags(t *testing.T) {
	err := Check(CheckOpts{
		Operation: "reset_hard",
		Tier:      TierDangerous,
		WriteFlag: true,
		ForceFlag: true,
	})
	if err != nil {
		t.Errorf("DANGEROUS tier with both flags should pass, got: %v", err)
	}
}

func TestCheckProtectedAlwaysBlocked(t *testing.T) {
	err := Check(CheckOpts{
		Operation: "force_push_main",
		Tier:      TierProtected,
		WriteFlag: true,
		ForceFlag: true,
	})
	if err == nil {
		t.Error("PROTECTED tier should always be blocked")
	}
}

func TestSafetyErrorHasSuggestion(t *testing.T) {
	err := Check(CheckOpts{
		Operation: "commit",
		Tier:      TierWrite,
	})
	safeErr, ok := err.(*SafetyError)
	if !ok {
		t.Fatalf("expected *SafetyError, got %T", err)
	}
	if safeErr.Suggestion == "" {
		t.Error("SafetyError should include a suggestion")
	}
	if safeErr.Operation != "commit" {
		t.Errorf("SafetyError.Operation = %q, want %q", safeErr.Operation, "commit")
	}
}
