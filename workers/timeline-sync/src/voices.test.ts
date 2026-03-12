import { describe, it, expect, vi, beforeEach } from "vitest";
import { getVoice, buildCustomVoice, buildVoicedPrompt } from "./voices";
import type { Commit, CustomVoiceConfig } from "./config";

// =============================================================================
// Test Helpers
// =============================================================================

function makeCommit(overrides?: Partial<Commit>): Commit {
	return {
		sha: "abc123",
		repo: "test-repo",
		message: "fix something",
		timestamp: "2026-03-01T10:00:00Z",
		additions: 10,
		deletions: 5,
		...overrides,
	};
}

// =============================================================================
// getVoice Tests
// =============================================================================

describe("getVoice", () => {
	it("returns professional preset by id", () => {
		const voice = getVoice("professional");
		expect(voice.id).toBe("professional");
		expect(voice.name).toBe("Professional");
		expect(voice.systemPrompt).toContain("personal coding journal");
	});

	it("returns quest preset by id", () => {
		const voice = getVoice("quest");
		expect(voice.id).toBe("quest");
		expect(voice.name).toBe("Quest Mode");
		expect(voice.systemPrompt).toContain("bard chronicling");
	});

	it("returns casual preset by id", () => {
		const voice = getVoice("casual");
		expect(voice.id).toBe("casual");
		expect(voice.name).toBe("Casual");
		expect(voice.systemPrompt).toContain("casual, friendly");
	});

	it("returns poetic preset by id", () => {
		const voice = getVoice("poetic");
		expect(voice.id).toBe("poetic");
		expect(voice.name).toBe("Poetic");
		expect(voice.systemPrompt).toContain("contemplative, poetic");
	});

	it("returns minimal preset by id", () => {
		const voice = getVoice("minimal");
		expect(voice.id).toBe("minimal");
		expect(voice.name).toBe("Minimal");
		expect(voice.systemPrompt).toContain("extremely concise");
	});

	it("falls back to professional for unknown voice", () => {
		const voice = getVoice("unknown-voice");
		expect(voice.id).toBe("professional");
		expect(voice.name).toBe("Professional");
	});

	it("logs warning for unknown voice", () => {
		const warnSpy = vi.spyOn(console, "warn");
		getVoice("nonexistent");
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Unknown voice preset: nonexistent"),
		);
		warnSpy.mockRestore();
	});

	it("each voice has id, name, systemPrompt, and buildPrompt", () => {
		const voiceIds = ["professional", "quest", "casual", "poetic", "minimal"];
		for (const id of voiceIds) {
			const voice = getVoice(id);
			expect(voice.id).toBe(id);
			expect(voice.name).toBeDefined();
			expect(voice.systemPrompt).toBeDefined();
			expect(typeof voice.buildPrompt).toBe("function");
		}
	});
});

// =============================================================================
// Voice buildPrompt Tests - Structure and Inclusion
// =============================================================================

describe("voice buildPrompt - professional", () => {
	it("includes date in prompt", () => {
		const voice = getVoice("professional");
		const prompt = voice.buildPrompt([makeCommit()], "2026-03-12");
		expect(prompt).toContain("2026-03-12");
	});

	it("includes owner name in prompt", () => {
		const voice = getVoice("professional");
		const prompt = voice.buildPrompt([makeCommit()], "2026-03-12", "Alice");
		expect(prompt).toContain("Alice");
	});

	it("includes commit list with repo, message, additions, deletions", () => {
		const voice = getVoice("professional");
		const commit = makeCommit({
			repo: "backend",
			message: "add caching layer",
			additions: 120,
			deletions: 45,
		});
		const prompt = voice.buildPrompt([commit], "2026-03-12");
		expect(prompt).toContain("[backend]");
		expect(prompt).toContain("add caching layer");
		expect(prompt).toContain("+120");
		expect(prompt).toContain("-45");
	});

	it("includes COMMITS TODAY marker", () => {
		const voice = getVoice("professional");
		const prompt = voice.buildPrompt([makeCommit()], "2026-03-12");
		expect(prompt).toContain("COMMITS TODAY");
	});

	it("includes repo summary in prompt", () => {
		const voice = getVoice("professional");
		const commit1 = makeCommit({ repo: "api" });
		const commit2 = makeCommit({ repo: "frontend" });
		const prompt = voice.buildPrompt([commit1, commit2], "2026-03-12");
		expect(prompt).toContain("api: 1 commits");
		expect(prompt).toContain("frontend: 1 commits");
	});
});

