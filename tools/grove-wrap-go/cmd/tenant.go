package cmd

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/vault"
)

// Tenant inspection and the suspension lever.
//
// Deletion lives in #1596 §B, because deleting a tenant safely needs one
// registry of tenant-carrying tables. Suspension does not: every tenant lookup
// filters on `active = 1`, so flipping it is a single UPDATE — and it is the
// reversible move you want at 2am.

const (
	engineDatabase    = "grove-engine-db"
	groveauthDatabase = "groveauth"
	defaultListLimit  = 25
	siteProbeTimeout  = 10 * time.Second
)

var (
	// The engine's rule (libs/engine/src/lib/utils/grove-url.ts) is
	// ^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$ — no trailing hyphen. This used to
	// allow one, which meant gw would accept a subdomain the endpoint then
	// refused. Two copies of a rule is how they stop agreeing.
	subdomainPattern = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$`)
	emailPattern     = regexp.MustCompile(`^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$`)

	tenantListAll      bool
	tenantListInactive bool
	tenantListFree     bool
	tenantListLimit    int
	tenantShowEmail    string
	tenantSuspendNote  string

	tenantCreateSubdomain  string
	tenantCreateEmail      string
	tenantCreateName       string
	tenantCreatePlan       string
	tenantCreateAccent     string
	tenantCreateCreatedAt  string
	tenantCreateGroveauth  string
	tenantCreateOnboarding string
	tenantCreateForce      string
	tenantCreateDryRun     bool
	tenantCreateEndpoint   string

	tenantDeleteReason string
	tenantDeleteDryRun bool
	tenantDeletePolicy string
)

var tenantCmd = &cobra.Command{
	Use:   "tenant",
	Short: "Inspect tenants, and suspend or resume them",
	Long: `Tenant inspection and the suspension lever.

Suspension sets tenants.active = 0, which every tenant lookup already filters on
(hooks.server.ts: WHERE subdomain = ? AND active = 1). It is reversible and
leaves content in place. Permanent removal is a separate, larger operation —
see issue #1596.

After suspending, the command probes the site and reports what it actually got,
because a suspended tenant can keep serving from the TenantDO cache until it is
flushed (#1677).`,
}

var tenantListCmd = &cobra.Command{
	Use:   "list",
	Short: "List tenants with plan, activity and post counts",
	Long: `List tenants, newest first. Active tenants only by default.

  gw tenant list              # active tenants
  gw tenant list --inactive   # suspended tenants
  gw tenant list --all        # everyone
  gw tenant list --free       # wanderer tier only`,
	Args: cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		filter, err := tenantListFilter(tenantListAll, tenantListInactive, tenantListFree)
		if err != nil {
			return err
		}

		rows, err := exec.D1Query(engineDatabase, tenantListSQL(filter, tenantListLimit))
		if err != nil {
			return err
		}

		if cfg.JSONMode {
			out, _ := json.MarshalIndent(rows, "", "  ")
			fmt.Println(string(out))
			return nil
		}

		if len(rows) == 0 {
			ui.Info("No tenants matched.")
			return nil
		}

		fmt.Print(renderTenantTable(rows, time.Now()))
		return nil
	},
}

var tenantCreateCmd = &cobra.Command{
	Use:   "create --subdomain <name> --email <address> --plan <tier>",
	Short: "Create a tenant from flags, without walking the signup (fixtures)",
	Long: `Create a tenant without going through Plant.

This is for fixtures and for restoring an account, not for onboarding anyone.
It skips Turnstile (#1678) and normally the identity deny list (#1681) — that is
the point, and it is why it needs --write and an operator endpoint.

It calls the same createTenant() Plant calls, in the engine, so a fixture is the
same shape as a real tenant. That matters: a fixture can be handed straight to
removeTenant(), which is how the removal path gets tested at all (#1596 §B).

--created-at makes a fixture young or established, which is the only way to test
the link policy (#1682) without waiting two weeks. Three accepted forms:

  1700000000   a unix timestamp
  30d          thirty days ago
  2026-01-15   that date, midnight UTC

Examples:

  # what would it write?
  gw tenant create --subdomain autumn-test --email autumn+fixtures@grove.place \
    --plan seedling --dry-run

  # a two-day-old fixture
  gw tenant create --subdomain autumn-test --email autumn+fixtures@grove.place \
    --plan wanderer --created-at 2d --write

The endpoint defaults to $GROVE_OPS_ENDPOINT, or --endpoint.`,
	Args: cobra.NoArgs,
	RunE: runTenantCreate,
}

var tenantDeleteCmd = &cobra.Command{
	Use:   "delete <subdomain> --reason <text> --write",
	Short: "Permanently remove a tenant and everything keyed to it",
	Long: `Permanently remove a tenant: every registered table across engine, curios and
observability, then the tenants row, then the TenantDO cache, then the login
identity, then an email to the person who held it.

Dry run by default. It prints per-table counts (and the groveauth rows) and
touches nothing; --write is what actually destroys. A reason is required
because it becomes the audit trail, and because it is quoted verbatim in the
email the account holder receives.

--policy names the rule this removal cites, so the email can point at a section
somebody can read. It defaults to aup-1.4 (spam and link schemes). Use
--policy requested when the person asked to be deleted.

The sweep runs inside the ops worker, not here. Tenant rows live in 91 tables
across three databases, and driving that from the CLI means one subprocess per
statement — which timed out mid-sweep on 2026-11-17 and left a half-removed
tenant behind. The worker has every binding and removeTenant() is one function,
so it does the whole thing in one invocation.

Anything it could not do is printed, not omitted. Silence is not success.

Examples:

  # what would it delete?
  gw tenant delete spamgarden --reason "link farm"

  # do it
  gw tenant delete spamgarden --reason "link farm" --write

  # a deletion the person asked for
  gw tenant delete quietblog --reason "asked in email" --policy requested --write`,
	Args: cobra.ExactArgs(1),
	RunE: runTenantDelete,
}

