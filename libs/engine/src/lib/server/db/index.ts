/**
 * Drizzle ORM — Public API (The Aquifer)
 *
 * Typed database access for all three Grove D1 databases.
 * Import from here for client factories, tenant-scoped helpers,
 * and schema-derived types.
 *
 * @example
 * ```ts
 * import { createDb, scopedDb, eq, desc } from '@autumnsgrove/lattice/db';
 * import type { Post, NewPost } from '@autumnsgrove/lattice/db';
 * import { posts } from '@autumnsgrove/lattice/db/schema';
 * ```
 */

// ── Client Factories ────────────────────────────────────────────────
export { createDb, createCurioDb, createObsDb } from "./client.js";
export type { EngineDb, CurioDb, ObsDb } from "./client.js";

// ── Tenant-Scoped Helpers ───────────────────────────────────────────
export { scopedDb } from "./helpers.js";

// ── Types ───────────────────────────────────────────────────────────
export type {
	Tenant,
	User,
	Post,
	Page,
	Media,
	Session,
	SiteSettings,
	TenantSettings,
	UserOnboarding,
	PlatformBilling,
	WebhookEvent,
	FeatureFlag,
	FlagRule,
	BlazeDefinition,
	Comment,
	CommentSettings,
	MeadowPost,
	MeadowVote,
	MeadowReaction,
	MeadowBookmark,
	MeadowFollow,
	MeadowReport,
	ThemeSettings,
	CustomFont,
	CommunityTheme,
	GroveMessage,
	AuditLogEntry,
	StorageExport,
	StorageFile,
	UserStorageRow,
	StorageAddon,
	NewTenant,
	NewUser,
	NewPost,
	NewPage,
	NewMedia,
	NewComment,
	NewMeadowPost,
	NewFeatureFlag,
	NewBlazeDefinition,
	NewStorageFile,
	NewStorageExport,
	NewStorageAddon,
} from "./types.js";

// ── Schema (for advanced queries and Drizzle Kit) ───────────────────
// Individual schemas available via @autumnsgrove/lattice/db/schema
export * as engineSchema from "./schema/engine.js";
export * as curiosSchema from "./schema/curios.js";
export * as obsSchema from "./schema/observability.js";

// ── Re-export Drizzle utilities for consumers ───────────────────────
export {
	eq,
	and,
	or,
	not,
	desc,
	asc,
	sql,
	like,
	between,
	isNull,
	isNotNull,
	inArray,
} from "drizzle-orm";
