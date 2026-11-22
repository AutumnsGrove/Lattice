package cmd

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// Signup identity blocks — the deny list behind #1681.
//
// The list lives in `signup_blocks` (libs/engine/migrations/123_signup_blocks.sql)
// and is read by Heartwood at OTP send and user creation, and by Plant at tenant
// creation. It is data, not code: adding a domain must not need a deploy.
//
// Values are normalized on the way in (lowercase; an `email` rule also drops its
// +alias), because the identity an operator cannot cheaply change is the parent
// address, not the alias they minted today.

const signupBlockKindValues = "domain|email|substring"

var (
	blockReason  string
	blockSource  string
	blockExpires string
	blockKind    string
	blockAll     bool
)

var emailFilePattern = regexp.MustCompile(`^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$`)

var blockCmd = &cobra.Command{
	Use:   "block",
	Short: "Manage the signup identity deny list",
	Long: `Manage the signup identity deny list (issue #1681).

Blocks are checked at code-send and at account creation, and compared against
the normalized identity: lowercased, with everything after ` + "`+`" + ` in the local
part removed. So a rule on ` + "`mail.grokbot.com`" + ` catches both
` + "`maplecrest+grace@`" + ` and ` + "`maplecrest+ella@`" + `.

This is a deny list, not an allow list — Grove's signup stays open.`,
}

var blockListCmd = &cobra.Command{
	Use:   "list",
	Short: "Show the deny list",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		rows, err := exec.D1Query(engineDatabase, blockListSQL(blockAll))
		if err != nil {
			return wrapBlockError(err)
		}

		if cfg.JSONMode {
			out, _ := json.MarshalIndent(rows, "", "  ")
			fmt.Println(string(out))
			return nil
		}

		if len(rows) == 0 {
			ui.Info("The deny list is empty.")
			return nil
		}

		fmt.Print(renderBlockTable(rows, time.Now()))
		return nil
	},
}

var blockAddCmd = &cobra.Command{
	Use:   "add <value>",
	Short: "Add a domain, address or substring to the deny list",
	Long: `Add a block. Requires --write.

  gw block add mail.grokbot.com --reason "agent mailbox" --write
  gw block add grokbot.com --kind domain --write          # catches subdomains
  gw block add emma@upsampler.com --kind email --write    # one address
  gw block add openclaw --kind substring --expires 14 --write

Defaults to --kind domain, permanent, no expiry.`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("block_add"); err != nil {
			return err
		}
		cfg := config.Get()

		value, err := validateBlockValue(blockKind, args[0])
		if err != nil {
			return err
		}

		expiresAt, err := parseBlockExpiry(blockExpires, time.Now())
		if err != nil {
			return err
		}

		statements := blockUpsertSQL(blockKind, value, blockReason, blockSource, expiresAt)
		if _, err := exec.WranglerOutput(
			"d1", "execute", engineDatabase, "--remote", "--yes", "--command", statements,
		); err != nil {
			return err
		}

		if cfg.JSONMode {
			out, _ := json.Marshal(map[string]any{
				"kind":      blockKind,
				"value":     value,
				"expiresAt": expiresAt,
				"added":     true,
			})
			fmt.Println(string(out))
			return nil
		}

		ui.Success(fmt.Sprintf("Blocked %s=%s", blockKind, value))
		if expiresAt != nil {
			ui.Info(fmt.Sprintf("Expires %s", time.Unix(*expiresAt, 0).Format("2006-01-02")))
		} else {
			ui.Info("Permanent — remove it with `gw block rm`")
		}
		return nil
	},
}

var blockRemoveCmd = &cobra.Command{
	Use:   "rm <value>",
	Short: "Remove a block",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("block_remove"); err != nil {
			return err
		}
		cfg := config.Get()

		value, err := validateBlockValue(blockKind, args[0])
		if err != nil {
			return err
		}

		// Report what was there before deleting, so "it says 0 rows" is not the
		// only feedback on a typo.
		existing, err := exec.D1Query(engineDatabase, blockLookupSQL(blockKind, value))
		if err != nil {
			return wrapBlockError(err)
		}
		if len(existing) == 0 {
			return fmt.Errorf("no %s block for %q", blockKind, value)
		}

		if _, err := exec.WranglerOutput(
			"d1", "execute", engineDatabase, "--remote", "--yes",
			"--command", blockDeleteSQL(blockKind, value),
		); err != nil {
			return err
		}

		if cfg.JSONMode {
			out, _ := json.Marshal(map[string]any{"kind": blockKind, "value": value, "removed": true})
			fmt.Println(string(out))
			return nil
		}

		ui.Success(fmt.Sprintf("Removed %s=%s", blockKind, value))
		return nil
	},
}

