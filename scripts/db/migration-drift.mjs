#!/usr/bin/env node
/**
 * migration-drift.mjs — does the migration ledger match the database it claims
 * to describe?
 *
 * `d1_migrations` is a claim, not a record. A row saying a migration applied
 * does not mean its SQL ever ran, and `wrangler d1 migrations apply` believes
 * the claim and skips the file forever. That is how `tenants` went nine months
 * without a `last_activity_at` column that two migrations are on record as
 * having created (#1692).
 *
 * This script rebuilds the schema the ledger *claims* and diffs it against a
 * live database, read-only. Two things it will tell you that nothing else does:
 *
 *   1. Objects and columns the ledger says exist and the database lacks (or
 *      has and the ledger doesn't know about).
 *   2. Whether migration history is even replayable — a fresh bootstrap that
 *      errors partway through produces a database nobody has described.
 *
 * Usage:
 *   node scripts/db/migration-drift.mjs                          # prod grove-engine-db
 *   node scripts/db/migration-drift.mjs --db grove-curios-db
 *   node scripts/db/migration-drift.mjs --dir libs/engine/migrations \
 *        --dir apps/landing/migrations
 *   node scripts/db/migration-drift.mjs --local  # against local dev state
 *
 * Exits 1 when drift is found, so it can be used as a check. Nothing is
 * written to the remote database.
 *
 * A note on the diff's noise floor: some "drift" is deliberate and permanent.
 * A table owned by a Durable Object's own SQLite, a Drizzle schema for a table
 * that lives in another database, and a table somebody hand-dropped all look
 * identical here. Read the list, don't panic at its length.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
function flag(name, fallback) {
	const i = args.indexOf(`--${name}`);
	return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
}
function bool(name) {
	return args.includes(`--${name}`);
}

const db = flag("db", "grove-engine-db");
const remote = !bool("local");
const dirs = [];
for (let i = 0; i < args.length; i++) {
	if (args[i] === "--dir") dirs.push(args[++i]);
}
if (dirs.length === 0) {
	// Every directory whose migrations have ever been applied to a shared
	// database. grove-engine-db's ledger carries rows from all three, which is
	// itself worth knowing: three apps own pieces of one schema.
	dirs.push("libs/engine/migrations", "apps/landing/migrations", "apps/clearing/migrations");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run SQL against a local sqlite file and return parsed rows. */
function sqlite(file, sql) {
	const out = execFileSync("sqlite3", ["-json", file], { input: sql, encoding: "utf8" });
	return out.trim() ? JSON.parse(out) : [];
}