var tenantShowCmd = &cobra.Command{
	Use:   "show <subdomain>",
	Short: "Show identity, content, storage and auth for one tenant",
	Long: `Show everything we know about one tenant: the D1 row, what they have
published, and the Better Auth identity behind it.

  gw tenant show autumn
  gw tenant show --email autumn@grove.place`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		var lookupSQL string
		switch {
		case tenantShowEmail != "" && len(args) == 0:
			if err := validateEmail(tenantShowEmail); err != nil {
				return err
			}
			lookupSQL = fmt.Sprintf(
				`SELECT id, subdomain, display_name, email, plan, active, storage_used, custom_domain, created_at, updated_at
FROM tenants WHERE lower(email) = lower(%s) LIMIT 1`,
				sqlString(tenantShowEmail),
			)
		case len(args) == 1:
			if err := validateSubdomain(args[0]); err != nil {
				return err
			}
			lookupSQL = fmt.Sprintf(
				`SELECT id, subdomain, display_name, email, plan, active, storage_used, custom_domain, created_at, updated_at
FROM tenants WHERE subdomain = %s LIMIT 1`,
				sqlString(args[0]),
			)
		default:
			return fmt.Errorf("give me a subdomain, or --email <address>")
		}

		rows, err := exec.D1Query(engineDatabase, lookupSQL)
		if err != nil {
			return err
		}
		if len(rows) == 0 {
			return fmt.Errorf("no tenant matched")
		}
		tenant := rows[0]

		tenantID := rowString(tenant, "id")
		email := rowString(tenant, "email")

		posts, err := exec.D1Query(engineDatabase, tenantPostsSQL(tenantID))
		if err != nil {
			return err
		}
		recent, err := exec.D1Query(engineDatabase, tenantRecentPostsSQL(tenantID))
		if err != nil {
			return err
		}

		// groveauth is a separate database: a tenant can exist without an
		// identity (removed account) and vice versa (inert twin identity).
		var identity, sessions []map[string]any
		if email != "" && emailPattern.MatchString(email) {
			identity, err = exec.D1Query(groveauthDatabase, identitySQL(email))
			if err != nil {
				ui.Warning(fmt.Sprintf("Could not read groveauth identity: %v", err))
				identity = nil
			}
			if len(identity) > 0 {
				sessions, err = exec.D1Query(
					groveauthDatabase,
					sessionsSQL(rowString(identity[0], "id")),
				)
				if err != nil {
					sessions = nil
				}
			}
		}

		if cfg.JSONMode {
			out, _ := json.MarshalIndent(
				map[string]any{
					"tenant":   tenant,
					"posts":    firstRow(posts),
					"recent":   recent,
					"identity": firstRow(identity),
					"sessions": firstRow(sessions),
				},
				"",
				"  ",
			)
			fmt.Println(string(out))
			return nil
		}

		now := time.Now()
		fmt.Print(renderTenantDetail(tenant, firstRow(posts), firstRow(identity), firstRow(sessions), now))
		if len(recent) > 0 {
			fmt.Println()
			ui.PrintHeader("Recent posts")
			for _, p := range recent {
				fmt.Printf("  %-28s %s  %s\n",
					truncate(rowString(p, "slug"), 28),
					ageLabel(rowInt(p, "created_at"), now),
					rowString(p, "title"),
				)
			}
		}
		return nil
	},
}

var tenantSuspendCmd = &cobra.Command{
	Use:   "suspend <subdomain>",
	Short: "Take a tenant offline (reversible)",
	Long: `Set tenants.active = 0. Every tenant lookup filters on it, so the site
stops resolving — content is untouched and resume puts it back.

Requires --write. Always probes the site afterwards and tells you what it got.`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return setTenantActive(args[0], false)
	},
}

var tenantResumeCmd = &cobra.Command{
	Use:   "resume <subdomain>",
	Short: "Put a suspended tenant back online",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return setTenantActive(args[0], true)
	},
}

