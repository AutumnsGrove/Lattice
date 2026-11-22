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
 *   node scripts/db/migration-drift.mjs --baseline none   # a DB built from history
 *
 * Exits 1 when drift is found, so it can be used as a check. Nothing is
 * written to the remote database.
 *
 * A note on replay fidelity: whether SQLite rewrites other tables' REFERENCES
 * clauses when a migration renames a table depends on the build. A difference
 * that appears on one machine and not another is therefore a defect in the
 * migration history, not a difference of opinion — 126 and 127 exist because
 * of exactly that. The CI runner's older SQLite is the more revealing one.
 *
 * A note on the diff's noise floor: some "drift" is deliberate and permanent.
 * A table owned by a Durable Object's own SQLite, a Drizzle schema for a table
 * that lives in another database, and a table somebody hand-dropped all look
 * identical here. Read the list, don't panic at its length.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
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
const baselinePath = flag("baseline", "scripts/db/migration-drift-baseline.json");
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
	let out;
	try {
		out = execFileSync(
			"wrangler",
			["d1", "execute", db, "--remote", "--json", "--command", sql],
			// wrangler prints progress to stderr; only stdout is JSON.
			{ encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
		);
	} catch (error) {
		const detail = String(error.stdout ?? error.stderr ?? "")
			.trim()
			.split("\n")
			.pop();
		console.error(`\nCould not query ${db}: ${detail}`);
		console.error("\nThis reads a real database. Check `wrangler whoami` and the --db name.");
		process.exit(2);
	}
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
		.replace(/\(\s+/g, "(")
		.replace(/\s+\)/g, ")")
		.replace(/\s*,\s*(?=\))/g, "")
		.replace(/;\s*$/, "")
		.trim();
}

/** Column names of a CREATE TABLE, in the order they are declared. */
function declaredColumns(sql) {
	const body = normalise(sql);
	const open = body.indexOf("(");
	if (open === -1) return [];
	return body
		.slice(open + 1)
		.split(",")
		.map((part) => part.trim().split(/\s+/)[0])
		.filter(
			(name) => name && !["foreign", "unique", "primary", "check", "constraint"].includes(name),
		);
}

const SCHEMA_QUERY = `
  SELECT type, name, sql FROM sqlite_master
  WHERE name NOT LIKE 'sqlite_%'
    AND name NOT IN ('d1_migrations')
    -- miniflare's own bookkeeping (_cf_KV, _cf_METADATA) is not our schema.
    -- substr rather than LIKE: an ESCAPE clause inside this template literal
    -- loses its backslashes and silently degrades to a wildcard.
    AND substr(name, 1, 4) != '_cf_'
    AND type IN ('table', 'index')
  ORDER BY type, name
`;

// ---------------------------------------------------------------------------
// 1. The ledger, and the files it names
// ---------------------------------------------------------------------------

console.log(`\nMigration drift — ${db}\n`);

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

// ---------------------------------------------------------------------------
// 4. Separate new drift from known-and-deliberate drift
// ---------------------------------------------------------------------------

// The baseline describes production's divergence from history. A database that
// was built *from* history has none of it, so pass `--baseline none` when
// comparing a dev stack — otherwise every entry reads as stale.
const useBaseline = baselinePath !== "none";
const baseline =
	useBaseline && existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : {};
const known = {
	absentFromDb: baseline.absentFromDb ?? {},
	extraInDb: baseline.extraInDb ?? {},
	differs: baseline.differs ?? {},
	unreplayable: baseline.unreplayable ?? {},
};

const isKnown = (bucket, name) => Object.hasOwn(known[bucket], name);

/**
 * A table whose clauses are identical when sorted differs only in the order its
 * columns were declared — usually harmless, and always noise next to a real
 * constraint difference. Anything else (a changed CHECK, a lost UNIQUE, a
 * dropped default) stays classified as drift.
 */
function isReorderOnly(name) {
	const a = claimedMap.get(name);
	const b = actualMap.get(name);
	if (!a || !b || a.type !== "table") return false;
	const clauses = (sql) => {
		const body = normalise(sql);
		const open = body.indexOf("(");
		if (open === -1) return null;
		return body
			.slice(open + 1, body.lastIndexOf(")"))
			.split(/,\s*(?=[a-z_]|foreign|unique|primary|check|constraint)/)
			.map((c) => c.trim())
			.sort()
			.join(" | ");
	};
	return clauses(a.sql) === clauses(b.sql);
}

