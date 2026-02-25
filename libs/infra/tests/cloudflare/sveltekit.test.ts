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
	it("should set ctx and rawEnv on event.locals when platform env exists", async () => {
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
		expect(event.locals.rawEnv).toBe(env);
		expect(result).toBe(mockResponse);
		expect(resolve).toHaveBeenCalledWith(event);
	});

	it("should skip context creation when platform.env is undefined", async () => {
		const handle = createGroveHandle((env) => ({
			env: env as Record<string, unknown>,
		}));

		const event = createMockEvent(); // no platform
		const mockResponse = new Response("ok");
		const resolve = vi.fn().mockResolvedValue(mockResponse);

		const result = await handle({ event, resolve });

		expect(event.locals.ctx).toBeUndefined();
		expect(result).toBe(mockResponse);
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
