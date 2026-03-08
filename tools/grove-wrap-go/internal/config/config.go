// Package config loads and provides access to the gw configuration.
//
// Configuration is loaded from ~/.grove/gw.toml. If the file does not exist,
// sensible defaults are used. The config is initialized once via Init() during
// Cobra's PersistentPreRun and accessed globally via Get().
package config

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/BurntSushi/toml"
)

// Config is the top-level gw configuration.
type Config struct {
	Databases    map[string]Database `toml:"databases"`
	KVNamespaces map[string]Namespace `toml:"kv_namespaces"`
	R2Buckets    []Bucket            `toml:"r2_buckets"`
	Safety       SafetyConfig        `toml:"safety"`
	Git          GitConfig           `toml:"git"`
	GitHub       GitHubConfig        `toml:"github"`
	Grove        GroveConfig         `toml:"grove"`
	TUI          TUIConfig           `toml:"tui"`

	// Runtime state (not from TOML)
	AgentMode       bool   `toml:"-"`
	JSONMode        bool   `toml:"-"`
	Verbose         bool   `toml:"-"`
	WriteFlag       bool   `toml:"-"`
	ForceFlag       bool   `toml:"-"`
	GroveRoot       string `toml:"-"`
	NoCloud         bool   `toml:"-"` // skip wrangler/cloud calls (offline mode)
	InteractiveMode bool   `toml:"-"` // enable Bubble Tea TUI (opt-in, humans only)
}

// TUIConfig controls interactive TUI browser behavior.
type TUIConfig struct {
	AutoWorktree bool `toml:"auto_worktree"` // auto-create worktrees when launching skills
	ItemsPerPage int  `toml:"items_per_page"` // number of items to fetch per page
}

// Database represents a D1 database alias.
type Database struct {
	Name          string `toml:"name"`
	ID            string `toml:"id"`
	MigrationsDir string `toml:"migrations_dir"` // path to dir containing wrangler.toml (relative to grove root)
}

// Namespace represents a KV namespace.
type Namespace struct {
	Name string `toml:"name"`
	ID   string `toml:"id"`
}

// Bucket represents an R2 bucket.
type Bucket struct {
	Name string `toml:"name"`
}

// SafetyConfig controls database safety limits.
type SafetyConfig struct {
	MaxDeleteRows   int      `toml:"max_delete_rows"`
	MaxUpdateRows   int      `toml:"max_update_rows"`
	ProtectedTables []string `toml:"protected_tables"`
}

// GitConfig controls git behavior.
type GitConfig struct {
	CommitFormat      string   `toml:"commit_format"`
	ConventionalTypes []string `toml:"conventional_types"`
	ProtectedBranches []string `toml:"protected_branches"`
	AutoLinkIssues    bool     `toml:"auto_link_issues"`
	IssuePattern      string   `toml:"issue_pattern"`
	SkipHooksOnWIP    bool     `toml:"skip_hooks_on_wip"`
}

// GitHubConfig controls GitHub integration.
type GitHubConfig struct {
	Owner                  string            `toml:"owner"`
	Repo                   string            `toml:"repo"`
	DefaultPRLabels        []string          `toml:"default_pr_labels"`
	DefaultIssueLabels     []string          `toml:"default_issue_labels"`
	RateLimitWarnThreshold int               `toml:"rate_limit_warn_threshold"`
	RateLimitBlockThreshold int              `toml:"rate_limit_block_threshold"`
	ProjectNumber          *int              `toml:"project_number"`
	ProjectFields          map[string]string `toml:"project_fields"`
	ProjectValues          map[string]string `toml:"project_values"`
}

// GroveConfig holds Grove platform settings (auth, Lattice, tenant).
type GroveConfig struct {
	Tenant         string `toml:"tenant"`
	DefaultRegion  string `toml:"default_region"`
	AuthBaseURL    string `toml:"auth_base_url"`
	LatticeBaseURL string `toml:"lattice_base_url"`
}

var (
	global *Config
	once   sync.Once
)

// Get returns the global config singleton.
func Get() *Config {
	once.Do(func() {
		global = DefaultConfig()
	})
	return global
}

