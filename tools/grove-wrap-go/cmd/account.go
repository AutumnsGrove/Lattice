package cmd

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// Terminating a Wanderer (#1722).
//
// The levers all existed and nothing joined them: `gw tenant suspend` took the
// site down but left the account free to sign in; the signup block stopped new
// accounts but did nothing to an existing one; and `ba_user.banned` was read by
// every session path and written by nothing. Done in the heat of an incident,
// that is four steps to remember and one to forget — which is how `emmareed`
// was deleted and then signed up again.
//
// `terminate` is the composed step. Suspension stays as it is: cheap,
// reversible, and no questions asked. This verb is the deliberate one, so it
// carries everything and says what it did.

var (
	accountTerminateReason  string
	accountTerminateExpires string
	accountTerminateDryRun  bool
	accountUnbanReason      string
)

var accountCmd = &cobra.Command{
	Use:   "account",
	Short: "Ban a Wanderer, or lift the ban",
	Long: `Account-level controls that a tenant command cannot express.

A tenant is a blog. A Wanderer is the person who owns it, and the person is who
keeps coming back after the blog is gone. ` + "`terminate`" + ` is the one step that
handles both:

  1. suspend the tenant           (tenants.active = 0 — unchanged behaviour)
  2. ban the account              (ba_user.banned, with a reason and expiry)
  3. revoke live sessions         (ba_session, refresh_tokens, user_sessions)
  4. block the address            (signup_blocks, source = terminate:<subdomain>)
  5. write one audit_log row naming all four

Suspension is not part of this and does not imply it: ` + "`gw tenant suspend`" + ` stays
the cheap reversible move. Banning someone who has not been suspended is also
allowed — the account is the thing being refused, not the blog.`,
}

var accountTerminateCmd = &cobra.Command{
	Use:   "terminate <subdomain|email>",
	Short: "Suspend, ban, revoke sessions, and block in one audited step",
	Long: `Take a Wanderer out of Grove, in one step that cannot half-happen silently.

Dry run by default: it prints what would be done and writes nothing. ` + "`--write`" + `
is the only thing that acts.

The signup block it writes is keyed on the normalized identity (lowercased,
` + "`+alias`" + ` dropped), so the aliases land in the same bucket. Removing that block
is a separate decision — ` + "`gw block rm`" + ` — because "let them back in" is a
different judgement from "un-ban the account".`,
	Example: `  gw account terminate spamgarden --reason "link farm"
  gw account terminate spamgarden --reason "link farm" --write
  gw account terminate someone@example.com --reason "abuse" --expires 30d --write`,
	Args: cobra.ExactArgs(1),
	RunE: runAccountTerminate,
}

var accountUnbanCmd = &cobra.Command{
	Use:   "unban <subdomain|email>",
	Short: "Lift a ban without touching the tenant or the block list",
	Long: `Clear ` + "`ba_user.banned`" + `, ` + "`ban_reason`" + ` and ` + "`ban_expires`" + `.

Three separate things were switched off by ` + "`terminate`" + `, and they are three
separate decisions to switch back on:

- the ban        — this command
- the suspension — ` + "`gw tenant resume`" + `
- the address    — ` + "`gw block rm`" + `

Nothing here guesses which of those you meant.`,
	Args: cobra.ExactArgs(1),
	RunE: runAccountUnban,
}

func init() {
	rootCmd.AddCommand(accountCmd)
	accountCmd.AddCommand(accountTerminateCmd, accountUnbanCmd)

	accountTerminateCmd.Flags().StringVar(&accountTerminateReason, "reason", "", "why (required — goes in the audit row and the ban reason)")
	accountTerminateCmd.Flags().StringVar(&accountTerminateExpires, "expires", "", "how long the ban lasts (e.g. 30d, 12h); default is permanent")
	accountTerminateCmd.Flags().BoolVar(&accountTerminateDryRun, "dry-run", false, "print the plan, change nothing (default when --write is absent)")
	accountUnbanCmd.Flags().StringVar(&accountUnbanReason, "reason", "", "why the ban is being lifted (recorded in audit_log)")
}

// ============================================================================
// Resolution
// ============================================================================

type accountTarget struct {
	TenantID  string
	Subdomain string
	Email     string
	UserID    string
	Active    bool
	Banned    bool
}

func looksLikeEmail(value string) bool {
	return strings.Contains(value, "@")
}

/**
 * Resolve an argument to both halves of a person: the blog and the login.
 *
 * Either identifier is accepted because an operator has one or the other when
 * they open the terminal. The tenant may be gone while the login remains (that
 * is the case `terminate` exists for), so a missing blog is reported, not fatal.
 */
