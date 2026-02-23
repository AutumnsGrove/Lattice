/**
 * Lumen Worker — Environment Bindings & Request/Response Types
 *
 * All trust boundaries use Zod schemas for validation (Rootwork pattern).
 * No `as` casts at boundaries — always validate through schemas.
 */

import { z } from "zod";

// =============================================================================
// Environment
// =============================================================================

export interface Env {
	/** Engine D1 — quota tracking (lumen_usage table) */
	DB: D1Database;
	/** Cloudflare Workers AI — embeddings, transcription, local moderation */
	AI: Ai;
	/** Service binding to Warden for credential resolution */
	WARDEN: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
	/** Rate limit counters (used by Threshold SDK) */
	RATE_LIMITS: KVNamespace;

	/** API key for authenticating callers to this worker */
	LUMEN_API_KEY: string;
	/** Lumen's registered agent API key for Warden auth */
	WARDEN_API_KEY: string;
}

// =============================================================================
// Request Schemas (Rootwork: validate at boundary, trust inside)
// =============================================================================

/** Valid Lumen task types */
export const LumenTaskSchema = z.enum([
	"generation",
	"chat",
	"summary",
	"code",
	"image",
	"moderation",
	"embedding",
	"transcription",
]);

/** Message format — supports text and multimodal */
const MessageSchema = z.object({
	role: z.enum(["system", "user", "assistant"]),
	content: z.union([
		z.string(),
		z.array(
			z.object({
				type: z.enum(["text", "image_url"]),
				text: z.string().optional(),
				image_url: z
					.object({
						url: z.string(),
						detail: z.enum(["auto", "low", "high"]).optional(),
					})
					.optional(),
			}),
		),
	]),
});

/** POST /inference request body */
export const InferenceRequestSchema = z.object({
	task: LumenTaskSchema,
	input: z.union([z.string().max(102400), z.array(MessageSchema).min(1).max(100)]),
	tenant_id: z.string().optional(),
	tier: z.enum(["free", "seedling", "sapling", "oak", "evergreen"]).optional(),
	options: z
		.object({
			model: z.string().optional(),
			max_tokens: z.number().int().min(1).max(128000).optional(),
			temperature: z.number().min(0).max(2).optional(),
			skip_quota: z.boolean().optional(),
			skip_pii_scrub: z.boolean().optional(),
			songbird: z.boolean().optional(),
			tenant_api_key: z.string().max(500).optional(),
			metadata: z.record(z.unknown()).optional(),
		})
		.optional(),
});

/** POST /embed request body */
export const EmbedRequestSchema = z.object({
	input: z.union([z.string().max(32768), z.array(z.string().max(32768)).min(1).max(100)]),
	tenant_id: z.string().optional(),
	tier: z.enum(["free", "seedling", "sapling", "oak", "evergreen"]).optional(),
	model: z.string().optional(),
});

/** POST /moderate request body */
export const ModerateRequestSchema = z.object({
	content: z.string().max(102400),
	tenant_id: z.string().optional(),
	tier: z.enum(["free", "seedling", "sapling", "oak", "evergreen"]).optional(),
	model: z.string().optional(),
});

/** POST /transcribe request body */
export const TranscribeRequestSchema = z.object({
	audio: z.string().max(10485760), // base64-encoded audio, 10MB max
	tenant_id: z.string().optional(),
	tier: z.enum(["free", "seedling", "sapling", "oak", "evergreen"]).optional(),
	mode: z.enum(["raw", "draft"]).default("raw"),
});

// =============================================================================
// Response Types
// =============================================================================

/** Standard Lumen worker response envelope */
export interface LumenWorkerResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: {
		code: LumenWorkerErrorCode;
		message: string;
	};
	meta?: {
		task: string;
		model: string;
		provider: string;
		latencyMs: number;
	};
}

export type LumenWorkerErrorCode =
	| "AUTH_REQUIRED"
	| "INVALID_REQUEST"
	| "INVALID_PARAMS"
	| "QUOTA_EXCEEDED"
	| "PROVIDER_ERROR"
	| "ALL_PROVIDERS_FAILED"
	| "SONGBIRD_REJECTED"
	| "RATE_LIMITED"
	| "UPSTREAM_ERROR"
	| "INTERNAL_ERROR";

// =============================================================================
// Inferred Types
// =============================================================================

export type InferenceRequest = z.infer<typeof InferenceRequestSchema>;
export type EmbedRequest = z.infer<typeof EmbedRequestSchema>;
export type ModerateRequest = z.infer<typeof ModerateRequestSchema>;
export type TranscribeRequest = z.infer<typeof TranscribeRequestSchema>;