func init() {
	rootCmd.AddCommand(tenantCmd)
	tenantCmd.AddCommand(tenantListCmd, tenantShowCmd, tenantSuspendCmd, tenantResumeCmd, tenantCreateCmd, tenantDeleteCmd)

	tenantListCmd.Flags().BoolVar(&tenantListAll, "all", false, "include suspended tenants")
	tenantListCmd.Flags().BoolVar(&tenantListInactive, "inactive", false, "only suspended tenants")
	tenantListCmd.Flags().BoolVar(&tenantListFree, "free", false, "only wanderer-tier tenants")
	tenantListCmd.Flags().IntVar(&tenantListLimit, "limit", defaultListLimit, "maximum rows")

	tenantShowCmd.Flags().StringVar(&tenantShowEmail, "email", "", "look the tenant up by email")
	tenantSuspendCmd.Flags().StringVar(&tenantSuspendNote, "reason", "", "why (recorded in audit_log)")

	tenantCreateCmd.Flags().StringVar(&tenantCreateSubdomain, "subdomain", "", "subdomain to claim (required)")
	tenantCreateCmd.Flags().StringVar(&tenantCreateEmail, "email", "", "owner address (required)")
	tenantCreateCmd.Flags().StringVar(&tenantCreateName, "display-name", "", "display name (defaults to the subdomain)")
	tenantCreateCmd.Flags().StringVar(&tenantCreatePlan, "plan", "wanderer", "wanderer | seedling | sapling | oak | evergreen")
	tenantCreateCmd.Flags().StringVar(&tenantCreateAccent, "accent-color", "", "accent colour (defaults to the platform default)")
	tenantCreateCmd.Flags().StringVar(&tenantCreateCreatedAt, "created-at", "", "unix seconds, '30d', or YYYY-MM-DD")
	tenantCreateCmd.Flags().StringVar(&tenantCreateGroveauth, "groveauth-id", "", "attach an existing identity")
	tenantCreateCmd.Flags().StringVar(&tenantCreateOnboarding, "onboarding-id", "", "link an existing onboarding row")
	tenantCreateCmd.Flags().StringVar(&tenantCreateForce, "force-identity", "", "override the deny list, with a reason (recorded)")
	tenantCreateCmd.Flags().BoolVar(&tenantCreateDryRun, "dry-run", false, "print the writes, change nothing")
	tenantCreateCmd.Flags().StringVar(&tenantCreateEndpoint, "endpoint", "", "ops worker URL (defaults to $GROVE_OPS_ENDPOINT)")

	tenantDeleteCmd.Flags().StringVar(&tenantDeleteReason, "reason", "", "why (required — recorded in audit_log, and quoted in the email)")
	tenantDeleteCmd.Flags().BoolVar(&tenantDeleteDryRun, "dry-run", false, "print the per-table counts, delete nothing (default when --write is absent)")
	tenantDeleteCmd.Flags().StringVar(&tenantDeletePolicy, "policy", "aup-1.4", "the rule this removal cites: aup-1.4, aup-1.5, aup-1.9, or requested")
	tenantDeleteCmd.Flags().StringVar(&tenantCreateEndpoint, "endpoint", "", "ops worker URL (defaults to $GROVE_OPS_ENDPOINT)")
}

// ============================================================================
// Query building
// ============================================================================

// tenantListFilter turns the list flags into a WHERE clause.
func tenantListFilter(all, inactive, free bool) (string, error) {
	switch {
	case inactive && all:
		return "", fmt.Errorf("--inactive and --all contradict each other")
	case inactive && free:
		return "", fmt.Errorf("--inactive and --free contradict each other")
	case all:
		return "1 = 1", nil
	case inactive:
		return "t.active = 0", nil
	case free:
		return "t.active = 1 AND t.plan = 'wanderer'", nil
	default:
		return "t.active = 1", nil
	}
}

func tenantListSQL(filter string, limit int) string {
	if limit <= 0 || limit > 500 {
		limit = defaultListLimit
	}
	// tenants.post_count is never written by anything (it reads 0 for a tenant
	// with 13 posts), so count the posts table instead of trusting the column.
	return fmt.Sprintf(`SELECT t.subdomain, t.email, t.plan, t.active,
       (SELECT COUNT(*) FROM posts p WHERE p.tenant_id = t.id) AS post_count,
       t.created_at,
       (SELECT MAX(p.updated_at) FROM posts p WHERE p.tenant_id = t.id) AS last_publish
FROM tenants t
WHERE %s
ORDER BY t.created_at DESC
LIMIT %d`, filter, limit)
}

func tenantPostsSQL(tenantID string) string {
	return fmt.Sprintf(
		`SELECT count(*) AS posts, MAX(updated_at) AS last_publish, MIN(created_at) AS first_publish
FROM posts WHERE tenant_id = %s`,
		sqlString(tenantID),
	)
}

func tenantRecentPostsSQL(tenantID string) string {
	return fmt.Sprintf(
		`SELECT slug, title, created_at FROM posts WHERE tenant_id = %s ORDER BY created_at DESC LIMIT 5`,
		sqlString(tenantID),
	)
}

func identitySQL(email string) string {
	return fmt.Sprintf(
		`SELECT id, email, name, email_verified, created_at, login_count, banned, ban_reason
FROM ba_user WHERE lower(email) = lower(%s) LIMIT 1`,
		sqlString(email),
	)
}

func sessionsSQL(userID string) string {
	return fmt.Sprintf(
		`SELECT count(*) AS sessions, MAX(updated_at) AS last_session, MAX(ip_address) AS last_ip, MAX(user_agent) AS last_agent
FROM ba_session WHERE user_id = %s`,
		sqlString(userID),
	)
}

