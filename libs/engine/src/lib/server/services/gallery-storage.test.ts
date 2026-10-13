import { describe, it, expect, vi, afterEach } from "vitest";
import { getTenantStorageUsed, getAllTenantsStorageUsed } from "./gallery-storage";

function mockDb(handlers: { first?: () => unknown; all?: () => unknown }) {
	const stmt = {
		bind: vi.fn().mockReturnThis(),
		first: vi.fn(async () => handlers.first?.()),
		all: vi.fn(async () => handlers.all?.()),
	};
	return { prepare: vi.fn(() => stmt) } as unknown as D1Database;
}

afterEach(() => vi.restoreAllMocks());

describe("getTenantStorageUsed", () => {
	it("returns the summed bytes", async () => {
		const db = mockDb({ first: () => ({ used_bytes: 4096 }) });
		expect(await getTenantStorageUsed(db, "t1")).toEqual({ ok: true, bytes: 4096 });
	});

	it("treats an empty account as a genuine 0", async () => {
		const db = mockDb({ first: () => null });
		expect(await getTenantStorageUsed(db, "t1")).toEqual({ ok: true, bytes: 0 });
	});

	it("reports a failed query as not-ok rather than 0 bytes", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const db = mockDb({
			first: () => {
				throw new Error("no such table: gallery_images");
			},
		});
		expect(await getTenantStorageUsed(db, "t1")).toEqual({ ok: false });
	});
});

describe("getAllTenantsStorageUsed", () => {
	it("groups per tenant and totals", async () => {
		const db = mockDb({
			all: () => ({
				results: [
					{ tenant_id: "a", used_bytes: 100 },
					{ tenant_id: "b", used_bytes: 250 },
				],
			}),
		});
		const result = await getAllTenantsStorageUsed(db);
		expect(result).toEqual({
			ok: true,
			byTenant: new Map([
				["a", 100],
				["b", 250],
			]),
			totalBytes: 350,
		});
	});

	it("reports a failed query as not-ok", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const db = mockDb({
			all: () => {
				throw new Error("boom");
			},
		});
		expect(await getAllTenantsStorageUsed(db)).toEqual({ ok: false });
	});
});
