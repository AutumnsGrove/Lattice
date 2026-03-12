/**
 * TriageDO Tests
 *
 * Tests the email triage DO — process queue, digest scheduling,
 * status endpoint. Heavy AI deps (classifier, digest) are mocked.
 */

import { describe, it, expect, vi } from "vitest";
import { TriageDO } from "./TriageDO";
import {
	createTestDOState,
	createMockSql,
	createMockD1,
	createMockR2,
	createMockKV,
	doRequest,
	doPost,
	type MockD1,
} from "./test-helpers";

// Mock the heavy dependencies
vi.mock("./triage/filters.js", () => ({
	evaluateFilters: vi.fn(async () => null),
}));

vi.mock("./triage/classifier.js", () => ({
	classifyEmail: vi.fn(async () => ({
		category: "personal",
		confidence: 0.85,
		suggestedAction: "read",
		topics: ["greeting"],
		reason: "Personal message",
	})),
}));

vi.mock("./triage/digest.js", () => ({
	getDigestEmails: vi.fn(async () => []),
	generateDigest: vi.fn(async () => "Digest summary"),
	sendDigest: vi.fn(async () => ({ success: true, messageId: "msg-1" })),
	renderDigestHtml: vi.fn(() => "<p>Digest</p>"),
	calculateNextAlarm: vi.fn(() => Date.now() + 3600000),
	getCategoryCounts: vi.fn(() => ({})),
}));

function createTriageDO(existingState?: Record<string, unknown> | null) {
	const sql = createMockSql();
	const { state, storage } = createTestDOState("triage:owner", sql);
	const ivyDb = createMockD1();
	const ivyR2 = createMockR2();
	const kv = createMockKV();

	if (existingState) {
		storage._kv.set("triageState", existingState);
	}

	const env = {
		IVY_DB: ivyDb as unknown as D1Database,
		IVY_R2: ivyR2 as unknown as R2Bucket,
		KV: kv as unknown as KVNamespace,
		AI: {} as unknown,
		ZEPHYR: {
			fetch: vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 })),
		},
		OPENROUTER_API_KEY: "test-key",
		ZEPHYR_API_KEY: "test-zephyr-key",
	};

	const doInstance = new TriageDO(state, env);
	return { doInstance, sql, ivyDb, storage, env };
}

describe("TriageDO", () => {
	describe("POST /process", () => {
		it("should queue email for processing", async () => {
			const { doInstance } = createTriageDO();

			const res = await doInstance.fetch(doPost("/process", { bufferId: "buffer-1" }));
			const body = await res.json();

			expect(body.success).toBe(true);
			expect(body.queued).toBe(true);
		});

		it("should initialize state if not present", async () => {
			const { doInstance } = createTriageDO();

			const res = await doInstance.fetch(doPost("/process", { bufferId: "buffer-1" }));

			expect((await res.json()).success).toBe(true);

			// Check status to verify state was initialized
			const statusRes = await doInstance.fetch(doRequest("/status"));
			const statusBody = await statusRes.json();
			expect(statusBody.queueLength).toBe(1);
		});
	});

	describe("GET /status", () => {
		it("should return default status when no state", async () => {
			const { doInstance } = createTriageDO();

			const res = await doInstance.fetch(doRequest("/status"));
			const body = await res.json();

			expect(body.queueLength).toBe(0);
			expect(body.digestScheduled).toBe(false);
			expect(body.nextDigestAt).toBeNull();
		});

		it("should return queue length from state", async () => {
			const { doInstance } = createTriageDO({
				processingQueue: [
					{ bufferId: "b1", addedAt: "2024-01-01T00:00:00Z" },
					{ bufferId: "b2", addedAt: "2024-01-01T00:00:01Z" },
				],
				digestScheduled: true,
				nextDigestAt: "2024-01-01T08:00:00Z",
			});

			const res = await doInstance.fetch(doRequest("/status"));
			const body = await res.json();

			expect(body.queueLength).toBe(2);
			expect(body.digestScheduled).toBe(true);
			expect(body.nextDigestAt).toBe("2024-01-01T08:00:00Z");
		});
	});

	describe("POST /schedule", () => {
		it("should enable digest schedule", async () => {
			const { doInstance } = createTriageDO();

			const res = await doInstance.fetch(
				doPost("/schedule", {
					times: ["08:00", "13:00", "18:00"],
					timezone: "America/New_York",
					enabled: true,
				}),
			);
			const body = await res.json();

			expect(body.success).toBe(true);
			expect(body.nextDigestAt).toBeDefined();
		});

		it("should disable digest schedule", async () => {
			const { doInstance } = createTriageDO({
				processingQueue: [],
				digestScheduled: true,
				nextDigestAt: "2024-01-01T08:00:00Z",
			});

			const res = await doInstance.fetch(
				doPost("/schedule", {
					times: [],
					timezone: "America/New_York",
					enabled: false,
				}),
			);
			const body = await res.json();

			expect(body.success).toBe(true);
			expect(body.digestDisabled).toBe(true);
		});
	});

	describe("POST /digest", () => {
		it("should trigger manual digest", async () => {
			const { doInstance, ivyDb } = createTriageDO();

			// Settings query
			ivyDb._pushResult({
				results: [
					{
						digest_times: '["08:00"]',
						digest_timezone: "UTC",
						digest_recipient: "user@example.com",
						digest_enabled: 1,
						last_digest_at: null,
					},
				],
			});

			const res = await doInstance.fetch(doPost("/digest", {}));
			const body = await res.json();

			expect(body.success).toBe(true);
		});
	});

	describe("alarm", () => {
		it("should handle alarm with empty queue", async () => {
			const { doInstance } = createTriageDO({
				processingQueue: [],
				digestScheduled: false,
				nextDigestAt: null,
			});

			await expect(doInstance.alarm()).resolves.not.toThrow();
		});

		it("should handle alarm with no state (initializes)", async () => {
			const { doInstance } = createTriageDO();
			await expect(doInstance.alarm()).resolves.not.toThrow();
		});
	});

	describe("route matching", () => {
		it("should return 404 for unknown routes", async () => {
			const { doInstance } = createTriageDO();
			const res = await doInstance.fetch(doRequest("/unknown"));
			expect(res.status).toBe(404);
		});
	});
});
