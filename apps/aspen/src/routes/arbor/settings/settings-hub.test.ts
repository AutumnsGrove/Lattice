/**
 * Tests for Settings Hub Page Server Load
 *
 * The hub page fetches only meadow_opt_in and blaze count from DB.
 * All other settings come from parent layout data (siteSettings, tenant).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// MOCK D1
// ============================================================================

const TENANT_ID = "tenant-test-123";

interface MockStatement {
	_sql: string;
	_bindings: unknown[];
	bind: (...values: unknown[]) => MockStatement;
	first: <T>() => Promise<T | null>;
	all: <T>() => Promise<{ results: T[] }>;
}

function createMockDB(
	options: {
		meadowOptIn?: number | null;
		blazeCount?: number;
	} = {},
) {
	const { meadowOptIn = 0, blazeCount = 0 } = options;

	const mockStatement: MockStatement = {
		_sql: "",
		_bindings: [],
		bind(...values: unknown[]) {
			this._bindings = values;
			return this;
		},
		async first<T>(): Promise<T | null> {
			if (this._sql.includes("COUNT(*)")) {
				return { count: blazeCount } as T;
			}
			if (this._sql.includes("meadow_opt_in")) {
				return { meadow_opt_in: meadowOptIn } as T;
			}
			return null;
		},
		async all<T>(): Promise<{ results: T[] }> {
			return { results: [] };
		},
	};

	return {
		prepare(sql: string) {
			const stmt = { ...mockStatement, _sql: sql, _bindings: [] };
			stmt.bind = (...values: unknown[]) => {
				stmt._bindings = values;
				return stmt;
			};
			return stmt;
		},
	};
}

function createLoadEvent(
	overrides: {
		tenantId?: string;
		db?: ReturnType<typeof createMockDB> | undefined;
	} = {},
) {
	const { tenantId = TENANT_ID, db = createMockDB() } = overrides;

	return {
		locals: {
			tenantId,
		},
		platform: {
			env: {
				DB: db,
			},
		},
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("Settings Hub — load()", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return defaults when no env bindings", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({ db: undefined });
		event.platform.env.DB = undefined;

		const result = await load(event as any);

		expect(result.meadowOptIn).toBe(false);
		expect(result.customBlazeCount).toBe(0);
	});

	it("should return meadow opt-in as true when opted in", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({
			db: createMockDB({ meadowOptIn: 1 }),
		});

		const result = await load(event as any);

		expect(result.meadowOptIn).toBe(true);
	});

	it("should return meadow opt-in as false when not opted in", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({
			db: createMockDB({ meadowOptIn: 0 }),
		});

		const result = await load(event as any);

		expect(result.meadowOptIn).toBe(false);
	});

	it("should return custom blaze count", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({
			db: createMockDB({ blazeCount: 7 }),
		});

		const result = await load(event as any);

		expect(result.customBlazeCount).toBe(7);
	});

	it("should handle DB errors gracefully with per-query catch", async () => {
		const { load } = await import("./+page.server.js");
		const failingDB = {
			prepare() {
				return {
					bind() {
						return this;
					},
					async first() {
						throw new Error("D1 unavailable");
					},
					async all() {
						throw new Error("D1 unavailable");
					},
				};
			},
		};
		const event = createLoadEvent({ db: failingDB as any });

		// Should not throw — per-query catch returns defaults
		const result = await load(event as any);

		expect(result.meadowOptIn).toBe(false);
		expect(result.customBlazeCount).toBe(0);
	});

	it("should return defaults when no tenant ID", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent();
		event.locals.tenantId = "" as any;

		const result = await load(event as any);

		expect(result.meadowOptIn).toBe(false);
		expect(result.customBlazeCount).toBe(0);
	});
});
