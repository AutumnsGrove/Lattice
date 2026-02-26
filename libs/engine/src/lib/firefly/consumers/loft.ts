/**
 * Firefly SDK — Loft Consumer Preset
 *
 * Configuration defaults for interactive dev sessions from iPad.
 * Uses Fly.io for fast cold starts (~5s). Longer idle thresholds
 * since interactive sessions have natural pauses.
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type { ConsumerPreset } from "../types.js";

export const LOFT_DEFAULTS: ConsumerPreset = {
	name: "loft",
	defaultSize: "shared-cpu-2x",
	defaultRegion: "iad",
	defaultImage: "grove-loft-v1",
	idle: {
		checkInterval: 60_000,
		idleThreshold: 30 * 60_000, // 30 min idle
		activitySignals: ["ssh_session_active", "network_traffic"],
		warningAt: 25 * 60_000, // Warn at 25 min
	},
	maxLifetime: 8 * 60 * 60_000, // 8 hour hard cap
	tags: ["loft", "interactive"],
};
