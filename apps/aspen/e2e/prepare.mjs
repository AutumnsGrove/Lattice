/**
 * Prepares the local state the browser journey runs against.
 *
 * Playwright's `webServer` runs this first, so the suite never depends on a
 * human having run `dev-stack.sh`. Migrations and seed data are the real ones —
 * the same files `dev-stack.sh seed blog` applies — written into a dedicated
 * state directory that only the e2e run uses.
 *
 * Idempotent: migrations are tracked by wrangler, and the seed SQL deletes and
 * re-inserts its own rows.
 */
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const aspen = path.resolve(here, "..");
const repo = path.resolve(aspen, "../..");
const state = path.join(aspen, ".e2e-state");

const SEPARATE_MIGRATIONS = [
	{ dir: path.join(repo, "libs/engine/migrations/curios"), db: "grove-curios-db" },
];

const SEEDS = [
	"seed-midnight-bloom.sql",
	"add-midnight-bloom-pages.sql",
	"fix-midnight-bloom-content.sql",
	"seed-tenant-002.sql",
	"seed-tenant-003.sql",
	"seed-upload-unsuspend.sql",
	"seed-empty-grove.sql",
];

function wrangler(args) {
	execFileSync("npx", ["wrangler", ...args], {
		cwd: repo,
		stdio: "inherit",
		env: { ...process.env, CI: "true" },
	});
}

// CI has no Cloudflare credentials, and an AI binding always resolves remotely —
// wrangler refuses to start without a token. The journey never touches AI, so it
// runs against a copy of the config with that one binding removed. Generated
// rather than hand-kept, so the two cannot drift.
const wranglerToml = await readFile(path.join(aspen, "wrangler.toml"), "utf-8");
const withoutAi = wranglerToml.replace(/^\[ai\]\n(?:[^\[].*\n)*/m, "");
if (withoutAi === wranglerToml) {
	throw new Error("expected to strip an [ai] block from wrangler.toml; none found");
}
await writeFile(path.join(aspen, "wrangler.e2e.toml"), withoutAi);

// The Durable Objects worker needs its local config (a throwaway migration that
// enables SQLite storage). dev-stack generates the same file; on a cold runner
// nothing has, so the shared script is called here too.
console.log("[e2e] writing local durable-objects config");
execFileSync("bash", [path.join(repo, "scripts/repo/write-local-do-config.sh")], {
	cwd: repo,
	stdio: "inherit",
});

// The worker wrangler dev serves is the build output, not the source.
console.log("[e2e] building aspen");
execFileSync("pnpm", ["run", "build"], {
	cwd: aspen,
	stdio: "inherit",
	env: { ...process.env, CI: "true" },
});

console.log("[e2e] applying migrations");
wrangler([
	"d1",
	"migrations",
	"apply",
	"grove-engine-db",
	"--local",
	"-c",
	"apps/aspen/wrangler.toml",
	"--persist-to",
	state,
]);

for (const extra of SEPARATE_MIGRATIONS) {
	wrangler([
		"d1",
		"migrations",
		"apply",
		extra.db,
		"--local",
		"-c",
		"apps/aspen/wrangler.toml",
		"--persist-to",
		state,
	]);
}

console.log("[e2e] seeding");
for (const file of SEEDS) {
	wrangler([
		"d1",
		"execute",
		"grove-engine-db",
		"--local",
		"-c",
		"apps/aspen/wrangler.toml",
		"--persist-to",
		state,
		"--file",
		path.join("scripts/db", file),
		"-y",
	]);
}

console.log("[e2e] state ready");
