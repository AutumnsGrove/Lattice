import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * Three fonts (Calistoga, Luciole, Merriweather) were committed as GitHub
 * "Page not found" pages with a `.ttf` name, in the commit that added them, and
 * stayed that way for a year (#1648). Nothing complained: the browser rejects
 * the file and silently draws a fallback, so the only symptom was the wrong
 * typeface with no error in any console.
 *
 * The pre-commit hook checks staged font files, but hooks are per-machine
 * (`core.hooksPath`) and CI never runs them. This is the same check where CI
 * will see it.
 */

/** TTF · TTF ('true') · OTF · WOFF · WOFF2 · collection */
const FONT_HEADERS = new Set([
	0x00010000, 0x74727565, 0x4f54544f, 0x774f4646, 0x774f4632, 0x74746366,
]);
const FONT_FILE = /\.(ttf|otf|woff2?|ttc)$/i;

/** Found by walking up for the workspace manifest; `import.meta.url` is not always a file URL under Vite. */
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

/** Every `apps/<name>/static/fonts` and `libs/<name>/static/fonts` on disk. */
function fontDirs(root: string): string[] {
	const dirs: string[] = [];
	for (const group of ["apps", "libs"]) {
		const groupDir = join(root, group);
		if (!existsSync(groupDir)) continue;
		for (const pkg of readdirSync(groupDir, { withFileTypes: true })) {
			if (!pkg.isDirectory()) continue;
			const dir = join(groupDir, pkg.name, "static", "fonts");
			if (existsSync(dir)) dirs.push(dir);
		}
	}
	return dirs;
}

interface Impostor {
	file: string;
	header: string;
}

function impostors(): Impostor[] {
	const root = repoRoot();
	const found: Impostor[] = [];

	for (const dir of fontDirs(root)) {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (!entry.isFile() || !FONT_FILE.test(entry.name)) continue;
			const path = join(dir, entry.name);
			const head = readFileSync(path).subarray(0, 4);
			// A file shorter than four bytes has no header to read, which is a failure
			// in its own right (and `readUInt32BE` would throw rather than report).
			if (head.length === 4 && FONT_HEADERS.has(head.readUInt32BE(0))) continue;
			found.push({
				file: relative(root, path),
				header: [...head].map((b) => b.toString(16).padStart(2, "0")).join(" "),
			});
		}
	}

	return found;
}

describe("static font files", () => {
	it("are real fonts, not saved error pages", () => {
		const bad = impostors();
		const report = bad.length
			? [
					"These files are named like fonts but do not start with a font header.",
					"Most likely they are an HTML error page saved from a dead download link;",
					"a browser will reject them and silently draw a fallback (see #1648).",
					...bad.map((hit) => `${hit.file}  header: ${hit.header}`),
				].join("\n")
			: "";

		expect(report).toBe("");
	});
});
