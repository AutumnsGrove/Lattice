// Package config loads and provides access to the gw configuration.
//
// Configuration is loaded from ~/.grove/gw.toml. If the file does not exist,
// sensible defaults are used. The config is initialized once via Init() during
// Cobra's PersistentPreRun and accessed globally via Get().
package config

import (
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

	// Runtime state (not from TOML)
	AgentMode bool   `toml:"-"`
	JSONMode  bool   `toml:"-"`
	Verbose   bool   `toml:"-"`
	WriteFlag bool   `toml:"-"`
	ForceFlag bool   `toml:"-"`
	GroveRoot string `toml:"-"`
}

// Database represents a D1 database alias.
type Database struct {
	Name string `toml:"name"`
	ID   string `toml:"id"`
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
func Init(writeFlag, forceFlag, jsonMode, agentMode, verbose bool) *Config {
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

	// Detect grove root
	cfg.GroveRoot = detectGroveRoot()

	return cfg
}

// DefaultConfig returns the configuration with sensible defaults.
func DefaultConfig() *Config {
	return &Config{
		Databases: map[string]Database{},
		KVNamespaces: map[string]Namespace{},
		R2Buckets: []Bucket{},
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

// detectGroveRoot walks up from cwd looking for monorepo markers.
func detectGroveRoot() string {
	cwd, err := os.Getwd()
	if err != nil {
		return "."
	}

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
	return cwd
}
