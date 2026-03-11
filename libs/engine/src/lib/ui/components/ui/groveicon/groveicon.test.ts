import { describe, it, expect } from "vitest";
import { resolveIcon, hasIcon } from "./resolver";
import { defaultSuite, getSuite, groveIconManifest } from "./manifest";
import type { GroveIconSuite } from "./types";

// ============================================================================
// RESOLVER
// ============================================================================

describe("resolveIcon", () => {
	it("should resolve known icon names to components", () => {
		const icon = resolveIcon("Trees");
		expect(icon).toBeDefined();
		expect(typeof icon).toBe("function");
	});

	it("should return HelpCircle fallback for unknown names", () => {
		const fallback = resolveIcon("NonExistentIcon");
		const helpCircle = resolveIcon("HelpCircle");
		expect(fallback).toBe(helpCircle);
	});

	it("should resolve all icons used in the default suite", () => {
		const missingIcons: string[] = [];

		for (const [slug, entry] of Object.entries(defaultSuite)) {
			if (!hasIcon(entry.icon)) {
				missingIcons.push(`${slug} → ${entry.icon}`);
			}
		}

		expect(missingIcons).toEqual([]);
	});
});

describe("hasIcon", () => {
	it("should return true for registered icon names", () => {
		expect(hasIcon("Trees")).toBe(true);
		expect(hasIcon("PenLine")).toBe(true);
		expect(hasIcon("LampCeiling")).toBe(true);
	});

	it("should return false for unregistered icon names", () => {
		expect(hasIcon("FakeIcon")).toBe(false);
		expect(hasIcon("")).toBe(false);
		expect(hasIcon("trees")).toBe(false); // case-sensitive
	});
});

// ============================================================================
// MANIFEST
// ============================================================================

describe("defaultSuite", () => {
	const EXPECTED_SERVICES = [
		// Core Platform
		"grove",
		"garden",
		"bloom",
		"arbor",
		"heartwood",
		"plant",
		// Content & Community
		"meadow",
		"reeds",
		"curio",
		"forests",
		"museum",
		// Media & Storage
		"amber",
		"gossamer",
		// Theming
		"foliage",
		"prism",
		// AI
		"lumen",
		"reverie",
		"lantern",
		"moss",
		"wisp",
		// Communication
		"ivy",
		"zephyr",
		// Safety
		"thorn",
		"petal",
		"shade",
		// Infrastructure
		"loom",
		"threshold",
		"vista",
		"clearing",
		"firefly",
		"warden",
		// Tools
		"forage",
		"terrarium",
		"weave",
		"flow",
		"scribe",
		"etch",
		"trace",
		"passage",
		"wander",
		// Tiers
		"wanderer",
		"seedling",
		"sapling",
		"oak",
		"evergreen",
	];

	it("should contain all expected Grove services", () => {
		const missingSlugs = EXPECTED_SERVICES.filter((slug) => !(slug in defaultSuite));
		expect(missingSlugs).toEqual([]);
	});

	it("should have an icon and label for every entry", () => {
		const incomplete: string[] = [];

		for (const [slug, entry] of Object.entries(defaultSuite)) {
			if (!entry.icon) incomplete.push(`${slug}: missing icon`);
			if (!entry.label) incomplete.push(`${slug}: missing label`);
		}

		expect(incomplete).toEqual([]);
	});

	it("should use PascalCase icon names matching Lucide conventions", () => {
		const badNames: string[] = [];

		for (const [slug, entry] of Object.entries(defaultSuite)) {
			if (!/^[A-Z][a-zA-Z0-9]*$/.test(entry.icon)) {
				badNames.push(`${slug}: "${entry.icon}"`);
			}
		}

		expect(badNames).toEqual([]);
	});
});

// ============================================================================
// SUITE MANAGEMENT
// ============================================================================

describe("getSuite", () => {
	it("should return the default suite by name", () => {
		const suite = getSuite("default");
		expect(suite).toBe(defaultSuite);
	});

	it("should fall back to default for unknown suite names", () => {
		const suite = getSuite("nonexistent-theme");
		expect(suite).toBe(defaultSuite);
	});
});

describe("groveIconManifest", () => {
	it("should contain the default suite", () => {
		expect(groveIconManifest["default"]).toBeDefined();
		expect(groveIconManifest["default"]).toBe(defaultSuite);
	});
});

// ============================================================================
// CUSTOM SUITE SWAP
// ============================================================================

describe("custom suite swap", () => {
	it("should allow a custom suite to override icon assignments", () => {
		const customSuite: GroveIconSuite = {
			arbor: { icon: "Crown", label: "Arbor (Custom)" },
		};

		// Custom suite resolves its own icon
		const customIcon = resolveIcon(customSuite["arbor"].icon);
		const defaultIcon = resolveIcon(defaultSuite["arbor"].icon);

		expect(customIcon).toBeDefined();
		expect(defaultIcon).toBeDefined();
		expect(customIcon).not.toBe(defaultIcon);
	});
});
