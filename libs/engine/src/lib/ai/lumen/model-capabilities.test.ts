/**
 * Model capability flags (L4, #1693).
 *
 * The failure this guards: a model that cannot call tools returns prose, the
 * loop reads no calls, and the run ends having done nothing — with no error
 * anywhere. These tests pin the refusals and the registry's own consistency.
 */

import { describe, it, expect } from "vitest";
import modelData from "../../data/lumen-models.json";
import { assertToolSupport, getModelCapabilities, MODELS, TASK_REGISTRY } from "./config.js";
import type { LumenTask } from "./types.js";

const entries = Object.values(modelData.models) as Array<{
	id: string;
	provider: string;
	category: string;
	supportsTools?: boolean;
	toolChoice?: string[];
	contextWindow?: number;
}>;

describe("lumen-models.json capability flags", () => {
	it("says whether every model supports tools", () => {
		for (const entry of entries) {
			expect(typeof entry.supportsTools, `${entry.id} supportsTools`).toBe("boolean");
		}
	});

	it("does not claim tool support on a provider that cannot carry it", () => {
		// workers/lumen routes Cloudflare AI through a formatter that keeps only
		// role and content, and the provider refuses tool turns outright.
		for (const entry of entries.filter((e) => e.provider === "cloudflare-ai")) {
			expect(entry.supportsTools, `${entry.id}`).toBe(false);
		}
	});

	it("does not claim tool support on moderation, embedding or speech models", () => {
		for (const entry of entries.filter((e) =>
			["moderation", "embedding", "transcription"].includes(e.category),
		)) {
			expect(entry.supportsTools, `${entry.id}`).toBe(false);
		}
	});

	it("only lists tool_choice modes that exist", () => {
		const valid = ["auto", "required", "none", "function"];
		for (const entry of entries) {
			for (const mode of entry.toolChoice ?? []) {
				expect(valid, `${entry.id} → ${mode}`).toContain(mode);
			}
		}
	});

	it("always includes auto when a model accepts any tool_choice", () => {
		for (const entry of entries) {
			if (!entry.toolChoice) continue;
			expect(entry.toolChoice, `${entry.id}`).toContain("auto");
		}
	});

	it("gives every chat-capable model a usable context window", () => {
		for (const entry of entries.filter((e) => e.supportsTools)) {
			expect(Number.isInteger(entry.contextWindow), `${entry.id}`).toBe(true);
			expect(entry.contextWindow!).toBeGreaterThan(0);
		}
	});
});

describe("getModelCapabilities", () => {
	it("defaults an unknown model to no tool support rather than guessing", () => {
		expect(getModelCapabilities("nobody/knows-this-model")).toBeNull();
	});

	it("defaults acceptedToolChoices to auto-only when the file is silent", () => {
		// No entry sets toolChoice without supportsTools, so a tool-capable model
		// is the one that proves the default path connects.
		const caps = getModelCapabilities(MODELS.DEEPSEEK_V4_1_FLASH);
		expect(caps?.supportsTools).toBe(true);
		expect(caps?.acceptedToolChoices).toContain("auto");
	});

	it("reports a null context window for speech models", () => {
		expect(getModelCapabilities(MODELS.CF_WHISPER)?.contextWindow).toBeNull();
	});
});

describe("assertToolSupport", () => {
	const task: LumenTask = "agent";

	it("passes for a tool-capable model", () => {
		expect(() => assertToolSupport(task, MODELS.DEEPSEEK_V4_1_FLASH)).not.toThrow();
	});

	it("refuses a model that cannot call tools, and names it", () => {
		expect(() => assertToolSupport(task, MODELS.LLAMAGUARD_4)).toThrow(/cannot call tools/);
		expect(() => assertToolSupport(task, MODELS.LLAMAGUARD_4)).toThrow(MODELS.LLAMAGUARD_4);
	});

	it("refuses an unregistered model rather than assuming it works", () => {
		expect(() => assertToolSupport(task, "mystery/model-x")).toThrow(/not in the registry/);
	});

	it("refuses a tool_choice the model does not accept", () => {
		// All registered tool-capable models accept every mode today, so this
		// asserts the mapping rather than a specific refusal.
		expect(() =>
			assertToolSupport(task, MODELS.DEEPSEEK_V4_1_FLASH, {
				type: "function",
				function: { name: "do_thing" },
			}),
		).not.toThrow();
	});
});

describe("the agent task's default model", () => {
	it("can call tools, which is the whole reason the task exists", () => {
		const agent = TASK_REGISTRY.agent;
		const caps = getModelCapabilities(agent.primaryModel);

		expect(caps).not.toBeNull();
		expect(caps!.supportsTools).toBe(true);
	});

	it("has a context window large enough for a loop's history", () => {
		const caps = getModelCapabilities(TASK_REGISTRY.agent.primaryModel);
		expect(caps!.contextWindow).toBeGreaterThanOrEqual(32000);
	});
});
