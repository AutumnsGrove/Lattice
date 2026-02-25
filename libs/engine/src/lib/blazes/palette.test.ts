/**
 * Blazes Palette — Unit Tests
 *
 * Covers: auto-blaze config, color palette, icon resolution, global defaults.
 */
import { describe, it, expect } from "vitest";
import {
	BLAZE_CONFIG,
	BLAZE_COLORS,
	GLOBAL_BLAZE_DEFAULTS,
	VALID_BLAZE_COLORS,
	VALID_BLAZE_ICONS,
	resolveLucideIcon,
} from "./palette.js";

describe("BLAZE_CONFIG (auto blazes)", () => {
	it("has config for bloom post type", () => {
		expect(BLAZE_CONFIG.bloom).toBeDefined();
		expect(BLAZE_CONFIG.bloom.label).toBe("Bloom");
		expect(BLAZE_CONFIG.bloom.classes).toContain("bg-grove");
	});

	it("has config for note post type", () => {
		expect(BLAZE_CONFIG.note).toBeDefined();
		expect(BLAZE_CONFIG.note.label).toBe("Note");
		expect(BLAZE_CONFIG.note.classes).toContain("bg-amber");
	});

	it("every config has icon, label, and classes", () => {
		for (const [key, config] of Object.entries(BLAZE_CONFIG)) {
			expect(config.icon, `${key} missing icon`).toBeDefined();
			expect(config.label, `${key} missing label`).toBeTruthy();
			expect(config.classes, `${key} missing classes`).toBeTruthy();
		}
	});
});

describe("BLAZE_COLORS", () => {
	it("has 8 color entries", () => {
		expect(Object.keys(BLAZE_COLORS)).toHaveLength(8);
	});

	it("each color has light and dark classes", () => {
		for (const [key, color] of Object.entries(BLAZE_COLORS)) {
			expect(color.classes, `${key} missing light bg`).toContain("bg-");
			expect(color.classes, `${key} missing dark variant`).toContain("dark:");
		}
	});

	it("includes all expected palette keys", () => {
		const expected = ["grove", "amber", "rose", "pink", "sky", "violet", "yellow", "slate"];
		for (const key of expected) {
			expect(BLAZE_COLORS[key], `missing color: ${key}`).toBeDefined();
		}
	});
});

describe("GLOBAL_BLAZE_DEFAULTS", () => {
	it("has 8 default blaze definitions", () => {
		expect(GLOBAL_BLAZE_DEFAULTS).toHaveLength(8);
	});

	it("each default has slug, label, icon, and color", () => {
		for (const def of GLOBAL_BLAZE_DEFAULTS) {
			expect(def.slug).toBeTruthy();
			expect(def.label).toBeTruthy();
			expect(def.icon).toBeTruthy();
			expect(def.color).toBeTruthy();
		}
	});

	it("each default icon is in the valid icon list", () => {
		for (const def of GLOBAL_BLAZE_DEFAULTS) {
			expect(VALID_BLAZE_ICONS, `${def.slug} icon "${def.icon}" not valid`).toContain(def.icon);
		}
	});

	it("each default color is in the valid color list", () => {
		for (const def of GLOBAL_BLAZE_DEFAULTS) {
			expect(VALID_BLAZE_COLORS, `${def.slug} color "${def.color}" not valid`).toContain(def.color);
		}
	});
});

describe("resolveLucideIcon", () => {
	it("returns a component for known icon names", () => {
		const icon = resolveLucideIcon("Bell");
		expect(icon).toBeDefined();
		expect(typeof icon).toBe("function");
	});

	it("returns fallback for unknown icon names", () => {
		const icon = resolveLucideIcon("NonExistentIcon");
		expect(icon).toBeDefined();
		// Should be HelpCircle fallback
		expect(typeof icon).toBe("function");
	});

	it("returns fallback for empty string", () => {
		const icon = resolveLucideIcon("");
		expect(icon).toBeDefined();
	});
});

describe("VALID_BLAZE_COLORS", () => {
	it("matches BLAZE_COLORS keys", () => {
		expect(VALID_BLAZE_COLORS).toEqual(Object.keys(BLAZE_COLORS));
	});
});

describe("VALID_BLAZE_ICONS", () => {
	it("contains all icons used by global defaults", () => {
		for (const def of GLOBAL_BLAZE_DEFAULTS) {
			expect(VALID_BLAZE_ICONS).toContain(def.icon);
		}
	});
});
