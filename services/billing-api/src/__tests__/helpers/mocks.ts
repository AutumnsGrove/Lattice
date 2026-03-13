/**
 * Shared Test Mocks for BillingHub API
 *
 * Factories for D1, KV, Fetcher, and Env mocks.
 * Used across all route and service tests.
 */

import { vi } from "vitest";
import type { Env } from "../../types.js";

// =============================================================================
// D1 DATABASE MOCK
// =============================================================================

/**
 * Create a mock D1 database with chainable .prepare().bind().first()/.run() pattern.
 *
 * Usage:
 *   const { db, mocks } = createMockD1();
 *   mocks.first.mockResolvedValueOnce({ id: "123", plan: "seedling" });
 *   // ... use db in route handler ...
 *   expect(mocks.prepare).toHaveBeenCalledWith(expect.stringContaining("SELECT"));
 */
export function createMockD1() {
	const mockFirst = vi.fn().mockResolvedValue(null);
	const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 }, success: true });
	const mockAll = vi.fn().mockResolvedValue({ results: [] });
	const mockBind = vi.fn().mockReturnValue({
		first: mockFirst,
		run: mockRun,
		all: mockAll,
	});
	const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
	const mockBatch = vi.fn().mockResolvedValue([]);

	return {
		db: {
			prepare: mockPrepare,
			batch: mockBatch,
		} as unknown as D1Database,
		mocks: {
			prepare: mockPrepare,
			bind: mockBind,
			first: mockFirst,
			run: mockRun,
			all: mockAll,
			batch: mockBatch,
		},
	};
}

// =============================================================================
// KV NAMESPACE MOCK
// =============================================================================

/**
 * Create a mock KV namespace (always allows requests through rate limiter).
 */
export function createMockKV() {
	return {
		get: vi.fn().mockResolvedValue(null),
		put: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(undefined),
		list: vi.fn().mockResolvedValue({ keys: [] }),
		getWithMetadata: vi.fn().mockResolvedValue({ value: null, metadata: null }),
	} as unknown as KVNamespace;
}

// =============================================================================
// FETCHER MOCK (SERVICE BINDING)
// =============================================================================

/**
 * Create a mock Fetcher (for Zephyr email service binding).
 */
export function createMockFetcher(response?: { status?: number; body?: unknown }) {
	const status = response?.status ?? 200;
	const body = response?.body ?? { ok: true };

	return {
		fetch: vi.fn().mockResolvedValue(
			new Response(JSON.stringify(body), {
				status,
				headers: { "Content-Type": "application/json" },
			}),
		),
	} as unknown as Fetcher;
}

// =============================================================================
// FULL ENV MOCK
// =============================================================================

/**
 * Create a complete mock Env for billing-api route tests.
 * CACHE_KV is omitted by default so rate limiting is skipped.
 */
export function createMockEnv(overrides: Partial<Record<string, unknown>> = {}) {
	const { db } = createMockD1();

	return {
		DB: db,
		ZEPHYR: createMockFetcher(),
		STRIPE_SECRET_KEY: "sk_test_mock_key_for_testing",
		STRIPE_WEBHOOK_SECRET: "whsec_test_mock_secret_for_testing",
		ENVIRONMENT: "test",
		BILLING_HUB_URL: "https://billing.grove.place",
		...overrides,
	} as unknown as Env;
}

// =============================================================================
// STRIPE CLIENT MOCK FACTORY
// =============================================================================

/**
 * Create a mock StripeClient instance with all methods stubbed.
 * Reset in beforeEach with vi.clearAllMocks().
 */
export function createMockStripeInstance() {
	return {
		createCheckoutSession: vi.fn().mockResolvedValue({
			url: "https://checkout.stripe.com/c/pay/cs_test_mock",
			id: "cs_test_mock_session_123",
		}),
		createBillingPortalSession: vi.fn().mockResolvedValue({
			url: "https://billing.stripe.com/p/session/mock_portal",
		}),
		cancelSubscription: vi.fn().mockResolvedValue({
			id: "sub_test_123",
			cancel_at_period_end: true,
			current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
		}),
		resumeSubscription: vi.fn().mockResolvedValue({
			id: "sub_test_123",
			cancel_at_period_end: false,
		}),
		listCustomers: vi.fn().mockResolvedValue({ data: [] }),
		getSubscription: vi.fn(),
		getCustomer: vi.fn(),
		verifyWebhookSignature: vi.fn(),
	};
}

// =============================================================================
// TEST CONSTANTS
// =============================================================================

/** Valid UUID for test tenant */
export const TEST_TENANT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

/** Valid UUID for test onboarding */
export const TEST_ONBOARDING_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";

/** Mock ExecutionContext */
export function createMockCtx() {
	return {
		waitUntil: vi.fn(),
		passThroughOnException: vi.fn(),
	} as unknown as ExecutionContext;
}
