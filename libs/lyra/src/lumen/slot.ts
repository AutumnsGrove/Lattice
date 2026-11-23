/**
 * The Lumen model slot.
 *
 * Lyra asks for a turn; this turns it into a `POST /inference` to Grove's
 * inference worker and turns the answer back. It is the only file in the
 * project that knows both vocabularies, and everything Grove-shaped stops here
 * — the task, the tier, the quota skip, and the Wanderer's own provider key.
 *
 * The worker's HTTP contract is spoken directly rather than through
 * `RemoteLumenClient`, and for one reason: `retryable` is load-bearing (decision
 * 58) and the client throws a plain `Error` that keeps neither the HTTP status
 * nor `Retry-After`. This is not a raw call to a model API — it is the same
 * request the Lumen SDK itself makes, with the status kept instead of dropped.
 */

import { z } from "zod";
import type { ModelError, ModelReply, ModelRequest, ModelSlot, Result } from "@autumnsgrove/lyra";
import { err, ok } from "@autumnsgrove/lyra";
import { getModelCapabilities, getTaskConfig } from "@autumnsgrove/lattice/ai/lumen/config";
import type { LumenTask } from "@autumnsgrove/lattice/ai/lumen/types";
import { errorForResponse, providerError, redact, stoppedError } from "./errors.js";
import { fromLumenReply, toLumenMessages, toLumenTool } from "./wire.js";

/** However long a single turn is allowed to take before it is abandoned. */
export const DEFAULT_DEADLINE_MS = 120_000;

/** The task an ordinary agent turn runs as. A compaction asks a different question. */
const DEFAULT_TASK: LumenTask = "agent";

/** What a summarising turn runs as, so the cheap model answers it. */
const COMPACTION_TASK: LumenTask = "summary";

export interface LumenModelSlotConfig {
	/** Where the inference worker lives, e.g. `https://lumen.grove.place`. */
	baseUrl?: string;
	/** A service binding (`env.LUMEN`), preferred to a URL inside a worker. */
	fetcher?: { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> };
	/** The transport itself, for tests and the in-process harness. */
	fetch?: typeof globalThis.fetch;
	/** The caller key this worker accepts (`LUMEN_API_KEY`). Never the provider's. */
	apiKey?: string;
	/** Whose secrets and quota the call belongs to. */
	tenantId?: string;
	/**
	 * The Wanderer's own provider key (`tenant_api_key`), sent in the request body
	 * and nowhere else. A function is accepted so a caller can read it from the
	 * secrets slot per call rather than holding it in an object that might be logged.
	 */
	tenantApiKey?: string | (() => string | undefined | Promise<string | undefined>);
	/** Which tier to bill the call to. Absent lets Lumen decide. */
	tier?: string;
	/** The task to run as. Defaults to `agent`. */
	task?: LumenTask;
	/** A model override for every turn; `request.model` still wins. */
	model?: string;
	maxTokens?: number;
	temperature?: number;
	deadlineMs?: number;
	/** Overrides the model's own context window, for a model the registry lacks. */
	contextWindow?: number;
	/** Injectable clock, so a deadline can be tested without waiting. */
	now?: () => number;
}

/** The reply as the worker sends it. Validated at the boundary, per Rootwork. */
const ReplyDataSchema = z.object({
	content: z.string(),
	model: z.string(),
	usage: z.object({
		input: z.number(),
		output: z.number(),
		cost: z.number(),
		cost_source: z.enum(["catalog", "provider"]).optional(),
	}),
	tool_calls: z
		.array(
			z.object({
				id: z.string(),
				type: z.literal("function"),
				function: z.object({ name: z.string(), arguments: z.string() }),
			}),
		)
		.optional(),
	finish_reason: z.enum(["stop", "length", "tool_calls", "content_filter", "other"]).optional(),
});

const EnvelopeSchema = z.object({
	success: z.boolean(),
	data: z.unknown().optional(),
	error: z.object({ code: z.string(), message: z.string() }).optional(),
});

/**
 * Build the slot.
 *
 * `contextWindow` is set from the model's own flags at construction, because a
 * slot that does not say leaves compaction with no number to compare against
 * (decision 41): the run grows until the provider refuses it. `request.model`
 * can override the model per turn, and the window follows it.
 */
