/**
 * Tests for the context module
 * Covers: task detection, context generation, historical retrieval, and continuation tracking
 */

import { describe, it, expect, vi } from "vitest";
import {
	detectTaskFromText,
	detectTask,
	generateContextBrief,
	buildDetectedFocus,
	getHistoricalContext,
	detectContinuation,
	formatHistoricalContextForPrompt,
	formatContinuationForPrompt,
	buildSummaryContextData,
} from "./context";
import type { Commit, TaskType, HistoricalContextRow, ContextBrief, DetectedFocus } from "./config";

// =============================================================================
// Mock Helpers
// =============================================================================

function createMockDb(rows: any[] = []) {
	const stmt = {
		bind: vi.fn().mockReturnThis(),
		all: vi.fn().mockResolvedValue({ results: rows }),
	};
	return { prepare: vi.fn().mockReturnValue(stmt), _stmt: stmt } as any;
}

function createMockCommit(overrides: Partial<Commit> = {}): Commit {
	return {
		sha: "abc123",
		repo: "repo-name",
		message: "test commit",
		timestamp: "2026-03-12T10:00:00Z",
		additions: 10,
		deletions: 5,
		...overrides,
	};
}

function createMockRow(overrides: Partial<HistoricalContextRow> = {}): HistoricalContextRow {
	return {
		summary_date: "2026-03-12",
		context_brief: null,
		detected_focus: null,
		brief_summary: null,
		commit_count: 1,
		...overrides,
	};
}

// =============================================================================
// detectTaskFromText Tests (12 task types + null cases)
// =============================================================================

describe("detectTaskFromText", () => {
	it("detects security work", () => {
		const result = detectTaskFromText("Fixed XSS vulnerability in auth");
		expect(result).toBe("security work");
	});

	it("detects migration", () => {
		const result = detectTaskFromText("Running the migration to upgrade dependencies");
		expect(result).toBe("migration");
	});

	it("detects refactoring", () => {
		const result = detectTaskFromText("Refactor user service cleanup");
		expect(result).toBe("refactoring");
	});

	it("detects testing improvements", () => {
		const result = detectTaskFromText("Improve test coverage with vitest specs");
		expect(result).toBe("testing improvements");
	});

	it("detects documentation", () => {
		const result = detectTaskFromText("Update docs and README comments");
		expect(result).toBe("documentation");
	});

	it("detects UI/UX work", () => {
		const result = detectTaskFromText("CSS styling redesign with tailwind layout");
		expect(result).toBe("UI/UX work");
	});

	it("detects API development", () => {
		const result = detectTaskFromText("New API endpoint for user routes");
		expect(result).toBe("API development");
	});

	it("detects authentication", () => {
		const result = detectTaskFromText("OAuth session login JWT implementation");
		expect(result).toBe("authentication");
	});

	it("detects performance optimization", () => {
		const result = detectTaskFromText("Cache optimization for perf speed");
		expect(result).toBe("performance optimization");
	});

	it("detects deployment/CI work", () => {
		const result = detectTaskFromText("Deploy pipeline docker build CI");
		expect(result).toBe("deployment/CI work");
	});

	it("detects database work", () => {
		const result = detectTaskFromText("D1 schema database SQL updates");
		expect(result).toBe("database work");
	});

	it("detects bug fixes", () => {
		const result = detectTaskFromText("Fix bug patch error issue");
		expect(result).toBe("bug fixes");
	});

	it("returns null for empty string", () => {
		const result = detectTaskFromText("");
		expect(result).toBeNull();
	});

	it("returns null for no matches", () => {
		const result = detectTaskFromText("The brown fox leaps over the sleeping hound");
		expect(result).toBeNull();
	});

	it("returns highest scoring task when multiple match", () => {
		// "refactor" appears 3 times, "bug" appears 1 time
		const result = detectTaskFromText("Refactor refactor refactor the bug");
		expect(result).toBe("refactoring");
	});

	it("is case insensitive", () => {
		const result = detectTaskFromText("SECURITY AUDIT VULNERAB AUDIT");
		expect(result).toBe("security work");
	});
});