// Init initializes the config from flags, environment, and the TOML file.
func Init(writeFlag, forceFlag, jsonMode, agentMode, verbose, noCloud, interactiveMode bool) *Config {
	cfg := Get()

	// Load TOML file (merges over defaults)
	loadFromFile(cfg)

	// Apply runtime flags
	cfg.WriteFlag = writeFlag
	cfg.ForceFlag = forceFlag
	cfg.JSONMode = jsonMode
	cfg.Verbose = verbose

	// Agent mode from flag or environment
	cfg.AgentMode = agentMode || isAgentEnv()

	// Cloud and interactive flags (interactive disabled in agent/json mode)
	cfg.NoCloud = noCloud
	cfg.InteractiveMode = interactiveMode && !cfg.AgentMode && !jsonMode

	// Detect grove root
	cfg.GroveRoot = detectGroveRoot()

	// GROVE_TENANT env var overrides config file
	if tenant := os.Getenv("GROVE_TENANT"); tenant != "" {
		cfg.Grove.Tenant = tenant
	}

	// Best-effort migration from ~/.grove/config.json (Mycelium's format)
	if cfg.Grove.Tenant == "" {
		cfg.Grove.Tenant = migrateMyceliumTenant()
	}

	return cfg
}

// DefaultConfig returns the configuration with sensible defaults.
func DefaultConfig() *Config {
	return &Config{
		Databases: map[string]Database{
			"lattice":   {Name: "grove-engine-db", ID: "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68", MigrationsDir: "libs/engine"},
			"groveauth": {Name: "groveauth", ID: "45eae4c7-8ae7-4078-9218-8e1677a4360f"},
			"clearing":  {Name: "daily-clearing-db", ID: "1fb94ac6-53c6-49d6-9388-a6f585f86196"},
			"amber":     {Name: "amber", ID: "f688021b-a986-495a-94bb-352354768a22"},
		},
		KVNamespaces: map[string]Namespace{
			"cache": {Name: "cache", ID: "514e91e81cc44d128a82ec6f668303e4"},
			"flags": {Name: "flags", ID: "65a600876aa14e9cbec8f8acd7d53b5f"},
		},
		R2Buckets: []Bucket{
			{Name: "grove-media"},
		},
		Safety: SafetyConfig{
			MaxDeleteRows: 100,
			MaxUpdateRows: 500,
			ProtectedTables: []string{
				"users", "tenants", "subscriptions", "payments", "sessions",
			},
		},
		Git: GitConfig{
			CommitFormat: "conventional",
			ConventionalTypes: []string{
				"feat", "fix", "docs", "style", "refactor",
				"test", "chore", "perf", "ci", "build", "revert",
			},
			ProtectedBranches: []string{"main", "master", "production", "staging"},
			AutoLinkIssues:    true,
			IssuePattern:      `(?:^|/)(\d+)[-_]`,
			SkipHooksOnWIP:    true,
		},
		GitHub: GitHubConfig{
			Owner:                   "AutumnsGrove",
			Repo:                    "Lattice",
			RateLimitWarnThreshold:  100,
			RateLimitBlockThreshold: 10,
			ProjectFields:           map[string]string{},
			ProjectValues:           map[string]string{},
		},
		Grove: GroveConfig{
			AuthBaseURL:    "https://auth-api.grove.place",
			LatticeBaseURL: "https://grove.place",
		},
		TUI: TUIConfig{
			AutoWorktree: true,
			ItemsPerPage: 30,
		},
	}
}

// ConfigPath returns the path to the gw config file.
func ConfigPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".grove", "gw.toml")
}

// loadFromFile loads configuration from ~/.grove/gw.toml, merging over defaults.
func loadFromFile(cfg *Config) {
	path := ConfigPath()
	if path == "" {
		return
	}

	if _, err := os.Stat(path); os.IsNotExist(err) {
		return
	}

	// Decode TOML over the existing defaults
	if _, err := toml.DecodeFile(path, cfg); err != nil {
		// Config file exists but is malformed — proceed with defaults
		return
	}
}

