package cmd

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// maxR2Limit is the maximum limit for R2 object listings.
const maxR2Limit = 10000

// clampR2Limit clamps an R2 list limit to [1, maxR2Limit].
func clampR2Limit(limit int) int {
	if limit < 1 {
		return 1
	}
	if limit > maxR2Limit {
		return maxR2Limit
	}
	return limit
}

// formatSize formats a byte count for human display.
func formatSize(bytes float64) string {
	switch {
	case bytes >= 1024*1024*1024:
		return fmt.Sprintf("%.1f GB", bytes/(1024*1024*1024))
	case bytes >= 1024*1024:
		return fmt.Sprintf("%.1f MB", bytes/(1024*1024))
	case bytes >= 1024:
		return fmt.Sprintf("%.1f KB", bytes/1024)
	default:
		return fmt.Sprintf("%.0f B", bytes)
	}
}

// r2Cmd is the parent command for R2 object storage operations.
var r2Cmd = &cobra.Command{
	Use:   "r2",
	Short: "R2 object storage with safety guards",
	Long:  "R2 object storage operations wrapped with Grove's safety-tiered interface.",
}

// --- r2 list ---

var r2ListCmd = &cobra.Command{
	Use:   "list",
	Short: "List R2 buckets",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		output, err := exec.WranglerOutput("r2", "bucket", "list", "--json")
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		if cfg.JSONMode {
			var remote json.RawMessage
			if err := json.Unmarshal([]byte(output), &remote); err != nil {
				remote = json.RawMessage("[]")
			}
			var configuredNames []string
			for _, b := range cfg.R2Buckets {
				configuredNames = append(configuredNames, b.Name)
			}
			result := map[string]interface{}{
				"configured": configuredNames,
				"remote":     remote,
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		// Show configured buckets
		if len(cfg.R2Buckets) > 0 {
			ui.PrintHeader("Configured Buckets")
			for _, b := range cfg.R2Buckets {
				ui.PrintKeyValue("  ", b.Name)
			}
			fmt.Println()
		}

		// Show remote buckets
		var buckets []map[string]interface{}
		if err := json.Unmarshal([]byte(output), &buckets); err == nil && len(buckets) > 0 {
			ui.PrintHeader("Remote R2 Buckets")
			for _, b := range buckets {
				name := fmt.Sprintf("%v", b["name"])
				created := ""
				if c, ok := b["creation_date"].(string); ok && len(c) >= 10 {
					created = c[:10]
				}
				ui.PrintKeyValue(fmt.Sprintf("  %-24s", name), created)
			}
		}

		return nil
	},
}

// --- r2 create ---

var r2CreateCmd = &cobra.Command{
	Use:   "create <bucket>",
	Short: "Create an R2 bucket",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("r2_create"); err != nil {
			return err
		}

		cfg := config.Get()
		bucket := args[0]

		result, err := exec.Wrangler("r2", "bucket", "create", bucket)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("wrangler error: %s", result.Stderr)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"bucket": bucket, "created": true,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Created bucket: %s", bucket))
		}
		return nil
	},
}

// --- r2 ls ---

var r2LsCmd = &cobra.Command{
	Use:   "ls <bucket>",
	Short: "List objects in a bucket",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		bucket := args[0]
		prefix, _ := cmd.Flags().GetString("prefix")
		limit, _ := cmd.Flags().GetInt("limit")
		limit = clampR2Limit(limit)

		wranglerArgs := []string{"r2", "object", "list", bucket}
		if prefix != "" {
			wranglerArgs = append(wranglerArgs, "--prefix", prefix)
		}

		output, err := exec.WranglerOutput(wranglerArgs...)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}

		// Parse response — could be {"objects": [...]} or raw array
		var objects []map[string]interface{}
		var wrapper map[string]interface{}
		if json.Unmarshal([]byte(output), &wrapper) == nil {
			if objs, ok := wrapper["objects"].([]interface{}); ok {
				objects = interfaceToMaps(objs)
			}
		} else {
			json.Unmarshal([]byte(output), &objects)
		}

		// Apply limit
		if len(objects) > limit {
			objects = objects[:limit]
		}

		if cfg.JSONMode {
			result := map[string]interface{}{
				"bucket":  bucket,
				"objects": objects,
			}
			data, _ := json.Marshal(result)
			fmt.Println(string(data))
			return nil
		}

		if len(objects) == 0 {
			ui.Muted("No objects found")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Objects in %s (%d)", bucket, len(objects)))
		for _, obj := range objects {
			key := fmt.Sprintf("%v", obj["key"])
			size := 0.0
			if s, ok := obj["size"].(float64); ok {
				size = s
			}
			modified := ""
			if m, ok := obj["last_modified"].(string); ok && len(m) >= 10 {
				modified = m[:10]
			} else if m, ok := obj["uploaded"].(string); ok && len(m) >= 10 {
				modified = m[:10]
			}
			ui.PrintKeyValue(
				fmt.Sprintf("  %-40s", key),
				fmt.Sprintf("%8s  %s", formatSize(size), modified),
			)
		}

		return nil
	},
}

