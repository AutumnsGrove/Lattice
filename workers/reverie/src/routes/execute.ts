/**
 * POST /execute — Execute Previewed Changes
 *
 * Takes a request ID and list of changes (from the /configure preview)
 * and applies them to the tenant's site configuration.
 */

import { Hono } from "hono";
import type { Env, ReverieVariables, ReverieResponse } from "../types";
import { ExecuteRequestSchema } from "../types";
import { REVERIE_ERRORS, buildReverieError } from "../errors";
import { executeChanges } from "../lib/executor";
import { SCHEMA_REGISTRY } from "@autumnsgrove/lattice/reverie";
import type { DomainId } from "@autumnsgrove/lattice/reverie";

const execute = new Hono<{ Bindings: Env; Variables: ReverieVariables }>();

execute.post("/", async (c) => {
	const startTime = Date.now();

	// --- Trust boundary: validate request body ---
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		const { body: errBody, status } = buildReverieError(REVERIE_ERRORS.INVALID_REQUEST);
		return c.json(errBody, status as 400);
	}

	const parsed = ExecuteRequestSchema.safeParse(body);
	if (!parsed.success) {
		const fields = parsed.error.issues.map((i) => i.path.join(".")).filter(Boolean);
		const detail = fields.length > 0 ? `Invalid fields: ${fields.join(", ")}` : undefined;
		const { body: errBody, status } = buildReverieError(REVERIE_ERRORS.INVALID_REQUEST, detail);
		return c.json(errBody, status as 400);
	}

	const { request_id, changes } = parsed.data;
	const tenantId = c.get("tenantId");

	// Verify the request belongs to this tenant (request IDs are prefixed with tenant ID)
	if (!request_id.startsWith(`${tenantId}:`)) {
		const { body: errBody, status } = buildReverieError(REVERIE_ERRORS.REQUEST_NOT_FOUND);
		return c.json(errBody, status as 404);
	}

	try {
		// Re-validate changes against schema (defense-in-depth — don't trust client-provided domains)
		for (const change of changes) {
			const schema = SCHEMA_REGISTRY[change.domain as DomainId];
			if (!schema) {
				const { body: errBody, status } = buildReverieError(
					REVERIE_ERRORS.VALIDATION_FAILED,
					`Unknown domain: ${change.domain}`,
				);
				return c.json(errBody, status as 400);
			}
			if (schema.writeEndpoint === null) {
				const { body: errBody, status } = buildReverieError(REVERIE_ERRORS.DOMAIN_READ_ONLY);
				return c.json(errBody, status as 403);
			}
			if (!(change.field in schema.fields)) {
				const { body: errBody, status } = buildReverieError(
					REVERIE_ERRORS.VALIDATION_FAILED,
					`Unknown field: ${change.field}`,
				);
				return c.json(errBody, status as 400);
			}
		}

		// Convert request changes to ChangePreview format for executor
		const changesPreviewed = changes.map((change) => ({
			domain: change.domain,
			field: change.field,
			from: null,
			to: change.value,
			description: `Set ${change.domain}.${change.field}`,
		}));

		const result = await executeChanges(changesPreviewed);

		const response: ReverieResponse = {
			success: result.success,
			data: {
				requestId: request_id,
				appliedCount: result.appliedCount,
				failedCount: result.failedCount,
				steps: result.steps,
			},
			meta: {
				latencyMs: Date.now() - startTime,
			},
		};

		return c.json(response, result.success ? 200 : 207);
	} catch (err) {
		const errMsg = err instanceof Error ? err.message : "Unknown";
		console.error("[Reverie] Execute error:", { message: errMsg });
		const { body: errBody, status } = buildReverieError(REVERIE_ERRORS.EXECUTION_FAILED);
		return c.json(errBody, status as 500);
	}
});

export { execute };
