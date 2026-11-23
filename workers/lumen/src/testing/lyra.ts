/**
 * The Lumen routes, in process, with only the network faked.
 *
 * This is the honest half of the two fakes (decision 67). The real route runs:
 * Zod validation, the privacy scrubber, task routing, model selection, request
 * formatting, response parsing, finish reason and catalog cost. The only thing
 * that is not real is the HTTP call to OpenRouter, which answers with a body built
 * from the shared script.
 *
 * The app is assembled from the same `apiKeyAuth` and `inference` modules the
 * worker deploys, rather than from `index.ts`, because `index.ts` also mounts
 * infrastructure middleware and Threshold rate limiting whose bindings have no
 * bearing on the reply shape. What is left out is named here so nobody assumes
 * the harness covers it.
 */

import { Hono } from "hono";
import { apiKeyAuth } from "../auth/middleware";
import { inference } from "../routes/inference";
import type { Env } from "../types";
import {
	CONTRACT_KEY,
	SCRIPT_MODEL,
	openRouterBody,
	type LumenAnswer,
	type LumenConnection,
	type LumenScript,
	type LumenUnderTest,
} from "@autumnsgrove/lyra-lumen/testing";

/** Anything the pipeline asks D1 for, answered harmlessly. */
function fakeD1(): D1Database {
	return {
		prepare: () => ({
			bind: () => ({
				first: async () => null,
				run: async () => ({ meta: { changes: 1 } }),
				all: async () => ({ results: [] }),
			}),
			first: async () => null,
			run: async () => ({ meta: { changes: 1 } }),
			all: async () => ({ results: [] }),
		}),
	} as unknown as D1Database;
}

/** The bindings the auth middleware and the inference route read. */
export function harnessEnv(): Env {
	return {
		DB: fakeD1(),
		AI: {} as Env["AI"],
		// BYOK is always passed, so Warden is never asked; an absent binding is the
		// proof of that rather than a stub pretending to answer.
		WARDEN: undefined as unknown as Env["WARDEN"],
		RATE_LIMITS: undefined as unknown as Env["RATE_LIMITS"],
		LUMEN_API_KEY: CONTRACT_KEY,
		WARDEN_API_KEY: "not-used",
	};
}

/** The worker's real routes, mounted the way the worker mounts them. */
export function harnessApp(): Hono<{ Bindings: Env }> {
	const app = new Hono<{ Bindings: Env }>();
	app.use("/inference/*", apiKeyAuth);
	app.route("/inference", inference);
	return app;
}

export function inProcessLumenSubject(): LumenUnderTest {
	return {
		name: "the real Lumen routes, in process",
		kind: "routes",

		async open(script: LumenScript): Promise<LumenConnection> {
			const turns = [...script.turns];
			const model = script.model ?? SCRIPT_MODEL;
			const app = harnessApp();
			const env = harnessEnv();
			const originalFetch = globalThis.fetch;

			// The one seam: the provider's HTTP call. Everything above it is real.
			globalThis.fetch = (async () => {
				const turn = turns.shift();
				if (turn === undefined) {
					throw new Error("the harness was asked for more turns than its script holds");
				}

				if (turn.error) {
					return new Response(
						JSON.stringify({ error: { code: turn.error.code, message: turn.error.message } }),
						{ status: turn.error.status, headers: { "Content-Type": "application/json" } },
					);
				}

				return new Response(JSON.stringify(openRouterBody(turn, model)), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}) as typeof globalThis.fetch;

			return {
				async post(body, options = {}): Promise<LumenAnswer> {
					const key = options.apiKey === null ? undefined : (options.apiKey ?? CONTRACT_KEY);

					try {
						const response = await app.fetch(
							new Request("https://lumen.test/inference", {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									...(key === undefined ? {} : { "X-API-Key": key }),
								},
								body: options.raw ?? JSON.stringify(body),
							}),
							env,
						);

						const text = await response.text();
						let envelope: Record<string, unknown> | undefined;
						try {
							envelope = JSON.parse(text) as Record<string, unknown>;
						} catch {
							envelope = undefined;
						}

						return { status: response.status, envelope };
					} finally {
						// One request per case, so the seam is put back as soon as the answer
						// is in hand. A case that needs two requests gets its own connection.
						globalThis.fetch = originalFetch;
					}
				},
			};
		},
	};
}
