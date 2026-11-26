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
 *      `@autumnsgrove/lattice` specifiers it actually uses.
 *
 * Only re-exports are followed, not imports. An import cannot widen what a
 * consumer can name, and a file that is imported but not re-exported can only
 * change a value at runtime, never a type a consumer compiles against — and the
 * engine's `dist` is rebuilt for every affected run anyway. Following imports
 * would instead make the root barrel reach every helper in the tree, which is
 * the 27-packages-for-one-file behaviour this exists to stop.
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

/** `from "@autumnsgrove/lattice…"` and `import("@autumnsgrove/lattice…")`. */
const CONSUMER_RE = /(?:from\s*|import\s*\(\s*)["']@autumnsgrove\/lattice([^"']*)["']/g;

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
		// An exact key can point straight at a component rather than a barrel.
		if (bare.endsWith(".svelte") && existsSync(base)) return toRepo(root, base);
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
 * Resolve a relative specifier from inside one source file to a repo-relative
 * path, trying the extensions the bundler would.
 */
function resolveSpecifier(root, fromRepoPath, specifier) {
	if (!specifier.startsWith(".")) return null;

	const fromDir = posix.dirname(fromRepoPath);
	const joined = posix.normalize(posix.join(fromDir, specifier));
	const base = join(root, joined);

	// `./x.js` in source is usually `./x.ts` on disk — the specifier carries the
	// emitted extension, not the authored one.
	const candidates = [base];
	if (/\.js$/.test(base)) candidates.push(base.replace(/\.js$/, ".ts"));
	if (/\.js$/.test(base)) candidates.push(base.replace(/\.js$/, ".ts").replace(/\.ts$/, ".tsx"));

	for (const candidate of candidates) {
		for (const ext of [""].concat(RESOLVE_EXTS)) {
			if (ext && !candidate.endsWith(".svelte") && existsSync(candidate + ext)) {
				return toRepo(root, candidate + ext);
			}
			if (!ext && existsSync(candidate) && !candidate.endsWith("/")) {
				const stat = existsSync(candidate) ? candidate : null;
				if (stat && /\.(?:tsx?|jsx?|mjs|svelte)$/.test(stat)) return toRepo(root, stat);
			}
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
 */
function reexportClosure(root, entry, cache) {
	const seen = new Set();
	const queue = [entry];

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
			if (next && !seen.has(next)) queue.push(next);
		}
	}

	return seen;
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

	for (const [key, value] of Object.entries(exportsMap)) {
		if (key.includes("*")) {
			const patterns = targetsOf(value).map(targetPattern).filter(Boolean);
			if (patterns.length > 0) wildcards.push({ key, patterns });
			continue;
		}
		const entry = sourceEntryFor(root, targetsOf(value));
		if (entry) entries.set(key, { entry, closure: reexportClosure(root, entry, cache) });
	}

	return { root, entries, wildcards };
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

	return exposed;
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
			if (!/\.(?:tsx?|jsx?|mjs|cjs|svelte)$/.test(dirent.name)) continue;

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