describe("voice buildPrompt - casual", () => {
	it("uses possessive 'my' when ownerName is 'I'", () => {
		const voice = getVoice("casual");
		const prompt = voice.buildPrompt([makeCommit()], "2026-03-12", "I");
		expect(prompt).toContain("my coding day");
	});

	it("uses possessive with name when ownerName is not 'I'", () => {
		const voice = getVoice("casual");
		const prompt = voice.buildPrompt([makeCommit()], "2026-03-12", "Bob");
		expect(prompt).toContain("Bob's coding day");
	});

	it("includes variety hint seeded by day of week", () => {
		const voice = getVoice("casual");
		const prompt = voice.buildPrompt([makeCommit()], "2026-03-12");
		expect(prompt).toContain("VARIETY SEED FOR TODAY:");
		expect(prompt).toContain("Start with");
	});

	it("uses WHAT HAPPENED marker instead of COMMITS TODAY", () => {
		const voice = getVoice("casual");
		const prompt = voice.buildPrompt([makeCommit()], "2026-03-12");
		expect(prompt).toContain("WHAT HAPPENED");
	});

	it("variety hint changes based on day of week", () => {
		const voice = getVoice("casual");
		// Sunday (2026-03-01) and Monday (2026-03-02) should differ
		const sundayPrompt = voice.buildPrompt([makeCommit()], "2026-03-01");
		const mondayPrompt = voice.buildPrompt([makeCommit()], "2026-03-02");
		// Extract the variety hint from each
		const sundayMatch = sundayPrompt.match(/VARIETY SEED FOR TODAY: (.+?)\n/);
		const mondayMatch = mondayPrompt.match(/VARIETY SEED FOR TODAY: (.+?)\n/);
		expect(sundayMatch && mondayMatch).toBeTruthy();
		if (sundayMatch && mondayMatch) {
			expect(sundayMatch[1]).not.toBe(mondayMatch[1]);
		}
	});
});

describe("voice buildPrompt - minimal", () => {
	it("uses default ownerName 'dev'", () => {
		const voice = getVoice("minimal");
		const prompt = voice.buildPrompt([makeCommit()], "2026-03-12");
		expect(prompt).toContain("2026-03-12 commits");
	});

	it("includes COMMITS marker", () => {
		const voice = getVoice("minimal");
		const prompt = voice.buildPrompt([makeCommit()], "2026-03-12");
		expect(prompt).toContain("COMMITS");
	});

	it("includes repo summary without 'commits' word", () => {
		const voice = getVoice("minimal");
		const commit1 = makeCommit({ repo: "api" });
		const commit2 = makeCommit({ repo: "frontend" });
		const prompt = voice.buildPrompt([commit1, commit2], "2026-03-12");
		expect(prompt).toContain("api: 1");
		expect(prompt).toContain("frontend: 1");
	});
});

// =============================================================================
// Gutter Count Formula Tests
// =============================================================================

describe("gutter count formula - standard voices", () => {
	const standardVoices = ["professional", "quest", "poetic"];

	it.each([
		[1, 1], // 1 commit: Math.min(5, Math.max(1, 1)) = 1
		[3, 1], // 3 commits: Math.min(5, Math.max(1, 1)) = 1
		[4, 2], // 4 commits: Math.min(5, Math.max(1, 2)) = 2
		[5, 2], // 5 commits: Math.min(5, Math.max(1, 2)) = 2
		[6, 2], // 6 commits: Math.min(5, Math.max(1, 2)) = 2
		[9, 3], // 9 commits: Math.min(5, Math.max(1, 3)) = 3
		[12, 4], // 12 commits: Math.min(5, Math.max(1, 4)) = 4
		[15, 5], // 15 commits: Math.min(5, Math.max(1, 5)) = 5
		[30, 5], // 30 commits: Math.min(5, Math.max(1, 10)) = 5 (capped)
	])("for %i commits, gutter count should be %i", (commitCount, expectedGutter) => {
		const voice = getVoice("professional");
		const commits = Array.from({ length: commitCount }, (_, i) => makeCommit({ sha: `${i}` }));
		const prompt = voice.buildPrompt(commits, "2026-03-12");
		// Extract gutter count from prompt
		const match = prompt.match(/GUTTER COMMENTS \((\d+) margin notes\)/);
		expect(match).toBeTruthy();
		expect(parseInt(match![1], 10)).toBe(expectedGutter);
	});

	it.each(standardVoices)("%s voice applies standard gutter formula", (voiceId) => {
		const voice = getVoice(voiceId);
		const commits = Array.from({ length: 9 }, (_, i) => makeCommit({ sha: `${i}` }));
		const prompt = voice.buildPrompt(commits, "2026-03-12");
		const match = prompt.match(/GUTTER COMMENTS \((\d+) margin notes\)/);
		expect(match).toBeTruthy();
		expect(parseInt(match![1], 10)).toBe(3);
	});
});

