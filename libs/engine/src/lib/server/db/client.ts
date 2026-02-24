/**
 * Drizzle Client Factories — The Aquifer
 *
 * One factory per D1 database. Each wraps the raw binding and attaches
 * the schema for full type inference on relational queries.
 *
 * Drizzle clients are lightweight. Creating one per request is fine.
 * No connection pooling needed for D1.
 *
 * @example
 * ```ts
 * import { createDb, createCurioDb, createObsDb } from '@autumnsgrove/lattice/db';
 *
 * const db = createDb(platform.env.DB);
 * const curioDb = createCurioDb(platform.env.CURIO_DB);
 * const obsDb = createObsDb(platform.env.OBS_DB);
 * ```
 */

import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as engineSchema from "./schema/engine.js";
import * as curiosSchema from "./schema/curios.js";
import * as obsSchema from "./schema/observability.js";

// ── Engine DB (env.DB) ──────────────────────────────────────────────
export type EngineDb = DrizzleD1Database<typeof engineSchema>;

export function createDb(d1: D1Database): EngineDb {
	return drizzle(d1, { schema: engineSchema });
}

// ── Curios DB (env.CURIO_DB) ────────────────────────────────────────
export type CurioDb = DrizzleD1Database<typeof curiosSchema>;

export function createCurioDb(d1: D1Database): CurioDb {
	return drizzle(d1, { schema: curiosSchema });
}

// ── Observability DB (env.OBS_DB) ───────────────────────────────────
export type ObsDb = DrizzleD1Database<typeof obsSchema>;

export function createObsDb(d1: D1Database): ObsDb {
	return drizzle(d1, { schema: obsSchema });
}
