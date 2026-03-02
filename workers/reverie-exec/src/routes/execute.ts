/**
 * POST /execute — Apply Validated Changes
 *
 * Accepts a batch of validated changes from the Reverie worker,
 * validates them against the independent WRITE_ALLOWLIST, builds
 * API payloads, and dispatches them to the SvelteKit app.
 */

import { Hono } from "hono";
import type { Env, ExecVariables, ExecResponse, ExecutionResultData } from "../types";
import { ExecRequestSchema } from "../types";
import { EXEC_ERRORS, buildExecError } from "../errors";
import { dispatch } from "../lib/dispatcher";
import { GroveAppClient } from "../lib/client";

export const executeRoute = new Hono<{
	Bindings: Env;
	Variables: ExecVariables;
}>();

executeRoute.post("/", async (c) => {
	const start = Date.now();

	// ── Parse and validate request body ───────────────────────────────────
	let rawBody: unknown;
	try {
		rawBody = await c.req.json();
	} catch {
		const { body, status } = buildExecError(EXEC_ERRORS.INVALID_REQUEST, "Invalid JSON");
		return c.json(body, status as 400);
	}

	const parsed = ExecRequestSchema.safeParse(rawBody);
	if (!parsed.success) {
		const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
		const { body, status } = buildExecError(EXEC_ERRORS.INVALID_REQUEST, detail);
		return c.json(body, status as 400);
	}

	const request = parsed.data;
	const tenantId = c.get("tenantId");

	// Verify tenant_id in body matches authenticated tenant
	if (request.tenant_id !== tenantId) {
		const { body, status } = buildExecError(
			EXEC_ERRORS.AUTH_INVALID,
			"Tenant ID in body does not match authenticated tenant",
		);
		return c.json(body, status as 401);
	}

	// ── Check service binding ─────────────────────────────────────────────
	if (!c.env.GROVE_APP) {
		const { body, status } = buildExecError(EXEC_ERRORS.SERVICE_UNAVAILABLE);
		return c.json(body, status as 503);
	}

	if (!c.env.INTERNAL_SERVICE_KEY) {
		console.error("[ReverieExec] INTERNAL_SERVICE_KEY secret not configured");
		const { body, status } = buildExecError(EXEC_ERRORS.INTERNAL_ERROR);
		return c.json(body, status as 500);
	}

	// ── Dispatch changes ──────────────────────────────────────────────────
	const client = new GroveAppClient(c.env.GROVE_APP, c.env.INTERNAL_SERVICE_KEY, tenantId);

	let result: ExecutionResultData;
	try {
		result = await dispatch(request, client);
	} catch (err) {
		console.error("[ReverieExec] Dispatch error:", err instanceof Error ? err.message : err);
		const { body, status } = buildExecError(EXEC_ERRORS.DISPATCH_FAILED);
		return c.json(body, status as 502);
	}

	const latencyMs = Date.now() - start;

	// ── Return result ─────────────────────────────────────────────────────
	const response: ExecResponse<ExecutionResultData> = {
		success: result.failedCount === 0,
		data: result,
	};

	console.log(
		`[ReverieExec] ${request.request_id}: ${result.appliedCount}/${request.changes.length} applied (${latencyMs}ms)`,
	);

	return c.json(response, result.failedCount === 0 ? 200 : 207);
});
