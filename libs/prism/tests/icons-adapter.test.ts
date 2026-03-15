import { describe, it, expect, vi, afterAll } from "vitest";

// vi.hoisted() declares variables that exist BEFORE vi.mock() hoisting runs.
// This is the correct Vitest pattern for sharing mock references with test code.
const {
	MockHome,
	MockSearch,
	MockArrowRight,
	MockMenu,
	MockCheck,
	MockCheckCircle,
	MockAlertTriangle,
	MockX,
	MockLoader2,
	MockSprout,
	MockLeaf,
	MockHeart,
	MockFlower2,
	MockCircle,
} = vi.hoisted(() => ({
	MockHome: function Home() {},
	MockSearch: function Search() {},
	MockArrowRight: function ArrowRight() {},
	MockMenu: function Menu() {},
	MockCheck: function Check() {},
	MockCheckCircle: function CheckCircle() {},
	MockAlertTriangle: function AlertTriangle() {},
	MockX: function X() {},
	MockLoader2: function Loader2() {},
	MockSprout: function Sprout() {},
	MockLeaf: function Leaf() {},
	MockHeart: function Heart() {},
	MockFlower2: function Flower2() {},
	MockCircle: function Circle() {},
}));

vi.mock("@lucide/svelte", () => ({
	Home: MockHome,
	Search: MockSearch,
	ArrowRight: MockArrowRight,
	Menu: MockMenu,
	Check: MockCheck,
	CheckCircle: MockCheckCircle,
	AlertTriangle: MockAlertTriangle,
	X: MockX,
	Loader2: MockLoader2,
	Sprout: MockSprout,
	Leaf: MockLeaf,
	Heart: MockHeart,
	Flower2: MockFlower2,
	Circle: MockCircle,
}));

// Populate manifest BEFORE importing adapter (manifest is imported by adapter)
import { ICON_MANIFEST, _resetKeyIndexes } from "../src/lib/icons/manifest.js";

// Populate the manifest groups with test data
Object.assign(ICON_MANIFEST.nav, {
	home: "Home",
	search: "Search",
	arrowRight: "ArrowRight",
	menu: "Menu",
});
Object.assign(ICON_MANIFEST.state, {
	check: "Check",
	checkCircle: "CheckCircle",
	warning: "AlertTriangle",
	x: "X",
	loader: "Loader2",
	circle: "Circle",
});
Object.assign(ICON_MANIFEST.nature, {
	sprout: "Sprout",
	leaf: "Leaf",
	heart: "Heart",
	flower: "Flower2",
});

// Reset key indexes so they rebuild from populated manifest
_resetKeyIndexes();

// NOW import the adapter — it will lazily resolve against populated manifest + mock Lucide
import {
	navIcons,
	stateIcons,
	natureIcons,
	allIcons,
	getIcon,
	getIconFromAll,
	resolveIcon,
	resolveAnyIcon,
	toolIcons,
	seasonIcons,
	actionIcons,
	featureIcons,
	authIcons,
	metricIcons,
	phaseIcons,
	blazeIcons,
	chromeIcons,
} from "../src/lib/icons/adapters/lucide.js";

// ---------------------------------------------------------------------------
// Clean up manifest after all tests
// ---------------------------------------------------------------------------

afterAll(() => {
	for (const key of Object.keys(ICON_MANIFEST.nav)) delete ICON_MANIFEST.nav[key];
	for (const key of Object.keys(ICON_MANIFEST.state)) delete ICON_MANIFEST.state[key];
	for (const key of Object.keys(ICON_MANIFEST.nature)) delete ICON_MANIFEST.nature[key];
	_resetKeyIndexes();
});

// ---------------------------------------------------------------------------
// Module structure
// ---------------------------------------------------------------------------

describe("Lucide adapter — module structure", () => {
	it("exports all 12 group icon maps", () => {
		expect(navIcons).toBeDefined();
		expect(stateIcons).toBeDefined();
		expect(natureIcons).toBeDefined();
		expect(seasonIcons).toBeDefined();
		expect(actionIcons).toBeDefined();
		expect(featureIcons).toBeDefined();
		expect(authIcons).toBeDefined();
		expect(metricIcons).toBeDefined();
		expect(phaseIcons).toBeDefined();
		expect(toolIcons).toBeDefined();
		expect(blazeIcons).toBeDefined();
		expect(chromeIcons).toBeDefined();
	});

	it("exports lookup utilities", () => {
		expect(typeof getIcon).toBe("function");
		expect(typeof getIconFromAll).toBe("function");
		expect(typeof resolveIcon).toBe("function");
		expect(typeof resolveAnyIcon).toBe("function");
	});
});

// ---------------------------------------------------------------------------
// Proxy-based forgiving lookups
// ---------------------------------------------------------------------------