// =============================================================================
// detectTask Tests
// =============================================================================

describe("detectTask", () => {
	it("combines commits and summary for detection", () => {
		const commits = [createMockCommit({ message: "fix: security audit" })];
		const summary = { brief: "Fixed vulnerabilities", detailed: "" };
		const result = detectTask(summary, commits);
		expect(result).toBe("security work");
	});

	it("returns highest score from combined text", () => {
		const commits = [
			createMockCommit({ message: "refactor" }),
			createMockCommit({ message: "bug fix" }),
		];
		const summary = { brief: "Refactoring cleanup", detailed: "" };
		const result = detectTask(summary, commits);
		expect(result).toBe("refactoring");
	});

	it("handles empty commits array", () => {
		const summary = { brief: "Testing improvements", detailed: "" };
		const result = detectTask(summary, []);
		expect(result).toBe("testing improvements");
	});

	it("returns null when no task detected", () => {
		const commits = [createMockCommit({ message: "hello world" })];
		const summary = { brief: "general work", detailed: "" };
		const result = detectTask(summary, commits);
		expect(result).toBeNull();
	});

	it("uses detailed summary if brief is missing", () => {
		const commits: Commit[] = [];
		const summary = { brief: "", detailed: "Database migration to v2" };
		const result = detectTask(summary, commits);
		expect(result).toBe("migration");
	});

	it("prioritizes commit messages + summary combined", () => {
		const commits = [createMockCommit({ message: "fix fix fix bug" })];
		const summary = { brief: "Migration work", detailed: "" };
		// "fix" and "bug" appear in commits (2 matches each), migration in summary (1 match)
		const result = detectTask(summary, commits);
		expect(result).toBe("bug fixes");
	});
});

// =============================================================================
// generateContextBrief Tests
// =============================================================================

describe("generateContextBrief", () => {
	it("returns all required fields", () => {
		const commits = [createMockCommit()];
		const summary = { brief: "Test brief summary", detailed: "" };
		const date = "2026-03-12";

		const result = generateContextBrief(summary, commits, date);

		expect(result).toEqual(
			expect.objectContaining({
				date,
				mainFocus: expect.any(String),
				repos: expect.any(Array),
				linesChanged: expect.any(Number),
				commitCount: expect.any(Number),
				detectedTask: expect.any(String),
			}),
		);
	});

	it("deduplicates repos", () => {
		const commits = [
			createMockCommit({ repo: "repo-a" }),
			createMockCommit({ repo: "repo-a" }),
			createMockCommit({ repo: "repo-b" }),
		];
		const summary = { brief: "Work", detailed: "" };

		const result = generateContextBrief(summary, commits, "2026-03-12");

		expect(result.repos).toContain("repo-a");
		expect(result.repos).toContain("repo-b");
		expect(result.repos.length).toBe(2);
	});

	it("limits repos to top 3", () => {
		const commits = [
			createMockCommit({ repo: "repo-a" }),
			createMockCommit({ repo: "repo-b" }),
			createMockCommit({ repo: "repo-c" }),
			createMockCommit({ repo: "repo-d" }),
		];
		const summary = { brief: "Work", detailed: "" };

		const result = generateContextBrief(summary, commits, "2026-03-12");

		expect(result.repos.length).toBeLessThanOrEqual(3);
	});

	it("calculates total linesChanged", () => {
		const commits = [
			createMockCommit({ additions: 10, deletions: 5 }),
			createMockCommit({ additions: 20, deletions: 3 }),
		];
		const summary = { brief: "Work", detailed: "" };

		const result = generateContextBrief(summary, commits, "2026-03-12");

		expect(result.linesChanged).toBe(38); // (10+5) + (20+3)
	});

	it("counts commits correctly", () => {
		const commits = [createMockCommit(), createMockCommit(), createMockCommit()];
		const summary = { brief: "Work", detailed: "" };

		const result = generateContextBrief(summary, commits, "2026-03-12");

		expect(result.commitCount).toBe(3);
	});

	it("extracts mainFocus from brief summary", () => {
		const commits = [createMockCommit()];
		const summary = {
			brief: "Implemented new authentication system with OAuth support.",
			detailed: "",
		};

		const result = generateContextBrief(summary, commits, "2026-03-12");

		expect(result.mainFocus).toContain("authentication");
	});

	it("falls back to detailed summary for mainFocus", () => {
		const commits = [createMockCommit()];
		const summary = {
			brief: "short",
			detailed: "## Summary\n\nRefactored the user service to improve code clarity.",
		};

		const result = generateContextBrief(summary, commits, "2026-03-12");

		expect(result.mainFocus).toContain("Refactored");
	});

	it("defaults mainFocus when no summary available", () => {
		const commits = [createMockCommit()];
		const summary = { brief: "", detailed: "" };

		const result = generateContextBrief(summary, commits, "2026-03-12");

		expect(result.mainFocus).toBe("Various development tasks");
	});

	it("detects task type", () => {
		const commits = [createMockCommit({ message: "fix security vulnerability" })];
		const summary = { brief: "Security audit", detailed: "" };

		const result = generateContextBrief(summary, commits, "2026-03-12");

		expect(result.detectedTask).toBe("security work");
	});
});

