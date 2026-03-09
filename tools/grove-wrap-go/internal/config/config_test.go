package config

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/BurntSushi/toml"
)

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

func TestTUIConfigDefaults(t *testing.T) {
	cfg := DefaultConfig()

	if !cfg.TUI.AutoWorktree {
		t.Error("default AutoWorktree should be true")
	}
	if cfg.TUI.ItemsPerPage != 30 {
		t.Errorf("default ItemsPerPage = %d, want 30", cfg.TUI.ItemsPerPage)
	}
}

func TestTUIConfigTOMLRoundTrip(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "gw.toml")

	// Write a config with TUI settings
	cfg := DefaultConfig()
	cfg.TUI.AutoWorktree = false
	cfg.TUI.ItemsPerPage = 50

	f, err := os.Create(configPath)
	if err != nil {
		t.Fatalf("create config: %v", err)
	}
	enc := toml.NewEncoder(f)
	if err := enc.Encode(cfg); err != nil {
		f.Close()
		t.Fatalf("encode config: %v", err)
	}
	f.Close()

	// Read it back into a fresh config with defaults
	loaded := DefaultConfig()
	if _, err := toml.DecodeFile(configPath, loaded); err != nil {
		t.Fatalf("decode config: %v", err)
	}

	if loaded.TUI.AutoWorktree != false {
		t.Error("loaded AutoWorktree should be false")
	}
	if loaded.TUI.ItemsPerPage != 50 {
		t.Errorf("loaded ItemsPerPage = %d, want 50", loaded.TUI.ItemsPerPage)
	}
}

func TestTUIConfigPreservesDefaultsWhenAbsent(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "gw.toml")

	// Write a TOML file with no [tui] section
	content := `[grove]
tenant = "test-tenant"
`
	if err := os.WriteFile(configPath, []byte(content), 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	// Load into defaults — TUI section should survive
	cfg := DefaultConfig()
	if _, err := toml.DecodeFile(configPath, cfg); err != nil {
		t.Fatalf("decode config: %v", err)
	}

	if !cfg.TUI.AutoWorktree {
		t.Error("AutoWorktree should remain true when [tui] section is absent")
	}
	if cfg.TUI.ItemsPerPage != 30 {
		t.Errorf("ItemsPerPage should remain 30 when [tui] section is absent, got %d", cfg.TUI.ItemsPerPage)
	}
	if cfg.Grove.Tenant != "test-tenant" {
		t.Errorf("Tenant should be 'test-tenant', got %q", cfg.Grove.Tenant)
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
