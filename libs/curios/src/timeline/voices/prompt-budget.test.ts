/**
 * Voice Presets - Input Budget Tests
 *
 * Lumen refuses any request whose serialized input exceeds MAX_INPUT_LENGTH
 * (300,000 characters) before a model is ever chosen. On 2026-11-15 a
 * 183-commit day sent ~116k characters of commit messages — almost all of it
 * squash-merge bodies — past the 100k wall of the day, and the nightly run died
 * with no summary written. Raising maxTokens could not have helped: the request
 * never reached a model.
 */

import { describe, it, expect } from "vitest";
import { condenseCommitsForPrompt, COMMIT_LIST_BUDGET_CHARS } from "./budget";
import { buildVoicedPrompt, VOICE_PRESETS } from "./index";
import type { Commit } from "./types";

function makeCommit(overrides: Partial<Commit> = {}): Commit {
	return {
		sha: "abc123",
		repo: "Lattice",
		message: "fix: tighten the response parser",
		timestamp: "2026-11-15T10:00:00Z",
		additions: 12,
		deletions: 3,
		...overrides,
	};
}

/** A commit shaped like the ones that caused the blowup: a short subject, a long body. */
function heavyCommit(index: number, repo = "Lattice"): Commit {
	const body = `Full PR description for change ${index}. `.repeat(40);
	return makeCommit({
		sha: `sha${index}`,
		repo,
		message: `feat(${repo}): land change ${index}\n\n${body}`,
	});
}

/** Same rendering every preset uses, so the assertion matches the real prompt. */
function renderedCommitList(commits: Commit[]): string {
	return commits
		.map((c, i) => `${i + 1}. [${c.repo}] ${c.message} (+${c.additions}/-${c.deletions})`)
		.join("\n");
}

describe("condenseCommitsForPrompt", () => {
	it("leaves a small day untouched", () => {
		const commits = [makeCommit(), makeCommit({ sha: "def456" })];
		const result = condenseCommitsForPrompt(commits);
		expect(result.note).toBeNull();
		expect(result.commits).toEqual(commits);
	});

	it("keeps an empty day empty", () => {
		expect(condenseCommitsForPrompt([])).toEqual({ commits: [], note: null });
	});

	it("drops commit bodies to fit the budget", () => {
		// ~200 heavy commits well past the budget when rendered with bodies.
		const commits = Array.from({ length: 200 }, (_, i) => heavyCommit(i));
		expect(renderedCommitList(commits).length).toBeGreaterThan(COMMIT_LIST_BUDGET_CHARS);

		const result = condenseCommitsForPrompt(commits);

		expect(result.note).toBeNull();
		expect(result.commits).toHaveLength(200);
		expect(renderedCommitList(result.commits).length).toBeLessThanOrEqual(COMMIT_LIST_BUDGET_CHARS);
		// Subjects survive; bodies do not.
		expect(result.commits[7].message).toBe("feat(Lattice): land change 7");
	});

	it("keeps the real 2026-11-15 shape under the wall", () => {
		// 183 commits whose messages average ~630 chars, the measured shape.
		const commits = Array.from({ length: 183 }, (_, i) => heavyCommit(i));
		const full = renderedCommitList(commits).length;
		expect(full).toBeGreaterThan(100_000);

		const { commits: condensed, note } = condenseCommitsForPrompt(commits);
		expect(note).toBeNull();
		expect(renderedCommitList(condensed).length).toBeLessThan(20_000);
	});

	it("lists a 600-commit day by name under the default budget", () => {
		// The point of 120k: a day ten times the 11-15 size still names every commit.
		const commits = Array.from({ length: 600 }, (_, i) => heavyCommit(i));
		const { commits: condensed, note } = condenseCommitsForPrompt(commits);

		expect(note).toBeNull();
		expect(condensed).toHaveLength(600);
		expect(condensed[599].message).toBe("feat(Lattice): land change 599");
		expect(renderedCommitList(condensed).length).toBeLessThanOrEqual(COMMIT_LIST_BUDGET_CHARS);
	});

	it("states the overflow when even subject lines do not fit", () => {
		const commits = Array.from({ length: 2_000 }, (_, i) => heavyCommit(i));
		const result = condenseCommitsForPrompt(commits, 4_000);

		expect(result.commits.length).toBeLessThan(2_000);
		expect(renderedCommitList(result.commits).length).toBeLessThanOrEqual(4_000);
		expect(result.note).toContain("2000-commit day");
		expect(result.note).toContain(`Lattice: ${2_000 - result.commits.length}`);
	});

	it("truncates runaway subject lines", () => {
		const commits = [makeCommit({ message: `chore: ${"x".repeat(400)}` })];
		const result = condenseCommitsForPrompt(commits, 50);
		expect(result.commits[0].message.length).toBeLessThanOrEqual(120);
		expect(result.note).not.toBeNull();
	});
});

describe("buildVoicedPrompt input budget", () => {
	it("keeps every preset under Lumen's input wall on a heavy day", () => {
		const commits = Array.from({ length: 183 }, (_, i) =>
			heavyCommit(i, i % 2 ? "outpost" : "Lattice"),
		);

		for (const id of Object.keys(VOICE_PRESETS)) {
			const { systemPrompt, userPrompt } = buildVoicedPrompt(id, commits, "2026-11-15", "Autumn");
			const serialized = JSON.stringify([
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt },
			]);
			expect(serialized.length, `${id} would be rejected by Lumen`).toBeLessThan(300_000);
		}
	});

	it("tells the model when the list was shortened", () => {
		// 5,000 subject lines is past the 120k budget, so the note has to appear.
		const commits = Array.from({ length: 5_000 }, (_, i) => heavyCommit(i));
		const { userPrompt } = buildVoicedPrompt("professional", commits, "2026-11-15", "Autumn");
		expect(userPrompt).toContain("shortened to fit");
		expect(userPrompt).toContain("5000-commit day");
		// The note lands before the instructions, not after them.
		expect(userPrompt.indexOf("shortened to fit")).toBeLessThan(
			userPrompt.indexOf("GENERATE THREE OUTPUTS"),
		);
	});

	it("does not add a note on an ordinary day", () => {
		const commits = [makeCommit(), makeCommit({ sha: "def456", repo: "outpost" })];
		const { userPrompt } = buildVoicedPrompt("professional", commits, "2026-11-15", "Autumn");
		expect(userPrompt).not.toContain("shortened to fit");
	});
});
