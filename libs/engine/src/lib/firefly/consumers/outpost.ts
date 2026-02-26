/**
 * Firefly SDK — Outpost Consumer Preset
 *
 * Configuration defaults for on-demand Minecraft servers.
 * Uses Hetzner cx32 for the extra RAM that Minecraft needs.
 * Longer idle threshold since players may step away briefly.
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type { ConsumerPreset } from "../types.js";

export const OUTPOST_DEFAULTS: ConsumerPreset = {
	name: "outpost",
	defaultSize: "cx32",
	defaultRegion: "ash",
	defaultImage: "ubuntu-24.04",
	idle: {
		checkInterval: 60_000,
		idleThreshold: 30 * 60_000, // 30 min with no players
		activitySignals: ["player_connected"],
		warningAt: 25 * 60_000, // Discord warning at 25 min
	},
	maxLifetime: 12 * 60 * 60_000, // 12 hour hard cap
	tags: ["outpost", "minecraft"],
};