func resolveAccount(arg string) (*accountTarget, error) {
	where := fmt.Sprintf("lower(t.email) = lower(%s)", sqlString(arg))
	if !looksLikeEmail(arg) {
		if err := validateSubdomain(arg); err != nil {
			return nil, err
		}
		where = fmt.Sprintf("t.subdomain = %s", sqlString(arg))
	}

	rows, err := exec.D1Query(
		engineDatabase,
		fmt.Sprintf(
			`SELECT t.id, t.subdomain, t.email, t.active FROM tenants t WHERE %s LIMIT 1`,
			where,
		),
	)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("no tenant matched %q — terminate works on a blog and the login that owns it", arg)
	}

	target := &accountTarget{
		TenantID:  rowString(rows[0], "id"),
		Subdomain: rowString(rows[0], "subdomain"),
		Email:     rowString(rows[0], "email"),
		Active:    rowInt(rows[0], "active") == 1,
	}
	if target.Email == "" {
		return nil, fmt.Errorf("tenant %q has no email address on file, so there is no account to ban", target.Subdomain)
	}

	// groveauth is a separate database: a tenant can exist without an identity
	// (removed account) and an identity can exist without a tenant.
	identity, err := exec.D1Query(
		groveauthDatabase,
		fmt.Sprintf(
			`SELECT id, banned FROM ba_user WHERE lower(email) = lower(%s) LIMIT 1`,
			sqlString(target.Email),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("could not read the groveauth identity: %w", err)
	}
	if len(identity) == 0 {
		return nil, fmt.Errorf("no login exists for %s — nothing to ban (suspend the tenant instead)", target.Email)
	}
	target.UserID = rowString(identity[0], "id")
	target.Banned = rowInt(identity[0], "banned") == 1

	return target, nil
}

// ============================================================================
// terminate
// ============================================================================

func runAccountTerminate(cmd *cobra.Command, args []string) error {
	cfg := config.Get()
	arg := args[0]

	if strings.TrimSpace(accountTerminateReason) == "" {
		return fmt.Errorf("--reason is required: a ban without a reason is folklore in six months")
	}

	expiresAt, err := parseBlockExpiry(accountTerminateExpires, time.Now())
	if err != nil {
		return err
	}

	target, err := resolveAccount(arg)
	if err != nil {
		return err
	}

	// The block is keyed on the normalized identity, so `name+alias@` lands with
	// `name@` — the same normalization Heartwood applies when it checks.
	blockValue, err := validateBlockValue("email", target.Email)
	if err != nil {
		return fmt.Errorf("cannot block %s: %w", target.Email, err)
	}

	write := cfg.WriteFlag
	// `!write`: the plan records whether anything was *changed*, and the JSON is
	// read by automation that will act on it. Passing `write` here once already
	// made a real termination report `"dryRun": true`.
	plan := terminationPlan(target, blockValue, expiresAt, !write)

	if !write {
		if cfg.JSONMode {
			out, _ := json.MarshalIndent(plan, "", "  ")
			fmt.Println(string(out))
		} else {
			fmt.Print(renderTerminationPlan(plan))
			ui.Hint("Nothing was changed. Run again with --write to act.")
		}
		return nil
	}

	if err := requireCFSafety("account_terminate"); err != nil {
		return err
	}

	// Identity first, on purpose. If the second half fails, the account is banned
	// and the site is still up — a state the operator can see and retry. The
	// reverse leaves a banned-looking blog whose owner can still sign in.
	if _, err := exec.WranglerOutput(
		"d1", "execute", groveauthDatabase, "--remote", "--yes", "--command",
		terminateIdentitySQL(target, expiresAt, accountTerminateReason),
	); err != nil {
		return fmt.Errorf("the account was NOT banned (groveauth write failed): %w", err)
	}

	if _, err := exec.WranglerOutput(
		"d1", "execute", engineDatabase, "--remote", "--yes", "--command",
		terminateTenantSQL(target, blockValue, expiresAt, accountTerminateReason),
	); err != nil {
		return fmt.Errorf("the account is banned, but suspending the blog failed — run `gw tenant suspend %s --write`: %w", target.Subdomain, err)
	}

	if cfg.JSONMode {
		out, _ := json.MarshalIndent(plan, "", "  ")
		fmt.Println(string(out))
		return nil
	}

	fmt.Print(renderTerminationResult(plan, blockValue))
	return nil
}

