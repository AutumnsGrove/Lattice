package cmd

import (
	"strings"
	"testing"
	"time"
)

func TestValidateBlockValue(t *testing.T) {
	cases := []struct {
		name    string
		kind    string
		raw     string
		want    string
		wantErr bool
	}{
		{name: "domain is lowercased", kind: "domain", raw: "Mail.GrokBot.com", want: "mail.grokbot.com"},
		{name: "domain drops a leading @", kind: "domain", raw: "@grokbot.com", want: "grokbot.com"},
		{name: "domain drops a trailing dot", kind: "domain", raw: "grokbot.com.", want: "grokbot.com"},
		{name: "email drops the alias", kind: "email", raw: "MapleCrest+Ella@Mail.GrokBot.com", want: "maplecrest@mail.grokbot.com"},
		{name: "substring is lowercased", kind: "substring", raw: "OpenClaw", want: "openclaw"},
		{name: "unknown kind", kind: "regex", raw: "x", wantErr: true},
		{name: "empty value", kind: "domain", raw: "   ", wantErr: true},
		{name: "domain with a quote", kind: "domain", raw: "grokbot.com'", wantErr: true},
		{name: "domain with a space", kind: "domain", raw: "grok bot.com", wantErr: true},
		{name: "domain with a semicolon", kind: "domain", raw: "grokbot.com; DROP TABLE signup_blocks", wantErr: true},
		{name: "bare word is not a domain", kind: "domain", raw: "grokbot", wantErr: true},
		{name: "email without a tld", kind: "email", raw: "a@b", wantErr: true},
		{name: "overlong value", kind: "substring", raw: strings.Repeat("a", 300), wantErr: true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := validateBlockValue(tc.kind, tc.raw)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected an error, got %q", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("value = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestParseBlockExpiry(t *testing.T) {
	now := time.Date(2026, 11, 17, 12, 0, 0, 0, time.UTC)

	t.Run("empty means permanent", func(t *testing.T) {
		got, err := parseBlockExpiry("", now)
		if err != nil || got != nil {
			t.Fatalf("got %v, %v", got, err)
		}
	})

	t.Run("days suffix", func(t *testing.T) {
		got, err := parseBlockExpiry("14d", now)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		want := now.Add(14 * 24 * time.Hour).Unix()
		if got == nil || *got != want {
			t.Fatalf("got %v, want %d", got, want)
		}
	})

	t.Run("go duration", func(t *testing.T) {
		got, err := parseBlockExpiry("48h", now)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got == nil || *got != now.Add(48*time.Hour).Unix() {
			t.Fatalf("got %v", got)
		}
	})

	t.Run("absolute date", func(t *testing.T) {
		got, err := parseBlockExpiry("2026-12-01", now)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		want := time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC).Unix()
		if got == nil || *got != want {
			t.Fatalf("got %v, want %d", got, want)
		}
	})

	t.Run("garbage is rejected", func(t *testing.T) {
		if _, err := parseBlockExpiry("next tuesday", now); err == nil {
			t.Fatal("expected an error")
		}
	})
}

func TestBlockUpsertSQL(t *testing.T) {
	expires := time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC).Unix()
	sql := blockUpsertSQL("domain", "mail.grokbot.com", "agent mailbox", "manual", &expires)

	for _, want := range []string{
		"INSERT INTO signup_blocks",
		"'domain'",
		"'mail.grokbot.com'",
		"'agent mailbox'",
		"ON CONFLICT(kind, value) DO UPDATE",
	} {
		if !strings.Contains(sql, want) {
			t.Errorf("upsert SQL missing %q:\n%s", want, sql)
		}
	}

	// Permanent blocks must write NULL, not 0 (0 would read as expired).
	permanent := blockUpsertSQL("domain", "example.com", "", "manual", nil)
	if strings.Contains(permanent, ", 0,") || strings.Contains(permanent, "'0'") {
		t.Errorf("permanent block should use NULL expiry:\n%s", permanent)
	}
}

func TestBlockDeleteSQLQuotesValues(t *testing.T) {
	sql := blockDeleteSQL("email", "o'brien@example.com")
	if !strings.Contains(sql, "o''brien@example.com") {
		t.Errorf("value was not escaped:\n%s", sql)
	}
}

func TestBlockListSQLHidesExpiredByDefault(t *testing.T) {
	if sql := blockListSQL(false); !strings.Contains(sql, "expires_at IS NULL OR expires_at > unixepoch()") {
		t.Errorf("default list should hide expired blocks:\n%s", sql)
	}
	if sql := blockListSQL(true); !strings.Contains(sql, "1 = 1") {
		t.Errorf("--all should not filter:\n%s", sql)
	}
}

func TestRenderBlockTable(t *testing.T) {
	now := time.Date(2026, 11, 17, 12, 0, 0, 0, time.UTC)
	future := now.Add(7 * 24 * time.Hour).Unix()
	past := now.Add(-24 * time.Hour).Unix()

	rows := []map[string]any{
		{
			"kind":       "domain",
			"value":      "mail.grokbot.com",
			"reason":     "agent mailbox",
			"source":     "incident:2026-11-14",
			"expires_at": nil,
		},
		{
			"kind":       "domain",
			"value":      "temporary.example",
			"reason":     nil,
			"source":     nil,
			"expires_at": float64(future),
		},
		{
			"kind":       "substring",
			"value":      "oldpattern",
			"reason":     "expired rule",
			"source":     "manual",
			"expires_at": float64(past),
		},
	}

	out := renderBlockTable(rows, now)

	for _, want := range []string{"KIND", "mail.grokbot.com", "agent mailbox", "never", "in 7d", "expired"} {
		if !strings.Contains(out, want) {
			t.Errorf("table missing %q:\n%s", want, out)
		}
	}
}
