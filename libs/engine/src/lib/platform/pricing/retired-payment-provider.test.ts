import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * LemonSqueezy was planned, half-built, then abandoned — Stripe has been the live
 * payment provider since Feb 2026. The leftovers were not harmless: a checkout
 * builder nothing imported was still exported from a real, published subpath, and
 * the account-deletion skill pointed at columns that no longer exist. That is how
 * #1745 came to describe a cancellation path that could not possibly work.
 *
 * So this fails when the name comes back into anything that ships, or anything an
 * agent reads and trusts. History stays history: `docs/plans`, migrations,
 * `_archived/`, `snapshots/` and generated `dist/` are all out of scope.
 */

const RETIRED = /lemon[\s_-]*squeezy/i;
const SELF = "retired-payment-provider.test.ts";

/** Only these are read; anything else (fonts, images) cannot hold a provider name. */
const TEXT_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|svelte|md|json|toml|ya?ml)$/;
const SKIP_DIRS = new Set([
	"node_modules",
	"dist",
	"build",
	".svelte-kit",
	".wrangler",
	"coverage",
]);

interface Hit {
	file: string;
	line: number;
	text: string;
}

/**
 * Found by walking up rather than from `import.meta.url`: under Vite that is not
 * always a `file:` URL, and this package runs from the repo root and from its own
 * workspace. Same approach as `removal-policy.test.ts`.
 */
function repoRoot(): string {
	let dir = process.cwd();
	for (let depth = 0; depth < 8; depth++) {
		if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	throw new Error(`could not find the repo root above ${process.cwd()}`);
}

/** Every workspace package's `src/`, plus the two places people read as documentation. */
function scannedRoots(root: string): string[] {
	const roots: string[] = [];
	for (const group of ["libs", "apps", "services"]) {
		const groupDir = join(root, group);
		if (!existsSync(groupDir)) continue;
		for (const pkg of readdirSync(groupDir, { withFileTypes: true })) {
			if (!pkg.isDirectory()) continue;
			const src = join(groupDir, pkg.name, "src");
			if (existsSync(src)) roots.push(src);
		}
	}
	roots.push(join(root, ".claude", "skills"), join(root, "docs", "legal"));
	return roots;
}

function scanFile(path: string, root: string, hits: Hit[]): void {
	const lines = readFileSync(path, "utf8").split("\n");
	for (const [index, text] of lines.entries()) {
		if (RETIRED.test(text)) hits.push({ file: relative(root, path), line: index + 1, text });
	}
}

function scanDir(dir: string, root: string, hits: Hit[]): void {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === SELF) continue;
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) scanDir(path, root, hits);
		} else if (TEXT_FILE.test(entry.name)) {
			scanFile(path, root, hits);
		}
	}
}

function offenders(): Hit[] {
	const root = repoRoot();
	const hits: Hit[] = [];
	for (const dir of scannedRoots(root)) {
		if (existsSync(dir)) scanDir(dir, root, hits);
	}
	return hits;
}

function report(): string {
	const hits = offenders();
	if (hits.length === 0) return "";
	// The hint rides along in the failure message rather than as expect()'s second
	// argument, which the jest rules reject — `removal-policy.test.ts` predates them.
	return [
		"Stripe is the live provider; see #1746",
		...hits.map((hit) => `${hit.file}:${hit.line}  ${hit.text.trim()}`),
	].join("\n");
}

describe("retired payment provider", () => {
	it("is named nowhere in shipping code, skills, or legal documents", () => {
		expect(report()).toBe("");
	});
});
