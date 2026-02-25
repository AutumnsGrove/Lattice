/**
 * Tests for SvelteKit handle hook integration.
 */

import { describe, it, expect, vi } from "vitest";
import { createGroveHandle } from "../../src/cloudflare/sveltekit.js";
import { createMockD1, createMockR2, createMockKVNamespace } from "./helpers.js";

vi.mock("@autumnsgrove/lattice/errors", () => ({
	logGroveError: vi.fn(),
}));

function createMockEvent(env?: Record<string, unknown>) {
	return {
		platform: env ? { env } : undefined,
		locals: {} as Record<string, unknown>,
	};
}

describe("createGroveHandle", () => {
	it("should set ctx on event.locals when platform env exists", async () => {
		const env = {
			DB: createMockD1(),
			BUCKET: createMockR2(),
			KV: createMockKVNamespace(),
		};

		const handle = createGroveHandle((env) => ({
			db: env.DB as unknown as D1Database,
			storage: env.BUCKET as unknown as R2Bucket,
			kv: env.KV as unknown as KVNamespace,
			env: env as Record<string, unknown>,
		}));

		const event = createMockEvent(env as Record<string, unknown>);
		const mockResponse = new Response("ok");
		const resolve = vi.fn().mockResolvedValue(mockResponse);

		const result = await handle({ event, resolve });

		expect(event.locals.ctx).toBeDefined();
		expect(event.locals.rawEnv).toBeUndefined(); // rawEnv intentionally NOT set — use event.platform.env
		expect(result).toBe(mockResponse);
		expect(resolve).toHaveBeenCalledWith(event);
	});

	it("should skip context creation and warn when platform.env is undefined", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const handle = createGroveHandle((env) => ({
			env: env as Record<string, unknown>,
		}));

		const event = createMockEvent(); // no platform
		const mockResponse = new Response("ok");
		const resolve = vi.fn().mockResolvedValue(mockResponse);

		const result = await handle({ event, resolve });

		expect(event.locals.ctx).toBeUndefined();
		expect(result).toBe(mockResponse);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("platform.env not available"));

		warnSpy.mockRestore();
	});

	it("should throttle warnings to once per 60s window", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const handle = createGroveHandle((env) => ({
			env: env as Record<string, unknown>,
		}));

		const resolve = vi.fn().mockResolvedValue(new Response("ok"));

		// First request warns
		await handle({ event: createMockEvent(), resolve });
		expect(warnSpy).toHaveBeenCalledTimes(1);

		// Rapid follow-up requests within 60s are suppressed
		await handle({ event: createMockEvent(), resolve });
		await handle({ event: createMockEvent(), resolve });
		expect(warnSpy).toHaveBeenCalledTimes(1);

		// After 60s, the warning fires again
		vi.spyOn(Date, "now").mockReturnValue(Date.now() + 61_000);
		await handle({ event: createMockEvent(), resolve });
		expect(warnSpy).toHaveBeenCalledTimes(2);

		vi.restoreAllMocks();
	});

	it("should support partial context (db only)", async () => {
		const env = { DB: createMockD1() };

		const handle = createGroveHandle((env) => ({
			db: env.DB as unknown as D1Database,
			env: env as Record<string, unknown>,
		}));

		const event = createMockEvent(env as Record<string, unknown>);
		const resolve = vi.fn().mockResolvedValue(new Response("ok"));

		await handle({ event, resolve });

		expect(event.locals.ctx).toBeDefined();
	});
});
