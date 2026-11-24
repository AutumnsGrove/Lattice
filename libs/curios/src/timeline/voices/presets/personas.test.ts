/**
 * Every preset carries its voice twice, for two different prompts.
 *
 * The one-shot path builds a JSON-shaped request from `systemPrompt`; the recipe
 * carries `persona` as instructions. They have to agree about how the preset
 * sounds, and neither may be empty — a preset without one would silently write in
 * the professional voice after the cutover.
 */

import { describe, expect, it } from "vitest";
import { VOICE_PRESETS } from "../index";

describe("preset personas", () => {
	for (const [id, preset] of Object.entries(VOICE_PRESETS)) {
		it(`${id} has a persona of its own`, () => {
			expect(preset.persona.trim().length).toBeGreaterThan(40);
			// The one-shot rules must not leak into the recipe's instructions.
			expect(preset.persona).not.toContain("valid JSON");
			expect(preset.persona).not.toContain("GENERATE THREE OUTPUTS");
		});
	}
});
