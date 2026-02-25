/**
 * /grove — The Living Grove
 *
 * Server loader that reads census data at build time.
 * The census script produces grove_census.json alongside the .db file.
 * We use JSON for the SvelteKit loader to avoid native SQLite dependencies.
 */

// Load the census JSON at build time via Vite raw import
// Falls back gracefully if the file doesn't exist yet (before first census run)
let censusData: CensusData | null = null;

try {
	const modules = import.meta.glob("../../../../static/data/grove_census.json", {
		eager: true,
		import: "default",
	}) as Record<string, CensusData>;

	const entries = Object.values(modules);
	if (entries.length > 0) {
		censusData = entries[0];
	}
} catch {
	// Census hasn't been run yet, that's fine
}

/** A single directory entry within a snapshot frame */
export interface DirectoryEntry {
	path: string;
	depth: number;
	totalLines: number;
	tsLines: number;
	svelteLines: number;
	jsLines: number;
	cssLines: number;
	pyLines: number;
	goLines: number;
	sqlLines: number;
	shLines: number;
	tsxLines: number;
	mdLines: number;
	otherLines: number;
}

/** A single snapshot frame (one day) */
export interface GroveFrame {
	date: string;
	commit: string;
	totalLines: number;
	totalFiles: number;
	directories: DirectoryEntry[];
}

/** The full census dataset */
interface CensusData {
	frames: GroveFrame[];
	generated: string;
}

/** Determine the primary language of a directory entry */
function getPrimaryLanguage(dir: DirectoryEntry): string {
	const langs = [
		{ name: "svelte", lines: dir.svelteLines },
		{ name: "ts", lines: dir.tsLines },
		{ name: "py", lines: dir.pyLines },
		{ name: "go", lines: dir.goLines },
		{ name: "sql", lines: dir.sqlLines },
		{ name: "js", lines: dir.jsLines },
		{ name: "css", lines: dir.cssLines },
		{ name: "sh", lines: dir.shLines },
		{ name: "tsx", lines: dir.tsxLines },
		{ name: "md", lines: dir.mdLines },
	];
	langs.sort((a, b) => b.lines - a.lines);
	return langs[0]?.lines > 0 ? langs[0].name : "other";
}

export function load() {
	if (!censusData || !censusData.frames || censusData.frames.length === 0) {
		// No census data yet — return empty state
		return {
			frames: [] as GroveFrame[],
			totalFrames: 0,
			firstDate: null,
			lastDate: null,
			packages: [] as string[],
		};
	}

	const { frames } = censusData;

	// Extract unique package names (depth 1 directories) across all frames
	const packageSet = new Set<string>();
	for (const frame of frames) {
		for (const dir of frame.directories) {
			if (dir.depth === 1) {
				packageSet.add(dir.path);
			}
		}
	}

	// Annotate directories with primary language
	const annotatedFrames = frames.map((frame) => ({
		...frame,
		directories: frame.directories.map((dir) => ({
			...dir,
			primaryLanguage: getPrimaryLanguage(dir),
		})),
	}));

	return {
		frames: annotatedFrames,
		totalFrames: frames.length,
		firstDate: frames[0]?.date ?? null,
		lastDate: frames[frames.length - 1]?.date ?? null,
		packages: Array.from(packageSet).sort(),
	};
}