type termination struct {
	Subdomain       string `json:"subdomain"`
	TenantID        string `json:"tenantId"`
	Email           string `json:"email"`
	UserID          string `json:"userId"`
	Reason          string `json:"reason"`
	ExpiresAt       *int64 `json:"expiresAt"`
	Suspended       bool   `json:"suspendsTenant"`
	Banned          bool   `json:"bansAccount"`
	SessionsRevoked bool   `json:"revokesSessions"`
	BlockedValue    string `json:"blockedValue"`
	AlreadyInactive bool   `json:"wasAlreadySuspended"`
	AlreadyBanned   bool   `json:"wasAlreadyBanned"`
	DryRun          bool   `json:"dryRun"`
}

func terminationPlan(target *accountTarget, blockValue string, expiresAt *int64, dryRun bool) termination {
	// `dryRun` means "nothing was written", never "--write was not passed".
	// Callers pass `!write`.
	return termination{
		Subdomain:       target.Subdomain,
		TenantID:        target.TenantID,
		Email:           target.Email,
		UserID:          target.UserID,
		Reason:          accountTerminateReason,
		ExpiresAt:       expiresAt,
		Suspended:       true,
		Banned:          true,
		SessionsRevoked: true,
		BlockedValue:    blockValue,
		AlreadyInactive: !target.Active,
		AlreadyBanned:   target.Banned,
		DryRun:          dryRun,
	}
}

func renderTerminationPlan(plan termination) string {
	lines := []string{
		fmt.Sprintf("Wanderer %s (%s) — %d step(s):", plan.Subdomain, plan.Email, terminationSteps(plan)),
		"",
		fmt.Sprintf("  suspend  tenants.active = 0%s", alreadyLabel(plan.AlreadyInactive)),
		fmt.Sprintf("  ban      ba_user.banned = 1, reason %q%s", plan.Reason, alreadyLabel(plan.AlreadyBanned)),
		"  revoke   ba_session, refresh_tokens, user_sessions",
		fmt.Sprintf("  block    %s (source terminate:%s)", plan.BlockedValue, plan.Subdomain),
	}
	if plan.ExpiresAt != nil {
		lines = append(lines, fmt.Sprintf("  expiry   %s", time.Unix(*plan.ExpiresAt, 0).UTC().Format(time.RFC3339)))
	}
	lines = append(lines, "", "  one audit_log row naming all of it")
	return strings.Join(lines, "\n") + "\n"
}

func renderTerminationResult(plan termination, blockValue string) string {
	return fmt.Sprintf(
		"%s terminated\n  suspended, banned (%q), sessions revoked, %s blocked\n  audit_log recorded",
		plan.Subdomain, plan.Reason, blockValue,
	) + "\n"
}

func terminationSteps(plan termination) int {
	steps := 4
	if plan.AlreadyInactive {
		steps--
	}
	if plan.AlreadyBanned {
		steps--
	}
	return steps
}

func alreadyLabel(already bool) string {
	if already {
		return " (already)"
	}
	return ""
}

/**
 * groveauth: the person.
 *
 * `ba_session` first and by user id, so the tokens that are already in browsers
 * stop resolving; `refresh_tokens` and `user_sessions` are the legacy paths that
 * outlived a ban decision in the incident this closes.
 */
func terminateIdentitySQL(target *accountTarget, expiresAt *int64, reason string) string {
	expiry := "NULL"
	if expiresAt != nil {
		expiry = fmt.Sprintf("%d", *expiresAt)
	}
	user := sqlString(target.UserID)
	return fmt.Sprintf(
		`UPDATE ba_user SET banned = 1, ban_reason = %s, ban_expires = %s, updated_at = unixepoch() WHERE id = %s;
DELETE FROM ba_session WHERE user_id = %s;
DELETE FROM refresh_tokens WHERE user_id = %s;
DELETE FROM user_sessions WHERE user_id = %s;`,
		sqlString(reason), expiry, user,
		user, user, user,
	)
}

/**
 * engine: the blog, the address, and the record.
 *
 * The block is written with `source = terminate:<subdomain>` so a later reader
 * can tell a tidy-up from an incident response. The audit row goes in the same
 * transaction as the suspension, so "suspended but not recorded" is not a state
 * this can produce.
 */
func terminateTenantSQL(target *accountTarget, blockValue string, expiresAt *int64, reason string) string {
	return fmt.Sprintf(
		`UPDATE tenants SET active = 0, updated_at = unixepoch() WHERE id = %s;
%s;
%s`,
		sqlString(target.TenantID),
		blockUpsertSQL("email", blockValue, reason, "terminate:"+target.Subdomain, expiresAt),
		terminationAuditSQL(target, blockValue, expiresAt, reason),
	)
}

