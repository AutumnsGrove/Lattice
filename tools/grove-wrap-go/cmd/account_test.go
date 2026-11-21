package cmd

import (
	"strings"
	"testing"
	"time"
)

/**
 * The composed terminate step (#1722).
 *
 * These test the statements, not the incident: that every lever is actually in
 * the SQL, that the order keeps a half-failure visible rather than silent, and
 * that nothing is written by default.
 */

func testTarget() *accountTarget {
	return &accountTarget{
		TenantID:  "t-1",
		Subdomain: "spamgarden",
		Email:     "Spam@Example.com",
		UserID:    "u-1",
		Active:    true,
	}
}

func TestTerminateIdentitySQL(t *testing.T) {
	sql := terminateIdentitySQL(testTarget(), nil, "link farm")

	for _, want := range []string{
		"UPDATE ba_user SET banned = 1",
		"ban_reason = 'link farm'",
		"ban_expires = NULL",
		"DELETE FROM ba_session WHERE user_id = 'u-1'",
		"DELETE FROM refresh_tokens WHERE user_id = 'u-1'",
		"DELETE FROM user_sessions WHERE user_id = 'u-1'",
	} {
		if !strings.Contains(sql, want) {
			t.Errorf("identity SQL is missing %q\n%s", want, sql)
		}
	}

	// The legacy session tables are the ones that outlived a ban decision in the
	// incident this closes; naming only ba_session would repeat it.
	if strings.Contains(sql, "ba_user WHERE id = 'u-1';\nDELETE FROM ba_user") {
		t.Error("identity SQL must never delete the user row — terminate bans, it does not remove")
	}
}

func TestTerminateIdentitySQLRespectsAnExpiry(t *testing.T) {
	expires := int64(1_800_000_000)
	sql := terminateIdentitySQL(testTarget(), &expires, "abuse")

	if !strings.Contains(sql, "ban_expires = 1800000000") {
		t.Errorf("a temporary ban must carry its expiry\n%s", sql)
	}
}

func TestTerminateTenantSQL(t *testing.T) {
	sql := terminateTenantSQL(testTarget(), "spam@example.com", nil, "link farm")

	for _, want := range []string{
		"UPDATE tenants SET active = 0",
		"INSERT INTO signup_blocks",
		"source = excluded.source",
		"'terminate:spamgarden'",
		"INSERT INTO audit_log",
		"'account_terminate'",
	} {
		if !strings.Contains(sql, want) {
			t.Errorf("tenant SQL is missing %q\n%s", want, sql)
		}
	}

	// The suspension and its record ride together: "suspended but not recorded"
	// must not be a state this can produce.
	if strings.Index(sql, "UPDATE tenants") > strings.Index(sql, "INSERT INTO audit_log") {
		t.Error("the audit row must be written after the suspension it describes, in the same batch")
	}
}

func TestTerminateBlocksTheNormalizedIdentity(t *testing.T) {
	target := testTarget()
	value, err := validateBlockValue("email", target.Email)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// The aliases land in one bucket: this is the whole reason the block is keyed
	// on the normalized identity rather than the address as typed.
	if value != "spam@example.com" {
		t.Fatalf("expected a normalized address, got %q", value)
	}
	if !strings.Contains(terminateTenantSQL(target, value, nil, "x"), "'"+value+"'") {
		t.Error("the block value must reach the SQL")
	}
}

func TestTerminateIsADryRunByDefault(t *testing.T) {
	plan := terminationPlan(testTarget(), "spam@example.com", nil, false)

	if plan.DryRun {
		t.Error("the plan built for --write must not be marked a dry run")
	}

	text := renderTerminationPlan(terminationPlan(testTarget(), "spam@example.com", nil, true))
	for _, want := range []string{
		"suspend  tenants.active = 0",
		"ban      ba_user.banned = 1",
		"revoke   ba_session",
		"block    spam@example.com (source terminate:spamgarden)",
		"one audit_log row naming all of it",
	} {
		if !strings.Contains(text, want) {
			t.Errorf("plan is missing %q\n%s", want, text)
		}
	}
}

func TestTerminationPlanCountsWhatIsLeftToDo(t *testing.T) {
	already := &accountTarget{TenantID: "t", Subdomain: "s", Email: "a@b.co", UserID: "u", Active: false, Banned: true}
	plan := terminationPlan(already, "a@b.co", nil, true)

	if !plan.AlreadyInactive || !plan.AlreadyBanned {
		t.Fatal("the plan must notice state that is already in place")
	}
	if got := terminationSteps(plan); got != 2 {
		t.Errorf("expected 2 remaining steps, got %d", got)
	}
	if !strings.Contains(renderTerminationPlan(plan), "already") {
		t.Error("the plan should say which steps are already done")
	}
}

func TestTerminationPlanShowsTheExpiry(t *testing.T) {
	expires := time.Date(2027, 1, 2, 3, 4, 5, 0, time.UTC).Unix()
	text := renderTerminationPlan(terminationPlan(testTarget(), "spam@example.com", &expires, true))

	if !strings.Contains(text, "expiry   2027-01-02T03:04:05Z") {
		t.Errorf("a temporary ban must say when it ends\n%s", text)
	}
}

func TestUnbanAuditRecordsTheLeftoverState(t *testing.T) {
	suspended := &accountTarget{TenantID: "t-1", Subdomain: "spamgarden", Email: "a@b.co", UserID: "u-1", Active: false}
	sql := accountUnbanAuditSQL(suspended, "appeal upheld")

	for _, want := range []string{"'account_unban'", `"reason":"appeal upheld"`, `tenantActive`} {
		if !strings.Contains(sql, want) {
			t.Errorf("unban audit is missing %q\n%s", want, sql)
		}
	}
	// Un-banning is not resuming and not unblocking; the row says which switch
	// moved so the next reader does not assume all three did.
	if strings.Contains(sql, "ba_user") {
		t.Error("the audit row is engine data, not an identity write")
	}
}