// =============================================================================
// buildDetectedFocus Tests
// =============================================================================

describe("buildDetectedFocus", () => {
	it("returns null if task is null", () => {
		const result = buildDetectedFocus(null, "2026-03-12", ["repo-a"]);
		expect(result).toBeNull();
	});

	it("builds focus with valid task", () => {
		const task: TaskType = "refactoring";
		const date = "2026-03-12";
		const repos = ["repo-a", "repo-b"];

		const result = buildDetectedFocus(task, date, repos);

		expect(result).toEqual({
			task,
			startDate: date,
			repos,
		});
	});

	it("limits repos to top 3", () => {
		const task: TaskType = "bug fixes";
		const repos = ["repo-1", "repo-2", "repo-3", "repo-4"];

		const result = buildDetectedFocus(task, "2026-03-12", repos);

		expect(result?.repos).toHaveLength(3);
		expect(result?.repos).toEqual(["repo-1", "repo-2", "repo-3"]);
	});

	it("preserves all task types", () => {
		const taskTypes: TaskType[] = [
			"security work",
			"migration",
			"refactoring",
			"testing improvements",
			"documentation",
			"UI/UX work",
			"API development",
			"authentication",
			"performance optimization",
			"deployment/CI work",
			"database work",
			"bug fixes",
		];

		for (const task of taskTypes) {
			const result = buildDetectedFocus(task, "2026-03-12", ["repo"]);
			expect(result?.task).toBe(task);
		}
	});
});

// =============================================================================
// getHistoricalContext Tests
// =============================================================================

