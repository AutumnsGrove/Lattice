import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@autumnsgrove/grove-errors", async (importOriginal) => ({
	...(await importOriginal<typeof import("@autumnsgrove/grove-errors")>()),
	logGroveError: vi.fn(),
}));

import { logGroveError } from "@autumnsgrove/grove-errors";
import {
	createTenant,
	describeTenantCreationPlan,
	planTenantCreation,
	SignupBlockedError,
	type CreateTenantInput,
	type TenantWriteDatabase,
} from "./create-tenant";

// ============================================================================
// Fake database — records statements, understands the two reads
// ============================================================================

interface FakeState {
	writes: { sql: string; bindings: unknown[] }[];
	reads: string[];
	/** Rows returned for the signup_blocks read. */
	blocks: Record<string, unknown>[];
	/** groveauth_id returned for the user_onboarding read. */
	groveauthId: string | null;
	/** Throw on the write whose SQL contains this substring. */
	failOn?: string;
}

function fakeDb(seed: Partial<FakeState> = {}): { db: TenantWriteDatabase; state: FakeState } {
	const state: FakeState = { writes: [], reads: [], blocks: [], groveauthId: null, ...seed };

	const db: TenantWriteDatabase = {
		prepare(sql: string) {
			return {
				bind(...bindings: unknown[]) {
					return {
						async first<T>() {
							state.reads.push(sql.trim());
							if (sql.includes("groveauth_id") && state.groveauthId) {
								return { groveauth_id: state.groveauthId } as T;
							}
							return null;
						},
						async all<R>() {
							state.reads.push(sql.trim());
							return { results: state.blocks as R[] };
						},
						async run() {
							if (state.failOn && sql.includes(state.failOn)) {
								throw new Error(`boom: ${state.failOn}`);
							}
							state.writes.push({ sql, bindings });
							return {};
						},
					};
				},
			};
		},
	};

	return { db, state };
}

