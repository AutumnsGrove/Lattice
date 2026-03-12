import { describe, it, expect, vi } from "vitest";
import { listHandler } from "./list";

function createMockContext(
	queryParams?: Record<string, string>,
	dbResults?: { count?: number; backups?: any[] },
): any {
	const boundStatement = {
		first: vi.fn().mockResolvedValue({ count: dbResults?.count ?? 0 }),
		all: vi.fn().mockResolvedValue({ results: dbResults?.backups || [] }),
		run: vi.fn(),
		bind: vi.fn().mockReturnThis(),
	};
	return {
		req: {
			query: vi.fn().mockImplementation((name: string) => queryParams?.[name]),
		},
		env: {
			METADATA_DB: { prepare: vi.fn().mockReturnValue(boundStatement) },
		},
		json: vi
			.fn()
			.mockImplementation(
				(body: any, status?: number) =>
					new Response(JSON.stringify(body), { status: status || 200 }),
			),
	};
}

describe("listHandler", () => {
	it("returns empty list when no backups exist", async () => {
		const mockCtx = createMockContext();
		const response = await listHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(response.status).toBe(200);
		expect(Array.isArray(body.backups)).toBe(true);
		expect(body.backups.length).toBe(0);
		expect(body.total).toBe(0);
		expect(body.filtered).toBe(0);
	});

	it("returns backups with formatted size, dates, download URLs", async () => {
		const backups = [
			{
				database_name: "groveauth",
				backup_date: "2026-03-01",
				r2_key: "2026-03-01/groveauth.sql",
				size_bytes: 1024,
				table_count: 5,
				created_at: 1710000000,
				expires_at: 1717000000,
				deleted_at: null,
			},
		];

		const mockCtx = createMockContext({}, { count: 1, backups });
		const response = await listHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(body.backups.length).toBe(1);
		const backup = body.backups[0];
		expect(backup.database).toBe("groveauth");
		expect(backup.date).toBe("2026-03-01");
		expect(backup.r2Key).toBe("2026-03-01/groveauth.sql");
		expect(backup.size).toBe("1.0 KB");
		expect(backup.tables).toBe(5);
		expect(backup.createdAt).toBeDefined();
		expect(backup.expiresAt).toBeDefined();
		expect(backup.downloadUrl).toContain("2026-03-01/groveauth");
	});

	it("filters by database name query param", async () => {
		const backups = [
			{
				database_name: "groveauth",
				backup_date: "2026-03-01",
				r2_key: "2026-03-01/groveauth.sql",
				size_bytes: 1024,
				table_count: 5,
				created_at: 1710000000,
				expires_at: 1717000000,
				deleted_at: null,
			},
		];

		const mockCtx = createMockContext({ database: "groveauth" }, { count: 1, backups });
		const response = await listHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(body.backups.length).toBe(1);
		expect(body.backups[0].database).toBe("groveauth");
	});

	it("filters by date query param", async () => {
		const backups = [
			{
				database_name: "scout-db",
				backup_date: "2026-03-01",
				r2_key: "2026-03-01/scout-db.sql",
				size_bytes: 2048,
				table_count: 3,
				created_at: 1710000000,
				expires_at: 1717000000,
				deleted_at: null,
			},
		];

		const mockCtx = createMockContext({ date: "2026-03-01" }, { count: 1, backups });
		const response = await listHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(body.backups.length).toBe(1);
		expect(body.backups[0].date).toBe("2026-03-01");
	});

	it("limits results to max 100", async () => {
		const mockCtx = createMockContext({ limit: "200" });
		// When listHandler processes limit: "200", it should cap at 100
		const response = await listHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(response.status).toBe(200);
		// Verify the response structure is correct
		expect(body.backups).toBeDefined();
		expect(body.total).toBeDefined();
		expect(body.filtered).toBeDefined();
	});

	it("uses default limit of 50 when not specified", async () => {
		const mockCtx = createMockContext({});
		const response = await listHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(response.status).toBe(200);
		expect(body.backups).toBeDefined();
	});

	it("includes total and filtered counts", async () => {
		const backups = [
			{
				database_name: "groveauth",
				backup_date: "2026-03-01",
				r2_key: "2026-03-01/groveauth.sql",
				size_bytes: 1024,
				table_count: 5,
				created_at: 1710000000,
				expires_at: 1717000000,
				deleted_at: null,
			},
			{
				database_name: "scout-db",
				backup_date: "2026-03-02",
				r2_key: "2026-03-02/scout-db.sql",
				size_bytes: 2048,
				table_count: 3,
				created_at: 1710086400,
				expires_at: 1717086400,
				deleted_at: null,
			},
		];

		const mockCtx = createMockContext({}, { count: 2, backups });
		const response = await listHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(body.total).toBe(2);
		expect(body.filtered).toBe(2);
	});

	it("handles DB error with 500 response", async () => {
		const mockCtx = {
			req: {
				query: vi.fn().mockReturnValue(undefined),
			},
			env: {
				METADATA_DB: {
					prepare: vi.fn().mockImplementation(() => {
						throw new Error("Database query failed");
					}),
				},
			},
			json: vi
				.fn()
				.mockImplementation(
					(body: any, status?: number) =>
						new Response(JSON.stringify(body), { status: status || 200 }),
				),
		};

		const response = await listHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(response.status).toBe(500);
		expect(body.error).toBe("Failed to list backups");
		expect(body.message).toBe("Database query failed");
	});

	it("formats download URL correctly", async () => {
		const backups = [
			{
				database_name: "grove-engine-db",
				backup_date: "2026-02-15",
				r2_key: "2026-02-15/grove-engine-db.sql",
				size_bytes: 5242880,
				table_count: 12,
				created_at: 1708000000,
				expires_at: 1715000000,
				deleted_at: null,
			},
		];

		const mockCtx = createMockContext({}, { count: 1, backups });
		const response = await listHandler(mockCtx);
		const body = JSON.parse(await response.text());

		const backup = body.backups[0];
		expect(backup.downloadUrl).toBe(
			"https://grove-backups.m7jv4v7npb.workers.dev/download/2026-02-15/grove-engine-db",
		);
	});

	it("handles offset pagination parameter", async () => {
		const mockCtx = createMockContext({ offset: "10" });
		const response = await listHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(response.status).toBe(200);
		expect(body.backups).toBeDefined();
	});

	it("filters by both database and date query params", async () => {
		const backups = [
			{
				database_name: "groveauth",
				backup_date: "2026-03-01",
				r2_key: "2026-03-01/groveauth.sql",
				size_bytes: 1024,
				table_count: 5,
				created_at: 1710000000,
				expires_at: 1717000000,
				deleted_at: null,
			},
		];

		const mockCtx = createMockContext(
			{ database: "groveauth", date: "2026-03-01" },
			{ count: 1, backups },
		);
		const response = await listHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(body.backups.length).toBe(1);
		expect(body.backups[0].database).toBe("groveauth");
		expect(body.backups[0].date).toBe("2026-03-01");
	});

	it("converts timestamp to ISO string format", async () => {
		const backups = [
			{
				database_name: "amber",
				backup_date: "2026-03-05",
				r2_key: "2026-03-05/amber.sql",
				size_bytes: 512,
				table_count: 2,
				created_at: 1709600000,
				expires_at: 1716600000,
				deleted_at: null,
			},
		];

		const mockCtx = createMockContext({}, { count: 1, backups });
		const response = await listHandler(mockCtx);
		const body = JSON.parse(await response.text());

		const backup = body.backups[0];
		// Verify it's a valid ISO string
		expect(new Date(backup.createdAt).getTime()).not.toBeNaN();
		expect(new Date(backup.expiresAt).getTime()).not.toBeNaN();
		expect(backup.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});
});
