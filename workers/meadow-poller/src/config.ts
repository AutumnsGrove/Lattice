/**
 * Meadow Poller — Type definitions and configuration constants
 */

/** Cloudflare Worker environment bindings */
export interface Env {
  DB: D1Database;
  POLL_STATE: KVNamespace;
}

/** Tenant row from D1 for feed discovery */
export interface TenantInfo {
  id: string;
  subdomain: string;
  display_name: string | null;
}

/** Per-tenant poll state stored in KV */
export interface PollState {
  lastEtag: string | null;
  lastPollAt: number;
  consecutiveErrors: number;
  lastErrorMessage: string | null;
}

/** Parsed RSS feed structure */
export interface ParsedFeed {
  title: string;
  link: string;
  description: string;
  items: ParsedFeedItem[];
}

/** Individual parsed feed item */
export interface ParsedFeedItem {
  title: string;
  link: string;
  guid: string;
  pubDate: string | null;
  description: string;
  contentEncoded: string | null;
  categories: string[];
  enclosureUrl: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of tenants to poll concurrently */
export const MAX_CONCURRENT_POLLS = 10;

/** HTTP timeout per feed fetch (ms) */
export const FETCH_TIMEOUT_MS = 5_000;

/** Maximum feed size in bytes (5 MB) */
export const MAX_FEED_SIZE = 5 * 1024 * 1024;

/** KV TTL for poll state entries (7 days) */
export const POLL_STATE_TTL = 7 * 24 * 60 * 60;

/** After this many consecutive errors, back off to hourly polling */
export const ERROR_BACKOFF_THRESHOLD = 3;

/** Backoff interval when error threshold is exceeded (1 hour in seconds) */
export const BACKOFF_INTERVAL_S = 60 * 60;

/** Subdomain validation pattern — only alphanumeric and hyphens */
export const SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
