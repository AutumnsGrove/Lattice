/**
 * POST /inference — Main AI inference endpoint
 *
 * Wraps the full Lumen pipeline:
 * validate → PII scrub → quota check → Songbird → route → execute → normalize → log
 *
 * Trust boundary: request body validated through Zod schema (Rootwork pattern).
 * Uses the existing LumenClient from @autumnsgrove/lattice/lumen.
 */

import { Hono } from "hono";
import type { Env, LumenWorkerResponse } from "../types";
import { InferenceRequestSchema } from "../types";
import type { AuthVariables } from "../auth/middleware";
import { createLumenClientForWorker } from "../lib/client-factory";
import { buildErrorResponse } from "../lib/errors";

const inference = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

inference.post("/", async (c) => {
	const startTime = Date.now();

	// --- Trust boundary: validate request body through Zod schema ---
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		const response: LumenWorkerResponse = {
			success: false,
			error: { code: "INVALID_REQUEST", message: "Invalid JSON body" },
		};
		return c.json(response, 400);
	}

	const parsed = InferenceRequestSchema.safeParse(body);
	if (!parsed.success) {
		const response: LumenWorkerResponse = {
			success: false,
			error: {
				code: "INVALID_PARAMS",
				message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
			},
		};
		return c.json(response, 400);
	}

	const req = parsed.data;

	try {
		const lumen = createLumenClientForWorker(c.env, req.options?.tenant_api_key);

		// tier is Zod-validated above (Rootwork boundary) — safe to pass directly
		const result = await lumen.run(
			{
				task: req.task,
				input: req.input,
				tenant: req.tenant_id,
				options: {
					model: req.options?.model,
					maxTokens: req.options?.max_tokens,
					temperature: req.options?.temperature,
					skipQuota: req.options?.skip_quota,
					skipPiiScrub: req.options?.skip_pii_scrub,
					songbird: req.options?.songbird,
					tenantApiKey: req.options?.tenant_api_key,
					metadata: req.options?.metadata,
				},
			},
			req.tier,
		);

		const response: LumenWorkerResponse = {
			success: true,
			data: {
				content: result.content,
				model: result.model,
				provider: result.provider,
				usage: result.usage,
				cached: result.cached,
			},
			meta: {
				task: req.task,
				model: result.model,
				provider: result.provider,
				latencyMs: Date.now() - startTime,
			},
		};
		return c.json(response);
	} catch (err) {
		const { body, status } = buildErrorResponse(err, req.task, startTime);
		return c.json(body, status);
	}
});

export { inference };
