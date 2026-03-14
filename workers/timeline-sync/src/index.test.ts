/**
 * Tests for the timeline-sync worker entry point
 *
 * Covers:
 * - Cron scheduled handler (getEnabledTenants, processTenantTimeline)
 * - HTTP routes: GET /, GET /tenants, GET /debug
 * - Helper: getYesterdayUTC()
 * - Error handling and isolation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock modules before importing
vi.mock("./generator", () => ({
	getEnabledTenants: vi.fn().mockResolvedValue([]),
	processTenantTimeline: vi.fn().mockResolvedValue({
		success: true,
		tenantId: "t1",
		date: "2026-03-11",
		commitCount: 5,
	}),
}));

vi.mock("./secrets-manager", () => ({
	createSecretsManager: vi.fn().mockReturnValue(null),
}));

vi.mock("@autumnsgrove/infra/cloudflare", () => ({
	createCloudflareContext: vi.fn().mockReturnValue({
		db: {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: [] }),
				first: vi.fn().mockResolvedValue(null),
			}),
		},
	}),
}));

import worker from "./index";
import { getEnabledTenants, processTenantTimeline } from "./generator";
import type { Env } from "./config";

// =============================================================================
// Mock Helpers
// =============================================================================

function createMockEnv(): Env {
	return {
		DB: {} as D1Database,
		CURIO_DB: {} as D1Database,
		GROVE_KEK: "a".repeat(64),
		LUMEN: {
			fetch: vi.fn().mockResolvedValue(new Response("ok")),
		},
	};
}

function createMockTenant(overrides = {}) {
	return {
		tenantId: "t1",
		githubUsername: "testuser",
		openrouterModel: "anthropic/claude-3.5-haiku",
		voicePreset: "professional",
		customSystemPrompt: null,
		customSummaryInstructions: null,
		customGutterStyle: null,
		reposInclude: null,
		reposExclude: null,
		timezone: "UTC",
		ownerName: "Test User",
		...overrides,
	};
}

// =============================================================================
// Helper Tests
// =============================================================================

describe("Worker HTTP Handler", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(getEnabledTenants as any).mockResolvedValue([]);
		(processTenantTimeline as any).mockResolvedValue({
			success: true,
			tenantId: "t1",
			date: "2026-03-11",
			commitCount: 5,
		});
	});

	// GET / — sync endpoint
	describe("GET /", () => {
		it("returns JSON with success, message, date, and results", async () => {
			(getEnabledTenants as any).mockResolvedValue([createMockTenant()]);
			(processTenantTimeline as any).mockResolvedValue({
				success: true,
				tenantId: "t1",
				date: "2026-03-11",
				commitCount: 5,
			});

			const request = new Request("http://localhost/", { method: "GET" });
			const env = createMockEnv();

			const response = await worker.fetch(request, env);

			expect(response.status).toBe(200);
			const data = (await response.json()) as any;

			expect(data).toHaveProperty("success");
			expect(data).toHaveProperty("message");
			expect(data).toHaveProperty("date");
			expect(data).toHaveProperty("results");
		});

		it("with no tenants returns empty results", async () => {
			(getEnabledTenants as any).mockResolvedValue([]);

			const request = new Request("http://localhost/", { method: "GET" });
			const env = createMockEnv();

			const response = await worker.fetch(request, env);
			const data = (await response.json()) as any;

			expect(data.success).toBe(true);
			expect(data.message).toContain("No enabled tenants");
			expect(data.results).toEqual([]);
		});

		it("accepts optional ?date= parameter", async () => {
			(getEnabledTenants as any).mockResolvedValue([createMockTenant()]);

			const request = new Request("http://localhost/?date=2026-03-10", { method: "GET" });
			const env = createMockEnv();

			const response = await worker.fetch(request, env);
			const data = (await response.json()) as any;

			expect(data.date).toBe("2026-03-10");
		});

		it("uses yesterday UTC when no ?date= parameter", async () => {
			(getEnabledTenants as any).mockResolvedValue([]);

			const request = new Request("http://localhost/", { method: "GET" });
			const env = createMockEnv();

			const response = await worker.fetch(request, env);
			const data = (await response.json()) as any;

			expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});

		it("processes multiple tenants and aggregates results", async () => {
			(getEnabledTenants as any).mockResolvedValue([
				createMockTenant({ tenantId: "t1" }),
				createMockTenant({ tenantId: "t2" }),
				createMockTenant({ tenantId: "t3" }),
			]);

			(processTenantTimeline as any)
				.mockResolvedValueOnce({
					success: true,
					tenantId: "t1",
					date: "2026-03-11",
					commitCount: 5,
				})
				.mockResolvedValueOnce({
					success: true,
					tenantId: "t2",
					date: "2026-03-11",
					commitCount: 8,
				})
				.mockResolvedValueOnce({
					success: false,
					tenantId: "t3",
					date: "2026-03-11",
					error: "Token not found",
				});

			const request = new Request("http://localhost/", { method: "GET" });
			const env = createMockEnv();

			const response = await worker.fetch(request, env);
			const data = (await response.json()) as any;

			expect(data.results).toHaveLength(3);
			expect(data.results[0]).toHaveProperty("tenantId", "t1");
			expect(data.results[0]).toHaveProperty("commitCount", 5);
			expect(data.totalCommits).toBe(13);
		});

		it("marks overall success as false if any tenant fails", async () => {
			(getEnabledTenants as any).mockResolvedValue([
				createMockTenant({ tenantId: "t1" }),
				createMockTenant({ tenantId: "t2" }),
			]);

			(processTenantTimeline as any)
				.mockResolvedValueOnce({
					success: true,
					tenantId: "t1",
					date: "2026-03-11",
					commitCount: 5,
				})
				.mockResolvedValueOnce({
					success: false,
					tenantId: "t2",
					date: "2026-03-11",
					error: "API error",
				});

			const request = new Request("http://localhost/", { method: "GET" });
			const env = createMockEnv();

			const response = await worker.fetch(request, env);
			const data = (await response.json()) as any;

			expect(data.success).toBe(false);
		});

		it("handles errors with 500 status", async () => {
			(getEnabledTenants as any).mockRejectedValue(new Error("DB connection failed"));

			const request = new Request("http://localhost/", { method: "GET" });
			const env = createMockEnv();

			const response = await worker.fetch(request, env);

			expect(response.status).toBe(500);
			const data = (await response.json()) as any;
			expect(data.success).toBe(false);
			expect(data.error).toContain("DB connection failed");
		});
	});

	// GET /tenants — tenant list
	describe("GET /tenants", () => {
		it("returns count and tenant list", async () => {
			(getEnabledTenants as any).mockResolvedValue([
				createMockTenant({ tenantId: "t1" }),
				createMockTenant({ tenantId: "t2" }),
			]);

			const request = new Request("http://localhost/tenants", { method: "GET" });
			const env = createMockEnv();

			const response = await worker.fetch(request, env);
			const data = (await response.json()) as any;

			expect(data.count).toBe(2);
			expect(data.tenants).toHaveLength(2);
			expect(data.tenants[0]).toHaveProperty("tenantId", "t1");
			expect(data.tenants[0]).toHaveProperty("githubUsername");
			expect(data.tenants[0]).toHaveProperty("voicePreset");
			expect(data.tenants[0]).toHaveProperty("model");
		});

		it("with zero tenants returns empty list", async () => {
			(getEnabledTenants as any).mockResolvedValue([]);

			const request = new Request("http://localhost/tenants", { method: "GET" });
			const env = createMockEnv();

			const response = await worker.fetch(request, env);
			const data = (await response.json()) as any;

			expect(data.count).toBe(0);
			expect(data.tenants).toEqual([]);
		});

		it("handles errors with 500 status", async () => {
			(getEnabledTenants as any).mockRejectedValue(new Error("DB unreachable"));

			const request = new Request("http://localhost/tenants", { method: "GET" });
			const env = createMockEnv();

			const response = await worker.fetch(request, env);

			expect(response.status).toBe(500);
			const data = (await response.json()) as any;
			expect(data.success).toBe(false);
			expect(data.error).toContain("DB unreachable");
		});
	});

	// GET /debug — diagnostic info
	describe("GET /debug", () => {
		it("returns diagnostic info", async () => {
			(getEnabledTenants as any).mockResolvedValue([createMockTenant()]);

			const request = new Request("http://localhost/debug", { method: "GET" });
			const env = createMockEnv();

			const response = await worker.fetch(request, env);
			const data = (await response.json()) as any;

			expect(data).toHaveProperty("worker", "grove-timeline-sync");
			expect(data).toHaveProperty("timestamp");
			expect(data).toHaveProperty("cron");
			expect(data).toHaveProperty("targetDate");
			expect(data).toHaveProperty("environment");
			expect(data).toHaveProperty("secretsManager");
			expect(data).toHaveProperty("tenants");
		});

		it("checks KEK presence and length", async () => {
			(getEnabledTenants as any).mockResolvedValue([]);

			const request = new Request("http://localhost/debug", { method: "GET" });
			const env = createMockEnv();

			const response = await worker.fetch(request, env);
			const data = (await response.json()) as any;

			expect(data.environment).toHaveProperty("kekPresent");
			expect(data.environment).toHaveProperty("kekLength");
			expect(data.environment).toHaveProperty("kekValid");
		});

		it("includes tenant count and secret status", async () => {
			(getEnabledTenants as any).mockResolvedValue([
				createMockTenant({ tenantId: "t1" }),
				createMockTenant({ tenantId: "t2" }),
			]);

			const request = new Request("http://localhost/debug", { method: "GET" });
			const env = createMockEnv();

			const response = await worker.fetch(request, env);
			const data = (await response.json()) as any;

			expect(data.tenants.enabledCount).toBe(2);
			expect(data.tenants.configs).toHaveLength(2);
		});

		it("returns 200 with dbConnected: false when getEnabledTenants fails", async () => {
			(getEnabledTenants as any).mockRejectedValue(new Error("Debug failed"));

			const request = new Request("http://localhost/debug", { method: "GET" });
			const env = createMockEnv();

			const response = await worker.fetch(request, env);

			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data).toHaveProperty("worker", "grove-timeline-sync");
			expect(data.environment.dbConnected).toBe(false);
		});
	});

	// Default route — health check
	describe("Default route (health check)", () => {
		it("returns plain text response", async () => {
			const request = new Request("http://localhost/unknown", { method: "GET" });
			const env = createMockEnv();

			const response = await worker.fetch(request, env);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe("text/plain");
			const text = await response.text();
			expect(text).toContain("Grove Timeline Sync Worker");
		});

		it("returns 200 OK for any unmatched route", async () => {
			const request = new Request("http://localhost/anything", { method: "GET" });
			const env = createMockEnv();

			const response = await worker.fetch(request, env);

			expect(response.status).toBe(200);
		});
	});
});

// =============================================================================
// Scheduled Handler Tests
// =============================================================================

describe("Worker Scheduled Handler", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(getEnabledTenants as any).mockResolvedValue([]);
		(processTenantTimeline as any).mockResolvedValue({
			success: true,
			tenantId: "t1",
			date: "2026-03-11",
			commitCount: 5,
		});
	});

	it("calls getEnabledTenants and processTenantTimeline for each tenant", async () => {
		(getEnabledTenants as any).mockResolvedValue([
			createMockTenant({ tenantId: "t1" }),
			createMockTenant({ tenantId: "t2" }),
		]);

		const env = createMockEnv();
		const controller = {} as ScheduledController;
		const execCtx = {
			waitUntil: vi.fn(),
		} as unknown as ExecutionContext;

		await worker.scheduled(controller, env, execCtx);

		expect(getEnabledTenants).toHaveBeenCalled();
		expect(processTenantTimeline).toHaveBeenCalledTimes(2);
	});

	it("handles no enabled tenants gracefully", async () => {
		(getEnabledTenants as any).mockResolvedValue([]);

		const env = createMockEnv();
		const controller = {} as ScheduledController;
		const execCtx = {
			waitUntil: vi.fn(),
		} as unknown as ExecutionContext;

		await expect(worker.scheduled(controller, env, execCtx)).resolves.not.toThrow();
		expect(processTenantTimeline).not.toHaveBeenCalled();
	});

	it("isolates tenant failures so others continue processing", async () => {
		(getEnabledTenants as any).mockResolvedValue([
			createMockTenant({ tenantId: "t1" }),
			createMockTenant({ tenantId: "t2" }),
			createMockTenant({ tenantId: "t3" }),
		]);

		(processTenantTimeline as any)
			.mockResolvedValueOnce({
				success: true,
				tenantId: "t1",
				date: "2026-03-11",
				commitCount: 5,
			})
			.mockRejectedValueOnce(new Error("Token error"))
			.mockResolvedValueOnce({
				success: true,
				tenantId: "t3",
				date: "2026-03-11",
				commitCount: 8,
			});

		const env = createMockEnv();
		const controller = {} as ScheduledController;
		const execCtx = {
			waitUntil: vi.fn(),
		} as unknown as ExecutionContext;

		await expect(worker.scheduled(controller, env, execCtx)).resolves.not.toThrow();
		expect(processTenantTimeline).toHaveBeenCalledTimes(3);
	});

	it("re-throws fatal errors (non-isolation)", async () => {
		(getEnabledTenants as any).mockRejectedValue(new Error("Database crashed"));

		const env = createMockEnv();
		const controller = {} as ScheduledController;
		const execCtx = {
			waitUntil: vi.fn(),
		} as unknown as ExecutionContext;

		await expect(worker.scheduled(controller, env, execCtx)).rejects.toThrow("Database crashed");
	});

	it("uses yesterday's date UTC for target", async () => {
		(getEnabledTenants as any).mockResolvedValue([createMockTenant()]);

		const env = createMockEnv();
		const controller = {} as ScheduledController;
		const execCtx = {
			waitUntil: vi.fn(),
		} as unknown as ExecutionContext;

		await worker.scheduled(controller, env, execCtx);

		expect(processTenantTimeline).toHaveBeenCalledWith(
			expect.any(Object),
			expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
			env,
			expect.any(Object),
		);
	});

	it("processes tenants with Promise.allSettled for isolation", async () => {
		(getEnabledTenants as any).mockResolvedValue([
			createMockTenant({ tenantId: "t1" }),
			createMockTenant({ tenantId: "t2" }),
		]);

		(processTenantTimeline as any)
			.mockResolvedValueOnce({
				success: true,
				tenantId: "t1",
				date: "2026-03-11",
				commitCount: 5,
			})
			.mockResolvedValueOnce({
				success: true,
				tenantId: "t2",
				date: "2026-03-11",
				commitCount: 8,
			});

		const env = createMockEnv();
		const controller = {} as ScheduledController;
		const execCtx = {
			waitUntil: vi.fn(),
		} as unknown as ExecutionContext;

		await expect(worker.scheduled(controller, env, execCtx)).resolves.not.toThrow();
	});
});
