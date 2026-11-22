#!/usr/bin/env node
/**
 * Pre-push validation runner.
 *
 * Runs identically in local dev, Claude Code web sandboxes, and can be
 * invoked by CI. Uses the deploy-manifest parser to scope work to only
 * the deploy shims affected by the push.
 *
 * Checks (in order):
 *   1. Lockfile sync      (pnpm install --frozen-lockfile, only when a
 *                          package.json or the lockfile itself changed)
 *   2. Deploy drift       (deploy-manifest --drift)
 *   3. Direct typecheck   (tsc --noEmit or the package's own check script —
 *                          shims whose OWN directory changed, not shims that
 *                          merely declare a changed shared lib as a path
 *                          trigger. One check per package, not two.)
 *   4. Svelte-check       (the same packages, once)
 *   5. Direct dry-run     (wrangler deploy --dry-run — only if CF token present)
 *
 * Shared libs (foliage, gossamer, engine) are built only when their sources
 * changed or their dist is older than their sources. Rebuilding them on every
 * push cost ~2 minutes for a one-line change (#1783).
 *
 * Time budget: ~30-60s for a typical single-service change. Scoping to
 * directly-changed shims (not their lib-triggered downstream consumers) is
 * the key — editing one file in libs/gossamer shouldn't locally typecheck
 * and svelte-check every unrelated worker that happens to import
 * libs/engine (which itself depends on gossamer). CI still runs the full
 * fan-out remotely via each deploy-*.yml's own path triggers — this script
 * only trims what runs on your machine, blocking your terminal.
 *
 * Environment:
 *   PRE_PUSH_BASE              Git ref to diff against (default: origin/main)
 *   PRE_PUSH_SKIP_LOCKFILE=1   Skip the pnpm-lock.yaml sync check
 *   PRE_PUSH_FORCE_BUILD=1     Rebuild the shared libs even if they look fresh
 *   CLOUDFLARE_API_TOKEN       If set, wrangler dry-run runs; else skipped with a note
 *   CLOUDFLARE_ACCOUNT_ID      Required alongside the token for dry-run
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	parseAllShims,
	filterAffected,
	detectDrift,
	findWranglerConfigs,
	getChangedFiles,
} from "./deploy-manifest.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

let failures = 0;

const header = (t) => console.log(`\n${BLUE}━━ ${t} ━━${RESET}`);
const ok = (t) => console.log(`  ${GREEN}✓${RESET} ${t}`);
const bad = (t) => {
	console.log(`  ${RED}✗${RESET} ${t}`);
	failures++;
};
const skip = (t) => console.log(`  ${DIM}⊘ ${t}${RESET}`);
const note = (t) => console.log(`  ${DIM}${t}${RESET}`);

// Diff against the remote tracking branch when it exists (only checks
// commits not yet on the remote). Falls back to origin/main for new
// branches or detached HEAD.
function detectBase() {
	const r = spawnSync("git", ["rev-parse", "--abbrev-ref", "@{push}"], {
		cwd: REPO_ROOT,
		encoding: "utf8",
		stdio: "pipe",
	});
	if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
	return "origin/main";
}

function run(cmd, cwd) {
	const r = spawnSync("sh", ["-c", cmd], {
		cwd: cwd || REPO_ROOT,
		stdio: "pipe",
		encoding: "utf8",
	});
	return { ok: r.status === 0, stdout: r.stdout, stderr: r.stderr, code: r.status };
}

function dumpTail(out, n = 25) {
	const lines = (out || "").split("\n").filter(Boolean).slice(-n);
	for (const line of lines) console.log(`    ${DIM}${line}${RESET}`);
}

/**
 * True when a library's build output is missing or older than its sources.
 * Wall-clock mtimes, not git history: this answers "is the dist on disk the
 * build of the code on disk right now", which is what typecheck needs.
 */
function isStale(absDir, entry) {
	const entryPath = resolve(absDir, entry);
	if (!existsSync(entryPath)) return true;

	const newest = (dir) => {
		let newestMtime = 0;
		for (const name of readdirSync(dir)) {
			const abs = resolve(dir, name);
			let stat;
			try {
				stat = statSync(abs);
			} catch {
				continue;
			}
			if (stat.isDirectory()) newestMtime = Math.max(newestMtime, newest(abs));
			else newestMtime = Math.max(newestMtime, stat.mtimeMs);
		}
		return newestMtime;
	};

	const srcDir = resolve(absDir, "src");
	if (!existsSync(srcDir)) return false;

	return newest(srcDir) > statSync(entryPath).mtimeMs;
}

// ─── 1. Lockfile sync ─────────────────────────────────────────────
// Diff first: a push that touches no manifest cannot have desynced the
// lockfile, and `pnpm install --frozen-lockfile` is 15–40s of nothing.
header("Changed files");
const base = process.env.PRE_PUSH_BASE || detectBase();
let changedFiles = [];
try {
	changedFiles = getChangedFiles(base);
} catch (e) {
	note(`could not diff against ${base}: ${e.message}`);
}
if (changedFiles.length === 0) {
	skip(`No files changed since ${base}`);
} else {
	note(`${changedFiles.length} files changed since ${base}`);
}

