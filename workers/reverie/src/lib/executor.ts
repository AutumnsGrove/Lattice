/**
 * Reverie Executor — Apply Validated Changes
 *
 * Converts validated changes into API calls and executes them.
 * Uses Promise.allSettled() for parallel execution with per-domain results.
 *
 * Note: In the initial implementation, execution is a stub that returns
 * success for all changes. Real execution will call domain-specific
 * Grove APIs via service bindings or direct DB writes.
 */

import { SCHEMA_REGISTRY } from "@autumnsgrove/lattice/reverie";
import type { DomainId } from "@autumnsgrove/lattice/reverie";
import type { ChangePreview } from "../types";

// =============================================================================
// Types
// =============================================================================

export interface ExecutionStep {
	domain: string;
	field: string;
	value: unknown;
	endpoint: string;
	method: string;
}

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
 * Execute validated changes against Grove APIs.
 *
 * Currently a stub — builds execution steps but returns simulated success.
 * Real implementation will call endpoints via service bindings.
 */
export async function executeChanges(changes: ChangePreview[]): Promise<ExecutionResult> {
	// Build execution steps from validated changes
	const steps = changes.map((change) => {
		const schema = SCHEMA_REGISTRY[change.domain as DomainId];

		return {
			domain: change.domain,
			field: change.field,
			value: change.to,
			endpoint: schema?.writeEndpoint ?? "",
			method: schema?.writeMethod ?? "PUT",
		};
	});

	// Execute all steps in parallel
	// TODO: Replace with actual API calls via domain service bindings
	const results = await Promise.allSettled(steps.map((step) => executeStep(step)));

	const stepResults = results.map((result, i) => ({
		domain: steps[i].domain,
		field: steps[i].field,
		success: result.status === "fulfilled",
		error:
			result.status === "rejected"
				? result.reason instanceof Error
					? result.reason.message
					: "Unknown error"
				: undefined,
	}));

	const appliedCount = stepResults.filter((r) => r.success).length;
	const failedCount = stepResults.filter((r) => !r.success).length;

	return {
		success: failedCount === 0,
		steps: stepResults,
		appliedCount,
		failedCount,
	};
}

/**
 * Execute a single configuration change.
 * Stub implementation — returns success immediately.
 */
async function executeStep(step: ExecutionStep): Promise<void> {
	// Validate the step has a valid endpoint
	if (!step.endpoint) {
		throw Object.defineProperty(new Error(`No write endpoint for domain ${step.domain}`), "code", {
			value: "REV-010",
			enumerable: true,
		});
	}

	// TODO: Real execution via domain service bindings
	// const response = await serviceBinding.fetch(step.endpoint, {
	//   method: step.method,
	//   headers: { "Content-Type": "application/json" },
	//   body: JSON.stringify({ [step.field]: step.value }),
	// });
	//
	// if (!response.ok) {
	//   throw new Error(`API call failed: ${response.status}`);
	// }
}
