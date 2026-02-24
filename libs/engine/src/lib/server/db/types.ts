/**
 * Drizzle Type Inference — The Aquifer
 *
 * Types flow directly from the schema definitions. No separate
 * interface files to maintain. When a column changes in the schema,
 * every query, every component prop, and every API response type
 * updates automatically.
 *
 * @example
 * ```ts
 * import type { Post, NewPost, Tenant } from '@autumnsgrove/lattice/db';
 *
 * function createPost(data: NewPost): Promise<Post> { ... }
 * ```
 */

import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
	tenants,
	users,
	posts,
	pages,
	media,
	sessions,
	siteSettings,
	tenantSettings,
	userOnboarding,
	platformBilling,
	webhookEvents,
	featureFlags,
	flagRules,
	comments,
	commentSettings,
	meadowPosts,
	meadowVotes,
	meadowReactions,
	meadowBookmarks,
	meadowFollows,
	meadowReports,
	themeSettings,
	customFonts,
	communityThemes,
	groveMessages,
	auditLog,
	storageExports,
} from "./schema/engine.js";

// ── Select Types (what you get back from queries) ────────────────────

export type Tenant = InferSelectModel<typeof tenants>;
export type User = InferSelectModel<typeof users>;
export type Post = InferSelectModel<typeof posts>;
export type Page = InferSelectModel<typeof pages>;
export type Media = InferSelectModel<typeof media>;
export type Session = InferSelectModel<typeof sessions>;
export type SiteSettings = InferSelectModel<typeof siteSettings>;
export type TenantSettings = InferSelectModel<typeof tenantSettings>;
export type UserOnboarding = InferSelectModel<typeof userOnboarding>;
export type PlatformBilling = InferSelectModel<typeof platformBilling>;
export type WebhookEvent = InferSelectModel<typeof webhookEvents>;
export type FeatureFlag = InferSelectModel<typeof featureFlags>;
export type FlagRule = InferSelectModel<typeof flagRules>;
export type Comment = InferSelectModel<typeof comments>;
export type CommentSettings = InferSelectModel<typeof commentSettings>;
export type MeadowPost = InferSelectModel<typeof meadowPosts>;
export type MeadowVote = InferSelectModel<typeof meadowVotes>;
export type MeadowReaction = InferSelectModel<typeof meadowReactions>;
export type MeadowBookmark = InferSelectModel<typeof meadowBookmarks>;
export type MeadowFollow = InferSelectModel<typeof meadowFollows>;
export type MeadowReport = InferSelectModel<typeof meadowReports>;
export type ThemeSettings = InferSelectModel<typeof themeSettings>;
export type CustomFont = InferSelectModel<typeof customFonts>;
export type CommunityTheme = InferSelectModel<typeof communityThemes>;
export type GroveMessage = InferSelectModel<typeof groveMessages>;
export type AuditLogEntry = InferSelectModel<typeof auditLog>;
export type StorageExport = InferSelectModel<typeof storageExports>;

// ── Insert Types (what you provide when creating) ────────────────────

export type NewTenant = InferInsertModel<typeof tenants>;
export type NewUser = InferInsertModel<typeof users>;
export type NewPost = InferInsertModel<typeof posts>;
export type NewPage = InferInsertModel<typeof pages>;
export type NewMedia = InferInsertModel<typeof media>;
export type NewComment = InferInsertModel<typeof comments>;
export type NewMeadowPost = InferInsertModel<typeof meadowPosts>;
export type NewFeatureFlag = InferInsertModel<typeof featureFlags>;

// Curio types can be generated on demand from curios.ts
// Observability types are internal to vista collectors
