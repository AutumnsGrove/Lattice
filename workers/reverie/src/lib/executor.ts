/**
 * Reverie Executor — Apply Validated Changes via Execution Worker
 *
 * Delegates execution to the separate reverie-exec worker via service binding.
 * Reverie holds LLM access; the execution worker holds write access.
 * Neither has the other's secrets.
 */

import type { ChangePreview, Env } from "../types";

// =============================================================================
// Types
// =============================================================================

export interface ExecutionResult {
	success: boolean;
	steps: Array<{
		domain: string;
		field: string;
		success: boolean;
		error?: string;
	}>;
	appliedCount: number;
	failedCount: number;
}

// =============================================================================
// Executor
// =============================================================================

/**
 * Execute validated changes by calling the execution worker via service binding.
 *
 * The execution worker independently validates changes against its own
 * WRITE_ALLOWLIST, builds API payloads, and dispatches them to the
 * SvelteKit app (grove-lattice) via another service binding.
 */
export async function executeChanges(
	changes: ChangePreview[],
	env: Env,
	tenantId: string,
	tier: string,
	requestId: string,
): Promise<ExecutionResult> {
	if (!env.REVERIE_EXEC) {
		return {
			success: false,
			steps: changes.map((c) => ({
				domain: c.domain,
				field: c.field,
				success: false,
				error: "Execution worker service binding unavailable",
			})),
			appliedCount: 0,
			failedCount: changes.length,
		};
	}

	if (!env.EXEC_API_KEY) {
		return {
			success: false,
			steps: changes.map((c) => ({
				domain: c.domain,
				field: c.field,
				success: false,
				error: "EXEC_API_KEY secret not configured",
			})),
			appliedCount: 0,
			failedCount: changes.length,
		};
	}

	const response = await env.REVERIE_EXEC.fetch("https://reverie-exec.internal/execute", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-API-Key": env.EXEC_API_KEY,
			"X-Tenant-Id": tenantId,
			"X-Tier": tier,
		},
		body: JSON.stringify({
			request_id: requestId,
			tenant_id: tenantId,
			changes: changes.map((c) => ({
				domain: c.domain,
				field: c.field,
				value: c.to,
			})),
		}),
	});

	if (!response.ok) {
		let errorMsg = `Execution worker returned ${response.status}`;
		try {
			const errBody = (await response.json()) as { error?: { message?: string } };
			if (errBody.error?.message) {
				errorMsg = errBody.error.message;
			}
		} catch {
			// ignore parse failures
		}

		return {
			success: false,
			steps: changes.map((c) => ({
				domain: c.domain,
				field: c.field,
				success: false,
				error: errorMsg,
			})),
			appliedCount: 0,
			failedCount: changes.length,
		};
	}

	// Parse successful response
	const result = (await response.json()) as {
		success: boolean;
		data?: {
			appliedCount: number;
			failedCount: number;
			steps: Array<{
				domain: string;
				field: string;
				success: boolean;
				error?: string;
			}>;
		};
	};

	if (!result.data) {
		return {
			success: false,
			steps: changes.map((c) => ({
				domain: c.domain,
				field: c.field,
				success: false,
				error: "Unexpected response shape from execution worker",
			})),
			appliedCount: 0,
			failedCount: changes.length,
		};
	}

	return {
		success: result.success,
		steps: result.data.steps,
		appliedCount: result.data.appliedCount,
		failedCount: result.data.failedCount,
	};
}
