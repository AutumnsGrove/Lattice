/**
 * POST /embed — Vector embedding endpoint
 *
 * Generates embeddings via the Lumen pipeline.
 * Trust boundary: request body validated through Zod schema.
 */

import { Hono } from "hono";
import type { Env, LumenWorkerResponse } from "../types";
import { EmbedRequestSchema } from "../types";
import type { AuthVariables } from "../auth/middleware";
import { createLumenClientForWorker } from "../lib/client-factory";
import { buildErrorResponse } from "../lib/errors";

const embed = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

embed.post("/", async (c) => {
	const startTime = Date.now();

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

	const parsed = EmbedRequestSchema.safeParse(body);
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
		const lumen = await createLumenClientForWorker(c.env, undefined, req.tenant_id);

		const result = await lumen.embed(
			{
				input: req.input,
				tenant: req.tenant_id,
				model: req.model,
			},
			req.tier,
		);

		const response: LumenWorkerResponse = {
			success: true,
			data: {
				embeddings: result.embeddings,
				model: result.model,
				tokens: result.tokens,
			},
			meta: {
				task: "embedding",
				model: result.model,
				provider: "cloudflare-ai",
				latencyMs: Date.now() - startTime,
			},
		};
		return c.json(response);
	} catch (err) {
		const { body, status } = buildErrorResponse(err, "embedding", startTime);
		return c.json(body, status as 500);
	}
});

export { embed };
