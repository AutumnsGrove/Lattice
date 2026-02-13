/**
 * Pulse Worker — Type definitions
 */

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  GROVE_KEK: string;
}

export interface PulseConfigRow {
  tenant_id: string;
  enabled: number;
  repos_include: string | null;
  repos_exclude: string | null;
  timezone: string;
  feed_max_items: number;
}

export interface NormalizedEvent {
  eventType: string;
  action: string | null;
  repoName: string;
  repoFullName: string;
  actor: string;
  title: string | null;
  ref: string | null;
  data: Record<string, unknown>;
  occurredAt: number;
}
