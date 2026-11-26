/**
 * The task registry against the model data it names.
 *
 * These are the assumptions a routing decision rests on, checked where both
 * halves live: a task whose default will not fit its model is skipped by the
 * router and answered by a fallback instead — quietly, every time (#1707).
 */

import { describe, expect, it } from "vitest";
import { getModel, getModelCapabilities } from "./models.js";
import { TASK_REGISTRY } from "./tasks.js";

describe("the task registry", () => {
	it("names only models the registry has", () => {
		for (const [task, config] of Object.entries(TASK_REGISTRY)) {
			expect(getModel(config.primaryModel), `${task} primary ${config.primaryModel}`).toBeDefined();

			for (const fallback of config.fallbackChain) {
				expect(getModel(fallback.model), `${task} fallback ${fallback.model}`).toBeDefined();
			}
		}
	});

	it("gives every task a default that fits its primary model", () => {
		// The router skips a candidate whose completion ceiling cannot cover the
		// request, so a default over the primary's ceiling would mean the primary
		// never answers and every call reports a fallback.
		for (const [task, config] of Object.entries(TASK_REGISTRY)) {
			const ceiling = getModelCapabilities(config.primaryModel)?.maxOutputTokens;

			if (ceiling == null) {
				continue; // Provider does not publish one, so nothing to compare.
			}

			expect(
				config.defaultMaxTokens,
				`${task} default vs ${config.primaryModel}`,
			).toBeLessThanOrEqual(ceiling);
		}
	});

	it("gives every task fallbacks that can serve its default", () => {
		// A link that cannot answer at the default is not a fallback; it is a
		// request the provider will refuse after the primary has already failed.
		for (const [task, config] of Object.entries(TASK_REGISTRY)) {
			for (const fallback of config.fallbackChain) {
				const ceiling = getModelCapabilities(fallback.model)?.maxOutputTokens;

				if (ceiling == null) {
					continue;
				}

				expect(
					config.defaultMaxTokens,
					`${task} default vs fallback ${fallback.model}`,
				).toBeLessThanOrEqual(ceiling);
			}
		}
	});

	it("keeps the small models out of the generative chains", () => {
		// Cheap and fast is the point for moderation and embedding; for a task
		// whose output is parsed, a small model is a different answer, not a worse
		// one (#1707). Context window stands in for "same class".
		for (const task of ["generation", "summary", "chat", "code"] as const) {
			for (const fallback of TASK_REGISTRY[task].fallbackChain) {
				const window = getModelCapabilities(fallback.model)?.contextWindow ?? 0;
				expect(window, `${task} → ${fallback.model}`).toBeGreaterThanOrEqual(128_000);
			}
		}
	});
});
