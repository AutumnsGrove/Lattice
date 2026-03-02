/**
 * Dispatcher — Core Execution Logic
 *
 * 1. Validates every change against WRITE_ALLOWLIST — rejects entire batch if any disallowed
 * 2. Groups changes by domain
 * 3. Builds API payloads using ENDPOINT_MAP (settings-kv → N calls, object-merge → 1 call)
 * 4. Executes all API calls in parallel via Promise.allSettled()
 * 5. Returns per-step success/failure results
 */

import { validateBatch } from "./allowlist";
import { getEndpoint } from "./endpoint-map";
import type { DomainEndpoint } from "./endpoint-map";
import { GroveAppClient } from "./client";
import type { ApiCall, ApiResult } from "./client";
import type { ExecRequest, ExecutionResultData } from "../types";

// =============================================================================
// Types
// =============================================================================

interface Change {
	domain: string;
	field: string;
	value: unknown;
}

interface StepResult {
	domain: string;
	field: string;
	success: boolean;
	error?: string;
}

// =============================================================================
// Dispatcher
// =============================================================================

/**
 * Dispatch validated changes to the SvelteKit app.
 *
 * Steps:
 * 1. Allowlist check (fail-fast — rejects entire batch)
 * 2. Group changes by domain
 * 3. Build API calls per domain (respecting payload style)
 * 4. Execute all calls in parallel
 * 5. Aggregate results
 */
export async function dispatch(
	request: ExecRequest,
	client: GroveAppClient,
): Promise<ExecutionResultData> {
	const { changes } = request;

	// ── Step 1: Allowlist validation ─────────────────────────────────────
	const disallowed = validateBatch(changes);
	if (disallowed) {
		return {
			appliedCount: 0,
			failedCount: changes.length,
			steps: changes.map((c) => ({
				domain: c.domain,
				field: c.field,
				success: false,
				error:
					c.domain === disallowed.domain && c.field === disallowed.field
						? `Field "${c.field}" on domain "${c.domain}" is not in the write allowlist`
						: "Batch rejected due to disallowed field",
			})),
		};
	}

	// ── Step 2: Group changes by domain ──────────────────────────────────
	const grouped = groupByDomain(changes);

	// ── Step 3+4: Build and execute API calls ────────────────────────────
	const allStepResults: StepResult[] = [];
	const callPromises: Array<Promise<void>> = [];

	for (const [domain, domainChanges] of grouped) {
		const endpoint = getEndpoint(domain);
		if (!endpoint) {
			// Unknown domain — mark all fields as failed
			for (const change of domainChanges) {
				allStepResults.push({
					domain: change.domain,
					field: change.field,
					success: false,
					error: `No endpoint mapping for domain "${domain}"`,
				});
			}
			continue;
		}

		// Build API calls based on payload style
		const calls = buildCalls(endpoint, domainChanges);

		// Execute each call and collect results
		for (const { call, fields } of calls) {
			callPromises.push(
				client.send(call).then((result) => {
					for (const field of fields) {
						allStepResults.push({
							domain,
							field,
							success: result.success,
							error: result.error,
						});
					}
				}),
			);
		}
	}

	// Wait for all calls to complete
	await Promise.allSettled(callPromises);

	// ── Step 5: Aggregate results ────────────────────────────────────────
	const appliedCount = allStepResults.filter((r) => r.success).length;
	const failedCount = allStepResults.filter((r) => !r.success).length;

	return {
		appliedCount,
		failedCount,
		steps: allStepResults,
	};
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Group changes by domain name.
 */
function groupByDomain(changes: Change[]): Map<string, Change[]> {
	const groups = new Map<string, Change[]>();
	for (const change of changes) {
		const existing = groups.get(change.domain);
		if (existing) {
			existing.push(change);
		} else {
			groups.set(change.domain, [change]);
		}
	}
	return groups;
}

/**
 * Build API calls for a domain based on its endpoint configuration.
 *
 * "settings-kv" → one call per field (each with { setting_key, setting_value })
 * "object-merge" → one call with all fields merged into a single payload
 */
function buildCalls(
	endpoint: DomainEndpoint,
	changes: Change[],
): Array<{ call: ApiCall; fields: string[] }> {
	if (endpoint.style === "settings-kv") {
		// One API call per field
		return changes.map((change) => {
			const mapping = endpoint.fields[change.field];
			const apiKey = mapping?.apiKey ?? change.field;

			// For JSON/array values, serialize to string (settings table stores strings)
			const settingValue =
				typeof change.value === "string" ? change.value : JSON.stringify(change.value);

			return {
				call: {
					path: endpoint.path,
					method: endpoint.method,
					payload: {
						setting_key: apiKey,
						setting_value: settingValue,
					},
				},
				fields: [change.field],
			};
		});
	}

	// "object-merge" — merge all fields into one payload
	const payload: Record<string, unknown> = {};
	const fields: string[] = [];

	for (const change of changes) {
		const mapping = endpoint.fields[change.field];
		const apiKey = mapping?.apiKey ?? change.field;
		payload[apiKey] = change.value;
		fields.push(change.field);
	}

	return [
		{
			call: {
				path: endpoint.path,
				method: endpoint.method,
				payload,
			},
			fields,
		},
	];
}
