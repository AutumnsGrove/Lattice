/**
 * Tests for Community Settings Page Server Load
 *
 * The community page loads meadow_opt_in from the tenants table.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertLoaded } from "../../../../test-utils";

const TENANT_ID = "tenant-test-456";

function createMockDB(meadowOptIn: number | null = 0) {
	return {
		prepare() {
			return {
				bind() {
					return this;
				},
				async first<T>(): Promise<T | null> {
					return { meadow_opt_in: meadowOptIn } as T;
				},
			};
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
			user: { email: "test@grove.place" },
			tenantId,
		},
		platform: {
			env: {
				DB: db,
			},
		},
	};
}

describe("Community Settings — load()", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return meadowOptIn as true when enabled", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({ db: createMockDB(1) });

		const result = await load(event as any);
		assertLoaded(result);

		expect(result.meadowOptIn).toBe(true);
	});

	it("should return meadowOptIn as false when disabled", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({ db: createMockDB(0) });

		const result = await load(event as any);
		assertLoaded(result);

		expect(result.meadowOptIn).toBe(false);
	});

	it("should return meadowOptIn as false when null", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({ db: createMockDB(null) });

		const result = await load(event as any);
		assertLoaded(result);

		expect(result.meadowOptIn).toBe(false);
	});

	it("should return false when no DB available", async () => {
		const { load } = await import("./+page.server.js");
		const event = createLoadEvent({ db: undefined });
		event.platform.env.DB = undefined as unknown as ReturnType<typeof createMockDB>;

		const result = await load(event as any);
		assertLoaded(result);

		expect(result.meadowOptIn).toBe(false);
	});

	it("should return false when DB query fails", async () => {
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
				};
			},
		};
		const event = createLoadEvent({ db: failingDB as any });

		const result = await load(event as any);
		assertLoaded(result);

		expect(result.meadowOptIn).toBe(false);
	});
});
