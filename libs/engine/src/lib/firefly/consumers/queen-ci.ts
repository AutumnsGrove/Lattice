/**
 * Firefly SDK — Queen CI Consumer Preset
 *
 * Configuration defaults for CI runners managed by the Queen DO.
 * Short-lived, cost-efficient Hetzner VPS instances for Codeberg
 * webhook-triggered builds.
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type { ConsumerPreset } from "../types.js";

export const QUEEN_CI_DEFAULTS: ConsumerPreset = {
	name: "queen-ci",
	defaultSize: "cx22",
	defaultRegion: "fsn1",
	defaultImage: "ubuntu-24.04",
	idle: {
		checkInterval: 30_000,
		idleThreshold: 5 * 60_000, // 5 min idle = fade
		activitySignals: ["ci_job_running"],
	},
	maxLifetime: 30 * 60_000, // 30 min hard cap per runner
	tags: ["queen-ci", "ephemeral"],
};
