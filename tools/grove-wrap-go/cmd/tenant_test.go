package cmd

import (
	"strings"
	"testing"
	"time"
)

func TestTenantListFilter(t *testing.T) {
	cases := []struct {
		name     string
		all      bool
		inactive bool
		free     bool
		want     string
		wantErr  bool
	}{
		{name: "default is active only", want: "t.active = 1"},
		{name: "all includes suspended", all: true, want: "1 = 1"},
		{name: "inactive only", inactive: true, want: "t.active = 0"},
		{name: "free tier", free: true, want: "t.active = 1 AND t.plan = 'wanderer'"},
		{name: "inactive + all contradict", inactive: true, all: true, wantErr: true},
		{name: "inactive + free contradict", inactive: true, free: true, wantErr: true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := tenantListFilter(tc.all, tc.inactive, tc.free)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected an error, got filter %q", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("filter = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestTenantListSQLShape(t *testing.T) {
	sql := tenantListSQL("t.active = 1", 10)
	for _, want := range []string{"FROM tenants t", "WHERE t.active = 1", "LIMIT 10", "posts"} {
		if !strings.Contains(sql, want) {
			t.Errorf("list SQL missing %q:\n%s", want, sql)
		}
	}

	// Out-of-range limits fall back rather than producing "LIMIT 0" or "LIMIT -1"
	// (LIMIT -1 in SQLite means unlimited, which is the opposite of safe).
	for _, bad := range []int{0, -1, 5000} {
		if sql := tenantListSQL("1 = 1", bad); !strings.Contains(sql, "LIMIT 25") {
			t.Errorf("limit %d was not clamped:\n%s", bad, sql)
		}
	}
}

func TestSQLStringQuoting(t *testing.T) {
	cases := map[string]string{
		"autumn":            "'autumn'",
		"o'brien":           "'o''brien'",
		"'; DROP TABLE x--": "'''; DROP TABLE x--'",
	}
	for in, want := range cases {
		if got := sqlString(in); got != want {
			t.Errorf("sqlString(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestInputValidationRejectsInjection(t *testing.T) {
	badSubdomains := []string{
		"",
		"autumn'",
		"autumn; DROP TABLE tenants",
		"Autumn",
		"-autumn",
		"a b",
		strings.Repeat("a", 64),
	}
	for _, v := range badSubdomains {
		if err := validateSubdomain(v); err == nil {
			t.Errorf("subdomain %q was accepted", v)
		}
	}
	for _, v := range []string{"autumn", "a2a0", "hello-world", strings.Repeat("a", 63)} {
		if err := validateSubdomain(v); err != nil {
			t.Errorf("subdomain %q was rejected: %v", v, err)
		}
	}

	badEmails := []string{"", "not-an-email", "a@b", "a'b@example.com", "a b@example.com"}
	for _, v := range badEmails {
		if err := validateEmail(v); err == nil {
			t.Errorf("email %q was accepted", v)
		}
	}
	for _, v := range []string{"emma@upsampler.com", "maplecrest+ella@mail.grokbot.com"} {
		if err := validateEmail(v); err != nil {
			t.Errorf("email %q was rejected: %v", v, err)
		}
	}
}

func TestAuditInsertCarriesReasonAndActor(t *testing.T) {
	sql := auditInsertSQL("tenant-uuid-1", "tenant_suspend", "link farm")

	for _, want := range []string{
		"INSERT INTO audit_log",
		"'tenant-uuid-1'",
		"'tenant_suspend'",
		"'gw'",
		"link farm",
		"unixepoch()",
	} {
		if !strings.Contains(sql, want) {
			t.Errorf("audit SQL missing %q:\n%s", want, sql)
		}
	}

	// A reason with a quote must not break the statement.
	sql = auditInsertSQL("t", "tenant_suspend", "he said 'stop'")
	if !strings.Contains(sql, "he said ''stop''") {
		t.Errorf("reason was not escaped:\n%s", sql)
	}

	// Empty reason still records something readable.
	if !strings.Contains(auditInsertSQL("t", "tenant_suspend", ""), "no reason given") {
		t.Error("empty reason should be recorded explicitly")
	}
}

func TestInterpretStatus(t *testing.T) {
	cases := []struct {
		code       int
		wantActive bool
		ok         bool
	}{
		{200, false, false}, // suspended but still serving: the #1677 symptom
		{302, false, false}, // redirect to /verify: still live
		{404, false, true},
		{410, false, true},
		{500, false, false},
		{200, true, true},
		{302, true, true},
		{404, true, false}, // resumed but still dark: needs a DO flush
	}
	for _, tc := range cases {
		got, _ := interpretStatus(tc.code, tc.wantActive)
		if got != tc.ok {
			t.Errorf("interpretStatus(%d, active=%v) = %v, want %v", tc.code, tc.wantActive, got, tc.ok)
		}
	}
}

func TestAgeLabel(t *testing.T) {
	now := time.Date(2026, 11, 17, 12, 0, 0, 0, time.UTC)
	cases := []struct {
		unix int64
		want string
	}{
		{0, noValue},
		{-5, noValue},
		{now.Add(-30 * time.Second).Unix(), "just now"},
		{now.Add(-5 * time.Minute).Unix(), "5m ago"},
		{now.Add(-3 * time.Hour).Unix(), "3h ago"},
		{now.Add(-4 * 24 * time.Hour).Unix(), "4d ago"},
		{now.Add(-90 * 24 * time.Hour).Unix(), "3mo ago"},
	}
	for _, tc := range cases {
		if got := ageLabel(tc.unix, now); got != tc.want {
			t.Errorf("ageLabel(%d) = %q, want %q", tc.unix, got, tc.want)
		}
	}
}

func TestRenderTenantTableMarksSuspended(t *testing.T) {
	now := time.Date(2026, 11, 17, 12, 0, 0, 0, time.UTC)
	rows := []map[string]any{
		{
			"subdomain":    "autumn",
			"email":        "autumn@grove.place",
			"plan":         "oak",
			"active":       float64(1),
			"post_count":   float64(42),
			"created_at":   float64(now.Add(-100 * 24 * time.Hour).Unix()),
			"last_publish": float64(now.Add(-2 * time.Hour).Unix()),
		},
		{
			"subdomain":  "tianjidu",
			"email":      "saliowawa@gmail.com",
			"plan":       "wanderer",
			"active":     float64(0),
			"post_count": float64(1),
			"created_at": float64(now.Add(-20 * 24 * time.Hour).Unix()),
		},
	}

	out := renderTenantTable(rows, now)

	for _, want := range []string{"SUBDOMAIN", "autumn", "tianjidu", "oak", "wanderer (off)", "42", "2h ago"} {
		if !strings.Contains(out, want) {
			t.Errorf("table missing %q:\n%s", want, out)
		}
	}
	// A missing last_publish must not render as 1970.
	if strings.Contains(out, "56y") || strings.Contains(out, "1970") {
		t.Errorf("missing timestamps rendered as an epoch date:\n%s", out)
	}
}

func TestRenderTenantDetailSurfacesBannedIdentity(t *testing.T) {
	now := time.Date(2026, 11, 17, 12, 0, 0, 0, time.UTC)
	tenant := map[string]any{
		"subdomain":    "glm5notes",
		"display_name": "Grace Turner",
		"email":        "maplecrest+grace@mail.grokbot.com",
		"plan":         "wanderer",
		"active":       float64(0),
		"storage_used": float64(0),
		"created_at":   float64(now.Add(-3 * 24 * time.Hour).Unix()),
	}
	identity := map[string]any{
		"id":             "user-1",
		"email":          "maplecrest+grace@mail.grokbot.com",
		"email_verified": float64(1),
		"created_at":     float64(now.Add(-3 * 24 * time.Hour).Unix()),
		"login_count":    float64(1),
		"banned":         float64(1),
		"ban_reason":     "link farm",
	}

	out := renderTenantDetail(tenant, nil, identity, nil, now)

	if !strings.Contains(out, "SUSPENDED") {
		t.Errorf("detail did not flag a suspended tenant:\n%s", out)
	}
	if !strings.Contains(out, "BANNED: link farm") {
		t.Errorf("detail did not surface the ban state:\n%s", out)
	}
	if !strings.Contains(out, "maplecrest+grace@mail.grokbot.com") {
		t.Errorf("detail did not show the email:\n%s", out)
	}
}

func TestRenderTenantDetailWithoutIdentity(t *testing.T) {
	now := time.Now()
	tenant := map[string]any{
		"subdomain":    "jevnotes",
		"display_name": "Ella Moore",
		"email":        "gone@example.com",
		"active":       float64(1),
	}

	out := renderTenantDetail(tenant, nil, nil, nil, now)

	if !strings.Contains(out, "No Better Auth identity") {
		t.Errorf("missing identity should be stated, not left blank:\n%s", out)
	}
}

func TestStorageLabel(t *testing.T) {
	cases := map[int64]string{
		0:               "0 B",
		512:             "512 B",
		2048:            "2.0 KB",
		5 * 1024 * 1024: "5.0 MB",
	}
	for in, want := range cases {
		if got := storageLabel(in); got != want {
			t.Errorf("storageLabel(%d) = %q, want %q", in, got, want)
		}
	}
}
