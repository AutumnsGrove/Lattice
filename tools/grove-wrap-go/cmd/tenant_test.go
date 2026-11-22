package cmd

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
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

// gate is what the probe sees when the human-check gate answers: a redirect to /verify.
var gate = probeResult{Code: 302, Location: "/verify?return=%2F", GateRedirect: true}

func TestInterpretStatus(t *testing.T) {
	cases := []struct {
		name       string
		probe      probeResult
		wantActive bool
		ok         bool
	}{
		{"suspended but still serving: the #1677 symptom", probeResult{Code: 200}, false, false},
		{"suspended but the gate still answers: the tenant still resolves", gate, false, false},
		{"suspended and gone", probeResult{Code: 404}, false, true},
		{"suspended and gone, 410", probeResult{Code: 410}, false, true},
		{"suspended, server error", probeResult{Code: 500}, false, false},
		{"suspended but redirecting elsewhere", probeResult{Code: 302, Location: "https://new.grove.place/"}, false, false},
		{"resumed and serving", probeResult{Code: 200}, true, true},
		{"resumed and the gate answers: it resolves", gate, true, true},
		{"resumed and redirecting elsewhere", probeResult{Code: 301, Location: "https://new.grove.place/"}, true, true},
		{"resumed but still dark: needs a DO flush", probeResult{Code: 404}, true, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, _ := interpretStatus(tc.probe, tc.wantActive)
			if got != tc.ok {
				t.Errorf("interpretStatus(%+v, active=%v) = %v, want %v", tc.probe, tc.wantActive, got, tc.ok)
			}
		})
	}
}

func TestInterpretStatusSaysWhatTheGateMeans(t *testing.T) {
	// The whole point of #1734: a 302 to /verify is the gate answering, and since the gate now
	// runs after the tenant lookup, it only answers for a tenant that resolves. So it must never
	// read as "suspended", and the message has to say why.
	_, msg := interpretStatus(gate, false)
	for _, want := range []string{"/verify", "not suspended", "404"} {
		if !strings.Contains(msg, want) {
			t.Errorf("suspend verdict for the gate redirect should mention %q, got: %s", want, msg)
		}
	}

	// A suspended tenant that went dark does not mention the gate at all.
	_, dark := interpretStatus(probeResult{Code: 404}, false)
	if strings.Contains(dark, "/verify") || !strings.Contains(dark, "dark") {
		t.Errorf("dark verdict should be plain, got: %s", dark)
	}

	// Resuming reads as serving, and says the gate is what answered.
	ok, serving := interpretStatus(gate, true)
	if !ok || !strings.Contains(serving, "/verify") {
		t.Errorf("resumed + gate should read as serving and name the gate, got: %v %s", ok, serving)
	}
}

func TestDescribeProbe(t *testing.T) {
	cases := []struct {
		name  string
		probe probeResult
		want  []string
	}{
		{"gone", probeResult{Code: 404}, []string{"404", "gone"}},
		{"gate answers: the tenant resolves", gate, []string{"/verify", "resolves"}},
		{"serving", probeResult{Code: 200}, []string{"200"}},
		{"redirecting elsewhere", probeResult{Code: 302, Location: "https://new.grove.place/"}, []string{"302", "https://new.grove.place/"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := describeProbe(tc.probe)
			for _, want := range tc.want {
				if !strings.Contains(got, want) {
					t.Errorf("describeProbe(%+v) = %q, want it to mention %q", tc.probe, got, want)
				}
			}
		})
	}

	// The note the remove command used to print said the opposite of what is now true.
	if strings.Contains(describeProbe(gate), "not the tenant") {
		t.Error("a gate redirect now means the tenant resolves; the old 'not the tenant' wording must be gone")
	}
}

