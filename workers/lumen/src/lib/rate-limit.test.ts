/**
 * Rate Limiting Tests
 *
 * Tests Threshold SDK integration in Lumen's rate limiting middleware.
 * Verifies KV skip behavior, rate limit headers, and 429 responses.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "../types";

// Mock the engine's Threshold SDK modules
const mockCheck = vi.fn();

vi.mock("@autumnsgrove/lattice/threshold", () => ({
	Threshold: vi.fn().mockImplementation(() => ({
		check: mockCheck,
	})),
	ThresholdKVStore: vi.fn(),
	ENDPOINT_RATE_LIMITS: {
		"lumen/inference": { limit: 60, windowSeconds: 60 },
		"lumen/embed": { limit: 120, windowSeconds: 60 },
		"lumen/moderate": { limit: 120, windowSeconds: 60 },
		"lumen/transcribe": { limit: 30, windowSeconds: 60 },
	},
}));

vi.mock("@autumnsgrove/lattice/threshold/hono", () => ({
	thresholdMiddleware: vi.fn((opts) => {
		// Return a middleware that calls Threshold.check directly
		return async (
			c: {
				env: Record<string, unknown>;
				req: { header: (name: string) => string | undefined };
				header: (name: string, value: string) => void;
				json: (data: unknown, status?: number) => Response;
			},
			next: () => Promise<void>,
		) => {
			// Simulate what thresholdMiddleware does internally
			const keyPart = opts.getKey(c);
			if (!keyPart) return next();

			const result = await opts.threshold.check({
				key: `${opts.keyPrefix}:${keyPart}`,
				limit: opts.limit,
				windowSeconds: opts.windowSeconds,
				failMode: opts.failMode,
			});

			c.header("X-RateLimit-Limit", String(opts.limit));
			c.header("X-RateLimit-Remaining", String(result.remaining));
			c.header("X-RateLimit-Reset", String(result.resetAt));

			if (!result.allowed) {
				const retryAfter = result.retryAfter ?? 60;
				c.header("Retry-After", String(retryAfter));
				return c.json(
					{
						error: "rate_limited",
						message: "Too many requests. Please try again later.",
						retryAfter,
					},
					429,
				);
			}

			return next();
		};
	}),
}));

import { lumenRateLimit } from "./rate-limit";

// =============================================================================
// HELPERS
// =============================================================================

function createMockContext(overrides: Partial<{ env: Partial<Env>; ip: string }> = {}) {
	const responseHeaders: Record<string, string> = {};
	return {
		env: {
			RATE_LIMITS: {} as KVNamespace,
			...overrides.env,
		} as Env,
		req: {
			header: vi.fn((name: string) => {
				if (name === "cf-connecting-ip") return overrides.ip ?? "1.2.3.4";
				return undefined;
			}),
		},
		header: vi.fn((name: string, value: string) => {
			responseHeaders[name] = value;
		}),
		json: vi.fn((data: unknown, status?: number) => {
			return new Response(JSON.stringify(data), { status: status ?? 200 });
		}),
		_headers: responseHeaders,
	};
}

describe("lumenRateLimit", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should skip rate limiting when RATE_LIMITS not bound", async () => {
		const middleware = lumenRateLimit("lumen/inference");
		const next = vi.fn();
		const ctx = createMockContext({ env: { RATE_LIMITS: undefined as unknown as KVNamespace } });

		await middleware(ctx as unknown as Parameters<typeof middleware>[0], next);
		expect(next).toHaveBeenCalled();
	});

	it("should allow requests under the limit", async () => {
		mockCheck.mockResolvedValue({
			allowed: true,
			remaining: 59,
			resetAt: Math.floor(Date.now() / 1000) + 60,
		});

		const middleware = lumenRateLimit("lumen/inference");
		const next = vi.fn();
		const ctx = createMockContext();

		await middleware(ctx as unknown as Parameters<typeof middleware>[0], next);
		expect(next).toHaveBeenCalled();
	});

	it("should set rate limit headers on allowed requests", async () => {
		mockCheck.mockResolvedValue({
			allowed: true,
			remaining: 59,
			resetAt: 1700000060,
		});

		const middleware = lumenRateLimit("lumen/inference");
		const next = vi.fn();
		const ctx = createMockContext();

		await middleware(ctx as unknown as Parameters<typeof middleware>[0], next);

		expect(ctx.header).toHaveBeenCalledWith("X-RateLimit-Limit", "60");
		expect(ctx.header).toHaveBeenCalledWith("X-RateLimit-Remaining", "59");
		expect(ctx.header).toHaveBeenCalledWith("X-RateLimit-Reset", "1700000060");
	});

	it("should return 429 when rate limit exceeded", async () => {
		mockCheck.mockResolvedValue({
			allowed: false,
			remaining: 0,
			resetAt: 1700000060,
			retryAfter: 45,
		});

		const middleware = lumenRateLimit("lumen/inference");
		const next = vi.fn();
		const ctx = createMockContext();

		await middleware(ctx as unknown as Parameters<typeof middleware>[0], next);

		expect(next).not.toHaveBeenCalled();
		expect(ctx.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: "rate_limited",
				retryAfter: 45,
			}),
			429,
		);
	});

	it("should set Retry-After header on 429", async () => {
		mockCheck.mockResolvedValue({
			allowed: false,
			remaining: 0,
			resetAt: 1700000060,
			retryAfter: 30,
		});

		const middleware = lumenRateLimit("lumen/inference");
		const next = vi.fn();
		const ctx = createMockContext();

		await middleware(ctx as unknown as Parameters<typeof middleware>[0], next);

		expect(ctx.header).toHaveBeenCalledWith("Retry-After", "30");
	});

	it("should use different limits per endpoint", async () => {
		mockCheck.mockResolvedValue({ allowed: true, remaining: 29, resetAt: 1700000060 });

		// Transcribe has limit of 30 (stricter than inference at 60)
		const transcribeMiddleware = lumenRateLimit("lumen/transcribe");
		const next = vi.fn();
		const ctx = createMockContext();

		await transcribeMiddleware(ctx as unknown as Parameters<typeof transcribeMiddleware>[0], next);

		expect(ctx.header).toHaveBeenCalledWith("X-RateLimit-Limit", "30");
	});

	it("should extract IP from cf-connecting-ip header", async () => {
		mockCheck.mockResolvedValue({ allowed: true, remaining: 59, resetAt: 1700000060 });

		const middleware = lumenRateLimit("lumen/inference");
		const next = vi.fn();
		const ctx = createMockContext({ ip: "10.20.30.40" });

		await middleware(ctx as unknown as Parameters<typeof middleware>[0], next);

		// Verify the check was called with the correct key containing the IP
		expect(mockCheck).toHaveBeenCalledWith(
			expect.objectContaining({
				key: expect.stringContaining("10.20.30.40"),
			}),
		);
	});
});
