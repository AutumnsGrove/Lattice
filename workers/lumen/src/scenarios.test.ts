import { describe, expect, test } from "vitest";
import { parse } from "yaml";
import { decodeScenario, runScenario } from "@autumnsgrove/lyra/testkit";
import {
	CONTRACT_KEY,
	SCRIPT_MODEL,
	lumenScriptedModel,
	openRouterBody,
} from "@autumnsgrove/lyra-lumen/testing";
import { harnessApp, harnessEnv } from "./testing/lyra";

/**
 * The scenario files through the Lumen adapter into the **real** Lumen routes.
 *
 * The fake run in `libs/lyra` proves the flow. This proves the flow survives the
 * pipeline, because none of the pipeline exists in a fake: the Zod boundary, the
 * privacy scrubber, task routing, the tool-support check, the finish reason and
 * the catalog cost all run here, and the only thing replaced is the provider's
 * HTTP call.
 *
 * How the three pieces line up: the adapter chooses the turn from the scenario's
 * script and posts a request to `/inference` — that request goes to the real route,
 * not to a fake — and the route's own provider call answers with the one scripted
 * turn. So the transport under the adapter is the route, and the transport under
 * the route is the script.
 *
 * `compaction.yaml` does not run here: it asserts the model name in the record, and
 * a real route reports the model it really used. Its behaviour is covered by the
 * same file through the fake, and by `CON0*`'s compaction-adjacent cases.
 */
// The workerd pool has no host filesystem to read, so Vite hands the files over as
// raw text — the same way Lyra's own workers-side scenario run loads them.
const SCENARIO_FILES = import.meta.glob<string>("../../../libs/lyra/scenarios/*.yaml", {
	query: "?raw",
	import: "default",
	eager: true,
});

const SKIPPED = new Set(["compaction.yaml"]);

function scenarioFiles(): Array<[string, string]> {
	return Object.entries(SCENARIO_FILES)
		.map(([path, raw]) => [path.split("/").at(-1) ?? path, raw] as [string, string])
		.sort(([a], [b]) => a.localeCompare(b));
}

describe("the scenario files, through the real Lumen routes", () => {
	test("the runner found the scenario files", () => {
		expect(scenarioFiles().length).toBeGreaterThanOrEqual(13);
	});

	for (const [name, raw] of scenarioFiles()) {
		if (SKIPPED.has(name)) {
			test.skip(`SCN05 ${name} (asserts a model name a real route changes)`, () => {});
			continue;
		}

		test(`SCN05 the scenario ${name} runs through the real routes`, async () => {
			const decoded = decodeScenario(parse(raw));
			if (!decoded.ok) {
				throw new Error(`${name}: ${decoded.error.message}`);
			}

			const app = harnessApp();
			const env = harnessEnv();

			// Counted at the route, not at the model: this is the number that proves the
			// request went through the pipeline instead of the script answering directly.
			let routeCalls = 0;
			const outcome = await runScenario(decoded.value, {
				makeModel: (turns, clock, options) => {
					const model = lumenScriptedModel({
						turns,
						clock,
						summaries: options.summaries,
						slot: {
							model: SCRIPT_MODEL,
							baseUrl: "https://lumen.test",
							apiKey: CONTRACT_KEY,
							tenantId: "tenant-1",
							// BYOK, so the route never asks Warden: the dev stack and this
							// harness both run without one.
							tenantApiKey: "sk-or-v1-contract-key",
						},
						// The adapter's transport is the real route…
						makeFetch: (turn) => {
							const original = globalThis.fetch;
							routeCalls += 1;
							// …and the route's transport is the one scripted turn.
							globalThis.fetch = (async () =>
								new Response(JSON.stringify(openRouterBody(turn, SCRIPT_MODEL)), {
									status: 200,
									headers: { "Content-Type": "application/json" },
								})) as typeof globalThis.fetch;

							return (async (input: RequestInfo | URL, init?: RequestInit) => {
								try {
									return await app.fetch(new Request(input, init), env);
								} finally {
									globalThis.fetch = original;
								}
							}) as typeof globalThis.fetch;
						},
					});

					return model;
				},
			});

			// The route really was on the path: this counted adapter-to-route calls, and
			// the clean run is what those calls returned.
			expect(routeCalls).toBeGreaterThan(0);
			expect(outcome.problems).toEqual([]);
		});
	}
});
