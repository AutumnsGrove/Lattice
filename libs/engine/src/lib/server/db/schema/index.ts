/**
 * Drizzle Schema — All Grove Databases
 *
 * Re-exports table definitions for all 3 D1 databases.
 * Import from here for schema access; use per-file imports
 * when you need only one database's tables.
 *
 * Usage:
 *   import { tenants, posts } from '$lib/server/db/schema';
 *   import * as engineSchema from '$lib/server/db/schema/engine';
 *   import * as curiosSchema from '$lib/server/db/schema/curios';
 *   import * as obsSchema from '$lib/server/db/schema/observability';
 */

// ── Engine DB (DB binding) ──────────────────────────────────────────────────
export * from './engine.js';

// ── Curios DB (CURIO_DB binding) ────────────────────────────────────────────
export * from './curios.js';

// ── Observability DB (OBS_DB binding) ───────────────────────────────────────
export * from './observability.js';

// ── Type Inference Helpers ──────────────────────────────────────────────────
// Usage: type Tenant = InferSelectModel<typeof tenants>
export { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
