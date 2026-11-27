/**
 * Both recipes, through Lyra's loop, against a scripted model.
 *
 * The tool tests drive each tool by hand; this proves the recipes are recipes: the
 * model asks for a tool by name, the loop validates and applies it, and the run
 * ends the way the feature needs it to — prose for a turn, a proposal for a draft.
 *
 * The correction case is the one worth keeping: a proposal whose vine quotes a
 * sentence that is not in the body is refused inside the loop, and the model gets
 * a second turn to fix it. That is the whole reason `propose_draft` is a tool and
 * not a prompt asking for JSON.
 */

import { runTask, type Recipe, type RunResult } from "@autumnsgrove/lyra";
import { counterIds, memoryStorage } from "@autumnsgrove/lyra/memory";
import { fakeClock, scriptedModel, type ScriptedTurn } from "@autumnsgrove/lyra/testkit";
import { describe, expect, it } from "vitest";
import {
	FIRESIDE_DRAFT_RECIPE,
	FIRESIDE_TURN_RECIPE,
	createFiresideDraftRecipe,
	createFiresideTurnRecipe,
	stepsFor,
} from "./recipes";
import type { FiresideState } from "./tools";

const DRAFT = [
	"The sign says eight. The lights say otherwise.",
	"",
	"I have been the last one in the room more times than I can count, and I have never once been the one who turned the key.",
].join("\n");

async function run(
	recipe: Recipe<FiresideState>,
	turns: readonly ScriptedTurn[],
): Promise<{ result: RunResult; record: string }> {
	const clock = fakeClock();
	const storage = memoryStorage();

	const result = await runTask({
		runId: "run-1",
		task: recipe.name,
		host: "test",
		input: "start",
		inputValue: { draft: DRAFT } as never,
		setup: recipe.setup,
		system: recipe.instructions,
		tools: recipe.tools,
		model: scriptedModel(turns, { clock }),
		storage,
		clock,
		ids: counterIds(),
		limits: recipe.limits,
		// The ending travels with the run, like limits and compaction do.
		ending: (recipe as { ending?: "reply" | "done-check" }).ending,
		signal: new AbortController().signal,
	});

	return { result, record: storage.saved().join("\n") };
}

describe("the step budget", () => {
	it("is derived from the tool count, never written as a literal", () => {
		expect(stepsFor(1)).toBe(4);
		expect(stepsFor(3)).toBe(8);
	});

	it("matches each recipe's own tool count", () => {
		const turn = createFiresideTurnRecipe({ draft: DRAFT });
		const draft = createFiresideDraftRecipe({ draft: DRAFT });

		// One tool for a turn, three for a draft — the turn's reply is its own ending.
		expect(turn.tools).toHaveLength(1);
		expect(draft.tools).toHaveLength(3);
		expect(turn.limits?.steps).toBe(stepsFor(turn.tools.length));
		expect(draft.limits?.steps).toBe(stepsFor(draft.tools.length));
		expect(turn.limits).not.toHaveProperty("cost");
		expect(turn.limits).not.toHaveProperty("tokens");
		expect(turn.limits).not.toHaveProperty("timeMs");
	});

	it("nudges no one, and says its reply is the ending", () => {
		const turn = createFiresideTurnRecipe({ draft: "" });
		expect(turn.stuck?.reminders).toBe(0);
		// 0.4.0's ending: the reply finishes the run, so no sentinel tool and no nudge.
		expect((turn as { ending?: string }).ending).toBe("reply");
		expect(turn.tools.some((tool) => tool.finish === true)).toBe(false);
	});
});

describe("fireside-turn", () => {
	it("reads the draft, then answers in prose and ends", async () => {
		const { result, record } = await run(createFiresideTurnRecipe({ draft: DRAFT }), [
			{ toolCalls: [{ id: "t1", name: "read_draft" }] },
			// No tool call: with `ending: "reply"` the sentence *is* the end of the run.
			{
				text: "That's the sentence. Do you want to write about the shop, or about staying too long?",
			},
		]);

		expect(result.reason).toBe("done");
		expect(record).toContain("The sign says eight.");
		expect(record).toContain("Do you want to write about the shop");
		expect(record).not.toContain(FIRESIDE_DRAFT_RECIPE);
	});

	it("opens on a blank page without asking the model to read one", async () => {
		const { result, record } = await run(createFiresideTurnRecipe({ draft: "" }), [
			{ text: "The page is blank. What did you notice first?" },
		]);

		expect(result.reason).toBe("done");
		expect(record).toContain("What did you notice first");
	});
});

describe("fireside-draft", () => {
	const GOOD: ScriptedTurn = {
		toolCalls: [
			{
				id: "p1",
				name: "propose_draft",
				args: {
					payload: {
						title: "Resonance, not proximity",
						body: DRAFT,
						vines: [
							{ quote: "The lights say otherwise", text: "This is the line the whole post earns." },
						],
					},
					evidence: ["the writer's own sentences in the conversation"],
				},
			},
		],
	};

	it("reads, hears the voice, and proposes with the vine anchored", async () => {
		const recipe = createFiresideDraftRecipe({
			draft: DRAFT,
			recentPosts: [{ title: "Older post", excerpt: "I still leave the light on." }],
		});

		const { result, record } = await run(recipe, [
			{ toolCalls: [{ id: "t1", name: "read_draft" }] },
			{ toolCalls: [{ id: "t2", name: "read_my_recent_posts" }] },
			GOOD,
		]);

		expect(result.reason).toBe("done");
		expect(record).toContain("I still leave the light on.");
		expect(record).toContain('"type":"proposal"');
		// The model quoted its own prose; the tool resolved the anchor.
		expect(record).toContain("paragraph:1");
		expect(record).not.toContain('"quote"');
	});

	it("refuses a vine quote that is not in the body, and the model corrects", async () => {
		const recipe = createFiresideDraftRecipe({ draft: DRAFT });

		const { result, record } = await run(recipe, [
			{
				toolCalls: [
					{
						id: "p0",
						name: "propose_draft",
						args: {
							payload: {
								title: "Too early",
								body: DRAFT,
								vines: [{ quote: "the tea shop never closes", text: "a note" }],
							},
							evidence: ["invented"],
						},
					},
				],
			},
			GOOD,
		]);

		expect(result.reason).toBe("done");
		expect(record).toContain("is not in the draft you proposed");
		expect(record).toContain("paragraph:1");
	});

	it("refuses a body over the word budget", async () => {
		const recipe = createFiresideDraftRecipe({ draft: DRAFT, maxWords: 5 });

		const { result, record } = await run(recipe, [
			{
				toolCalls: [
					{
						id: "p0",
						name: "propose_draft",
						args: {
							payload: { title: "Long", body: DRAFT },
							evidence: ["invented"],
						},
					},
				],
			},
			// The draft run has no `finish` — the proposal is the finish. So the model
			// corrects by proposing again, inside its budget.
			{
				toolCalls: [
					{
						id: "p1",
						name: "propose_draft",
						args: {
							payload: { title: "Short", body: "The sign says eight." },
							evidence: ["the page"],
						},
					},
				],
			},
		]);

		expect(result.reason).toBe("done");
		expect(record).toContain("the budget is 5");
	});
});
