/**
 * Billing Module Tests
 *
 * Tests for subscription status checking and feature access control.
 * Covers:
 * - getTenantSubscription: Retrieves tenant subscription tier and billing status
 * - checkFeatureAccess: Validates feature access based on subscription tier
 * - requireActiveSubscription: Enforces active subscription requirement
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import {
	getTenantSubscription,
	checkFeatureAccess,
	requireActiveSubscription,
	isCompedAccount,
	logBillingAudit,
	type SubscriptionStatus,
	type AuditLogEntry,
} from "./billing";

/**
 * Mock D1 Database Helper
 * Creates a mock D1 database with chainable prepare/bind/first pattern
 */
function createMockDb(): D1Database {
	return {
		prepare: vi.fn().mockReturnThis(),
		bind: vi.fn().mockReturnThis(),
		first: vi.fn(),
	} as unknown as D1Database;
}

/**
 * Mock D1 Database Helper with .run() method
 * Used for logBillingAudit tests that call .run() instead of .first()
 */
function createMockDbWithRun(): D1Database {
	return {
		prepare: vi.fn().mockReturnThis(),
		bind: vi.fn().mockReturnThis(),
		run: vi.fn().mockResolvedValue({ success: true }),
	} as unknown as D1Database;
}

describe("Billing Module", () => {
	let mockDb: D1Database;

	beforeEach(() => {
		mockDb = createMockDb();
		vi.clearAllMocks();
	});

	// ==========================================================================
	// getTenantSubscription Tests
	// ==========================================================================

	describe("getTenantSubscription", () => {
		it("returns null when tenant not found", async () => {
			const db = createMockDb();
			(db.prepare as any).mockReturnThis();
			(db.bind as any).mockReturnThis();
			(db.first as any).mockResolvedValueOnce(null);

			const result = await getTenantSubscription(db, "nonexistent-tenant");

			expect(result).toBeNull();
		});

		it("returns subscription with wanderer tier when no plan specified", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValueOnce({ plan: null, active: 1 }).mockResolvedValueOnce(null),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await getTenantSubscription(db, "tenant-1");

			expect(result?.tier).toBe("wanderer");
			expect(result?.status).toBeUndefined();
			expect(result?.isActive).toBe(true);
			expect(result?.currentPeriodEnd).toBeNull();
		});

		it("returns subscription with seedling tier from tenant plan", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce(null),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await getTenantSubscription(db, "tenant-1");

			expect(result?.tier).toBe("seedling");
			expect(result?.status).toBeUndefined();
			expect(result?.isActive).toBe(true);
		});

		it("handles wanderer tier (no billing record)", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "wanderer", active: 1 })
					.mockResolvedValueOnce(null),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await getTenantSubscription(db, "tenant-1");

			expect(result?.tier).toBe("wanderer");
			expect(result?.isActive).toBe(true); // Active even without billing
		});

		it("sets isActive=true when tenant.active=1 and status=active", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({
						status: "active",
						current_period_end: 1000,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await getTenantSubscription(db, "tenant-1");

			expect(result?.isActive).toBe(true);
			expect(result?.status).toBe("active");
		});

		it("sets isActive=false when tenant.active=0", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 0 })
					.mockResolvedValueOnce({
						status: "active",
						current_period_end: 1000,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await getTenantSubscription(db, "tenant-1");

			expect(result?.isActive).toBe(false);
		});

		it("sets isActive=false when status=past_due", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({
						status: "past_due",
						current_period_end: 1000,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await getTenantSubscription(db, "tenant-1");

			expect(result?.isActive).toBe(false);
			expect(result?.status).toBe("past_due");
		});

		it("sets isActive=false when status=canceled", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({
						status: "canceled",
						current_period_end: null,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await getTenantSubscription(db, "tenant-1");

			expect(result?.isActive).toBe(false);
			expect(result?.status).toBe("canceled");
		});

		it("sets isActive=false when status=unpaid", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({
						status: "unpaid",
						current_period_end: 1000,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await getTenantSubscription(db, "tenant-1");

			expect(result?.isActive).toBe(false);
			expect(result?.status).toBe("unpaid");
		});

		it("sets isActive=false when status=paused", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({
						status: "paused",
						current_period_end: 1000,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await getTenantSubscription(db, "tenant-1");

			// paused is not in the active list, so isActive should be false
			expect(result?.isActive).toBe(false);
			expect(result?.status).toBe("paused");
		});

		it("returns currentPeriodEnd from billing record", async () => {
			const db = createMockDb();
			const futureTimestamp = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days from now
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({
						status: "active",
						current_period_end: futureTimestamp,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await getTenantSubscription(db, "tenant-1");

			expect(result?.currentPeriodEnd).toBe(futureTimestamp);
		});

		it("returns currentPeriodEnd=null when no billing record", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "wanderer", active: 1 })
					.mockResolvedValueOnce(null),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await getTenantSubscription(db, "tenant-1");

			expect(result?.currentPeriodEnd).toBeNull();
		});

		it("queries tenants table with correct SQL", async () => {
			const db = createMockDb();
			const bindFn = vi.fn().mockReturnThis();
			const prepareChain = {
				bind: bindFn,
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce(null),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			await getTenantSubscription(db, "tenant-123");

			// Verify first query was to tenants table
			const calls = (db.prepare as any).mock.calls;
			expect(calls[0][0]).toContain("tenants");
			expect(calls[0][0]).toContain("SELECT plan, active FROM tenants WHERE id = ?");

			// Verify bind was called with tenant ID
			expect(bindFn).toHaveBeenCalledWith("tenant-123");
		});

		it("queries platform_billing table with correct SQL", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({
						status: "active",
						current_period_end: 1000,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			await getTenantSubscription(db, "tenant-456");

			// Verify second query was to platform_billing
			const calls = (db.prepare as any).mock.calls;
			expect(calls[1][0]).toContain("platform_billing");
			expect(calls[1][0]).toContain(
				"SELECT status, current_period_end FROM platform_billing WHERE tenant_id = ?",
			);
		});

		it("handles all valid tier keys", async () => {
			const validTiers = ["wanderer", "seedling", "sapling", "oak", "evergreen"];

			for (const tier of validTiers) {
				const db = createMockDb();
				const prepareChain = {
					bind: vi.fn().mockReturnThis(),
					first: vi
						.fn()
						.mockResolvedValueOnce({ plan: tier, active: 1 })
						.mockResolvedValueOnce(null),
				};
				(db.prepare as any).mockReturnValue(prepareChain);

				const result = await getTenantSubscription(db, "tenant-1");

				expect(result?.tier).toBe(tier);
			}
		});
	});

	// ==========================================================================
	// checkFeatureAccess Tests
	// ==========================================================================

	describe("checkFeatureAccess", () => {
		it("returns allowed=false with 'Tenant not found' reason when tenant doesn't exist", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValueOnce(null),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await checkFeatureAccess(db, "nonexistent", "ai");

			expect(result.allowed).toBe(false);
			expect(result.reason).toBe("Tenant not found");
		});

		it("returns allowed=false when subscription inactive", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 0 })
					.mockResolvedValueOnce({
						status: "active",
						current_period_end: 1000,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await checkFeatureAccess(db, "tenant-1", "ai");

			expect(result.allowed).toBe(false);
			expect(result.reason).toBe("Subscription inactive or suspended");
		});

		it("returns allowed=false when billing status=canceled", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({
						status: "canceled",
						current_period_end: null,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await checkFeatureAccess(db, "tenant-1", "ai");

			expect(result.allowed).toBe(false);
			expect(result.reason).toBe("Subscription inactive or suspended");
		});

		it("returns allowed=false when tier insufficient for feature", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "wanderer", active: 1 })
					.mockResolvedValueOnce(null),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await checkFeatureAccess(db, "tenant-1", "ai");

			expect(result.allowed).toBe(false);
			expect(result.reason).toContain("Feature requires");
		});

		it("returns allowed=false with reason for custom_domain on seedling", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({
						status: "active",
						current_period_end: 1000,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await checkFeatureAccess(db, "tenant-1", "custom_domain");

			expect(result.allowed).toBe(false);
			expect(result.reason).toContain("Feature requires");
		});

		it("returns allowed=true for unknown features", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "wanderer", active: 1 })
					.mockResolvedValueOnce(null),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			// Cast to bypass type checking for invalid feature test
			const result = await checkFeatureAccess(db, "tenant-1", "unknown_feature" as any);

			expect(result.allowed).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		it("returns allowed=true when tier meets requirement for ai", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({
						status: "active",
						current_period_end: 1000,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await checkFeatureAccess(db, "tenant-1", "ai");

			expect(result.allowed).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		it("returns allowed=true when tier meets requirement for shop", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValueOnce({ plan: "sapling", active: 1 }).mockResolvedValueOnce({
					status: "active",
					current_period_end: 1000,
				}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await checkFeatureAccess(db, "tenant-1", "shop");

			expect(result.allowed).toBe(true);
		});

		it("returns allowed=true when tier meets requirement for custom_domain", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValueOnce({ plan: "oak", active: 1 }).mockResolvedValueOnce({
					status: "active",
					current_period_end: 1000,
				}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await checkFeatureAccess(db, "tenant-1", "custom_domain");

			expect(result.allowed).toBe(true);
		});

		it("returns allowed=true when tier meets requirement for analytics", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValueOnce({ plan: "oak", active: 1 }).mockResolvedValueOnce({
					status: "active",
					current_period_end: 1000,
				}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await checkFeatureAccess(db, "tenant-1", "analytics");

			expect(result.allowed).toBe(true);
		});

		it("returns allowed=true when tier meets requirement for email_forwarding", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValueOnce({ plan: "sapling", active: 1 }).mockResolvedValueOnce({
					status: "active",
					current_period_end: 1000,
				}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await checkFeatureAccess(db, "tenant-1", "email_forwarding");

			expect(result.allowed).toBe(true);
		});

		it("returns allowed=true for evergreen tier on all features", async () => {
			const features = ["ai", "shop", "custom_domain", "analytics", "email_forwarding"] as const;

			for (const feature of features) {
				const db = createMockDb();
				const prepareChain = {
					bind: vi.fn().mockReturnThis(),
					first: vi
						.fn()
						.mockResolvedValueOnce({ plan: "evergreen", active: 1 })
						.mockResolvedValueOnce({
							status: "active",
							current_period_end: 1000,
						}),
				};
				(db.prepare as any).mockReturnValue(prepareChain);

				const result = await checkFeatureAccess(db, "tenant-1", feature);

				expect(result.allowed).toBe(true);
			}
		});

		it("returns allowed=false for wanderer tier on all premium features", async () => {
			const features = ["ai", "shop", "custom_domain", "analytics", "email_forwarding"] as const;

			for (const feature of features) {
				const db = createMockDb();
				const prepareChain = {
					bind: vi.fn().mockReturnThis(),
					first: vi
						.fn()
						.mockResolvedValueOnce({ plan: "wanderer", active: 1 })
						.mockResolvedValueOnce(null),
				};
				(db.prepare as any).mockReturnValue(prepareChain);

				const result = await checkFeatureAccess(db, "tenant-1", feature);

				expect(result.allowed).toBe(false);
			}
		});

		it("includes tier name in reason when access denied", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "wanderer", active: 1 })
					.mockResolvedValueOnce(null),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await checkFeatureAccess(db, "tenant-1", "custom_domain");

			// Should mention oak since custom_domain requires oak or higher
			expect(result.reason).toContain("oak");
		});
	});

	// ==========================================================================
	// requireActiveSubscription Tests
	// ==========================================================================

	describe("requireActiveSubscription", () => {
		it("throws 'Tenant not found' when tenant doesn't exist", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValueOnce(null),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			await expect(requireActiveSubscription(db, "nonexistent-tenant")).rejects.toThrow(
				"Tenant not found",
			);
		});

		it("throws 'Subscription inactive' when tenant not active", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 0 })
					.mockResolvedValueOnce({
						status: "active",
						current_period_end: 1000,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			await expect(requireActiveSubscription(db, "tenant-1")).rejects.toThrow(
				"Subscription inactive",
			);
		});

		it("throws 'Subscription inactive' when billing canceled", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({
						status: "canceled",
						current_period_end: null,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			await expect(requireActiveSubscription(db, "tenant-1")).rejects.toThrow(
				"Subscription inactive",
			);
		});

		it("throws 'Subscription inactive' when billing past_due", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({
						status: "past_due",
						current_period_end: 1000,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			await expect(requireActiveSubscription(db, "tenant-1")).rejects.toThrow(
				"Subscription inactive",
			);
		});

		it("succeeds silently for active subscription", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({
						status: "active",
						current_period_end: 1000,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			await expect(requireActiveSubscription(db, "tenant-1")).resolves.toBeUndefined();
		});

		it("succeeds silently for wanderer tier with no billing", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "wanderer", active: 1 })
					.mockResolvedValueOnce(null),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			await expect(requireActiveSubscription(db, "tenant-1")).resolves.toBeUndefined();
		});

		it("throws Error (not custom exception) for consistency", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValueOnce(null),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			try {
				await requireActiveSubscription(db, "nonexistent");
				fail("Should have thrown");
			} catch (err) {
				expect(err).toBeInstanceOf(Error);
				expect((err as Error).message).toBe("Tenant not found");
			}
		});
	});

	// ==========================================================================
	// Integration Tests
	// ==========================================================================

	describe("Integration scenarios", () => {
		it("handles complete subscription lifecycle: wanderer -> active -> inactive", async () => {
			// Start with wanderer tier
			let db = createMockDb();
			const prepareChain: any = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "wanderer", active: 1 })
					.mockResolvedValueOnce(null),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			let result = await getTenantSubscription(db, "tenant-1");
			expect(result?.isActive).toBe(true);

			// Upgrade to paid and activate (create fresh db with new mocks)
			db = createMockDb();
			const prepareChain2: any = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({
						status: "active",
						current_period_end: 9999999,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain2);

			result = await getTenantSubscription(db, "tenant-1");
			expect(result?.isActive).toBe(true);
			expect(result?.tier).toBe("seedling");

			// Subscription cancelled (create fresh db with new mocks)
			db = createMockDb();
			const prepareChain3: any = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({
						status: "canceled",
						current_period_end: null,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain3);

			result = await getTenantSubscription(db, "tenant-1");
			expect(result?.isActive).toBe(false);
		});

		it("correctly blocks feature access during cancellation flow", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValueOnce({ plan: "oak", active: 1 }).mockResolvedValueOnce({
					status: "canceled",
					current_period_end: null,
				}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await checkFeatureAccess(db, "tenant-1", "custom_domain");

			expect(result.allowed).toBe(false);
			expect(result.reason).toBe("Subscription inactive or suspended");
		});

		it("correctly blocks feature access when account suspended", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValueOnce({ plan: "oak", active: 0 }).mockResolvedValueOnce({
					status: "active",
					current_period_end: 9999999,
				}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await checkFeatureAccess(db, "tenant-1", "custom_domain");

			expect(result.allowed).toBe(false);
		});

		it("all functions work with sapling tier for email_forwarding", async () => {
			// getTenantSubscription
			let db = createMockDb();
			let prepareChain: any = {
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValueOnce({ plan: "sapling", active: 1 }).mockResolvedValueOnce({
					status: "active",
					current_period_end: 9999999,
				}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const subscription = await getTenantSubscription(db, "tenant-1");
			expect(subscription?.tier).toBe("sapling");
			expect(subscription?.isActive).toBe(true);

			// checkFeatureAccess (fresh db)
			db = createMockDb();
			prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValueOnce({ plan: "sapling", active: 1 }).mockResolvedValueOnce({
					status: "active",
					current_period_end: 9999999,
				}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const access = await checkFeatureAccess(db, "tenant-1", "email_forwarding");
			expect(access.allowed).toBe(true);

			// requireActiveSubscription (fresh db)
			db = createMockDb();
			prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi.fn().mockResolvedValueOnce({ plan: "sapling", active: 1 }).mockResolvedValueOnce({
					status: "active",
					current_period_end: 9999999,
				}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			await expect(requireActiveSubscription(db, "tenant-1")).resolves.not.toThrow();
		});
	});

	// ==========================================================================
	// Edge Cases and Error Scenarios
	// ==========================================================================

	describe("Edge cases", () => {
		it("handles null billing.status gracefully", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({ status: null, current_period_end: null }),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await getTenantSubscription(db, "tenant-1");

			expect(result?.status).toBeNull();
			expect(result?.isActive).toBe(false); // No billing status = not active
		});

		it("handles zero timestamp in current_period_end (treated as null due to || operator)", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({
						status: "active",
						current_period_end: 0,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await getTenantSubscription(db, "tenant-1");

			// Code uses: billing?.current_period_end || null
			// So 0 (falsy) becomes null
			expect(result?.currentPeriodEnd).toBeNull();
		});

		it("handles very large timestamp values", async () => {
			const db = createMockDb();
			const largeTimestamp = Number.MAX_SAFE_INTEGER;
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 })
					.mockResolvedValueOnce({
						status: "active",
						current_period_end: largeTimestamp,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await getTenantSubscription(db, "tenant-1");

			expect(result?.currentPeriodEnd).toBe(largeTimestamp);
		});

		it("distinguishes between undefined and null in plan field", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: undefined, active: 1 })
					.mockResolvedValueOnce(null),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await getTenantSubscription(db, "tenant-1");

			// Undefined should be treated as wanderer tier (via || operator)
			expect(result?.tier).toBe("wanderer");
		});

		it("handles active field as number (database representation)", async () => {
			const db = createMockDb();
			const prepareChain = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 1 }) // Active = 1
					.mockResolvedValueOnce({
						status: "active",
						current_period_end: 1000,
					}),
			};
			(db.prepare as any).mockReturnValue(prepareChain);

			const result = await getTenantSubscription(db, "tenant-1");
			expect(result?.isActive).toBe(true);

			// Test inactive case
			const db2 = createMockDb();
			const prepareChain2 = {
				bind: vi.fn().mockReturnThis(),
				first: vi
					.fn()
					.mockResolvedValueOnce({ plan: "seedling", active: 0 }) // Inactive = 0
					.mockResolvedValueOnce({
						status: "active",
						current_period_end: 1000,
					}),
			};
			(db2.prepare as any).mockReturnValue(prepareChain2);

			const result2 = await getTenantSubscription(db2, "tenant-1");
			expect(result2?.isActive).toBe(false);
		});
	});

	// ==========================================================================
	// isCompedAccount Tests
	// ==========================================================================

	describe("isCompedAccount", () => {
		it("returns { isComped: false, tier: null } when tenant not found", async () => {
			const db = createMockDb();
			(db.first as any).mockResolvedValueOnce(null);
			(db.prepare as any).mockReturnValue({ bind: vi.fn().mockReturnThis(), first: db.first });

			const result = await isCompedAccount(db, "nonexistent-tenant");

			expect(result).toEqual({ isComped: false, tier: null });
		});

		it("returns { isComped: false, tier: 'wanderer' } for free tier (not a paid tier)", async () => {
			const db = createMockDb();
			const bindFn = vi.fn().mockReturnThis();
			(db.prepare as any).mockReturnValue({ bind: bindFn, first: db.first });
			(db.first as any).mockResolvedValueOnce({ plan: "wanderer" });

			const result = await isCompedAccount(db, "tenant-free");

			expect(result).toEqual({ isComped: false, tier: "wanderer" });
		});

		it("returns { isComped: true, tier: 'seedling' } for paid tier with no billing record", async () => {
			const db = createMockDb();
			(db.prepare as any).mockReturnThis();
			(db.bind as any).mockReturnThis();
			(db.first as any)
				.mockResolvedValueOnce({ plan: "seedling" }) // First call: tenant
				.mockResolvedValueOnce(null); // Second call: billing (no record)

			const result = await isCompedAccount(db, "tenant-comped");

			expect(result).toEqual({ isComped: true, tier: "seedling" });
		});

		it("returns { isComped: true, tier: 'oak' } for paid tier with null provider_customer_id", async () => {
			const db = createMockDb();
			(db.prepare as any).mockReturnThis();
			(db.bind as any).mockReturnThis();
			(db.first as any)
				.mockResolvedValueOnce({ plan: "oak" }) // First call: tenant
				.mockResolvedValueOnce({ provider_customer_id: null }); // Second call: billing with null customer ID

			const result = await isCompedAccount(db, "tenant-comped-with-billing");

			expect(result).toEqual({ isComped: true, tier: "oak" });
		});

		it("returns { isComped: false, tier: 'seedling' } for paid tier with provider_customer_id set", async () => {
			const db = createMockDb();
			(db.prepare as any).mockReturnThis();
			(db.bind as any).mockReturnThis();
			(db.first as any)
				.mockResolvedValueOnce({ plan: "seedling" }) // First call: tenant
				.mockResolvedValueOnce({ provider_customer_id: "cus_abc123" }); // Second call: billing with customer ID

			const result = await isCompedAccount(db, "tenant-paid");

			expect(result).toEqual({ isComped: false, tier: "seedling" });
		});

		it("handles missing plan field (defaults to 'wanderer')", async () => {
			const db = createMockDb();
			(db.prepare as any).mockReturnThis();
			(db.bind as any).mockReturnThis();
			(db.first as any)
				.mockResolvedValueOnce({ plan: null }) // Plan is null
				.mockResolvedValueOnce(null);

			const result = await isCompedAccount(db, "tenant-no-plan");

			expect(result).toEqual({ isComped: false, tier: "wanderer" });
		});

		it("handles all paid tiers as potentially comped", async () => {
			const paidTiers = ["seedling", "sapling", "oak", "evergreen"] as const;

			for (const tier of paidTiers) {
				const db = createMockDb();
				(db.prepare as any).mockReturnThis();
				(db.bind as any).mockReturnThis();
				(db.first as any).mockResolvedValueOnce({ plan: tier }).mockResolvedValueOnce(null); // No billing record = comped

				const result = await isCompedAccount(db, `tenant-${tier}`);

				expect(result.tier).toBe(tier);
				expect(result.isComped).toBe(true);
			}
		});

		it("queries tenants table with correct SQL", async () => {
			const db = createMockDb();
			const prepareFn = vi.fn().mockReturnThis();
			const bindFn = vi.fn().mockReturnThis();
			(db.prepare as any) = prepareFn;
			(db.bind as any) = bindFn;
			(db.first as any).mockResolvedValueOnce({ plan: "oak" }).mockResolvedValueOnce(null);

			await isCompedAccount(db, "tenant-123");

			expect(prepareFn).toHaveBeenCalledWith("SELECT plan FROM tenants WHERE id = ?");
			expect(bindFn).toHaveBeenCalledWith("tenant-123");
		});

		it("queries platform_billing table with correct SQL", async () => {
			const db = createMockDb();
			const prepareFn = vi.fn();
			prepareFn.mockReturnThis();
			const bindFn = vi.fn().mockReturnThis();
			prepareFn.mockReturnValueOnce({
				bind: bindFn,
				first: vi.fn().mockResolvedValueOnce({ plan: "sapling" }),
			});
			prepareFn.mockReturnValueOnce({ bind: bindFn, first: vi.fn().mockResolvedValueOnce(null) });
			(db.prepare as any) = prepareFn;

			await isCompedAccount(db, "tenant-456");

			const calls = prepareFn.mock.calls;
			expect(calls[1][0]).toContain("platform_billing");
			expect(calls[1][0]).toContain("provider_customer_id");
		});
	});

	// ==========================================================================
	// logBillingAudit Tests
	// ==========================================================================

	describe("logBillingAudit", () => {
		beforeEach(() => {
			vi.stubGlobal("crypto", {
				...crypto,
				randomUUID: () => "test-uuid-1234",
			});
		});

		it("inserts audit log with correct SQL and values", async () => {
			const db = createMockDbWithRun();
			const bindFn = vi.fn().mockReturnThis();
			(db.prepare as any).mockReturnValue({ bind: bindFn, run: db.run });

			const entry: AuditLogEntry = {
				tenantId: "tenant-123",
				action: "subscription_upgraded",
				details: { oldTier: "seedling", newTier: "oak" },
				userEmail: "user@example.com",
			};

			await logBillingAudit(db, entry);

			// Verify prepare called with correct SQL
			expect(db.prepare as any).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO audit_log"),
			);

			// Verify bind was called with correct values
			expect(bindFn).toHaveBeenCalledWith(
				"test-uuid-1234", // UUID
				"tenant-123", // tenantId
				"billing", // category
				"subscription_upgraded", // action
				JSON.stringify({ oldTier: "seedling", newTier: "oak" }), // details as JSON
				"user@example.com", // userEmail
				expect.any(Number), // timestamp
			);

			// Verify run was called
			expect(db.run).toHaveBeenCalled();
		});

		it("uses 'billing' as category regardless of action", async () => {
			const db = createMockDbWithRun();
			const bindFn = vi.fn().mockReturnThis();
			(db.prepare as any).mockReturnValue({ bind: bindFn, run: db.run });

			const entry: AuditLogEntry = {
				tenantId: "tenant-456",
				action: "payment_failed",
				details: { error: "card_declined" },
			};

			await logBillingAudit(db, entry);

			// The third bind argument should always be "billing"
			expect(bindFn).toHaveBeenCalledWith(
				expect.any(String),
				"tenant-456",
				"billing", // Always "billing"
				"payment_failed",
				expect.any(String),
				undefined, // No userEmail
				expect.any(Number),
			);
		});

		it("JSON stringifies details object", async () => {
			const db = createMockDbWithRun();
			const bindFn = vi.fn().mockReturnThis();
			(db.prepare as any).mockReturnValue({ bind: bindFn, run: db.run });

			const complexDetails = {
				plan: "oak",
				amount: 99.99,
				currency: "USD",
				metadata: { source: "webhook", provider: "stripe" },
			};

			const entry: AuditLogEntry = {
				tenantId: "tenant-789",
				action: "payment_received",
				details: complexDetails,
			};

			await logBillingAudit(db, entry);

			// Find the bind call and check the details argument
			const bindCall = bindFn.mock.calls[0] as any[];
			const detailsArg = bindCall[4];
			expect(detailsArg).toBe(JSON.stringify(complexDetails));
			expect(JSON.parse(detailsArg)).toEqual(complexDetails);
		});

		it("silently catches and logs DB errors (never throws)", async () => {
			const db = createMockDbWithRun();
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			(db.prepare as any).mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				run: vi.fn().mockRejectedValue(new Error("Database constraint violation")),
			});

			const entry: AuditLogEntry = {
				tenantId: "tenant-error",
				action: "test_action",
				details: {},
			};

			// Should NOT throw
			await expect(logBillingAudit(db, entry)).resolves.toBeUndefined();

			// Should have logged the error
			expect(consoleErrorSpy).toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("[Billing Audit]"),
				expect.objectContaining({
					error: expect.any(String),
					action: "test_action",
					tenantId: "tenant-error",
				}),
			);

			consoleErrorSpy.mockRestore();
		});

		it("logs error to console.error on failure with error message", async () => {
			const db = createMockDbWithRun();
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const errorMsg = "Unique constraint failed";
			(db.prepare as any).mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				run: vi.fn().mockRejectedValue(new Error(errorMsg)),
			});

			const entry: AuditLogEntry = {
				tenantId: "tenant-fail",
				action: "subscription_cancellation",
				details: { reason: "user_requested" },
				userEmail: "admin@example.com",
			};

			await logBillingAudit(db, entry);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("[Billing Audit]"),
				expect.objectContaining({
					error: errorMsg,
					action: "subscription_cancellation",
					tenantId: "tenant-fail",
					userEmail: "admin@example.com",
				}),
			);

			consoleErrorSpy.mockRestore();
		});

		it("handles entries without userEmail gracefully", async () => {
			const db = createMockDbWithRun();
			const bindFn = vi.fn().mockReturnThis();
			(db.prepare as any).mockReturnValue({ bind: bindFn, run: db.run });

			const entry: AuditLogEntry = {
				tenantId: "tenant-no-email",
				action: "webhook_processed",
				details: { webhookId: "evt_123" },
				// No userEmail
			};

			await logBillingAudit(db, entry);

			// Verify userEmail is passed as undefined
			expect(bindFn).toHaveBeenCalledWith(
				expect.any(String),
				"tenant-no-email",
				"billing",
				"webhook_processed",
				expect.any(String),
				undefined, // userEmail not provided
				expect.any(Number),
			);
		});

		it("generates unique UUID for each audit log entry", async () => {
			const db = createMockDbWithRun();
			const bindFn = vi.fn().mockReturnThis();
			(db.prepare as any).mockReturnValue({ bind: bindFn, run: db.run });

			let uuidCounter = 0;
			vi.stubGlobal("crypto", {
				...crypto,
				randomUUID: () => `test-uuid-${++uuidCounter}`,
			});

			const entry1: AuditLogEntry = {
				tenantId: "tenant-1",
				action: "action1",
				details: {},
			};

			const entry2: AuditLogEntry = {
				tenantId: "tenant-2",
				action: "action2",
				details: {},
			};

			await logBillingAudit(db, entry1);
			await logBillingAudit(db, entry2);

			const calls = bindFn.mock.calls;
			const uuid1 = calls[0][0];
			const uuid2 = calls[1][0];

			expect(uuid1).toBe("test-uuid-1");
			expect(uuid2).toBe("test-uuid-2");
			expect(uuid1).not.toBe(uuid2);
		});

		it("records current timestamp in seconds", async () => {
			const db = createMockDbWithRun();
			const bindFn = vi.fn().mockReturnThis();
			(db.prepare as any).mockReturnValue({ bind: bindFn, run: db.run });

			const beforeTime = Math.floor(Date.now() / 1000);
			const entry: AuditLogEntry = {
				tenantId: "tenant-timestamp",
				action: "test_action",
				details: {},
			};

			await logBillingAudit(db, entry);
			const afterTime = Math.floor(Date.now() / 1000);

			const bindCall = bindFn.mock.calls[0] as any[];
			const timestamp = bindCall[6];

			expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
			expect(timestamp).toBeLessThanOrEqual(afterTime + 1);
		});
	});
});
