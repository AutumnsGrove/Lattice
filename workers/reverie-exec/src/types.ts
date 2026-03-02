/**
 * Reverie Exec Worker — Environment Bindings & Request/Response Types
 *
 * All trust boundaries use Zod schemas for validation (Rootwork pattern).
 * No `as` casts at boundaries — always validate through schemas.
 */

import { z } from "zod";

// =============================================================================
// Environment
// =============================================================================

export interface Env {
	/** Service binding to SvelteKit app (grove-lattice) */
	GROVE_APP: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
	/** API key for authenticating callers (Reverie worker) */
	EXEC_API_KEY: string;
	/** API key for authenticating to SvelteKit (internal service auth) */
	INTERNAL_SERVICE_KEY: string;
	/** Threshold DO for per-tenant rate limiting */
	THRESHOLD: DurableObjectNamespace;
}

// =============================================================================
// Hono Variables
// =============================================================================

/** Variables set by auth middleware — available on protected routes */
export type ExecVariables = {
	/** Authenticated tenant ID (from Reverie's X-Tenant-Id header) */
	tenantId: string;
	/** Tenant subscription tier */
	tier: string;
};

// =============================================================================
// Request Schemas (Rootwork: validate at boundary, trust inside)
// =============================================================================

/** Inbound request from Reverie — execute validated changes */
export const ExecRequestSchema = z.object({
	request_id: z.string().min(1).max(100),
	tenant_id: z.string().min(1).max(100),
	changes: z
		.array(
			z.object({
				domain: z.string().min(1).max(50),
				field: z.string().min(1).max(50),
				value: z.unknown(),
			}),
		)
		.min(1)
		.max(50),
});

// =============================================================================
// Response Types
// =============================================================================

/** Standard execution worker response envelope */
export interface ExecResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
	};
}

/** Result of executing a batch of changes */
export interface ExecutionResultData {
	appliedCount: number;
	failedCount: number;
	steps: Array<{
		domain: string;
		field: string;
		success: boolean;
		error?: string;
	}>;
}

// =============================================================================
// Inferred Types
// =============================================================================

export type ExecRequest = z.infer<typeof ExecRequestSchema>;
