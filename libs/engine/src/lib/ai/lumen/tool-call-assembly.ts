/**
 * Assembling streamed tool calls
 *
 * A streaming provider sends a tool call in fragments: the first carries the
 * `id` and function `name`, the rest carry slices of the JSON arguments, and
 * parallel calls interleave with nothing but an `index` to tell them apart.
 *
 * Lumen carries those fragments as deltas (`LumenToolCallDelta`) and does not
 * assemble them for the caller, because assembly is where a truncated call
 * becomes a plausible-looking one. This module is the single implementation of
 * that assembly, so a consumer does not invent its own and quietly drop the
 * truncation check.
 *
 * The check matters: a stream cut off at the token limit produces arguments
 * that are valid prefix JSON with no closing brace. `JSON.parse` throws on that
 * — which is *better* than succeeding — but only if somebody actually tries it.
 *
 * @see docs/specs/lumen-tool-calling-spec.md — "Who Drives the Loop"
 */

import type { LumenToolCall, LumenToolCallDelta } from "./types.js";

export interface AssembledToolCalls {
	/**
	 * Calls whose arguments parsed. Safe to run.
	 *
	 * A call is only included when it has an id, a name, and arguments that
	 * parse — anything less cannot be executed or matched to a result.
	 */
	calls: LumenToolCall[];

	/**
	 * Fragments that could not be completed, by index, with the reason.
	 *
	 * Present and non-empty means the caller should discard the turn rather than
	 * run the calls that did assemble: a stream cut off mid-call usually means
	 * the model had more to say, and running a partial plan is worse than
	 * retrying.
	 */
	incomplete: Array<{ index: number; reason: "missing-id" | "missing-name" | "invalid-json" }>;
}

/**
 * Fold tool-call deltas into complete calls.
 *
 * Fragments are grouped by `index` and their argument slices concatenated in
 * arrival order — which is the order the provider sent them, not sorted order.
 *
 * @param deltas every fragment seen on the stream, in any order they arrived
 */
export function assembleToolCallDeltas(deltas: LumenToolCallDelta[]): AssembledToolCalls {
	const byIndex = new Map<number, { id?: string; name?: string; args: string }>();

	for (const delta of deltas) {
		const entry = byIndex.get(delta.index) ?? { args: "" };
		if (delta.id) entry.id = delta.id;
		if (delta.name) entry.name = delta.name;
		if (delta.argumentsDelta) entry.args += delta.argumentsDelta;
		byIndex.set(delta.index, entry);
	}

	const calls: LumenToolCall[] = [];
	const incomplete: AssembledToolCalls["incomplete"] = [];

	for (const index of [...byIndex.keys()].sort((a, b) => a - b)) {
		const entry = byIndex.get(index)!;

		if (!entry.id) {
			incomplete.push({ index, reason: "missing-id" });
			continue;
		}
		if (!entry.name) {
			incomplete.push({ index, reason: "missing-name" });
			continue;
		}

		// A call with no arguments at all is legal — a tool may take none — but
		// only if the provider actually sent an empty object rather than nothing.
		const args = entry.args.trim() === "" ? "{}" : entry.args;

		try {
			JSON.parse(args);
		} catch {
			incomplete.push({ index, reason: "invalid-json" });
			continue;
		}

		calls.push({
			id: entry.id,
			type: "function",
			function: { name: entry.name, arguments: args },
		});
	}

	return { calls, incomplete };
}