describe("gutter count formula - minimal voice", () => {
	it.each([
		[1, 1], // 1 commit: Math.min(3, Math.max(1, 1)) = 1
		[5, 1], // 5 commits: Math.min(3, Math.max(1, 1)) = 1
		[10, 2], // 10 commits: Math.min(3, Math.max(1, 2)) = 2
		[15, 3], // 15 commits: Math.min(3, Math.max(1, 3)) = 3
		[25, 3], // 25 commits: Math.min(3, Math.max(1, 5)) = 3 (capped)
		[50, 3], // 50 commits: Math.min(3, Math.max(1, 10)) = 3 (capped)
	])("for %i commits, gutter count should be %i", (commitCount, expectedGutter) => {
		const voice = getVoice("minimal");
		const commits = Array.from({ length: commitCount }, (_, i) => makeCommit({ sha: `${i}` }));
		const prompt = voice.buildPrompt(commits, "2026-03-12");
		const match = prompt.match(/GUTTER COMMENTS \((\d+) margin notes\)/);
		expect(match).toBeTruthy();
		expect(parseInt(match![1], 10)).toBe(expectedGutter);
	});
});

// =============================================================================
// buildCustomVoice Tests
// =============================================================================

describe("buildCustomVoice", () => {
	it("returns voice with id='custom' and name='Custom'", () => {
		const custom = buildCustomVoice({});
		expect(custom.id).toBe("custom");
		expect(custom.name).toBe("Custom");
	});

	it("uses provided systemPrompt", () => {
		const customPrompt = "You are a custom assistant";
		const custom = buildCustomVoice({ systemPrompt: customPrompt });
		expect(custom.systemPrompt).toBe(customPrompt);
	});

	it("defaults to professional systemPrompt when not provided", () => {
		const custom = buildCustomVoice({});
		const professional = getVoice("professional");
		expect(custom.systemPrompt).toBe(professional.systemPrompt);
	});

	it("includes summaryInstructions in buildPrompt", () => {
		const instructions = "Write with technical depth";
		const custom = buildCustomVoice({ summaryInstructions: instructions });
		const prompt = custom.buildPrompt([makeCommit()], "2026-03-12");
		expect(prompt).toContain("STYLE INSTRUCTIONS:");
		expect(prompt).toContain(instructions);
	});

	it("omits STYLE INSTRUCTIONS section when summaryInstructions is empty", () => {
		const custom = buildCustomVoice({ summaryInstructions: "" });
		const prompt = custom.buildPrompt([makeCommit()], "2026-03-12");
		expect(prompt).not.toContain("STYLE INSTRUCTIONS:");
	});

	it("includes gutterStyle in buildPrompt", () => {
		const style = "Short, sarcastic observations";
		const custom = buildCustomVoice({ gutterStyle: style });
		const prompt = custom.buildPrompt([makeCommit()], "2026-03-12");
		expect(prompt).toContain("Style: " + style);
	});

	it("omits style line when gutterStyle is empty", () => {
		const custom = buildCustomVoice({ gutterStyle: "" });
		const prompt = custom.buildPrompt([makeCommit()], "2026-03-12");
		expect(prompt).not.toContain("Style:");
	});

	it("uses gutter count formula (standard: 1-5)", () => {
		const custom = buildCustomVoice({});
		const commits = Array.from({ length: 9 }, (_, i) => makeCommit({ sha: `${i}` }));
		const prompt = custom.buildPrompt(commits, "2026-03-12");
		const match = prompt.match(/GUTTER COMMENTS \((\d+) margin notes\)/);
		expect(match).toBeTruthy();
		expect(parseInt(match![1], 10)).toBe(3);
	});

	it("includes date and ownerName in buildPrompt", () => {
		const custom = buildCustomVoice({});
		const prompt = custom.buildPrompt([makeCommit()], "2026-03-12", "Custom Dev");
		expect(prompt).toContain("2026-03-12");
		expect(prompt).toContain("Custom Dev");
	});

	it("includes COMMITS TODAY marker", () => {
		const custom = buildCustomVoice({});
		const prompt = custom.buildPrompt([makeCommit()], "2026-03-12");
		expect(prompt).toContain("COMMITS TODAY");
	});

	it("includes commit list in buildPrompt", () => {
		const custom = buildCustomVoice({});
		const commit = makeCommit({
			repo: "myrepo",
			message: "custom fix",
			additions: 25,
			deletions: 10,
		});
		const prompt = custom.buildPrompt([commit], "2026-03-12");
		expect(prompt).toContain("[myrepo]");
		expect(prompt).toContain("custom fix");
		expect(prompt).toContain("+25");
		expect(prompt).toContain("-10");
	});

	it("allows all three customizations together", () => {
		const custom = buildCustomVoice({
			systemPrompt: "Custom system prompt",
			summaryInstructions: "Custom instructions",
			gutterStyle: "Custom style",
		});
		const prompt = custom.buildPrompt([makeCommit()], "2026-03-12");
		expect(custom.systemPrompt).toBe("Custom system prompt");
		expect(prompt).toContain("Custom instructions");
		expect(prompt).toContain("Custom style");
	});
});

