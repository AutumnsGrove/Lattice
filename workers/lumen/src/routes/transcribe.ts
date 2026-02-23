/**
 * POST /transcribe — Voice-to-text endpoint
 *
 * Runs audio through Lumen's transcription pipeline.
 * Supports "raw" (1 quota unit) and "draft" (2 units + LLM structuring) modes.
 * Trust boundary: request body validated through Zod schema.
 */

import { Hono } from "hono";
import type { Env, LumenWorkerResponse } from "../types";
import { TranscribeRequestSchema } from "../types";
import type { AuthVariables } from "../auth/middleware";
import { createLumenClientForWorker } from "../lib/client-factory";
import { buildErrorResponse } from "../lib/errors";

const transcribe = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

transcribe.post("/", async (c) => {
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

	const parsed = TranscribeRequestSchema.safeParse(body);
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

		const result = await lumen.transcribe(
			{
				audio: req.audio,
				tenant: req.tenant_id,
				mode: req.mode,
			},
			req.tier,
		);

		const response: LumenWorkerResponse = {
			success: true,
			data: {
				text: result.text,
				wordCount: result.wordCount,
				duration: result.duration,
				model: result.model,
				gutterContent: result.gutterContent,
			},
			meta: {
				task: "transcription",
				model: result.model,
				provider: "cloudflare-ai",
				latencyMs: Date.now() - startTime,
			},
		};
		return c.json(response);
	} catch (err) {
		const { body, status } = buildErrorResponse(err, "transcription", startTime);
		return c.json(body, status);
	}
});

export { transcribe };
