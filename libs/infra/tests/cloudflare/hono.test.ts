/**
 * Tests for Hono middleware integration.
 */

import { describe, it, expect, vi } from "vitest";
import { groveInfraMiddleware } from "../../src/cloudflare/hono.js";
import { createMockD1, createMockR2, createMockKVNamespace } from "./helpers.js";

vi.mock("@autumnsgrove/lattice/errors", () => ({
	logGroveError: vi.fn(),
}));

function createMockHonoContext(env: Record<string, unknown>) {
	const store = new Map<string, unknown>();
	return {
		env,
		set: vi.fn((key: string, value: unknown) => store.set(key, value)),
		_store: store,
	};
}

describe("groveInfraMiddleware", () => {
	it("should set ctx on the Hono context (rawEnv not exposed)", async () => {
		const env = {
			DB: createMockD1(),
			BUCKET: createMockR2(),
			KV: createMockKVNamespace(),
			SECRET: "s3cret",
		};

		const middleware = groveInfraMiddleware((env) => ({
			db: env.DB as unknown as D1Database,
			storage: env.BUCKET as unknown as R2Bucket,
			kv: env.KV as unknown as KVNamespace,
			env: env as Record<string, unknown>,
		}));

		const c = createMockHonoContext(env as Record<string, unknown>);
		const next = vi.fn().mockResolvedValue(undefined);

		await middleware(c, next);

		expect(c.set).toHaveBeenCalledWith("ctx", expect.objectContaining({ db: expect.anything() }));
		expect(c.set).not.toHaveBeenCalledWith("rawEnv", expect.anything()); // secrets stay on c.env
		expect(next).toHaveBeenCalledOnce();
	});

	it("should call next after setting context", async () => {
		const callOrder: string[] = [];

		const middleware = groveInfraMiddleware((env) => ({
			env: env as Record<string, unknown>,
		}));

		const c = createMockHonoContext({});
		const next = vi.fn(async () => {
			callOrder.push("next");
		});
		c.set = vi.fn((..._args: unknown[]) => {
			callOrder.push("set");
		});

		await middleware(c, next);

		// set calls should happen before next
		expect(callOrder[callOrder.length - 1]).toBe("next");
	});

	it("should support partial context (db only)", async () => {
		const env = { DB: createMockD1() };

		const middleware = groveInfraMiddleware((env) => ({
			db: env.DB as unknown as D1Database,
			env: env as Record<string, unknown>,
		}));

		const c = createMockHonoContext(env as Record<string, unknown>);
		const next = vi.fn().mockResolvedValue(undefined);

		await middleware(c, next);

		expect(c.set).toHaveBeenCalledWith("ctx", expect.anything());
	});
});
