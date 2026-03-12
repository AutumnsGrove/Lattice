import { describe, it, expect, vi } from "vitest";
import { restoreGuideHandler } from "./restore-guide";

function createMockContext(dbName?: string, backups?: any[]): any {
	const boundStatement = {
		all: vi.fn().mockResolvedValue({ results: backups || [] }),
		first: vi.fn(),
		run: vi.fn(),
		bind: vi.fn().mockReturnThis(),
	};
	return {
		req: {
			param: vi.fn().mockImplementation((name: string) => {
				if (name === "db") return dbName;
				return undefined;
			}),
		},
		env: {
			METADATA_DB: {
				prepare: vi.fn().mockReturnValue(boundStatement),
			},
		},
		json: vi.fn().mockImplementation((body: any, status?: number) => {
			return new Response(JSON.stringify(body), { status: status || 200 });
		}),
	};
}

describe("restoreGuideHandler", () => {
	it("returns 404 for unknown database name with available databases list", async () => {
		const ctx = createMockContext("unknown-db", []);
		const response = await restoreGuideHandler(ctx);
		const data = JSON.parse(await response.text());

		expect(response.status).toBe(404);
		expect(data.error).toBe("Database not found");
		expect(data.availableDatabases).toBeDefined();
		expect(Array.isArray(data.availableDatabases)).toBe(true);
		expect(data.availableDatabases.length).toBeGreaterThan(0);
	});

	it("returns restore guide for valid database (groveauth)", async () => {
		const mockBackups = [
			{
				backup_date: "2026-03-12",
				size_bytes: 217088,
				table_count: 5,
			},
		];
		const ctx = createMockContext("groveauth", mockBackups);
		const response = await restoreGuideHandler(ctx);
		const data = JSON.parse(await response.text());

		expect(response.status).toBe(200);
		expect(data.database).toBe("groveauth");
		expect(data.databaseId).toBeDefined();
		expect(data.description).toBeDefined();
		expect(data.priority).toBe("critical");
	});

	it("includes wrangler and time-travel restore methods", async () => {
		const mockBackups = [
			{
				backup_date: "2026-03-12",
				size_bytes: 217088,
				table_count: 5,
			},
		];
		const ctx = createMockContext("groveauth", mockBackups);
		const response = await restoreGuideHandler(ctx);
		const data = JSON.parse(await response.text());

		expect(data.restoreInstructions).toBeDefined();
		expect(data.restoreInstructions.method1_wrangler).toBeDefined();
		expect(data.restoreInstructions.method2_timetravel).toBeDefined();
		expect(data.restoreInstructions.method1_wrangler.name).toContain("Wrangler");
		expect(data.restoreInstructions.method2_timetravel.name).toContain("Time Travel");
	});

	it("includes available backups from DB query", async () => {
		const mockBackups = [
			{
				backup_date: "2026-03-12",
				size_bytes: 217088,
				table_count: 5,
			},
			{
				backup_date: "2026-03-05",
				size_bytes: 215000,
				table_count: 5,
			},
		];
		const ctx = createMockContext("groveauth", mockBackups);
		const response = await restoreGuideHandler(ctx);
		const data = JSON.parse(await response.text());

		expect(data.availableBackups).toBeDefined();
		expect(data.availableBackups.length).toBe(2);
		expect(data.availableBackups[0].date).toBe("2026-03-12");
		expect(data.availableBackups[0].size).toBeDefined();
		expect(data.availableBackups[0].tables).toBe(5);
		expect(data.availableBackups[0].downloadUrl).toBeDefined();
	});

	it("handles DB query error gracefully (returns 500)", async () => {
		const ctx = createMockContext("groveauth");
		const boundStatement = {
			all: vi.fn().mockRejectedValue(new Error("Database error")),
			bind: vi.fn().mockReturnThis(),
		};
		ctx.env.METADATA_DB.prepare = vi.fn().mockReturnValue(boundStatement);

		const response = await restoreGuideHandler(ctx);
		const data = JSON.parse(await response.text());

		expect(response.status).toBe(500);
		expect(data.error).toBe("Failed to generate restore guide");
		expect(data.message).toBeDefined();
	});

	it("queries database with correct parameters", async () => {
		const mockBackups = [
			{
				backup_date: "2026-03-12",
				size_bytes: 217088,
				table_count: 5,
			},
		];
		const ctx = createMockContext("groveauth", mockBackups);
		await restoreGuideHandler(ctx);

		expect(ctx.env.METADATA_DB.prepare).toHaveBeenCalled();
		const prepareCall = ctx.env.METADATA_DB.prepare.mock.calls[0];
		expect(prepareCall[0]).toContain("backup_inventory");
		expect(prepareCall[0]).toContain("database_name");
	});

	it("formats bytes correctly in available backups", async () => {
		const mockBackups = [
			{
				backup_date: "2026-03-12",
				size_bytes: 1048576, // 1 MB
				table_count: 5,
			},
		];
		const ctx = createMockContext("groveauth", mockBackups);
		const response = await restoreGuideHandler(ctx);
		const data = JSON.parse(await response.text());

		expect(data.availableBackups[0].size).toContain("MB");
	});
});