header("Lockfile sync");
const manifestChanged = changedFiles.some(
	(f) => f === "pnpm-lock.yaml" || f === "pnpm-workspace.yaml" || f.endsWith("package.json"),
);
if (process.env.PRE_PUSH_SKIP_LOCKFILE === "1") {
	skip("PRE_PUSH_SKIP_LOCKFILE=1");
} else if (!manifestChanged) {
	skip("no package.json or lockfile changed");
} else {
	const r = run("pnpm install --frozen-lockfile --prefer-offline");
	if (r.ok) ok("pnpm-lock.yaml in sync");
	else {
		bad("pnpm-lock.yaml out of sync — run `pnpm install` and commit");
		dumpTail(r.stderr, 10);
	}
}

// ─── 2. Deploy manifest drift ─────────────────────────────────────
header("Deploy manifest drift");
const shims = parseAllShims();
const wranglers = findWranglerConfigs();
const drift = detectDrift(shims, wranglers);
if (drift.missingWrangler.length === 0 && drift.orphanedWrangler.length === 0) {
	ok(`${shims.length} shims match ${wranglers.length} wrangler.toml files`);
} else {
	for (const m of drift.missingWrangler) bad(`${m.shim} → expects ${m.expected}`);
	for (const o of drift.orphanedWrangler)
		bad(`${o.wrangler} (${o.name || "unnamed"}) has no deploy-*.yml shim`);
}

// ─── 3. Affected shims — typecheck ────────────────────────────────
header("Affected deploys");
let affected = [];
try {
	affected = filterAffected(shims, base);
} catch (e) {
	note(`could not diff against ${base}: ${e.message}`);
}

// Split "affected" into shims whose OWN directory changed ("direct") vs
// shims matched only because they declare a changed shared lib as a path
// trigger ("lib-only"). Local checks run against `direct` only — CI still
// covers the full fan-out remotely via the same deploy-*.yml path triggers.
const direct = affected.filter(
	(s) => s.path && changedFiles.some((f) => f.startsWith(s.path + "/")),
);
const libOnly = affected.filter((s) => !direct.includes(s));