// setTenantActive flips tenants.active and verifies the result.
func setTenantActive(subdomain string, active bool) error {
	if err := validateSubdomain(subdomain); err != nil {
		return err
	}
	if err := requireCFSafety("tenant_suspend"); err != nil {
		return err
	}

	cfg := config.Get()
	desired := 0
	action := "tenant_suspend"
	if active {
		desired = 1
		action = "tenant_resume"
	}

	// Resolve first, so we never write an audit row against a tenant that
	// isn't there and never silently no-op on a typo.
	rows, err := exec.D1Query(
		engineDatabase,
		fmt.Sprintf(
			`SELECT id, subdomain, active FROM tenants WHERE subdomain = %s LIMIT 1`,
			sqlString(subdomain),
		),
	)
	if err != nil {
		return err
	}
	if len(rows) == 0 {
		return fmt.Errorf("no tenant with subdomain %q", subdomain)
	}
	tenantID := rowString(rows[0], "id")

	statements := fmt.Sprintf(
		`UPDATE tenants SET active = %d, updated_at = unixepoch() WHERE subdomain = %s; %s`,
		desired,
		sqlString(subdomain),
		auditInsertSQL(tenantID, action, tenantSuspendNote),
	)
	if _, err := exec.WranglerOutput(
		"d1", "execute", engineDatabase, "--remote", "--yes", "--command", statements,
	); err != nil {
		return err
	}

	if cfg.JSONMode {
		out, _ := json.Marshal(map[string]any{
			"subdomain": subdomain,
			"active":    active,
			"action":    action,
		})
		fmt.Println(string(out))
	} else if active {
		ui.Success(fmt.Sprintf("%s is active again", subdomain))
	} else {
		ui.Success(fmt.Sprintf("%s suspended (content untouched)", subdomain))
	}

	// The column changing is not the same as the site going dark — the TenantDO
	// keeps serving its cached config until it is flushed (#1677). Report what
	// the internet actually gets.
	probe, probeErr := probeSite(subdomain)
	if probeErr != nil {
		ui.Warning(fmt.Sprintf("Could not probe https://%s.grove.place: %v", subdomain, probeErr))
		ui.Hint(fmt.Sprintf("Verify by hand — a suspended tenant can still 200 from the TenantDO cache"))
		return nil
	}

	if verdict, msg := interpretStatus(probe, active); !verdict {
		ui.Warning(msg)
		ui.Hint(fmt.Sprintf(
			"Flush the DO, then re-check:\n  gw secret exec OPS_ADMIN_KEY --write -- bash -c 'curl -sS -X POST -H \"Authorization: Bearer $OPS_ADMIN_KEY\" <durable-objects-worker>/tenant/flush/%s'",
			subdomain,
		))
	} else {
		ui.Info(msg)
	}

	return nil
}

func auditInsertSQL(tenantID, action, reason string) string {
	if reason == "" {
		reason = "(no reason given)"
	}
	details, _ := json.Marshal(map[string]string{
		"actor":  "gw",
		"action": action,
		"reason": reason,
	})
	return fmt.Sprintf(
		`INSERT INTO audit_log (id, tenant_id, category, action, details, user_email, created_at)
VALUES (lower(hex(randomblob(16))), %s, 'admin', %s, %s, 'gw', unixepoch())`,
		sqlString(tenantID),
		sqlString(action),
		sqlString(string(details)),
	)
}

// ============================================================================
// Verification
// ============================================================================

func siteURL(subdomain string) string {
	return "https://" + subdomain + ".grove.place/"
}

// ============================================================================
// Creation
// ============================================================================

// tenantCreateTiers mirrors the engine's TierKey. Hardcoded here only because
// this side of the wire is Go; the endpoint validates against TIERS for real.
var tenantCreateTiers = []string{"wanderer", "seedling", "sapling", "oak", "evergreen"}

type tenantCreateResponse struct {
	Subdomain               string   `json:"subdomain"`
	TenantID                string   `json:"tenantId"`
	Written                 bool     `json:"written"`
	Plan                    int      `json:"plan"`
	Steps                   []string `json:"steps"`
	IdentityBlockOverridden bool     `json:"identityBlockOverridden"`
	Error                   string   `json:"error"`
	Message                 string   `json:"message"`
	Hint                    string   `json:"hint"`
}

