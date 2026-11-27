/**
 * Drizzle Schema — Fireside (grove-engine-db)
 *
 * The conversation a writer has before the words exist. Two tables:
 *
 * - `fireside_sessions` — one fire. Records what it cost, which model answered,
 *   and whether the transcript was published.
 * - `fireside_messages` — the turns themselves, ordered by `seq`.
 *
 * Two rules from `docs/specs/fireside-spec.md` that the schema is shaped by:
 *
 * 1. **The post owns the transcript.** `posts.fireside_session_id` (see
 *    `content.ts`), not a `post_id` here: deleting the post takes the
 *    conversation with it, and an expired session leaves the post's attribution
 *    intact. `ON DELETE SET NULL` on the post side is the whole point.
 * 2. **`seq` orders messages, never `created_at`.** Two turns landing in the same
 *    second is normal, and a conversation that reorders itself is worse than one
 *    that refuses to.
 *
 * Derived from `libs/engine/migrations/128_fireside.sql`. The SQL is the source
 * of truth — it also carries the CHECK constraints and the partial index that
 * Drizzle does not model here.
 */

import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { tenants } from "./platform.js";

// ─────────────────────────────────────────────────────────────────────────────
// SESSIONS — one fire
// ─────────────────────────────────────────────────────────────────────────────

export const firesideSessions = sqliteTable(
	"fireside_sessions",
	{
		/** Server-minted. A client-supplied id is never trusted. */
		id: text("id").primaryKey(),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		/** The writer — the drawer resumes *their* open session, not the tenant's. */
		userId: text("user_id").notNull(),
		status: text("status", { enum: ["open", "drafted", "accepted", "abandoned"] })
			.notNull()
			.default("open"),

		turns: integer("turns").notNull().default(0),
		inputTokens: integer("input_tokens").notNull().default(0),
		outputTokens: integer("output_tokens").notNull().default(0),
		/** Recorded, never capped: the key is the writer's (BYOK). */
		costUsd: real("cost_usd").notNull().default(0),
		/** Whichever model Lumen chose; a feature does not name models. */
		model: text("model"),

		transcriptPublic: integer("transcript_public").notNull().default(0),
		transcriptPublishedAt: integer("transcript_published_at"),

		startedAt: integer("started_at")
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer("updated_at")
			.notNull()
			.default(sql`(unixepoch())`),
		/** NULL = never expires. A published transcript is exempt from the sweep. */
		expiresAt: integer("expires_at"),
	},
	(table) => [
		index("idx_fireside_sessions_tenant_updated").on(table.tenantId, table.updatedAt),
		// Partial, matching the SQL: only open sessions are ever looked up this way.
		index("idx_fireside_sessions_open")
			.on(table.tenantId, table.userId)
			.where(sql`status = 'open'`),
	],
);

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGES — the turns
// ─────────────────────────────────────────────────────────────────────────────

export const firesideMessages = sqliteTable(
	"fireside_messages",
	{
		id: text("id").primaryKey(),
		sessionId: text("session_id")
			.notNull()
			.references(() => firesideSessions.id, { onDelete: "cascade" }),
		/** Denormalised on purpose: every query filters on the tenant. */
		tenantId: text("tenant_id").notNull(),

		role: text("role", { enum: ["user", "wisp"] }).notNull(),
		kind: text("kind", { enum: ["turn", "draft"] })
			.notNull()
			.default("turn"),
		content: text("content").notNull(),
		/** Ordering. The unique index below is what makes an append safe to retry. */
		seq: integer("seq").notNull(),

		createdAt: integer("created_at")
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(table) => [uniqueIndex("idx_fireside_messages_session_seq").on(table.sessionId, table.seq)],
);

export type FiresideSession = typeof firesideSessions.$inferSelect;
export type NewFiresideSession = typeof firesideSessions.$inferInsert;
export type FiresideMessage = typeof firesideMessages.$inferSelect;
export type NewFiresideMessage = typeof firesideMessages.$inferInsert;
