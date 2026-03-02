/**
 * Reverie Worker — Environment Bindings & Request/Response Types
 *
 * All trust boundaries use Zod schemas for validation (Rootwork pattern).
 * No `as` casts at boundaries — always validate through schemas.
 */

import type { GroveContext } from "@autumnsgrove/infra";
import { z } from "zod";

// =============================================================================
// Hono Variables
// =============================================================================

/** Variables set by groveInfraMiddleware — available on all routes */
export type AppVariables = {
	ctx: GroveContext;
};

/** Variables set by auth middleware — available on protected routes */
export type ReverieVariables = AppVariables & {
	/** Authenticated tenant ID */
	tenantId: string;
	/** Tenant subscription tier */
	tier: "free" | "seedling" | "sapling" | "oak" | "evergreen";
};

// =============================================================================
// Environment
// =============================================================================

export interface Env {
	/** Engine D1 — interaction history, settings reads */
	DB: D1Database;
	/** Curios D1 — curio widget config reads */
	CURIO_DB: D1Database;
	/** Rate limit counters (Threshold SDK) */
	RATE_LIMITS: KVNamespace;
	/** Service binding to Lumen for LLM inference */
	LUMEN: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
	/** Service binding to Auth for Heartwood token verification */
	AUTH: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
	/** Service binding to Execution Worker for applying validated changes */
	REVERIE_EXEC: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };

	/** API key for authenticating callers to this worker */
	REVERIE_API_KEY: string;
	/** API key for calling the Lumen worker */
	LUMEN_API_KEY: string;
	/** API key for authenticating to the execution worker */
	EXEC_API_KEY: string;
}

// =============================================================================
// Request Schemas (Rootwork: validate at boundary, trust inside)
// =============================================================================

/** Tier values */
const TierSchema = z.enum(["free", "seedling", "sapling", "oak", "evergreen"]);

/** POST /configure — natural language configuration request */
export const ConfigureRequestSchema = z.object({
	input: z.string().min(1).max(2000),
	session_id: z.string().max(100).optional(),
});

/** POST /execute — execute previewed changes */
export const ExecuteRequestSchema = z.object({
	request_id: z.string().min(1).max(100),
	changes: z
		.array(
			z.object({
				domain: z.string(),
				field: z.string(),
				value: z.unknown(),
			}),
		)
		.min(1)
		.max(50),
});

/** POST /preview — explicit dry-run (same as configure) */
export const PreviewRequestSchema = ConfigureRequestSchema;

/** POST /query — read-only domain query */
export const QueryRequestSchema = z.object({
	domain: z.string().min(1).max(100),
	fields: z.array(z.string().max(100)).min(1).max(20).optional(),
});

// =============================================================================
// Response Types
// =============================================================================

/** Standard Reverie worker response envelope */
export interface ReverieResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
	};
	meta?: {
		latencyMs: number;
		domainsMatched?: string[];
		atmosphereUsed?: string;
		lumenModel?: string;
	};
}

/** A single change preview entry */
export interface ChangePreview {
	domain: string;
	field: string;
	from: unknown;
	to: unknown;
	description: string;
}

/** Configure/preview response data */
export interface ConfigureResponseData {
	requestId: string;
	action: "configure" | "atmosphere" | "query" | "ambiguous";
	changes: ChangePreview[];
	domainsMatched: string[];
	atmosphereUsed?: string;
	message: string;
}

// =============================================================================
// Inferred Types
// =============================================================================

export type ConfigureRequest = z.infer<typeof ConfigureRequestSchema>;
export type ExecuteRequest = z.infer<typeof ExecuteRequestSchema>;
export type PreviewRequest = z.infer<typeof PreviewRequestSchema>;
export type QueryRequest = z.infer<typeof QueryRequestSchema>;
