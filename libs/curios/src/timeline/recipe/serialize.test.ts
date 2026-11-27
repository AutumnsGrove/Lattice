/**
 * The page as the timeline stores it (#1798, slice 2).
 *
 * The one invariant worth pinning: every vine's anchor names a marker that is
 * actually in the markdown. The renderer drops a vine whose marker is missing
 * (#1687), so a mismatch here would be a silently missing aside.
 */

import { describe, expect, it } from "vitest";
import { emptyPage, type TimelinePage } from "./state";
import { describeState, serializePage } from "./serialize";
import { createTimelineRecipe } from "./recipe";
import { startState, createDay } from "./testing";

const PAGE: TimelinePage = {
	brief: "The vine can hang from a line now, and the marker is what does it.",
	projects: [
		{
			repo: "Lattice",
			lines: [
				{
					id: "l1",
					project: "Lattice",
					text: "Attached a vine to a line, not only a heading.",
					cites: ["c1"],
				},
				{
					id: "l2",
					project: "Lattice",
					text: "The marker goes at the start of the text.",
					cites: ["pr1"],
				},
			],
		},
		{ repo: "lyra", lines: [] },
	],
	vines: [
		{ line: "l1", text: "finally, the marker works" },
		{ line: "l2", text: "which is where the note floats" },
	],
	continuation: { day: "2026-11-19", text: "day two of the vine work" },
};

describe("serializePage", () => {
	it("writes a heading per project that has lines, and a marker at each line", () => {
		const serialized = serializePage(PAGE);

		expect(serialized.markdown).toBe(
			[
				"### Lattice",
				"",
				"- <!-- anchor:l1 -->Attached a vine to a line, not only a heading.",
				"- <!-- anchor:l2 -->The marker goes at the start of the text.",
			].join("\n"),
		);
	});

	it("writes the gutter entries the renderer expects", () => {
		const serialized = serializePage(PAGE);

		expect(serialized.gutter).toEqual([
			{ anchor: "anchor:l1", type: "comment", content: "finally, the marker works" },
			{ anchor: "anchor:l2", type: "comment", content: "which is where the note floats" },
		]);
	});

	it("returns the brief beside the page rather than in it", () => {
		const serialized = serializePage(PAGE);

		expect(serialized.brief).toBe(
			"The vine can hang from a line now, and the marker is what does it.",
		);
		expect(serialized.markdown).not.toContain("vine can hang");
	});

	it("returns the continuation as data instead of writing it into the page", () => {
		const serialized = serializePage(PAGE);

		expect(serialized.continuation).toEqual({
			day: "2026-11-19",
			text: "day two of the vine work",
		});
		expect(serialized.markdown).not.toContain("2026-11-19");
	});

	it("gives every vine an anchor that is in the markdown", () => {
		const serialized = serializePage(PAGE);

		for (const vine of serialized.gutter) {
			const name = vine.anchor.replace(/^anchor:/, "");
			expect(serialized.markdown).toContain(`<!-- anchor:${name} -->`);
		}
	});

	it("writes an empty page for an empty one", () => {
		const serialized = serializePage(emptyPage());

		expect(serialized.brief).toBeNull();
		expect(serialized.markdown).toBe("");
		expect(serialized.gutter).toEqual([]);
		expect(serialized.continuation).toBeNull();
	});
});

describe("describeState", () => {
	it("shows the page and what is still uncovered", () => {
		const recipe = createTimelineRecipe({
			reader: {
				diff: async () => ({ ok: true, text: "" }),
				thread: async () => ({ ok: true, text: "" }),
			},
		});
		const state = startState(recipe, createDay());

		const text = describeState(state);

		expect(text).toContain("(no brief yet)");
		expect(text).toContain("(the page is empty)");
		expect(text).toContain("Not covered yet: c1, c2, pr1, i1");
	});
});