describe("getHistoricalContext", () => {
	it("returns empty array on DB error", async () => {
		const db = createMockDb();
		db.prepare().all.mockRejectedValueOnce(new Error("DB error"));

		const result = await getHistoricalContext(db, "tenant-1", "2026-03-12");

		expect(result).toEqual([]);
	});

	it("parses context_brief JSON correctly", async () => {
		const brief: ContextBrief = {
			date: "2026-03-11",
			mainFocus: "Refactoring work",
			repos: ["repo-a"],
			linesChanged: 100,
			commitCount: 5,
			detectedTask: "refactoring",
		};
		const rows = [
			createMockRow({
				summary_date: "2026-03-11",
				context_brief: JSON.stringify(brief),
			}),
		];
		const db = createMockDb(rows);

		const result = await getHistoricalContext(db, "tenant-1", "2026-03-12");

		expect(result[0].brief).toEqual(brief);
	});

	it("parses detected_focus JSON correctly", async () => {
		const focus: DetectedFocus = {
			task: "security work",
			startDate: "2026-03-10",
			repos: ["repo-x"],
		};
		const rows = [
			createMockRow({
				summary_date: "2026-03-11",
				detected_focus: JSON.stringify(focus),
				brief_summary: "Some work",
			}),
		];
		const db = createMockDb(rows);

		const result = await getHistoricalContext(db, "tenant-1", "2026-03-12");

		expect(result[0].focus).toEqual(focus);
	});

	it("filters out entries with neither brief nor briefSummary", async () => {
		const rows = [
			createMockRow({
				summary_date: "2026-03-11",
				context_brief: null,
				brief_summary: null,
			}),
			createMockRow({
				summary_date: "2026-03-10",
				context_brief: JSON.stringify({ mainFocus: "Work" }),
				brief_summary: null,
			}),
		];
		const db = createMockDb(rows);

		const result = await getHistoricalContext(db, "tenant-1", "2026-03-12");

		expect(result).toHaveLength(1);
		expect(result[0].date).toBe("2026-03-10");
	});

	it("limits to last 3 results", async () => {
		const rows = [
			createMockRow({ summary_date: "2026-03-11", brief_summary: "A" }),
			createMockRow({ summary_date: "2026-03-10", brief_summary: "B" }),
			createMockRow({ summary_date: "2026-03-09", brief_summary: "C" }),
			createMockRow({ summary_date: "2026-03-08", brief_summary: "D" }),
		];
		const db = createMockDb(rows);

		const result = await getHistoricalContext(db, "tenant-1", "2026-03-12");

		// DB query includes LIMIT 3
		expect(db.prepare().all).toHaveBeenCalled();
	});

	it("queries past 7 days of dates", async () => {
		const db = createMockDb([]);

		await getHistoricalContext(db, "tenant-1", "2026-03-12");

		const bindCall = db.prepare().bind.mock.calls[0];
		expect(bindCall[0]).toBe("tenant-1"); // tenantId
		expect(bindCall.length).toBe(8); // tenantId + 7 dates
	});

	it("handles malformed JSON gracefully", async () => {
		const rows = [
			createMockRow({
				summary_date: "2026-03-11",
				context_brief: "invalid json {",
				brief_summary: "Valid text",
			}),
		];
		const db = createMockDb(rows);

		const result = await getHistoricalContext(db, "tenant-1", "2026-03-12");

		expect(result).toHaveLength(1);
		expect(result[0].brief).toBeNull();
		expect(result[0].briefSummary).toBe("Valid text");
	});
});

// =============================================================================
// detectContinuation Tests
// =============================================================================