func init() {
	rootCmd.AddCommand(blockCmd)
	blockCmd.AddCommand(blockListCmd, blockAddCmd, blockRemoveCmd)

	blockListCmd.Flags().BoolVar(&blockAll, "all", false, "include expired blocks")

	blockAddCmd.Flags().StringVar(&blockKind, "kind", "domain", "block kind: "+signupBlockKindValues)
	blockAddCmd.Flags().StringVar(&blockReason, "reason", "", "why this is blocked (recorded)")
	blockAddCmd.Flags().StringVar(&blockSource, "source", "manual", "provenance, e.g. incident:2026-11-14")
	blockAddCmd.Flags().StringVar(&blockExpires, "expires", "", "expiry in days, or a YYYY-MM-DD date")

	blockRemoveCmd.Flags().StringVar(&blockKind, "kind", "domain", "block kind: "+signupBlockKindValues)
}

// ============================================================================
// Validation and normalization
// ============================================================================

var blockKinds = map[string]bool{"domain": true, "email": true, "substring": true}

// validateBlockValue checks the kind/value pair and returns the normalized value.
// This is the injection boundary as well as a typo guard: the value goes into a
// SQL literal, and quoted input must never reach it unescaped.
func validateBlockValue(kind, raw string) (string, error) {
	if !blockKinds[kind] {
		return "", fmt.Errorf("unknown --kind %q (expected %s)", kind, signupBlockKindValues)
	}

	value := strings.TrimSpace(raw)
	if value == "" {
		return "", fmt.Errorf("value must not be empty")
	}
	if len(value) > 254 {
		return "", fmt.Errorf("value is too long (max 254 chars)")
	}
	if strings.ContainsAny(value, "'\"`;\\ \t\n\r") {
		return "", fmt.Errorf("%q contains characters that are never part of a domain or address", raw)
	}

	switch kind {
	case "domain":
		domain := strings.TrimPrefix(strings.ToLower(value), "@")
		domain = strings.TrimSuffix(domain, ".")
		if !domainPattern.MatchString(domain) {
			return "", fmt.Errorf("%q is not a valid domain", raw)
		}
		return domain, nil
	case "email":
		lower := strings.ToLower(value)
		if !emailFilePattern.MatchString(lower) {
			return "", fmt.Errorf("%q is not a valid email address", raw)
		}
		// Drop the alias — the block should catch the parent identity.
		at := strings.Index(lower, "@")
		local := lower[:at]
		if plus := strings.Index(local, "+"); plus > 0 {
			local = local[:plus]
		}
		return local + lower[at:], nil
	default: // substring
		return strings.ToLower(value), nil
	}
}

