/**
 * Durable Objects Index
 *
 * Type exports for DO classes used by the Grove Engine.
 * Actual DO instances are hosted in the grove-durable-objects Worker
 * and referenced via script_name in engine/wrangler.toml.
 *
 * Part of the Loom pattern - Grove's coordination layer.
 */

// TenantDO - Per-tenant config, drafts, analytics
// Class implementation lives in packages/durable-objects/ (deployed as separate worker)
export type {
  TenantConfig,
  TierLimits,
  Draft,
  DraftMetadata,
  AnalyticsEvent,
} from "./TenantDO.js";

// PostMetaDO - Per-post reactions, views, presence (hot data)
export { PostMetaDO } from "./PostMetaDO.js";
export type {
  PostMeta,
  ReactionCounts,
  ReactionEvent,
  PresenceInfo,
} from "./PostMetaDO.js";

// PostContentDO - Per-post content caching (warm data, hibernates)
export { PostContentDO } from "./PostContentDO.js";
export type { PostContent, ContentUpdate } from "./PostContentDO.js";
