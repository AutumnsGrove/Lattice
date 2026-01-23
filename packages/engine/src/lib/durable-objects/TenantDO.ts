/**
 * TenantDO Types
 *
 * Type definitions for the TenantDO Durable Object.
 * The actual class implementation lives in packages/durable-objects/src/TenantDO.ts
 * and is deployed as a separate Cloudflare Worker (grove-durable-objects).
 *
 * The engine references this DO via service binding (script_name in wrangler.toml),
 * so only types are needed here.
 *
 * Part of the Loom pattern - Grove's coordination layer.
 */

import type { PaidTierKey } from "../config/tiers.js";

// ============================================================================
// Types
// ============================================================================

export interface TenantConfig {
  id: string; // Tenant UUID from D1 - cached to avoid repeated lookups
  subdomain: string;
  displayName: string;
  theme: Record<string, unknown> | null;
  tier: PaidTierKey; // Uses centralized type from tiers.ts (excludes 'free' since tenants are paying)
  limits: TierLimits;
  ownerId: string;
}

export interface TierLimits {
  postsPerMonth: number;
  storageBytes: number;
  customDomains: number;
}

export interface Draft {
  slug: string;
  content: string;
  metadata: DraftMetadata;
  lastSaved: number;
  deviceId: string;
}

export interface DraftMetadata {
  title: string;
  description?: string;
  tags?: string[];
}

export interface AnalyticsEvent {
  type: string;
  data?: Record<string, unknown>;
  timestamp: number;
}
