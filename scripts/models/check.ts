/**
 * Fail when the Grove overlay disagrees with the pinned catalog.
 *
 * The same assertion the engine's test suite makes, for running by hand:
 *
 *   pnpm models:check
 *
 * It needs no network — the catalog is committed — and it is what turns "this
 * price is wrong" from a months-long silence into a failing check (#1822).
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describeDrift, findDrift } from "../../libs/engine/src/lib/ai/lumen/model-catalog.js";
import type { Catalog, Registry } from "../../libs/engine/src/lib/ai/lumen/model-catalog.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(HERE, "../../libs/engine/src/lib/data");

const registry = JSON.parse(readFileSync(join(DATA, "lumen-models.json"), "utf8")) as Registry;
const catalog = JSON.parse(readFileSync(join(DATA, "model-catalog.json"), "utf8")) as Catalog;

const drift = findDrift(registry, catalog);

if (drift.length > 0) {
	console.error(describeDrift(drift));
	process.exit(1);
}

console.log(
	`${Object.keys(catalog.models).length} models agree with the catalog (fetched ${catalog.fetchedAt}).`,
);
