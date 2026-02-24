/**
 * Grove PR Impact
 *
 * Compares package file counts between a base snapshot and the current tree.
 * Shows only what changed — added, removed, or resized packages.
 *
 * Usage:
 *   node grove-visualization.mjs [root] --base base.json [--markdown] [--json]
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ─── Args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const ROOT =
	args.find(
		(a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--base",
	) || process.cwd();
const FORMAT = args.includes("--json")
	? "json"
	: args.includes("--markdown")
		? "markdown"
		: "plain";
const baseIdx = args.indexOf("--base");
const BASE_FILE = baseIdx !== -1 ? args[baseIdx + 1] : null;

// ─── Category config ─────────────────────────────────────────────────

const CATEGORIES = [
	{ dir: "apps", type: "app", label: "Apps", emoji: "🌳" },
	{ dir: "services", type: "service", label: "Services", emoji: "🌲" },
	{ dir: "workers", type: "worker", label: "Workers", emoji: "🌿" },
	{ dir: "libs", type: "lib", label: "Libraries", emoji: "🌴" },
];

const EMOJI_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.type, c.emoji]));

// ─── Count source files ──────────────────────────────────────────────

function countFiles(dir) {
	let count = 0;
	try {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.name.startsWith(".") || entry.name === "node_modules")
				continue;
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				count += countFiles(fullPath);
			} else if (/\.(ts|js|svelte|css|html|json|md)$/.test(entry.name)) {
				count++;
			}
		}
	} catch {
		// Permission errors, etc.
	}
	return count;
}

// ─── Discover packages ───────────────────────────────────────────────

function discoverPackages() {
	const packages = [];

	for (const cat of CATEGORIES) {
		const catDir = join(ROOT, cat.dir);
		if (!existsSync(catDir)) continue;

		for (const entry of readdirSync(catDir, { withFileTypes: true })) {
			if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

			const pkgDir = join(catDir, entry.name);
			let name = entry.name;
			try {
				const pkgJsonPath = join(pkgDir, "package.json");
				if (existsSync(pkgJsonPath)) {
					const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
					name =
						pkg.name
							?.replace(/^@autumnsgrove\//, "")
							.replace(/^grove-/, "") || entry.name;
				}
			} catch {
				// Use directory name
			}

			packages.push({
				name,
				dirName: entry.name,
				category: cat.type,
				categoryLabel: cat.label,
				fileCount: countFiles(pkgDir),
				path: `${cat.dir}/${entry.name}`,
			});
		}
	}

	return packages.sort((a, b) => b.fileCount - a.fileCount);
}

// ─── JSON snapshot ───────────────────────────────────────────────────

function toJSON(packages) {
	return JSON.stringify(
		{
			generated: new Date().toISOString(),
			packages: packages.map((p) => ({
				name: p.name,
				path: p.path,
				category: p.category,
				fileCount: p.fileCount,
			})),
		},
		null,
		2,
	);
}

// ─── Diff rendering ─────────────────────────────────────────────────

function computeDiff(headPackages, baseData) {
	const basePkgs = baseData.packages;
	const baseMap = new Map(basePkgs.map((p) => [p.path, p]));
	const headMap = new Map(headPackages.map((p) => [p.path, p]));

	const changes = [];
	const added = [];
	const removed = [];

	for (const hp of headPackages) {
		const bp = baseMap.get(hp.path);
		if (!bp) {
			added.push(hp);
		} else if (hp.fileCount !== bp.fileCount) {
			changes.push({
				name: hp.name,
				category: hp.category,
				path: hp.path,
				before: bp.fileCount,
				after: hp.fileCount,
				delta: hp.fileCount - bp.fileCount,
			});
		}
	}

	for (const bp of basePkgs) {
		if (!headMap.has(bp.path)) {
			removed.push(bp);
		}
	}

	changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

	const totalBefore = basePkgs.reduce((s, p) => s + p.fileCount, 0);
	const totalAfter = headPackages.reduce((s, p) => s + p.fileCount, 0);

	return { changes, added, removed, totalBefore, totalAfter };
}

function renderDiff(diff) {
	const { changes, added, removed, totalBefore, totalAfter } = diff;
	const totalDelta = totalAfter - totalBefore;
	const changedCount = changes.length + added.length + removed.length;
	const deltaStr = totalDelta >= 0 ? `+${totalDelta}` : String(totalDelta);
	const lines = [];

	if (changedCount === 0) {
		lines.push("No package size changes. The grove is unchanged. 🌿");
		return lines.join("\n");
	}

	lines.push(
		`${changedCount} package${changedCount !== 1 ? "s" : ""} affected · ${deltaStr} files net`,
	);
	lines.push("");

	if (changes.length > 0) {
		lines.push("  Package                Before    After    Delta");
		lines.push(
			"  ──────────────────────────────────────────────────",
		);
		for (const c of changes) {
			const emoji = EMOJI_MAP[c.category];
			const nameStr =
				c.name.length > 16 ? c.name.slice(0, 15) + "…" : c.name;
			const arrow = c.delta > 0 ? "▲" : "▼";
			const sign = c.delta > 0 ? "+" : "";
			lines.push(
				`  ${emoji} ${nameStr.padEnd(18)} ${String(c.before).padStart(5)}    ${String(c.after).padStart(5)}    ${sign}${c.delta} ${arrow}`,
			);
		}
		lines.push("");
	}

	if (added.length > 0) {
		for (const pkg of added) {
			lines.push(
				`  🌱 NEW: ${pkg.name} (${pkg.fileCount} files) — ${pkg.path}`,
			);
		}
		lines.push("");
	}

	if (removed.length > 0) {
		for (const pkg of removed) {
			lines.push(
				`  🍂 REMOVED: ${pkg.name} (was ${pkg.fileCount} files) — ${pkg.path}`,
			);
		}
		lines.push("");
	}

	lines.push(
		`  Total: ${totalBefore.toLocaleString()} → ${totalAfter.toLocaleString()} files (${deltaStr})`,
	);

	return lines.join("\n");
}

function toMarkdown(headPackages, diff, plainText) {
	const { totalBefore, totalAfter } = diff;
	const delta = totalAfter - totalBefore;
	const deltaStr = delta >= 0 ? `+${delta}` : String(delta);
	const changedCount =
		diff.changes.length + diff.added.length + diff.removed.length;

	let md = `## 🌲 The Grove — PR Impact\n\n`;

	if (changedCount === 0) {
		md += `*${headPackages.length} packages · ${totalAfter.toLocaleString()} files · no size changes*\n`;
		return md;
	}

	md += `*${headPackages.length} packages · ${totalAfter.toLocaleString()} files (${deltaStr} from base)*\n\n`;
	md += "```\n" + plainText + "\n```\n";
	return md;
}

// ─── Main ────────────────────────────────────────────────────────────

const packages = discoverPackages();

if (FORMAT === "json") {
	// Snapshot mode — used by workflow to capture base branch state
	console.log(toJSON(packages));
} else if (BASE_FILE) {
	// Diff mode — compare HEAD against base snapshot
	const baseData = JSON.parse(readFileSync(BASE_FILE, "utf-8"));
	const diff = computeDiff(packages, baseData);
	const plainText = renderDiff(diff);
	if (FORMAT === "markdown") {
		console.log(toMarkdown(packages, diff, plainText));
	} else {
		console.log(plainText);
	}
} else {
	console.error("Usage: grove-visualization.mjs [root] --base base.json [--markdown | --json]");
	console.error("  --json     Generate a snapshot (no --base needed)");
	console.error("  --base     Compare against a base snapshot");
	console.error("  --markdown Wrap output in GitHub-flavored markdown");
	process.exit(1);
}
