/**
 * Prompt Template Tests
 *
 * Tests formatDriverPrompt, formatSwarmPrompt, and formatVibeParsePrompt.
 */

import { describe, it, expect } from "vitest";
import {
	formatDriverPrompt,
	formatSwarmPrompt,
	formatVibeParsePrompt,
	DRIVER_SYSTEM_PROMPT,
	SWARM_SYSTEM_PROMPT,
	VIBE_PARSE_SYSTEM_PROMPT,
	type DriverPromptOptions,
} from "./prompts";

// =============================================================================
// formatDriverPrompt
// =============================================================================

describe("formatDriverPrompt", () => {
	const baseOptions: DriverPromptOptions = {
		businessName: "Sunrise Bakery",
		tldPreferences: ["com", "co", "io"],
		vibe: "warm and inviting",
		batchNum: 1,
	};

	it("should include business name", () => {
		const prompt = formatDriverPrompt(baseOptions);
		expect(prompt).toContain("Sunrise Bakery");
	});

	it("should format TLD preferences with dots", () => {
		const prompt = formatDriverPrompt(baseOptions);
		expect(prompt).toContain(".com");
		expect(prompt).toContain(".co");
		expect(prompt).toContain(".io");
	});

	it("should handle 'any' TLD preference", () => {
		const prompt = formatDriverPrompt({
			...baseOptions,
			tldPreferences: ["any"],
		});
		expect(prompt).toContain("Open to any TLD");
	});

	it("should include vibe", () => {
		const prompt = formatDriverPrompt(baseOptions);
		expect(prompt).toContain("warm and inviting");
	});

	it("should include batch number", () => {
		const prompt = formatDriverPrompt({ ...baseOptions, batchNum: 3 });
		expect(prompt).toContain("batch 3");
	});

	it("should use default count of 50", () => {
		const prompt = formatDriverPrompt(baseOptions);
		expect(prompt).toContain("50");
	});

	it("should use custom count", () => {
		const prompt = formatDriverPrompt({ ...baseOptions, count: 20 });
		expect(prompt).toContain("20");
	});

	it("should include domain idea section when provided", () => {
		const prompt = formatDriverPrompt({
			...baseOptions,
			domainIdea: "sunrisebakes.com",
		});
		expect(prompt).toContain("sunrisebakes.com");
		expect(prompt).toContain("Domain Idea");
	});

	it("should omit domain idea section when not provided", () => {
		const prompt = formatDriverPrompt(baseOptions);
		expect(prompt).not.toContain("Domain Idea");
	});

	it("should include keywords section when provided", () => {
		const prompt = formatDriverPrompt({
			...baseOptions,
			keywords: "bread, pastry, artisan",
		});
		expect(prompt).toContain("bread, pastry, artisan");
	});

	it("should include first-batch intro for batch 1", () => {
		const prompt = formatDriverPrompt(baseOptions);
		expect(prompt).toContain("first batch");
	});

	it("should include previous results for batch > 1", () => {
		const prompt = formatDriverPrompt({
			...baseOptions,
			batchNum: 2,
			previousResults: {
				checked_count: 50,
				available_count: 3,
				target_count: 10,
				tried_summary: "sunrise.com, bakery.io",
				available_summary: "sunrisebakes.co",
				taken_patterns: ".com variants all taken",
			},
		});
		expect(prompt).toContain("50");
		expect(prompt).toContain("sunrise.com, bakery.io");
		expect(prompt).toContain(".com variants all taken");
	});

	it("should use batch-specific guidelines", () => {
		const batch1 = formatDriverPrompt({ ...baseOptions, batchNum: 1 });
		const batch3 = formatDriverPrompt({ ...baseOptions, batchNum: 3 });

		expect(batch1).toContain("most obvious");
		expect(batch3).toContain("creative");
	});

	it("should fall back to batch 6 guidelines for high batch numbers", () => {
		const prompt = formatDriverPrompt({ ...baseOptions, batchNum: 10 });
		expect(prompt).toContain("Final batch");
	});

	it("should include diverse TLD instructions when enabled", () => {
		const prompt = formatDriverPrompt({ ...baseOptions, diverseTlds: true });
		expect(prompt).toContain("TLD Diversity Requested");
		expect(prompt).toContain(".design");
		expect(prompt).toContain(".garden");
	});

	it("should not include diverse TLD instructions by default", () => {
		const prompt = formatDriverPrompt(baseOptions);
		expect(prompt).not.toContain("TLD Diversity Requested");
	});
});

// =============================================================================
// formatSwarmPrompt
// =============================================================================

describe("formatSwarmPrompt", () => {
	it("should include all domains in list format", () => {
		const prompt = formatSwarmPrompt({
			domains: ["alpha.com", "beta.io", "gamma.dev"],
			vibe: "professional",
			businessName: "Test Corp",
		});

		expect(prompt).toContain("- alpha.com");
		expect(prompt).toContain("- beta.io");
		expect(prompt).toContain("- gamma.dev");
	});

	it("should include vibe and business name", () => {
		const prompt = formatSwarmPrompt({
			domains: ["test.com"],
			vibe: "playful and creative",
			businessName: "Fun Studio",
		});

		expect(prompt).toContain("playful and creative");
		expect(prompt).toContain("Fun Studio");
	});
});

// =============================================================================
// formatVibeParsePrompt
// =============================================================================

describe("formatVibeParsePrompt", () => {
	it("should embed the vibe text", () => {
		const prompt = formatVibeParsePrompt("I want a cozy bakery website that feels like home");
		expect(prompt).toContain("I want a cozy bakery website that feels like home");
	});

	it("should include JSON schema instructions", () => {
		const prompt = formatVibeParsePrompt("test");
		expect(prompt).toContain("business_name");
		expect(prompt).toContain("domain_idea");
		expect(prompt).toContain("vibe");
		expect(prompt).toContain("keywords");
		expect(prompt).toContain("tld_preferences");
	});
});

// =============================================================================
// System prompts
// =============================================================================

describe("system prompts", () => {
	it("DRIVER_SYSTEM_PROMPT should emphasize business name focus", () => {
		expect(DRIVER_SYSTEM_PROMPT).toContain("business name");
		expect(DRIVER_SYSTEM_PROMPT).toContain("JSON");
	});

	it("SWARM_SYSTEM_PROMPT should define scoring criteria", () => {
		expect(SWARM_SYSTEM_PROMPT).toContain("Pronounceability");
		expect(SWARM_SYSTEM_PROMPT).toContain("Memorability");
		expect(SWARM_SYSTEM_PROMPT).toContain("Brand fit");
		expect(SWARM_SYSTEM_PROMPT).toContain("Email-ability");
	});

	it("VIBE_PARSE_SYSTEM_PROMPT should mention JSON output", () => {
		expect(VIBE_PARSE_SYSTEM_PROMPT).toContain("JSON");
	});
});
