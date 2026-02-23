/**
 * Unit tests for CloudflareScheduler adapter.
 *
 * Validates handler registration, cron dispatch,
 * fallback behavior, and info() metadata.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CloudflareScheduler } from "../../src/cloudflare/scheduler.js";

vi.mock("@autumnsgrove/lattice/errors", () => ({
	logGroveError: vi.fn(),
}));

describe("CloudflareScheduler", () => {
	let scheduler: CloudflareScheduler;

	beforeEach(() => {
		vi.clearAllMocks();
		scheduler = new CloudflareScheduler();
	});

	// =========================================================================
	// on()
	// =========================================================================

	describe("on", () => {
		it("should register a handler by name", () => {
			const handler = vi.fn();
			scheduler.on("cleanup", handler);

			// Verify via schedules — on() doesn't add to cronMap
			// so we test dispatch by name fallback
		});
	});

	// =========================================================================
	// register()
	// =========================================================================

	describe("register", () => {
		it("should register handler with cron expression", () => {
			const handler = vi.fn();
			scheduler.register("daily-cleanup", "0 0 * * *", handler);

			const schedules = scheduler.schedules();
			expect(schedules).toHaveLength(1);
			expect(schedules[0]!.name).toBe("daily-cleanup");
			expect(schedules[0]!.cron).toBe("0 0 * * *");
		});

		it("should allow multiple registrations", () => {
			scheduler.register("cleanup", "0 0 * * *", vi.fn());
			scheduler.register("metrics", "*/5 * * * *", vi.fn());

			expect(scheduler.schedules()).toHaveLength(2);
		});
	});

	// =========================================================================
	// dispatch()
	// =========================================================================

	describe("dispatch", () => {
		it("should dispatch to handler matching cron expression", async () => {
			const handler = vi.fn().mockResolvedValue(undefined);
			scheduler.register("cleanup", "0 0 * * *", handler);

			const time = new Date("2026-01-01T00:00:00Z");
			await scheduler.dispatch("0 0 * * *", time);

			expect(handler).toHaveBeenCalledWith({
				name: "cleanup",
				scheduledTime: time,
				cron: "0 0 * * *",
			});
		});

		it("should fallback to matching by handler name", async () => {
			const handler = vi.fn().mockResolvedValue(undefined);
			scheduler.on("manual-job", handler);

			const time = new Date();
			await scheduler.dispatch("manual-job", time);

			expect(handler).toHaveBeenCalledWith({
				name: "manual-job",
				scheduledTime: time,
				cron: "manual-job",
			});
		});

		it("should log warning when no handler matches", async () => {
			await scheduler.dispatch("*/15 * * * *", new Date());

			const { logGroveError } = await import("@autumnsgrove/lattice/errors");
			expect(logGroveError).toHaveBeenCalled();
		});

		it("should not call wrong handler", async () => {
			const cleanupHandler = vi.fn().mockResolvedValue(undefined);
			const metricsHandler = vi.fn().mockResolvedValue(undefined);
			scheduler.register("cleanup", "0 0 * * *", cleanupHandler);
			scheduler.register("metrics", "*/5 * * * *", metricsHandler);

			await scheduler.dispatch("*/5 * * * *", new Date());

			expect(cleanupHandler).not.toHaveBeenCalled();
			expect(metricsHandler).toHaveBeenCalled();
		});
	});

	// =========================================================================
	// schedules()
	// =========================================================================

	describe("schedules", () => {
		it("should return empty array when no schedules registered", () => {
			expect(scheduler.schedules()).toEqual([]);
		});

		it("should only include handlers registered via register()", () => {
			scheduler.on("name-only", vi.fn());
			scheduler.register("with-cron", "0 * * * *", vi.fn());

			const schedules = scheduler.schedules();
			expect(schedules).toHaveLength(1);
			expect(schedules[0]!.name).toBe("with-cron");
		});
	});

	// =========================================================================
	// info()
	// =========================================================================

	describe("info", () => {
		it("should return correct provider", () => {
			expect(scheduler.info()).toEqual({ provider: "cloudflare-cron" });
		});
	});
});
