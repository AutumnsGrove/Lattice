/**
 * Job Index Tests
 *
 * Tests D1-based job CRUD operations using a mock D1Database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	createJobIndex,
	updateJobIndex,
	listJobs,
	getRecentJobs,
	getJobFromIndex,
	upsertJobIndex,
} from "./job-index";

// =============================================================================
// Mock D1
// =============================================================================

interface MockStatement {
	bind: ReturnType<typeof vi.fn>;
	run: ReturnType<typeof vi.fn>;
	all: ReturnType<typeof vi.fn>;
	first: ReturnType<typeof vi.fn>;
}

function createMockD1() {
	const statement: MockStatement = {
		bind: vi.fn().mockReturnThis(),
		run: vi.fn(async () => ({ success: true, meta: { changes: 1 } })),
		all: vi.fn(async () => ({ results: [] })),
		first: vi.fn(async () => null),
	};

	const db = {
		prepare: vi.fn(() => statement),
		_statement: statement,
	} as unknown as D1Database & { _statement: MockStatement };

	return db;
}

describe("Job Index", () => {
	let db: ReturnType<typeof createMockD1>;

	beforeEach(() => {
		db = createMockD1();
	});

	describe("createJobIndex", () => {
		it("should insert a new job with pending status", async () => {
			await createJobIndex(db, "job-1", "client-1", "Test Business");

			expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO job_index"));
			expect(db._statement.bind).toHaveBeenCalledWith("job-1", "client-1", "Test Business");
			expect(db._statement.run).toHaveBeenCalled();
		});

		it("should handle missing business name", async () => {
			await createJobIndex(db, "job-1", "client-1");

			expect(db._statement.bind).toHaveBeenCalledWith("job-1", "client-1", null);
		});
	});

	describe("updateJobIndex", () => {
		it("should update status field", async () => {
			await updateJobIndex(db, "job-1", { status: "running" });

			const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sql).toContain("status = ?");
			expect(sql).toContain("updated_at = datetime('now')");
		});

		it("should update multiple fields", async () => {
			await updateJobIndex(db, "job-1", {
				status: "complete",
				batch_num: 3,
				domains_checked: 150,
				good_results: 12,
			});

			const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sql).toContain("status = ?");
			expect(sql).toContain("batch_num = ?");
			expect(sql).toContain("domains_checked = ?");
			expect(sql).toContain("good_results = ?");
		});

		it("should update token counts", async () => {
			await updateJobIndex(db, "job-1", {
				input_tokens: 5000,
				output_tokens: 2000,
			});

			const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sql).toContain("input_tokens = ?");
			expect(sql).toContain("output_tokens = ?");
		});

		it("should always include updated_at", async () => {
			await updateJobIndex(db, "job-1", { status: "running" });

			const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sql).toContain("updated_at = datetime('now')");
		});
	});

	describe("listJobs", () => {
		it("should use default limit and offset", async () => {
			db._statement.all.mockResolvedValue({ results: [] });
			db._statement.first.mockResolvedValue({ count: 0 });

			const result = await listJobs(db);

			expect(result.limit).toBe(20);
			expect(result.offset).toBe(0);
			expect(result.jobs).toEqual([]);
		});

		it("should respect custom limit and offset", async () => {
			db._statement.all.mockResolvedValue({ results: [] });
			db._statement.first.mockResolvedValue({ count: 0 });

			const result = await listJobs(db, { limit: 5, offset: 10 });

			expect(result.limit).toBe(5);
			expect(result.offset).toBe(10);
		});

		it("should cap limit at 100", async () => {
			db._statement.all.mockResolvedValue({ results: [] });
			db._statement.first.mockResolvedValue({ count: 0 });

			const result = await listJobs(db, { limit: 500 });

			expect(result.limit).toBe(100);
		});

		it("should filter by status when provided", async () => {
			db._statement.all.mockResolvedValue({ results: [] });
			db._statement.first.mockResolvedValue({ count: 0 });

			await listJobs(db, { status: "running" });

			const calls = (db.prepare as ReturnType<typeof vi.fn>).mock.calls;
			const selectSql = calls[0][0];
			expect(selectSql).toContain("WHERE status = ?");
		});

		it("should return total count", async () => {
			db._statement.all.mockResolvedValue({
				results: [{ job_id: "j1", status: "complete" }],
			});
			db._statement.first.mockResolvedValue({ count: 42 });

			const result = await listJobs(db);

			expect(result.total).toBe(42);
		});
	});

	describe("getRecentJobs", () => {
		it("should return jobs with default limit of 10", async () => {
			db._statement.all.mockResolvedValue({ results: [] });
			db._statement.first.mockResolvedValue({ count: 0 });

			const jobs = await getRecentJobs(db);
			expect(jobs).toEqual([]);
		});

		it("should use custom limit", async () => {
			db._statement.all.mockResolvedValue({ results: [] });
			db._statement.first.mockResolvedValue({ count: 0 });

			await getRecentJobs(db, 5);
			// listJobs calls prepare() twice (SELECT + COUNT), verify limit
			// flows through by checking bind was called with 5 in some call
			const allBindArgs = db._statement.bind.mock.calls.flat();
			expect(allBindArgs).toContain(5);
		});
	});

	describe("getJobFromIndex", () => {
		it("should return job when found", async () => {
			const mockJob = { job_id: "j1", status: "complete", client_id: "c1" };
			db._statement.first.mockResolvedValue(mockJob);

			const result = await getJobFromIndex(db, "j1");

			expect(result).toEqual(mockJob);
			expect(db._statement.bind).toHaveBeenCalledWith("j1");
		});

		it("should return null when not found", async () => {
			db._statement.first.mockResolvedValue(null);

			const result = await getJobFromIndex(db, "nonexistent");
			expect(result).toBeNull();
		});
	});

	describe("upsertJobIndex", () => {
		it("should use INSERT ... ON CONFLICT pattern", async () => {
			await upsertJobIndex(db, "j1", {
				client_id: "c1",
				status: "running",
				business_name: "Test",
			});

			const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
			expect(sql).toContain("INSERT INTO job_index");
			expect(sql).toContain("ON CONFLICT(job_id) DO UPDATE");
		});

		it("should use default values for optional fields", async () => {
			await upsertJobIndex(db, "j1", {
				client_id: "c1",
				status: "pending",
			});

			expect(db._statement.bind).toHaveBeenCalledWith(
				"j1", // job_id
				"c1", // client_id
				"pending", // status
				null, // business_name
				0, // batch_num
				0, // domains_checked
				0, // good_results
				0, // input_tokens
				0, // output_tokens
			);
		});
	});
});
