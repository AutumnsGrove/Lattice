package cmd

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/historydb"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// historyCmd is the parent command for gw history.
var historyCmd = &cobra.Command{
	Use:   "history",
	Short: "Browse and replay past gw commands",
	Long:  "Browse, search, and replay commands previously run through gw.",
}

// --- history list ---

var historyListCmd = &cobra.Command{
	Use:   "list",
	Short: "Show recent commands",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		limit, _ := cmd.Flags().GetInt("limit")

		db, err := historydb.Open()
		if err != nil {
			return fmt.Errorf("cannot open history: %w", err)
		}

		entries := db.List(limit)

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"entries": entries,
				"count":   len(entries),
			})
		}

		if len(entries) == 0 {
			ui.Muted("No history recorded yet.")
			return nil
		}

		headers := []string{"", "#", "Command", "Args", "Time", "Duration"}
		var rows [][]string
		for _, e := range entries {
			icon := "✓"
			if e.ExitCode != 0 {
				icon = "✗"
			}
			writeTag := ""
			if e.IsWrite {
				writeTag = " W"
			}
			ts := e.Timestamp
			if len(ts) > 16 {
				ts = ts[:16]
			}
			rows = append(rows, []string{
				icon + writeTag,
				fmt.Sprintf("%d", e.ID),
				e.Command,
				TruncateStr(e.Args, 30),
				ts,
				fmt.Sprintf("%dms", e.DurationMS),
			})
		}
		fmt.Print(ui.RenderTable(fmt.Sprintf("Command History (%d entries)", len(entries)), headers, rows))
		return nil
	},
}

// --- history search ---

var historySearchCmd = &cobra.Command{
	Use:   "search <query>",
	Short: "Search command history",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		query := args[0]

		db, err := historydb.Open()
		if err != nil {
			return fmt.Errorf("cannot open history: %w", err)
		}

		entries := db.Search(query)

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"query":   query,
				"entries": entries,
				"count":   len(entries),
			})
		}

		if len(entries) == 0 {
			ui.Muted(fmt.Sprintf("No history entries matching %q.", query))
			return nil
		}

		headers := []string{"", "#", "Command", "Args", "Time"}
		var rows [][]string
		for _, e := range entries {
			icon := "✓"
			if e.ExitCode != 0 {
				icon = "✗"
			}
			ts := e.Timestamp
			if len(ts) > 16 {
				ts = ts[:16]
			}
			rows = append(rows, []string{
				icon,
				fmt.Sprintf("%d", e.ID),
				e.Command,
				TruncateStr(e.Args, 30),
				ts,
			})
		}
		fmt.Print(ui.RenderTable(fmt.Sprintf("History Search: %q (%d results)", query, len(entries)), headers, rows))
		return nil
	},
}

// --- history show ---

var historyShowCmd = &cobra.Command{
	Use:   "show <id>",
	Short: "Show details of a specific command",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		var id int
		if _, err := fmt.Sscanf(args[0], "%d", &id); err != nil || id <= 0 {
			return fmt.Errorf("invalid id %q — must be a positive integer", args[0])
		}

		db, err := historydb.Open()
		if err != nil {
			return fmt.Errorf("cannot open history: %w", err)
		}

		entry, ok := db.GetByID(id)
		if !ok {
			if cfg.JSONMode {
				return printJSON(map[string]any{"id": id, "found": false})
			}
			ui.Warning(fmt.Sprintf("No history entry with id %d.", id))
			return nil
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"id":          entry.ID,
				"command":     entry.Command,
				"args":        entry.Args,
				"is_write":    entry.IsWrite,
				"exit_code":   entry.ExitCode,
				"duration_ms": entry.DurationMS,
				"timestamp":   entry.Timestamp,
				"found":       true,
			})
		}

		exitStatus := "0 (success)"
		if entry.ExitCode != 0 {
			exitStatus = fmt.Sprintf("%d (failed)", entry.ExitCode)
		}
		writeStr := "no"
		if entry.IsWrite {
			writeStr = "yes"
		}

		pairs := [][2]string{
			{"Command", entry.Command},
		}
		if entry.Args != "" {
			pairs = append(pairs, [2]string{"Args", entry.Args})
		}
		pairs = append(pairs,
			[2]string{"Timestamp", entry.Timestamp},
			[2]string{"Duration", fmt.Sprintf("%dms", entry.DurationMS)},
			[2]string{"Exit Code", exitStatus},
			[2]string{"Write Op", writeStr},
		)
		fmt.Print(ui.RenderInfoPanel(fmt.Sprintf("History Entry #%d", entry.ID), pairs))
		return nil
	},
}

// --- history run ---

var historyRunCmd = &cobra.Command{
	Use:   "run <id>",
	Short: "Show the command to replay (does not execute it)",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		var id int
		if _, err := fmt.Sscanf(args[0], "%d", &id); err != nil || id <= 0 {
			return fmt.Errorf("invalid id %q — must be a positive integer", args[0])
		}

		db, err := historydb.Open()
		if err != nil {
			return fmt.Errorf("cannot open history: %w", err)
		}

		entry, ok := db.GetByID(id)
		if !ok {
			if cfg.JSONMode {
				return printJSON(map[string]any{"id": id, "found": false})
			}
			ui.Warning(fmt.Sprintf("No history entry with id %d.", id))
			return nil
		}

		parts := []string{"gw", entry.Command}
		if entry.Args != "" {
			parts = append(parts, entry.Args)
		}
		replayCmd := strings.Join(parts, " ")

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"id":      entry.ID,
				"replay":  replayCmd,
				"command": entry.Command,
				"args":    entry.Args,
			})
		}

		ui.PrintHeader(fmt.Sprintf("Replay for entry #%d", entry.ID))
		fmt.Println()
		fmt.Printf("  %s\n", ui.CommandStyle.Render(replayCmd))
		fmt.Println()
		ui.Muted("Copy the line above and run it to replay this command.")

		return nil
	},
}

// --- history clear ---

var historyClearCmd = &cobra.Command{
	Use:   "clear",
	Short: "Clear history entries",
	Long: `Clear command history entries.

Without --older-than, all history is removed.
With --older-than, only entries older than the given duration are removed.

Duration format: 30d, 1w, 6m, 1y
  d = days
  w = weeks
  m = months
  y = years`,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		olderThan, _ := cmd.Flags().GetString("older-than")

		db, err := historydb.Open()
		if err != nil {
			return fmt.Errorf("cannot open history: %w", err)
		}

		removed, err := db.Clear(olderThan)
		if err != nil {
			return fmt.Errorf("clear failed: %w", err)
		}

		if cfg.JSONMode {
			result := map[string]any{
				"removed":    removed,
				"older_than": olderThan,
			}
			return printJSON(result)
		}

		if olderThan != "" {
			ui.Success(fmt.Sprintf("Removed %d entries older than %s.", removed, olderThan))
		} else {
			ui.Success(fmt.Sprintf("Cleared all history (%d entries removed).", removed))
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(historyCmd)

	// history list
	historyListCmd.Flags().IntP("limit", "n", 20, "Maximum number of entries to show")
	historyCmd.AddCommand(historyListCmd)

	// history search
	historyCmd.AddCommand(historySearchCmd)

	// history show
	historyCmd.AddCommand(historyShowCmd)

	// history run
	historyCmd.AddCommand(historyRunCmd)

	// history clear
	historyClearCmd.Flags().StringP("older-than", "o", "", "Remove entries older than this duration (e.g. 30d, 1w, 6m, 1y)")
	historyCmd.AddCommand(historyClearCmd)
}