func terminationAuditSQL(target *accountTarget, blockValue string, expiresAt *int64, reason string) string {
	details, _ := json.Marshal(map[string]any{
		"actor":           "gw",
		"action":          "account_terminate",
		"reason":          reason,
		"email":           target.Email,
		"groveauthUserId": target.UserID,
		"banned":          true,
		"sessionsRevoked": true,
		"blocked":         blockValue,
		"blockSource":     "terminate:" + target.Subdomain,
		"banExpiresAt":    expiresAt,
	})
	return fmt.Sprintf(
		`INSERT INTO audit_log (id, tenant_id, category, action, details, user_email, created_at)
VALUES (lower(hex(randomblob(16))), %s, 'admin', 'account_terminate', %s, %s, unixepoch())`,
		sqlString(target.TenantID),
		sqlString(string(details)),
		sqlString(target.Email),
	)
}

// ============================================================================
// unban
// ============================================================================

func runAccountUnban(cmd *cobra.Command, args []string) error {
	cfg := config.Get()

	target, err := resolveAccount(args[0])
	if err != nil {
		return err
	}

	if !target.Banned {
		ui.Info(fmt.Sprintf("%s is not banned; nothing to lift.", target.Subdomain))
		return nil
	}

	if !cfg.WriteFlag {
		fmt.Printf("Would lift the ban on %s (%s).\n", target.Subdomain, target.Email)
		ui.Hint("Nothing was changed. Run again with --write to act.")
		return nil
	}

	if err := requireCFSafety("account_unban"); err != nil {
		return err
	}

	if _, err := exec.WranglerOutput(
		"d1", "execute", groveauthDatabase, "--remote", "--yes", "--command",
		fmt.Sprintf(
			`UPDATE ba_user SET banned = 0, ban_reason = NULL, ban_expires = NULL, updated_at = unixepoch() WHERE id = %s`,
			sqlString(target.UserID),
		),
	); err != nil {
		return err
	}

	// The tenant is still suspended and the address is still blocked. Saying so
	// is the difference between "unbanned" and "let back in".
	if _, err := exec.WranglerOutput(
		"d1", "execute", engineDatabase, "--remote", "--yes", "--command",
		accountUnbanAuditSQL(target, accountUnbanReason),
	); err != nil {
		return fmt.Errorf("the ban is lifted, but recording it failed: %w", err)
	}

	if cfg.JSONMode {
		out, _ := json.Marshal(map[string]any{
			"subdomain": target.Subdomain,
			"email":     target.Email,
			"banned":    false,
		})
		fmt.Println(string(out))
		return nil
	}

	ui.Success(fmt.Sprintf("Ban lifted for %s (%s).", target.Subdomain, target.Email))
	if !target.Active {
		ui.Warning(fmt.Sprintf("%s is still suspended — `gw tenant resume %s --write` if that was the intent.", target.Subdomain, target.Subdomain))
	}
	ui.Info("The signup block is untouched: `gw block list` to check, `gw block rm` to lift it.")
	return nil
}

func accountUnbanAuditSQL(target *accountTarget, reason string) string {
	details, _ := json.Marshal(map[string]any{
		"actor":           "gw",
		"action":          "account_unban",
		"reason":          reason,
		"email":           target.Email,
		"groveauthUserId": target.UserID,
		"banned":          false,
		"tenantActive":    target.Active,
	})
	return fmt.Sprintf(
		`INSERT INTO audit_log (id, tenant_id, category, action, details, user_email, created_at)
VALUES (lower(hex(randomblob(16))), %s, 'admin', 'account_unban', %s, %s, unixepoch())`,
		sqlString(target.TenantID),
		sqlString(string(details)),
		sqlString(target.Email),
	)
}

// accountIsBanned reports whether the login behind an address is banned.
//
// Best-effort: a read failure is not a reason to fail a resume that has already
// written, and the warning it feeds is advisory.
func accountIsBanned(email string) (bool, error) {
	if strings.TrimSpace(email) == "" {
		return false, fmt.Errorf("no address on file")
	}
	rows, err := exec.D1Query(
		groveauthDatabase,
		fmt.Sprintf(
			`SELECT banned FROM ba_user WHERE lower(email) = lower(%s) LIMIT 1`,
			sqlString(email),
		),
	)
	if err != nil {
		return false, err
	}
	if len(rows) == 0 {
		return false, nil
	}
	return rowInt(rows[0], "banned") == 1, nil
}
