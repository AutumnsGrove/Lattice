/**
 * POST /moderate — Content moderation endpoint
 *
 * Runs content through Lumen's moderation pipeline with fallback chain.
 * Trust boundary: request body validated through Zod schema.
 */

import { Hono } from "hono";
import type { Env, LumenWorkerResponse } from "../types";
import { ModerateRequestSchema } from "../types";
import type { AuthVariables } from "../auth/middleware";
import { createLumenClientForWorker } from "../lib/client-factory";
import { buildErrorResponse } from "../lib/errors";

const moderate = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

moderate.post("/", async (c) => {
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

	const parsed = ModerateRequestSchema.safeParse(body);
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
		const lumen = createLumenClientForWorker(c.env);

		const result = await lumen.moderate(
			{
				content: req.content,
				tenant: req.tenant_id,
				model: req.model,
			},
			req.tier,
		);

		const response: LumenWorkerResponse = {
			success: true,
			data: {
				safe: result.safe,
				categories: result.categories,
				confidence: result.confidence,
				model: result.model,
			},
			meta: {
				task: "moderation",
				model: result.model,
				provider: "openrouter",
				latencyMs: Date.now() - startTime,
			},
		};
		return c.json(response);
	} catch (err) {
		const { body, status } = buildErrorResponse(err, "moderation", startTime);
		return c.json(body, status);
	}
});

export { moderate };
