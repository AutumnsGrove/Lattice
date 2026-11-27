/**
 * The engine's public surface, resolved from its own `package.json`.
 *
 * `@autumnsgrove/lattice` exposes 144 subpath exports over one source tree, so
 * "a file in the engine changed" is not the same question as "every consumer is
 * affected". A change to `src/lib/platform/config/domain-blocklist.ts` is
 * reachable by exactly the packages that import `lattice/platform/config` — five
 * of them — while a change to `src/lib/ui/GlassCard.svelte` really does touch
 * everyone, because the root barrel re-exports `./ui/index` wholesale (#1786).
 *
 * This module answers that question without dependencies, because the CI job
 * that calls it has no `node_modules`:
 *
 *   1. `loadEngineSurface` reads the `exports` map and, for each exact subpath,
 *      walks its **re-export graph** to learn which source files that subpath
 *      makes public. Wildcard subpaths (`./platform/config/*`) are pattern
 *      matches instead: anything under that path is directly importable.
 *   2. `importedSpecifiers` reads a consumer package and collects the
 *      `@autumnsgrove/lattice` specifiers it actually uses — including the
 *      side-effect form a stylesheet is pulled in by, which has no `from`.
 *
 * Only re-exports are followed *downwards*, from an export entry. Imports are
 * followed *upwards*, one hop, via a reverse index: a module nothing re-exports
 * is still public in a narrow way if a public file imports it, because a type
 * declared there shows up in the emitted `.d.ts` as an un-nameable reference and
 * its values change what the exported function returns. One hop is deliberate —
 * following imports transitively from the root barrel reaches every helper in
 * the tree, which is the 27-packages-for-one-file behaviour this exists to stop.
 *
 * Nothing here is guessed in the narrowing direction. A specifier that was meant
 * to be local and could not be resolved marks the surface `partial`, and an
 * unattributable file widens instead.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";

/** The engine package, relative to the repo root. */
const ENGINE_DIR = "libs/engine";
/** Where its source lives, relative to the engine package. */
const LIB_DIR = "src/lib";

/** Source extensions a re-export specifier can resolve to, in order. */
const RESOLVE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".svelte"];
/** Index files for a directory specifier. */
const INDEX_FILES = ["index.ts", "index.tsx", "index.js", "index.svelte"];

