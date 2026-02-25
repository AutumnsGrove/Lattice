/**
 * Email Catch-up Worker — Tests
 *
 * Tests the core D1 operations: overdue user discovery, stage updates,
 * sequence completion marking, and error handling.
 *
 * Uses the Infra SDK mock context for D1 access. Resend and email-render
 * are mocked at the module boundary since they stay as raw access.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockContext, type MockDatabase } from "@autumnsgrove/infra/testing";

// ---------------------------------------------------------------------------
// Mock Resend — prevent real API calls
// ---------------------------------------------------------------------------

vi.mock("resend", () => ({
	Resend: vi.fn().mockImplementation(function (this: any) {
		this.emails = {
			send: vi.fn().mockResolvedValue({ data: { id: "mock-email-id" }, error: null }),
		};
	}),
}));

// Mock fetch for email-render worker calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ---------------------------------------------------------------------------
// Helper: build test env with mock D1 via Infra SDK
// ---------------------------------------------------------------------------

function createTestEnv() {
	const ctx = createMockContext();

	// Build raw D1 mock that createContext() will wrap
	const mockD1 = buildMockD1(ctx.db);

	const env = {
		DB: mockD1,
		RESEND_API_KEY: "re_test_key",
		EMAIL_RENDER_URL: "https://email-render.test",
		EMAIL_RENDER: undefined as Fetcher | undefined,
	};

	return { env, ctx, mockD1 };
}

/**
 * Build a raw D1-shaped mock that delegates to the SDK's MockDatabase.
 * This lets us use `ctx.db.whenQuery()` to pre-configure responses while
 * the worker's `createContext()` wraps the raw D1 binding.
 */
function buildMockD1(db: MockDatabase) {
	return {
		prepare: vi.fn((sql: string) => ({
			all: vi.fn(async () => {
				const result = await db.execute(sql);
				return { results: result.results, meta: result.meta };
			}),
			bind: vi.fn((...params: unknown[]) => ({
				all: vi.fn(async () => {
					const result = await db.execute(sql, params);
					return { results: result.results, meta: result.meta };
				}),
				first: vi.fn(async () => {
					const result = await db.execute(sql, params);
					return result.results[0] ?? null;
				}),
				run: vi.fn(async () => {
					const result = await db.execute(sql, params);
					return result.meta;
				}),
			})),
			run: vi.fn(async () => {
				const result = await db.execute(sql);
				return result.meta;
			}),
		})),
		batch: vi.fn(async () => []),
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let worker: any;

describe("email-catchup", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		mockFetch.mockReset();
		worker = await import("../worker.js");
	});

	describe("overdue user discovery", () => {
		it("returns empty result when no overdue users exist", async () => {
			const { env, ctx } = createTestEnv();
			// No whenQuery → execute returns empty results by default

			const result = await worker.default.scheduled({} as ScheduledEvent, env, {
				waitUntil: vi.fn(),
			} as unknown as ExecutionContext);

			expect(result.overdueFound).toBe(0);
			expect(result.emailsSent).toBe(0);
			expect(result.errors).toHaveLength(0);
		});

		it("discovers overdue users and attempts email send", async () => {
			const { env, ctx } = createTestEnv();

			// Pre-seed overdue user
			ctx.db.whenQuery("SELECT * FROM email_signups", [
				{
					id: 1,
					email: "test@example.com",
					name: "Test User",
					created_at: "2026-01-01T00:00:00Z",
					audience_type: "wanderer",
					sequence_stage: 0,
					last_email_at: "2026-01-01T00:00:00Z",
				},
			]);

			// Mock email-render response
			mockFetch.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						html: "<p>Welcome!</p>",
						text: "Welcome!",
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			);

			const result = await worker.default.scheduled({} as ScheduledEvent, env, {
				waitUntil: vi.fn(),
			} as unknown as ExecutionContext);

			expect(result.overdueFound).toBe(1);
			// DB was queried for overdue users
			expect(ctx.db.calls.length).toBeGreaterThanOrEqual(1);
			expect(ctx.db.calls[0].sql).toContain("email_signups");
		});
	});

	describe("sequence completion", () => {
		it("marks completed sequences via UPDATE queries", async () => {
			const { env, ctx } = createTestEnv();
			// No overdue users (empty default), but markCompletedSequences still runs

			const result = await worker.default.scheduled({} as ScheduledEvent, env, {
				waitUntil: vi.fn(),
			} as unknown as ExecutionContext);

			// Should have executed the 3 completion UPDATE queries
			const updateCalls = ctx.db.calls.filter((c) => c.sql.includes("UPDATE email_signups"));
			expect(updateCalls.length).toBe(3);

			// Each targets a different audience_type
			expect(updateCalls[0].sql).toContain("wanderer");
			expect(updateCalls[1].sql).toContain("promo");
			expect(updateCalls[2].sql).toContain("rooted");

			// Changes default to 0, so completed = 0
			expect(result.sequencesCompleted).toBe(0);
		});
	});

	describe("error handling", () => {
		it("continues processing when email send fails for one user", async () => {
			const { env, ctx } = createTestEnv();

			// Pre-seed two overdue users
			ctx.db.whenQuery("SELECT * FROM email_signups", [
				{
					id: 1,
					email: "fail@example.com",
					name: "Failing User",
					created_at: "2026-01-01T00:00:00Z",
					audience_type: "wanderer",
					sequence_stage: 0,
					last_email_at: "2026-01-01T00:00:00Z",
				},
				{
					id: 2,
					email: "ok@example.com",
					name: "OK User",
					created_at: "2026-01-01T00:00:00Z",
					audience_type: "wanderer",
					sequence_stage: 0,
					last_email_at: "2026-01-01T00:00:00Z",
				},
			]);

			// First render call fails, second succeeds
			mockFetch
				.mockResolvedValueOnce(new Response("Internal Server Error", { status: 500 }))
				.mockResolvedValueOnce(
					new Response(JSON.stringify({ html: "<p>Hi</p>", text: "Hi" }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					}),
				);

			const result = await worker.default.scheduled({} as ScheduledEvent, env, {
				waitUntil: vi.fn(),
			} as unknown as ExecutionContext);

			expect(result.overdueFound).toBe(2);
			// First user's email render failed (returned null), so it was skipped — not an error
			// Second user should have succeeded
			expect(result.errors).toHaveLength(0);
		});
	});

	describe("config validation", () => {
		it("returns error when RESEND_API_KEY is missing", async () => {
			const { env } = createTestEnv();
			env.RESEND_API_KEY = "";

			const result = await worker.default.scheduled({} as ScheduledEvent, env, {
				waitUntil: vi.fn(),
			} as unknown as ExecutionContext);

			expect(result).toEqual({ error: "RESEND_API_KEY not configured" });
		});

		it("returns error when EMAIL_RENDER_URL is missing", async () => {
			const { env } = createTestEnv();
			env.EMAIL_RENDER_URL = "";

			const result = await worker.default.scheduled({} as ScheduledEvent, env, {
				waitUntil: vi.fn(),
			} as unknown as ExecutionContext);

			expect(result).toEqual({ error: "EMAIL_RENDER_URL not configured" });
		});
	});
});
