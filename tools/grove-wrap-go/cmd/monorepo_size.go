package cmd

import (
	"fmt"
	"io/fs"
	"path/filepath"
	"sort"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// skipDirs is the set of directory names to skip during traversal.
var skipDirs = map[string]bool{
	"node_modules": true,
	".git":         true,
	"dist":         true,
	".next":        true,
	".svelte-kit":  true,
}

// formatBytes converts a byte count to a human-readable string.
func formatBytes(b int64) string {
	const (
		kb = 1024
		mb = 1024 * kb
		gb = 1024 * mb
	)
	switch {
	case b >= gb:
		return fmt.Sprintf("%.2f GB", float64(b)/float64(gb))
	case b >= mb:
		return fmt.Sprintf("%.2f MB", float64(b)/float64(mb))
	case b >= kb:
		return fmt.Sprintf("%.2f KB", float64(b)/float64(kb))
	default:
		return fmt.Sprintf("%d B", b)
	}
}

type dirStats struct {
	Name  string `json:"name"`
	Files int64  `json:"files"`
	Dirs  int64  `json:"dirs"`
	Bytes int64  `json:"bytes"`
	Size  string `json:"size"`
}

var monorepoSizeCmd = &cobra.Command{
	Use:   "monorepo-size",
	Short: "Filesystem stats for the monorepo",
	Long:  "Walk the grove root and report file counts, directory counts, and total size broken down by top-level directory.",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		root := cfg.GroveRoot

		var totalFiles, totalDirs int64
		var totalBytes int64

		// Map of top-level dir name → stats
		topLevel := map[string]*dirStats{}

		err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				// Skip unreadable entries without aborting
				return nil
			}

			// Determine if we should skip this directory
			if d.IsDir() && skipDirs[d.Name()] {
				return filepath.SkipDir
			}

			// Determine the top-level segment (relative to root)
			rel, relErr := filepath.Rel(root, path)
			if relErr != nil {
				return nil
			}

			// The root itself
			if rel == "." {
				return nil
			}

			// Top-level segment is the first path component
			parts := strings.SplitN(rel, string(filepath.Separator), 2)
			topName := parts[0]

			// Initialize bucket for this top-level dir
			if _, ok := topLevel[topName]; !ok {
				topLevel[topName] = &dirStats{Name: topName}
			}
			bucket := topLevel[topName]

			if d.IsDir() {
				totalDirs++
				bucket.Dirs++
			} else {
				info, infoErr := d.Info()
				if infoErr == nil {
					size := info.Size()
					totalFiles++
					totalBytes += size
					bucket.Files++
					bucket.Bytes += size
				}
			}

			return nil
		})

		if err != nil {
			return fmt.Errorf("walk error: %w", err)
		}

		// Build sorted slice of top-level stats
		topList := make([]dirStats, 0, len(topLevel))
		for _, s := range topLevel {
			s.Size = formatBytes(s.Bytes)
			topList = append(topList, *s)
		}
		sort.Slice(topList, func(i, j int) bool {
			return topList[i].Bytes > topList[j].Bytes
		})

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"root":        root,
				"total_files": totalFiles,
				"total_dirs":  totalDirs,
				"total_bytes": totalBytes,
				"total_size":  formatBytes(totalBytes),
				"breakdown":   topList,
			})
		}

		fmt.Println(ui.TitleStyle.Render("gw monorepo-size"))
		fmt.Println()

		ui.PrintKeyValue("Root:   ", root)
		ui.PrintKeyValue("Files:  ", fmt.Sprintf("%d", totalFiles))
		ui.PrintKeyValue("Dirs:   ", fmt.Sprintf("%d", totalDirs))
		ui.PrintKeyValue("Total:  ", formatBytes(totalBytes))
		fmt.Println()

		fmt.Println(ui.SubtitleStyle.Render("  Breakdown by top-level directory"))
		fmt.Println()

		for _, s := range topList {
			line := fmt.Sprintf("%-20s  %6d files  %s", s.Name, s.Files, s.Size)
			fmt.Printf("    %s\n", line)
		}

		fmt.Println()
		ui.Muted("(node_modules, .git, dist, .next, .svelte-kit skipped)")
		fmt.Println()

		return nil
	},
}

func init() {
	rootCmd.AddCommand(monorepoSizeCmd)
}
