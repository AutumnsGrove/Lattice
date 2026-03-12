/**
 * Rate Limiting Tests
 *
 * Tests both per-agent and per-service rate limiting:
 * - RPM and daily caps
 * - KV counter increment behavior
 * - Remaining count calculation
 * - Service-level global limits
 */

import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, checkServiceRateLimit } from "./rate-limit";
import { createMockKV, createTestAgent, resetTestCounters } from "../test-helpers";

describe("checkRateLimit (per-agent)", () => {
	let kv: ReturnType<typeof createMockKV>;

	beforeEach(() => {
		resetTestCounters();
		kv = createMockKV();
	});

	it("should allow request when under limits", async () => {
		const agent = createTestAgent({ rate_limit_rpm: 60, rate_limit_daily: 1000 });

		const result = await checkRateLimit(kv as unknown as KVNamespace, agent, "github");

		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(59); // 60 - 0 - 1
	});

	it("should increment both minute and day KV counters", async () => {
		const agent = createTestAgent();

		await checkRateLimit(kv as unknown as KVNamespace, agent, "github");

		// Should have called put twice (minute + day)
		expect(kv.put).toHaveBeenCalledTimes(2);

		// Minute counter with 120s TTL
		const minuteCall = kv.put.mock.calls[0];
		expect(minuteCall[0]).toMatch(/^rl:.*:github:min:\d+$/);
		expect(minuteCall[1]).toBe("1");
		expect(minuteCall[2]).toEqual({ expirationTtl: 120 });

		// Day counter with 172800s TTL (48h)
		const dayCall = kv.put.mock.calls[1];
		expect(dayCall[0]).toMatch(/^rl:.*:daily:\d+$/);
		expect(dayCall[1]).toBe("1");
		expect(dayCall[2]).toEqual({ expirationTtl: 172800 });
	});

	it("should reject when RPM limit is reached", async () => {
		const agent = createTestAgent({ rate_limit_rpm: 10, rate_limit_daily: 1000 });

		// Simulate 10 existing requests this minute
		kv.get.mockImplementation((key: string) => {
			if (key.includes(":min:")) return Promise.resolve("10");
			return Promise.resolve("5"); // daily well under limit
		});

		const result = await checkRateLimit(kv as unknown as KVNamespace, agent, "github");

		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
		expect(result.limit).toBe(10);
	});

	it("should reject when daily limit is reached", async () => {
		const agent = createTestAgent({ rate_limit_rpm: 60, rate_limit_daily: 100 });

		// Simulate 100 existing requests today
		kv.get.mockImplementation((key: string) => {
			if (key.includes(":daily:")) return Promise.resolve("100");
			return Promise.resolve("0"); // minute well under limit
		});

		const result = await checkRateLimit(kv as unknown as KVNamespace, agent, "github");

		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
		expect(result.limit).toBe(100);
	});

	it("should check daily before minute (broader window first)", async () => {
		const agent = createTestAgent({ rate_limit_rpm: 60, rate_limit_daily: 50 });

		// Both limits exceeded
		kv.get.mockImplementation((key: string) => {
			if (key.includes(":daily:")) return Promise.resolve("50");
			if (key.includes(":min:")) return Promise.resolve("60");
			return Promise.resolve("0");
		});

		const result = await checkRateLimit(kv as unknown as KVNamespace, agent, "github");

		// Daily limit should be returned (checked first)
		expect(result.allowed).toBe(false);
		expect(result.limit).toBe(50);
	});

	it("should not increment counters when rate limited", async () => {
		const agent = createTestAgent({ rate_limit_rpm: 5, rate_limit_daily: 1000 });

		kv.get.mockImplementation((key: string) => {
			if (key.includes(":min:")) return Promise.resolve("5");
			return Promise.resolve("0");
		});

		await checkRateLimit(kv as unknown as KVNamespace, agent, "github");

		expect(kv.put).not.toHaveBeenCalled();
	});

	it("should calculate remaining as min of both windows", async () => {
		const agent = createTestAgent({ rate_limit_rpm: 60, rate_limit_daily: 100 });

		// 40 requests this minute, 90 today
		kv.get.mockImplementation((key: string) => {
			if (key.includes(":min:")) return Promise.resolve("40");
			if (key.includes(":daily:")) return Promise.resolve("90");
			return Promise.resolve("0");
		});

		const result = await checkRateLimit(kv as unknown as KVNamespace, agent, "github");

		expect(result.allowed).toBe(true);
		// min(60-40-1, 100-90-1) = min(19, 9) = 9
		expect(result.remaining).toBe(9);
	});
});

describe("checkServiceRateLimit (per-service global)", () => {
	let kv: ReturnType<typeof createMockKV>;

	beforeEach(() => {
		kv = createMockKV();
	});

	it("should allow request when under service limits", async () => {
		const result = await checkServiceRateLimit(kv as unknown as KVNamespace, "github");

		expect(result.allowed).toBe(true);
		// github has 5000 RPM, no daily
		expect(result.remaining).toBe(4999);
	});

	it("should reject when service RPM is exceeded", async () => {
		// tavily has 100 RPM
		kv.get.mockImplementation((key: string) => {
			if (key.includes(":min:")) return Promise.resolve("100");
			if (key.includes(":daily:")) return Promise.resolve("0");
			return Promise.resolve("0");
		});

		const result = await checkServiceRateLimit(kv as unknown as KVNamespace, "tavily");

		expect(result.allowed).toBe(false);
		expect(result.limit).toBe(100);
	});

	it("should enforce daily limit for services that have one", async () => {
		// tavily has daily: 1000
		kv.get.mockImplementation((key: string) => {
			if (key.includes(":daily:")) return Promise.resolve("1000");
			if (key.includes(":min:")) return Promise.resolve("0");
			return Promise.resolve("0");
		});

		const result = await checkServiceRateLimit(kv as unknown as KVNamespace, "tavily");

		expect(result.allowed).toBe(false);
		expect(result.limit).toBe(1000);
	});

	it("should allow unknown service (no limits defined)", async () => {
		const result = await checkServiceRateLimit(kv as unknown as KVNamespace, "hetzner");

		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(Infinity);
	});

	it("should use service-specific key pattern", async () => {
		await checkServiceRateLimit(kv as unknown as KVNamespace, "github");

		expect(kv.get).toHaveBeenCalledWith(expect.stringMatching(/^rl:svc:github:min:\d+$/));
	});

	it("should check daily for exa (has daily limit)", async () => {
		// exa has rpm: 60, daily: 500
		await checkServiceRateLimit(kv as unknown as KVNamespace, "exa");

		// Should check both minute and daily
		expect(kv.get).toHaveBeenCalledTimes(2);
	});

	it("should not check daily for github (no daily limit)", async () => {
		await checkServiceRateLimit(kv as unknown as KVNamespace, "github");

		// Should only check minute
		expect(kv.get).toHaveBeenCalledTimes(1);
	});
});
