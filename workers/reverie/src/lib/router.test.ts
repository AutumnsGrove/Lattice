/**
 * Router Tests — Intent Detection Layer
 *
 * Tests the pure keyword matching logic that determines which domains
 * and action type to use for a given user input.
 */

import { describe, it, expect } from "vitest";
import { routeInput } from "./router";

describe("routeInput", () => {
	// ─── Atmosphere Detection ─────────────────────────────────────

	describe("atmosphere matching", () => {
		it("should match exact atmosphere keyword", () => {
			const result = routeInput("cozy");
			expect(result.action).toBe("atmosphere");
			expect(result.atmosphere).toBeDefined();
			expect(result.atmosphere?.keyword).toBe("cozy");
		});

		it("should match atmosphere keyword in a sentence", () => {
			const result = routeInput("make my site feel cozy");
			expect(result.action).toBe("atmosphere");
			expect(result.atmosphere?.keyword).toBe("cozy");
		});

		it("should match atmosphere aliases", () => {
			const result = routeInput("hygge");
			expect(result.action).toBe("atmosphere");
			expect(result.atmosphere?.keyword).toBe("cozy");
		});

		it("should match midnight atmosphere", () => {
			const result = routeInput("give it a midnight vibe");
			expect(result.action).toBe("atmosphere");
			expect(result.atmosphere?.keyword).toBe("midnight");
		});

		it("should be case-insensitive for atmospheres", () => {
			const result = routeInput("GOTHIC");
			expect(result.action).toBe("atmosphere");
			expect(result.atmosphere?.keyword).toBe("gothic");
		});

		it("should extract domains from atmosphere settings", () => {
			const result = routeInput("cozy");
			expect(result.domains.length).toBeGreaterThan(0);
		});
	});

	// ─── Domain Keyword Matching ─────────────────────────────────

	describe("domain keyword matching", () => {
		it("should match theme domain", () => {
			const result = routeInput("change the theme to something dark");
			expect(result.action).toBe("configure");
			expect(result.domains).toContain("foliage.theme");
			expect(result.keywords).toContain("theme");
		});

		it("should match cursor domain", () => {
			const result = routeInput("give me a sparkle cursor");
			expect(result.action).toBe("configure");
			expect(result.domains).toContain("curios.cursor");
		});

		it("should match profile domain", () => {
			// Note: "display" is a query word, so "change my profile" avoids ambiguity
			const result = routeInput("change my profile settings");
			expect(result.action).toBe("configure");
			expect(result.domains).toContain("identity.profile");
		});

		it("should match multiple domains from one input", () => {
			const result = routeInput("change the theme and cursor");
			expect(result.domains.length).toBeGreaterThanOrEqual(2);
		});

		it("should be case-insensitive for keywords", () => {
			const result = routeInput("Update My THEME");
			expect(result.action).toBe("configure");
			expect(result.domains).toContain("foliage.theme");
		});
	});

	// ─── Query Detection ──────────────────────────────────────────

	describe("query detection", () => {
		it("should detect query intent with 'what'", () => {
			const result = routeInput("what is my current theme?");
			expect(result.action).toBe("query");
		});

		it("should detect query intent with 'show'", () => {
			const result = routeInput("show me the cursor settings");
			expect(result.action).toBe("query");
		});

		it("should detect query intent with 'current'", () => {
			const result = routeInput("current profile name");
			expect(result.action).toBe("query");
		});

		it("should still include matched domains for queries", () => {
			const result = routeInput("what theme am I using?");
			expect(result.action).toBe("query");
			expect(result.domains).toContain("foliage.theme");
		});
	});

	// ─── No Match ─────────────────────────────────────────────────

	describe("no-match", () => {
		it("should return no-match for unrelated input", () => {
			const result = routeInput("hello world");
			expect(result.action).toBe("no-match");
			expect(result.domains).toHaveLength(0);
			expect(result.keywords).toHaveLength(0);
		});

		it("should return no-match for empty-ish input", () => {
			const result = routeInput("   ");
			expect(result.action).toBe("no-match");
		});

		it("should return no-match for gibberish", () => {
			const result = routeInput("xyzzy plugh");
			expect(result.action).toBe("no-match");
		});
	});

	// ─── Atmosphere Priority ─────────────────────────────────────

	describe("atmosphere takes priority", () => {
		it("should prefer atmosphere over domain keywords when both match", () => {
			// "cozy" is an atmosphere, but "theme" is a domain keyword
			const result = routeInput("make it cozy and change the theme");
			expect(result.action).toBe("atmosphere");
		});
	});
});
