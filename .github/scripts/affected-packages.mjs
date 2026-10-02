/**
 * Affected Packages Detection
 *
 * Given a list of changed files, determines which monorepo packages
 * need to be rebuilt and retested. Follows the dependency graph:
 *
 *   foliage/gossamer → engine → (all apps, some services/workers)
 *
 * Usage:
 *   node affected-packages.mjs <base-ref>
 *   node affected-packages.mjs main            # compare against main
 *   node affected-packages.mjs HEAD~1          # compare against last commit
 *
 * Output: JSON with affected package info + matrix for GitHub Actions
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const baseRef = process.argv[2] || "main";

// ─── Dependency graph ───────────────────────────────────────────────
// If package A changes, which packages need to rebuild?
// This is the REVERSE dependency map (what depends on me).

// Reverse dependency graph: if package A changes, which packages need to rebuild?
// Shared workspace libs (engine/foliage/gossamer/infra/prism) cascade to nearly
// every deployable, so they all share the same consumer list — a change to any
// of them should revalidate the fleet.
const ENGINE_CONSUMERS = [
	"apps/amber",
	"apps/aspen",
	"apps/billing",
	"apps/clearing",
	"apps/domains",
	"apps/ivy",
	"apps/landing",
	"apps/login",
	"apps/meadow",
	"apps/plant",
	"apps/terrarium",
	"services/amber",
	"services/billing-api",
	"services/durable-objects",
	"services/forage",
	"services/heartwood",
	"services/zephyr",
	"workers/onboarding",
	"workers/patina",
	"workers/reverie",
	"workers/reverie-exec",
	"workers/subscription-digest",
	"workers/vista-collector",
	"workers/warden",
];

const DEPENDENTS = {
	"libs/foliage": ["libs/engine"],
	"libs/gossamer": ["libs/engine"],
	"libs/engine": ENGINE_CONSUMERS,
	"libs/infra": ENGINE_CONSUMERS, // shared Vite config — affects every SvelteKit target
	"libs/prism": ENGINE_CONSUMERS, // design tokens + icon gateway
	"libs/shutter": [],
	"libs/grove-agent": ["workers/onboarding"], // sole consumer
};

// Package metadata: what type check command + whether it has tests
const PACKAGES = {
	"libs/engine": {
		typecheck: "pnpm check",
		hasTests: true,
		isSvelteKit: true,
	},
	"libs/foliage": { typecheck: "pnpm check", hasTests: true, isSvelteKit: true },
	"libs/gossamer": { typecheck: null, hasTests: false, isSvelteKit: false },
	"apps/landing": {
		typecheck: "pnpm check",
		hasTests: true,
		isSvelteKit: true,
	},
	"apps/plant": {
		typecheck: "pnpm check",
		hasTests: true,
		isSvelteKit: true,
	},
	"libs/prism": { typecheck: "pnpm check", hasTests: false, isSvelteKit: false },
	"libs/infra": { typecheck: "pnpm exec tsc --noEmit", hasTests: false, isSvelteKit: false },
	"libs/grove-agent": { typecheck: "pnpm exec tsc --noEmit", hasTests: true, isSvelteKit: false },
	"apps/amber": {
		typecheck: "pnpm check",
		hasTests: false,
		isSvelteKit: true,
	},
	"apps/aspen": {
		typecheck: "pnpm check",
		hasTests: false,
		isSvelteKit: true,
	},
	"apps/billing": {
		typecheck: "pnpm check",
		hasTests: false,
		isSvelteKit: true,
	},
	"apps/clearing": {
		typecheck: null,
		hasTests: true,
		isSvelteKit: true,
	},
	"apps/domains": {
		typecheck: "pnpm check",
		hasTests: false,
		isSvelteKit: true,
	},
	"apps/login": {
		typecheck: "pnpm check",
		hasTests: true,
		isSvelteKit: true,
	},
	"services/amber": {
		typecheck: "pnpm exec tsc --noEmit",
		hasTests: false,
		isSvelteKit: false,
	},
	"services/billing-api": {
		typecheck: "pnpm exec tsc --noEmit",
		hasTests: false,
		isSvelteKit: false,
	},
	"services/durable-objects": {
		typecheck: "pnpm exec tsc --noEmit",
		hasTests: false,
		isSvelteKit: false,
	},
	"services/forage": {
		typecheck: "pnpm exec tsc --noEmit",
		hasTests: false,
		isSvelteKit: false,
	},
	"services/heartwood": {
		typecheck: "pnpm exec tsc --noEmit",
		hasTests: true,
		isSvelteKit: false,
	},
	"services/grove-router": {
		typecheck: "pnpm exec tsc --noEmit",
		hasTests: true,
		isSvelteKit: false,
	},
	"services/zephyr": {
		typecheck: "pnpm run typecheck",
		hasTests: true,
		isSvelteKit: false,
	},
	"services/og-worker": {
		typecheck: null,
		hasTests: false,
		isSvelteKit: false,
	},
	"services/email-render": {
		typecheck: null,
		hasTests: false,
		isSvelteKit: false,
	},
	"workers/lumen": {
		typecheck: "pnpm exec tsc --noEmit",
		hasTests: true,
		isSvelteKit: false,
	},
	"workers/warden": {
		typecheck: "pnpm exec tsc --noEmit",
		hasTests: false,
		isSvelteKit: false,
	},
	"workers/vista-collector": {
		typecheck: "pnpm exec tsc --noEmit",
		hasTests: false,
		isSvelteKit: false,
	},
	"workers/email-catchup": {
		typecheck: "pnpm exec tsc --noEmit",
		hasTests: true,
		isSvelteKit: false,
	},
	"workers/webhook-cleanup": {
		typecheck: null,
		hasTests: false,
		isSvelteKit: false,
	},
	"workers/onboarding": {
		typecheck: "pnpm exec tsc --noEmit",
		hasTests: false,
		isSvelteKit: false,
	},
	"workers/patina": {
		typecheck: "pnpm exec tsc --noEmit",
		hasTests: false,
		isSvelteKit: false,
	},
	"workers/subscription-digest": {
		typecheck: "pnpm exec tsc --noEmit",
		hasTests: false,
		isSvelteKit: false,
	},
	"workers/pulse-collector": {
		typecheck: "pnpm exec tsc --noEmit",
		hasTests: false,
		isSvelteKit: false,
	},
};

// ─── Get changed files from git ─────────────────────────────────────

function getChangedFiles() {
	try {
		const output = execSync(`git diff --name-only ${baseRef}...HEAD`, {
			encoding: "utf-8",
		}).trim();
		if (!output) return [];
		return output.split("\n");
	} catch {
		// Fallback: compare against HEAD~1
		try {
			const output = execSync("git diff --name-only HEAD~1", {
				encoding: "utf-8",
			}).trim();
			if (!output) return [];
			return output.split("\n");
		} catch {
			return [];
		}
	}
}

// ─── Map files to packages ──────────────────────────────────────────

function fileToPackage(file) {
	// Match apps/X/**, services/X/**, workers/X/**, libs/X/**
	const match = file.match(/^(apps|services|workers|libs)\/([^/]+)\//);
	if (match) {
		return `${match[1]}/${match[2]}`;
	}
	return null;
}

// ─── Resolve transitive dependents ──────────────────────────────────

function resolveAffected(directlyChanged) {
	const affected = new Set(directlyChanged);
	let changed = true;

	while (changed) {
		changed = false;
		for (const pkg of [...affected]) {
			const deps = DEPENDENTS[pkg] || [];
			for (const dep of deps) {
				if (!affected.has(dep)) {
					affected.add(dep);
					changed = true;
				}
			}
		}
	}

	return affected;
}

// ─── Root-level changes affect everything ───────────────────────────

function hasRootChanges(files) {
	return files.some(
		(f) =>
			f === "package.json" ||
			f === "pnpm-lock.yaml" ||
			f === "tsconfig.json" ||
			f.startsWith("scripts/"),
	);
}

// ─── Main ───────────────────────────────────────────────────────────

const changedFiles = getChangedFiles();

if (changedFiles.length === 0) {
	console.log(
		JSON.stringify({
			changedFiles: [],
			affectedPackages: [],
			runAll: false,
			needsEngine: false,
			testMatrix: [],
			typecheckMatrix: [],
		}),
	);
	process.exit(0);
}

// Check for root-level changes
const runAll = hasRootChanges(changedFiles);

// Map changed files to packages
const directlyChanged = new Set();
for (const file of changedFiles) {
	const pkg = fileToPackage(file);
	if (pkg && PACKAGES[pkg]) {
		directlyChanged.add(pkg);
	}
}

// Resolve transitive dependents
const affected = runAll ? new Set(Object.keys(PACKAGES)) : resolveAffected(directlyChanged);

// Check if engine build is needed — only if engine itself or an actual
// engine dependent is affected (not every arbitrary package)
const engineDependents = new Set(DEPENDENTS["libs/engine"] || []);
const needsEngine =
	runAll || affected.has("libs/engine") || [...affected].some((pkg) => engineDependents.has(pkg));

// Build matrices for GitHub Actions
const testMatrix = [];
const typecheckMatrix = [];

for (const pkg of [...affected].sort()) {
	const meta = PACKAGES[pkg];
	if (!meta) continue;

	// Verify the package actually exists
	if (!existsSync(pkg)) continue;

	if (meta.hasTests) {
		testMatrix.push({
			package: pkg,
			name: pkg.split("/").pop(),
			isSvelteKit: meta.isSvelteKit,
		});
	}

	if (meta.typecheck) {
		typecheckMatrix.push({
			package: pkg,
			name: pkg.split("/").pop(),
			command: meta.typecheck,
			isSvelteKit: meta.isSvelteKit,
		});
	}
}

const result = {
	changedFiles: changedFiles.length,
	directlyChanged: [...directlyChanged],
	affectedPackages: [...affected].sort(),
	runAll,
	needsEngine,
	testMatrix,
	typecheckMatrix,
};

console.log(JSON.stringify(result));
