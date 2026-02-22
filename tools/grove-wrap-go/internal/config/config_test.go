package config

import "testing"

func TestDefaultConfig(t *testing.T) {
	cfg := DefaultConfig()

	if cfg.Safety.MaxDeleteRows != 100 {
		t.Errorf("default MaxDeleteRows = %d, want 100", cfg.Safety.MaxDeleteRows)
	}
	if cfg.Safety.MaxUpdateRows != 500 {
		t.Errorf("default MaxUpdateRows = %d, want 500", cfg.Safety.MaxUpdateRows)
	}
	if len(cfg.Safety.ProtectedTables) != 5 {
		t.Errorf("default ProtectedTables has %d entries, want 5", len(cfg.Safety.ProtectedTables))
	}
	if cfg.Git.CommitFormat != "conventional" {
		t.Errorf("default CommitFormat = %q, want %q", cfg.Git.CommitFormat, "conventional")
	}
	if len(cfg.Git.ProtectedBranches) != 4 {
		t.Errorf("default ProtectedBranches has %d entries, want 4", len(cfg.Git.ProtectedBranches))
	}
	if cfg.GitHub.Owner != "AutumnsGrove" {
		t.Errorf("default Owner = %q, want %q", cfg.GitHub.Owner, "AutumnsGrove")
	}
	if cfg.GitHub.Repo != "Lattice" {
		t.Errorf("default Repo = %q, want %q", cfg.GitHub.Repo, "Lattice")
	}
}

func TestEffectiveRowLimitsNormalMode(t *testing.T) {
	cfg := DefaultConfig()
	cfg.AgentMode = false

	if got := cfg.EffectiveMaxDeleteRows(); got != 100 {
		t.Errorf("EffectiveMaxDeleteRows() = %d, want 100", got)
	}
	if got := cfg.EffectiveMaxUpdateRows(); got != 500 {
		t.Errorf("EffectiveMaxUpdateRows() = %d, want 500", got)
	}
}

func TestEffectiveRowLimitsAgentMode(t *testing.T) {
	cfg := DefaultConfig()
	cfg.AgentMode = true

	if got := cfg.EffectiveMaxDeleteRows(); got != 50 {
		t.Errorf("EffectiveMaxDeleteRows() in agent mode = %d, want 50", got)
	}
	if got := cfg.EffectiveMaxUpdateRows(); got != 200 {
		t.Errorf("EffectiveMaxUpdateRows() in agent mode = %d, want 200", got)
	}
}

func TestIsHumanMode(t *testing.T) {
	cfg := DefaultConfig()

	cfg.AgentMode = false
	cfg.JSONMode = false
	if !cfg.IsHumanMode() {
		t.Error("should be human mode when neither agent nor JSON")
	}

	cfg.AgentMode = true
	if cfg.IsHumanMode() {
		t.Error("should not be human mode in agent mode")
	}

	cfg.AgentMode = false
	cfg.JSONMode = true
	if cfg.IsHumanMode() {
		t.Error("should not be human mode in JSON mode")
	}
}

func TestConfigPath(t *testing.T) {
	path := ConfigPath()
	if path == "" {
		t.Skip("could not determine home directory")
	}
	// Should end with .grove/gw.toml
	if len(path) < 15 {
		t.Errorf("ConfigPath() = %q, too short", path)
	}
}
