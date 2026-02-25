/**
 * Grove Layout — Island positioning and tree mapping logic.
 *
 * Determines where islands sit in the archipelago,
 * how trees are distributed within each island,
 * and which tree species represents each directory.
 */

import type { AnnotatedDirectoryEntry } from "../+page.server";

/** A positioned island in the archipelago */
export interface IslandLayout {
	/** Package path (e.g., 'libs/engine') */
	path: string;
	/** Display name (e.g., 'engine') */
	name: string;
	/** X position as 0-100 viewport percentage */
	x: number;
	/** Y position as 0-100 viewport percentage */
	y: number;
	/** Z-index for depth layering */
	zIndex: number;
	/** Base width in px, scales with line count */
	width: number;
	/** Opacity for atmospheric depth (0.7 back, 1.0 front) */
	opacity: number;
}

/** A tree within an island */
export interface TreeLayout {
	/** Stable ID for morph tracking */
	id: string;
	/** Relative X position within island (0-1) */
	x: number;
	/** Height in px based on line count */
	height: number;
	/** Tree species component name */
	species: "pine" | "cherry" | "aspen" | "birch" | "logo";
	/** The directory entry this tree represents */
	directory: AnnotatedDirectoryEntry;
}

/** Pre-defined island positions. Larger packages toward the center-back. */
const ISLAND_POSITIONS: Record<string, { x: number; y: number; zIndex: number }> = {
	"libs/engine": { x: 35, y: 28, zIndex: 2 },
	"apps/landing": { x: 65, y: 30, zIndex: 2 },
	"apps/meadow": { x: 50, y: 22, zIndex: 1 },
	"apps/login": { x: 20, y: 35, zIndex: 3 },
	"apps/amber": { x: 80, y: 35, zIndex: 3 },
	"apps/clearing": { x: 15, y: 50, zIndex: 3 },
	"apps/domains": { x: 85, y: 48, zIndex: 3 },
	"apps/ivy": { x: 72, y: 55, zIndex: 4 },
	"apps/plant": { x: 28, y: 55, zIndex: 4 },
	"apps/terrarium": { x: 55, y: 45, zIndex: 3 },
	"libs/foliage": { x: 42, y: 50, zIndex: 3 },
	"libs/gossamer": { x: 62, y: 52, zIndex: 3 },
	"libs/infra": { x: 48, y: 58, zIndex: 4 },
	"libs/shutter": { x: 75, y: 42, zIndex: 3 },
	"libs/vineyard": { x: 30, y: 42, zIndex: 3 },
	workers: { x: 50, y: 62, zIndex: 4 },
	services: { x: 35, y: 65, zIndex: 4 },
	docs: { x: 20, y: 68, zIndex: 4 },
	scripts: { x: 70, y: 68, zIndex: 4 },
	tools: { x: 85, y: 62, zIndex: 4 },
};

// Default position for unknown packages
const DEFAULT_POSITION = { x: 50, y: 50, zIndex: 3 };

/** Depth-0 directories that aggregate children as trees within a single island */
export const UMBRELLA_DIRS = new Set(["docs", "workers", "services", "scripts", "tools"]);

/** Map primary language to tree species */
export function getTreeSpecies(primaryLanguage: string): TreeLayout["species"] {
	switch (primaryLanguage) {
		case "svelte":
			return "cherry";
		case "ts":
			return "pine";
		case "py":
			return "aspen";
		case "go":
			return "birch";
		case "md":
			return "logo";
		default:
			return "pine";
	}
}

/** Calculate island width based on total line count */
function getIslandWidth(totalLines: number): number {
	// Min 120px, max 300px, logarithmic scale
	const min = 120;
	const max = 300;
	if (totalLines <= 0) return min;
	const scale = Math.log10(totalLines + 1) / Math.log10(50000);
	return Math.round(min + (max - min) * Math.min(1, scale));
}

/** Get opacity based on z-index (depth fog) */
function getDepthOpacity(zIndex: number): number {
	switch (zIndex) {
		case 1:
			return 0.7;
		case 2:
			return 0.8;
		case 3:
			return 0.9;
		default:
			return 1.0;
	}
}

