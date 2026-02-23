/**
 * Warden API Gateway SDK
 *
 * Secure proxy for third-party API access with credential injection.
 */

export { WardenClient } from "./client";
export { createWardenClient } from "./factory";
export { WardenGitHub } from "./services/github";
export { WardenTavily } from "./services/tavily";
export { WardenCloudflare } from "./services/cloudflare";
export { WardenExa } from "./services/exa";
export { WardenResend } from "./services/resend";
export { WardenStripe } from "./services/stripe";
export { WardenOpenRouter } from "./services/openrouter";
export { signNonce } from "./crypto";
export type {
	WardenConfig,
	WardenService,
	WardenErrorCode,
	WardenRequest,
	WardenResponse,
	WardenHealth,
	WardenAgentInfo,
	WardenAgentRegistration,
	// GitHub
	GitHubRepo,
	GitHubIssue,
	GitHubComment,
	GitHubWorkflowRun,
	// Tavily
	TavilySearchResult,
	TavilySearchResponse,
	TavilyCrawlResult,
	TavilyCrawlResponse,
	TavilyExtractResponse,
	// Cloudflare
	CloudflareWorkerScript,
	CloudflareKvNamespace,
	CloudflareD1Database,
	CloudflareDnsRecord,
	CloudflareListResponse,
	CloudflareSingleResponse,
	// Exa
	ExaSearchResult,
	ExaSearchResponse,
	ExaContentsResponse,
	// Resend
	ResendEmailResponse,
	// Stripe
	StripeCustomer,
	StripeSubscription,
	StripeInvoice,
	StripeListResponse,
	// OpenRouter
	OpenRouterMessage,
	OpenRouterChatCompletion,
	OpenRouterModel,
	OpenRouterModelsResponse,
	OpenRouterGeneration,
} from "./types";
