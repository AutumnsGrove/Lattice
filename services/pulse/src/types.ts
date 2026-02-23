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

// ─── Typed event data accessors (Rootwork Phase 4) ──────────────────
// These interfaces describe the shape of NormalizedEvent.data
// for specific event types, replacing `(event.data as any)` casts.

/** Push event data — commits, additions, deletions, SHA */
export interface PushEventData {
	sha?: string;
	commits?: number;
	additions?: number;
	deletions?: number;
}

/** Helper to safely extract push event data from NormalizedEvent.data */
export function asPushData(data: Record<string, unknown>): PushEventData {
	return {
		sha: typeof data.sha === "string" ? data.sha : undefined,
		commits: typeof data.commits === "number" ? data.commits : undefined,
		additions: typeof data.additions === "number" ? data.additions : undefined,
		deletions: typeof data.deletions === "number" ? data.deletions : undefined,
	};
}
