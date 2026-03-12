import { describe, it, expect, vi, beforeEach } from "vitest";
import { statusHandler } from "./status";
import type { BackupJob } from "../types";

function createMockContext(options?: {
	runningJob?: any;
	lastJob?: any;
	recentJobs?: any[];
	storageStats?: any;
}): any {
	let callCount = 0;
	const boundStatement = {
		first: vi.fn().mockImplementation(() => {
			callCount++;
			if (callCount === 1) return Promise.resolve(options?.runningJob || null);
			if (callCount === 2) return Promise.resolve(options?.lastJob || null);
			// storageStats (4th call, but 3rd is .all)
			return Promise.resolve(
				options?.storageStats || {
					total_backups: 0,
					total_size: 0,
					oldest_backup: null,
					newest_backup: null,
				},
			);
		}),
		all: vi.fn().mockResolvedValue({ results: options?.recentJobs || [] }),
		run: vi.fn(),
		bind: vi.fn().mockReturnThis(),
	};
	return {
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

describe("statusHandler", () => {
	it("returns idle when no running job", async () => {
		const mockCtx = createMockContext();
		const response = await statusHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(body.currentStatus).toBe("idle");
	});

	it("returns running when there's a running job", async () => {
		const runningJob: BackupJob = {
			id: 1,
			job_id: "job-123",
			started_at: Math.floor(Date.now() / 1000),
			completed_at: null,
			status: "running",
			trigger_type: "manual",
			total_databases: 14,
			successful_count: 5,
			failed_count: 0,
			total_size_bytes: 0,
			duration_ms: null,
			error_message: null,
		};

		const mockCtx = createMockContext({ runningJob });
		const response = await statusHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(body.currentStatus).toBe("running");
	});

	it("includes lastBackup details when a completed job exists", async () => {
		const lastJob: BackupJob = {
			id: 2,
			job_id: "job-456",
			started_at: 1710000000,
			completed_at: 1710003600,
			status: "completed",
			trigger_type: "scheduled",
			total_databases: 14,
			successful_count: 14,
			failed_count: 0,
			total_size_bytes: 52428800,
			duration_ms: 3600000,
			error_message: null,
		};

		const mockCtx = createMockContext({ lastJob });
		const response = await statusHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(body.lastBackup).not.toBeNull();
		expect(body.lastBackup.jobId).toBe("job-456");
		expect(body.lastBackup.status).toBe("completed");
		expect(body.lastBackup.successful).toBe(14);
		expect(body.lastBackup.failed).toBe(0);
		expect(body.lastBackup.totalSize).toBe("50.0 MB");
		expect(body.lastBackup.duration).toBe("3600.0s");
		expect(body.lastBackup.date).toBeDefined();
	});

	it("returns null lastBackup when no completed jobs", async () => {
		const mockCtx = createMockContext();
		const response = await statusHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(body.lastBackup).toBeNull();
	});

	it("includes nextScheduled as ISO string", async () => {
		const mockCtx = createMockContext();
		const response = await statusHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(body.nextScheduled).toBeDefined();
		expect(typeof body.nextScheduled).toBe("string");
		// Should be a valid ISO string
		expect(new Date(body.nextScheduled).getTime()).not.toBeNaN();
	});

	it("includes recentJobs array", async () => {
		const recentJobs: BackupJob[] = [
			{
				id: 1,
				job_id: "job-1",
				started_at: 1710000000,
				completed_at: 1710003600,
				status: "completed",
				trigger_type: "scheduled",
				total_databases: 14,
				successful_count: 14,
				failed_count: 0,
				total_size_bytes: 52428800,
				duration_ms: 3600000,
				error_message: null,
			},
			{
				id: 2,
				job_id: "job-2",
				started_at: 1709913600,
				completed_at: 1709917200,
				status: "completed",
				trigger_type: "scheduled",
				total_databases: 14,
				successful_count: 13,
				failed_count: 1,
				total_size_bytes: 51380224,
				duration_ms: 3600000,
				error_message: null,
			},
		];

		const mockCtx = createMockContext({ recentJobs });
		const response = await statusHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(Array.isArray(body.recentJobs)).toBe(true);
		expect(body.recentJobs.length).toBe(2);
		expect(body.recentJobs[0].jobId).toBe("job-1");
		expect(body.recentJobs[0].databases.successful).toBe(14);
		expect(body.recentJobs[0].databases.failed).toBe(0);
	});

	it("includes storage statistics", async () => {
		const storageStats = {
			total_backups: 12,
			total_size: 629145600,
			oldest_backup: "2026-02-10",
			newest_backup: "2026-03-12",
		};

		const mockCtx = createMockContext({ storageStats });
		const response = await statusHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(body.storage).toBeDefined();
		expect(body.storage.totalBackups).toBe(12);
		expect(body.storage.totalSize).toBe("600.0 MB");
		expect(body.storage.oldestBackup).toBe("2026-02-10");
		expect(body.storage.newestBackup).toBe("2026-03-12");
	});

	it("handles DB error with 500 response", async () => {
		const mockCtx = {
			env: {
				METADATA_DB: {
					prepare: vi.fn().mockImplementation(() => {
						throw new Error("Database connection failed");
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

		const response = await statusHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(response.status).toBe(500);
		expect(body.error).toBe("Failed to fetch status");
		expect(body.message).toBe("Database connection failed");
	});
});
