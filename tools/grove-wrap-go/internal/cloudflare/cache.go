// Package cloudflare provides cached access to Cloudflare/Wrangler auth state.
// Wrangler subprocesses cost ~4 seconds each. The cache avoids that cost for
// repeated calls within a short window.
package cloudflare

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"

	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
)

// authCacheTTL is how long wrangler auth results are cached.
const authCacheTTL = 60 * time.Second

// authCache is the on-disk cache entry.
type authCache struct {
	Output   string    `json:"output"`
	CachedAt time.Time `json:"cached_at"`
}

// cachePath returns the path to the wrangler auth cache file.
func cachePath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".grove", "wrangler-cache.json")
}

// GetCachedAuth returns fresh cached wrangler whoami output, or "" if stale or missing.
func GetCachedAuth() string {
	path := cachePath()
	if path == "" {
		return ""
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	var cache authCache
	if err := json.Unmarshal(data, &cache); err != nil {
		return ""
	}
	if time.Since(cache.CachedAt) > authCacheTTL {
		return ""
	}
	return cache.Output
}

// SetCachedAuth persists the wrangler whoami output to disk.
func SetCachedAuth(output string) {
	path := cachePath()
	if path == "" {
		return
	}
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return
	}
	cache := authCache{
		Output:   output,
		CachedAt: time.Now(),
	}
	data, err := json.Marshal(cache)
	if err != nil {
		return
	}
	_ = os.WriteFile(path, data, 0600)
}

// WranglerAuth returns the wrangler whoami output, using the cache when fresh.
func WranglerAuth() (string, error) {
	if cached := GetCachedAuth(); cached != "" {
		return cached, nil
	}
	output, err := gwexec.WranglerOutput("whoami")
	if err != nil {
		return "", err
	}
	SetCachedAuth(output)
	return output, nil
}
