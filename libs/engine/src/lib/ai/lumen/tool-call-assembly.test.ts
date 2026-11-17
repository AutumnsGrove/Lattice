/**
 * Assembling streamed tool calls (#1730).
 *
 * The failure this guards is the quiet one: a stream cut off mid-call leaves
 * JSON that looks like a call but is not, and running it is worse than
 * retrying.
 */

import { describe, it, expect } from "vitest";
import { assembleToolCallDeltas } from "./tool-call-assembly.js";
import type { LumenToolCallDelta } from "./types.js";

const fragmented: LumenToolCallDelta[] = [
	{ index: 0, id: "call_abc", name: "get_weather" },
	{ index: 0, argumentsDelta: '{"ci' },
	{ index: 0, argumentsDelta: 'ty":"NYC"}' },
];

describe("assembleToolCallDeltas", () => {
	it("reassembles a single fragmented call", () => {
		const { calls, incomplete } = assembleToolCallDeltas(fragmented);

		expect(incomplete).toEqual([]);
		expect(calls).toHaveLength(1);
		expect(calls[0]).toEqual({
			id: "call_abc",
			type: "function",
			function: { name: "get_weather", arguments: '{"city":"NYC"}' },
		});
	});

	it("produces what the non-streaming path returns", () => {
		// The static path parses `tool_calls` straight from the response; a
		// streamed call has to end up the same shape or a consumer has to branch.
		const { calls } = assembleToolCallDeltas(fragmented);
		expect(calls[0].function.arguments).toBe('{"city":"NYC"}');
		expect(calls[0].type).toBe("function");
	});

	it("keeps parallel calls apart and in index order", () => {
		const { calls } = assembleToolCallDeltas([
			{ index: 1, id: "call_b", name: "two", argumentsDelta: "{}" },
			{ index: 0, id: "call_a", name: "one", argumentsDelta: '{"x":1}' },
		]);

		expect(calls.map((c) => c.id)).toEqual(["call_a", "call_b"]);
		expect(calls.map((c) => c.function.name)).toEqual(["one", "two"]);
	});

	it("concatenates argument slices in arrival order, not sorted order", () => {
		const { calls } = assembleToolCallDeltas([
			{ index: 0, id: "c", name: "t" },
			{ index: 0, argumentsDelta: '{"a"' },
			{ index: 0, argumentsDelta: ":" },
			{ index: 0, argumentsDelta: '"b"}' },
		]);

		expect(calls[0].function.arguments).toBe('{"a":"b"}');
	});

	it("refuses to complete a call whose arguments were cut off", () => {
		// This is a stream that ended with finishReason "length".
		const { calls, incomplete } = assembleToolCallDeltas([
			{ index: 0, id: "call_x", name: "create_post" },
			{ index: 0, argumentsDelta: '{"title":"half a tit' },
		]);

		expect(calls).toEqual([]);
		expect(incomplete).toEqual([{ index: 0, reason: "invalid-json" }]);
	});

	it("reports a fragment with no id", () => {
		const { calls, incomplete } = assembleToolCallDeltas([
			{ index: 0, name: "t", argumentsDelta: "{}" },
		]);

		expect(calls).toEqual([]);
		expect(incomplete).toEqual([{ index: 0, reason: "missing-id" }]);
	});

	it("reports a fragment with no name", () => {
		const { calls, incomplete } = assembleToolCallDeltas([
			{ index: 0, id: "call_1", argumentsDelta: "{}" },
		]);

		expect(calls).toEqual([]);
		expect(incomplete).toEqual([{ index: 0, reason: "missing-name" }]);
	});

	it("treats a call with no arguments as an empty object", () => {
		const { calls } = assembleToolCallDeltas([{ index: 0, id: "c", name: "no_args" }]);
		expect(calls[0].function.arguments).toBe("{}");
	});

	it("keeps the calls that did parse while reporting the one that did not", () => {
		const { calls, incomplete } = assembleToolCallDeltas([
			{ index: 0, id: "call_ok", name: "fine", argumentsDelta: "{}" },
			{ index: 1, id: "call_bad", name: "cut", argumentsDelta: '"nope' },
		]);

		expect(calls.map((c) => c.id)).toEqual(["call_ok"]);
		expect(incomplete).toEqual([{ index: 1, reason: "invalid-json" }]);
	});

	it("returns nothing for an empty stream", () => {
		expect(assembleToolCallDeltas([])).toEqual({ calls: [], incomplete: [] });
	});
});