func runTenantCreate(cmd *cobra.Command, _ []string) error {
	cfg := config.Get()

	if tenantCreateSubdomain == "" || tenantCreateEmail == "" {
		return fmt.Errorf("both --subdomain and --email are required")
	}
	if err := validateSubdomain(tenantCreateSubdomain); err != nil {
		return err
	}
	if err := validateEmail(tenantCreateEmail); err != nil {
		return err
	}
	if !containsString(tenantCreateTiers, tenantCreatePlan) {
		return fmt.Errorf("--plan must be one of %s", strings.Join(tenantCreateTiers, ", "))
	}

	createdAt, err := parseCreatedAt(tenantCreateCreatedAt)
	if err != nil {
		return err
	}

	// A dry run writes nothing, so it does not need --write. Everything else is
	// a signup bypass and does.
	if !tenantCreateDryRun {
		if err := requireCFSafety("tenant_create"); err != nil {
			return err
		}
	}

	endpoint, err := resolveOpsEndpoint(tenantCreateEndpoint)
	if err != nil {
		return err
	}

	payload := map[string]any{
		"subdomain":   tenantCreateSubdomain,
		"email":       tenantCreateEmail,
		"displayName": tenantCreateName,
		"plan":        tenantCreatePlan,
		"dryRun":      tenantCreateDryRun,
		"actor":       "gw",
	}
	if tenantCreateAccent != "" {
		payload["accentColor"] = tenantCreateAccent
	}
	if createdAt != nil {
		payload["createdAt"] = *createdAt
	}
	if tenantCreateGroveauth != "" {
		payload["groveauthId"] = tenantCreateGroveauth
	}
	if tenantCreateOnboarding != "" {
		payload["onboardingId"] = tenantCreateOnboarding
	}
	if tenantCreateForce != "" {
		payload["forceIdentity"] = tenantCreateForce
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	key, err := opsAdminKey()
	if err != nil {
		return err
	}

	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest(http.MethodPost, strings.TrimSuffix(endpoint, "/")+"/tenant/create", strings.NewReader(string(body)))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key)

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("could not reach the ops endpoint at %s: %w", endpoint, err)
	}
	defer resp.Body.Close()

	var out tenantCreateResponse
	_ = json.NewDecoder(resp.Body).Decode(&out)

	if resp.StatusCode >= 400 {
		if out.Message == "" {
			out.Message = fmt.Sprintf("endpoint returned %d", resp.StatusCode)
		}
		if out.Error == "identity_blocked" {
			ui.Error(out.Message)
			ui.Hint("Pass --force-identity \"<reason>\" to override; the reason lands in audit_log.")
			return fmt.Errorf("identity is on the signup deny list")
		}
		return fmt.Errorf("%s", out.Message)
	}

	if cfg.JSONMode {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(out)
	}

	if tenantCreateDryRun {
		ui.Info(fmt.Sprintf("Would create %s on the %s plan — %d writes, nothing changed:",
			tenantCreateSubdomain, tenantCreatePlan, out.Plan))
		for _, step := range out.Steps {
			fmt.Printf("  • %s\n", step)
		}
		ui.Hint("Run again with --write to create it.")
		return nil
	}

	ui.Success(fmt.Sprintf("Created %s (%s, %s plan)", out.Subdomain, out.TenantID, tenantCreatePlan))
	if out.IdentityBlockOverridden {
		ui.Warning("The identity deny list was overridden — the reason is in audit_log.")
	}

	// A row in D1 is not the same as a site that serves. Say what the internet
	// actually gets, the way suspend does.
	probe, probeErr := probeSite(out.Subdomain)
	if probeErr != nil {
		ui.Warning(fmt.Sprintf("Could not probe https://%s.grove.place: %v", out.Subdomain, probeErr))
		return nil
	}
	if probe.Code == http.StatusOK || probe.Code == http.StatusFound || probe.Code == http.StatusMovedPermanently {
		ui.Info(fmt.Sprintf("Site is serving (%d).", probe.Code))
	} else {
		ui.Warning(fmt.Sprintf("Site returned %d — the TenantDO may need a flush.", probe.Code))
	}

	return nil
}

type tenantRemoveResponse struct {
	Summary      string `json:"summary"`
	DryRun       bool   `json:"dryRun"`
	Aborted      bool   `json:"aborted"`
	Removed      int    `json:"removed"`
	Billing      *struct {
		None           bool   `json:"none"`
		SubscriptionID string `json:"subscriptionId"`
		Plan           string `json:"plan"`
		Cancelled      bool   `json:"cancelled"`
		Note           string `json:"note"`
	} `json:"billing"`
	IdentityPlan []struct {
		Table string `json:"table"`
		Rows  int    `json:"rows"`
	} `json:"identityPlan"`
	IdentitiesDeleted int      `json:"identitiesDeleted"`
	TenantRowDeleted  bool     `json:"tenantRowDeleted"`
	CacheEvicted      bool     `json:"cacheEvicted"`
	R2ObjectsDeleted  int      `json:"r2ObjectsDeleted"`
	Leftovers         []string `json:"leftovers"`
	Failures          []string `json:"failures"`
	AuditRecorded     bool     `json:"auditRecorded"`
	NotDone           struct {
		Identity string `json:"identity"`
		Email    string `json:"email"`
		Billing  string `json:"billing"`
	} `json:"notDone"`
	Error   string `json:"error"`
	Message string `json:"message"`
}

