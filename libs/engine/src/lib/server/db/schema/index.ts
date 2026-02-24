/**
 * Drizzle Schema — All Grove Databases
 *
 * Namespace re-exports to prevent cross-DB misuse. Each database's
 * tables live under a named namespace so you can't accidentally query
 * a curios table against the engine D1 binding.
 *
 * Usage:
 *   import { engine, curios, obs } from '$lib/server/db/schema';
 *   engine.tenants  // ✓ use with createDb()
 *   curios.timelineCurioConfig  // ✓ use with createCurioDb()
 *
 * For direct table imports (engine DB only, the common case):
 *   import { tenants, posts } from '$lib/server/db/schema/engine';
 */

// ── Namespaced exports (safe: makes binding <-> table association clear) ─────
export * as engine from "./engine.js";
export * as curios from "./curios.js";
export * as obs from "./observability.js";

// ── Engine DB flat re-export (convenience for the most common case) ─────────
// Engine tables are the primary database. Flat exports here for ergonomics.
// Curios and observability tables must be imported via namespace or direct file
// to prevent accidental cross-DB queries.
export * from "./engine.js";

// ── Type Inference Helpers ──────────────────────────────────────────────────
// Usage: type Tenant = InferSelectModel<typeof tenants>
export { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
