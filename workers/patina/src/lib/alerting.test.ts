import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendAlert } from "./alerting";
import type { Env, BackupResult } from "../types";

function createMockEnv(overrides?: Partial<Env>): any {
	return {
		ZEPHYR_API_KEY: "test-zephyr-key",
		ZEPHYR_URL: "https://zephyr.test",
		ALERT_EMAIL: "admin@test.com",
		...overrides,
	};
}

function createMockResult(overrides?: any): any {
	return {
		jobId: "test-job-123",
		triggerType: "scheduled" as const,
		startedAt: 1710000000,
		completedAt: 1710000060,
		successfulCount: 14,
		failedCount: 0,
		totalSizeBytes: 2048,
		durationMs: 60000,
		results: [],
		...overrides,
	};
}

describe("sendAlert", () => {
	let fetchMock: any;

	beforeEach(() => {
		fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("skips alert when ZEPHYR_API_KEY is not set", async () => {
		const env = createMockEnv({ ZEPHYR_API_KEY: undefined });
		const result = createMockResult();

		await sendAlert(env, result, "success");

		expect(fetchMock).not.toHaveBeenCalled();
		expect(console.log).toHaveBeenCalledWith("Zephyr not configured, skipping alert");
	});

	it("skips alert when ZEPHYR_URL is not set", async () => {
		const env = createMockEnv({ ZEPHYR_URL: undefined });
		const result = createMockResult();

		await sendAlert(env, result, "success");

		expect(fetchMock).not.toHaveBeenCalled();
		expect(console.log).toHaveBeenCalledWith("Zephyr not configured, skipping alert");
	});

	it("sends POST to Zephyr URL with correct headers and body", async () => {
		const env = createMockEnv();
		const result = createMockResult();

		await sendAlert(env, result, "success");

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe("https://zephyr.test/send");
		expect(options.method).toBe("POST");
		expect(options.headers["Content-Type"]).toBe("application/json");
		expect(options.headers["X-API-Key"]).toBe("test-zephyr-key");

		const body = JSON.parse(options.body);
		expect(body.type).toBe("notification");
		expect(body.template).toBe("raw");
		expect(body.to).toBe("admin@test.com");
		expect(body.subject).toBeDefined();
		expect(body.html).toBeDefined();
	});

	it("success alert has correct subject format", async () => {
		const env = createMockEnv();
		const result = createMockResult({ successfulCount: 14, failedCount: 0 });

		await sendAlert(env, result, "success");

		const [, options] = fetchMock.mock.calls[0] as any[];
		const body = JSON.parse(options.body);
		expect(body.subject).toBe("Patina Backup Completed — 14/14 databases");
	});

	it("failure alert has correct subject format", async () => {
		const env = createMockEnv();
		const failedResult: BackupResult = {
			id: 1,
			job_id: "test-job-123",
			database_name: "failing-db",
			database_id: "db-123",
			status: "failed",
			r2_key: null,
			size_bytes: 0,
			table_count: 0,
			row_count: 0,
			started_at: 1710000000,
			completed_at: 1710000060,
			duration_ms: 60000,
			error_message: "Export failed",
		};

		const result = createMockResult({
			successfulCount: 13,
			failedCount: 1,
			results: [failedResult],
		});

		await sendAlert(env, result, "failure");

		const [, options] = fetchMock.mock.calls[0] as any[];
		const body = JSON.parse(options.body);
		expect(body.subject).toBe("Patina Backup Failed — 1 database(s) failed");
	});

	it("request body includes correct to email address", async () => {
		const env = createMockEnv({ ALERT_EMAIL: "backup-admin@example.com" });
		const result = createMockResult();

		await sendAlert(env, result, "success");

		const [, options] = fetchMock.mock.calls[0] as any[];
		const body = JSON.parse(options.body);
		expect(body.to).toBe("backup-admin@example.com");
	});

	it("handles fetch error gracefully (doesn't throw)", async () => {
		fetchMock.mockRejectedValueOnce(new Error("Network error"));
		const env = createMockEnv();
		const result = createMockResult();

		// Should not throw
		await expect(sendAlert(env, result, "success")).resolves.toBeUndefined();
		expect(console.error).toHaveBeenCalledWith("Failed to send Zephyr alert:", expect.any(Error));
	});

	it("handles non-ok response gracefully", async () => {
		fetchMock.mockResolvedValueOnce(new Response("error", { status: 500 }));
		const env = createMockEnv();
		const result = createMockResult();

		await sendAlert(env, result, "success");

		expect(console.error).toHaveBeenCalledWith("Zephyr alert failed: 500");
	});

	it("logs success when alert is sent successfully", async () => {
		const env = createMockEnv();
		const result = createMockResult();

		await sendAlert(env, result, "success");

		expect(console.log).toHaveBeenCalledWith("Zephyr alert sent: success");
	});

	it("includes failed database rows in HTML for failure alerts", async () => {
		const env = createMockEnv();
		const failedResult: BackupResult = {
			id: 1,
			job_id: "test-job-123",
			database_name: "failing-db",
			database_id: "db-123",
			status: "failed",
			r2_key: null,
			size_bytes: 0,
			table_count: 0,
			row_count: 0,
			started_at: 1710000000,
			completed_at: 1710000060,
			duration_ms: 60000,
			error_message: "Connection timeout",
		};

		const result = createMockResult({
			successfulCount: 13,
			failedCount: 1,
			results: [failedResult],
		});

		await sendAlert(env, result, "failure");

		const [, options] = fetchMock.mock.calls[0] as any[];
		const body = JSON.parse(options.body);
		expect(body.html).toContain("failing-db");
		expect(body.html).toContain("Connection timeout");
		expect(body.html).toContain("Failed Databases");
	});

	it("formats HTML with success background color for success alerts", async () => {
		const env = createMockEnv();
		const result = createMockResult();

		await sendAlert(env, result, "success");

		const [, options] = fetchMock.mock.calls[0] as any[];
		const body = JSON.parse(options.body);
		expect(body.html).toContain("#f0fdf4"); // Success green background
		expect(body.html).toContain("Backup Completed");
	});

	it("formats HTML with failure background color for failure alerts", async () => {
		const env = createMockEnv();
		const result = createMockResult({ failedCount: 1 });

		await sendAlert(env, result, "failure");

		const [, options] = fetchMock.mock.calls[0] as any[];
		const body = JSON.parse(options.body);
		expect(body.html).toContain("#fef2f2"); // Failure red background
		expect(body.html).toContain("Backup Failed");
	});

	it("includes job summary stats in HTML", async () => {
		const env = createMockEnv();
		const result = createMockResult({
			successfulCount: 10,
			failedCount: 2,
			totalSizeBytes: 1048576, // 1 MB
			durationMs: 120000, // 2 minutes
		});

		await sendAlert(env, result, "success");

		const [, options] = fetchMock.mock.calls[0] as any[];
		const body = JSON.parse(options.body);
		expect(body.html).toContain("10/12 successful");
		expect(body.html).toContain("120.0s");
		expect(body.html).toContain("scheduled");
		expect(body.html).toContain("test-job-123");
	});

	it("does not include failed databases section for success alerts", async () => {
		const env = createMockEnv();
		const result = createMockResult({ successfulCount: 14, failedCount: 0 });

		await sendAlert(env, result, "success");

		const [, options] = fetchMock.mock.calls[0] as any[];
		const body = JSON.parse(options.body);
		expect(body.html).not.toContain("Failed Databases");
	});
});
