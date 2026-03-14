/**
 * Tests for Domain Finder database operations
 *
 * Covers:
 * - User operations (getOrCreate, getByEmail, getById, row mapping)
 * - Session operations (create, get, update tokens, cleanup, delete)
 * - Magic code operations (create, verify, secure code generation)
 * - Domain search job operations (create, get, list, update status)
 * - Domain result operations (save batch, get with filters)
 * - Search config operations (get active, update/upsert)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the lattice services module
vi.mock("@autumnsgrove/lattice/services", () => ({
	generateId: vi.fn().mockReturnValue("mock-id-001"),
	now: vi.fn().mockReturnValue("2026-03-12T00:00:00Z"),
	futureTimestamp: vi.fn().mockReturnValue("2026-04-11T00:00:00Z"),
	queryOne: vi.fn().mockResolvedValue(null),
	queryMany: vi.fn().mockResolvedValue([]),
	execute: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
	batch: vi.fn().mockResolvedValue([]),
}));

import {
	getOrCreateUser,
	getUserByEmail,
	getUserById,
	createSession,
	getSession,
	updateSessionTokens,
	cleanupExpiredSessions,
	deleteSession,
	createMagicCode,
	verifyMagicCode,
	createSearchJob,
	getSearchJob,
	listSearchJobs,
	updateSearchJobStatus,
	saveDomainResults,
	getJobResults,
	getActiveConfig,
	updateConfig,
} from "./db";

import {
	generateId,
	now,
	futureTimestamp,
	queryOne,
	queryMany,
	execute,
	batch,
} from "@autumnsgrove/lattice/services";

const mockDb = {} as any;

beforeEach(() => {
	vi.clearAllMocks();
	// Re-establish defaults
	vi.mocked(generateId).mockReturnValue("mock-id-001");
	vi.mocked(now).mockReturnValue("2026-03-12T00:00:00Z");
	vi.mocked(futureTimestamp).mockReturnValue("2026-04-11T00:00:00Z");
	vi.mocked(queryOne).mockResolvedValue(null);
	vi.mocked(queryMany).mockResolvedValue([]);
	vi.mocked(execute).mockResolvedValue({
		success: true,
		meta: { changes: 0, duration: 0, lastRowId: 0, rowsRead: 0, rowsWritten: 0 },
	});
	vi.mocked(batch).mockResolvedValue([]);
});

// =============================================================================
// User Operations
// =============================================================================

describe("User Operations", () => {
	describe("getOrCreateUser", () => {
		it("returns existing user when found", async () => {
			vi.mocked(queryOne).mockResolvedValue({
				id: "user-1",
				email: "test@example.com",
				is_admin: 1,
				created_at: "2026-01-01T00:00:00Z",
				updated_at: "2026-01-01T00:00:00Z",
			});

			const user = await getOrCreateUser(mockDb, "TEST@example.com");

			expect(user.id).toBe("user-1");
			expect(user.email).toBe("test@example.com");
			expect(user.is_admin).toBe(true);
			// Should not insert
			expect(execute).not.toHaveBeenCalled();
		});

		it("normalizes email to lowercase", async () => {
			vi.mocked(queryOne).mockResolvedValue({
				id: "user-1",
				email: "test@example.com",
				is_admin: 0,
				created_at: "2026-01-01T00:00:00Z",
				updated_at: "2026-01-01T00:00:00Z",
			});

			await getOrCreateUser(mockDb, "TEST@EXAMPLE.COM");

			expect(queryOne).toHaveBeenCalledWith(mockDb, expect.any(String), ["test@example.com"]);
		});

		it("creates new user when not found", async () => {
			vi.mocked(queryOne).mockResolvedValue(null);

			const user = await getOrCreateUser(mockDb, "new@example.com");

			expect(user.id).toBe("mock-id-001");
			expect(user.email).toBe("new@example.com");
			expect(user.is_admin).toBe(false);
			expect(execute).toHaveBeenCalledWith(
				mockDb,
				expect.stringContaining("INSERT INTO users"),
				expect.arrayContaining(["mock-id-001", "new@example.com"]),
			);
		});

		it("maps is_admin from number to boolean correctly", async () => {
			// is_admin = 0 → false
			vi.mocked(queryOne).mockResolvedValue({
				id: "u1",
				email: "a@b.com",
				is_admin: 0,
				created_at: "t",
				updated_at: "t",
			});

			const user = await getOrCreateUser(mockDb, "a@b.com");
			expect(user.is_admin).toBe(false);
		});
	});

	describe("getUserByEmail", () => {
		it("returns null when user not found", async () => {
			const result = await getUserByEmail(mockDb, "nobody@example.com");
			expect(result).toBeNull();
		});

		it("returns mapped user when found", async () => {
			vi.mocked(queryOne).mockResolvedValue({
				id: "u1",
				email: "admin@grove.place",
				is_admin: 1,
				created_at: "t",
				updated_at: "t",
			});

			const user = await getUserByEmail(mockDb, "ADMIN@grove.place");
			expect(user).not.toBeNull();
			expect(user!.is_admin).toBe(true);
			expect(queryOne).toHaveBeenCalledWith(mockDb, expect.any(String), ["admin@grove.place"]);
		});
	});

	describe("getUserById", () => {
		it("returns null when user not found", async () => {
			const result = await getUserById(mockDb, "nonexistent-id");
			expect(result).toBeNull();
		});

		it("returns mapped user when found", async () => {
			vi.mocked(queryOne).mockResolvedValue({
				id: "u1",
				email: "user@test.com",
				is_admin: 0,
				created_at: "t",
				updated_at: "t",
			});

			const user = await getUserById(mockDb, "u1");
			expect(user).not.toBeNull();
			expect(user!.id).toBe("u1");
			expect(user!.is_admin).toBe(false);
		});
	});
});

// =============================================================================
// Session Operations
// =============================================================================

describe("Session Operations", () => {
	describe("createSession", () => {
		it("creates session without tokens", async () => {
			const session = await createSession(mockDb, "user-1");

			expect(session.id).toBe("mock-id-001");
			expect(session.user_id).toBe("user-1");
			expect(session.access_token).toBeNull();
			expect(session.refresh_token).toBeNull();
			expect(session.token_expires_at).toBeNull();
			expect(execute).toHaveBeenCalledWith(
				mockDb,
				expect.stringContaining("INSERT INTO sessions"),
				expect.arrayContaining(["mock-id-001", "user-1"]),
			);
		});

		it("creates session with OAuth tokens", async () => {
			const session = await createSession(mockDb, "user-1", {
				accessToken: "access-tok",
				refreshToken: "refresh-tok",
				expiresIn: 3600,
			});

			expect(session.access_token).toBe("access-tok");
			expect(session.refresh_token).toBe("refresh-tok");
			expect(session.token_expires_at).toBe("2026-04-11T00:00:00Z");
			expect(futureTimestamp).toHaveBeenCalledWith(3600 * 1000);
		});

		it("handles missing refreshToken and expiresIn", async () => {
			const session = await createSession(mockDb, "user-1", {
				accessToken: "access-only",
			});

			expect(session.access_token).toBe("access-only");
			expect(session.refresh_token).toBeNull();
			expect(session.token_expires_at).toBeNull();
		});
	});

	describe("getSession", () => {
		it("returns null for expired/missing session", async () => {
			const result = await getSession(mockDb, "expired-session");
			expect(result).toBeNull();
			expect(queryOne).toHaveBeenCalledWith(mockDb, expect.stringContaining("expires_at"), [
				"expired-session",
			]);
		});

		it("returns session when valid", async () => {
			const mockSession = {
				id: "sess-1",
				user_id: "user-1",
				access_token: "tok",
				refresh_token: null,
				token_expires_at: null,
				expires_at: "2026-04-11T00:00:00Z",
				created_at: "2026-03-12T00:00:00Z",
			};
			vi.mocked(queryOne).mockResolvedValue(mockSession);

			const session = await getSession(mockDb, "sess-1");
			expect(session).toEqual(mockSession);
		});
	});

	describe("updateSessionTokens", () => {
		it("updates access token and refresh token", async () => {
			await updateSessionTokens(mockDb, "sess-1", {
				accessToken: "new-access",
				refreshToken: "new-refresh",
				expiresIn: 7200,
			});

			expect(execute).toHaveBeenCalledWith(
				mockDb,
				expect.stringContaining("UPDATE sessions"),
				expect.arrayContaining(["new-access", "new-refresh"]),
			);
			expect(futureTimestamp).toHaveBeenCalledWith(7200 * 1000);
		});

		it("handles missing refresh token with COALESCE", async () => {
			await updateSessionTokens(mockDb, "sess-1", {
				accessToken: "new-access",
			});

			expect(execute).toHaveBeenCalledWith(
				mockDb,
				expect.stringContaining("COALESCE"),
				expect.arrayContaining(["new-access", null]),
			);
		});
	});

	describe("cleanupExpiredSessions", () => {
		it("returns count of deleted sessions", async () => {
			vi.mocked(execute).mockResolvedValue({
				success: true,
				meta: { changes: 5, duration: 0, lastRowId: 0, rowsRead: 5, rowsWritten: 5 },
			});

			const count = await cleanupExpiredSessions(mockDb);
			expect(count).toBe(5);
			expect(execute).toHaveBeenCalledWith(mockDb, expect.stringContaining("DELETE FROM sessions"));
		});
	});

	describe("deleteSession", () => {
		it("deletes session by ID", async () => {
			await deleteSession(mockDb, "sess-to-delete");

			expect(execute).toHaveBeenCalledWith(
				mockDb,
				expect.stringContaining("DELETE FROM sessions WHERE id = ?"),
				["sess-to-delete"],
			);
		});
	});
});

// =============================================================================
// Magic Code Operations
// =============================================================================

describe("Magic Code Operations", () => {
	describe("createMagicCode", () => {
		it("creates a magic code with normalized email", async () => {
			const code = await createMagicCode(mockDb, "USER@Example.COM");

			expect(code.id).toBe("mock-id-001");
			expect(code.email).toBe("user@example.com");
			expect(code.code).toMatch(/^[A-Z2-9]{6}$/);
			expect(code.used_at).toBeNull();
			expect(execute).toHaveBeenCalledWith(
				mockDb,
				expect.stringContaining("INSERT INTO magic_codes"),
				expect.any(Array),
			);
		});

		it("generates codes from safe charset (no 0, O, 1, I)", async () => {
			const code = await createMagicCode(mockDb, "test@test.com");

			// Should not contain ambiguous characters
			expect(code.code).not.toMatch(/[0OI1]/);
			expect(code.code).toHaveLength(6);
		});
	});

	describe("verifyMagicCode", () => {
		it("returns false when code not found", async () => {
			const result = await verifyMagicCode(mockDb, "user@test.com", "ABCDEF");
			expect(result).toBe(false);
		});

		it("returns true and marks code as used when valid", async () => {
			vi.mocked(queryOne).mockResolvedValue({
				id: "mc-1",
				email: "user@test.com",
				code: "ABCDEF",
				expires_at: "2026-03-12T01:00:00Z",
				used_at: null,
				created_at: "2026-03-12T00:00:00Z",
			});

			const result = await verifyMagicCode(mockDb, "User@Test.com", "abcdef");

			expect(result).toBe(true);
			// Should mark as used
			expect(execute).toHaveBeenCalledWith(
				mockDb,
				expect.stringContaining("UPDATE magic_codes SET used_at"),
				["mc-1"],
			);
		});

		it("normalizes email to lowercase and code to uppercase", async () => {
			await verifyMagicCode(mockDb, "USER@TEST.COM", "abcdef");

			expect(queryOne).toHaveBeenCalledWith(mockDb, expect.any(String), [
				"user@test.com",
				"ABCDEF",
			]);
		});
	});
});

// =============================================================================
// Domain Search Job Operations
// =============================================================================

describe("Domain Search Job Operations", () => {
	describe("createSearchJob", () => {
		it("creates a search job with defaults", async () => {
			vi.mocked(generateId).mockReturnValueOnce("job-id-001").mockReturnValueOnce("client-id-001");

			const job = await createSearchJob(mockDb, {
				client_email: "CLIENT@example.com",
				business_name: "My Bakery",
				tld_preferences: ["com", "co"],
				vibe: "playful",
			});

			expect(job.id).toBe("job-id-001");
			expect(job.client_id).toBe("client-id-001");
			expect(job.client_email).toBe("client@example.com");
			expect(job.business_name).toBe("My Bakery");
			expect(job.domain_idea).toBeNull();
			expect(job.tld_preferences).toBe(JSON.stringify(["com", "co"]));
			expect(job.vibe).toBe("playful");
			expect(job.keywords).toBeNull();
			expect(job.status).toBe("pending");
			expect(job.batch_num).toBe(0);
			expect(job.domains_checked).toBe(0);
		});

		it("includes optional fields when provided", async () => {
			const job = await createSearchJob(mockDb, {
				client_email: "user@test.com",
				business_name: "Tech Co",
				domain_idea: "techco.io",
				tld_preferences: ["io", "dev"],
				vibe: "minimal",
				keywords: "technology startup",
			});

			expect(job.domain_idea).toBe("techco.io");
			expect(job.keywords).toBe("technology startup");
		});

		it("inserts all fields via execute", async () => {
			await createSearchJob(mockDb, {
				client_email: "user@test.com",
				business_name: "Test",
				tld_preferences: ["com"],
				vibe: "professional",
			});

			expect(execute).toHaveBeenCalledWith(
				mockDb,
				expect.stringContaining("INSERT INTO domain_search_jobs"),
				expect.any(Array),
			);
		});
	});

	describe("getSearchJob", () => {
		it("returns null when not found", async () => {
			const result = await getSearchJob(mockDb, "nonexistent");
			expect(result).toBeNull();
		});

		it("returns job when found", async () => {
			const mockJob = { id: "job-1", status: "running" };
			vi.mocked(queryOne).mockResolvedValue(mockJob);

			const result = await getSearchJob(mockDb, "job-1");
			expect(result).toEqual(mockJob);
		});
	});

	describe("listSearchJobs", () => {
		it("returns jobs with total count", async () => {
			vi.mocked(queryMany).mockResolvedValue([{ id: "j1" }, { id: "j2" }] as any);
			vi.mocked(queryOne).mockResolvedValue({ count: 10 });

			const result = await listSearchJobs(mockDb);

			expect(result.jobs).toHaveLength(2);
			expect(result.total).toBe(10);
		});

		it("enforces max limit of 100", async () => {
			vi.mocked(queryOne).mockResolvedValue({ count: 0 });

			await listSearchJobs(mockDb, { limit: 500 });

			expect(queryMany).toHaveBeenCalledWith(
				mockDb,
				expect.stringContaining("LIMIT ? OFFSET ?"),
				expect.arrayContaining([100, 0]),
			);
		});

		it("defaults to limit 20 offset 0", async () => {
			vi.mocked(queryOne).mockResolvedValue({ count: 0 });

			await listSearchJobs(mockDb);

			expect(queryMany).toHaveBeenCalledWith(
				mockDb,
				expect.any(String),
				expect.arrayContaining([20, 0]),
			);
		});

		it("filters by status when provided", async () => {
			vi.mocked(queryOne).mockResolvedValue({ count: 0 });

			await listSearchJobs(mockDb, { status: "complete" });

			expect(queryMany).toHaveBeenCalledWith(
				mockDb,
				expect.stringContaining("WHERE status = ?"),
				expect.arrayContaining(["complete"]),
			);
		});

		it("returns 0 total when count result is null", async () => {
			vi.mocked(queryOne).mockResolvedValue(null);

			const result = await listSearchJobs(mockDb);
			expect(result.total).toBe(0);
		});
	});

	describe("updateSearchJobStatus", () => {
		it("always includes updated_at", async () => {
			await updateSearchJobStatus(mockDb, "job-1", {});

			expect(execute).toHaveBeenCalledWith(
				mockDb,
				expect.stringContaining('updated_at = datetime("now")'),
				["job-1"],
			);
		});

		it("updates status field", async () => {
			await updateSearchJobStatus(mockDb, "job-1", { status: "complete" });

			expect(execute).toHaveBeenCalledWith(
				mockDb,
				expect.stringContaining("status = ?"),
				expect.arrayContaining(["complete", "job-1"]),
			);
		});

		it("updates multiple fields at once", async () => {
			await updateSearchJobStatus(mockDb, "job-1", {
				status: "running",
				batch_num: 3,
				domains_checked: 150,
				good_results: 12,
			});

			const call = vi.mocked(execute).mock.calls[0];
			const sql = call[1] as string;
			expect(sql).toContain("status = ?");
			expect(sql).toContain("batch_num = ?");
			expect(sql).toContain("domains_checked = ?");
			expect(sql).toContain("good_results = ?");
		});

		it("updates token counts", async () => {
			await updateSearchJobStatus(mockDb, "job-1", {
				input_tokens: 1000,
				output_tokens: 500,
			});

			const call = vi.mocked(execute).mock.calls[0];
			const sql = call[1] as string;
			expect(sql).toContain("input_tokens = ?");
			expect(sql).toContain("output_tokens = ?");
		});

		it("calculates duration_seconds when completed_at is set", async () => {
			await updateSearchJobStatus(mockDb, "job-1", {
				completed_at: "2026-03-12T00:05:00Z",
			});

			const call = vi.mocked(execute).mock.calls[0];
			const sql = call[1] as string;
			expect(sql).toContain("completed_at = ?");
			expect(sql).toContain("duration_seconds");
			expect(sql).toContain("julianday");
		});

		it("sets error field including null to clear errors", async () => {
			await updateSearchJobStatus(mockDb, "job-1", {
				error: "Something broke",
			});

			expect(execute).toHaveBeenCalledWith(
				mockDb,
				expect.stringContaining("error = ?"),
				expect.arrayContaining(["Something broke", "job-1"]),
			);
		});
	});
});

// =============================================================================
// Domain Result Operations
// =============================================================================

describe("Domain Result Operations", () => {
	describe("saveDomainResults", () => {
		it("saves results via batch insert", async () => {
			const results = [
				{
					job_id: "job-1",
					domain: "mybakery.com",
					tld: "com",
					status: "available" as const,
					score: 85,
					price_cents: 1299,
					price_category: "standard",
					flags: JSON.stringify(["short", "memorable"]),
					notes: "Great domain",
					batch_num: 1,
				},
				{
					job_id: "job-1",
					domain: "mybakery.co",
					tld: "co",
					status: "registered" as const,
					score: 72,
					price_cents: null,
					price_category: null,
					flags: null,
					notes: null,
					batch_num: 1,
				},
			];

			await saveDomainResults(mockDb as any, "job-1", results);

			expect(batch).toHaveBeenCalledWith(
				mockDb,
				expect.arrayContaining([
					expect.objectContaining({
						sql: expect.stringContaining("INSERT INTO domain_results"),
					}),
				]),
			);
			const batchCall = vi.mocked(batch).mock.calls[0][1] as any[];
			expect(batchCall).toHaveLength(2);
		});

		it("rethrows batch errors", async () => {
			vi.mocked(batch).mockRejectedValue(new Error("D1 batch failed"));

			await expect(
				saveDomainResults(mockDb as any, "job-1", [
					{
						job_id: "job-1",
						domain: "test.com",
						tld: "com",
						status: "available",
						score: 50,
						price_cents: null,
						price_category: null,
						flags: null,
						notes: null,
						batch_num: 1,
					},
				]),
			).rejects.toThrow("D1 batch failed");
		});
	});

	describe("getJobResults", () => {
		it("returns all results for a job", async () => {
			vi.mocked(queryMany).mockResolvedValue([
				{ id: "r1", domain: "test.com" },
				{ id: "r2", domain: "test.co" },
			] as any);

			const results = await getJobResults(mockDb, "job-1");
			expect(results).toHaveLength(2);
			expect(queryMany).toHaveBeenCalledWith(
				mockDb,
				expect.stringContaining("ORDER BY score DESC"),
				["job-1"],
			);
		});

		it("filters by available only", async () => {
			await getJobResults(mockDb, "job-1", { availableOnly: true });

			expect(queryMany).toHaveBeenCalledWith(mockDb, expect.stringContaining("status = ?"), [
				"job-1",
				"available",
			]);
		});

		it("filters by minimum score", async () => {
			await getJobResults(mockDb, "job-1", { minScore: 70 });

			expect(queryMany).toHaveBeenCalledWith(mockDb, expect.stringContaining("score >= ?"), [
				"job-1",
				70,
			]);
		});

		it("combines filters", async () => {
			await getJobResults(mockDb, "job-1", {
				availableOnly: true,
				minScore: 80,
			});

			const call = vi.mocked(queryMany).mock.calls[0];
			const sql = call[1] as string;
			expect(sql).toContain("status = ?");
			expect(sql).toContain("score >= ?");
			expect(call[2]).toEqual(["job-1", "available", 80]);
		});
	});
});

// =============================================================================
// Search Config Operations
// =============================================================================

describe("Search Config Operations", () => {
	describe("getActiveConfig", () => {
		it("returns null when no active config exists", async () => {
			const result = await getActiveConfig(mockDb);
			expect(result).toBeNull();
			expect(queryOne).toHaveBeenCalledWith(mockDb, expect.stringContaining("is_active = 1"));
		});

		it("returns active config when exists", async () => {
			const mockConfig = {
				id: "cfg-1",
				name: "default",
				driver_model: "deepseek/deepseek-v3.2",
				is_active: true,
			};
			vi.mocked(queryOne).mockResolvedValue(mockConfig);

			const result = await getActiveConfig(mockDb);
			expect(result).toEqual(mockConfig);
		});
	});

	describe("updateConfig", () => {
		it("creates default config when none exists", async () => {
			// First call: getActiveConfig returns null (no config)
			// Second call: getActiveConfig after insert returns new config
			vi.mocked(queryOne).mockResolvedValueOnce(null).mockResolvedValueOnce({
				id: "cfg-new",
				name: "default",
			});

			await updateConfig(mockDb, { max_batches: 8 });

			// Should insert default config first
			expect(execute).toHaveBeenCalledWith(
				mockDb,
				expect.stringContaining("INSERT INTO domain_search_config"),
				expect.any(Array),
			);
			// Then update it
			expect(execute).toHaveBeenCalledTimes(2);
		});

		it("updates existing config fields", async () => {
			vi.mocked(queryOne).mockResolvedValue({
				id: "cfg-1",
				name: "default",
			});

			await updateConfig(mockDb, {
				max_batches: 8,
				creativity: 0.9,
				rdap_delay_seconds: 5,
			});

			const call = vi.mocked(execute).mock.calls[0];
			const sql = call[1] as string;
			expect(sql).toContain("max_batches = ?");
			expect(sql).toContain("creativity = ?");
			expect(sql).toContain("rdap_delay_seconds = ?");
		});

		it("does nothing if config not found after insert attempt", async () => {
			// Both getActiveConfig calls return null
			vi.mocked(queryOne).mockResolvedValue(null);

			await updateConfig(mockDb, { max_batches: 8 });

			// Should insert, then try to get again, then return early
			expect(execute).toHaveBeenCalledTimes(1); // Only the insert
		});

		it("updates model fields", async () => {
			vi.mocked(queryOne).mockResolvedValue({ id: "cfg-1" });

			await updateConfig(mockDb, {
				driver_model: "new-driver",
				swarm_model: "new-swarm",
				name: "custom",
			});

			const call = vi.mocked(execute).mock.calls[0];
			const sql = call[1] as string;
			expect(sql).toContain("driver_model = ?");
			expect(sql).toContain("swarm_model = ?");
			expect(sql).toContain("name = ?");
		});
	});
});
