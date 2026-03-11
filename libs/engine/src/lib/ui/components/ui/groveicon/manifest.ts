/**
 * Grove Service Icon Manifest
 *
 * Maps service slugs to Lucide icon names, organized by suite.
 * The "default" suite matches current icon assignments across the codebase.
 *
 * To create a new suite, add a new key with a full slug→icon mapping.
 * All suites should map the same set of slugs for consistent swaps.
 */

import type { GroveIconManifest, GroveIconSuite } from "./types";

// ============================================================================
// DEFAULT SUITE — current Lucide assignments
// ============================================================================

export const defaultSuite: GroveIconSuite = {
	// ── Core Platform ──────────────────────────────────────────────
	grove: { icon: "Trees", label: "Grove" },
	garden: { icon: "Flower", label: "Garden" },
	bloom: { icon: "Flower2", label: "Bloom" },
	arbor: { icon: "PenLine", label: "Arbor" },
	heartwood: { icon: "Key", label: "Heartwood" },
	plant: { icon: "Store", label: "Plant" },

	// ── Content & Community ────────────────────────────────────────
	meadow: { icon: "Users", label: "Meadow" },
	reeds: { icon: "MessageCircle", label: "Reeds" },
	curio: { icon: "Amphora", label: "Curio" },
	forests: { icon: "Trees", label: "Forests" },
	museum: { icon: "Frame", label: "Museum" },

	// ── Media & Storage ────────────────────────────────────────────
	amber: { icon: "HardDrive", label: "Amber" },
	gossamer: { icon: "Sparkles", label: "Gossamer" },

	// ── Theming & Design ───────────────────────────────────────────
	foliage: { icon: "Palette", label: "Foliage" },
	prism: { icon: "SwatchBook", label: "Prism" },

	// ── AI & Intelligence ──────────────────────────────────────────
	lumen: { icon: "LampCeiling", label: "Lumen" },
	reverie: { icon: "Eclipse", label: "Reverie" },
	lantern: { icon: "FerrisWheel", label: "Lantern" },
	moss: { icon: "Leaf", label: "Moss" },
	wisp: { icon: "Wind", label: "Wisp" },

	// ── Communication ──────────────────────────────────────────────
	ivy: { icon: "Mail", label: "Ivy" },
	zephyr: { icon: "Send", label: "Zephyr" },

	// ── Safety & Moderation ────────────────────────────────────────
	thorn: { icon: "ShieldCheck", label: "Thorn" },
	petal: { icon: "Fan", label: "Petal" },
	shade: { icon: "Blinds", label: "Shade" },

	// ── Infrastructure ─────────────────────────────────────────────
	loom: { icon: "FileBox", label: "Loom" },
	threshold: { icon: "Gauge", label: "Threshold" },
	vista: { icon: "Activity", label: "Vista" },
	clearing: { icon: "Activity", label: "Clearing" },
	firefly: { icon: "SolarPanel", label: "Firefly" },
	warden: { icon: "Vault", label: "Warden" },

	// ── Tools ──────────────────────────────────────────────────────
	forage: { icon: "SearchCode", label: "Forage" },
	terrarium: { icon: "PencilRuler", label: "Terrarium" },
	weave: { icon: "SplinePointer", label: "Weave" },
	flow: { icon: "DraftingCompass", label: "Flow" },
	scribe: { icon: "Mic", label: "Scribe" },
	etch: { icon: "Highlighter", label: "Etch" },
	trace: { icon: "Footprints", label: "Trace" },
	passage: { icon: "Kayak", label: "Passage" },
	wander: { icon: "Earth", label: "Wander" },

	// ── Tiers ──────────────────────────────────────────────────────
	wanderer: { icon: "Footprints", label: "Wanderer" },
	seedling: { icon: "Sprout", label: "Seedling" },
	sapling: { icon: "TreeDeciduous", label: "Sapling" },
	oak: { icon: "Trees", label: "Oak" },
	evergreen: { icon: "Crown", label: "Evergreen" },
} as const;

// ============================================================================
// MANIFEST — all available suites
// ============================================================================

export const groveIconManifest: GroveIconManifest = {
	default: defaultSuite,
};

/**
 * Get a specific suite by name, falling back to default.
 */
export function getSuite(name: string): GroveIconSuite {
	return groveIconManifest[name] ?? defaultSuite;
}