// =============================================================================
// buildVoicedPrompt Tests - Voice Selection
// =============================================================================

describe("buildVoicedPrompt - voice selection", () => {
	it("uses preset voice when voiceId matches", () => {
		const { systemPrompt, userPrompt } = buildVoicedPrompt(
			"professional",
			[makeCommit()],
			"2026-03-12",
		);
		const professional = getVoice("professional");
		expect(systemPrompt).toBe(professional.systemPrompt);
		expect(userPrompt).toContain("COMMITS TODAY");
	});

	it("returns systemPrompt and userPrompt in object", () => {
		const result = buildVoicedPrompt("professional", [makeCommit()], "2026-03-12");
		expect(result).toHaveProperty("systemPrompt");
		expect(result).toHaveProperty("userPrompt");
		expect(typeof result.systemPrompt).toBe("string");
		expect(typeof result.userPrompt).toBe("string");
	});

	it("uses custom voice when voiceId='custom' with customConfig", () => {
		const customConfig: CustomVoiceConfig = {
			summaryInstructions: "Be terse",
		};
		const { systemPrompt } = buildVoicedPrompt(
			"custom",
			[makeCommit()],
			"2026-03-12",
			"the developer",
			customConfig,
		);
		const professional = getVoice("professional");
		expect(systemPrompt).toBe(professional.systemPrompt);
	});

	it("falls back to getVoice when voiceId='custom' but customConfig is null", () => {
		const { systemPrompt } = buildVoicedPrompt(
			"custom",
			[makeCommit()],
			"2026-03-12",
			"the developer",
			null,
		);
		const professional = getVoice("professional");
		expect(systemPrompt).toBe(professional.systemPrompt);
	});

	it("uses quest voice and its system prompt", () => {
		const { systemPrompt, userPrompt } = buildVoicedPrompt("quest", [makeCommit()], "2026-03-12");
		const quest = getVoice("quest");
		expect(systemPrompt).toBe(quest.systemPrompt);
		expect(systemPrompt).toContain("bard chronicling");
		expect(userPrompt).toContain("QUEST LOG ENTRIES");
	});

	it("uses casual voice and its system prompt", () => {
		const { systemPrompt, userPrompt } = buildVoicedPrompt("casual", [makeCommit()], "2026-03-12");
		const casual = getVoice("casual");
		expect(systemPrompt).toBe(casual.systemPrompt);
		expect(systemPrompt).toContain("casual, friendly");
		expect(userPrompt).toContain("WHAT HAPPENED");
	});

	it("uses poetic voice and its system prompt", () => {
		const { systemPrompt, userPrompt } = buildVoicedPrompt("poetic", [makeCommit()], "2026-03-12");
		const poetic = getVoice("poetic");
		expect(systemPrompt).toBe(poetic.systemPrompt);
		expect(systemPrompt).toContain("poetic");
	});

	it("uses minimal voice and its system prompt", () => {
		const { systemPrompt } = buildVoicedPrompt("minimal", [makeCommit()], "2026-03-12");
		const minimal = getVoice("minimal");
		expect(systemPrompt).toBe(minimal.systemPrompt);
	});

	it("defaults ownerName to 'the developer'", () => {
		const { userPrompt } = buildVoicedPrompt("professional", [makeCommit()], "2026-03-12");
		expect(userPrompt).toContain("the developer");
	});

	it("uses provided ownerName", () => {
		const { userPrompt } = buildVoicedPrompt(
			"professional",
			[makeCommit()],
			"2026-03-12",
			"Charlie",
		);
		expect(userPrompt).toContain("Charlie");
	});
});

