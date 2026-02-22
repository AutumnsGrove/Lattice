package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/BurntSushi/toml"
	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// wranglerConfig represents the relevant parts of a wrangler.toml file.
type wranglerConfig struct {
	Name          string                   `toml:"name"`
	D1Databases   []map[string]interface{} `toml:"d1_databases"`
	KVNamespaces  []map[string]interface{} `toml:"kv_namespaces"`
	R2Buckets     []map[string]interface{} `toml:"r2_buckets"`
	DurableObjects *struct {
		Bindings []map[string]interface{} `toml:"bindings"`
	} `toml:"durable_objects"`
	Services []map[string]interface{} `toml:"services"`
	AI       *struct {
		Binding string `toml:"binding"`
	} `toml:"ai"`
}

// bindingEntry holds a normalized binding record for display.
type bindingEntry struct {
	Worker  string `json:"worker"`
	Name    string `json:"name"`
	Type    string `json:"type"`
	ID      string `json:"id,omitempty"`
	Details string `json:"details,omitempty"`
	File    string `json:"file,omitempty"`
}

// bindingsCmd scans wrangler config files and lists all bindings.
var bindingsCmd = &cobra.Command{
	Use:   "bindings",
	Short: "Scan wrangler configs and list all bindings",
	Long:  "Walks the monorepo for wrangler.toml and wrangler.jsonc files and lists all service bindings.",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		filterType, _ := cmd.Flags().GetString("type")

		root := cfg.GroveRoot
		if root == "" {
			root = "."
		}

		var entries []bindingEntry

		err := filepath.WalkDir(root, func(path string, d os.DirEntry, walkErr error) error {
			if walkErr != nil {
				return nil
			}

			// Skip node_modules and hidden directories
			if d.IsDir() {
				base := d.Name()
				if base == "node_modules" || base == ".git" || (len(base) > 0 && base[0] == '.') {
					return filepath.SkipDir
				}
				return nil
			}

			name := d.Name()
			if name != "wrangler.toml" && name != "wrangler.jsonc" {
				return nil
			}

			// Only parse TOML files (skip jsonc — cannot parse with BurntSushi/toml)
			if name == "wrangler.jsonc" {
				// Add a placeholder so users know we found it
				entries = append(entries, bindingEntry{
					Worker:  "(jsonc — not parsed)",
					Name:    "",
					Type:    "unknown",
					File:    path,
					Details: "wrangler.jsonc files require manual review",
				})
				return nil
			}

			fileEntries, err := parseWranglerTOML(path)
			if err != nil {
				// Don't fail the walk for parse errors
				return nil
			}
			entries = append(entries, fileEntries...)
			return nil
		})
		if err != nil {
			return fmt.Errorf("failed to scan monorepo: %w", err)
		}

		// Apply type filter
		if filterType != "" {
			var filtered []bindingEntry
			for _, e := range entries {
				if strings.EqualFold(e.Type, filterType) {
					filtered = append(filtered, e)
				}
			}
			entries = filtered
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"bindings": entries,
				"count":    len(entries),
			})
			fmt.Println(string(data))
			return nil
		}

		if len(entries) == 0 {
			ui.Muted("No bindings found")
			return nil
		}

		title := fmt.Sprintf("Wrangler Bindings (%d)", len(entries))
		if filterType != "" {
			title = fmt.Sprintf("Wrangler Bindings — type: %s (%d)", filterType, len(entries))
		}
		ui.PrintHeader(title)

		// Group by worker name for readability
		lastWorker := ""
		for _, e := range entries {
			if e.Worker != lastWorker {
				fmt.Printf("\n  [%s]\n", e.Worker)
				if e.File != "" {
					// Print relative path from root
					rel, err := filepath.Rel(root, e.File)
					if err != nil {
						rel = e.File
					}
					ui.Muted(fmt.Sprintf("    %s", rel))
				}
				lastWorker = e.Worker
			}

			idStr := e.ID
			if idStr == "" && e.Details != "" {
				idStr = e.Details
			}

			ui.PrintKeyValue(
				fmt.Sprintf("    %-24s", e.Name),
				fmt.Sprintf("%-16s  %s", e.Type, idStr),
			)
		}
		fmt.Println()

		return nil
	},
}

// parseWranglerTOML extracts binding entries from a wrangler.toml file.
func parseWranglerTOML(path string) ([]bindingEntry, error) {
	var wcfg wranglerConfig
	if _, err := toml.DecodeFile(path, &wcfg); err != nil {
		return nil, err
	}

	workerName := wcfg.Name
	if workerName == "" {
		workerName = filepath.Base(filepath.Dir(path))
	}

	var entries []bindingEntry

	// D1 databases
	for _, db := range wcfg.D1Databases {
		e := bindingEntry{
			Worker: workerName,
			Type:   "d1_database",
			File:   path,
		}
		if v, ok := db["binding"].(string); ok {
			e.Name = v
		}
		if v, ok := db["database_id"].(string); ok {
			e.ID = v
		} else if v, ok := db["database_name"].(string); ok {
			e.Details = v
		}
		entries = append(entries, e)
	}

	// KV namespaces
	for _, ns := range wcfg.KVNamespaces {
		e := bindingEntry{
			Worker: workerName,
			Type:   "kv_namespace",
			File:   path,
		}
		if v, ok := ns["binding"].(string); ok {
			e.Name = v
		}
		if v, ok := ns["id"].(string); ok {
			e.ID = v
		} else if v, ok := ns["preview_id"].(string); ok {
			e.Details = "preview:" + v
		}
		entries = append(entries, e)
	}

	// R2 buckets
	for _, b := range wcfg.R2Buckets {
		e := bindingEntry{
			Worker: workerName,
			Type:   "r2_bucket",
			File:   path,
		}
		if v, ok := b["binding"].(string); ok {
			e.Name = v
		}
		if v, ok := b["bucket_name"].(string); ok {
			e.ID = v
		}
		entries = append(entries, e)
	}

	// Durable objects
	if wcfg.DurableObjects != nil {
		for _, do := range wcfg.DurableObjects.Bindings {
			e := bindingEntry{
				Worker: workerName,
				Type:   "durable_object",
				File:   path,
			}
			if v, ok := do["name"].(string); ok {
				e.Name = v
			}
			if v, ok := do["class_name"].(string); ok {
				e.Details = v
				if svc, ok := do["script_name"].(string); ok {
					e.Details = v + "@" + svc
				}
			}
			entries = append(entries, e)
		}
	}

	// Services
	for _, svc := range wcfg.Services {
		e := bindingEntry{
			Worker: workerName,
			Type:   "service",
			File:   path,
		}
		if v, ok := svc["binding"].(string); ok {
			e.Name = v
		}
		if v, ok := svc["service"].(string); ok {
			e.Details = v
		}
		entries = append(entries, e)
	}

	// AI binding
	if wcfg.AI != nil && wcfg.AI.Binding != "" {
		entries = append(entries, bindingEntry{
			Worker: workerName,
			Name:   wcfg.AI.Binding,
			Type:   "ai",
			File:   path,
		})
	}

	return entries, nil
}

func init() {
	rootCmd.AddCommand(bindingsCmd)

	bindingsCmd.Flags().String("type", "", "Filter by binding type (d1_database, kv_namespace, r2_bucket, durable_object, service, ai)")
}
