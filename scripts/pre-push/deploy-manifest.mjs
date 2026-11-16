#!/usr/bin/env node
/**
 * Deploy Manifest Parser
 *
 * Single source of truth for which services get PR-time deploy validation.
 * Parses .github/workflows/deploy-*.yml shims at runtime — no separate
 * manifest file to drift.
 *
 * Usage:
 *   node scripts/pre-push/deploy-manifest.mjs               # summary
 *   node scripts/pre-push/deploy-manifest.mjs --matrix      # GH Actions matrix JSON
 *   node scripts/pre-push/deploy-manifest.mjs --drift       # drift report (exit 1 on issues)
 *   node scripts/pre-push/deploy-manifest.mjs --affected <ref>  # filter to affected
 *   node scripts/pre-push/deploy-manifest.mjs --json        # full structured dump
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const WORKFLOWS_DIR = join(REPO_ROOT, ".github", "workflows");
const WRANGLER_ROOTS = ["apps", "services", "workers", "libs"];

// ─── Shim parser ────────────────────────────────────────────────────
// Lattice deploy shims are deterministic: top-level `name`, `on.push.paths`,
// `jobs.deploy.uses`, `jobs.deploy.with.*`. A full YAML parser is overkill
// and would need a dep. Minimal line-based extraction handles every shim.

export function parseShim(content, filePath) {
	const result = {
		file: basename(filePath),
		name: null,
		kind: "custom", // "pages" | "worker" | "custom"
		template: null,
		triggers: {
			push: false,
			pullRequest: false,
			workflowDispatch: false,
			workflowRun: false,
			paths: [],
		},
		with: {},
	};

	const lines = content.split("\n");
	let section = null; // "on" | "on.push" | "jobs" | "jobs.deploy" | "with"
	let inPaths = false;

	for (const raw of lines) {
		// Strip inline/line comments. Fine for shims (no URLs in values).
		const line = raw.replace(/(^|\s)#.*$/, "").trimEnd();
		if (!line.trim()) continue;

		const nameMatch = line.match(/^name:\s*(.*)$/);
		if (nameMatch) {
			result.name = nameMatch[1].trim();
			continue;
		}

		if (/^on:\s*$/.test(line)) {
			section = "on";
			inPaths = false;
			continue;
		}
		if (/^jobs:\s*$/.test(line)) {
			section = "jobs";
			inPaths = false;
			continue;
		}

		if (section === "on" || section === "on.push") {
			if (/^ {2}push:/.test(line)) {
				section = "on.push";
				continue;
			}
			if (/^ {2}pull_request:/.test(line)) {
				result.triggers.pullRequest = true;
				continue;
			}
			if (/^ {2}workflow_dispatch:/.test(line)) {
				result.triggers.workflowDispatch = true;
				continue;
			}
			if (/^ {2}workflow_run:/.test(line)) {
				result.triggers.workflowRun = true;
				continue;
			}

			if (section === "on.push") {
				result.triggers.push = true;
				if (/^ {4}paths:/.test(line)) {
					inPaths = true;
					continue;
				}
				if (inPaths) {
					const m = line.match(/^\s+-\s+["']?([^"']+)["']?$/);
					if (m) {
						result.triggers.paths.push(m[1]);
						continue;
					}
					// Dedent: back out of paths block
					if (/^ {4}\w/.test(line) || /^ {2}\w/.test(line)) inPaths = false;
				}
			}
		}

		if (section === "jobs" || section === "jobs.deploy" || section === "with") {
			// First sub-key of jobs: (e.g. `  deploy:` or `  build-and-migrate:`)
			if (/^ {2}[\w-]+:\s*$/.test(line) && section === "jobs") {
				section = "jobs.deploy";
				continue;
			}

			if (section === "jobs.deploy" || section === "with") {
				const usesMatch = line.match(/^ {4}uses:\s*(\S+)$/);
				if (usesMatch) {
					result.template = usesMatch[1];
					if (usesMatch[1].includes("_deploy-pages.yml")) result.kind = "pages";
					else if (usesMatch[1].includes("_deploy-worker.yml")) result.kind = "worker";
					continue;
				}
				if (/^ {4}with:\s*$/.test(line)) {
					section = "with";
					continue;
				}

				if (section === "with") {
					const kv = line.match(/^ {6}([\w-]+):\s*(.*)$/);
					if (kv) {
						const key = kv[1];
						let value = kv[2].trim();
						if (/^["'].*["']$/.test(value)) value = value.slice(1, -1);
						if (value === "true") value = true;
						else if (value === "false") value = false;
						result.with[key] = value;
						continue;
					}
					// Exited with: block (e.g. "    secrets: inherit")
					if (/^ {4}\w/.test(line)) section = "jobs.deploy";
				}
			}
		}
	}

	// Derived fields
	result.service = basename(filePath)
		.replace(/^deploy-/, "")
		.replace(/\.yml$/, "");
	result.path =
		result.kind === "pages"
			? result.with["app-dir"] || null
			: result.kind === "worker"
				? result.with["worker-dir"] || null
				: null;
	// Custom workflows (non-shims) infer path from their first monorepo trigger path.
	// Keeps drift detection accurate while deploy-engine.yml remains custom.
	if (!result.path && result.kind === "custom") {
		const candidate = result.triggers.paths.find((p) =>
			/^(apps|services|workers|libs)\/[^/]+\/\*\*$/.test(p),
		);
		if (candidate) result.path = candidate.replace(/\/\*\*$/, "");
	}
	result.destructive = {
		migrations: result.with["run-migrations"] === true,
		preDeploy:
			typeof result.with["pre-deploy-command"] === "string" &&
			result.with["pre-deploy-command"] !== "",
	};

	return result;
}

// ─── Discovery ──────────────────────────────────────────────────────

export function parseAllShims(workflowsDir = WORKFLOWS_DIR) {
	const files = readdirSync(workflowsDir)
		.filter((f) => /^deploy-.*\.yml$/.test(f) && !/^_deploy-/.test(f))
		.sort();
	return files.map((f) =>
		parseShim(readFileSync(join(workflowsDir, f), "utf8"), join(workflowsDir, f)),
	);
}

export function findWranglerConfigs(repoRoot = REPO_ROOT) {
	const configs = [];
	for (const topDir of WRANGLER_ROOTS) {
		const abs = join(repoRoot, topDir);
		if (!existsSync(abs)) continue;
		for (const sub of readdirSync(abs)) {
			const subAbs = join(abs, sub);
			try {
				if (!statSync(subAbs).isDirectory()) continue;
			} catch {
				continue;
			}
			const wranglerPath = join(subAbs, "wrangler.toml");
			if (!existsSync(wranglerPath)) continue;
			const content = readFileSync(wranglerPath, "utf8");
			const nameMatch = content.match(/^name\s*=\s*["']([^"']+)["']/m);
			configs.push({
				dir: `${topDir}/${sub}`,
				path: `${topDir}/${sub}/wrangler.toml`,
				name: nameMatch ? nameMatch[1] : null,
			});
		}
	}
	return configs;
}

// ─── Drift detection ────────────────────────────────────────────────

export function detectDrift(shims, wranglers, repoRoot = REPO_ROOT) {
	const shimPaths = new Set(shims.map((s) => s.path).filter(Boolean));
	const wranglerDirs = new Set(wranglers.map((w) => w.dir));

	const missingWrangler = shims
		.filter((s) => s.path && !wranglerDirs.has(s.path))
		.map((s) => ({ shim: s.file, expected: `${s.path}/wrangler.toml` }));

	const orphanedWrangler = wranglers
		.filter((w) => !shimPaths.has(w.dir))
		.map((w) => ({ wrangler: w.path, dir: w.dir, name: w.name }));

	// A path trigger that no longer exists is the quiet failure: the shim still
	// runs, still passes, and the worker it deploys is simply never rebuilt for
	// the code that changed. deploy-lumen.yml kept `libs/engine/src/lib/lumen/**`
	// long after the folder moved to `libs/engine/src/lib/ai/lumen/`, so the
	// Lumen router shipped in #1704 needed a manual workflow_dispatch.
	const stalePath = [];
	for (const shim of shims) {
		for (const pattern of shim.triggers?.paths ?? []) {
			const dir = pattern.replace(/\/\*\*$/, "");
			// Only directory globs, and only ones that look like repo paths —
			// exact file triggers are checked by git at push time instead.
			if (dir === pattern || !/^(apps|services|workers|libs|scripts|tools)\//.test(dir)) continue;
			if (!existsSync(join(repoRoot, dir))) {
				stalePath.push({ shim: shim.file, pattern, dir });
			}
		}
	}

	return { missingWrangler, orphanedWrangler, stalePath };
}

// ─── Affected filtering ─────────────────────────────────────────────

export function getChangedFiles(baseRef) {
	try {
		const out = execSync(`git diff --name-only ${baseRef}...HEAD`, { encoding: "utf8" }).trim();
		return out ? out.split("\n") : [];
	} catch {
		return [];
	}
}

function matchGlob(pattern, file) {
	// Handles "apps/foo/**", "libs/engine/**", "package.json". Good enough for
	// Lattice shims — ALL existing path triggers are either exact files or
	// trailing-/** globs.
	//
	// ⚠ Limitation: does NOT handle mid-path wildcards like "apps/*/src/**".
	// Those would reduce to "apps//src/" and match nothing, causing affected
	// detection to silently miss a shim. If a shim ever adds such a pattern,
	// either expand this or use a real glob library.
	const p = pattern.replace(/\/\*\*$/, "/").replace(/\*/g, "");
	return file === p || file === pattern || file.startsWith(p);
}

