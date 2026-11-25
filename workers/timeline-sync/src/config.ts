/**
 * Timeline Sync Configuration
 *
 * Types and constants for the timeline sync cron worker.
 */

// =============================================================================
// Environment Types
// =============================================================================

export interface Env {
	/** Core D1 database (grove-engine-db) — tenants, tenant_secrets */
	DB: D1Database;
	/** Curio D1 database (grove-curios-db) — timeline_* and all curio tables */
	CURIO_DB: D1Database;
	/** Key Encryption Key from Cloudflare Secrets Store (hex string) */
	GROVE_KEK: string;
	/** Service binding to the Lumen AI Gateway worker */
	LUMEN: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
	/** API key for authenticating with the Lumen worker */
	LUMEN_API_KEY: string;
	/** Service binding to the Pulse observability collector worker */
	PULSE: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
	/** Optional fallback OpenRouter key if tenant key fails */
	OPENROUTER_API_KEY?: string;
	/** Bearer token gating the manual-trigger/debug HTTP routes (fetch handler) */
	TIMELINE_ADMIN_KEY?: string;
}

// =============================================================================
// Database Types
// =============================================================================

/** Raw row from timeline_curio_config table */
export interface TenantConfigRow {
	tenant_id: string;
	github_username: string;
	openrouter_model: string;
	voice_preset: string;
	custom_system_prompt: string | null;
	custom_summary_instructions: string | null;
	custom_gutter_style: string | null;
	repos_include: string | null;
	repos_exclude: string | null;
	timezone: string;
	owner_name: string | null;
}

/** Parsed tenant configuration */
export interface TenantConfig {
	tenantId: string;
	githubUsername: string;
	openrouterModel: string;
	voicePreset: string;
	customSystemPrompt: string | null;
	customSummaryInstructions: string | null;
	customGutterStyle: string | null;
	reposInclude: string[] | null;
	reposExclude: string[] | null;
	timezone: string;
	ownerName: string | null;
}

// =============================================================================
// Generation Types
// =============================================================================

export interface GenerationResult {
	success: boolean;
	tenantId: string;
	date: string;
	commitCount?: number;
	error?: string;
}
