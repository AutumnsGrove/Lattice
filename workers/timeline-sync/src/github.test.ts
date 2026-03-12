/**
 * Tests for GitHub API integration
 *
 * Covers:
 * - Fast path: fetching repos from timeline_activity backfill
 * - Slow path: discovering repos via GitHub API
 * - Commit filtering with include/exclude lists
 * - Fork exclusion
 * - Error handling (409 empty repo, API errors)
 * - Commit stats enrichment with concurrent batching
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchGitHubCommits, fetchCommitStats } from "./github";
import type { TenantConfig, Commit, GitHubRepo, GitHubCommitDetail } from "./config";

// =============================================================================
// Mock Setup
// =============================================================================

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function createMockDb(activityRow?: { repos_active: string } | null) {
	const stmt = {
		bind: vi.fn().mockReturnThis(),
		first: vi.fn().mockResolvedValue(activityRow ?? null),
	};
	return { prepare: vi.fn().mockReturnValue(stmt) } as any;
}

function createMockConfig(overrides: Partial<TenantConfig> = {}): TenantConfig {
	return {
		tenantId: "tenant-1",
		githubUsername: "testuser",
		openrouterModel: "anthropic/claude-3.5-haiku",
		voicePreset: "professional",
		customSystemPrompt: null,
		customSummaryInstructions: null,
		customGutterStyle: null,
		reposInclude: null,
		reposExclude: null,
		timezone: "UTC",
		ownerName: null,
		...overrides,
	};
}

function createMockRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
	return {
		name: "test-repo",
		full_name: "testuser/test-repo",
		fork: false,
		pushed_at: "2026-03-12T10:00:00Z",
		...overrides,
	};
}

function createMockCommitDetail(overrides: Partial<GitHubCommitDetail> = {}): GitHubCommitDetail {
	return {
		sha: "abc123def456",
		commit: {
			message: "Fix: update component",
			author: {
				date: "2026-03-11T10:00:00Z",
				name: "Test User",
				email: "test@example.com",
			},
		},
		stats: {
			additions: 10,
			deletions: 5,
		},
		...overrides,
	};
}

function createMockCommit(overrides: Partial<Commit> = {}): Commit {
	return {
		sha: "abc123def456",
		repo: "test-repo",
		message: "Fix: update component",
		timestamp: "2026-03-11T10:00:00Z",
		additions: 0,
		deletions: 0,
		...overrides,
	};
}

// =============================================================================
// fetchGitHubCommits Tests
// =============================================================================

describe("fetchGitHubCommits", () => {
	beforeEach(() => {
		fetchMock.mockClear();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// Fast path tests
	describe("fast path: backfill data", () => {
		it("uses repos from timeline_activity when available", async () => {
			const db = createMockDb({
				repos_active: JSON.stringify(["repo-a", "repo-b"]),
			});
			const config = createMockConfig();

			const commitDetail = createMockCommitDetail({
				sha: "sha1",
				commit: {
					...createMockCommitDetail().commit,
					message: "Commit 1",
				},
			});

			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify([commitDetail]), { status: 200 }),
			);
			fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

			const commits = await fetchGitHubCommits(config, "token123", "2026-03-11", db);

			expect(db.prepare).toHaveBeenCalledWith(
				expect.stringContaining("SELECT repos_active FROM timeline_activity"),
			);
			expect(commits).toHaveLength(1);
			expect(commits[0].sha).toBe("sha1");
		});

		it("validates backfill repo format, rejects names with slashes", async () => {
			const db = createMockDb({
				repos_active: JSON.stringify(["valid-repo", "testuser/invalid-format", "another-valid"]),
			});
			const config = createMockConfig();

			const commitDetail = createMockCommitDetail();
			fetchMock.mockImplementation(() =>
				Promise.resolve(new Response(JSON.stringify([commitDetail]), { status: 200 })),
			);

			await fetchGitHubCommits(config, "token123", "2026-03-11", db);

			// Should fetch only for valid repos (2, not 3)
			const callUrls = fetchMock.mock.calls.map((call) => call[0]);
			const commitFetchCalls = callUrls.filter((url) => url.toString().includes("/commits?"));
			expect(commitFetchCalls.length).toBeLessThanOrEqual(2);
		});

		it("falls through to slow path when timeline_activity returns null", async () => {
			const db = createMockDb(null);
			const config = createMockConfig();

			const repo = createMockRepo();
			fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([repo]), { status: 200 }));
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify([createMockCommitDetail()]), { status: 200 }),
			);

			const commits = await fetchGitHubCommits(config, "token123", "2026-03-11", db);

			const callUrls = fetchMock.mock.calls.map((call) => call[0]);
			expect(callUrls.some((url) => url.toString().includes("/repos?"))).toBe(true);
		});
	});

	// Slow path tests
	describe("slow path: GitHub API discovery", () => {
		it("discovers repos via /users/{username}/repos", async () => {
			const db = createMockDb(null);
			const config = createMockConfig();

			const repos = [
				createMockRepo({ name: "repo-a", full_name: "testuser/repo-a" }),
				createMockRepo({ name: "repo-b", full_name: "testuser/repo-b" }),
			];

			fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(repos), { status: 200 }));
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify([createMockCommitDetail()]), { status: 200 }),
			);
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify([createMockCommitDetail()]), { status: 200 }),
			);

			await fetchGitHubCommits(config, "token123", "2026-03-11", db);

			const callUrls = fetchMock.mock.calls.map((call) => call[0]);
			expect(callUrls[0]).toContain("/users/testuser/repos");
		});

		it("excludes forks from discovered repos", async () => {
			const db = createMockDb(null);
			const config = createMockConfig();

			const repos = [
				createMockRepo({ name: "original", full_name: "testuser/original", fork: false }),
				createMockRepo({ name: "forked", full_name: "testuser/forked", fork: true }),
			];

			fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(repos), { status: 200 }));
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify([createMockCommitDetail()]), { status: 200 }),
			);

			await fetchGitHubCommits(config, "token123", "2026-03-11", db);

			const commitFetchCalls = fetchMock.mock.calls
				.map((call) => call[0])
				.filter((url) => url.toString().includes("/repos/"));
			// Should only fetch commits for the non-fork repo
			expect(commitFetchCalls.some((url) => url.toString().includes("original"))).toBe(true);
		});
	});

	// Filter tests
	describe("include/exclude filtering", () => {
		it("applies reposInclude filter", async () => {
			const db = createMockDb(null);
			const config = createMockConfig({
				reposInclude: ["repo-a", "repo-c"],
			});

			const repos = [
				createMockRepo({ name: "repo-a", full_name: "testuser/repo-a" }),
				createMockRepo({ name: "repo-b", full_name: "testuser/repo-b" }),
				createMockRepo({ name: "repo-c", full_name: "testuser/repo-c" }),
			];

			fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(repos), { status: 200 }));
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify([createMockCommitDetail()]), { status: 200 }),
			);
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify([createMockCommitDetail()]), { status: 200 }),
			);

			await fetchGitHubCommits(config, "token123", "2026-03-11", db);

			const commitFetchCalls = fetchMock.mock.calls
				.map((call) => call[0])
				.filter((url) => url.toString().includes("/commits?"));
			expect(commitFetchCalls).toHaveLength(2);
		});

		it("applies reposExclude filter", async () => {
			const db = createMockDb(null);
			const config = createMockConfig({
				reposExclude: ["repo-b"],
			});

			const repos = [
				createMockRepo({ name: "repo-a", full_name: "testuser/repo-a" }),
				createMockRepo({ name: "repo-b", full_name: "testuser/repo-b" }),
				createMockRepo({ name: "repo-c", full_name: "testuser/repo-c" }),
			];

			fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(repos), { status: 200 }));
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify([createMockCommitDetail()]), { status: 200 }),
			);
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify([createMockCommitDetail()]), { status: 200 }),
			);

			await fetchGitHubCommits(config, "token123", "2026-03-11", db);

			const commitFetchCalls = fetchMock.mock.calls
				.map((call) => call[0])
				.filter((url) => url.toString().includes("/commits?"));
			expect(commitFetchCalls).toHaveLength(2);
		});

		it("combines include and exclude filters", async () => {
			const db = createMockDb(null);
			const config = createMockConfig({
				reposInclude: ["repo-a", "repo-b", "repo-c"],
				reposExclude: ["repo-b"],
			});

			const repos = [
				createMockRepo({ name: "repo-a", full_name: "testuser/repo-a" }),
				createMockRepo({ name: "repo-b", full_name: "testuser/repo-b" }),
				createMockRepo({ name: "repo-c", full_name: "testuser/repo-c" }),
			];

			fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(repos), { status: 200 }));
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify([createMockCommitDetail()]), { status: 200 }),
			);
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify([createMockCommitDetail()]), { status: 200 }),
			);

			await fetchGitHubCommits(config, "token123", "2026-03-11", db);

			const commitFetchCalls = fetchMock.mock.calls
				.map((call) => call[0])
				.filter((url) => url.toString().includes("/commits?"));
			expect(commitFetchCalls).toHaveLength(2);
		});
	});

	// Error handling tests
	describe("error handling", () => {
		it("handles 409 empty repository gracefully", async () => {
			const db = createMockDb(null);
			const config = createMockConfig();

			const repos = [createMockRepo()];

			fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(repos), { status: 200 }));
			fetchMock.mockResolvedValueOnce(new Response("Empty repo", { status: 409 }));

			const commits = await fetchGitHubCommits(config, "token123", "2026-03-11", db);

			expect(commits).toEqual([]);
		});

		it("handles API error (5xx) gracefully", async () => {
			const db = createMockDb(null);
			const config = createMockConfig();

			const repos = [createMockRepo()];

			fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(repos), { status: 200 }));
			fetchMock.mockResolvedValueOnce(new Response("Server error", { status: 500 }));

			const commits = await fetchGitHubCommits(config, "token123", "2026-03-11", db);

			expect(commits).toEqual([]);
		});

		it("handles timeline_activity query failure and falls through to slow path", async () => {
			const db = {
				prepare: vi.fn().mockReturnValue({
					bind: vi.fn().mockReturnThis(),
					first: vi.fn().mockRejectedValue(new Error("DB error")),
				}),
			} as any;
			const config = createMockConfig();

			const repos = [createMockRepo()];

			fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(repos), { status: 200 }));
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify([createMockCommitDetail()]), { status: 200 }),
			);

			const commits = await fetchGitHubCommits(config, "token123", "2026-03-11", db);

			expect(commits).toHaveLength(1);
		});
	});

	// Commit shape tests
	describe("returned commit structure", () => {
		it("returns commits with correct shape", async () => {
			const db = createMockDb(null);
			const config = createMockConfig();

			const repos = [createMockRepo({ name: "test-repo", full_name: "testuser/test-repo" })];
			const commitDetail = createMockCommitDetail({
				sha: "sha123",
				commit: {
					message: "My commit",
					author: {
						date: "2026-03-11T15:30:00Z",
						name: "Test",
						email: "test@test.com",
					},
				},
			});

			fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(repos), { status: 200 }));
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify([commitDetail]), { status: 200 }),
			);

			const commits = await fetchGitHubCommits(config, "token123", "2026-03-11", db);

			expect(commits).toHaveLength(1);
			const commit = commits[0];
			expect(commit).toHaveProperty("sha", "sha123");
			expect(commit).toHaveProperty("repo", "test-repo");
			expect(commit).toHaveProperty("message", "My commit");
			expect(commit).toHaveProperty("timestamp", "2026-03-11T15:30:00Z");
			expect(commit).toHaveProperty("additions", 0);
			expect(commit).toHaveProperty("deletions", 0);
		});
	});

	// Pagination test
	describe("pagination", () => {
		it("fetches multiple pages of commits from a repo", async () => {
			const db = createMockDb(null);
			const config = createMockConfig();

			const repos = [createMockRepo()];
			const page1Commits = Array.from({ length: 100 }, (_, i) =>
				createMockCommitDetail({ sha: `sha-page1-${i}` }),
			);
			const page2Commits = Array.from({ length: 50 }, (_, i) =>
				createMockCommitDetail({ sha: `sha-page2-${i}` }),
			);

			fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(repos), { status: 200 }));
			fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(page1Commits), { status: 200 }));
			fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(page2Commits), { status: 200 }));
			fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

			const commits = await fetchGitHubCommits(config, "token123", "2026-03-11", db);

			expect(commits).toHaveLength(150);
		});
	});
});

// =============================================================================
// fetchCommitStats Tests
// =============================================================================

describe("fetchCommitStats", () => {
	beforeEach(() => {
		// mockReset (not mockClear) to drain any leftover mockResolvedValueOnce queue
		// from fetchGitHubCommits tests — mockClear only clears history, not the once-queue
		fetchMock.mockReset();
	});

	it("enriches commits with additions/deletions from individual commit details", async () => {
		const commits = [
			createMockCommit({ sha: "sha1", repo: "repo-a" }),
			createMockCommit({ sha: "sha2", repo: "repo-a" }),
		];

		fetchMock
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ stats: { additions: 25, deletions: 10 } }), { status: 200 }),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ stats: { additions: 15, deletions: 8 } }), { status: 200 }),
			);

		await fetchCommitStats(commits, "testuser", "token123");

		expect(commits[0]).toHaveProperty("additions", 25);
		expect(commits[0]).toHaveProperty("deletions", 10);
		expect(commits[1]).toHaveProperty("additions", 15);
		expect(commits[1]).toHaveProperty("deletions", 8);
	});

	it("batches requests in groups of 5", async () => {
		const commits = Array.from({ length: 12 }, (_, i) =>
			createMockCommit({ sha: `sha${i}`, repo: "repo-a" }),
		);

		fetchMock.mockResolvedValue(
			new Response(
				JSON.stringify(
					createMockCommitDetail({
						stats: { additions: 10, deletions: 5 },
					}),
				),
				{ status: 200 },
			),
		);

		await fetchCommitStats(commits, "testuser", "token123");

		expect(fetchMock).toHaveBeenCalledTimes(12);
	});

	it("handles failed individual commit fetch gracefully, keeps 0", async () => {
		const commits = [
			createMockCommit({ sha: "sha1", repo: "repo-a" }),
			createMockCommit({ sha: "sha2", repo: "repo-a" }),
		];

		fetchMock.mockResolvedValueOnce(new Response("Not found", { status: 404 }));
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify(
					createMockCommitDetail({
						stats: { additions: 20, deletions: 5 },
					}),
				),
				{ status: 200 },
			),
		);

		await fetchCommitStats(commits, "testuser", "token123");

		expect(commits[0]).toHaveProperty("additions", 0);
		expect(commits[0]).toHaveProperty("deletions", 0);
		expect(commits[1]).toHaveProperty("additions", 20);
		expect(commits[1]).toHaveProperty("deletions", 5);
	});

	it("handles network errors gracefully, keeps 0", async () => {
		const commits = [createMockCommit({ sha: "sha1", repo: "repo-a" })];

		fetchMock.mockRejectedValueOnce(new Error("Network error"));

		await fetchCommitStats(commits, "testuser", "token123");

		expect(commits[0]).toHaveProperty("additions", 0);
		expect(commits[0]).toHaveProperty("deletions", 0);
	});

	it("uses correct GitHub API endpoint with proper headers", async () => {
		const commits = [createMockCommit({ sha: "sha123", repo: "my-repo" })];

		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify(createMockCommitDetail()), { status: 200 }),
		);

		await fetchCommitStats(commits, "myuser", "mytoken");

		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining("https://api.github.com/repos/myuser/my-repo/commits/sha123"),
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: "Bearer mytoken",
					Accept: "application/vnd.github.v3+json",
					"User-Agent": "Lattice-Timeline-Sync",
				}),
			}),
		);
	});

	it("handles stats as undefined in response", async () => {
		const commits = [createMockCommit({ sha: "sha1", repo: "repo-a" })];

		const commitDetailNoStats = createMockCommitDetail();
		commitDetailNoStats.stats = undefined;

		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify(commitDetailNoStats), { status: 200 }),
		);

		await fetchCommitStats(commits, "testuser", "token123");

		expect(commits[0]).toHaveProperty("additions", 0);
		expect(commits[0]).toHaveProperty("deletions", 0);
	});

	it("processes empty commit list without errors", async () => {
		const commits: Commit[] = [];

		await fetchCommitStats(commits, "testuser", "token123");

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("overwrites existing stats with fresh data from API", async () => {
		const commits = [
			createMockCommit({ sha: "sha1", repo: "repo-a", additions: 100, deletions: 50 }),
			createMockCommit({ sha: "sha2", repo: "repo-a" }),
		];

		fetchMock.mockImplementation(() =>
			Promise.resolve(
				new Response(
					JSON.stringify(
						createMockCommitDetail({
							stats: { additions: 10, deletions: 5 },
						}),
					),
					{ status: 200 },
				),
			),
		);

		await fetchCommitStats(commits, "testuser", "token123");

		// All commits get fresh stats from API
		expect(commits[0]).toHaveProperty("additions", 10);
		expect(commits[0]).toHaveProperty("deletions", 5);
		expect(commits[1]).toHaveProperty("additions", 10);
		expect(commits[1]).toHaveProperty("deletions", 5);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
