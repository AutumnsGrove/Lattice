/**
 * The recipe as a definition (#1798, slice 2).
 *
 * These are the things a run depends on before the model ever answers: the step
 * limit, the instructions it is given, the first message it reads, and an input
 * schema strict enough to catch a record whose day no longer fits.
 */

import { compileSchema, validateValue } from "@autumnsgrove/lyra";
import { describe, expect, it } from "vitest";
import { DEFAULT_STEP_LIMIT, createTimelineRecipe, type TimelineRecipeOptions } from "./recipe";
import { createDay, fakeReader, startState } from "./testing";

function recipeWith(options: Partial<TimelineRecipeOptions> = {}) {
	return createTimelineRecipe({ reader: fakeReader(), ...options });
}

describe("createTimelineRecipe", () => {
	it("parks the run after 40 model turns unless told otherwise", () => {
		expect(recipeWith().limits?.steps).toBe(DEFAULT_STEP_LIMIT);
		expect(DEFAULT_STEP_LIMIT).toBe(40);
		expect(recipeWith({ steps: 12 }).limits?.steps).toBe(12);
	});

	it("compacts against a window far below the model's own", () => {
		// Lumen refuses a request past 100 messages, which a chatty day reaches long
		// before 128k tokens. Compaction has to fire on volume, not just length.
		const recipe = recipeWith();

		expect(recipe.compaction).toEqual({
			contextWindow: 16_000,
			reserveTokens: 3_000,
			keepTokens: 8_000,
		});
	});

	it("nudges a stalled run one more time than Lyra's default", () => {
		expect(recipeWith().stuck?.reminders).toBe(3);
	});

	it("tells the model the tools it has and the rules that matter", () => {
		const { instructions } = recipeWith();

		expect(instructions).toContain("start_project(repo)");
		expect(instructions).toContain("add_line(project, text, cites)");
		expect(instructions).toContain("add_vine(line, text)");
		expect(instructions).toContain("set_brief(text)");
		expect(instructions).toContain("edit_line(line, text, cites)");
		expect(instructions).toContain("remove_line(line): drop a line");
		expect(instructions).toContain("get_diff(handle)");
		expect(instructions).toContain("get_issue_thread(handle)");
		expect(instructions).toContain("search_past_days(query)");
		expect(instructions).toContain("finish(skipped)");
		expect(instructions).toContain("Never type a commit hash");
		expect(instructions).toContain("never more than 1100 words in total");
		expect(instructions).toContain("Every turn ends in a tool call");
		expect(instructions).toContain("never write a handle in a sentence");
		expect(instructions).toContain("not a paragraph");
		expect(instructions).toContain("They are not a tour");
		expect(instructions).toContain("finish will refuse until the page has a brief");
	});

	it("carries the tenant's voice and name", () => {
		const { instructions } = recipeWith({
			ownerName: "Autumn",
			persona: "You write with the warmth of a midnight tea shop.",
		});

		expect(instructions).toContain("one day of Autumn's personal development journal");
		expect(instructions).toContain("You write with the warmth of a midnight tea shop.");
	});

	it("opens with the day, handles and all", () => {
		const recipe = recipeWith();
		const state = startState(recipe);
		const message = recipe.setup?.(createDay() as never).message ?? "";

		expect(message).toContain("The day is 2026-11-21 in America/Los_Angeles");
		expect(message).toContain("c1");
		expect(message).toContain("pr1 #1804");
		expect(message).toContain("i1 #1798");
		expect(state.page.projects).toEqual([]);
	});

	it("checks the day's shape, and refuses a day missing a field", () => {
		const schema = compileSchema(recipeWith().input);

		const good = validateValue(schema, createDay());
		expect(good.ok ? [] : good.errors).toEqual([]);

		const { date: _date, ...withoutDate } = createDay();
		const bad = validateValue(schema, withoutDate);
		expect(bad.ok).toBe(false);
		expect(bad.ok ? [] : bad.errors.join(" ")).toContain("date");
	});
});