function remoteQuery(sql) {
	const out = execFileSync(
		"wrangler",
		["d1", "execute", db, remote ? "--remote" : "--local", "--json", "--command", sql],
		// wrangler prints progress to stderr; only stdout is JSON.
		{ encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
	);
	return JSON.parse(out)[0].results;
}

/** Normalise DDL so cosmetic differences (quotes, whitespace, trailing commas) don't count as drift. */
function normalise(sql) {
	if (!sql) return "";
	return sql
		.toLowerCase()
		.replace(/--[^\n]*/g, " ")
		.replace(/"/g, "")
		.replace(/\s+/g, " ")
		.replace(/\s*,\s*(?=\))/g, "")
		.replace(/;\s*$/, "")
		.trim();
}

const SCHEMA_QUERY = `
  SELECT type, name, sql FROM sqlite_master
  WHERE name NOT LIKE 'sqlite_%'
    AND name NOT IN ('d1_migrations', '_cf_KV')
    AND type IN ('table', 'index')
  ORDER BY type, name
`;

// ---------------------------------------------------------------------------
// 1. The ledger, and the files it names
// ---------------------------------------------------------------------------

console.log(`\nMigration drift — ${db} (${remote ? "remote" : "local"})\n`);

const ledger = remoteQuery("SELECT id, name, applied_at FROM d1_migrations ORDER BY id;");

const files = new Map();
for (const dir of dirs) {
	let entries;
	try {
		entries = readdirSync(dir).filter((f) => f.endsWith(".sql"));
	} catch {
		console.warn(`  (skipping ${dir} — not found)`);
		continue;
	}
	for (const name of entries) files.set(name, join(dir, name));
}

const unapplied = [...files.keys()].filter((n) => !ledger.some((r) => r.name === n)).sort();
const unfiled = ledger.filter((r) => !files.has(r.name));

const stamps = new Map();
for (const row of ledger) stamps.set(row.applied_at, (stamps.get(row.applied_at) ?? 0) + 1);
const bulk = [...stamps.entries()].filter(([, n]) => n > 5).sort((a, b) => b[1] - a[1]);

console.log(`Ledger: ${ledger.length} rows   Files: ${files.size}`);
if (bulk.length) {
	for (const [ts, n] of bulk) {
		console.log(`  ! ${n} rows share applied_at ${ts} — a backfill, not ${n} runs`);
	}
}
if (unapplied.length) {
	console.log(
		`\nFiles with no ledger row (never applied, or applied elsewhere): ${unapplied.length}`,
	);
	for (const n of unapplied) console.log(`  + ${n}`);
}
if (unfiled.length) {
	console.log(`\nLedger rows with no file in the searched dirs: ${unfiled.length}`);
	for (const r of unfiled) console.log(`  ? ${r.name}`);
}

// ---------------------------------------------------------------------------
// 2. Replay the ledger's claim into a scratch database
// ---------------------------------------------------------------------------

const tmp = mkdtempSync(join(tmpdir(), "migration-drift-"));
const claimed = join(tmp, "claimed.db");
const failures = [];

for (const row of [...ledger.map((r) => r.name), ...unapplied]) {
	const path = files.get(row);
	if (!path) continue;
	try {
		execFileSync("sqlite3", [claimed], {
			input: readFileSync(path, "utf8"),
			stdio: ["pipe", "pipe", "pipe"],
		});
	} catch (error) {
		const stderr = String(error.stderr ?? "");
		const firstProblem = stderr
			.split("\n")
			.find((line) => line.trim() && !line.trim().startsWith("^"));
		failures.push([row, firstProblem ?? "unknown error"]);
	}
}

if (failures.length) {
	console.log(
		`\n! History is not replayable: ${failures.length} migration(s) failed on a clean database`,
	);
	for (const [name, problem] of failures) console.log(`  x ${name} — ${problem}`);
}

// ---------------------------------------------------------------------------
// 3. Diff the claim against the database
// ---------------------------------------------------------------------------

const claimedSchema = sqlite(claimed, SCHEMA_QUERY);
const actualSchema = remoteQuery(SCHEMA_QUERY);

const byName = (rows) => new Map(rows.map((r) => [r.name, r]));
const claimedMap = byName(claimedSchema);
const actualMap = byName(actualSchema);

const missing = [...claimedMap.keys()].filter((n) => !actualMap.has(n)).sort();
const extra = [...actualMap.keys()].filter((n) => !claimedMap.has(n)).sort();
const differing = [...claimedMap.keys()]
	.filter(
		(n) => actualMap.has(n) && normalise(claimedMap.get(n).sql) !== normalise(actualMap.get(n).sql),
	)
	.sort();

console.log(`\nClaimed objects: ${claimedSchema.length}   Live objects: ${actualSchema.length}`);

function section(title, names, describe) {
	console.log(`\n${title}: ${names.length}`);
	for (const n of names) console.log(`  ${describe(n)}`);
}

section(
	"In history, ABSENT from the database",
	missing,
	(n) => `${claimedMap.get(n).type.padEnd(5)} ${n}`,
);
section("In the database, NOT in history", extra, (n) => `${actualMap.get(n).type.padEnd(5)} ${n}`);
section(
	"Same name, DIFFERENT definition",
	differing,
	(n) => `${actualMap.get(n).type.padEnd(5)} ${n}`,
);

// Column-level detail for differing tables — the part that usually matters.
if (differing.some((n) => claimedMap.get(n).type === "table")) {
	console.log("\nColumn differences in those tables:");
	for (const name of differing) {
		if (claimedMap.get(name).type !== "table") continue;
		const claimedCols = sqlite(claimed, `SELECT name FROM pragma_table_info('${name}');`).map(
			(c) => c.name,
		);
		const actualCols = remoteQuery(`SELECT name FROM pragma_table_info('${name}');`).map(
			(c) => c.name,
		);
		const onlyClaimed = claimedCols.filter((c) => !actualCols.includes(c));
		const onlyActual = actualCols.filter((c) => !claimedCols.includes(c));
		if (!onlyClaimed.length && !onlyActual.length) continue;
		console.log(`  ${name}`);
		if (onlyClaimed.length) console.log(`    history has, live lacks: ${onlyClaimed.join(", ")}`);
		if (onlyActual.length) console.log(`    live has, history lacks: ${onlyActual.join(", ")}`);
	}
}

rmSync(tmp, { recursive: true, force: true });

const drifted = missing.length + extra.length + differing.length > 0 || failures.length > 0;
console.log(
	drifted
		? "\nDRIFT — the ledger and the database disagree. Read the lists above before writing a repair.\n"
		: "\nNo drift: the ledger describes this database.\n",
);

process.exit(drifted ? 1 : 0);
