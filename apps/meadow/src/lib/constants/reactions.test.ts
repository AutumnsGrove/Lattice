/**
 * Reaction Constants Tests
 *
 * Tests the emoji allowlist and O(1) validation guard.
 */

import { describe, it, expect } from "vitest";
import { MEADOW_REACTIONS, isValidReaction } from "./reactions";

describe("MEADOW_REACTIONS", () => {
	it("should contain exactly 10 reactions", () => {
		expect(MEADOW_REACTIONS).toHaveLength(10);
	});

	it("should have emoji and label for each reaction", () => {
		for (const r of MEADOW_REACTIONS) {
			expect(typeof r.emoji).toBe("string");
			expect(r.emoji.length).toBeGreaterThan(0);
			expect(typeof r.label).toBe("string");
			expect(r.label.length).toBeGreaterThan(0);
		}
	});

	it("should have no duplicate emojis", () => {
		const emojis = MEADOW_REACTIONS.map((r) => r.emoji);
		expect(new Set(emojis).size).toBe(emojis.length);
	});
});

describe("isValidReaction", () => {
	it("should accept all listed emojis", () => {
		for (const r of MEADOW_REACTIONS) {
			expect(isValidReaction(r.emoji)).toBe(true);
		}
	});

	it("should reject unlisted emojis", () => {
		expect(isValidReaction("👎")).toBe(false);
		expect(isValidReaction("😡")).toBe(false);
		expect(isValidReaction("💀")).toBe(false);
	});

	it("should reject empty string", () => {
		expect(isValidReaction("")).toBe(false);
	});

	it("should reject random text", () => {
		expect(isValidReaction("love")).toBe(false);
		expect(isValidReaction("heart")).toBe(false);
	});
});