// Save persists the current configuration to ~/.grove/gw.toml.
// Only TOML-tagged fields are written; runtime state (toml:"-") is excluded.
func (c *Config) Save() error {
	configPath := ConfigPath()
	if configPath == "" {
		return fmt.Errorf("could not determine config path")
	}

	// Ensure directory exists
	dir := filepath.Dir(configPath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	// Re-read the file to preserve fields we don't model,
	// then overlay our in-memory TOML fields
	var diskCfg Config
	if _, err := os.Stat(configPath); err == nil {
		toml.DecodeFile(configPath, &diskCfg) // best-effort
	}

	// Overlay the sections we manage
	diskCfg.TUI = c.TUI
	diskCfg.Safety = c.Safety
	diskCfg.Git = c.Git
	diskCfg.GitHub = c.GitHub
	diskCfg.Grove = c.Grove
	diskCfg.Databases = c.Databases
	diskCfg.KVNamespaces = c.KVNamespaces
	diskCfg.R2Buckets = c.R2Buckets

	var buf bytes.Buffer
	enc := toml.NewEncoder(&buf)
	if err := enc.Encode(diskCfg); err != nil {
		return fmt.Errorf("failed to encode config: %w", err)
	}

	if err := os.WriteFile(configPath, buf.Bytes(), 0o644); err != nil {
		return fmt.Errorf("failed to write config: %w", err)
	}
	return nil
}

// IsInteractive returns true when running in an interactive terminal.
func (c *Config) IsInteractive() bool {
	if c.AgentMode {
		return false
	}
	if os.Getenv("NO_INTERACTIVE") != "" {
		return false
	}
	fi, err := os.Stdin.Stat()
	if err != nil {
		return false
	}
	return (fi.Mode() & os.ModeCharDevice) != 0
}

// IsHumanMode returns true when output should be human-formatted.
func (c *Config) IsHumanMode() bool {
	return !c.AgentMode && !c.JSONMode
}

// EffectiveMaxDeleteRows returns the delete row limit, stricter in agent mode.
func (c *Config) EffectiveMaxDeleteRows() int {
	if c.AgentMode {
		return 50
	}
	return c.Safety.MaxDeleteRows
}

// EffectiveMaxUpdateRows returns the update row limit, stricter in agent mode.
func (c *Config) EffectiveMaxUpdateRows() int {
	if c.AgentMode {
		return 200
	}
	return c.Safety.MaxUpdateRows
}

// isAgentEnv checks environment variables for agent mode indicators.
func isAgentEnv() bool {
	for _, key := range []string{"GW_AGENT_MODE", "CLAUDE_CODE", "MCP_SERVER"} {
		val := os.Getenv(key)
		if val != "" && val != "0" && val != "false" {
			return true
		}
	}
	return false
}

// migrateMyceliumTenant reads tenant from ~/.grove/config.json (Mycelium's format).
// Returns empty string if the file doesn't exist or doesn't contain a tenant.
func migrateMyceliumTenant() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	data, err := os.ReadFile(filepath.Join(home, ".grove", "config.json"))
	if err != nil {
		return ""
	}
	var legacy struct {
		Tenant string `json:"tenant"`
	}
	if json.Unmarshal(data, &legacy) != nil {
		return ""
	}
	return legacy.Tenant
}

// detectGroveRoot walks up from cwd looking for monorepo markers.
// Falls back to GROVE_ROOT env var, then common project paths.
func detectGroveRoot() string {
	// Check env var first — explicit always wins
	if envRoot := os.Getenv("GROVE_ROOT"); envRoot != "" {
		if _, err := os.Stat(envRoot); err == nil {
			return envRoot
		}
	}

	cwd, err := os.Getwd()
	if err != nil {
		return "."
	}

	// Walk up from cwd looking for monorepo markers
	dir := cwd
	for {
		if _, err := os.Stat(filepath.Join(dir, "pnpm-workspace.yaml")); err == nil {
			return dir
		}
		if _, err := os.Stat(filepath.Join(dir, ".git")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	// Last resort: check common project paths
	home, err := os.UserHomeDir()
	if err == nil {
		candidates := []string{
			filepath.Join(home, "Documents", "Projects", "Lattice"),
			filepath.Join(home, "Projects", "Lattice"),
			filepath.Join(home, "Lattice"),
		}
		for _, c := range candidates {
			if _, err := os.Stat(filepath.Join(c, "pnpm-workspace.yaml")); err == nil {
				return c
			}
		}
	}

	return cwd
}
