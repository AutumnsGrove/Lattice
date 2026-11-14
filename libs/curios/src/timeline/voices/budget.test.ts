/**
 * Voice Presets - Output Budget Tests
 *
 * The detailed section is the part that runs long, and the whole
 * brief+detailed+gutter JSON envelope has to fit inside the request's
 * maxTokens (8192). Every preset — custom included — has to carry the same
 * budget, or its heavy days get cut off mid-JSON and the caller stores a
 * fallback summary instead (2026-11-13).
 */

import { describe, it, expect } from "vitest";
import { VOICE_PRESETS, buildCustomVoice } from "./index";
import type { Commit } from "./types";

const commit: Commit = {
	sha: "abc123",
	repo: "Lattice",
	message: "fix: tighten the response parser",
	timestamp: "2026-11-13T10:00:00Z",
	additions: 12,
	deletions: 3,
};

function expectBudget(prompt: string, label = "prompt") {
	expect(prompt, `${label} is missing the project ceiling`).toContain("Cover at most 6 projects");
	expect(prompt, `${label} is missing the word ceiling`).toContain("under ~350 words");
	expect(prompt, `${label} is missing the bullet ceiling`).toContain("At most 5 bullets");
}

describe("voice presets carry the detailed-section budget", () => {
	for (const [id, voice] of Object.entries(VOICE_PRESETS)) {
		it(`${id} names the budget in its prompt`, () => {
			expectBudget(voice.buildPrompt([commit], "2026-11-13"));
		});
	}

	it("custom voice names the budget in its prompt", () => {
		const custom = buildCustomVoice({
			systemPrompt: "You write short entries.",
			summaryInstructions: "Keep it plain.",
		});
		expectBudget(custom.buildPrompt([commit], "2026-11-13"), "custom voice");
	});
});
