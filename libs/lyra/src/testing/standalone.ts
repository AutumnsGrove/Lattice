/**
 * The standalone fake Lumen.
 *
 * It answers `POST /inference` with the same envelopes the real worker does, built
 * from the shared script. It runs none of the pipeline — no validation, no
 * scrubbing, no quota — which is exactly what makes it a second opinion: when the
 * real routes and this fake agree on a script, the reply shape is not an accident
 * of either implementation.
 *
 * It is a `fetch`-shaped function rather than a socket. A socket would prove
 * nothing the exchange does not already prove (that a JSON body crosses a
 * boundary), and it would make every case in the contract suite wait on a port.
 * Pointing an adapter at it is one line: `fetch: fake.fetch`.
 */

import { SCRIPT_MODEL, type LumenScript } from "./script.js";
import type { LumenAnswer, LumenConnection, LumenUnderTest } from "./contract.js";
import { envelopeFor } from "./script.js";

/** The key the contract's cases present, so a missing one is testable. */
export const CONTRACT_KEY = "lumen-test-caller-key";

export interface FakeLumenOptions {
	/** The key callers must present, matching the worker's `LUMEN_API_KEY`. */
	apiKey?: string;
	model?: string;
}

export interface FakeLumen {
	/** Shown in test names. */
	name: string;
	/** Every body the caller sent, in order, so a test can assert on the request. */
	readonly requests: Array<Record<string, unknown>>;
	/** A `fetch` an adapter can be pointed at. */
	fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
	/** How many turns are left unserved; a script that ran dry is a bug in the test. */
	remaining(): number;
}

export function fakeLumen(script: LumenScript, options: FakeLumenOptions = {}): FakeLumen {
	const model = script.model ?? options.model ?? SCRIPT_MODEL;
	const queue = [...script.turns];
	const requests: Array<Record<string, unknown>> = [];

	const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
		new Response(JSON.stringify(body), {
			status,
			headers: { "Content-Type": "application/json", ...headers },
		});

	return {
		name: "the standalone fake Lumen",
		requests,

		async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
			const request = new Request(input, init);
			const url = new URL(request.url);

			if (!url.pathname.endsWith("/inference")) {
				return json(
					{ success: false, error: { code: "NOT_FOUND", message: "no such route" } },
					404,
				);
			}

			if (options.apiKey !== undefined && request.headers.get("X-API-Key") !== options.apiKey) {
				return json(
					{
						success: false,
						error: { code: "AUTH_REQUIRED", message: "Missing X-API-Key header" },
					},
					401,
				);
			}

			let body: Record<string, unknown>;
			try {
				body = (await request.json()) as Record<string, unknown>;
			} catch {
				return json(
					{
						success: false,
						error: { code: "INVALID_REQUEST", message: "Invalid JSON body" },
					},
					400,
				);
			}

			requests.push(body);

			if (queue.length === 0) {
				throw new Error("the fake Lumen was asked for more turns than its script holds");
			}

			const { status, body: envelope, headers } = envelopeFor(queue.shift()!, model);
			return json(envelope, status, headers);
		},

		remaining: () => queue.length,
	};
}

/**
 * The fake as a contract subject.
 *
 * A fresh fake per case, so each case gets its own script queue rather than
 * inheriting the turns a previous case did not use.
 */
export function fakeLumenSubject(): LumenUnderTest {
	return {
		name: "the standalone fake",
		kind: "fake",
		async open(script: LumenScript): Promise<LumenConnection> {
			const fake = fakeLumen(script, { apiKey: CONTRACT_KEY });

			return {
				async post(body, options = {}): Promise<LumenAnswer> {
					const key = options.apiKey === null ? undefined : (options.apiKey ?? CONTRACT_KEY);
					const response = await fake.fetch("https://fake-lumen.test/inference", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...(key === undefined ? {} : { "X-API-Key": key }),
						},
						body: options.raw ?? JSON.stringify(body),
					});

					const text = await response.text();
					let envelope: Record<string, unknown> | undefined;
					try {
						envelope = JSON.parse(text) as Record<string, unknown>;
					} catch {
						envelope = undefined;
					}

					return { status: response.status, envelope };
				},
			};
		},
	};
}
