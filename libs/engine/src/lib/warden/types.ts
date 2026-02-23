/**
 * Warden SDK Types
 *
 * All interfaces for the Warden API gateway client.
 */

// =============================================================================
// Service Types
// =============================================================================

export type WardenService = "github" | "tavily" | "cloudflare" | "exa" | "resend" | "stripe" | "openrouter";

export type WardenErrorCode =
	| "INVALID_REQUEST"
	| "AUTH_FAILED"
	| "AUTH_REQUIRED"
	| "AGENT_NOT_FOUND"
	| "NONCE_INVALID"
	| "SIGNATURE_INVALID"
	| "SCOPE_DENIED"
	| "RATE_LIMITED"
	| "UNKNOWN_SERVICE"
	| "UNKNOWN_ACTION"
	| "INVALID_PARAMS"
	| "NO_CREDENTIAL"
	| "UPSTREAM_ERROR"
	| "NETWORK_ERROR"
	| "INTERNAL_ERROR";

// =============================================================================
// Configuration
// =============================================================================

export interface WardenConfig {
	baseUrl: string;
	/** API key for service binding / direct auth */
	apiKey?: string;
	/** Agent credentials for challenge-response auth */
	agent?: {
		id: string;
		secret: string;
	};
	/** Service Binding Fetcher for direct Worker-to-Worker communication */
	fetcher?: {
		fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
	};
}

// =============================================================================
// Request / Response
// =============================================================================

export interface WardenRequest {
	service: WardenService;
	action: string;
	params: Record<string, unknown>;
	tenant_id?: string;
}

export interface WardenResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: {
		code: WardenErrorCode | string;
		message: string;
	};
	meta?: {
		service: string;
		action: string;
		latencyMs: number;
	};
}

// =============================================================================
// GitHub Types
// =============================================================================

export interface GitHubRepo {
	id: number;
	name: string;
	full_name: string;
	description: string | null;
	html_url: string;
	private: boolean;
	language: string | null;
	stargazers_count: number;
	forks_count: number;
	open_issues_count: number;
	updated_at: string;
}

export interface GitHubIssue {
	id: number;
	number: number;
	title: string;
	body: string | null;
	state: string;
	html_url: string;
	user: { login: string; avatar_url: string };
	labels: Array<{ name: string; color: string }>;
	assignees: Array<{ login: string }>;
	created_at: string;
	updated_at: string;
}

export interface GitHubComment {
	id: number;
	body: string;
	html_url: string;
	user: { login: string };
	created_at: string;
}

export interface GitHubWorkflowRun {
	id: number;
	name: string;
	status: string;
	conclusion: string | null;
	html_url: string;
	head_branch: string;
	created_at: string;
	updated_at: string;
}

// =============================================================================
// Tavily Types
// =============================================================================

export interface TavilySearchResult {
	title: string;
	url: string;
	content: string;
	raw_content?: string;
	score: number;
}

export interface TavilySearchResponse {
	query: string;
	results: TavilySearchResult[];
	answer?: string;
	response_time: number;
}

export interface TavilyCrawlResult {
	url: string;
	content: string;
	raw_content?: string;
}

export interface TavilyCrawlResponse {
	results: TavilyCrawlResult[];
}

export interface TavilyExtractResponse {
	results: Array<{ url: string; raw_content: string }>;
	failed_results: Array<{ url: string; error: string }>;
}

// =============================================================================
// Cloudflare Types
// =============================================================================

export interface CloudflareWorkerScript {
	id: string;
	tag: string;
	etag: string;
	handlers: string[];
	named_handlers: Array<{ name: string; entrypoint: string }>;
	modified_on: string;
	created_on: string;
	usage_model: string;
	compatibility_date: string;
	compatibility_flags: string[];
	last_deployed_from?: string;
}

export interface CloudflareKvNamespace {
	id: string;
	title: string;
	supports_url_encoding?: boolean;
}

export interface CloudflareD1Database {
	uuid: string;
	name: string;
	version: string;
	num_tables: number;
	file_size: number;
	created_at: string;
}