export function createLumenModelSlot(config: LumenModelSlotConfig = {}): ModelSlot {
	const task = config.task ?? DEFAULT_TASK;
	const doFetch = config.fetch ?? ((input, init) => fetch(input, init));
	const now = config.now ?? Date.now;
	const deadlineMs = config.deadlineMs ?? DEFAULT_DEADLINE_MS;
	const baseUrl = config.baseUrl?.replace(/\/+$/, "");

	const url = `${baseUrl ?? ""}/inference`;
	const send = (input: string, init: RequestInit): Promise<Response> =>
		config.fetcher ? config.fetcher.fetch(input, init) : doFetch(input, init);

	return {
		contextWindow: config.contextWindow ?? windowFor(config.model, task),

		async complete(request: ModelRequest): Promise<Result<ModelReply, ModelError>> {
			const secret = config.tenantApiKey;

			if (request.signal.aborted) {
				// Nothing was sent, so there is nothing to stop and nothing to bill.
				return err(stoppedError(undefined));
			}

			let key: string | undefined;
			try {
				key = typeof secret === "function" ? await secret() : secret;
			} catch (cause) {
				return err({
					code: "internal",
					message: redact(
						`the tenant's provider key could not be read: ${describe(cause)}`,
						undefined,
					),
					retryable: false,
				});
			}

			if (request.signal.aborted) {
				return err(stoppedError(key));
			}

			const body = requestBody(request, {
				config,
				task: request.purpose === "compaction" ? COMPACTION_TASK : task,
				tenantApiKey: key,
			});

			const deadline = new AbortController();
			const timer = setTimeout(() => deadline.abort(), deadlineMs);
			const forward = (): void => deadline.abort();
			request.signal.addEventListener("abort", forward, { once: true });

			// The deadline covers the body as well as the headers. A worker that sends
			// headers and then stalls mid-body is exactly the failure a deadline is for,
			// and the first version cleared the timer as soon as `send` resolved, so the
			// turn hung there with a timer that had already fired.
			try {
				let response: Response;
				try {
					response = await send(url, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...(config.apiKey ? { "X-API-Key": config.apiKey } : {}),
						},
						body: JSON.stringify(body),
						signal: deadline.signal,
					});
				} catch (cause) {
					// A stop we forwarded is a stop, not the network's fault.
					if (request.signal.aborted) {
						return err(stoppedError(key));
					}
					return err(
						deadline.signal.aborted
							? {
									code: "timeout",
									message: redact(`Lumen did not answer within ${deadlineMs}ms`, key),
									retryable: true,
								}
							: providerError(`Lumen could not be reached: ${describe(cause)}`, key),
					);
				}

				// A body cut off by the deadline reads as empty, which is the same shape as
				// one that arrived whole and said nothing.
				//
				// The race is not redundant with the signal: `fetch` rejects a body read when
				// its signal aborts, but a transport that ignores the signal (a stub, a service
				// binding with its own timeout) would leave this awaiting forever, and a
				// deadline that only some transports honour is not a deadline.
				const text = await Promise.race([
					response.text().catch(() => ""),
					new Promise<string>((resolve) => {
						if (deadline.signal.aborted) {
							resolve("");
							return;
						}
						deadline.signal.addEventListener("abort", () => resolve(""), { once: true });
					}),
				]);

				if (request.signal.aborted) {
					return err(stoppedError(key));
				}

				if (deadline.signal.aborted && text === "") {
					return err({
						code: "timeout",
						message: redact(`Lumen did not finish answering within ${deadlineMs}ms`, key),
						retryable: true,
					});
				}

				const envelope = parseEnvelope(text);

				if (!response.ok || envelope?.success === false) {
					return err(
						errorForResponse(response.status, text, {
							retryAfter: response.headers.get("Retry-After"),
							now: now(),
							secret: key,
						}),
					);
				}

				if (envelope === undefined) {
					return err(
						providerError(`Lumen answered ${response.status} with a body that is not JSON`, key),
					);
				}

				const data = ReplyDataSchema.safeParse(envelope.data);
				if (!data.success) {
					return err(
						providerError(
							`Lumen's reply did not match the slot's contract: ${data.error.issues
								.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
								.join("; ")}`,
							key,
						),
					);
				}

				// The reply reaches Lyra with no key in it: `fromLumenReply` copies only
				// what the contract names, and nothing here reads `options` back out.
				return ok(fromLumenReply(data.data));
			} finally {
				clearTimeout(timer);
				request.signal.removeEventListener("abort", forward);
			}
		},
	};
}

/** The model's own context window, following an override if one was given. */
function windowFor(model: string | undefined, task: LumenTask): number | undefined {
	const chosen = model ?? getTaskConfig(task).primaryModel;
	const window = getModelCapabilities(chosen)?.contextWindow;
	return window ?? undefined;
}

interface RequestContext {
	config: LumenModelSlotConfig;
	task: LumenTask;
	tenantApiKey: string | undefined;
}

/**
 * The body Lumen's worker validates.
 *
 * `skip_quota` is always on. The `agent` task's quota is zero on every tier until
 * a real rule exists (L3), so a ten-step run counted as ten requests against a
 * limit meant for one answer — and Lumen refuses the call outright without it.
 * The same reasoning covers a compaction turn: the run already pays for the day,
 * and summarising its own progress is not a second job.
 */
function requestBody(request: ModelRequest, context: RequestContext): Record<string, unknown> {
	const { config, task, tenantApiKey } = context;
	const tools = request.tools.map(toLumenTool);

	return {
		task,
		input: toLumenMessages(request),
		...(config.tenantId && { tenant_id: config.tenantId }),
		...(config.tier && { tier: config.tier }),
		options: {
			model: request.model ?? config.model,
			...(config.maxTokens !== undefined && { max_tokens: config.maxTokens }),
			...(config.temperature !== undefined && { temperature: config.temperature }),
			skip_quota: true,
			// The key goes here and nowhere else: not in a header, not in metadata,
			// not in anything a log or a record could hold.
			...(tenantApiKey && { tenant_api_key: tenantApiKey }),
			...(tools.length > 0 && { tools }),
		},
	};
}

function parseEnvelope(text: string): z.infer<typeof EnvelopeSchema> | undefined {
	if (text.trim() === "") {
		return undefined;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return undefined;
	}

	const envelope = EnvelopeSchema.safeParse(parsed);
	return envelope.success ? envelope.data : undefined;
}

function describe(cause: unknown): string {
	if (cause instanceof Error) {
		return cause.message;
	}
	return String(cause);
}
