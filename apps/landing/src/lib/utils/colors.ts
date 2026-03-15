/**
 * Color maps for roadmap phases and status indicators.
 * Extracted from the old icons.ts registry — these are presentation,
 * not icon identity (which lives in @autumnsgrove/prism/icons).
 */

/**
 * Seasonal icon colors for roadmap phases
 */
export const seasonalIconColors = {
	"first-frost": "text-blue-500",
	thaw: "text-teal-500",
	"first-buds": "text-pink-500",
	"full-bloom": "text-green-500",
	"golden-hour": "text-amber-500",
	"midnight-bloom": "text-purple-300",
} as const;

/**
 * Status-based icon colors
 */
export const statusIconColors = {
	live: "text-green-500",
	complete: "text-green-500",
	integrated: "text-blue-500",
	implemented: "text-blue-500",
	building: "text-amber-500",
	planned: "text-slate-400",
	past: "text-green-500",
	current: "text-accent",
	future: "text-slate-400",
} as const;

/**
 * Get color for a phase
 */
export function getPhaseColor(phase: keyof typeof seasonalIconColors) {
	return seasonalIconColors[phase];
}

/**
 * Get color for a status
 */
export function getStatusColor(status: keyof typeof statusIconColors) {
	return statusIconColors[status];
}
