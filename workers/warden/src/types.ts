/**
 * Warden Worker — Environment Bindings
 *
 * All Cloudflare bindings and secrets used by the Warden gateway.
 */

export interface Env {
	// --- D1 Databases ---
	/** Warden's own database: agent registry + audit log */
	DB: D1Database;
	/** Engine database: for SecretsManager per-tenant credential resolution */
	TENANT_DB: D1Database;

	// --- KV Namespaces ---
	/** Nonce storage for challenge-response auth (30s TTL) */
	NONCES: KVNamespace;
	/** Rate limit counters per agent/service */
	RATE_LIMITS: KVNamespace;

	// --- Secrets ---
	/** HMAC signing key for challenge-response auth verification */
	WARDEN_SIGNING_KEY: string;
	/** Key encryption key for SecretsManager envelope decryption */
	GROVE_KEK: string;
	/** GitHub API token (global fallback) */
	GITHUB_TOKEN: string;
	/** Tavily search API key (global fallback) */
	TAVILY_API_KEY: string;
	/** Cloudflare API token (global fallback) */
	CLOUDFLARE_API_TOKEN: string;
	/** Exa search API key (global fallback) */
	EXA_API_KEY: string;
	/** Resend email API key (global fallback) */
	RESEND_API_KEY: string;
	/** Stripe secret key — read-only billing (global fallback) */
	STRIPE_SECRET_KEY: string;
	/** OpenRouter API key — LLM gateway (global fallback) */
	OPENROUTER_API_KEY: string;
	/** Admin API key for agent management endpoints */
	WARDEN_ADMIN_KEY?: string;
}

/** Warden service identifiers */
export type WardenService =
	| "github"
	| "tavily"
	| "cloudflare"
	| "exa"
	| "resend"
	| "stripe"
	| "openrouter";

/** Authentication method used for a request */
export type AuthMethod = "service_binding" | "challenge_response";

/** Audit log event types — aligned with Vista warden-aggregator queries */
export type EventType = "request" | "resolve" | "nonce_reuse" | "rate_limit_hit" | "scope_denial";

/** Agent record from D1 */
export interface WardenAgent {
	id: string;
	name: string;
	owner: string;
	secret_hash: string;
	scopes: string;
	rate_limit_rpm: number;
	rate_limit_daily: number;
	enabled: number;
	created_at: string;
	last_used_at: string | null;
	request_count: number;
}

/** Audit log entry */
export interface AuditLogEntry {
	id?: number;
	agent_id: string;
	agent_name: string | null;
	target_service: string;
	action: string;
	auth_method: string;
	auth_result: string;
	event_type: string;
	tenant_id: string | null;
	latency_ms: number;
	error_code: string | null;
	created_at?: string;
}

/** Standard Warden API response envelope */
export interface WardenResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
	};
	meta?: {
		service: string;
		action: string;
		latencyMs: number;
	};
}

/** Incoming request body for POST /request */
export interface WardenRequestBody {
	service: WardenService;
	action: string;
	params: Record<string, unknown>;
	tenant_id?: string;
	/** Challenge-response auth fields */
	agent?: {
		id: string;
		nonce: string;
		signature: string;
	};
}

/** Incoming request body for POST /resolve */
export interface WardenResolveBody {
	service: WardenService;
	tenant_id?: string;
}
