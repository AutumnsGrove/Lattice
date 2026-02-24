/**
 * Grove Codebase Visualization
 *
 * Generates a compact, useful overview of the monorepo.
 * - Census mode (default): bar chart of package sizes, category breakdown
 * - PR diff mode (--base file.json): shows only changed packages with deltas
 *
 * Usage:
 *   node grove-visualization.mjs [root] [--markdown] [--json] [--base file.json]
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ─── Args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const ROOT =
	args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--base") ||
	process.cwd();
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
			if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
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
						pkg.name?.replace(/^@autumnsgrove\//, "").replace(/^grove-/, "") ||
						entry.name;
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

// ─── Bar rendering ───────────────────────────────────────────────────

function bar(value, max, width = 35) {
	if (max === 0) return "▏";
	const len = Math.max(1, Math.round((value / max) * width));
	return "█".repeat(len);
}

// ─── Census mode ─────────────────────────────────────────────────────

function renderCensus(packages) {
	const lines = [];
	const totalFiles = packages.reduce((s, p) => s + p.fileCount, 0);
	const maxFiles = packages[0]?.fileCount || 1;

	// Header
	lines.push("🌲 The Grove — Census");
	lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	lines.push(
		`${packages.length} packages · ${totalFiles.toLocaleString()} source files`,
	);
	lines.push("");

	// Category summary table
	lines.push("  Category          Packages     Files");
	lines.push("  ────────────────────────────────────────");
	for (const cat of CATEGORIES) {
		const pkgs = packages.filter((p) => p.category === cat.type);
		if (pkgs.length === 0) continue;
		const files = pkgs.reduce((s, p) => s + p.fileCount, 0);
		const label = `${cat.emoji} ${cat.label}`;
		lines.push(
			`  ${label.padEnd(20)} ${String(pkgs.length).padStart(4)}     ${String(files.toLocaleString()).padStart(5)}`,
		);
	}
	lines.push("  ────────────────────────────────────────");
	lines.push(
		`  ${"Total".padEnd(20)} ${String(packages.length).padStart(4)}     ${String(totalFiles.toLocaleString()).padStart(5)}`,
	);
	lines.push("");

	// Bar chart — top 10 packages
	lines.push("  Largest packages:");
	lines.push("");
	const top = packages.slice(0, 10);
	for (const pkg of top) {
		const nameStr =
			pkg.name.length > 14 ? pkg.name.slice(0, 13) + "…" : pkg.name;
		const countStr = String(pkg.fileCount).padStart(5);
		const b = bar(pkg.fileCount, maxFiles);
		lines.push(
			`  ${nameStr.padEnd(15)} ${countStr}  ${b} ${EMOJI_MAP[pkg.category]}`,
		);
	}

	// Remaining packages as compact note
	if (packages.length > 10) {
		const restFiles = packages
			.slice(10)
			.reduce((s, p) => s + p.fileCount, 0);
		lines.push("");
		lines.push(
			`  + ${packages.length - 10} more packages (${restFiles.toLocaleString()} files)`,
		);
	}

	lines.push("");
	return lines.join("\n");
}

// ─── PR diff mode ────────────────────────────────────────────────────

function renderDiff(headPackages, baseData) {
	const lines = [];
	const basePkgs = baseData.packages;
	const baseMap = new Map(basePkgs.map((p) => [p.path, p]));
	const headMap = new Map(headPackages.map((p) => [p.path, p]));

	// Compute changes
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

	const totalBefore = basePkgs.reduce((s, p) => s + p.fileCount, 0);
	const totalAfter = headPackages.reduce((s, p) => s + p.fileCount, 0);
	const totalDelta = totalAfter - totalBefore;
	const changedCount = changes.length + added.length + removed.length;
	const deltaStr = totalDelta >= 0 ? `+${totalDelta}` : String(totalDelta);

	// Header
	lines.push("🌲 The Grove — PR Impact");
	lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

	if (changedCount === 0) {
		lines.push("");
		lines.push("  No package size changes. The grove is unchanged. 🌿");
		lines.push("");
		lines.push(
			`  Total: ${totalAfter.toLocaleString()} files across ${headPackages.length} packages`,
		);
		lines.push("");
		return lines.join("\n");
	}

	lines.push(
		`${changedCount} package${changedCount !== 1 ? "s" : ""} affected · ${deltaStr} files net`,
	);
	lines.push("");

	// Changed packages table
	if (changes.length > 0) {
		changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
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

	// New packages
	if (added.length > 0) {
		for (const pkg of added) {
			lines.push(
				`  🌱 NEW: ${pkg.name} (${pkg.fileCount} files) — ${pkg.path}`,
			);
		}
		lines.push("");
	}

	// Removed packages
	if (removed.length > 0) {
		for (const pkg of removed) {
			lines.push(
				`  🍂 REMOVED: ${pkg.name} (was ${pkg.fileCount} files) — ${pkg.path}`,
			);
		}
		lines.push("");
	}

	// Total
	lines.push(
		`  Total: ${totalBefore.toLocaleString()} → ${totalAfter.toLocaleString()} files (${deltaStr})`,
	);
	lines.push("");
	return lines.join("\n");
}

// ─── JSON output ─────────────────────────────────────────────────────

function toJSON(packages) {
	const totalFiles = packages.reduce((s, p) => s + p.fileCount, 0);
	return JSON.stringify(
		{
			generated: new Date().toISOString(),
			summary: {
				totalPackages: packages.length,
				totalFiles,
				byCategory: Object.fromEntries(
					CATEGORIES.map((cat) => {
						const pkgs = packages.filter((p) => p.category === cat.type);
						return [
							cat.type,
							{
								count: pkgs.length,
								files: pkgs.reduce((s, p) => s + p.fileCount, 0),
							},
						];
					}),
				),
			},
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

// ─── Markdown wrappers ───────────────────────────────────────────────

function toMarkdownCensus(packages, plainText) {
	const totalFiles = packages.reduce((s, p) => s + p.fileCount, 0);

	let md = `## 🌲 The Grove — Codebase Visualization\n\n`;
	md += `*${packages.length} packages · ${totalFiles.toLocaleString()} source files*\n\n`;
	md += "```\n" + plainText + "\n```\n\n";

	// Full package table in collapsible section
	md += "<details><summary>All packages</summary>\n\n";
	md += "| Package | Type | Files | Path |\n";
	md += "| --- | --- | ---: | --- |\n";

	for (const pkg of packages) {
		md += `| ${EMOJI_MAP[pkg.category]} ${pkg.name} | ${pkg.categoryLabel} | ${pkg.fileCount} | \`${pkg.path}\` |\n`;
	}

	md += "\n</details>\n";
	return md;
}

function toMarkdownDiff(headPackages, baseData, plainText) {
	const totalAfter = headPackages.reduce((s, p) => s + p.fileCount, 0);
	const totalBefore = baseData.packages.reduce((s, p) => s + p.fileCount, 0);
	const delta = totalAfter - totalBefore;
	const deltaStr = delta >= 0 ? `+${delta}` : String(delta);

	let md = `## 🌲 The Grove — PR Impact\n\n`;
	md += `*${headPackages.length} packages · ${totalAfter.toLocaleString()} files (${deltaStr} from base)*\n\n`;
	md += "```\n" + plainText + "\n```\n";
	return md;
}

// ─── Main ────────────────────────────────────────────────────────────

const packages = discoverPackages();

if (FORMAT === "json") {
	console.log(toJSON(packages));
} else if (BASE_FILE) {
	// PR diff mode
	const baseData = JSON.parse(readFileSync(BASE_FILE, "utf-8"));
	const plainText = renderDiff(packages, baseData);
	if (FORMAT === "markdown") {
		console.log(toMarkdownDiff(packages, baseData, plainText));
	} else {
		console.log(plainText);
	}
} else {
	// Census mode
	const plainText = renderCensus(packages);
	if (FORMAT === "markdown") {
		console.log(toMarkdownCensus(packages, plainText));
	} else {
		console.log(plainText);
	}
}
