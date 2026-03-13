/**
 * Health Check Route Tests
 *
 * Tests for GET /health endpoint that checks D1 and Stripe connectivity.
 * Verifies that latencyMs and service names are NOT exposed in responses (security fix M-05).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import health from "../../routes/health.js";
import { createMockEnv, createMockStripeInstance, createMockD1 } from "../helpers/mocks.js";

vi.mock("../../stripe/client.js", () => ({
	StripeClient: vi.fn(function () {
		return mockStripe;
	}),
}));

let mockStripe: ReturnType<typeof createMockStripeInstance>;

describe("GET /health", () => {
	beforeEach(() => {
		mockStripe = createMockStripeInstance();
		vi.clearAllMocks();
	});

	it("returns healthy (200) when both D1 and Stripe checks pass", async () => {
		const { db } = createMockD1();
		// Health route calls db.prepare("SELECT 1").first() — no .bind() in chain
		// Override prepare to return { first } directly
		(db as any).prepare = vi.fn().mockReturnValue({
			first: vi.fn().mockResolvedValue({ 1: 1 }),
		});
		const env = createMockEnv({ DB: db });
		const response = await health.request("/", { method: "GET" }, env);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(200);
		expect(body.status).toBe("healthy");
		expect(body.checks).toHaveProperty("d1");
		expect(body.checks).toHaveProperty("stripe");
		expect((body.checks as Record<string, unknown>).d1).toEqual({
			ok: true,
		});
		expect((body.checks as Record<string, unknown>).stripe).toEqual({
			ok: true,
		});
	});

	it("returns degraded (503) when D1 check fails", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			first: vi.fn().mockRejectedValue(new Error("D1 connection timeout")),
		});
		const env = createMockEnv({ DB: db });

		const response = await health.request("/", { method: "GET" }, env);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(503);
		expect(body.status).toBe("degraded");
		expect((body.checks as Record<string, unknown>).d1).toEqual({
			ok: false,
			error: "D1 unreachable",
		});
		expect((body.checks as Record<string, unknown>).stripe).toEqual({
			ok: true,
		});
	});

	it("returns degraded (503) when Stripe check fails", async () => {
		mockStripe.listCustomers.mockRejectedValue(new Error("Stripe API error"));
		const { db } = createMockD1();
		(db as any).prepare = vi.fn().mockReturnValue({
			first: vi.fn().mockResolvedValue({ 1: 1 }),
		});
		const env = createMockEnv({ DB: db });

		const response = await health.request("/", { method: "GET" }, env);
		const body = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(503);
		expect(body.status).toBe("degraded");
		expect((body.checks as Record<string, unknown>).d1).toEqual({
			ok: true,
		});
		expect((body.checks as Record<string, unknown>).stripe).toEqual({
			ok: false,
			error: "Stripe unreachable",
		});
	});

	it("does NOT expose latencyMs in response (security fix M-05)", async () => {
		const { db } = createMockD1();
		(db as any).prepare = vi.fn().mockReturnValue({
			first: vi.fn().mockResolvedValue({ 1: 1 }),
		});
		const env = createMockEnv({ DB: db });
		const response = await health.request("/", { method: "GET" }, env);
		const body = (await response.json()) as Record<string, unknown>;

		const checks = body.checks as Record<string, unknown>;
		const d1Check = checks.d1 as Record<string, unknown>;
		const stripeCheck = checks.stripe as Record<string, unknown>;

		expect(d1Check).not.toHaveProperty("latencyMs");
		expect(stripeCheck).not.toHaveProperty("latencyMs");
	});

	it("does NOT expose service names in response (security fix M-05)", async () => {
		const { db } = createMockD1();
		(db as any).prepare = vi.fn().mockReturnValue({
			first: vi.fn().mockResolvedValue({ 1: 1 }),
		});
		const env = createMockEnv({ DB: db });
		const response = await health.request("/", { method: "GET" }, env);
		const body = (await response.json()) as Record<string, unknown>;

		// Should only have 'status' and 'checks' at the top level
		expect(Object.keys(body).sort()).toEqual(["checks", "status"]);

		// 'checks' should only have 'd1' and 'stripe', not any derived service names
		const checks = body.checks as Record<string, unknown>;
		expect(Object.keys(checks).sort()).toEqual(["d1", "stripe"]);
	});

	it("exposes error messages when checks fail", async () => {
		const { db, mocks } = createMockD1();
		mocks.prepare.mockReturnValue({
			first: vi.fn().mockRejectedValue(new Error("Database connection failed")),
		});
		mockStripe.listCustomers.mockRejectedValue(new Error("Stripe API unavailable"));

		const env = createMockEnv({ DB: db });
		const response = await health.request("/", { method: "GET" }, env);
		const body = (await response.json()) as Record<string, unknown>;

		const checks = body.checks as Record<string, unknown>;
		expect((checks.d1 as Record<string, unknown>).error).toBe("D1 unreachable");
		expect((checks.stripe as Record<string, unknown>).error).toBe("Stripe unreachable");
	});
});