export function filterAffected(shims, baseRef) {
	const changed = getChangedFiles(baseRef);
	if (changed.length === 0) return [];

	const workerTemplateChanged = changed.includes(".github/workflows/_deploy-worker.yml");
	const pagesTemplateChanged = changed.includes(".github/workflows/_deploy-pages.yml");

	return shims.filter((shim) => {
		if (workerTemplateChanged && shim.template?.includes("_deploy-worker.yml")) return true;
		if (pagesTemplateChanged && shim.template?.includes("_deploy-pages.yml")) return true;
		for (const pattern of shim.triggers.paths) {
			if (changed.some((f) => matchGlob(pattern, f))) return true;
		}
		if (shim.path && changed.some((f) => f.startsWith(shim.path + "/"))) return true;
		return false;
	});
}

// ─── Matrix builder ─────────────────────────────────────────────────

export function buildMatrix(shims) {
	return shims
		.filter((s) => s.kind !== "custom" && s.path)
		.map((s) => ({
			name: s.service,
			path: s.path,
			kind: s.kind,
			"needs-engine": s.with["needs-engine"] === true,
			"needs-foliage": s.with["needs-foliage"] === true,
			"run-build": s.with["run-build"] === true,
			"run-typecheck": s.with["run-typecheck"] !== false,
			// Default run-deploy is true (matches _deploy-worker.yml default).
			// Only engine currently sets this to false — library-only target.
			"run-deploy": s.with["run-deploy"] !== false,
			"typecheck-command": s.with["typecheck-command"] || "",
			"project-name": s.with["project-name"] || "",
			// Destructive flags — validator MUST skip these in dry-run
			"skip-migrations": s.destructive.migrations,
			"skip-pre-deploy": s.destructive.preDeploy,
		}));
}

