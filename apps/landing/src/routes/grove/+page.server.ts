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

/** A directory entry annotated with its computed primary language */
export type AnnotatedDirectoryEntry = DirectoryEntry & { primaryLanguage: string };

/** A single snapshot frame (one day), raw from census data */
interface RawGroveFrame {
	date: string;
	commit: string;
	totalLines: number;
	totalFiles: number;
	directories: DirectoryEntry[];
}

/** A snapshot frame with annotated directories (as returned by the loader) */
export interface GroveFrame {
	date: string;
	commit: string;
	totalLines: number;
	totalFiles: number;
	directories: AnnotatedDirectoryEntry[];
}

/** The full census dataset */
interface CensusData {
	frames: GroveFrame[];
	generated: string;
}

/** Coerce a value to a non-negative integer, defaulting to 0 */
function safeInt(val: unknown): number {
	const n = typeof val === "number" ? val : Number(val);
	return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

/** Validate and sanitize a directory entry from raw JSON */
function sanitizeDirectory(raw: Record<string, unknown>): DirectoryEntry | null {
	const path = typeof raw.path === "string" ? raw.path : "";
	// Reject paths with suspicious characters (only allow alphanumeric, /, -, _, .)
	if (!path || !/^[\w/.\\-]+$/.test(path)) return null;

	const depth = safeInt(raw.depth);
	if (depth < 0 || depth > 10) return null;

	return {
		path,
		depth,
		totalLines: safeInt(raw.totalLines),
		tsLines: safeInt(raw.tsLines),
		svelteLines: safeInt(raw.svelteLines),
		jsLines: safeInt(raw.jsLines),
		cssLines: safeInt(raw.cssLines),
		pyLines: safeInt(raw.pyLines),
		goLines: safeInt(raw.goLines),
		sqlLines: safeInt(raw.sqlLines),
		shLines: safeInt(raw.shLines),
		tsxLines: safeInt(raw.tsxLines),
		mdLines: safeInt(raw.mdLines),
		otherLines: safeInt(raw.otherLines),
	};
}

/** Validate and sanitize a frame from raw JSON */
function sanitizeFrame(raw: Record<string, unknown>): RawGroveFrame | null {
	const date = typeof raw.date === "string" ? raw.date : "";
	// Validate date format (YYYY-MM-DD)
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

	const commit = typeof raw.commit === "string" ? raw.commit.slice(0, 40) : "";

	const rawDirs = Array.isArray(raw.directories) ? raw.directories : [];
	const directories = rawDirs
		.map((d: unknown) => sanitizeDirectory((d ?? {}) as Record<string, unknown>))
		.filter((d): d is DirectoryEntry => d !== null);

	return {
		date,
		commit,
		totalLines: safeInt(raw.totalLines),
		totalFiles: safeInt(raw.totalFiles),
		directories,
	};
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
	if (!censusData || !Array.isArray(censusData.frames) || censusData.frames.length === 0) {
		return {
			frames: [] as GroveFrame[],
			totalFrames: 0,
			firstDate: null,
			lastDate: null,
			packages: [] as string[],
		};
	}

	// Validate and sanitize each frame
	const frames = censusData.frames
		.map((raw: unknown) => sanitizeFrame((raw ?? {}) as Record<string, unknown>))
		.filter((f): f is RawGroveFrame => f !== null);

	if (frames.length === 0) {
		return {
			frames: [] as GroveFrame[],
			totalFrames: 0,
			firstDate: null,
			lastDate: null,
			packages: [] as string[],
		};
	}

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
