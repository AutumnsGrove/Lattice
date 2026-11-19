#!/usr/bin/env tsx
/**
 * Fails when README.md's ecosystem tables and the repo disagree.
 *
 * README described meadow, terrarium and ivy for a year after they stopped
 * existing, and left Aspen — the core product app — out entirely (#1705). The
 * reason is structural: the tables were maintained by hand against memory.
 *
 * This checks the shape that issue settled on: one table per directory, columns
 * `Name | Path | Package | What it is`, path linked to the tracked directory.
 * Every row must be a directory in `git ls-tree HEAD`, every tracked directory
 * must have a row, and the package cell must match its package.json name.
 *
 * Run: pnpm readme:check
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const GROUPS = ["apps", "services", "workers", "libs", "tools"] as const;
type Group = (typeof GROUPS)[number];

/** Table order in the README, and the heading each one sits under. */
const SECTIONS: Record<string, Group> = {
	Apps: "apps",
	Services: "services",
	Workers: "workers",
	Libraries: "libs",
	Tools: "tools",
};

/** Paths in a group that are files rather than directories. */
const FILE_ENTRIES = new Set([".sh", ".ts", ".md"]);

interface Row {
	name: string;
	path: string;
	packageName: string;
}

function git(args: string[]): string {
	return execFileSync("git", args, { encoding: "utf8" });
}

/** Same, but a miss is an answer rather than a fatal on stderr. */
function gitQuiet(args: string[]): string | null {
	try {
		return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
	} catch {
		return null;
	}
}

function trackedEntries(group: Group): string[] {
	const out = git(["ls-tree", `HEAD:${group}`, "--name-only"]);
	const entries: string[] = [];
	for (const name of out.split("\n").filter(Boolean)) {
		const kind = git(["cat-file", "-t", `HEAD:${group}/${name}`]).trim();
		if (kind === "tree") entries.push(`${group}/${name}`);
		else if (kind === "blob" && [...FILE_ENTRIES].some((ext) => name.endsWith(ext))) {
			entries.push(`${group}/${name}`);
		}
	}
	return entries;
}

/** True when the path itself exists in HEAD — a nested package like `libs/shutter/cloudflare` counts. */
function isTracked(path: string): boolean {
	return gitQuiet(["cat-file", "-t", `HEAD:${path}`]) !== null;
}

/** README rows per group, parsed from the tables under each `### <Section>` heading. */
function readmeRows(readme: string): Map<Group, Row[]> {
	const rows = new Map<Group, Row[]>();
	let current: Group | null = null;
	let inTable = false;

	for (const line of readme.split("\n")) {
		const heading = /^###\s+(\w+)\s*$/.exec(line);
		if (heading) {
			current = SECTIONS[heading[1]] ?? null;
			inTable = false;
			continue;
		}
		if (/^#{2,3}\s/.test(line)) {
			current = null;
			inTable = false;
			continue;
		}
		if (!current) continue;

		if (!line.startsWith("|")) {
			inTable = false;
			continue;
		}
		// First pipe line is the header, second is the separator.
		if (!inTable) {
			inTable = true;
			continue;
		}
		if (/^\|\s*-/.test(line)) continue;

		const cells = line
			.split("|")
			.slice(1, -1)
			.map((cell) => cell.trim());
		if (cells.length < 3) continue;

		const pathMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(cells[1]);
		if (!pathMatch) continue;

		const list = rows.get(current) ?? [];
		list.push({
			name: cells[0],
			path: pathMatch[2].replace(/^\.\//, ""),
			packageName: cells[2].replace(/`/g, ""),
		});
		rows.set(current, list);
	}

	return rows;
}

function packageNameFor(path: string): string | null {
	const pkgPath = join(path, "package.json");
	if (!existsSync(pkgPath)) return null;
	const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
	return pkg.name ?? null;
}

function main(): void {
	const readme = readFileSync("README.md", "utf8");
	const rows = readmeRows(readme);
	const problems: string[] = [];

	for (const group of GROUPS) {
		const listed = rows.get(group) ?? [];
		const tracked = new Set(trackedEntries(group));
		const listedPaths = new Set<string>();

		if (listed.length === 0) {
			problems.push(`${group}: no table found in README.md (expected a "### ${group}" heading)`);
			continue;
		}

		for (const row of listed) {
			listedPaths.add(row.path);
			if (!isTracked(row.path)) {
				problems.push(`${group}: ${row.name} lists ${row.path}, which is not tracked in HEAD`);
				continue;
			}
			const actual = packageNameFor(row.path);
			if (actual && actual !== row.packageName) {
				problems.push(
					`${group}: ${row.path} says package \`${row.packageName}\` but package.json says \`${actual}\``,
				);
			}
		}

		for (const path of tracked) {
			// A nested path (`libs/shutter/cloudflare`) covers its parent directory.
			const covered = [...listedPaths].some(
				(listed) => listed === path || listed.startsWith(`${path}/`),
			);
			if (!covered) {
				problems.push(`${group}: ${path} is tracked but missing from README.md`);
			}
		}
	}

	if (problems.length > 0) {
		console.error("README.md and the repo disagree:\n");
		for (const problem of problems) console.error(`  ${problem}`);
		console.error(
			"\nFix the README, not this script. If a directory is being retired, its row goes too.",
		);
		process.exit(1);
	}

	console.log("README.md ecosystem tables match the repo.");
}

main();
