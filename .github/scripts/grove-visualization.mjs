/**
 * Grove Codebase Visualization
 *
 * Generates an ASCII art grove/forest representing the monorepo structure.
 * Each package becomes a tree — size proportional to file count,
 * shape based on package type (app, service, worker, lib).
 *
 * Usage: node grove-visualization.mjs [--markdown] [--json]
 *
 * The grove grows with your codebase. Every package is a tree in the forest.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = process.argv[2] || process.cwd();
const FORMAT = process.argv.includes("--json")
	? "json"
	: process.argv.includes("--markdown")
		? "markdown"
		: "plain";

// ─── Tree shapes ────────────────────────────────────────────────────
// Each tree type has layers that scale with size.
// Art is bottom-up: trunk first, then canopy layers smallest to largest.

const TREE_STYLES = {
	// Apps — full deciduous trees with broad canopies
	app: {
		emoji: "🌳",
		trunk: "  |  ",
		layers: [
			"  *  ",
			" /|\\ ",
			"/ | \\",
			" /|\\ ",
			"/||\\\\",
		],
		crown: "  🍂 ",
	},
	// Services — tall evergreen conifers
	service: {
		emoji: "🌲",
		trunk: "  |  ",
		layers: [
			"  *  ",
			" /|\\ ",
			" /|\\ ",
			"//|\\\\",
			"//|\\\\",
		],
		crown: "  ⭐ ",
	},
	// Workers — small flowering bushes
	worker: {
		emoji: "🌿",
		trunk: "  |  ",
		layers: [
			"  .  ",
			" .|. ",
			".|.|.",
		],
		crown: "  🌸 ",
	},
	// Libs — ancient deep-rooted trees
	lib: {
		emoji: "🌴",
		trunk: "  |  ",
		layers: [
			"  *  ",
			" *** ",
			" /|\\ ",
			"/ | \\",
			"//|\\\\",
			"/|||\\",
		],
		crown: "  🍃 ",
	},
};

// ─── Count files in a directory ─────────────────────────────────────

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

// ─── Discover packages ──────────────────────────────────────────────

function discoverPackages() {
	const categories = [
		{ dir: "apps", type: "app", label: "Apps" },
		{ dir: "services", type: "service", label: "Services" },
		{ dir: "workers", type: "worker", label: "Workers" },
		{ dir: "libs", type: "lib", label: "Libs" },
	];

	const packages = [];

	for (const cat of categories) {
		const catDir = join(ROOT, cat.dir);
		if (!existsSync(catDir)) continue;

		for (const entry of readdirSync(catDir, { withFileTypes: true })) {
			if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

			const pkgDir = join(catDir, entry.name);
			const pkgJsonPath = join(pkgDir, "package.json");

			let name = entry.name;
			try {
				if (existsSync(pkgJsonPath)) {
					const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
					name = pkg.name
						? pkg.name.replace(/^@autumnsgrove\//, "").replace(/^grove-/, "")
						: entry.name;
				}
			} catch {
				// Use directory name
			}

			const fileCount = countFiles(pkgDir);

			packages.push({
				name,
				dirName: entry.name,
				category: cat.type,
				categoryLabel: cat.label,
				fileCount,
				path: `${cat.dir}/${entry.name}`,
			});
		}
	}

	return packages.sort((a, b) => b.fileCount - a.fileCount);
}

// ─── Generate a single ASCII tree ───────────────────────────────────

function generateTree(pkg) {
	const style = TREE_STYLES[pkg.category];
	// Tree height scales with file count (min 2 layers, max all layers)
	const maxLayers = style.layers.length;
	const heightRatio = Math.min(pkg.fileCount / 80, 1); // 80+ files = full height
	const layerCount = Math.max(2, Math.round(heightRatio * maxLayers));

	const lines = [];

	// Crown
	lines.push(style.crown);

	// Canopy layers (top to bottom = smallest to largest)
	const selectedLayers = style.layers.slice(0, layerCount);
	for (const layer of selectedLayers) {
		lines.push(layer);
	}

	// Trunk
	lines.push(style.trunk);
	if (pkg.fileCount > 40) lines.push(style.trunk); // Taller trunk for big packages

	// Label
	const label = pkg.name.length > 9 ? pkg.name.slice(0, 8) + "…" : pkg.name;
	lines.push(label.padStart(Math.floor((5 + label.length) / 2)).padEnd(5));

	return lines;
}

// ─── Compose the full grove ─────────────────────────────────────────

function composeGrove(packages) {
	const output = [];

	// Title
	output.push("");
	output.push("  ╔══════════════════════════════════════════════════════╗");
	output.push("  ║            🌲  THE GROVE  🌲                        ║");
	output.push("  ║         a living codebase map                       ║");
	output.push("  ╚══════════════════════════════════════════════════════╝");
	output.push("");

	// Group by category
	const groups = {};
	for (const pkg of packages) {
		if (!groups[pkg.categoryLabel]) groups[pkg.categoryLabel] = [];
		groups[pkg.categoryLabel].push(pkg);
	}

	for (const [label, pkgs] of Object.entries(groups)) {
		const style = TREE_STYLES[pkgs[0].category];

		output.push(`  ── ${style.emoji} ${label} ${"─".repeat(45 - label.length)}`);
		output.push("");

		// Render trees side by side (up to 6 per row)
		const TREES_PER_ROW = 6;
		const COL_WIDTH = 11;

		for (let i = 0; i < pkgs.length; i += TREES_PER_ROW) {
			const row = pkgs.slice(i, i + TREES_PER_ROW);
			const trees = row.map((pkg) => generateTree(pkg));

			// Find max height in this row
			const maxHeight = Math.max(...trees.map((t) => t.length));

			// Pad all trees to same height (top-pad with spaces)
			const padded = trees.map((tree) => {
				const pad = maxHeight - tree.length;
				return [...Array(pad).fill("     "), ...tree];
			});

			// Render row line by line
			for (let line = 0; line < maxHeight; line++) {
				const rowLine = padded
					.map((tree) => {
						const cell = tree[line] || "     ";
						return cell.padEnd(COL_WIDTH);
					})
					.join(" ");
				output.push("    " + rowLine);
			}

			// File counts under the trees
			const counts = row
				.map((pkg) => {
					const count = `${pkg.fileCount}f`;
					return count.padStart(Math.floor((COL_WIDTH + count.length) / 2)).padEnd(COL_WIDTH);
				})
				.join(" ");
			output.push("    " + counts);

			// Ground line
			const ground = row.map(() => "───────────").join("─");
			output.push("    " + ground);
			output.push("");
		}
	}

	// Summary stats
	const totalFiles = packages.reduce((sum, p) => sum + p.fileCount, 0);
	const totalPkgs = packages.length;

	output.push("  ── 📊 Forest Census ─────────────────────────────────");
	output.push("");
	output.push(`    🌳 ${groups["Apps"]?.length || 0} apps`);
	output.push(`    🌲 ${groups["Services"]?.length || 0} services`);
	output.push(`    🌿 ${groups["Workers"]?.length || 0} workers`);
	output.push(`    🌴 ${groups["Libs"]?.length || 0} libraries`);
	output.push(`    ─────────────────────`);
	output.push(`    📦 ${totalPkgs} packages · ${totalFiles.toLocaleString()} files`);
	output.push("");

	// Legend
	output.push("  ── 📖 Legend ────────────────────────────────────────");
	output.push("");
	output.push("    Tree height = file count (taller = more files)");
	output.push("    🌳 App (user-facing)   🌲 Service (backend)");
	output.push("    🌿 Worker (background) 🌴 Library (shared)");
	output.push("");

	return output.join("\n");
}

// ─── JSON output for programmatic use ───────────────────────────────

function toJSON(packages) {
	const totalFiles = packages.reduce((sum, p) => sum + p.fileCount, 0);
	return JSON.stringify(
		{
			generated: new Date().toISOString(),
			summary: {
				totalPackages: packages.length,
				totalFiles,
				byCategory: Object.fromEntries(
					["app", "service", "worker", "lib"].map((cat) => {
						const pkgs = packages.filter((p) => p.category === cat);
						return [
							cat,
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

// ─── Markdown wrapper ───────────────────────────────────────────────

function toMarkdown(packages, asciiGrove) {
	const totalFiles = packages.reduce((sum, p) => sum + p.fileCount, 0);

	let md = "## 🌲 The Grove — Codebase Visualization\n\n";
	md += `*${packages.length} packages · ${totalFiles.toLocaleString()} source files*\n\n`;
	md += "```\n";
	md += asciiGrove;
	md += "\n```\n\n";

	// Package table
	md += "<details><summary>Package details</summary>\n\n";
	md += "| Package | Type | Files | Path |\n";
	md += "| --- | --- | ---: | --- |\n";

	for (const pkg of packages) {
		const emoji =
			pkg.category === "app"
				? "🌳"
				: pkg.category === "service"
					? "🌲"
					: pkg.category === "worker"
						? "🌿"
						: "🌴";
		md += `| ${emoji} ${pkg.name} | ${pkg.categoryLabel} | ${pkg.fileCount} | \`${pkg.path}\` |\n`;
	}

	md += "\n</details>\n";
	return md;
}

// ─── Main ───────────────────────────────────────────────────────────

const packages = discoverPackages();
const asciiGrove = composeGrove(packages);

if (FORMAT === "json") {
	console.log(toJSON(packages));
} else if (FORMAT === "markdown") {
	console.log(toMarkdown(packages, asciiGrove));
} else {
	console.log(asciiGrove);
}