describe("Proxy-based forgiving lookups", () => {
	it("resolves canonical camelCase keys", () => {
		expect(navIcons.home).toBe(MockHome);
		expect(navIcons.search).toBe(MockSearch);
		expect(stateIcons.check).toBe(MockCheck);
		expect(natureIcons.sprout).toBe(MockSprout);
	});

	it("resolves SCREAMING_SNAKE_CASE keys", () => {
		expect(stateIcons["CHECK_CIRCLE"]).toBe(MockCheckCircle);
	});

	it("resolves kebab-case keys", () => {
		expect(stateIcons["check-circle"]).toBe(MockCheckCircle);
	});

	it("resolves SCREAMING-KEBAB-CASE keys", () => {
		expect(stateIcons["CHECK-CIRCLE"]).toBe(MockCheckCircle);
	});

	it("resolves all-lowercase keys", () => {
		expect(stateIcons["checkcircle"]).toBe(MockCheckCircle);
		expect(navIcons["arrowright"]).toBe(MockArrowRight);
	});

	it("resolves ALLCAPS keys", () => {
		expect(stateIcons["CHECKCIRCLE"]).toBe(MockCheckCircle);
	});

	it("returns undefined for unknown keys", () => {
		expect(navIcons.banana).toBeUndefined();
		expect(stateIcons.nonexistent).toBeUndefined();
	});

	it("'in' operator works with canonical keys", () => {
		expect("home" in navIcons).toBe(true);
		expect("check" in stateIcons).toBe(true);
		expect("banana" in navIcons).toBe(false);
	});

	it("'in' operator works with normalized keys", () => {
		expect("CHECK_CIRCLE" in stateIcons).toBe(true);
		expect("check-circle" in stateIcons).toBe(true);
	});

	it("Object.keys returns canonical keys", () => {
		const keys = Object.keys(navIcons);
		expect(keys).toContain("home");
		expect(keys).toContain("search");
		expect(keys).toContain("arrowRight");
		expect(keys).toContain("menu");
		expect(keys).toHaveLength(4);
	});

	it("returns undefined for keys not in the group", () => {
		expect(navIcons.totallyFakeIcon).toBeUndefined();
		expect(stateIcons.totallyFakeIcon).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// allIcons — flat cross-group lookup
// ---------------------------------------------------------------------------

describe("allIcons", () => {
	it("resolves icons from any group", () => {
		expect(allIcons.home).toBe(MockHome); // nav
		expect(allIcons.check).toBe(MockCheck); // state
		expect(allIcons.sprout).toBe(MockSprout); // nature
	});

	it("supports forgiving lookups across groups", () => {
		expect(allIcons["CHECK_CIRCLE"]).toBe(MockCheckCircle);
		expect(allIcons["arrow-right"]).toBe(MockArrowRight);
	});

	it("returns undefined for unknown icons", () => {
		expect(allIcons.banana).toBeUndefined();
	});

	it("'in' operator works across all groups", () => {
		expect("home" in allIcons).toBe(true);
		expect("sprout" in allIcons).toBe(true);
		expect("banana" in allIcons).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getIcon
// ---------------------------------------------------------------------------

describe("getIcon", () => {
	it("gets icon from a specific map", () => {
		expect(getIcon(navIcons, "home")).toBe(MockHome);
	});

	it("handles forgiving key lookup", () => {
		expect(getIcon(stateIcons, "CHECK_CIRCLE")).toBe(MockCheckCircle);
	});

	it("returns undefined for missing key", () => {
		expect(getIcon(navIcons, "missing")).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// getIconFromAll
// ---------------------------------------------------------------------------

describe("getIconFromAll", () => {
	it("finds icon from any group", () => {
		expect(getIconFromAll("home")).toBe(MockHome);
		expect(getIconFromAll("sprout")).toBe(MockSprout);
	});

	it("returns undefined for unknown", () => {
		expect(getIconFromAll("banana")).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// resolveIcon — safe boundary resolver
// ---------------------------------------------------------------------------

describe("resolveIcon", () => {
	it("resolves valid key in correct group", () => {
		expect(resolveIcon("nav", "home")).toBe(MockHome);
		expect(resolveIcon("state", "check")).toBe(MockCheck);
		expect(resolveIcon("nature", "sprout")).toBe(MockSprout);
	});

	it("resolves with forgiving normalization", () => {
		expect(resolveIcon("state", "checkCircle")).toBe(MockCheckCircle);
		expect(resolveIcon("state", "CHECK_CIRCLE")).toBe(MockCheckCircle);
		expect(resolveIcon("state", "check-circle")).toBe(MockCheckCircle);
	});

	it("returns fallback for key not in specified group", () => {
		const fallback = MockCircle as any;
		expect(resolveIcon("nav", "check", fallback)).toBe(fallback);
	});

	it("returns fallback for unknown key", () => {
		const fallback = MockCircle as any;
		expect(resolveIcon("nav", "banana", fallback)).toBe(fallback);
	});

	it("returns undefined when no fallback and invalid key", () => {
		expect(resolveIcon("nav", "banana")).toBeUndefined();
	});

	it("returns fallback for empty string", () => {
		const fallback = MockCircle as any;
		expect(resolveIcon("nav", "", fallback)).toBe(fallback);
	});

	it("returns fallback for non-string key", () => {
		const fallback = MockCircle as any;
		expect(resolveIcon("nav", null as any, fallback)).toBe(fallback);
		expect(resolveIcon("nav", undefined as any, fallback)).toBe(fallback);
		expect(resolveIcon("nav", 42 as any, fallback)).toBe(fallback);
	});
});

// ---------------------------------------------------------------------------
// resolveAnyIcon
// ---------------------------------------------------------------------------

describe("resolveAnyIcon", () => {
	it("resolves from any group", () => {
		expect(resolveAnyIcon("home")).toBe(MockHome);
		expect(resolveAnyIcon("sprout")).toBe(MockSprout);
		expect(resolveAnyIcon("check")).toBe(MockCheck);
	});

	it("supports forgiving normalization", () => {
		expect(resolveAnyIcon("CHECK_CIRCLE")).toBe(MockCheckCircle);
	});

	it("returns fallback for unknown key", () => {
		const fallback = MockCircle as any;
		expect(resolveAnyIcon("banana", fallback)).toBe(fallback);
	});

	it("returns undefined for unknown key without fallback", () => {
		expect(resolveAnyIcon("banana")).toBeUndefined();
	});

	it("returns fallback for empty/non-string", () => {
		const fallback = MockCircle as any;
		expect(resolveAnyIcon("", fallback)).toBe(fallback);
		expect(resolveAnyIcon(null as any, fallback)).toBe(fallback);
	});
});