// ─── CLI ────────────────────────────────────────────────────────────

function main() {
	const args = process.argv.slice(2);
	const flags = {
		matrix: args.includes("--matrix"),
		drift: args.includes("--drift"),
		json: args.includes("--json"),
	};
	const affectedIdx = args.indexOf("--affected");
	const affected = affectedIdx >= 0 ? args[affectedIdx + 1] : null;

	const shims = parseAllShims();
	const wranglers = findWranglerConfigs();
	const filtered = affected ? filterAffected(shims, affected) : shims;

	if (flags.matrix) {
		console.log(JSON.stringify({ include: buildMatrix(filtered) }));
		return;
	}

	if (flags.drift) {
		const drift = detectDrift(shims, wranglers);
		let hasIssues = false;
		if (drift.missingWrangler.length > 0) {
			console.error("❌ Shims pointing to a path with no wrangler.toml:");
			for (const m of drift.missingWrangler) console.error(`   ${m.shim} → expects ${m.expected}`);
			hasIssues = true;
		}
		if (drift.orphanedWrangler.length > 0) {
			console.error("❌ wrangler.toml with no matching deploy-*.yml shim:");
			for (const o of drift.orphanedWrangler) {
				console.error(`   ${o.wrangler} (${o.name || "unnamed"})`);
			}
			hasIssues = true;
		}
		if (drift.stalePath.length > 0) {
			console.error("❌ deploy shim path triggers pointing at directories that do not exist:");
			for (const s of drift.stalePath) {
				console.error(`   ${s.shim} → ${s.pattern} (${s.dir} is missing)`);
			}
			hasIssues = true;
		}
		if (!hasIssues)
			console.log(
				`✓ No drift — ${shims.length} shims matched against ${wranglers.length} wrangler.toml files`,
			);
		process.exit(hasIssues ? 1 : 0);
	}

	if (flags.json) {
		console.log(
			JSON.stringify({ shims: filtered, wranglers, drift: detectDrift(shims, wranglers) }, null, 2),
		);
		return;
	}

	// Default human summary
	console.log(
		`${filtered.length}/${shims.length} deploy shims${affected ? ` affected since ${affected}` : ""}:\n`,
	);
	for (const s of filtered) {
		const dx = s.destructive.migrations ? " [D1]" : s.destructive.preDeploy ? " [pre-deploy]" : "";
		console.log(`  ${s.service.padEnd(22)} ${s.kind.padEnd(7)} ${s.path || "(custom)"}${dx}`);
	}
	const drift = detectDrift(shims, wranglers);
	const driftCount =
		drift.missingWrangler.length + drift.orphanedWrangler.length + drift.stalePath.length;
	if (driftCount > 0) console.log(`\n⚠ ${driftCount} drift issues (run with --drift for details)`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