/** Calculate tree height from line count */
function getTreeHeight(lines: number): number {
	const min = 35;
	const max = 130;
	if (lines <= 0) return min;
	// Square root scale for more natural distribution
	const scale = Math.sqrt(lines) / Math.sqrt(10000);
	return Math.round(min + (max - min) * Math.min(1, scale));
}

/**
 * Generate a stable position for an unknown package based on its path.
 * Uses a simple hash to distribute packages across the viewport.
 */
function autoPosition(path: string): { x: number; y: number; zIndex: number } {
	let hash = 0;
	for (let i = 0; i < path.length; i++) {
		hash = ((hash << 5) - hash + path.charCodeAt(i)) | 0;
	}
	const h = Math.abs(hash);
	return {
		x: 10 + (h % 80),
		y: 20 + ((h >> 8) % 55),
		zIndex: 3,
	};
}

/**
 * Build the full island layout from a frame's directory entries.
 *
 * Umbrella dirs (docs, workers, services, scripts, tools) become a single
 * island each — their depth-1 children become trees, not separate islands.
 * True packages (apps/*, libs/*) keep their own islands as before.
 */
export function buildIslandLayouts(directories: AnnotatedDirectoryEntry[]): IslandLayout[] {
	const islands: IslandLayout[] = [];
	const absorbedPaths = new Set<string>();

	// Umbrella islands: depth-0 dirs that aggregate their children
	for (const dir of directories) {
		if (dir.depth === 0 && UMBRELLA_DIRS.has(dir.path) && dir.totalLines > 0) {
			const pos = ISLAND_POSITIONS[dir.path] ?? DEFAULT_POSITION;
			islands.push({
				path: dir.path,
				name: dir.path,
				x: pos.x,
				y: pos.y,
				zIndex: pos.zIndex,
				width: getIslandWidth(dir.totalLines),
				opacity: getDepthOpacity(pos.zIndex),
			});
			// Mark depth-1 children as absorbed — they become trees, not islands
			for (const child of directories) {
				if (child.depth === 1 && child.path.startsWith(dir.path + "/")) {
					absorbedPaths.add(child.path);
				}
			}
		}
	}

	// Individual package islands: depth-1 dirs that weren't absorbed
	for (const dir of directories) {
		if (dir.depth === 1 && dir.totalLines > 0 && !absorbedPaths.has(dir.path)) {
			const pos = ISLAND_POSITIONS[dir.path] ?? autoPosition(dir.path);
			islands.push({
				path: dir.path,
				name: dir.path.split("/").pop() ?? dir.path,
				x: pos.x,
				y: pos.y,
				zIndex: pos.zIndex,
				width: getIslandWidth(dir.totalLines),
				opacity: getDepthOpacity(pos.zIndex),
			});
		}
	}

	return islands;
}

/**
 * Build trees for a specific island from its child directories.
 * Umbrella dirs use depth-1 children; packages use depth-2 children.
 * If no children exist, creates a single tree from the island itself.
 */
export function buildTreesForIsland(
	islandPath: string,
	directories: AnnotatedDirectoryEntry[],
	maxTrees: number = 8,
): TreeLayout[] {
	// Umbrella dirs show depth-1 children as trees; packages show depth-2
	const childDepth = UMBRELLA_DIRS.has(islandPath) ? 1 : 2;

	const children = directories.filter(
		(d) => d.depth === childDepth && d.path.startsWith(islandPath + "/") && d.totalLines > 50,
	);

	if (children.length === 0) {
		// No significant subfolders — create one tree from the island itself
		const islandDir = directories.find((d) => d.path === islandPath);
		if (!islandDir || islandDir.totalLines <= 0) return [];

		return [
			{
				id: islandPath,
				x: 0.5,
				height: getTreeHeight(islandDir.totalLines),
				species: getTreeSpecies(islandDir.primaryLanguage),
				directory: islandDir,
			},
		];
	}

	// Sort by line count, take top N
	const sorted = [...children].sort((a, b) => b.totalLines - a.totalLines).slice(0, maxTrees);

	return sorted.map((dir, i) => ({
		id: dir.path,
		x: (i + 1) / (sorted.length + 1), // Evenly spaced
		height: getTreeHeight(dir.totalLines),
		species: getTreeSpecies(dir.primaryLanguage),
		directory: dir,
	}));
}
