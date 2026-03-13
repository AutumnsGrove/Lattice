import { describe, it, expect, beforeEach, vi } from "vitest";

let initializeSchema: (db: D1Database) => Promise<void>;

function createMockDB() {
	const stmt = {
		bind: vi.fn().mockReturnThis(),
		first: vi.fn().mockResolvedValue(null),
		run: vi.fn().mockResolvedValue({ success: true }),
	};

	return {
		prepare: vi.fn().mockReturnValue(stmt),
		batch: vi.fn().mockResolvedValue([]),
	} as any as D1Database;
}

describe("initializeSchema", () => {
	beforeEach(async () => {
		vi.resetModules();
		const mod = await import("./schema");
		initializeSchema = mod.initializeSchema;
	});

	it("calls db.batch with 5 prepared statements on first call", async () => {
		const mockDB = createMockDB();

		await initializeSchema(mockDB);

		expect(mockDB.batch).toHaveBeenCalledOnce();
		const batchCall = (mockDB.batch as any).mock.calls[0];
		expect(batchCall[0]).toHaveLength(5);
	});

	it("db.batch receives 5 elements (5 CREATE TABLE statements)", async () => {
		const mockDB = createMockDB();

		await initializeSchema(mockDB);

		expect(mockDB.batch).toHaveBeenCalledOnce();
		const batchArg = (mockDB.batch as any).mock.calls[0][0];
		expect(batchArg).toHaveLength(5);
	});

	it("second call is a no-op (idempotent) — db.batch NOT called again", async () => {
		const mockDB = createMockDB();

		await initializeSchema(mockDB);
		expect(mockDB.batch).toHaveBeenCalledTimes(1);

		// Second call should be idempotent
		await initializeSchema(mockDB);
		expect(mockDB.batch).toHaveBeenCalledTimes(1); // Still only 1 call
	});

	it("db.prepare is called for each table", async () => {
		const mockDB = createMockDB();

		await initializeSchema(mockDB);

		expect(mockDB.prepare).toHaveBeenCalledTimes(5);
	});
});