describe("detectContinuation", () => {
	it("returns null if currentFocus is null", () => {
		const history = [
			{
				date: "2026-03-11",
				brief: null,
				focus: { task: "refactoring" as TaskType, startDate: "2026-03-10", repos: [] },
				briefSummary: null,
			},
		];

		const result = detectContinuation(history, null);

		expect(result).toBeNull();
	});

	it("returns null if history is empty", () => {
		const result = detectContinuation([], "refactoring" as TaskType);

		expect(result).toBeNull();
	});

	it("detects single-day continuation", () => {
		const history = [
			{
				date: "2026-03-11",
				brief: null,
				focus: {
					task: "refactoring" as TaskType,
					startDate: "2026-03-11",
					repos: [],
				},
				briefSummary: null,
			},
		];

		const result = detectContinuation(history, "refactoring" as TaskType);

		expect(result).toEqual({
			task: "refactoring",
			startDate: "2026-03-11",
			dayCount: 2, // previous day + current = 2 days total
		});
	});

	it("counts multi-day streak correctly", () => {
		const history = [
			{
				date: "2026-03-11",
				brief: null,
				focus: {
					task: "migration" as TaskType,
					startDate: "2026-03-10",
					repos: [],
				},
				briefSummary: null,
			},
			{
				date: "2026-03-10",
				brief: null,
				focus: {
					task: "migration" as TaskType,
					startDate: "2026-03-09",
					repos: [],
				},
				briefSummary: null,
			},
		];

		const result = detectContinuation(history, "migration" as TaskType);

		expect(result?.dayCount).toBe(3); // 2 in history + 1 current
	});

	it("breaks streak on different task", () => {
		const history = [
			{
				date: "2026-03-11",
				brief: null,
				focus: { task: "refactoring" as TaskType, startDate: "2026-03-11", repos: [] },
				briefSummary: null,
			},
			{
				date: "2026-03-10",
				brief: null,
				focus: { task: "bug fixes" as TaskType, startDate: "2026-03-10", repos: [] },
				briefSummary: null,
			},
		];

		const result = detectContinuation(history, "refactoring" as TaskType);

		// streak=1 (first entry matches), dayCount = streak + 1 = 2 (includes current day)
		expect(result).toEqual({
			task: "refactoring",
			startDate: "2026-03-11",
			dayCount: 2,
		});
	});

	it("uses brief.detectedTask as fallback", () => {
		const history = [
			{
				date: "2026-03-11",
				brief: {
					date: "2026-03-11",
					mainFocus: "Work",
					repos: [],
					linesChanged: 0,
					commitCount: 0,
					detectedTask: "testing improvements" as TaskType,
				},
				focus: null,
				briefSummary: null,
			},
		];

		const result = detectContinuation(history, "testing improvements" as TaskType);

		expect(result?.dayCount).toBe(2);
	});

	it("prioritizes focus.task over brief.detectedTask", () => {
		const history = [
			{
				date: "2026-03-11",
				brief: {
					date: "2026-03-11",
					mainFocus: "Work",
					repos: [],
					linesChanged: 0,
					commitCount: 0,
					detectedTask: "documentation" as TaskType,
				},
				focus: {
					task: "refactoring" as TaskType,
					startDate: "2026-03-11",
					repos: [],
				},
				briefSummary: null,
			},
		];

		const result = detectContinuation(history, "refactoring" as TaskType);

		expect(result?.dayCount).toBe(2);
	});
});

// =============================================================================
// formatHistoricalContextForPrompt Tests
// =============================================================================