// --- r2 get ---

var r2GetCmd = &cobra.Command{
	Use:   "get <bucket> <key>",
	Short: "Download an object",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		bucket := args[0]
		key := args[1]
		outputPath, _ := cmd.Flags().GetString("output")

		if outputPath == "" {
			outputPath = filepath.Base(key)
		}

		result, err := exec.Wrangler("r2", "object", "get", bucket, key, "--file", outputPath)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("wrangler error: %s", result.Stderr)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"bucket": bucket, "key": key, "downloaded": outputPath,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Downloaded: %s/%s → %s", bucket, key, outputPath))
		}
		return nil
	},
}

// --- r2 put ---

var r2PutCmd = &cobra.Command{
	Use:   "put <bucket> <file>",
	Short: "Upload an object",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("r2_put"); err != nil {
			return err
		}

		cfg := config.Get()
		bucket := args[0]
		filePath := args[1]
		key, _ := cmd.Flags().GetString("key")
		contentType, _ := cmd.Flags().GetString("content-type")

		if key == "" {
			key = filepath.Base(filePath)
		}

		wranglerArgs := []string{"r2", "object", "put", bucket, key, "--file", filePath}
		if contentType != "" {
			wranglerArgs = append(wranglerArgs, "--content-type", contentType)
		}

		result, err := exec.Wrangler(wranglerArgs...)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("wrangler error: %s", result.Stderr)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"bucket": bucket, "key": key, "uploaded": true,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Uploaded: %s → %s/%s", filePath, bucket, key))
		}
		return nil
	},
}

// --- r2 rm ---

var r2RmCmd = &cobra.Command{
	Use:   "rm <bucket> <key>",
	Short: "Delete an object",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("r2_rm"); err != nil {
			return err
		}

		cfg := config.Get()
		bucket := args[0]
		key := args[1]

		result, err := exec.Wrangler("r2", "object", "delete", bucket, key)
		if err != nil {
			return fmt.Errorf("wrangler error: %w", err)
		}
		if !result.OK() {
			// Ignore "key not found" type messages
			if !strings.Contains(result.Stderr, "not found") {
				return fmt.Errorf("wrangler error: %s", result.Stderr)
			}
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"bucket": bucket, "key": key, "deleted": true,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Deleted: %s/%s", bucket, key))
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(r2Cmd)

	// r2 list
	r2Cmd.AddCommand(r2ListCmd)

	// r2 create
	r2Cmd.AddCommand(r2CreateCmd)

	// r2 ls
	r2LsCmd.Flags().StringP("prefix", "p", "", "Filter by prefix")
	r2LsCmd.Flags().IntP("limit", "n", 100, "Maximum objects to return")
	r2Cmd.AddCommand(r2LsCmd)

	// r2 get
	r2GetCmd.Flags().StringP("output", "o", "", "Output file path (default: key basename)")
	r2Cmd.AddCommand(r2GetCmd)

	// r2 put
	r2PutCmd.Flags().StringP("key", "k", "", "Object key (default: file basename)")
	r2PutCmd.Flags().StringP("content-type", "t", "", "Content-Type header")
	r2Cmd.AddCommand(r2PutCmd)

	// r2 rm
	r2Cmd.AddCommand(r2RmCmd)
}
