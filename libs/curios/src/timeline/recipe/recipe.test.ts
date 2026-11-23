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

	it("tells the model the tools it has and the rules that matter", () => {
		const { instructions } = recipeWith();

		expect(instructions).toContain("start_project(repo)");
		expect(instructions).toContain("add_line(project, text, cites)");
		expect(instructions).toContain("add_vine(line, text)");
		expect(instructions).toContain("get_diff(handle)");
		expect(instructions).toContain("get_issue_thread(handle)");
		expect(instructions).toContain("search_past_days(query)");
		expect(instructions).toContain("finish(skipped)");
		expect(instructions).toContain("Never type a commit hash");
		expect(instructions).toContain("finish will refuse until the day is covered");
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