if (affected.length === 0) {
	skip(`No deploy shims affected since ${base}`);
} else {
	note(`${direct.length} direct: ${direct.map((s) => s.service).join(", ") || "(none)"}`);
	if (libOnly.length > 0) {
		note(
			`${libOnly.length} lib-triggered (skipped locally, CI covers these): ` +
				libOnly.map((s) => s.service).join(", "),
		);
	}

	// ── Build lib deps when they are not already current ──────────────
	// These dists must exist before any typecheck can resolve
	// `@autumnsgrove/lattice` — a missing dist is what made every engine
	// typecheck look broken in docs/tech-debt/ci-punt-list.md. But rebuilding
	// them on every push cost ~2 minutes for a one-line change (#1783), so
	// build only when their sources moved or the dist is older than the
	// source tree. PRE_PUSH_FORCE_BUILD=1 overrides the guess.
	const LIB_SPECS = [
		{ label: "libs/foliage", dir: "libs/foliage", cmd: "pnpm run build", entry: "dist/index.js" },
		{ label: "libs/gossamer", dir: "libs/gossamer", cmd: "pnpm run build", entry: "dist/index.js" },
		{ label: "libs/engine", dir: "libs/engine", cmd: "pnpm run package", entry: "dist/index.d.ts" },
	];

	for (const lib of LIB_SPECS) {
		const touched = changedFiles.some((f) => f.startsWith(lib.dir + "/"));
		const stale = isStale(resolve(REPO_ROOT, lib.dir), lib.entry);
		if (!touched && !stale && process.env.PRE_PUSH_FORCE_BUILD !== "1") {
			skip(`${lib.label} (already built)`);
			continue;
		}
		process.stdout.write(`  ${DIM}build ${lib.label.padEnd(18)}...${RESET}`);
		const r = run(lib.cmd, resolve(REPO_ROOT, lib.dir));
		if (r.ok) console.log(` ${GREEN}✓${RESET}`);
		else {
			console.log(` ${RED}✗${RESET}`);
			failures++;
			dumpTail(r.stderr || r.stdout, 20);
		}
	}

	// A package with its own `check` script gets exactly one check: that one.
	// Running tsc and then svelte-check over the same project was two passes
	// over the same code (#1783). `check` scripts run `svelte-kit sync`
	// themselves, so those shims need no separate sync either.
	const hasCheckScript = (shim) => {
		if (!shim.path) return false;
		try {
			const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, shim.path, "package.json"), "utf8"));
			return Boolean(pkg.scripts && pkg.scripts.check);
		} catch {
			return false;
		}
	};

	// ── SvelteKit sync for shims that typecheck with plain tsc ──────
	for (const shim of direct) {
		if (!shim.path || hasCheckScript(shim)) continue;
		process.stdout.write(`  ${DIM}sync ${shim.service.padEnd(18)}...${RESET}`);
		const r = run("pnpm exec svelte-kit sync", resolve(REPO_ROOT, shim.path));
		if (r.ok) console.log(` ${GREEN}✓${RESET}`);
		else console.log(` ${DIM}⊘ (not a SvelteKit target)${RESET}`);
	}

	console.log();

	for (const shim of direct) {
		if (shim.kind === "custom" || !shim.path) continue;
		if (shim.with["run-typecheck"] === false) {
			skip(`${shim.service} typecheck (run-typecheck: false)`);
			continue;
		}
		if (hasCheckScript(shim)) {
			// The same code is checked below with the package's own `check`
			// script, which is a superset of plain tsc and runs its own
			// svelte-kit sync. A shim with a *different* explicit command still
			// gets that command — only the two equivalents are skipped.
			const configured = shim.with["typecheck-command"] || "pnpm exec tsc --noEmit";
			if (configured === "pnpm exec tsc --noEmit" || configured === "pnpm check") continue;
		}
		const cmd = shim.with["typecheck-command"] || "pnpm exec tsc --noEmit";
		process.stdout.write(`  ${DIM}${shim.service.padEnd(20)} typecheck ...${RESET}`);
		const r = run(cmd, resolve(REPO_ROOT, shim.path));
		if (r.ok) console.log(` ${GREEN}✓${RESET}`);
		else {
			console.log(` ${RED}✗${RESET}`);
			failures++;
			dumpTail(r.stderr || r.stdout, 25);
		}
	}

	// ─── 4. Svelte-check (directly-changed shims only) ──────────────
	// Downstream consumers of a changed shared lib are NOT checked here —
	// they're still covered by CI via each deploy-*.yml's own path triggers,
	// which run on remote runners and don't cost local wall-clock time.
	header("Svelte-check");

	const svelteShims = direct.filter((s) => s.path);

	if (svelteShims.length === 0) {
		skip("No svelte-check targets affected");
	} else {
		for (const shim of svelteShims) {
			// Only run svelte-check on packages that have a "check" script
			if (!hasCheckScript(shim)) continue;
			if (shim.with["run-svelte-check"] === false) {
				skip(`${shim.service} svelte-check (run-svelte-check: false)`);
				continue;
			}

			process.stdout.write(`  ${DIM}${shim.service.padEnd(20)} svelte-check ...${RESET}`);
			const r = run("pnpm run check", resolve(REPO_ROOT, shim.path));
			if (r.ok) console.log(` ${GREEN}✓${RESET}`);
			else {
				console.log(` ${RED}✗${RESET}`);
				failures++;
				dumpTail(r.stderr || r.stdout, 25);
			}
		}
	}

	// ─── 5. Direct shims — wrangler dry-run ─────────────────────────
	const hasToken = Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID);
	console.log();
	if (!hasToken) {
		skip("wrangler dry-run (CLOUDFLARE_API_TOKEN/ACCOUNT_ID not set — CI will still run it)");
	} else {
		for (const shim of direct) {
			// Skip kind!=worker and library-only shims (run-deploy: false),
			// mirrors the `matrix.kind == 'worker' && matrix.run-deploy` gate
			// in validate-deployments.yml. libs/engine is the only shim that
			// currently sets run-deploy: false.
			if (shim.kind !== "worker" || !shim.path || shim.with["run-deploy"] === false) continue;
			process.stdout.write(`  ${DIM}${shim.service.padEnd(20)} wrangler dry-run ...${RESET}`);
			const r = run("pnpm exec wrangler deploy --dry-run", resolve(REPO_ROOT, shim.path));
			if (r.ok) console.log(` ${GREEN}✓${RESET}`);
			else {
				console.log(` ${RED}✗${RESET}`);
				failures++;
				dumpTail(r.stderr || r.stdout, 20);
			}
		}
	}
}

// ─── Summary ──────────────────────────────────────────────────────
console.log();
const bar = "━".repeat(40);
if (failures === 0) {
	console.log(`${GREEN}${bar}${RESET}`);
	console.log(`${GREEN}✓ All pre-push checks passed${RESET}`);
	console.log(`${GREEN}${bar}${RESET}`);
	process.exit(0);
} else {
	console.log(`${RED}${bar}${RESET}`);
	console.log(`${RED}✗ ${failures} pre-push check${failures === 1 ? "" : "s"} failed${RESET}`);
	console.log(`${YELLOW}To bypass (sparingly): git push --no-verify${RESET}`);
	console.log(`${RED}${bar}${RESET}`);
	process.exit(1);
}