function makeInput(overrides: Partial<CreateTenantInput> = {}): CreateTenantInput {
	return {
		onboardingId: "onb-1",
		username: "testgarden",
		displayName: "Test Garden",
		email: "test@example.com",
		plan: "seedling",
		favoriteColor: "#ff0000",
		...overrides,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

// ============================================================================
// Planning
// ============================================================================

describe("planTenantCreation", () => {
	it("plans the tenant row first, then billing, settings, pages", () => {
		const plan = planTenantCreation(makeInput(), { groveauthId: "ga-1" });

		expect(plan.writes.map((w) => w.step)).toEqual([
			"tenants",
			"platform_billing",
			"site_settings:site_title",
			"site_settings:site_description",
			"site_settings:accent_color",
			"site_settings:font_family",
			"user_onboarding",
			"users",
			"pages:home",
			"pages:about",
		]);
	});

	it("gives every write an error key from the catalog", () => {
		const plan = planTenantCreation(makeInput(), { groveauthId: "ga-1" });
		for (const write of plan.writes) {
			expect(write.errorKey).toMatch(/^[A-Z_]+$/);
		}
	});

	it("skips the onboarding link when there is no onboarding row", () => {
		const plan = planTenantCreation(makeInput({ onboardingId: null }), {
			groveauthId: "ga-1",
		});
		expect(plan.writes.some((w) => w.step === "user_onboarding")).toBe(false);
	});

	it("skips the users upsert when nothing names the identity", () => {
		const plan = planTenantCreation(makeInput(), { groveauthId: null });
		expect(plan.writes.some((w) => w.step === "users")).toBe(false);
	});

	it("builds the same plan twice with different ids, deterministically shaped", () => {
		const a = planTenantCreation(makeInput(), { groveauthId: "ga-1" });
		const b = planTenantCreation(makeInput(), { groveauthId: "ga-1" });
		expect(a.tenantId).not.toBe(b.tenantId);
		expect(a.writes.map((w) => w.step)).toEqual(b.writes.map((w) => w.step));
	});

	it("defaults created_at to the database clock", () => {
		const plan = planTenantCreation(makeInput(), { groveauthId: "ga-1" });
		const tenant = plan.writes[0];
		expect(tenant.sql).toContain("unixepoch()");
		expect(tenant.bindings).toHaveLength(6);
	});

	it("passes created_at as a binding when the caller sets it", () => {
		const plan = planTenantCreation(makeInput({ createdAt: 1_700_000_000 }), {
			groveauthId: "ga-1",
		});
		const tenant = plan.writes[0];
		expect(tenant.bindings).toHaveLength(7);
		expect(tenant.bindings[6]).toBe(1_700_000_000);
	});

	it("keeps the accent colour at binding 5, which is what the older tests assert", () => {
		const plan = planTenantCreation(makeInput({ createdAt: 1_700_000_000 }), {
			groveauthId: "ga-1",
		});
		expect(plan.writes[0].bindings[5]).toBe("#ff0000");
	});

	it("falls back to the platform accent colour", () => {
		const plan = planTenantCreation(makeInput({ favoriteColor: null }), { groveauthId: "ga-1" });
		expect(plan.writes[0].bindings[5]).toBe("#16a34a");
	});

	it("normalizes the email before the users upsert", () => {
		const plan = planTenantCreation(makeInput({ email: "  Test@Example.COM " }), {
			groveauthId: "ga-1",
		});
		const users = plan.writes.find((w) => w.step === "users")!;
		expect(users.bindings[2]).toBe("test@example.com");
	});
});

// ============================================================================
// Dry run
// ============================================================================

describe("createTenant dry run", () => {
	it("writes nothing", async () => {
		const { db, state } = fakeDb();
		await createTenant(db, makeInput(), { dryRun: true });
		expect(state.writes).toEqual([]);
	});

	it("still reads the deny list", async () => {
		const { db, state } = fakeDb();
		await createTenant(db, makeInput(), { dryRun: true });
		expect(state.reads.some((sql) => sql.includes("signup_blocks"))).toBe(true);
	});

	it("returns the plan it would have executed", async () => {
		const { db } = fakeDb();
		const result = await createTenant(db, makeInput(), { dryRun: true });
		expect(result.plan.writes.length).toBeGreaterThan(5);
		expect(result.subdomain).toBe("testgarden");
	});

	it("still refuses a blocked identity", async () => {
		const { db } = fakeDb({
			blocks: [
				{
					id: "b1",
					kind: "domain",
					value: "mail.grokbot.com",
					reason: "incident",
					created_by: "autumn",
					created_at: 1,
					expires_at: null,
					source: null,
				},
			],
		});
		await expect(
			createTenant(db, makeInput({ email: "whoever@mail.grokbot.com" }), { dryRun: true }),
		).rejects.toThrow(SignupBlockedError);
	});
});

// ============================================================================
// Execution
// ============================================================================

describe("createTenant", () => {
	it("checks the deny list before writing anything", async () => {
		const { db, state } = fakeDb({ groveauthId: "ga-1" });
		await createTenant(db, makeInput());
		expect(state.reads[0]).toContain("signup_blocks");
		expect(state.writes.length).toBeGreaterThan(0);
	});

	it("runs every planned write", async () => {
		const { db, state } = fakeDb({ groveauthId: "ga-1" });
		const result = await createTenant(db, makeInput());
		expect(state.writes).toHaveLength(result.plan.writes.length);
	});

	it("attaches the groveauth identity from the onboarding row", async () => {
		const { db, state } = fakeDb({ groveauthId: "ga-from-row" });
		await createTenant(db, makeInput());
		const users = state.writes.find((w) => w.sql.includes("INSERT INTO users"))!;
		expect(users.bindings[1]).toBe("ga-from-row");
	});

	it("refuses a blocked identity and writes nothing", async () => {
		const { db, state } = fakeDb({
			blocks: [
				{
					id: "b1",
					kind: "email",
					value: "test@example.com",
					reason: "incident",
					created_by: null,
					created_at: 1,
					expires_at: null,
					source: null,
				},
			],
		});
		await expect(createTenant(db, makeInput())).rejects.toThrow(SignupBlockedError);
		expect(state.writes).toEqual([]);
	});

	it("skips the deny list entirely when the override reason is given", async () => {
		const { db, state } = fakeDb({
			blocks: [
				{
					id: "b1",
					kind: "email",
					value: "test@example.com",
					reason: "incident",
					created_by: null,
					created_at: 1,
					expires_at: null,
					source: null,
				},
			],
		});
		const result = await createTenant(
			db,
			makeInput({ forceIdentityReason: "restoring a wrongly blocked writer" }),
		);
		expect(state.reads.some((sql) => sql.includes("signup_blocks"))).toBe(false);
		expect(result.plan.identityBlockOverridden).toBe(true);
	});

	it("fails open when the deny list cannot be read, and says so", async () => {
		const { db, state } = fakeDb();
		// Make the block read throw, the way a missing table would.
		const original = db.prepare;
		db.prepare = (sql: string) => {
			if (sql.includes("signup_blocks")) throw new Error("no such table: signup_blocks");
			return original(sql);
		};

		await expect(createTenant(db, makeInput())).resolves.toBeDefined();
		expect(state.writes.length).toBeGreaterThan(0);
		expect(logGroveError).toHaveBeenCalledWith(
			"Engine/Tenant",
			expect.objectContaining({ code: "GROVE-TENANT-001" }),
			expect.objectContaining({ detail: expect.stringContaining("signup_blocks lookup failed") }),
		);
	});

	it("names the failing step in the log, then rethrows", async () => {
		const { db } = fakeDb({ failOn: "INSERT INTO platform_billing" });
		await expect(createTenant(db, makeInput())).rejects.toThrow("boom");

		expect(logGroveError).toHaveBeenCalledWith(
			"Engine/Tenant",
			expect.objectContaining({ code: "GROVE-TENANT-021" }),
			expect.objectContaining({ detail: expect.stringContaining("platform_billing") }),
		);
	});
});

// ============================================================================
// Dry-run summary
// ============================================================================

describe("describeTenantCreationPlan", () => {
	it("lists steps without leaking any bound values", () => {
		const plan = planTenantCreation(makeInput(), { groveauthId: "ga-1" });
		const lines = describeTenantCreationPlan(plan);

		expect(lines[0]).toContain("tenants");
		expect(lines.join(" ")).not.toContain("test@example.com");
		expect(lines.join(" ")).not.toContain("#ff0000");
	});
});
