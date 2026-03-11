package config

import (
	"os"
	"path/filepath"
	"strconv"
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

	// LLM config for gf ask
	LLMEndpoint string // env: GF_LLM_ENDPOINT, default: http://localhost:1234/v1
	LLMModel    string // env: GF_LLM_MODEL,    default: liquid/lfm2.5-1.2b
	EmbedModel  string // env: GF_EMBED_MODEL,  default: text-embedding-jina-code-embeddings-0.5b
	LLMTimeout  int    // env: GF_LLM_TIMEOUT,  default: 30 (seconds per request)
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

	// LLM config (for gf ask)
	cfg.LLMEndpoint = envOrDefault("GF_LLM_ENDPOINT", "http://localhost:1234/v1")
	cfg.LLMModel = envOrDefault("GF_LLM_MODEL", "liquid/lfm2.5-1.2b")
	cfg.EmbedModel = envOrDefault("GF_EMBED_MODEL", "text-embedding-jina-code-embeddings-0.5b")
	cfg.LLMTimeout = envIntOrDefault("GF_LLM_TIMEOUT", 30)

	return cfg
}

// SetLLMEndpoint overrides the LLM endpoint (called from persistent flags).
func (c *Config) SetLLMEndpoint(endpoint string) {
	if endpoint != "" {
		c.LLMEndpoint = endpoint
	}
}

// SetLLMModel overrides the LLM model (called from persistent flags).
func (c *Config) SetLLMModel(model string) {
	if model != "" {
		c.LLMModel = model
	}
}

// SetEmbedModel overrides the embedding model (called from persistent flags).
func (c *Config) SetEmbedModel(model string) {
	if model != "" {
		c.EmbedModel = model
	}
}

func envOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func envIntOrDefault(key string, defaultVal int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return defaultVal
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
