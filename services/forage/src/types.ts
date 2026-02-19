/**
 * Type definitions for Forage worker
 */

// ============================================================================
// Environment bindings
// ============================================================================

export interface Env extends Record<string, unknown> {
	// Durable Object bindings
	SEARCH_JOB: DurableObjectNamespace;

	// D1 Database for job index
	DB: D1Database;

	// Service bindings (Worker-to-Worker)
	AUTH: Fetcher;
	ZEPHYR: Fetcher;

	// AI binding (for Cloudflare Workers AI)
	AI?: Ai;

	// API keys
	ANTHROPIC_API_KEY?: string;
	DEEPSEEK_API_KEY?: string;
	KIMI_API_KEY?: string;
	OPENROUTER_API_KEY?: string;
	ZEPHYR_API_KEY?: string;

	// Provider configuration
	DRIVER_PROVIDER?: string; // deepseek | openrouter
	SWARM_PROVIDER?: string; // deepseek | openrouter

	// General settings
	ENVIRONMENT: string;
	MAX_BATCHES: string;
	TARGET_RESULTS: string;
	USE_CEREBRAS_RDAP?: string; // "true" to use Cerebras for RDAP checking
}

// ============================================================================
// Authentication types
// ============================================================================

export interface AuthenticatedUser {
	id: string;
	email: string;
	name: string;
	emailVerified: boolean;
}

// ============================================================================
// Quiz types
// ============================================================================

export type QuestionType = "text" | "single_select" | "multi_select";

export interface QuizOption {
	value: string;
	label: string;
}

export interface QuizQuestion {
	id: string;
	type: QuestionType;
	prompt: string;
	required: boolean;
	placeholder?: string;
	options?: QuizOption[];
	default?: string | string[];
}

export interface InitialQuizResponse {
	business_name: string;
	domain_idea?: string;
	tld_preferences: string[];
	vibe: string;
	keywords?: string;
	diverse_tlds?: boolean; // Encourage variety in TLD suggestions
	client_email?: string; // Optional: if provided, emails will be sent on completion
}

export interface FollowupQuizResponse {
	[questionId: string]: string | string[];
}

// ============================================================================
// Search job types
// ============================================================================

export type SearchStatus =
	| "pending"
	| "running"
	| "complete"
	| "needs_followup"
	| "failed"
	| "cancelled";

export interface SearchJob {
	id: string;
	client_id: string;
	status: SearchStatus;
	batch_num: number;
	quiz_responses: InitialQuizResponse;
	followup_responses?: FollowupQuizResponse;
	driver_provider?: string; // Override for this job (claude | deepseek | kimi | cloudflare)
	swarm_provider?: string; // Override for this job (claude | deepseek | kimi | cloudflare)
	created_at: string;
	updated_at: string;
	error?: string;
}

export interface DomainResult {
	id?: number;
	batch_num: number;
	domain: string;
	tld: string;
	status: "available" | "registered" | "unknown";
	price_cents?: number;
	score: number;
	flags: string[];
	evaluation_data?: Record<string, unknown>;
	created_at?: string;
}

export interface SearchArtifact {
	id?: number;
	batch_num: number;
	artifact_type: "batch_report" | "strategy_notes" | "followup_quiz";
	content: string;
	created_at?: string;
}

// ============================================================================
// API request/response types
// ============================================================================

export interface StartSearchRequest {
	client_id: string;
	quiz_responses: InitialQuizResponse;
}

export interface VibeSearchRequest {
	vibe_text: string; // Minimum 5 words describing what they're looking for
	client_id?: string; // Optional, will be auto-generated if not provided
	client_email?: string; // Optional email for notifications
}

export interface StartSearchResponse {
	job_id: string;
	status: SearchStatus;
}

export interface GetStatusResponse {
	job_id: string;
	status: SearchStatus;
	batch_num: number;
	domains_checked: number;
	good_results: number;
	created_at: string;
	updated_at: string;
}

export interface GetResultsResponse {
	job_id: string;
	status: SearchStatus;
	domains: DomainResult[];
	total_checked: number;
	pricing_summary: {
		bundled: number;
		recommended: number;
		standard: number;
		premium: number;
	};
}

export interface GetFollowupQuizResponse {
	job_id: string;
	questions: QuizQuestion[];
	context: {
		batches_completed: number;
		domains_checked: number;
		good_found: number;
		target: number;
	};
}

export interface ResumeSearchRequest {
	followup_responses: Record<string, string | string[]>;
}

// ============================================================================
// Batch processing types
// ============================================================================

export interface BatchResult {
	batch_num: number;
	candidates_generated: number;
	candidates_evaluated: number;
	domains_checked: number;
	domains_available: number;
	new_good_results: number;
	duration_ms: number;
}

export interface AlarmData {
	action: "process_batch" | "send_email" | "cleanup";
	job_id?: string;
	retry_count?: number;
}

// ============================================================================
// Email types
// ============================================================================

export interface EmailData {
	to: string;
	subject: string;
	html: string;
	from?: string;
}

export interface ResultsEmailData {
	client_email: string;
	business_name: string;
	domains: DomainResult[];
	results_url: string;
	booking_url: string;
}

export interface FollowupEmailData {
	client_email: string;
	business_name: string;
	quiz_url: string;
	batches_completed: number;
	domains_checked: number;
}
