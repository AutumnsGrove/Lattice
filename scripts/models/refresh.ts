/**
 * Re-pin the model catalog from OpenRouter's live list.
 *
 *   pnpm models:refresh           rewrite the snapshot for the models we route
 *   pnpm models:refresh --check   compare the live list with the snapshot and
 *                                 exit 1 on a difference (what the weekly
 *                                 workflow runs, without touching the tree)
 *
 * The snapshot is committed so a deploy is reproducible and the check needs no
 * network. This script is the only thing that talks to OpenRouter; the rules
 * about what the catalog means live in the engine, next to the data
 * (`libs/lumen-registry/src/catalog.ts`).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOG_URL, openRouterIds, parseCatalog } from "../../libs/lumen-registry/src/catalog.js";
import type { Catalog, Registry } from "../../libs/lumen-registry/src/catalog.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(HERE, "../../libs/lumen-registry/src/data");
const CATALOG_PATH = join(DATA, "catalog.json");
const REGISTRY_PATH = join(DATA, "models.json");

const TIMEOUT_MS = 30_000;

/** Written the way Prettier writes JSON, so a generated file does not reformat on commit. */
function writeJson(path: string, value: unknown): void {
	writeFileSync(path, `${JSON.stringify(value, null, "\t")}\n`);
}

function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, "utf8")) as T;
}

async function fetchLive(): Promise<unknown> {
	const response = await fetch(CATALOG_URL, {
		headers: { Accept: "application/json" },
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});

	if (!response.ok) {
		throw new Error(`OpenRouter answered ${response.status} ${response.statusText}`);
	}

	return response.json();
}

/** Every fact that differs between two catalog entries. */
function compare(previous: Catalog, next: Catalog): string[] {
	const changes: string[] = [];
	const ids = new Set([...Object.keys(previous.models), ...Object.keys(next.models)]);

	for (const id of [...ids].sort()) {
		const before = previous.models[id];
		const after = next.models[id];

		if (before === undefined || after === undefined) {
			changes.push(`${id}: ${before === undefined ? "added" : "no longer listed"}`);
			continue;
		}

		const { input: beforeIn, output: beforeOut } = before.pricing;
		const { input: afterIn, output: afterOut } = after.pricing;

		if (beforeIn !== afterIn || beforeOut !== afterOut) {
			changes.push(`${id}: $${beforeIn}/$${beforeOut} → $${afterIn}/$${afterOut} per million`);
		}

		if (before.contextWindow !== after.contextWindow) {
			changes.push(`${id}: context ${before.contextWindow} → ${after.contextWindow}`);
		}
	}

	return changes;
}

/**
 * What `--check` reports.
 *
 * 0 — the snapshot matches. 1 — prices or windows have moved (the weekly job
 * opens an issue for this). 2 — the check could not run at all: no network, an
 * error response, or a model OpenRouter has delisted. Those are a different
 * thing from drift, and filing them as "prices moved" would be a lie in the
 * issue tracker.
 */
const EXIT_DRIFT = 1;
const EXIT_COULD_NOT_CHECK = 2;

async function main(): Promise<number> {
	const check = process.argv.includes("--check");
	const registry = readJson<Registry>(REGISTRY_PATH);
	const ids = openRouterIds(registry);

	let live: Catalog;
	try {
		live = parseCatalog(await fetchLive(), ids, new Date().toISOString());
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		return EXIT_COULD_NOT_CHECK;
	}

	if (!check) {
		writeJson(CATALOG_PATH, live);
		console.log(`Wrote ${ids.length} models to catalog.json, fetched ${live.fetchedAt}.`);
		console.log("Run `pnpm models:sync` to carry the prices into models.json.");
		return 0;
	}

	const previous = readJson<Catalog>(CATALOG_PATH);
	const changes = compare(previous, live);

	if (changes.length === 0) {
		console.log(`The catalog still matches OpenRouter for ${ids.length} models.`);
		return 0;
	}

	console.log(
		[
			`${changes.length} model ${changes.length === 1 ? "fact has" : "facts have"} moved at OpenRouter since the snapshot (${previous.fetchedAt}):`,
			"",
			...changes.map((change) => `- ${change}`),
			"",
			"Run `pnpm models:refresh && pnpm models:sync`, then review the diff.",
		].join("\n"),
	);
	return 1;
}

main().then(
	(code) => process.exit(code),
	(error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	},
);