func runTenantDelete(cmd *cobra.Command, args []string) error {
	cfg := config.Get()
	subdomain := args[0]

	if err := validateSubdomain(subdomain); err != nil {
		return err
	}
	if tenantDeleteReason == "" {
		return fmt.Errorf("--reason is required: it becomes the audit trail for a permanent removal")
	}

	// Dry run unless --write. A removal is the one operation where a forgotten
	// flag must not mean "destroy".
	write := cfg.WriteFlag
	if !write && !tenantDeleteDryRun {
		ui.Info("Dry run (pass --write to actually remove)…")
	}

	endpoint, err := resolveOpsEndpoint(tenantCreateEndpoint)
	if err != nil {
		return err
	}
	key, err := opsAdminKey()
	if err != nil {
		return err
	}

	body, err := json.Marshal(map[string]any{
		"subdomain": subdomain,
		"reason":    tenantDeleteReason,
		"policy":    tenantDeletePolicy,
		"dryRun":    !write,
		"actor":     "gw",
	})
	if err != nil {
		return err
	}

	client := &http.Client{Timeout: 120 * time.Second}
	req, err := http.NewRequest(http.MethodPost, strings.TrimSuffix(endpoint, "/")+"/tenant/remove", strings.NewReader(string(body)))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key)

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("could not reach the ops endpoint at %s: %w", endpoint, err)
	}
	defer resp.Body.Close()

	var out tenantRemoveResponse
	_ = json.NewDecoder(resp.Body).Decode(&out)

	if resp.StatusCode >= 400 {
		if out.Message == "" {
			out.Message = fmt.Sprintf("endpoint returned %d", resp.StatusCode)
		}
		return fmt.Errorf("%s", out.Message)
	}

	if cfg.JSONMode {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(out)
	}

	fmt.Println(out.Summary)

	// An aborted removal stopped at the billing step and deleted nothing, so the
	// lines below (row survived, DO not evicted, site still serving) would each be
	// describing a removal that never started.
	if out.Aborted {
		ui.Warning("Nothing was deleted — the removal stopped before the sweep.")
		return fmt.Errorf("removal abandoned: %s", out.NotDone.Billing)
	}

	if out.DryRun {
		if len(out.IdentityPlan) > 0 {
			ui.Info("groveauth identity:")
			for _, row := range out.IdentityPlan {
				fmt.Printf("  • %s: %d rows\n", row.Table, row.Rows)
			}
		}
		ui.Hint("Nothing was deleted. Run again with --write to remove it.")
		return nil
	}

	if len(out.Leftovers) > 0 {
		ui.Warning("This removal is INCOMPLETE — rows remain:")
		for _, leftover := range out.Leftovers {
			fmt.Printf("  • %s\n", leftover)
		}
	}
	if len(out.Failures) > 0 {
		ui.Warning("Statements that failed:")
		for _, failure := range out.Failures {
			fmt.Printf("  • %s\n", failure)
		}
	}
	if !out.TenantRowDeleted {
		ui.Warning("The tenants row survived — the subdomain is still claimed.")
	} else {
		ui.Success("Tenant row deleted.")
	}
	if out.CacheEvicted {
		ui.Info("TenantDO evicted.")
	} else {
		ui.Warning("TenantDO was NOT evicted — the site may keep serving (#1677).")
	}

	// Say what was not done, rather than letting silence imply it was.
	if out.IdentitiesDeleted > 0 {
		ui.Info(fmt.Sprintf("groveauth identity deleted: %d rows.", out.IdentitiesDeleted))
	}
	if out.NotDone.Identity != "" {
		ui.Warning(out.NotDone.Identity)
	}
	if out.NotDone.Email != "" {
		ui.Warning(out.NotDone.Email)
	}

	probe, probeErr := probeSite(subdomain)
	if probeErr != nil {
		ui.Warning(fmt.Sprintf("Could not probe https://%s.grove.place: %v", subdomain, probeErr))
		return nil
	}
	ui.Info(describeProbe(probe))

	return nil
}

// parseCreatedAt accepts the three forms the help text promises: a unix
// timestamp, "30d" for thirty days ago, or YYYY-MM-DD at midnight UTC.
func parseCreatedAt(value string) (*int64, error) {
	if value == "" {
		return nil, nil
	}

	if strings.HasSuffix(value, "d") {
		days, err := strconv.Atoi(strings.TrimSuffix(value, "d"))
		if err != nil || days < 0 {
			return nil, fmt.Errorf("--created-at %q is not a number of days", value)
		}
		ts := time.Now().AddDate(0, 0, -days).Unix()
		return &ts, nil
	}

	if date, err := time.Parse("2006-01-02", value); err == nil {
		ts := date.UTC().Unix()
		return &ts, nil
	}

	ts, err := strconv.ParseInt(value, 10, 64)
	if err != nil || ts <= 0 {
		return nil, fmt.Errorf("--created-at %q is not a unix timestamp, 'Nd', or YYYY-MM-DD", value)
	}
	return &ts, nil
}

// resolveOpsEndpoint prefers the flag, then the environment. There is no
// built-in default on purpose: guessing a worker hostname is how a maintenance
// command silently talks to the wrong deployment.
func resolveOpsEndpoint(flagValue string) (string, error) {
	if flagValue != "" {
		return flagValue, nil
	}
	if env := os.Getenv("GROVE_OPS_ENDPOINT"); env != "" {
		return env, nil
	}
	return "", fmt.Errorf(
		"no ops endpoint: pass --endpoint or set GROVE_OPS_ENDPOINT (e.g. https://grove-durable-objects.<account>.workers.dev)",
	)
}

// opsAdminKey reads OPS_ADMIN_KEY from the vault. It is never printed, never
// logged, and never placed in an argument list.
func opsAdminKey() (string, error) {
	vault, err := vault.AutoUnlock()
	if err != nil {
		return "", fmt.Errorf("could not unlock the vault for OPS_ADMIN_KEY: %w", err)
	}
	key, ok := vault.Get("OPS_ADMIN_KEY")
	if !ok || key == "" {
		return "", fmt.Errorf("OPS_ADMIN_KEY is not in the vault (gw secret set OPS_ADMIN_KEY)")
	}
	return key, nil
}