func TestProbeURL(t *testing.T) {
	var requests int32
	mux := http.NewServeMux()
	count := func(h http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			atomic.AddInt32(&requests, 1)
			h(w, r)
		}
	}
	mux.HandleFunc("/ok", count(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) }))
	mux.HandleFunc("/gone", count(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(404) }))
	mux.HandleFunc("/gate", count(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/verify?return=%2F", http.StatusFound)
	}))
	mux.HandleFunc("/gate-absolute", count(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "http://"+r.Host+"/verify?return=%2F", http.StatusFound)
	}))
	mux.HandleFunc("/gate-permanent", count(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/verify", http.StatusMovedPermanently)
	}))
	mux.HandleFunc("/elsewhere", count(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/somewhere-else", http.StatusFound)
	}))
	mux.HandleFunc("/other-host", count(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "https://other.example/verify", http.StatusFound)
	}))
	mux.HandleFunc("/no-location", count(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(302) }))
	mux.HandleFunc("/verify-lookalike", count(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/verifying", http.StatusFound)
	}))
	mux.HandleFunc("/verify", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) })
	server := httptest.NewServer(mux)
	defer server.Close()

	cases := []struct {
		path     string
		code     int
		gate     bool
		location string
	}{
		{"/ok", 200, false, ""},
		{"/gone", 404, false, ""},
		{"/gate", 302, true, "/verify?return=%2F"},
		{"/gate-absolute", 302, true, ""},
		{"/gate-permanent", 301, true, "/verify"},
		{"/elsewhere", 302, false, "/somewhere-else"},
		{"/other-host", 302, false, "https://other.example/verify"},
		{"/no-location", 302, false, ""},
		{"/verify-lookalike", 302, false, "/verifying"},
	}
	for _, tc := range cases {
		t.Run(tc.path, func(t *testing.T) {
			atomic.StoreInt32(&requests, 0)
			got, err := probeURL(server.URL + tc.path)
			if err != nil {
				t.Fatal(err)
			}
			if got.Code != tc.code || got.GateRedirect != tc.gate {
				t.Errorf("probeURL(%s) = %+v, want code %d gate %v", tc.path, got, tc.code, tc.gate)
			}
			if tc.location != "" && got.Location != tc.location {
				t.Errorf("location = %q, want %q", got.Location, tc.location)
			}
			// A redirect is reported, never followed: following /gate would land on /verify and
			// read as a 200, which is exactly how a suspended site used to look alive.
			if n := atomic.LoadInt32(&requests); n != 1 {
				t.Errorf("probe made %d requests to the counted handler, want exactly 1", n)
			}
		})
	}

	t.Run("an unreachable site is an error, not a verdict", func(t *testing.T) {
		if _, err := probeURL("http://127.0.0.1:1/"); err == nil {
			t.Error("expected an error probing a closed port")
		}
	})
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

func TestParseCreatedAt(t *testing.T) {
	now := time.Now()

	t.Run("empty means now", func(t *testing.T) {
		got, err := parseCreatedAt("")
		if err != nil || got != nil {
			t.Fatalf("expected nil, nil; got %v, %v", got, err)
		}
	})

	t.Run("unix timestamp passes through", func(t *testing.T) {
		got, err := parseCreatedAt("1700000000")
		if err != nil || got == nil || *got != 1700000000 {
			t.Fatalf("got %v, %v", got, err)
		}
	})

	t.Run("days-ago form", func(t *testing.T) {
		got, err := parseCreatedAt("30d")
		if err != nil || got == nil {
			t.Fatalf("got %v, %v", got, err)
		}
		// Allow a day of slack so this cannot flake across a DST or midnight edge.
		drift := now.AddDate(0, 0, -30).Unix() - *got
		if drift < -86400 || drift > 86400 {
			t.Fatalf("30d resolved to %d, want about %d", *got, now.AddDate(0, 0, -30).Unix())
		}
	})

	t.Run("calendar date is midnight UTC", func(t *testing.T) {
		got, err := parseCreatedAt("2026-01-15")
		if err != nil || got == nil {
			t.Fatalf("got %v, %v", got, err)
		}
		want := time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC).Unix()
		if *got != want {
			t.Fatalf("got %d, want %d", *got, want)
		}
	})

	t.Run("rejects nonsense", func(t *testing.T) {
		for _, bad := range []string{"yesterday", "-5", "0", "3x", "2026-13-40"} {
			if _, err := parseCreatedAt(bad); err == nil {
				t.Fatalf("expected %q to be rejected", bad)
			}
		}
	})
}

func TestSubdomainPatternMatchesTheEngine(t *testing.T) {
	// libs/engine/src/lib/utils/grove-url.ts: no trailing hyphen, no leading
	// hyphen, 1-63 chars. gw used to accept a trailing one and the endpoint
	// then refused it, which is a confusing way to fail.
	valid := []string{"autumn", "a", "midnight-bloom", "garden-2"}
	invalid := []string{"", "-autumn", "autumn-", "Autumn", "autumn_grove", "a.b", strings.Repeat("a", 64)}

	for _, v := range valid {
		if !subdomainPattern.MatchString(v) {
			t.Errorf("%q should be valid", v)
		}
	}
	for _, v := range invalid {
		if subdomainPattern.MatchString(v) {
			t.Errorf("%q should be invalid", v)
		}
	}
}

func TestResolveOpsEndpoint(t *testing.T) {
	t.Run("flag wins", func(t *testing.T) {
		got, err := resolveOpsEndpoint("https://ops.example")
		if err != nil || got != "https://ops.example" {
			t.Fatalf("got %q, %v", got, err)
		}
	})

	t.Run("environment next", func(t *testing.T) {
		t.Setenv("GROVE_OPS_ENDPOINT", "https://env.example")
		got, err := resolveOpsEndpoint("")
		if err != nil || got != "https://env.example" {
			t.Fatalf("got %q, %v", got, err)
		}
	})

	t.Run("refuses to guess", func(t *testing.T) {
		t.Setenv("GROVE_OPS_ENDPOINT", "")
		if _, err := resolveOpsEndpoint(""); err == nil {
			t.Fatal("expected an error rather than a guessed hostname")
		}
	})
}
