import { expect, test } from "vitest";
import { parse } from "yaml";
import { decodeScenario, runScenario } from "@autumnsgrove/lyra/testkit";
/** The name Lyra's scenario files are written against; see the note in `makeModel`. */
const SCRIPTED_MODEL_NAME = "scripted/model";
import { CONTRACT_KEY, fakeLumen } from "./standalone.js";
import { lumenScriptedModel } from "./adapt.js";

/**
 * The scenario files, through the Lumen adapter into a fake Lumen (decision 67).
 *
 * This is the third time these files run: in process against the scripted model,
 * through the OpenAI-style adapter into a fake server, and here through *this*
 * adapter into a Lumen. Each run answers a different question. This one asks
 * whether Lyra's scenarios still hold when the model is Grove's.
 *
 * The files are copied from Lyra's `scenarios/` — see `scenarios/README.md` for
 * where they came from and how to refresh them.
 */
const files = import.meta.glob<string>("../../scenarios/*.yaml", {
	query: "?raw",
	import: "default",
	eager: true,
});

function nameOf(path: string): string {
	return path.split("/").at(-1) ?? path;
}

test("every scenario file is picked up", () => {
	// A guard against a glob that silently matches nothing, which would let every
	// test below pass by having none of them.
	expect(Object.keys(files).length).toBeGreaterThanOrEqual(13);
});

for (const [path, raw] of Object.entries(files)) {
	const name = nameOf(path);

	test(`the scenario ${name} is a file this runner understands`, () => {
		const decoded = decodeScenario(parse(raw));
		expect(decoded.ok ? [] : [decoded.error.message]).toEqual([]);
	});

	test(`SCN04 the scenario ${name} runs through the Lumen adapter`, async () => {
		const decoded = decodeScenario(parse(raw));
		if (!decoded.ok) {
			throw new Error(`${name}: ${decoded.error.message}`);
		}

		let asked = 0;
		const outcome = await runScenario(decoded.value, {
			makeModel: (turns, clock, options) => {
				const model = lumenScriptedModel({
					turns,
					clock,
					summaries: options.summaries,
					slot: {
						baseUrl: "https://fake-lumen.test",
						apiKey: CONTRACT_KEY,
						tenantId: "tenant-1",
						model: options.model,
					},
					// Each turn gets its own one-turn Lumen, so the script has exactly one
					// reader: the adapter picks the turn, the fake answers that turn.
					//
					// The name the fake reports is the one the scenario files expect,
					// because they assert it in the record (`compaction.yaml` says
					// `model: scripted/model`) and Lyra's own SCN04 satisfies that by
					// configuring its adapter with the same name. The contract suite is
					// where a real model id is proven; a scenario file is about the flow.
					makeFetch: (turn) =>
						fakeLumen({ turns: [turn], model: SCRIPTED_MODEL_NAME }, { apiKey: CONTRACT_KEY })
							.fetch,
				});

				return {
					complete: (request) => {
						asked += 1;
						return model.complete(request);
					},
				};
			},
		});

		// The adapter really was used: the same expectations could otherwise pass by
		// falling back to the in-process model.
		expect(asked).toBeGreaterThan(0);
		expect(outcome.problems).toEqual([]);
	});
}