func containsString(haystack []string, needle string) bool {
	for _, v := range haystack {
		if v == needle {
			return true
		}
	}
	return false
}

// probeResult is what a site answered. Redirects are reported, not followed.
type probeResult struct {
	Code     int
	Location string
	// GateRedirect is true when the answer is the human-check gate: a redirect to
	// /verify on the same host. Aspen only sends one for a tenant that resolves (#1734).
	GateRedirect bool
}

func probeSite(subdomain string) (probeResult, error) {
	return probeURL(siteURL(subdomain))
}

// probeURL asks for a page and says what came back, without following redirects.
// Following them is what hid this: a 302 to /verify landed on the /verify page, which
// answers 200 for any subdomain, so a suspended site read as alive.
func probeURL(rawURL string) (probeResult, error) {
	client := &http.Client{
		Timeout: siteProbeTimeout,
		CheckRedirect: func(*http.Request, []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	resp, err := client.Get(rawURL)
	if err != nil {
		return probeResult{}, err
	}
	defer resp.Body.Close()

	result := probeResult{Code: resp.StatusCode, Location: resp.Header.Get("Location")}
	if resp.StatusCode >= 300 && resp.StatusCode < 400 && result.Location != "" {
		// Resolve against the request, so a relative "/verify?..." and an absolute URL on
		// the same host are read the same way; a lookalike path or another host is not the gate.
		if target, err := resp.Request.URL.Parse(result.Location); err == nil {
			result.GateRedirect = target.Host == resp.Request.URL.Host &&
				(target.Path == "/verify" || strings.HasPrefix(target.Path, "/verify/"))
		}
	}
	return result, nil
}

// interpretStatus says whether the probe agrees with what we just did.
//
// A suspended or removed tenant answers 404, with no redirect. The human-check gate runs after
// the tenant lookup (#1734), so a 302 to /verify means the tenant still resolves: the gate has
// someone to protect. That is "not suspended", never "dark".
func interpretStatus(p probeResult, wantActive bool) (bool, string) {
	live := p.Code == 200 || p.Code == 302 || p.Code == 301
	if wantActive {
		switch {
		case p.GateRedirect:
			return true, fmt.Sprintf("Site is serving again (%d to /verify, the human check).", p.Code)
		case live:
			return true, fmt.Sprintf("Site is serving again (%d).", p.Code)
		}
		return false, fmt.Sprintf("Site returned %d — still not serving, may need a DO flush.", p.Code)
	}
	switch {
	case p.Code == 404 || p.Code == 410:
		return true, fmt.Sprintf("Site is dark (%d).", p.Code)
	case p.GateRedirect:
		return false, fmt.Sprintf(
			"Site answers %d to /verify, so the tenant still resolves and is not suspended yet. "+
				"A suspended site answers 404. The TenantDO cache may be warm (#1677), "+
				"or the Aspen change that runs the human check after the tenant lookup (#1734) has not deployed.",
			p.Code,
		)
	case live:
		return false, fmt.Sprintf(
			"Site still returns %d — the TenantDO cache may still be warm (#1677).",
			p.Code,
		)
	default:
		return false, fmt.Sprintf("Site returned %d — unusual; verify by hand.", p.Code)
	}
}

// describeProbe says in a sentence what a probe saw, for commands that report but do not judge.
func describeProbe(p probeResult) string {
	switch {
	case p.Code == 404 || p.Code == 410:
		return fmt.Sprintf("Site returned %d — gone.", p.Code)
	case p.GateRedirect:
		return fmt.Sprintf(
			"Site answered %d to /verify, the human check: the tenant still resolves (#1734).",
			p.Code,
		)
	case p.Location != "":
		return fmt.Sprintf("Site returned %d, redirecting to %s.", p.Code, p.Location)
	default:
		return fmt.Sprintf("Site returned %d.", p.Code)
	}
}

// ============================================================================
// Rendering
// ============================================================================

const noValue = "—"

func renderTenantTable(rows []map[string]any, now time.Time) string {
	headers := []string{"SUBDOMAIN", "EMAIL", "PLAN", "POSTS", "SIGNED UP", "LAST PUBLISH"}
	table := make([][]string, 0, len(rows)+1)
	table = append(table, headers)

	for _, r := range rows {
		plan := rowString(r, "plan")
		if rowInt(r, "active") == 0 {
			plan += " (off)"
		}
		table = append(table, []string{
			rowString(r, "subdomain"),
			truncate(rowString(r, "email"), 32),
			plan,
			fmt.Sprintf("%d", rowInt(r, "post_count")),
			ageLabel(rowInt(r, "created_at"), now),
			ageLabel(rowInt(r, "last_publish"), now),
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

func renderTenantDetail(
	tenant, posts, identity, sessions map[string]any,
	now time.Time,
) string {
	active := rowInt(tenant, "active") == 1
	state := "active"
	if !active {
		state = "SUSPENDED"
	}

	var b strings.Builder
	fmt.Fprintf(&b, "%s  ·  %s\n", rowString(tenant, "subdomain"), state)
	fmt.Fprintf(&b, "%s\n\n", rowString(tenant, "display_name"))

	pairs := [][2]string{
		{"Email", orNoValue(rowString(tenant, "email"))},
		{"Plan", orNoValue(rowString(tenant, "plan"))},
		{"Tenant ID", orNoValue(rowString(tenant, "id"))},
		{"Custom domain", orNoValue(rowString(tenant, "custom_domain"))},
		{"Signed up", ageLabel(rowInt(tenant, "created_at"), now)},
		{"Storage", storageLabel(rowInt(tenant, "storage_used"))},
	}
	if posts != nil {
		pairs = append(pairs,
			[2]string{"Posts", fmt.Sprintf("%d", rowInt(posts, "posts"))},
			[2]string{"First publish", ageLabel(rowInt(posts, "first_publish"), now)},
			[2]string{"Last publish", ageLabel(rowInt(posts, "last_publish"), now)},
		)
	}
	b.WriteString(ui.RenderInfoPanel("Tenant", pairs))

	if identity != nil {
		banner := "verified"
		if rowInt(identity, "email_verified") == 0 {
			banner = "unverified"
		}
		if rowInt(identity, "banned") != 0 {
			banner = "BANNED: " + orNoValue(rowString(identity, "ban_reason"))
		}
		idPairs := [][2]string{
			{"Email", orNoValue(rowString(identity, "email")) + " (" + banner + ")"},
			{"Name", orNoValue(rowString(identity, "name"))},
			{"User ID", orNoValue(rowString(identity, "id"))},
			{"Registered", ageLabel(rowInt(identity, "created_at"), now)},
			{"Logins", fmt.Sprintf("%d", rowInt(identity, "login_count"))},
		}
		if sessions != nil {
			idPairs = append(idPairs,
				[2]string{"Sessions", fmt.Sprintf("%d", rowInt(sessions, "sessions"))},
				[2]string{"Last session", ageLabel(rowInt(sessions, "last_session"), now)},
			)
		}
		b.WriteString("\n" + ui.RenderInfoPanel("Identity", idPairs))
	} else {
		b.WriteString("\nNo Better Auth identity for " + orNoValue(rowString(tenant, "email")) + "\n")
	}

	return b.String()
}

// ============================================================================
// Small helpers
// ============================================================================

// sqlString quotes a value as a SQL literal. Every value that reaches D1 goes
// through this: wrangler's --command takes no bind parameters, so quoting is
// the whole injection boundary.
func sqlString(v string) string {
	return "'" + strings.ReplaceAll(v, "'", "''") + "'"
}

func validateSubdomain(v string) error {
	if !subdomainPattern.MatchString(v) {
		return fmt.Errorf("%q is not a valid subdomain", v)
	}
	return nil
}

func validateEmail(v string) error {
	if len(v) > 254 || !emailPattern.MatchString(v) {
		return fmt.Errorf("%q is not a valid email address", v)
	}
	return nil
}

func rowString(row map[string]any, key string) string {
	v, ok := row[key]
	if !ok || v == nil {
		return ""
	}
	switch typed := v.(type) {
	case string:
		return typed
	case float64:
		return fmt.Sprintf("%d", int64(typed))
	case bool:
		if typed {
			return "1"
		}
		return "0"
	default:
		return fmt.Sprintf("%v", typed)
	}
}

func rowInt(row map[string]any, key string) int64 {
	v, ok := row[key]
	if !ok || v == nil {
		return 0
	}
	switch typed := v.(type) {
	case float64:
		return int64(typed)
	case int64:
		return typed
	case int:
		return int64(typed)
	case bool:
		if typed {
			return 1
		}
		return 0
	case string:
		var n int64
		fmt.Sscanf(typed, "%d", &n)
		return n
	default:
		return 0
	}
}

func firstRow(rows []map[string]any) map[string]any {
	if len(rows) == 0 {
		return nil
	}
	return rows[0]
}

func orNoValue(v string) string {
	if v == "" {
		return noValue
	}
	return v
}

func padRight(v string, width int) string {
	if w := displayWidth(v); w >= width {
		return v
	} else {
		return v + strings.Repeat(" ", width-w)
	}
}

// ageLabel renders a unix timestamp as a short age. 0 means "never", which is
// also what a missing column reads as — so say so rather than printing 1970.
func ageLabel(unix int64, now time.Time) string {
	if unix <= 0 {
		return noValue
	}
	delta := now.Sub(time.Unix(unix, 0))
	if delta < 0 {
		return "just now"
	}
	switch {
	case delta < time.Minute:
		return "just now"
	case delta < time.Hour:
		return fmt.Sprintf("%dm ago", int(delta.Minutes()))
	case delta < 24*time.Hour:
		return fmt.Sprintf("%dh ago", int(delta.Hours()))
	case delta < 30*24*time.Hour:
		return fmt.Sprintf("%dd ago", int(delta.Hours()/24))
	default:
		return fmt.Sprintf("%dmo ago", int(delta.Hours()/24/30))
	}
}

func storageLabel(bytes int64) string {
	switch {
	case bytes <= 0:
		return "0 B"
	case bytes < 1024:
		return fmt.Sprintf("%d B", bytes)
	case bytes < 1024*1024:
		return fmt.Sprintf("%.1f KB", float64(bytes)/1024)
	case bytes < 1024*1024*1024:
		return fmt.Sprintf("%.1f MB", float64(bytes)/(1024*1024))
	default:
		return fmt.Sprintf("%.2f GB", float64(bytes)/(1024*1024*1024))
	}
}
