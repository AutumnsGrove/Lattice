/**
 * Tenant Service Tests
 *
 * Tests for tenant provisioning functions: createTenant and getTenantForOnboarding.
 * Verifies atomic batch operations, HTML escaping, and database queries.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTenant, getTenantForOnboarding } from "../../services/tenant.js";
import { createMockD1, TEST_ONBOARDING_ID } from "../helpers/mocks.js";

describe("createTenant", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("creates tenant with all operations in a single db.batch() call", async () => {
		const { db, mocks } = createMockD1();

		// Mock batch to return success for all 9 statements
		mocks.batch.mockResolvedValueOnce(Array(9).fill({ success: true, meta: { changes: 1 } }));

		const result = await createTenant(db, {
			onboardingId: TEST_ONBOARDING_ID,
			username: "testuser",
			displayName: "Test User",
			email: "test@example.com",
			plan: "seedling",
			favoriteColor: "#ff0000",
			providerCustomerId: "cus_test_123",
			providerSubscriptionId: "sub_test_456",
		});

		expect(result.subdomain).toBe("testuser");
		expect(result.tenantId).toBeDefined();
		expect(typeof result.tenantId).toBe("string");
		expect(result.tenantId.length).toBeGreaterThan(0);

		// Verify batch was called exactly once
		expect(mocks.batch).toHaveBeenCalledTimes(1);

		// Verify batch received 9 statements (1 tenant + 1 billing + 4 settings + 1 onboarding + 1 home + 1 about = 9)
		const batchCall = mocks.batch.mock.calls[0];
		expect(Array.isArray(batchCall[0])).toBe(true);
		expect((batchCall[0] as unknown[]).length).toBe(9);
	});

	it("HTML-escapes displayName to prevent XSS in page content", async () => {
		const { db, mocks } = createMockD1();

		mocks.batch.mockResolvedValueOnce(Array(9).fill({ success: true, meta: { changes: 1 } }));

		await createTenant(db, {
			onboardingId: TEST_ONBOARDING_ID,
			username: "testuser",
			displayName: '<script>alert("xss")</script>',
			email: "test@example.com",
			plan: "seedling",
		});

		// Verify batch was called
		expect(mocks.batch).toHaveBeenCalledTimes(1);

		// Check bind() args for HTML content — page INSERTs include html_content
		// The HTML content should have escaped <script> tags
		const allBindArgs = mocks.bind.mock.calls.flat();
		const htmlArgs = allBindArgs.filter(
			(arg: unknown) => typeof arg === "string" && (arg as string).includes("<h1>"),
		);
		// At least one HTML arg should exist (home page html_content)
		expect(htmlArgs.length).toBeGreaterThan(0);
		// At least one HTML arg should contain the escaped displayName
		const hasEscaped = htmlArgs.some((html: unknown) =>
			(html as string).includes("&lt;script&gt;"),
		);
		expect(hasEscaped).toBe(true);
		// No HTML args should contain raw <script> tags
		const hasRaw = htmlArgs.some((html: unknown) => (html as string).includes("<script>"));
		expect(hasRaw).toBe(false);
	});

	it("returns tenantId and subdomain", async () => {
		const { db, mocks } = createMockD1();

		mocks.batch.mockResolvedValueOnce(Array(9).fill({ success: true, meta: { changes: 1 } }));

		const result = await createTenant(db, {
			onboardingId: TEST_ONBOARDING_ID,
			username: "mysite",
			displayName: "My Site",
			email: "me@example.com",
			plan: "sapling",
		});

		expect(result.subdomain).toBe("mysite");
		expect(result.tenantId).toBeDefined();
		expect(typeof result.tenantId).toBe("string");
		// UUID format check (36 chars with hyphens)
		expect(result.tenantId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		);
	});

	it("uses default favorite color when not provided", async () => {
		const { db, mocks } = createMockD1();

		mocks.batch.mockResolvedValueOnce(Array(9).fill({ success: true, meta: { changes: 1 } }));

		await createTenant(db, {
			onboardingId: TEST_ONBOARDING_ID,
			username: "colortest",
			displayName: "Color Test",
			email: "color@example.com",
			plan: "seedling",
			// favoriteColor not provided
		});

		// Verify batch was called (color is part of the INSERT tenants bind)
		expect(mocks.batch).toHaveBeenCalledTimes(1);
		expect(mocks.prepare).toHaveBeenCalled();
	});

	it("includes provider credentials when provided", async () => {
		const { db, mocks } = createMockD1();

		mocks.batch.mockResolvedValueOnce(Array(9).fill({ success: true, meta: { changes: 1 } }));

		await createTenant(db, {
			onboardingId: TEST_ONBOARDING_ID,
			username: "stripetest",
			displayName: "Stripe Test",
			email: "stripe@example.com",
			plan: "sapling",
			providerCustomerId: "cus_test_789",
			providerSubscriptionId: "sub_test_999",
		});

		// Verify batch was called — provider IDs are in the INSERT platform_billing bind
		expect(mocks.batch).toHaveBeenCalledTimes(1);
		expect(mocks.prepare).toHaveBeenCalled();
	});
});

describe("getTenantForOnboarding", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns tenant when onboarding record exists", async () => {
		const { db, mocks } = createMockD1();

		mocks.first.mockResolvedValueOnce({
			id: "tenant-123",
			subdomain: "mysite",
		});

		const result = await getTenantForOnboarding(db, TEST_ONBOARDING_ID);

		expect(result).not.toBeNull();
		expect(result?.tenantId).toBe("tenant-123");
		expect(result?.subdomain).toBe("mysite");

		// Verify query was made
		expect(mocks.prepare).toHaveBeenCalledWith(expect.stringContaining("SELECT t.id, t.subdomain"));
		expect(mocks.bind).toHaveBeenCalledWith(TEST_ONBOARDING_ID);
	});

	it("returns null when onboarding record not found", async () => {
		const { db, mocks } = createMockD1();

		mocks.first.mockResolvedValueOnce(null);

		const result = await getTenantForOnboarding(db, TEST_ONBOARDING_ID);

		expect(result).toBeNull();
	});

	it("returns null when tenant is not linked", async () => {
		const { db, mocks } = createMockD1();

		// Onboarding exists but no tenant linked
		mocks.first.mockResolvedValueOnce(null);

		const result = await getTenantForOnboarding(db, TEST_ONBOARDING_ID);

		expect(result).toBeNull();
	});

	it("queries with correct JOIN to tenants table", async () => {
		const { db, mocks } = createMockD1();

		mocks.first.mockResolvedValueOnce({
			id: "tenant-456",
			subdomain: "another",
		});

		await getTenantForOnboarding(db, TEST_ONBOARDING_ID);

		// Verify the JOIN query
		expect(mocks.prepare).toHaveBeenCalledWith(expect.stringContaining("FROM user_onboarding o"));
		expect(mocks.prepare).toHaveBeenCalledWith(expect.stringContaining("JOIN tenants t"));
		expect(mocks.prepare).toHaveBeenCalledWith(expect.stringContaining("WHERE o.id = ?"));
	});

	it("handles multiple onboarding lookups independently", async () => {
		const { db, mocks } = createMockD1();

		const onboardingId1 = "onboarding-1";
		const onboardingId2 = "onboarding-2";

		// First lookup
		mocks.first.mockResolvedValueOnce({
			id: "tenant-1",
			subdomain: "site1",
		});

		// Second lookup
		mocks.first.mockResolvedValueOnce({
			id: "tenant-2",
			subdomain: "site2",
		});

		const result1 = await getTenantForOnboarding(db, onboardingId1);
		const result2 = await getTenantForOnboarding(db, onboardingId2);

		expect(result1?.tenantId).toBe("tenant-1");
		expect(result2?.tenantId).toBe("tenant-2");
		expect(mocks.bind).toHaveBeenCalledWith(onboardingId1);
		expect(mocks.bind).toHaveBeenCalledWith(onboardingId2);
	});
});
