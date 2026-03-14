import { describe, it, expect } from "vitest";
import type { GroveTermManifest, GroveTermEntry } from "./types";

/**
 * GroveTerm test suite
 *
 * Tests the core logic shared by the GroveTerm component:
 * - Manifest slug resolution (findInManifest)
 * - Display text derivation
 * - GroveText parser ([[term]], [[term!]], [[term|display]])
 */

// --- Manifest resolution logic (extracted from GroveTerm.svelte) ---

function findInManifest(m: GroveTermManifest, s: string): GroveTermEntry | null {
	if (s in m) return m[s];
	if (`your-${s}` in m) return m[`your-${s}`];
	if (`${s}s` in m) return m[`${s}s`];
	if (s.endsWith("s") && s.slice(0, -1) in m) return m[s.slice(0, -1)];
	return null;
}

function normalizeSlug(term: string): string {
	return term
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

function getDisplayText(
	showAsGrove: boolean,
	entry: GroveTermEntry | null,
	term: string,
	standard?: string,
): string {
	if (showAsGrove) {
		return entry?.term || term.charAt(0).toUpperCase() + term.slice(1);
	}
	return (
		standard || entry?.standardTerm || entry?.term || term.charAt(0).toUpperCase() + term.slice(1)
	);
}

function shouldShowAsGrove(
	displayOverride: "grove" | "standard" | undefined,
	groveMode: boolean,
	entry: GroveTermEntry | null,
	standard?: string,
): boolean {
	if (displayOverride === "grove") return true;
	if (displayOverride === "standard") return false;
	return groveMode || entry?.alwaysGrove === true || (!standard && !entry?.standardTerm);
}

// --- Test manifest ---

const testManifest: GroveTermManifest = {
	arbor: {
		slug: "arbor",
		term: "Arbor",
		standardTerm: "Dashboard",
		category: "platform",
		tagline: "Admin Panel",
		definition: "The main control area.",
	},
	"your-garden": {
		slug: "your-garden",
		term: "Garden",
		standardTerm: "Blog",
		category: "foundational",
		tagline: "The Collection",
		definition: "Your blog posts.",
	},
	bloom: {
		slug: "bloom",
		term: "Bloom",
		standardTerm: "Post",
		category: "foundational",
		tagline: "Your Writing",
		definition: "A blog post.",
	},
	blooms: {
		slug: "blooms",
		term: "Blooms",
		standardTerm: "Posts",
		category: "foundational",
		tagline: "Your Writing",
		definition: "Blog posts.",
	},
	shade: {
		slug: "shade",
		term: "Shade",
		category: "operations",
		tagline: "AI Content Protection",
		definition: "Content protection system.",
		alwaysGrove: true,
	},
	"your-grove": {
		slug: "your-grove",
		term: "Grove",
		standardTerm: "Site",
		category: "foundational",
		tagline: "Your Space",
		definition: "Your personal blog.",
		alwaysGrove: true,
	},
};

// =============================================
// Manifest Resolution
// =============================================

describe("findInManifest", () => {
	it("finds direct slug match", () => {
		const result = findInManifest(testManifest, "arbor");
		expect(result?.term).toBe("Arbor");
	});

	it("finds your- prefixed slug", () => {
		const result = findInManifest(testManifest, "garden");
		expect(result?.term).toBe("Garden");
		expect(result?.slug).toBe("your-garden");
	});

	it("finds plural form", () => {
		const result = findInManifest(testManifest, "bloom");
		expect(result?.term).toBe("Bloom");
	});

	it("finds singular from plural input", () => {
		const result = findInManifest(testManifest, "blooms");
		expect(result?.term).toBe("Blooms");
	});

	it("returns null for unknown terms", () => {
		const result = findInManifest(testManifest, "nonexistent");
		expect(result).toBeNull();
	});

	it("returns null for empty manifest", () => {
		const result = findInManifest({}, "arbor");
		expect(result).toBeNull();
	});
});

// =============================================
// Slug Normalization
// =============================================

describe("normalizeSlug", () => {
	it("lowercases input", () => {
		expect(normalizeSlug("Arbor")).toBe("arbor");
	});

	it("replaces spaces with hyphens", () => {
		expect(normalizeSlug("your garden")).toBe("your-garden");
	});

	it("strips non-alphanumeric characters", () => {
		expect(normalizeSlug("bloom!")).toBe("bloom");
	});

	it("strips leading/trailing hyphens", () => {
		expect(normalizeSlug("-arbor-")).toBe("arbor");
	});

	it("handles already-normalized slugs", () => {
		expect(normalizeSlug("your-garden")).toBe("your-garden");
	});
});

// =============================================
// Display Text Derivation
// =============================================

describe("getDisplayText", () => {
	const arborEntry = testManifest["arbor"];

	it("shows grove term when showAsGrove is true", () => {
		expect(getDisplayText(true, arborEntry, "arbor")).toBe("Arbor");
	});

	it("shows standard term when showAsGrove is false", () => {
		expect(getDisplayText(false, arborEntry, "arbor")).toBe("Dashboard");
	});

	it("uses standard prop override when provided", () => {
		expect(getDisplayText(false, arborEntry, "arbor", "Control Panel")).toBe("Control Panel");
	});

	it("falls back to capitalized slug when no entry exists", () => {
		expect(getDisplayText(true, null, "unknown")).toBe("Unknown");
	});

	it("falls back to entry term when no standardTerm exists", () => {
		const noStandard: GroveTermEntry = {
			slug: "test",
			term: "TestTerm",
			category: "platform",
			tagline: "Test",
			definition: "Test",
		};
		expect(getDisplayText(false, noStandard, "test")).toBe("TestTerm");
	});
});

// =============================================
// Show As Grove Logic
// =============================================

describe("shouldShowAsGrove", () => {
	const arborEntry = testManifest["arbor"];
	const shadeEntry = testManifest["shade"];

	it("returns true when displayOverride is grove", () => {
		expect(shouldShowAsGrove("grove", false, arborEntry)).toBe(true);
	});

	it("returns false when displayOverride is standard", () => {
		expect(shouldShowAsGrove("standard", true, arborEntry)).toBe(false);
	});

	it("returns true when grove mode is on", () => {
		expect(shouldShowAsGrove(undefined, true, arborEntry)).toBe(true);
	});

	it("returns false when grove mode is off and entry has standardTerm", () => {
		expect(shouldShowAsGrove(undefined, false, arborEntry)).toBe(false);
	});

	it("returns true when entry is alwaysGrove regardless of mode", () => {
		expect(shouldShowAsGrove(undefined, false, shadeEntry)).toBe(true);
	});

	it("returns true when no standardTerm and no standard prop", () => {
		const noStandard: GroveTermEntry = {
			slug: "test",
			term: "Test",
			category: "platform",
			tagline: "Test",
			definition: "Test",
		};
		expect(shouldShowAsGrove(undefined, false, noStandard)).toBe(true);
	});

	it("returns false when standard prop provided even without manifest entry", () => {
		expect(shouldShowAsGrove(undefined, false, null, "Dashboard")).toBe(false);
	});
});

// =============================================
// GroveText Parser
// =============================================

describe("GroveText parser", () => {
	// Replicate the parsing logic from GroveText.svelte
	const PATTERN = /\[\[([a-zA-Z][a-zA-Z0-9-]*)(!)?\s*(?:\|([^\]]*))?\]\]/g;

	interface Segment {
		type: "text" | "term";
		value: string;
		display?: string;
		interactive?: boolean;
	}

	function parseContent(content: string): Segment[] {
		const result: Segment[] = [];
		let lastIndex = 0;
		const re = new RegExp(PATTERN.source, "g");
		let match: RegExpExecArray | null;
		while ((match = re.exec(content)) !== null) {
			if (match.index > lastIndex)
				result.push({ type: "text", value: content.slice(lastIndex, match.index) });
			result.push({
				type: "term",
				value: match[1],
				interactive: match[2] === "!",
				display: match[3]?.trim() || undefined,
			});
			lastIndex = re.lastIndex;
		}
		if (lastIndex < content.length) result.push({ type: "text", value: content.slice(lastIndex) });
		return result;
	}

	it("parses plain text with no markers", () => {
		const result = parseContent("Hello world");
		expect(result).toEqual([{ type: "text", value: "Hello world" }]);
	});

	it("parses a single non-interactive term", () => {
		const result = parseContent("Your [[bloom]]");
		expect(result).toEqual([
			{ type: "text", value: "Your " },
			{ type: "term", value: "bloom", interactive: false, display: undefined },
		]);
	});

	it("parses a single interactive term with ! suffix", () => {
		const result = parseContent("Protected by [[shade!]]");
		expect(result).toEqual([
			{ type: "text", value: "Protected by " },
			{ type: "term", value: "shade", interactive: true, display: undefined },
		]);
	});

	it("parses term with display text", () => {
		const result = parseContent("Your [[bloom|posts]]");
		expect(result).toEqual([
			{ type: "text", value: "Your " },
			{ type: "term", value: "bloom", interactive: false, display: "posts" },
		]);
	});

	it("parses interactive term with display text", () => {
		const result = parseContent("Protected by [[shade!|Shade]]");
		expect(result).toEqual([
			{ type: "text", value: "Protected by " },
			{ type: "term", value: "shade", interactive: true, display: "Shade" },
		]);
	});

	it("parses multiple terms in one string", () => {
		const result = parseContent("Your [[bloom|posts]] in your [[your-garden|blog]]");
		expect(result).toHaveLength(4);
		expect(result[0]).toEqual({ type: "text", value: "Your " });
		expect(result[1]).toEqual({
			type: "term",
			value: "bloom",
			interactive: false,
			display: "posts",
		});
		expect(result[2]).toEqual({ type: "text", value: " in your " });
		expect(result[3]).toEqual({
			type: "term",
			value: "your-garden",
			interactive: false,
			display: "blog",
		});
	});

	it("handles mixed interactive and non-interactive terms", () => {
		const result = parseContent("[[wanderer!|Wanderer]] tier with [[seedling|basic]]");
		expect(result).toHaveLength(3);
		expect(result[0]).toEqual({
			type: "term",
			value: "wanderer",
			interactive: true,
			display: "Wanderer",
		});
		expect(result[1]).toEqual({ type: "text", value: " tier with " });
		expect(result[2]).toEqual({
			type: "term",
			value: "seedling",
			interactive: false,
			display: "basic",
		});
	});

	it("handles term at start of string", () => {
		const result = parseContent("[[arbor]] is the dashboard");
		expect(result[0]).toEqual({
			type: "term",
			value: "arbor",
			interactive: false,
			display: undefined,
		});
		expect(result[1]).toEqual({ type: "text", value: " is the dashboard" });
	});

	it("handles term at end of string", () => {
		const result = parseContent("Welcome to [[arbor]]");
		expect(result[0]).toEqual({ type: "text", value: "Welcome to " });
		expect(result[1]).toEqual({
			type: "term",
			value: "arbor",
			interactive: false,
			display: undefined,
		});
	});

	it("handles empty string", () => {
		const result = parseContent("");
		expect(result).toEqual([]);
	});

	it("handles string with only a term", () => {
		const result = parseContent("[[bloom]]");
		expect(result).toEqual([
			{ type: "term", value: "bloom", interactive: false, display: undefined },
		]);
	});

	it("trims display text whitespace", () => {
		const result = parseContent("[[bloom| posts ]]");
		expect(result[0]).toEqual({
			type: "term",
			value: "bloom",
			interactive: false,
			display: "posts",
		});
	});

	it("handles hyphenated term slugs", () => {
		const result = parseContent("[[your-grove|Grove]]");
		expect(result[0]).toEqual({
			type: "term",
			value: "your-grove",
			interactive: false,
			display: "Grove",
		});
	});

	it("does not match invalid term syntax", () => {
		const result = parseContent("[[123invalid]]");
		expect(result).toEqual([{ type: "text", value: "[[123invalid]]" }]);
	});

	it("does not match empty brackets", () => {
		const result = parseContent("[[]]");
		expect(result).toEqual([{ type: "text", value: "[[]]" }]);
	});
});