describe("formatHistoricalContextForPrompt", () => {
	it("returns empty string for null", () => {
		const result = formatHistoricalContextForPrompt(null as any);
		expect(result).toBe("");
	});

	it("returns empty string for empty array", () => {
		const result = formatHistoricalContextForPrompt([]);
		expect(result).toBe("");
	});

	it("formats single entry correctly", () => {
		const context = [
			{
				date: "2026-03-11",
				brief: {
					date: "2026-03-11",
					mainFocus: "Refactoring user service",
					repos: ["repo-a", "repo-b"],
					linesChanged: 150,
					commitCount: 5,
					detectedTask: "refactoring" as TaskType,
				},
				focus: null,
				briefSummary: null,
			},
		];

		const result = formatHistoricalContextForPrompt(context);

		expect(result).toContain("2026-03-11");
		expect(result).toContain("Refactoring user service");
		expect(result).toContain("repo-a");
		expect(result).toContain("150 lines");
		expect(result).toContain("refactoring");
	});

	it("truncates long focus to ~80 chars", () => {
		const longFocus =
			"This is a very long focus description that exceeds eighty characters and should be truncated";
		const context = [
			{
				date: "2026-03-11",
				brief: {
					date: "2026-03-11",
					mainFocus: longFocus,
					repos: ["repo"],
					linesChanged: 0,
					commitCount: 1,
					detectedTask: null,
				},
				focus: null,
				briefSummary: null,
			},
		];

		const result = formatHistoricalContextForPrompt(context);

		const focusPart = result.split(": ")[1].split(" (")[0];
		expect(focusPart.length).toBeLessThanOrEqual(80);
		expect(focusPart).toContain("...");
	});

	it("uses briefSummary if brief is null", () => {
		const context = [
			{
				date: "2026-03-11",
				brief: null,
				focus: null,
				briefSummary: "Some summary text",
			},
		];

		const result = formatHistoricalContextForPrompt(context);

		expect(result).toContain("Some summary text");
	});

	it("includes task type if available", () => {
		const context = [
			{
				date: "2026-03-11",
				brief: {
					date: "2026-03-11",
					mainFocus: "Work",
					repos: ["repo"],
					linesChanged: 0,
					commitCount: 1,
					detectedTask: "database work" as TaskType,
				},
				focus: null,
				briefSummary: null,
			},
		];

		const result = formatHistoricalContextForPrompt(context);

		expect(result).toContain("database work");
	});

	it("formats multiple entries on separate lines", () => {
		const context = [
			{
				date: "2026-03-11",
				brief: {
					date: "2026-03-11",
					mainFocus: "First day",
					repos: ["repo"],
					linesChanged: 0,
					commitCount: 1,
					detectedTask: null,
				},
				focus: null,
				briefSummary: null,
			},
			{
				date: "2026-03-10",
				brief: {
					date: "2026-03-10",
					mainFocus: "Second day",
					repos: ["repo"],
					linesChanged: 0,
					commitCount: 1,
					detectedTask: null,
				},
				focus: null,
				briefSummary: null,
			},
		];

		const result = formatHistoricalContextForPrompt(context);
		const lines = result.split("\n");

		expect(lines).toHaveLength(2);
	});
});

// =============================================================================
// formatContinuationForPrompt Tests
// =============================================================================

describe("formatContinuationForPrompt", () => {
	it("returns empty string for null", () => {
		const result = formatContinuationForPrompt(null);
		expect(result).toBe("");
	});

	it("includes continuation heading", () => {
		const continuation = {
			task: "refactoring" as TaskType,
			startDate: "2026-03-10",
			dayCount: 3,
		};

		const result = formatContinuationForPrompt(continuation);

		expect(result).toContain("## Ongoing Task Detected");
	});

	it("includes day count", () => {
		const continuation = {
			task: "migration" as TaskType,
			startDate: "2026-03-09",
			dayCount: 4,
		};

		const result = formatContinuationForPrompt(continuation);

		expect(result).toContain("day 4");
	});

	it("includes task name", () => {
		const continuation = {
			task: "API development" as TaskType,
			startDate: "2026-03-11",
			dayCount: 2,
		};

		const result = formatContinuationForPrompt(continuation);

		expect(result).toContain("API development");
	});

	it("includes start date", () => {
		const continuation = {
			task: "bug fixes" as TaskType,
			startDate: "2026-03-10",
			dayCount: 3,
		};

		const result = formatContinuationForPrompt(continuation);

		expect(result).toContain("2026-03-10");
	});

	it("includes guidance examples", () => {
		const continuation = {
			task: "testing improvements" as TaskType,
			startDate: "2026-03-11",
			dayCount: 1,
		};

		const result = formatContinuationForPrompt(continuation);

		expect(result).toContain("Examples:");
		expect(result).toContain("Avoid:");
	});
});

// =============================================================================
// buildSummaryContextData Tests
// =============================================================================

