/**
 * Shutter Types - TypeScript interfaces for the Cloudflare Worker
 *
 * These mirror the Python dataclasses but with TypeScript conventions (camelCase).
 */

import { MODELS } from "@autumnsgrove/lumen-registry";

// ============================================================================
// Request Types
// ============================================================================

/**
 * Request body for the /fetch and /extract endpoints
 */
export interface ShutterRequest {
	/** URL to fetch and extract from */
	url: string;
	/** What information to extract from the page */
	query: string;
	/** Model tier: fast, accurate, research, or code */
	model?: "fast" | "accurate" | "research" | "code";
	/** Maximum tokens for extraction response (default: 500) */
	maxTokens?: number;
	/** Additional extraction guidance */
	extendedQuery?: string;
	/** Fetch timeout in milliseconds (default: 30000) */
	timeout?: number;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Details about a detected prompt injection attempt
 */
export interface PromptInjectionDetails {
	/** Always true when this object exists */
	detected: boolean;
	/**
	 * Injection type identifier:
	 * - instruction_override
	 * - role_hijack
	 * - delimiter_injection
	 * - jailbreak_attempt
	 * - safety_bypass
	 * - mode_switch
	 * - memory_wipe
	 * - prompt_leak
	 * - hidden_unicode_*
	 * - base64_payload
	 * - instruction_following
	 * - meta_discussion
	 * - topic_deviation
	 * - domain_blocked
	 * - fetch_error
	 * - empty_content
	 */
	type: string;
	/** Snippet of suspicious content or error message */
	snippet: string;
	/** Whether the domain was added to/is on the offenders list */
	domainFlagged: boolean;
	/** Detection confidence (0.0-1.0) */
	confidence: number;
	/** Contributing signals for debugging (e.g., ["instruction_override:0.95"]) */
	signals: string[];
}

/**
 * Response from a shutter extraction
 */
export interface ShutterResponse {
	/** The URL that was fetched */
	url: string;
	/** Extracted content, or null if blocked/failed */
	extracted: string | null;
	/** Input tokens consumed */
	tokensInput: number;
	/** Output tokens generated */
	tokensOutput: number;
	/** OpenRouter model ID used (empty string if blocked) */
	modelUsed: string;
	/** Injection details if detected, null if clean */
	promptInjection: PromptInjectionDetails | null;
}

// ============================================================================
// Database Types
// ============================================================================

/**
 * A domain on the offenders list
 */
export interface Offender {
	/** The flagged domain (e.g., "malicious.example.com") */
	domain: string;
	/** ISO timestamp of first detection */
	firstSeen: string;
	/** ISO timestamp of most recent detection */
	lastSeen: string;
	/** Total number of detections */
	detectionCount: number;
	/** Types of injections detected on this domain */
	injectionTypes: string[];
	/** Running average confidence score */
	avgConfidence: number;
	/** Highest confidence seen */
	maxConfidence: number;
}

/**
 * Raw database row (snake_case column names)
 */
export interface OffenderRow {
	domain: string;
	first_seen: string;
	last_seen: string;
	detection_count: number;
	injection_types: string;
	avg_confidence: number;
	max_confidence: number;
}

// ============================================================================
// Internal Types
// ============================================================================

/**
 * A single heuristic match from pattern checking
 */
export interface HeuristicMatch {
	/** Injection type (e.g., "instruction_override") */
	type: string;
	/** Snippet of matched content */
	snippet: string;
	/** Base confidence score */
	confidence: number;
}

/**
 * Result from canary LLM check
 */
export interface CanaryResult {
	detected: boolean;
	type: string;
	snippet: string;
	confidence: number;
	signals: string[];
}

/**
 * Aggregated confidence result
 */
export interface AggregatedConfidence {
	confidence: number;
	type: string | null;
	snippet: string | null;
	signals: string[];
}

// ============================================================================
// Environment Bindings
// ============================================================================

/**
 * Cloudflare Worker environment bindings
 */
export interface Env {
	/** D1 database binding for offenders list */
	DB: D1Database;
	/** OpenRouter API key (set via wrangler secret put) */
	OPENROUTER_API_KEY: string;
	/** Tavily API key (optional, for enhanced fetching) */
	TAVILY_API_KEY?: string;
	/** Environment identifier (production/development) */
	ENVIRONMENT: string;
}

// ============================================================================
// OpenRouter Types
// ============================================================================

/**
 * OpenRouter chat completion request
 */
export interface OpenRouterRequest {
	model: string;
	messages: { role: string; content: string }[];
	max_tokens: number;
	temperature: number;
}

/**
 * OpenRouter chat completion response
 */
export interface OpenRouterResponse {
	choices: {
		message: {
			content: string;
		};
	}[];
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
	};
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Model tier to model ID mapping.
 *
 * The IDs come from the registry (#1602). Two of these tiers used to name models
 * OpenRouter had already retired — a Tongyi deep-research model and MiniMax
 * m2.1 — so they now point at the nearest live model in the family, and
 * `research` at the reasoning model the registry carries.
 */
export const MODEL_TIERS: Record<string, string> = {
	fast: MODELS.GPT_OSS_120B, // Cerebras ~2000 tok/s
	accurate: MODELS.DEEPSEEK_V3_2,
	research: MODELS.DEEPSEEK_V4_PRO_0813,
	code: MODELS.MINIMAX_M3,
};

/** Default values */
export const DEFAULTS = {
	MODEL: "fast" as const,
	MAX_TOKENS: 500,
	TIMEOUT: 30000,
	BLOCK_THRESHOLD: 0.6,
};