var domainPattern = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$`)

// parseBlockExpiry turns "" (permanent), "14" (days) or "2026-12-01" into a unix
// timestamp. Returns nil for permanent.
func parseBlockExpiry(raw string, now time.Time) (*int64, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, nil
	}

	if days, err := time.ParseDuration(trimmed); err == nil {
		if days < 0 {
			return nil, fmt.Errorf("--expires must not be negative")
		}
		ts := now.Add(days).Unix()
		return &ts, nil
	}

	if ts, err := time.ParseInLocation("2006-01-02", trimmed, time.UTC); err == nil {
		unix := ts.Unix()
		return &unix, nil
	}

	if strings.HasSuffix(trimmed, "d") {
		var days int
		if _, err := fmt.Sscanf(trimmed, "%dd", &days); err == nil && days >= 0 {
			ts := now.Add(time.Duration(days) * 24 * time.Hour).Unix()
			return &ts, nil
		}
	}

	return nil, fmt.Errorf("--expires must be days (e.g. 14d) or a date (YYYY-MM-DD), got %q", raw)
}

// ============================================================================
// SQL
// ============================================================================

var blockSelectColumns = `id, kind, value, reason, created_by, created_at, expires_at, source`

func blockListSQL(includeExpired bool) string {
	where := "expires_at IS NULL OR expires_at > unixepoch()"
	if includeExpired {
		where = "1 = 1"
	}
	return fmt.Sprintf(
		`SELECT %s FROM signup_blocks WHERE %s ORDER BY created_at DESC`,
		blockSelectColumns, where,
	)
}

func blockLookupSQL(kind, value string) string {
	return fmt.Sprintf(
		`SELECT %s FROM signup_blocks WHERE kind = %s AND value = %s LIMIT 1`,
		blockSelectColumns, sqlString(kind), sqlString(value),
	)
}

func blockUpsertSQL(kind, value, reason, source string, expiresAt *int64) string {
	expiry := "NULL"
	if expiresAt != nil {
		expiry = fmt.Sprintf("%d", *expiresAt)
	}
	// Re-adding a block should update its reason and expiry, not fail on the
	// unique index or leave a stale row behind.
	return fmt.Sprintf(
		`INSERT INTO signup_blocks (id, kind, value, reason, created_by, expires_at, source)
VALUES (lower(hex(randomblob(16))), %s, %s, %s, 'gw', %s, %s)
ON CONFLICT(kind, value) DO UPDATE SET
  reason = excluded.reason,
  expires_at = excluded.expires_at,
  source = excluded.source`,
		sqlString(kind),
		sqlString(value),
		sqlString(orEmpty(reason)),
		expiry,
		sqlString(orEmpty(source)),
	)
}

func blockDeleteSQL(kind, value string) string {
	return fmt.Sprintf(
		`DELETE FROM signup_blocks WHERE kind = %s AND value = %s`,
		sqlString(kind), sqlString(value),
	)
}

func orEmpty(v string) string {
	return strings.TrimSpace(v)
}

// wrapBlockError adds the one hint that matters when the table is missing, which
// is the common first-run experience until the migration is applied.
func wrapBlockError(err error) error {
	if err == nil {
		return nil
	}
	if strings.Contains(err.Error(), "no such table") {
		return fmt.Errorf(
			"signup_blocks does not exist in %s yet — apply libs/engine/migrations/123_signup_blocks.sql (see #1681, #1692 for why migrations apply is not reliable here)\n  (%w)",
			engineDatabase, err,
		)
	}
	return err
}

// ============================================================================
// Rendering
// ============================================================================

// expiryLabel reads forward: "in 7d", "expired", or "never" for a permanent block.
func expiryLabel(unix int64, now time.Time) string {
	if unix <= 0 {
		return "never"
	}
	if unix <= now.Unix() {
		return "expired"
	}
	remaining := time.Unix(unix, 0).Sub(now)
	if remaining < 24*time.Hour {
		return fmt.Sprintf("in %dh", int(remaining.Hours()))
	}
	return fmt.Sprintf("in %dd", int(remaining.Hours()/24))
}

func renderBlockTable(rows []map[string]any, now time.Time) string {
	headers := []string{"KIND", "VALUE", "REASON", "SOURCE", "EXPIRES"}
	table := make([][]string, 0, len(rows)+1)
	table = append(table, headers)

	for _, r := range rows {
		expires := expiryLabel(rowInt(r, "expires_at"), now)
		table = append(table, []string{
			rowString(r, "kind"),
			truncate(rowString(r, "value"), 40),
			truncate(orNoValue(rowString(r, "reason")), 44),
			truncate(orNoValue(rowString(r, "source")), 24),
			expires,
		})
	}

	widths := make([]int, len(headers))
	for _, row := range table {
		for i, cell := range row {
			if displayWidth(cell) > widths[i] {
				widths[i] = displayWidth(cell)
			}
		}
	}

	var b strings.Builder
	for i, row := range table {
		for j, cell := range row {
			if j == len(row)-1 {
				b.WriteString(cell)
				continue
			}
			b.WriteString(padRight(cell, widths[j]+2))
		}
		b.WriteString("\n")
		if i == 0 {
			total := 0
			for _, w := range widths {
				total += w + 2
			}
			b.WriteString(strings.Repeat("─", total) + "\n")
		}
	}
	return b.String()
}
