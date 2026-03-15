import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
	ICON_MANIFEST,
	normalize,
	isIconKey,
	isGroupKey,
	getGroupKeys,
	getGroupNames,
	findKeyGroups,
	_resetKeyIndexes,
} from "../src/lib/icons/manifest.js";

// ---------------------------------------------------------------------------
// Test fixtures — populate manifest groups for testing, clean up after
// ---------------------------------------------------------------------------

const TEST_NAV_ICONS = { home: "Home", search: "Search", arrowRight: "ArrowRight" };
const TEST_STATE_ICONS = {
	check: "Check",
	checkCircle: "CheckCircle",
	warning: "AlertTriangle",
	x: "X",
};
const TEST_NATURE_ICONS = { sprout: "Sprout", leaf: "Leaf", heart: "Heart" };

function populateTestManifest() {
	Object.assign(ICON_MANIFEST.nav, TEST_NAV_ICONS);
	Object.assign(ICON_MANIFEST.state, TEST_STATE_ICONS);
	Object.assign(ICON_MANIFEST.nature, TEST_NATURE_ICONS);
}

function clearTestManifest() {
	for (const key of Object.keys(ICON_MANIFEST.nav)) delete ICON_MANIFEST.nav[key];
	for (const key of Object.keys(ICON_MANIFEST.state)) delete ICON_MANIFEST.state[key];
	for (const key of Object.keys(ICON_MANIFEST.nature)) delete ICON_MANIFEST.nature[key];
	_resetKeyIndexes();
}

// ---------------------------------------------------------------------------
// normalize()
// ---------------------------------------------------------------------------

describe("normalize()", () => {
	it("lowercases camelCase keys", () => {
		expect(normalize("checkCircle")).toBe("checkcircle");
	});

	it("strips hyphens and lowercases", () => {
		expect(normalize("check-circle")).toBe("checkcircle");
	});

	it("strips underscores and lowercases", () => {
		expect(normalize("check_circle")).toBe("checkcircle");
	});

	it("handles SCREAMING_SNAKE_CASE", () => {
		expect(normalize("CHECK_CIRCLE")).toBe("checkcircle");
	});

	it("handles SCREAMING-KEBAB-CASE", () => {
		expect(normalize("CHECK-CIRCLE")).toBe("checkcircle");
	});

	it("handles already lowercase no delimiters", () => {
		expect(normalize("checkcircle")).toBe("checkcircle");
	});

	it("handles single word", () => {
		expect(normalize("home")).toBe("home");
		expect(normalize("Home")).toBe("home");
		expect(normalize("HOME")).toBe("home");
	});

	it("handles empty string", () => {
		expect(normalize("")).toBe("");
	});

	it("preserves numbers", () => {
		expect(normalize("heading1")).toBe("heading1");
		expect(normalize("Heading-1")).toBe("heading1");
	});

	it("all casing variants produce the same result", () => {
		const variants = [
			"checkCircle",
			"CHECK_CIRCLE",
			"check-circle",
			"check_circle",
			"CHECKCIRCLE",
			"checkcircle",
			"CHECK-CIRCLE",
		];
		const results = new Set(variants.map(normalize));
		expect(results.size).toBe(1);
		expect(results.has("checkcircle")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// isIconKey()
// ---------------------------------------------------------------------------

describe("isIconKey()", () => {
	beforeEach(() => {
		populateTestManifest();
		_resetKeyIndexes();
	});
	afterEach(clearTestManifest);

	it("returns true for exact canonical key", () => {
		expect(isIconKey("home")).toBe(true);
		expect(isIconKey("check")).toBe(true);
		expect(isIconKey("sprout")).toBe(true);
	});

	it("returns true for normalized variants", () => {
		expect(isIconKey("checkCircle")).toBe(true);
		expect(isIconKey("CHECK_CIRCLE")).toBe(true);
		expect(isIconKey("check-circle")).toBe(true);
	});

	it("returns false for unknown keys", () => {
		expect(isIconKey("banana")).toBe(false);
		expect(isIconKey("nonexistent")).toBe(false);
	});

	it("returns false for empty string", () => {
		expect(isIconKey("")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// isGroupKey()
// ---------------------------------------------------------------------------

describe("isGroupKey()", () => {
	beforeEach(() => {
		populateTestManifest();
		_resetKeyIndexes();
	});
	afterEach(clearTestManifest);

	it("returns true for key in the correct group", () => {
		expect(isGroupKey("nav", "home")).toBe(true);
		expect(isGroupKey("state", "check")).toBe(true);
		expect(isGroupKey("nature", "sprout")).toBe(true);
	});

	it("returns false for key in the wrong group", () => {
		expect(isGroupKey("nav", "check")).toBe(false);
		expect(isGroupKey("state", "home")).toBe(false);
		expect(isGroupKey("nature", "search")).toBe(false);
	});

	it("handles normalized variants", () => {
		expect(isGroupKey("state", "checkCircle")).toBe(true);
		expect(isGroupKey("state", "CHECK_CIRCLE")).toBe(true);
		expect(isGroupKey("state", "check-circle")).toBe(true);
	});

	it("returns false for invalid group name", () => {
		expect(isGroupKey("nonexistent" as any, "home")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getGroupKeys()
// ---------------------------------------------------------------------------

describe("getGroupKeys()", () => {
	beforeEach(populateTestManifest);
	afterEach(clearTestManifest);

	it("returns canonical keys for a group", () => {
		const keys = getGroupKeys("nav");
		expect(keys).toContain("home");
		expect(keys).toContain("search");
		expect(keys).toContain("arrowRight");
	});

	it("returns empty array for invalid group", () => {
		expect(getGroupKeys("nonexistent" as any)).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// getGroupNames()
// ---------------------------------------------------------------------------

describe("getGroupNames()", () => {
	it("returns all 12 group names", () => {
		const names = getGroupNames();
		expect(names).toHaveLength(12);
		expect(names).toContain("nav");
		expect(names).toContain("state");
		expect(names).toContain("nature");
		expect(names).toContain("season");
		expect(names).toContain("action");
		expect(names).toContain("feature");
		expect(names).toContain("auth");
		expect(names).toContain("metric");
		expect(names).toContain("phase");
		expect(names).toContain("tool");
		expect(names).toContain("blaze");
		expect(names).toContain("chrome");
	});
});

// ---------------------------------------------------------------------------
// findKeyGroups()
// ---------------------------------------------------------------------------

describe("findKeyGroups()", () => {
	beforeEach(() => {
		populateTestManifest();
		_resetKeyIndexes();
	});
	afterEach(clearTestManifest);

	it("finds the group for a known key", () => {
		expect(findKeyGroups("home")).toEqual(["nav"]);
		expect(findKeyGroups("check")).toEqual(["state"]);
	});

	it("handles normalized variants", () => {
		expect(findKeyGroups("checkCircle")).toEqual(["state"]);
		expect(findKeyGroups("CHECK_CIRCLE")).toEqual(["state"]);
	});

	it("returns empty array for unknown key", () => {
		expect(findKeyGroups("banana")).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Manifest structure
// ---------------------------------------------------------------------------

describe("ICON_MANIFEST", () => {
	it("has exactly 12 groups", () => {
		expect(Object.keys(ICON_MANIFEST)).toHaveLength(12);
	});

	it("every group is an object", () => {
		for (const group of Object.values(ICON_MANIFEST)) {
			expect(typeof group).toBe("object");
			expect(group).not.toBeNull();
		}
	});
});
