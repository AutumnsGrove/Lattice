/**
 * Integration tests for GroveContext creation via mocks.
 *
 * Verifies that createMockContext() produces a fully functional
 * context object with all services wired correctly.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createMockContext, type MockGroveContext } from "../../src/testing/index.js";

describe("createMockContext", () => {
	let ctx: MockGroveContext;

	beforeEach(() => {
		ctx = createMockContext();
	});

	it("should create a context with all services", () => {
		expect(ctx.db).toBeDefined();
		expect(ctx.storage).toBeDefined();
		expect(ctx.kv).toBeDefined();
		expect(ctx.services).toBeDefined();
		expect(ctx.scheduler).toBeDefined();
		expect(ctx.config).toBeDefined();
	});

	it("should provide mock database info", () => {
		const info = ctx.db.info();
		expect(info.provider).toBe("mock");
		expect(info.database).toBe("test");
	});

	it("should provide mock storage info", () => {
		const info = ctx.storage.info();
		expect(info.provider).toBe("mock");
		expect(info.bucket).toBe("test");
	});

	it("should provide mock kv info", () => {
		const info = ctx.kv.info();
		expect(info.provider).toBe("mock");
		expect(info.namespace).toBe("test");
	});

	it("should provide mock config info", () => {
		const info = ctx.config.info();
		expect(info.provider).toBe("mock");
	});

	it("should provide mock scheduler info", () => {
		const info = ctx.scheduler.info();
		expect(info.provider).toBe("mock");
	});
});