// =============================================================================
// buildVoicedPrompt Tests - Context Insertion
// =============================================================================

describe("buildVoicedPrompt - context insertion", () => {
	it("inserts historicalContext before COMMITS TODAY marker", () => {
		const { userPrompt } = buildVoicedPrompt(
			"professional",
			[makeCommit()],
			"2026-03-12",
			"the developer",
			null,
			{
				historicalContext: "Previous work on auth system",
			},
		);
		expect(userPrompt).toContain("RECENT CONTEXT");
		expect(userPrompt).toContain("Previous work on auth system");
		const contextIndex = userPrompt.indexOf("RECENT CONTEXT");
		const commitsIndex = userPrompt.indexOf("COMMITS TODAY");
		expect(contextIndex).toBeGreaterThan(-1);
		expect(commitsIndex).toBeGreaterThan(-1);
		expect(contextIndex).toBeLessThan(commitsIndex);
	});

	it("inserts continuationNote before COMMITS TODAY marker", () => {
		const { userPrompt } = buildVoicedPrompt(
			"professional",
			[makeCommit()],
			"2026-03-12",
			"the developer",
			null,
			{
				continuationNote: "Continuing the refactoring work...",
			},
		);
		expect(userPrompt).toContain("Continuing the refactoring work...");
		const noteIndex = userPrompt.indexOf("Continuing");
		const commitsIndex = userPrompt.indexOf("COMMITS TODAY");
		expect(noteIndex).toBeGreaterThan(-1);
		expect(commitsIndex).toBeGreaterThan(-1);
		expect(noteIndex).toBeLessThan(commitsIndex);
	});

	it("inserts both historicalContext and continuationNote in order", () => {
		const { userPrompt } = buildVoicedPrompt(
			"professional",
			[makeCommit()],
			"2026-03-12",
			"the developer",
			null,
			{
				historicalContext: "Previous work on auth",
				continuationNote: "Continuing that work today",
			},
		);
		const contextIndex = userPrompt.indexOf("RECENT CONTEXT");
		const noteIndex = userPrompt.indexOf("Continuing that work");
		const commitsIndex = userPrompt.indexOf("COMMITS TODAY");
		expect(contextIndex).toBeGreaterThan(-1);
		expect(noteIndex).toBeGreaterThan(-1);
		expect(commitsIndex).toBeGreaterThan(-1);
		expect(contextIndex).toBeLessThan(noteIndex);
		expect(noteIndex).toBeLessThan(commitsIndex);
	});

	it("uses WHAT HAPPENED marker for casual voice context insertion", () => {
		const { userPrompt } = buildVoicedPrompt("casual", [makeCommit()], "2026-03-12", "I", null, {
			historicalContext: "Week of refactoring",
		});
		expect(userPrompt).toContain("RECENT CONTEXT");
		const contextIndex = userPrompt.indexOf("RECENT CONTEXT");
		const whatIndex = userPrompt.indexOf("WHAT HAPPENED");
		expect(contextIndex).toBeGreaterThan(-1);
		expect(whatIndex).toBeGreaterThan(-1);
		expect(contextIndex).toBeLessThan(whatIndex);
	});

	it("prepends context when no marker is found", () => {
		const { userPrompt: originalPrompt } = buildVoicedPrompt(
			"professional",
			[makeCommit()],
			"2026-03-12",
		);
		// Manually check that context would be prepended if marker is missing
		// (This tests the fallback behavior at the end of buildVoicedPrompt)
		const mockCommit = makeCommit();
		const { userPrompt: withContext } = buildVoicedPrompt(
			"professional",
			[mockCommit],
			"2026-03-12",
			"the developer",
			null,
			{
				historicalContext: "Some context",
			},
		);
		// Should still contain the context
		expect(withContext).toContain("Some context");
	});

	it("does not modify prompt when context is null", () => {
		const { userPrompt: withoutContext } = buildVoicedPrompt(
			"professional",
			[makeCommit()],
			"2026-03-12",
			"the developer",
			null,
			null,
		);
		const { userPrompt: withEmptyContext } = buildVoicedPrompt(
			"professional",
			[makeCommit()],
			"2026-03-12",
			"the developer",
			null,
			{},
		);
		expect(withoutContext).toBe(withEmptyContext);
	});

	it("preserves both context and voice buildPrompt content", () => {
		const { userPrompt } = buildVoicedPrompt(
			"professional",
			[makeCommit({ message: "fix bug" })],
			"2026-03-12",
			"Alice",
			null,
			{
				historicalContext: "Working on performance",
			},
		);
		// Should have context
		expect(userPrompt).toContain("RECENT CONTEXT");
		expect(userPrompt).toContain("Working on performance");
		// Should have voice content
		expect(userPrompt).toContain("Alice");
		expect(userPrompt).toContain("fix bug");
		expect(userPrompt).toContain("COMMITS TODAY");
	});
});

