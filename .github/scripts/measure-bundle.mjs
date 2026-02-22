/**
 * Measure Bundle Sizes
 *
 * Walks a build output directory and produces a JSON report of file sizes.
 * Used by the bundle-size workflow to compare PR vs base branch.
 *
 * Usage: node measure-bundle.mjs <build-output-dir>
 * Output: JSON to stdout — { total: number, files: { [path]: size } }
 */

import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const buildDir = process.argv[2];

if (!buildDir) {
	console.error("Usage: node measure-bundle.mjs <build-output-dir>");
	process.exit(1);
}

const files = {};
let total = 0;

function walk(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const fullPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(fullPath);
		} else {
			const size = statSync(fullPath).size;
			const relPath = relative(buildDir, fullPath);
			// Only track JS, CSS, and HTML — skip images, fonts, etc.
			if (/\.(js|css|html|mjs)$/.test(entry.name)) {
				files[relPath] = size;
				total += size;
			}
		}
	}
}

try {
	walk(buildDir);
} catch (err) {
	if (err.code === "ENOENT") {
		// Build dir doesn't exist — return empty
		console.log(JSON.stringify({ total: 0, files: {} }));
		process.exit(0);
	}
	throw err;
}

console.log(JSON.stringify({ total, files }));