export interface CloudflareDnsRecord {
	id: string;
	zone_id: string;
	zone_name: string;
	name: string;
	type: string;
	content: string;
	proxiable: boolean;
	proxied: boolean;
	ttl: number;
	locked: boolean;
	created_on: string;
	modified_on: string;
}

export interface CloudflareListResponse<T> {
	result: T[];
	success: boolean;
	errors: Array<{ code: number; message: string }>;
	messages: Array<{ code: number; message: string }>;
	result_info?: { page: number; per_page: number; count: number; total_count: number };
}

export interface CloudflareSingleResponse<T> {
	result: T;
	success: boolean;
	errors: Array<{ code: number; message: string }>;
	messages: Array<{ code: number; message: string }>;
}

// =============================================================================
// Exa Types
// =============================================================================

export interface ExaSearchResult {
	title: string;
	url: string;
	id: string;
	score: number;
	publishedDate?: string;
	author?: string;
	text?: string;
	highlights?: string[];
	highlightScores?: number[];
}

export interface ExaSearchResponse {
	results: ExaSearchResult[];
	autopromptString?: string;
	requestId: string;
}

export interface ExaContentsResponse {
	results: Array<{
		url: string;
		title: string;
		id: string;
		text?: string;
		highlights?: string[];
		highlightScores?: number[];
	}>;
	requestId: string;
}

// =============================================================================
// Resend Types
// =============================================================================

export interface ResendEmailResponse {
	id: string;
}

// =============================================================================
// Stripe Types
// =============================================================================

export interface StripeCustomer {
	id: string;
	object: "customer";
	email: string | null;
	name: string | null;
	description: string | null;
	created: number;
	currency: string | null;
	default_source: string | null;
	metadata: Record<string, string>;
}

export interface StripeSubscription {
	id: string;
	object: "subscription";
	customer: string;
	status: string;
	current_period_start: number;
	current_period_end: number;
	plan: { id: string; amount: number; currency: string; interval: string };
	metadata: Record<string, string>;
	cancel_at_period_end: boolean;
	created: number;
}

export interface StripeInvoice {
	id: string;
	object: "invoice";
	customer: string;
	status: string;
	amount_due: number;
	amount_paid: number;
	currency: string;
	created: number;
	period_start: number;
	period_end: number;
	hosted_invoice_url: string | null;
	invoice_pdf: string | null;
	subscription: string | null;
}

export interface StripeListResponse<T> {
	object: "list";
	data: T[];
	has_more: boolean;
	url: string;
}

// =============================================================================
// OpenRouter Types
// =============================================================================

export interface OpenRouterMessage {
	role: "system" | "user" | "assistant";
	content:
		| string
		| Array<{
				type: "text" | "image_url";
				text?: string;
				image_url?: { url: string; detail?: "auto" | "low" | "high" };
		  }>;
}

export interface OpenRouterChatCompletion {
	id: string;
	model: string;
	choices: Array<{
		index: number;
		message: { role: string; content: string };
		finish_reason: string;
	}>;
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export interface OpenRouterModel {
	id: string;
	name: string;
	description: string;
	pricing: { prompt: string; completion: string };
	context_length: number;
	architecture: { modality: string; tokenizer: string };
	top_provider: { max_completion_tokens: number | null };
}

export interface OpenRouterModelsResponse {
	data: OpenRouterModel[];
}

export interface OpenRouterGeneration {
	id: string;
	model: string;
	total_cost: number;
	tokens_prompt: number;
	tokens_completion: number;
	generation_time: number;
}

// =============================================================================
// Health
// =============================================================================

export interface WardenHealth {
	status: string;
	services: string[];
	version: string;
}

// =============================================================================
// Admin Types (for gw CLI)
// =============================================================================

export interface WardenAgentInfo {
	id: string;
	name: string;
	owner: string;
	scopes: string[];
	rate_limit_rpm: number;
	rate_limit_daily: number;
	enabled: boolean;
	created_at: string;
	last_used_at: string | null;
	request_count: number;
}

export interface WardenAgentRegistration {
	id: string;
	name: string;
	owner: string;
	scopes: string[];
	secret: string;
	rate_limit_rpm: number;
	rate_limit_daily: number;
	message: string;
}
