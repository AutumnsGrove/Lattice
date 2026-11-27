/**
 * A whole day, through Lyra's loop (#1798, slice 2).
 *
 * The tool tests drive each tool by hand; this one proves the recipe is a recipe:
 * a scripted model asks for tools by name, the loop validates and applies them,
 * `finish` refuses until the day is covered, and the run ends `done` with a page
 * that serializes into the marker-and-gutter shape the page already renders.
 */

import { runTask, type RunResult } from "@autumnsgrove/lyra";
import { counterIds, memoryStorage } from "@autumnsgrove/lyra/memory";
import { fakeClock, scriptedModel, type ScriptedTurn } from "@autumnsgrove/lyra/testkit";
import { describe, expect, it } from "vitest";
import { createTimelineRecipe } from "./recipe";
import { serializePage } from "./serialize";
import type { TimelineState } from "./state";
import { createDay, fakeReader } from "./testing";

async function runDay(turns: readonly ScriptedTurn[]): Promise<{
	result: RunResult;
	state: TimelineState;
}> {
	const recipe = createTimelineRecipe({ reader: fakeReader() });
	const clock = fakeClock();
	const day = createDay();

	const result = await runTask({
		runId: "run-1",
		task: recipe.name,
		host: "test",
		input: "write the day",
		inputValue: day as never,
		setup: recipe.setup,
		system: recipe.instructions,
		tools: recipe.tools,
		model: scriptedModel(turns, { clock }),
		storage: memoryStorage(),
		clock,
		ids: counterIds(),
		limits: recipe.limits,
		signal: new AbortController().signal,
	});

	return { result, state: result.state as TimelineState };
}

const COVER_ALL: readonly ScriptedTurn[] = [
	{ toolCalls: [{ id: "t1", name: "start_project", args: { repo: "Lattice" } }] },
	{
		toolCalls: [
			{
				id: "t2",
				name: "add_line",
				args: {
					project: "Lattice",
					text: "Attached a vine to a line, not only a heading.",
					cites: ["c1"],
				},
			},
		],
	},
	{
		toolCalls: [
			{
				id: "t3",
				name: "add_vine",
				args: { line: "l1", text: "finally, the marker works" },
			},
		],
	},
	{ toolCalls: [{ id: "t4", name: "get_diff", args: { handle: "c2" } }] },
	{
		toolCalls: [
			{
				id: "t5",
				name: "add_line",
				args: {
					project: "Lattice",
					text: "Put the marker at the start of the line.",
					cites: ["c2"],
				},
			},
		],
	},
	{
		toolCalls: [
			{
				id: "t6",
				name: "add_line",
				args: { project: "Lattice", text: "Merged the day fetcher.", cites: ["pr1"] },
			},
			{
				id: "t7",
				name: "add_line",
				args: { project: "Lattice", text: "Talked through slice 2.", cites: ["i1"] },
			},
		],
	},
	{
		toolCalls: [
			{
				id: "t8",
				name: "set_brief",
				args: { text: "A vine can hang from a line now, and the day fetcher landed." },
			},
		],
	},
	{ toolCalls: [{ id: "t9", name: "finish", args: {} }] },
];

describe("the timeline recipe, end to end", () => {
	it("writes a day and finishes when every handle is covered", async () => {
		const { result, state } = await runDay(COVER_ALL);

		expect(result.reason).toBe("done");

		const serialized = serializePage(state.page);
		expect(serialized.markdown).toBe(
			[
				"### Lattice",
				"",
				"- <!-- anchor:l1 -->Attached a vine to a line, not only a heading.",
				"- <!-- anchor:l2 -->Put the marker at the start of the line.",
				"- <!-- anchor:l3 -->Merged the day fetcher.",
				"- <!-- anchor:l4 -->Talked through slice 2.",
			].join("\n"),
		);
		expect(serialized.gutter).toEqual([
			{ anchor: "anchor:l1", type: "comment", content: "finally, the marker works" },
		]);
		expect(serialized.brief).toBe("A vine can hang from a line now, and the day fetcher landed.");
	});

	it("keeps going after finish refuses, and ends done once the day is covered", async () => {
		const turns: readonly ScriptedTurn[] = [
			{ toolCalls: [{ id: "t1", name: "start_project", args: { repo: "Lattice" } }] },
			{
				toolCalls: [
					{
						id: "t2",
						name: "add_line",
						args: { project: "Lattice", text: "Only the first commit.", cites: ["c1"] },
					},
				],
			},
			{ toolCalls: [{ id: "t3", name: "finish", args: {} }] },
			{
				toolCalls: [
					{
						id: "t4",
						name: "add_line",
						args: {
							project: "Lattice",
							text: "The rest of the day.",
							cites: ["c2", "pr1", "i1"],
						},
					},
				],
			},
			{
				toolCalls: [{ id: "t5", name: "set_brief", args: { text: "The rest of the day." } }],
			},
			{ toolCalls: [{ id: "t6", name: "finish", args: {} }] },
		];

		const { result, state } = await runDay(turns);

		expect(result.reason).toBe("done");
		expect(state.page.projects[0]?.lines).toHaveLength(2);
	});
});
