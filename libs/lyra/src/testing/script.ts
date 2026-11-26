/**
 * One script, two fakes.
 *
 * Lumen's inference call is plain JSON, so a turn can be written down once and
 * rendered twice: as the OpenRouter body the real pipeline reads, and as the
 * envelope a standalone fake answers with. The shared contract suite runs the
 * same script through both, and a disagreement fails the build (decision 67).
 *
 * Keeping the script neutral is the whole point. A script written in OpenRouter's
 * shape could only ever drive the real routes; one written in Lumen's envelope
 * shape would let the fake invent a reply the pipeline could never produce.
 */

import { calculateCost, MODELS } from "@autumnsgrove/lattice/ai/lumen/config";

/** The model the `agent` task runs on, and the one every script defaults to. */
export const SCRIPT_MODEL = MODELS.DEEPSEEK_V4_1_FLASH;

export type ScriptFinishReason = "stop" | "length" | "tool_calls" | "content_filter" | "other";

export interface ScriptToolCall {
	id: string;
	name: string;
	/** Raw text, exactly as a model would emit it, quotes and all. */
	arguments: string;
}

export interface ScriptTurn {
	text?: string;
	toolCalls?: ScriptToolCall[];
	finishReason?: ScriptFinishReason;
	inputTokens?: number;
	outputTokens?: number;
	/** Answer with an error envelope instead of a reply. */
	error?: { status: number; code: string; message: string; retryAfter?: string };
}

export interface LumenScript {
	turns: ScriptTurn[];
	model?: string;
}

/** The OpenRouter body the real provider parses. */
export function openRouterBody(turn: ScriptTurn, model: string): Record<string, unknown> {
	const text = turn.text ?? "";

	return {
		id: "gen-lyra-test",
		model,
		choices: [
			{
				index: 0,
				message: {
					role: "assistant",
					content: text === "" ? null : text,
					...(turn.toolCalls?.length
						? {
								tool_calls: turn.toolCalls.map((call) => ({
									id: call.id,
									type: "function",
									function: { name: call.name, arguments: call.arguments },
								})),
							}
						: {}),
				},
				finish_reason: wireFinishReason(
					turn.finishReason ?? (turn.toolCalls?.length ? "tool_calls" : "stop"),
				),
			},
		],
		usage: {
			prompt_tokens: turn.inputTokens ?? 120,
			completion_tokens: turn.outputTokens ?? 30,
			total_tokens: (turn.inputTokens ?? 120) + (turn.outputTokens ?? 30),
		},
	};
}

/**
 * The envelope `POST /inference` answers with.
 *
 * The cost comes from Lumen's own catalog and says so, which is the same figure
 * and the same label the real pipeline produces (L5) — so a difference between
 * the two fakes is a real difference, not a fixture's rounding.
 */
export function envelopeFor(
	turn: ScriptTurn,
	model: string,
): { status: number; body: Record<string, unknown>; headers: Record<string, string> } {
	if (turn.error) {
		return {
			status: turn.error.status,
			headers: turn.error.retryAfter ? { "Retry-After": turn.error.retryAfter } : {},
			body: {
				success: false,
				error: { code: turn.error.code, message: turn.error.message },
			},
		};
	}

	const input = turn.inputTokens ?? 120;
	const output = turn.outputTokens ?? 30;

	return {
		status: 200,
		headers: { "Content-Type": "application/json" },
		body: {
			success: true,
			data: {
				content: turn.text ?? "",
				model,
				provider: "openrouter",
				usage: { input, output, cost: calculateCost(model, input, output), cost_source: "catalog" },
				cached: false,
				...(turn.toolCalls?.length
					? {
							tool_calls: turn.toolCalls.map((call) => ({
								id: call.id,
								type: "function",
								function: { name: call.name, arguments: call.arguments },
							})),
						}
					: {}),
				finish_reason: turn.finishReason ?? (turn.toolCalls?.length ? "tool_calls" : "stop"),
			},
			meta: {
				task: "agent",
				model,
				provider: "openrouter",
				latencyMs: 0,
			},
		},
	};
}

/** Lumen normalizes finish reasons itself; keep the wire spelling honest. */
function wireFinishReason(reason: ScriptFinishReason): string {
	return reason === "other" ? "unknown" : reason;
}
