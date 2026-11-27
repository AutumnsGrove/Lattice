/**
 * Carry the catalog's facts into the Grove overlay.
 *
 * Only `cost` and `contextWindow` are written. Everything else in
 * `models.json` — which task a model serves, its quality label, whether
 * it may call tools — is a decision, and decisions are hand-written.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyCatalog, formatRegistryJson } from "../../libs/lumen-registry/src/catalog.js";
import type { Catalog, Registry } from "../../libs/lumen-registry/src/catalog.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(HERE, "../../libs/lumen-registry/src/data");

const registry = JSON.parse(readFileSync(join(DATA, "models.json"), "utf8")) as Registry;
const catalog = JSON.parse(readFileSync(join(DATA, "catalog.json"), "utf8")) as Catalog;

writeFileSync(join(DATA, "models.json"), formatRegistryJson(applyCatalog(registry, catalog)));

console.log(`Updated ${Object.keys(catalog.models).length} models in models.json.`);
console.log("Review the diff: a price change is a change to every run's reported cost.");
