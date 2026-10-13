import { describe, it, expect, vi, afterEach } from "vitest";
import { syncTenantGallery, syncAllTenantGalleries } from "./gallery-sync";

function r2Object(key: string, size: number) {
	return { key, size, uploaded: new Date("2026-01-01T00:00:00Z") } as unknown as R2Object;
}

function mockBucket(objects: R2Object[]) {
	return {
		list: vi.fn(async () => ({ objects, truncated: false })),
	} as unknown as R2Bucket;
}

/** Records every prepared SQL string; `existing` is returned for the SELECT of current rows. */
function mockDb(existing: { id: string; r2_key: string }[] = []) {
	const sql: string[] = [];
	const db = {
		prepare: vi.fn((q: string) => {
			sql.push(q);
			const stmt = {
				bind: vi.fn().mockReturnThis(),
				all: vi.fn(async () => ({ results: existing })),
				run: vi.fn(async () => ({ meta: { changes: 0 } })),
			};
			return stmt;
		}),
		batch: vi.fn(async () => []),
	} as unknown as D1Database;
	return { db, sql };
}

afterEach(() => vi.restoreAllMocks());

describe("syncTenantGallery", () => {
	it("inserts new images and skips system paths and non-images", async () => {
		const bucket = mockBucket([
			r2Object("t1/photos/a.webp", 10),
			r2Object("t1/thumbs/photos/a-thumb.webp", 1),
			r2Object("t1/profile/avatar.png", 1),
			r2Object("t1/notes.txt", 1),
		]);
		const { db } = mockDb();

		const result = await syncTenantGallery(bucket, db, "t1", null);

		expect(result).toMatchObject({ added: 1, updated: 0, removed: 0, skipped: 3 });
	});

	it("updates existing rows and removes rows whose R2 object is gone", async () => {
		const bucket = mockBucket([r2Object("t1/photos/a.webp", 20)]);
		const { db } = mockDb([
			{ id: "keep", r2_key: "t1/photos/a.webp" },
			{ id: "gone", r2_key: "t1/photos/deleted.webp" },
		]);

		const result = await syncTenantGallery(bucket, db, "t1", null);

		expect(result).toMatchObject({ added: 0, updated: 1, removed: 1 });
	});
});

describe("syncAllTenantGalleries", () => {
	it("keeps sweeping when one tenant fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const bucket = {
			list: vi.fn(async ({ prefix }: { prefix: string }) => {
				if (prefix === "bad/") throw new Error("r2 down");
				return { objects: [], truncated: false };
			}),
		} as unknown as R2Bucket;

		const db = {
			prepare: vi.fn((q: string) => ({
				bind: vi.fn().mockReturnThis(),
				all: vi.fn(async () =>
					q.includes("FROM tenants")
						? {
								results: [
									{ id: "bad", cdn_base_url: null },
									{ id: "good", cdn_base_url: "https://cdn.example" },
								],
							}
						: { results: [] },
				),
				run: vi.fn(async () => ({ meta: { changes: 0 } })),
			})),
			batch: vi.fn(async () => []),
		} as unknown as D1Database;

		const result = await syncAllTenantGalleries(bucket, db);

		expect(result).toEqual({ tenants: 2, failed: ["bad"] });
	});
});
