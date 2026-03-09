package config

import (
	"os"
	"path/filepath"
	"sync"
)

// Config holds the global configuration for grove-find.
type Config struct {
	GroveRoot       string
	AgentMode       bool
	JSONMode        bool
	Verbose         bool
	IncludeArchived bool // when true, _archived/ dirs are included in results
	NoPager         bool // when true, skip Bubble Tea paginator
	PageThreshold   int  // min lines before paginator activates (default 50)
}

var (
	global *Config
	once   sync.Once
)

// Get returns the global config singleton.
func Get() *Config {
	once.Do(func() {
		global = &Config{}
	})
	return global
}

// Init initializes the config with CLI flags and environment variables.
func Init(root string, agent, jsonMode, verbose, noPager bool, pageThreshold int) *Config {
	cfg := Get()
	cfg.AgentMode = agent || os.Getenv("GF_AGENT") == "1"
	cfg.JSONMode = jsonMode
	cfg.Verbose = verbose
	cfg.NoPager = noPager
	if pageThreshold > 0 {
		cfg.PageThreshold = pageThreshold
	} else {
		cfg.PageThreshold = 50
	}

	if root != "" {
		cfg.GroveRoot = root
	} else if envRoot := os.Getenv("GROVE_ROOT"); envRoot != "" {
		cfg.GroveRoot = envRoot
	} else {
		cfg.GroveRoot = detectGroveRoot()
	}

	return cfg
}

// IsHumanMode returns true when output should be human-formatted (colors, rich output).
func (c *Config) IsHumanMode() bool {
	return !c.AgentMode && !c.JSONMode
}

// detectGroveRoot walks up from cwd looking for package.json with workspaces or pnpm-workspace.yaml.
func detectGroveRoot() string {
	cwd, err := os.Getwd()
	if err != nil {
		return "."
	}

	dir := cwd
	for {
		// Check for pnpm-workspace.yaml (monorepo root marker)
		if _, err := os.Stat(filepath.Join(dir, "pnpm-workspace.yaml")); err == nil {
			return dir
		}
		// Check for .git directory as fallback
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