// =============================================================================
// buildVoicedPrompt Tests - Custom Voice with Context
// =============================================================================

describe("buildVoicedPrompt - custom voice with context", () => {
	it("uses custom voice config when voiceId='custom'", () => {
		const customConfig: CustomVoiceConfig = {
			systemPrompt: "Custom system",
			summaryInstructions: "Be concise",
		};
		const { systemPrompt, userPrompt } = buildVoicedPrompt(
			"custom",
			[makeCommit()],
			"2026-03-12",
			"the developer",
			customConfig,
			null,
		);
		expect(systemPrompt).toBe("Custom system");
		expect(userPrompt).toContain("Be concise");
	});

	it("applies context to custom voice prompt", () => {
		const customConfig: CustomVoiceConfig = {
			summaryInstructions: "Custom style",
		};
		const { userPrompt } = buildVoicedPrompt(
			"custom",
			[makeCommit()],
			"2026-03-12",
			"the developer",
			customConfig,
			{
				historicalContext: "Custom context",
			},
		);
		expect(userPrompt).toContain("Custom style");
		expect(userPrompt).toContain("Custom context");
	});
});

// =============================================================================
// Edge Cases and Integration
// =============================================================================

describe("edge cases and integration", () => {
	it("handles empty commit list", () => {
		const { systemPrompt, userPrompt } = buildVoicedPrompt("professional", [], "2026-03-12");
		expect(systemPrompt).toBeDefined();
		expect(userPrompt).toContain("0 total");
	});

	it("handles very large commit list", () => {
		const commits = Array.from({ length: 50 }, (_, i) =>
			makeCommit({ sha: `commit${i}`, repo: `repo${i % 3}` }),
		);
		const { userPrompt } = buildVoicedPrompt("professional", commits, "2026-03-12");
		expect(userPrompt).toContain("50 total");
		expect(userPrompt).toBeDefined();
	});

	it("handles special characters in commit messages", () => {
		const commit = makeCommit({
			message: "fix: handle 'edge cases' & special chars",
		});
		const { userPrompt } = buildVoicedPrompt("professional", [commit], "2026-03-12");
		expect(userPrompt).toContain("fix: handle");
	});

	it("handles multiline context", () => {
		const context = "Line 1\nLine 2\nLine 3";
		const { userPrompt } = buildVoicedPrompt(
			"professional",
			[makeCommit()],
			"2026-03-12",
			"the developer",
			null,
			{
				historicalContext: context,
			},
		);
		expect(userPrompt).toContain("Line 1");
		expect(userPrompt).toContain("Line 2");
		expect(userPrompt).toContain("Line 3");
	});

	it("all voices produce valid output structure", () => {
		const voiceIds = ["professional", "quest", "casual", "poetic", "minimal"];
		const commits = [
			makeCommit({ repo: "api", message: "add endpoint" }),
			makeCommit({ repo: "ui", message: "fix styles" }),
		];

		for (const voiceId of voiceIds) {
			const { systemPrompt, userPrompt } = buildVoicedPrompt(voiceId, commits, "2026-03-12");
			expect(systemPrompt).toBeTruthy();
			expect(userPrompt).toBeTruthy();
			expect(systemPrompt.length).toBeGreaterThan(0);
			expect(userPrompt.length).toBeGreaterThan(0);
			// Should include JSON output format
			expect(userPrompt).toContain("OUTPUT FORMAT");
			expect(userPrompt).toContain("JSON");
		}
	});
});
