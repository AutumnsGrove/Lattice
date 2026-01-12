/**
 * Durable Objects Index
 *
 * Exports all DO classes for the Grove Engine.
 * These are injected into _worker.js by scripts/inject-durable-objects.mjs
 *
 * Part of the Loom pattern - Grove's coordination layer.
 */

// TenantDO - Per-tenant config, drafts, analytics
export { TenantDO } from "./TenantDO.js";
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