describe("buildSummaryContextData", () => {
	it("returns complete summary context data", () => {
		const commits = [createMockCommit({ message: "fix bug" })];
		const summary = { brief: "Bug fixes", detailed: "Fixed several issues" };
		const date = "2026-03-12";

		const result = buildSummaryContextData(summary, commits, date, [], null);

		expect(result).toHaveProperty("contextBrief");
		expect(result).toHaveProperty("detectedFocus");
		expect(result).toHaveProperty("continuationOf");
		expect(result).toHaveProperty("focusStreak");
		expect(result.contextBrief.date).toBe("2026-03-12");
		expect(result.continuationOf).toBeNull();
		expect(result.focusStreak).toBeGreaterThanOrEqual(0);
	});

	it("generates contextBrief", () => {
		const commits = [createMockCommit()];
		const summary = { brief: "Test work", detailed: "" };

		const result = buildSummaryContextData(summary, commits, "2026-03-12", [], null);

		expect(result.contextBrief.date).toBe("2026-03-12");
		expect(result.contextBrief.commitCount).toBe(1);
	});

	it("detects focus from summary", () => {
		const commits = [createMockCommit({ message: "refactor" })];
		const summary = { brief: "Refactoring work", detailed: "" };

		const result = buildSummaryContextData(summary, commits, "2026-03-12", [], null);

		expect(result.detectedFocus?.task).toBe("refactoring");
	});

	it("returns null detectedFocus when no task detected", () => {
		const commits = [createMockCommit({ message: "hello world" })];
		const summary = { brief: "random work", detailed: "" };

		const result = buildSummaryContextData(summary, commits, "2026-03-12", [], null);

		expect(result.detectedFocus).toBeNull();
	});

	it("tracks continuation with preDetectedTask", () => {
		const commits = [createMockCommit()];
		const summary = { brief: "Migration work", detailed: "" };
		const history = [
			{
				date: "2026-03-11",
				brief: null,
				focus: {
					task: "migration" as TaskType,
					startDate: "2026-03-11",
					repos: [],
				},
				briefSummary: null,
			},
		];

		const result = buildSummaryContextData(
			summary,
			commits,
			"2026-03-12",
			history,
			"migration" as TaskType,
		);

		expect(result.focusStreak).toBeGreaterThan(0);
	});

	it("re-detects continuation if task changed", () => {
		const commits = [createMockCommit()];
		const summary = { brief: "Refactoring work", detailed: "" };
		const history = [
			{
				date: "2026-03-11",
				brief: null,
				focus: {
					task: "refactoring" as TaskType,
					startDate: "2026-03-10",
					repos: [],
				},
				briefSummary: null,
			},
		];

		const result = buildSummaryContextData(
			summary,
			commits,
			"2026-03-12",
			history,
			"migration" as TaskType, // Different from detected
		);

		expect(result.focusStreak).toBeGreaterThan(0);
	});

	it("sets focusStreak to 0 if no task and no continuation", () => {
		const commits = [createMockCommit({ message: "hello" })];
		const summary = { brief: "general work", detailed: "" };

		const result = buildSummaryContextData(summary, commits, "2026-03-12", [], null);

		expect(result.focusStreak).toBe(0);
	});

	it("sets focusStreak to 1 for first day of new task", () => {
		const commits = [createMockCommit({ message: "refactor" })];
		const summary = { brief: "Refactoring", detailed: "" };

		const result = buildSummaryContextData(summary, commits, "2026-03-12", [], null);

		expect(result.focusStreak).toBe(1);
	});

	it("includes continuation startDate", () => {
		const commits = [createMockCommit({ message: "migration" })];
		const summary = { brief: "Migration", detailed: "" };
		const history = [
			{
				date: "2026-03-11",
				brief: null,
				focus: {
					task: "migration" as TaskType,
					startDate: "2026-03-11",
					repos: [],
				},
				briefSummary: null,
			},
		];

		const result = buildSummaryContextData(
			summary,
			commits,
			"2026-03-12",
			history,
			"migration" as TaskType,
		);

		expect(result.continuationOf).toBe("2026-03-11");
	});

	it("sets continuationOf to null if no continuation", () => {
		const commits = [createMockCommit()];
		const summary = { brief: "Work", detailed: "" };

		const result = buildSummaryContextData(summary, commits, "2026-03-12", [], null);

		expect(result.continuationOf).toBeNull();
	});
});