/** `export ... from "…"` — the only shape that makes a file public. */
const REEXPORT_RE =
	/export\s+(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s*from\s*["']([^"']+)["']/g;

/** Any specifier that pulls a file in, for the reverse reference index. */
const IMPORT_RE = /(?:from\s*|import\s*\(\s*|import\s+)["']([^"']+)["']/g;

/**
 * Every way a consumer can name an engine subpath.
 *
 * `from` is the usual one, but a stylesheet is imported for its side effect and
 * has no `from` at all: `import "@autumnsgrove/lattice/styles/tokens.css"`. Those
 * are not rare here — Aspen and Plant both pull the engine's design tokens that
 * way, so missing them meant a token change reached neither. CSS gets its own
 * spelling, `@import` (with or without `url()`).
 */
const CONSUMER_RE =
	/(?:from\s*|import\s*\(\s*|import\s+|@import\s+(?:url\(\s*)?)["']@autumnsgrove\/lattice([^"']*)["']/g;

/**
 * Normalise an emitted path so it can be compared with a source path.
 *
 * The build turns `.ts` into `.js` and adds `.d.ts`, so those come off. `.svelte`
 * stays: it is part of the name a consumer writes (`./ui/Foo.svelte`), not an
 * extension the build invented. Dropping it would let `./ui/*.svelte` match
 * every file under `ui/` instead of only the components.
 */
function barePath(path) {
	return path.replace(/\.d\.ts$/, "").replace(/\.(?:js|jsx|mjs|cjs)$/, "");
}

/** Every string inside an `exports` value, however the conditions are nested. */
function targetsOf(value) {
	if (typeof value === "string") return [value];
	if (Array.isArray(value)) return value.flatMap(targetsOf);
	if (value && typeof value === "object") return Object.values(value).flatMap(targetsOf);
	return [];
}

/**
 * A `dist` target as a pattern over a source file's path, relative to `src/lib`.
 * `./dist/platform/config/*.js` → `/^platform\/config\/.+$/`.
 * Targets outside `dist` cannot describe this source tree, so they match nothing.
 */
function targetPattern(target) {
	if (!target.startsWith("./dist/")) return null;
	const rel = barePath(target.slice("./dist/".length));
	const body = rel
		.split("*")
		.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
		.join(".*");
	return new RegExp(`^${body}$`);
}

/**
 * The source file an exact export key resolves to, as a repo-relative path.
 * `./platform/config` → `libs/engine/src/lib/platform/config/index.ts`.
 */
function sourceEntryFor(root, targets) {
	for (const target of targets) {
		if (!target.startsWith("./dist/")) continue;
		const bare = barePath(target.slice("./dist/".length));
		const base = join(root, ENGINE_DIR, LIB_DIR, bare);
		// The entry can be the file itself rather than a barrel under it: a
		// stylesheet (`./styles/tokens.css`) or a component (`./ui/Foo.svelte`).
		if (/\.\w+$/.test(bare) && existsSync(base) && !existsSync(base + "/index.ts")) {
			return toRepo(root, base);
		}
		for (const ext of RESOLVE_EXTS) {
			if (existsSync(base + ext)) return toRepo(root, base + ext);
		}
		for (const index of INDEX_FILES) {
			if (existsSync(join(base, index))) return toRepo(root, join(base, index));
		}
	}
	return null;
}

function toRepo(root, abs) {
	return abs
		.slice(root.length + 1)
		.split("\\")
		.join("/");
}

/** Read a repo-relative source file, or null. */
function readSource(root, repoPath, cache) {
	if (cache.has(repoPath)) return cache.get(repoPath);
	let text = null;
	try {
		text = readFileSync(join(root, repoPath), "utf8");
	} catch {
		text = null;
	}
	cache.set(repoPath, text);
	return text;
}

/**
 * Resolve a re-export specifier from inside one source file to a repo-relative
 * path, trying the extensions the bundler would.
 *
 * Three answers, and the difference between the last two is load-bearing:
 *
 *   string    — resolved
 *   undefined — a real package (`@autumnsgrove/grove-markdown`). Nothing inside
 *               this source tree to follow, and nothing outside it to miss.
 *   null      — meant to be local and could not be resolved, so a subpath's
 *               public surface is larger than what we just walked.
 */
function resolveSpecifier(root, fromRepoPath, specifier) {
	let target;
	if (specifier.startsWith(".")) {
		target = posix.normalize(posix.join(posix.dirname(fromRepoPath), specifier));
	} else if (specifier === "$lib" || specifier.startsWith("$lib/")) {
		// SvelteKit's built-in `$lib` alias, which points at the very tree being
		// walked. `server/petal/types.ts` re-exports `$lib/types/petal`, so without
		// this those types look internal when they are on a public subpath.
		target = `${ENGINE_DIR}/${LIB_DIR}${specifier.slice("$lib".length)}`;
	} else {
		return undefined;
	}

	const base = join(root, target);

	// `./x.js` in source is usually `./x.ts` on disk — the specifier carries the
	// emitted extension, not the authored one.
	const candidates = [base];
	if (/\.js$/.test(base)) candidates.push(base.replace(/\.js$/, ".ts"));
	if (/\.js$/.test(base)) candidates.push(base.replace(/\.js$/, ".tsx"));

	for (const candidate of candidates) {
		if (existsSync(candidate) && /\.(?:tsx?|jsx?|mjs|svelte)$/.test(candidate)) {
			return toRepo(root, candidate);
		}
		for (const ext of RESOLVE_EXTS) {
			if (existsSync(candidate + ext)) return toRepo(root, candidate + ext);
		}
		for (const index of INDEX_FILES) {
			const withIndex = join(candidate, index);
			if (existsSync(withIndex)) return toRepo(root, withIndex);
		}
	}

	return null;
}

/**
 * Every source file a subpath makes public, found by following re-exports from
 * its entry. A file only reachable by `import` is deliberately not included —
 * see the note at the top of this file.
 *
 * `partial` means the walk hit a specifier that was meant to be local and could
 * not be resolved, so the real surface is larger than what was found. A guess in
 * that direction under-cascades silently, so the caller widens instead.
 */
function reexportClosure(root, entry, cache) {
	const seen = new Set();
	const queue = [entry];
	let partial = false;

	while (queue.length > 0) {
		const current = queue.pop();
		if (seen.has(current)) continue;
		seen.add(current);

		const text = readSource(root, current, cache);
		if (!text) continue;

		REEXPORT_RE.lastIndex = 0;
		let match;
		while ((match = REEXPORT_RE.exec(text)) !== null) {
			const next = resolveSpecifier(root, current, match[1]);
			if (next === undefined) continue;
			if (next === null) {
				partial = true;
				continue;
			}
			if (!seen.has(next)) queue.push(next);
		}
	}

	return { files: seen, partial };
}

/**
 * The engine's own source files, repo-relative.
 *
 * Needed for the reverse pass below: whether one file reaches consumers can
 * depend on which *other* files pull it in, and that is not knowable by walking
 * forward from the exports map alone.
 */
function engineSources(root) {
	const found = [];
	const walk = (relDir) => {
		let dirents;
		try {
			dirents = readdirSync(join(root, relDir), { withFileTypes: true });
		} catch {
			return;
		}
		for (const dirent of dirents) {
			const rel = `${relDir}/${dirent.name}`;
			if (dirent.isDirectory()) {
				walk(rel);
				continue;
			}
			if (/\.(?:tsx?|jsx?|mjs|svelte)$/.test(dirent.name)) found.push(rel);
		}
	};
	walk(`${ENGINE_DIR}/${LIB_DIR}`);
	return found;
}

/**
 * Which files pull each file in, by import or re-export.
 *
 * An internal module is still public in a narrow sense: if a barrel that *is*
 * exported imports it, a type declared there shows up in the emitted `.d.ts` as
 * an un-nameable reference, and a value there can change what the exported
 * function returns. Treating such a file as reaching nobody was wrong — the
 * dependency runs backwards, so the index does too.
 */
function referenceIndex(root, cache) {
	const referrers = new Map();

	for (const file of engineSources(root)) {
		const text = readSource(root, file, cache);
		if (!text) continue;

		IMPORT_RE.lastIndex = 0;
		let match;
		while ((match = IMPORT_RE.exec(text)) !== null) {
			const target = resolveSpecifier(root, file, match[1]);
			if (typeof target !== "string" || target === file) continue;
			if (!referrers.has(target)) referrers.set(target, new Set());
			referrers.get(target).add(file);
		}
	}

	return referrers;
}

/**
 * The engine's public surface, or null when it cannot be read.
 *
 * `null` is a "cascade to everyone" signal, not an error: a surface we cannot
 * describe is a surface we must not narrow.
 */
export function loadEngineSurface(root) {
	const pkgPath = join(root, ENGINE_DIR, "package.json");
	let pkg;
	try {
		pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
	} catch {
		return null;
	}
	const exportsMap = pkg.exports;
	if (!exportsMap || typeof exportsMap !== "object") return null;

	const cache = new Map();
	const entries = new Map();
	const wildcards = [];
	let partial = false;

	for (const [key, value] of Object.entries(exportsMap)) {
		if (key.includes("*")) {
			const patterns = targetsOf(value).map(targetPattern).filter(Boolean);
			if (patterns.length > 0) wildcards.push({ key, patterns });
			continue;
		}
		const entry = sourceEntryFor(root, targetsOf(value));
		// An exact subpath with no source here (the map outlived the directory) says
		// nothing about any *other* file, so it is not uncertainty — just nothing to
		// walk. `partial` is reserved for a surface we started walking and lost.
		if (!entry) continue;
		const closure = reexportClosure(root, entry, cache);
		if (closure.partial) partial = true;
		entries.set(key, { entry, closure: closure.files });
	}

	return { root, entries, wildcards, partial, referrers: null, cache };
}

/** A source file as `src/lib`-relative, extension-less, for pattern matching. */
function libBare(repoPath) {
	const marker = `${ENGINE_DIR}/${LIB_DIR}/`;
	const index = repoPath.indexOf(marker);
	if (index === -1) return null;
	// `.ts`/`.tsx` are the authored form of the `.js` a target names, so they drop
	// too. `.svelte` does not — see `barePath`.
	return barePath(repoPath.slice(index + marker.length)).replace(/\.(?:ts|tsx)$/, "");
}

/**
 * Which export keys make a changed engine file reachable from outside.
 *
 * An empty set means the file is internal: no export names it and no export
 * re-exports it, so nothing outside the engine can import it and no consumer's
 * types can move because it did.
 */
export function exposedBy(surface, repoPath) {
	const exposed = new Set();

	const libPath = libBare(repoPath);
	if (libPath === null) {
		// `package.json`, a build config, a script — not a module in the tree.
		// Nothing about it can be attributed, so everything is affected.
		exposed.add("*");
		return exposed;
	}

	for (const [key, { closure }] of surface.entries) {
		if (closure.has(repoPath)) exposed.add(key);
	}
	for (const { key, patterns } of surface.wildcards) {
		if (patterns.some((pattern) => pattern.test(libPath))) exposed.add(key);
	}

	if (exposed.size === 0) {
		// Nothing names this file and no subpath addresses it. Before calling it
		// internal, look the dependency the other way: if a file that *is* public
		// imports it, its declarations can appear in that file's emitted `.d.ts` as
		// an un-nameable reference, and its values can change what the public
		// function returns. One hop outwards, not a full reverse walk — a second
		// hop would put the whole engine back on the critical path.
		for (const referrer of referrersOf(surface, repoPath)) {
			const outward = libBare(referrer);
			for (const [key, { closure }] of surface.entries) {
				if (closure.has(referrer)) exposed.add(key);
			}
			if (outward !== null) {
				for (const { key, patterns } of surface.wildcards) {
					if (patterns.some((pattern) => pattern.test(outward))) exposed.add(key);
				}
			}
		}
	}

	// Still nothing, but at least one subpath's surface is only partly known — the
	// file could be in the part we could not follow. Widen rather than guess.
	if (exposed.size === 0 && surface.partial) exposed.add("*");

	return exposed;
}

/** Referrers of a file, building the index on first use. */
function referrersOf(surface, repoPath) {
	if (!surface.referrers) {
		surface.referrers = referenceIndex(surface.root, surface.cache);
	}
	return surface.referrers.get(repoPath) ?? [];
}

/** Whether a consumer's import specifier (`./platform/config/x`) can reach an export key. */
export function specifierMatches(specifier, exportKey) {
	if (exportKey === "*") return true;
	if (exportKey === ".") return specifier === ".";
	if (!exportKey.includes("*")) return specifier === exportKey;

	const [prefix, suffix] = exportKey.split("*");
	return (
		specifier.length >= prefix.length + suffix.length &&
		specifier.startsWith(prefix) &&
		specifier.endsWith(suffix)
	);
}

/** Directories inside a package that never hold authored imports. */
const SKIP_DIRS = new Set([
	"node_modules",
	"dist",
	"build",
	".svelte-kit",
	".wrangler",
	".turbo",
	"coverage",
]);

/**
 * Every `@autumnsgrove/lattice` specifier a package's own source imports,
 * normalised to export-key form: `"."` for the root, `"./platform/config"` for
 * a subpath.
 */
export function importedSpecifiers(root, packageDir, cache = new Map()) {
	if (cache.has(packageDir)) return cache.get(packageDir);

	const specifiers = new Set();
	const walk = (relDir) => {
		let dirents;
		try {
			dirents = readdirSync(join(root, relDir), { withFileTypes: true });
		} catch {
			return;
		}
		for (const dirent of dirents) {
			const rel = `${relDir}/${dirent.name}`;
			if (dirent.isDirectory()) {
				if (!SKIP_DIRS.has(dirent.name)) walk(rel);
				continue;
			}
			// `.css` is walked because a design token or a base stylesheet is a real
			// dependency with no `from` clause to find it by.
			if (!/\.(?:tsx?|jsx?|mjs|cjs|svelte|css)$/.test(dirent.name)) continue;

			let text;
			try {
				text = readFileSync(join(root, rel), "utf8");
			} catch {
				continue;
			}
			CONSUMER_RE.lastIndex = 0;
			let match;
			while ((match = CONSUMER_RE.exec(text)) !== null) {
				const rest = match[1];
				if (rest !== "" && !rest.startsWith("/")) continue;
				specifiers.add(rest === "" ? "." : `.${rest}`);
			}
		}
	};

	walk(packageDir);
	cache.set(packageDir, specifiers);
	return specifiers;
}