const reordered = differing.filter((n) => isReorderOnly(n));
const differingSemantic = differing.filter((n) => !isReorderOnly(n));

const novel = {
	absent: missing.filter((n) => !isKnown("absentFromDb", n)),
	extra: extra.filter((n) => !isKnown("extraInDb", n)),
	differs: differingSemantic.filter((n) => !isKnown("differs", n)),
	unreplayable: failures.filter(([name]) => !isKnown("unreplayable", name)),
};

// A baseline entry that no longer diverges is a stale excuse. Failing on it is
// what keeps the list shrinking instead of quietly absorbing everything.
const stale = [
	...Object.keys(known.absentFromDb).filter((n) => !missing.includes(n)),
	...Object.keys(known.extraInDb).filter((n) => !extra.includes(n)),
	...Object.keys(known.differs).filter((n) => !differingSemantic.includes(n)),
	...Object.keys(known.unreplayable).filter((n) => !failures.some(([f]) => f === n)),
];

const knownCount =
	missing.length -
	novel.absent.length +
	(extra.length - novel.extra.length) +
	(differingSemantic.length - novel.differs.length) +
	(failures.length - novel.unreplayable.length);

console.log(
	`\nClaimed objects: ${claimedSchema.length}   Live objects: ${actualSchema.length}` +
		`   Known divergences: ${knownCount}`,
);

function section(title, names, describe) {
	console.log(`\n${title}: ${names.length}`);
	for (const n of names) console.log(`  ${describe(n)}`);
}

section(
	"NEW — in history, absent from the database",
	novel.absent,
	(n) => `${claimedMap.get(n).type.padEnd(5)} ${n}`,
);
section(
	"NEW — in the database, not in history",
	novel.extra,
	(n) => `${actualMap.get(n).type.padEnd(5)} ${n}`,
);
section(
	"NEW — same name, different definition",
	novel.differs,
	(n) => `${actualMap.get(n).type.padEnd(5)} ${n}`,
);
section(
	"NEW — history not replayable",
	novel.unreplayable,
	([name, problem]) => `${name} — ${problem}`,
);

// Column-level detail for new differing tables — the part that usually matters.
if (reordered.length) {
	console.log(`\nColumn order only (same clauses, reordered — not drift): ${reordered.length}`);
	console.log(`  ${reordered.join(", ")}`);
}

if (novel.differs.some((n) => claimedMap.get(n).type === "table")) {
	console.log("\nColumn differences in those tables:");
	for (const name of novel.differs) {
		if (claimedMap.get(name).type !== "table") continue;
		const claimedCols = sqlite(claimed, `SELECT name FROM pragma_table_info('${name}');`).map(
			(c) => c.name,
		);
		const actualCols = remoteQuery(`SELECT name FROM pragma_table_info('${name}');`).map(
			(c) => c.name,
		);
		const onlyClaimed = claimedCols.filter((c) => !actualCols.includes(c));
		const onlyActual = actualCols.filter((c) => !claimedCols.includes(c));
		console.log(`  ${name}`);
		if (onlyClaimed.length) console.log(`    history has, live lacks: ${onlyClaimed.join(", ")}`);
		if (onlyActual.length) console.log(`    live has, history lacks: ${onlyActual.join(", ")}`);
	}
}

if (knownCount > 0) {
	console.log("\nKnown and accepted (see " + baselinePath + "):");
	for (const [bucket, entries] of Object.entries(known)) {
		for (const [name, reason] of Object.entries(entries)) {
			console.log(`  ${name} — ${reason}`);
		}
	}
}

if (stale.length) {
	console.log(`\nStale baseline entries (no longer diverging — delete them): ${stale.length}`);
	for (const n of stale) console.log(`  ~ ${n}`);
}

rmSync(tmp, { recursive: true, force: true });

const drifted =
	novel.absent.length + novel.extra.length + novel.differs.length + novel.unreplayable.length > 0 ||
	stale.length > 0;

console.log(
	drifted
		? "\nDRIFT — something changed that the ledger does not describe. Read the NEW lists above.\n"
		: knownCount > 0
			? "\nNo new drift. Everything remaining is in the baseline.\n"
			: "\nNo drift: the ledger describes this database.\n",
);

process.exit(drifted ? 1 : 0);
