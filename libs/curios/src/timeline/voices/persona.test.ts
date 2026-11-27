/**
 * A tenant's voice, as the recipe receives it (#1798, slice 5).
 *
 * The recipe is handed a persona, not a JSON prompt. This is the one place that
 * decides which, so a custom voice cannot mean one thing in the nightly run and
 * another in the Arbor route.
 */

import { describe, expect, it, vi } from "vitest";
import { resolvePersona } from "./persona";
import { VOICE_PRESETS } from "./registry";

describe("resolvePersona", () => {
	it("hands back the preset's own voice lines", () => {
		expect(resolvePersona({ preset: "casual" })).toBe(VOICE_PRESETS.casual.persona);
		expect(resolvePersona({ preset: "poetic" })).toBe(VOICE_PRESETS.poetic.persona);
	});

	it("falls back to the professional voice for a preset that is not there", () => {
		vi.spyOn(console, "warn").mockImplementation(() => undefined);
		expect(resolvePersona({ preset: "not-a-voice" })).toBe(VOICE_PRESETS.professional.persona);
		vi.restoreAllMocks();
	});

	it("uses the prompt a custom voice was configured with", () => {
		const persona = resolvePersona({
			preset: "custom",
			custom: { systemPrompt: "Write like a tired lighthouse keeper." },
		});
		expect(persona).toBe("Write like a tired lighthouse keeper.");
	});

	it("gives a custom voice with no prompt the professional voice", () => {
		expect(resolvePersona({ preset: "custom", custom: null })).toBe(
			VOICE_PRESETS.professional.systemPrompt,
		);
	});
});
