import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTenant, getTenantForOnboarding } from "./tenant";
import type { CreateTenantInput } from "./tenant";

function createMockD1(): { db: any; calls: Array<{ sql: string; bindings: any[] }> } {
	const calls: Array<{ sql: string; bindings: any[] }> = [];
	const boundStatement = {
		bind: vi.fn().mockImplementation((...args: any[]) => {
			const lastCall = calls[calls.length - 1];
			if (lastCall) lastCall.bindings = args;
			return boundStatement;
		}),
		run: vi.fn().mockResolvedValue({ success: true }),
		first: vi.fn().mockResolvedValue(null),
	};
	const db = {
		prepare: vi.fn().mockImplementation((sql: string) => {
			calls.push({ sql, bindings: [] });
			return boundStatement;
		}),
		_boundStatement: boundStatement,
	};
	return { db, calls };
}

function makeInput(overrides?: Partial<CreateTenantInput>): CreateTenantInput {
	return {
		onboardingId: "onb-test-123",
		username: "testuser",
		displayName: "Test User",
		email: "test@example.com",
		plan: "seedling",
		favoriteColor: "#ff0000",
		providerCustomerId: "cus_stripe_123",
		providerSubscriptionId: "sub_stripe_456",
		...overrides,
	};
}

describe("createTenant", () => {
	it("returns tenantId and subdomain", async () => {
		const { db } = createMockD1();
		const result = await createTenant(db, makeInput());
		expect(result.tenantId).toBeDefined();
		expect(typeof result.tenantId).toBe("string");
		expect(result.subdomain).toBe("testuser");
	});

	it("generates a UUID for tenantId", async () => {
		const { db } = createMockD1();
		const result = await createTenant(db, makeInput());
		expect(result.tenantId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});

	it("inserts into tenants table first", async () => {
		const { db, calls } = createMockD1();
		await createTenant(db, makeInput());
		expect(calls[0].sql).toContain("INSERT INTO tenants");
	});

	it("passes correct tenant data in INSERT", async () => {
		const { db, calls } = createMockD1();
		const input = makeInput();
		await createTenant(db, input);
		const tenantBindings = calls[0].bindings;
		expect(tenantBindings[1]).toBe("testuser");
		expect(tenantBindings[2]).toBe("Test User");
		expect(tenantBindings[3]).toBe("test@example.com");
		expect(tenantBindings[4]).toBe("seedling");
		expect(tenantBindings[5]).toBe("#ff0000");
	});

	it("uses default accent color when favoriteColor is null", async () => {
		const { db, calls } = createMockD1();
		await createTenant(db, makeInput({ favoriteColor: null }));
		const tenantBindings = calls[0].bindings;
		expect(tenantBindings[5]).toBe("#16a34a");
	});

	it("uses default accent color when favoriteColor is undefined", async () => {
		const { db, calls } = createMockD1();
		await createTenant(db, makeInput({ favoriteColor: undefined }));
		const tenantBindings = calls[0].bindings;
		expect(tenantBindings[5]).toBe("#16a34a");
	});

	it("creates platform_billing record", async () => {
		const { db, calls } = createMockD1();
		await createTenant(db, makeInput());
		const billingCall = calls.find((c) => c.sql.includes("INSERT INTO platform_billing"));
		expect(billingCall).toBeDefined();
	});

	it("stores provider IDs in billing record", async () => {
		const { db, calls } = createMockD1();
		await createTenant(db, makeInput());
		const billingCall = calls.find((c) => c.sql.includes("INSERT INTO platform_billing"));
		expect(billingCall!.bindings).toContain("cus_stripe_123");
		expect(billingCall!.bindings).toContain("sub_stripe_456");
	});

	it("stores null provider IDs when not provided", async () => {
		const { db, calls } = createMockD1();
		await createTenant(db, makeInput({ providerCustomerId: null, providerSubscriptionId: null }));
		const billingCall = calls.find((c) => c.sql.includes("INSERT INTO platform_billing"));
		expect(billingCall!.bindings[3]).toBeNull();
		expect(billingCall!.bindings[4]).toBeNull();
	});

	it("creates 4 default site settings", async () => {
		const { db, calls } = createMockD1();
		await createTenant(db, makeInput());
		const settingsCalls = calls.filter((c) => c.sql.includes("INSERT INTO site_settings"));
		expect(settingsCalls).toHaveLength(4);
	});

	it("creates site_title setting with displayName", async () => {
		const { db, calls } = createMockD1();
		await createTenant(db, makeInput({ displayName: "My Cool Blog" }));
		const settingsCalls = calls.filter((c) => c.sql.includes("INSERT INTO site_settings"));
		const titleCall = settingsCalls.find((c) => c.bindings.includes("site_title"));
		expect(titleCall!.bindings).toContain("My Cool Blog");
	});

	it("creates site_description with displayName", async () => {
		const { db, calls } = createMockD1();
		await createTenant(db, makeInput({ displayName: "My Blog" }));
		const settingsCalls = calls.filter((c) => c.sql.includes("INSERT INTO site_settings"));
		const descCall = settingsCalls.find((c) => c.bindings.includes("site_description"));
		expect(descCall!.bindings).toContain("My Blog's blog on Grove");
	});

	it("updates user_onboarding to link tenant", async () => {
		const { db, calls } = createMockD1();
		await createTenant(db, makeInput());
		const updateCall = calls.find((c) => c.sql.includes("UPDATE user_onboarding"));
		expect(updateCall).toBeDefined();
		expect(updateCall!.bindings).toContain("onb-test-123");
	});

	it("creates default home page", async () => {
		const { db, calls } = createMockD1();
		await createTenant(db, makeInput());
		const pagesCalls = calls.filter((c) => c.sql.includes("INSERT INTO pages"));
		// 'home' slug is in the SQL literal, not bindings
		const homeCall = pagesCalls.find((c) => c.sql.includes("'home'"));
		expect(homeCall).toBeDefined();
	});

	it("creates default about page", async () => {
		const { db, calls } = createMockD1();
		await createTenant(db, makeInput());
		const pagesCalls = calls.filter((c) => c.sql.includes("INSERT INTO pages"));
		// 'about' slug is in the SQL literal, not bindings
		const aboutCall = pagesCalls.find((c) => c.sql.includes("'about'"));
		expect(aboutCall).toBeDefined();
	});

	it("makes exactly 9 database calls", async () => {
		const { db, calls } = createMockD1();
		await createTenant(db, makeInput());
		expect(calls).toHaveLength(9);
	});

	it("re-throws error when tenants INSERT fails", async () => {
		const { db } = createMockD1();
		db._boundStatement.run.mockRejectedValueOnce(new Error("UNIQUE constraint"));
		await expect(createTenant(db, makeInput())).rejects.toThrow("UNIQUE constraint");
	});

	it("works for wanderer (free) plan", async () => {
		const { db, calls } = createMockD1();
		const result = await createTenant(
			db,
			makeInput({ plan: "wanderer", providerCustomerId: null, providerSubscriptionId: null }),
		);
		expect(result.subdomain).toBe("testuser");
		const tenantBindings = calls[0].bindings;
		expect(tenantBindings[4]).toBe("wanderer");
	});

	it("works for sapling plan", async () => {
		const { db, calls } = createMockD1();
		const result = await createTenant(db, makeInput({ plan: "sapling" }));
		expect(result.subdomain).toBe("testuser");
		const tenantBindings = calls[0].bindings;
		expect(tenantBindings[4]).toBe("sapling");
	});

	it("works for oak plan", async () => {
		const { db, calls } = createMockD1();
		const result = await createTenant(db, makeInput({ plan: "oak" }));
		const tenantBindings = calls[0].bindings;
		expect(tenantBindings[4]).toBe("oak");
	});

	it("works for evergreen plan", async () => {
		const { db, calls } = createMockD1();
		const result = await createTenant(db, makeInput({ plan: "evergreen" }));
		const tenantBindings = calls[0].bindings;
		expect(tenantBindings[4]).toBe("evergreen");
	});

	it("includes displayName in home page content", async () => {
		const { db, calls } = createMockD1();
		await createTenant(db, makeInput({ displayName: "Alice's Blog" }));
		const homeCall = calls.find(
			(c) => c.sql.includes("INSERT INTO pages") && c.sql.includes("'home'"),
		);
		expect(
			homeCall!.bindings.some((b: any) => typeof b === "string" && b.includes("Alice's Blog")),
		).toBe(true);
	});

	it("includes accent_color in site_settings", async () => {
		const { db, calls } = createMockD1();
		await createTenant(db, makeInput({ favoriteColor: "#0000ff" }));
		const settingsCalls = calls.filter((c) => c.sql.includes("INSERT INTO site_settings"));
		const accentCall = settingsCalls.find((c) => c.bindings.includes("accent_color"));
		expect(accentCall!.bindings).toContain("#0000ff");
	});

	it("sets font_family to lexend in site_settings", async () => {
		const { db, calls } = createMockD1();
		await createTenant(db, makeInput());
		const settingsCalls = calls.filter((c) => c.sql.includes("INSERT INTO site_settings"));
		const fontCall = settingsCalls.find((c) => c.bindings.includes("font_family"));
		expect(fontCall!.bindings).toContain("lexend");
	});

	it("billings record has plan and status fields", async () => {
		const { db, calls } = createMockD1();
		await createTenant(db, makeInput({ plan: "sapling" }));
		const billingCall = calls.find((c) => c.sql.includes("INSERT INTO platform_billing"));
		expect(billingCall!.sql).toContain("plan");
		expect(billingCall!.sql).toContain("status");
		expect(billingCall!.bindings[2]).toBe("sapling");
		// 'active' is a SQL literal in VALUES, not a bind param
		expect(billingCall!.sql).toContain("'active'");
	});
});

describe("getTenantForOnboarding", () => {
	it("returns null when no tenant exists", async () => {
		const { db } = createMockD1();
		const result = await getTenantForOnboarding(db, "onb-nonexistent");
		expect(result).toBeNull();
	});

	it("returns tenant when found", async () => {
		const { db } = createMockD1();
		db._boundStatement.first.mockResolvedValue({ id: "tenant-123", subdomain: "testuser" });
		const result = await getTenantForOnboarding(db, "onb-123");
		expect(result).toEqual({ tenantId: "tenant-123", subdomain: "testuser" });
	});

	it("queries with onboardingId", async () => {
		const { db, calls } = createMockD1();
		await getTenantForOnboarding(db, "onb-456");
		expect(calls[0].sql).toContain("user_onboarding");
		expect(calls[0].bindings).toContain("onb-456");
	});

	it("JOINs tenants table", async () => {
		const { db, calls } = createMockD1();
		await getTenantForOnboarding(db, "onb-123");
		expect(calls[0].sql).toContain("JOIN tenants");
	});

	it("returns correct shape with tenantId and subdomain", async () => {
		const { db } = createMockD1();
		db._boundStatement.first.mockResolvedValue({ id: "t-1", subdomain: "user1" });
		const result = await getTenantForOnboarding(db, "onb-1");
		expect(result).toHaveProperty("tenantId");
		expect(result).toHaveProperty("subdomain");
		expect(result!.tenantId).toBe("t-1");
		expect(result!.subdomain).toBe("user1");
	});

	it("selects both id and subdomain from tenants", async () => {
		const { db, calls } = createMockD1();
		await getTenantForOnboarding(db, "onb-123");
		expect(calls[0].sql).toContain("SELECT t.id");
		expect(calls[0].sql).toContain("t.subdomain");
	});

	it("returns null when result is empty object", async () => {
		const { db } = createMockD1();
		db._boundStatement.first.mockResolvedValue(null);
		const result = await getTenantForOnboarding(db, "onb-456");
		expect(result).toBeNull();
	});
});
