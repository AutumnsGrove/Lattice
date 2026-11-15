package cmd

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
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
	subdomainPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,62}$`)
	emailPattern     = regexp.MustCompile(`^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$`)

	tenantListAll      bool
	tenantListInactive bool
	tenantListFree     bool
	tenantListLimit    int
	tenantShowEmail    string
	tenantSuspendNote  string
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
	tenantCmd.AddCommand(tenantListCmd, tenantShowCmd, tenantSuspendCmd, tenantResumeCmd)

	tenantListCmd.Flags().BoolVar(&tenantListAll, "all", false, "include suspended tenants")
	tenantListCmd.Flags().BoolVar(&tenantListInactive, "inactive", false, "only suspended tenants")
	tenantListCmd.Flags().BoolVar(&tenantListFree, "free", false, "only wanderer-tier tenants")
	tenantListCmd.Flags().IntVar(&tenantListLimit, "limit", defaultListLimit, "maximum rows")

	tenantShowCmd.Flags().StringVar(&tenantShowEmail, "email", "", "look the tenant up by email")
	tenantSuspendCmd.Flags().StringVar(&tenantSuspendNote, "reason", "", "why (recorded in audit_log)")
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
	code, probeErr := probeSite(subdomain)
	if probeErr != nil {
		ui.Warning(fmt.Sprintf("Could not probe https://%s.grove.place: %v", subdomain, probeErr))
		ui.Hint(fmt.Sprintf("Verify by hand — a suspended tenant can still 200 from the TenantDO cache"))
		return nil
	}

	if verdict, msg := interpretStatus(code, active); !verdict {
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

func probeSite(subdomain string) (int, error) {
	client := &http.Client{Timeout: siteProbeTimeout}
	resp, err := client.Get(siteURL(subdomain))
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	return resp.StatusCode, nil
}

// interpretStatus says whether the probe agrees with what we just did.
// A live Grove site answers 200 (or 302 to /verify). A gone one answers 404.
func interpretStatus(code int, wantActive bool) (bool, string) {
	live := code == 200 || code == 302 || code == 301
	if wantActive {
		if live {
			return true, fmt.Sprintf("Site is serving again (%d).", code)
		}
		return false, fmt.Sprintf("Site returned %d — still not serving, may need a DO flush.", code)
	}
	switch {
	case code == 404 || code == 410:
		return true, fmt.Sprintf("Site is dark (%d).", code)
	case live:
		return false, fmt.Sprintf(
			"Site still returns %d — the TenantDO cache may still be warm (#1677).",
			code,
		)
	default:
		return false, fmt.Sprintf("Site returned %d — unusual; verify by hand.", code)
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
