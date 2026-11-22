/**
 * The root layout's text size wiring (#1369).
 *
 * CSS cannot import a constant, so the layout writes the variable name out. This
 * keeps that literal from drifting away from FONT_SCALE.cssVar, which the Arbor
 * settings page uses to apply a change immediately.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { FONT_SCALE } from "@autumnsgrove/lattice/platform/config/presets";

const layout = readFileSync(new URL("./+layout.svelte", import.meta.url), "utf-8");

describe("root layout text size", () => {
	it("sets the variable FONT_SCALE names, on :root, from the stored setting", () => {
		expect(layout).toContain(`<style>:root{${FONT_SCALE.cssVar}:\${fontScaleMultiplier(`);
		expect(layout).toContain(`siteSettings?.[FONT_SCALE.settingKey]`);
	});

	it("scales the root font size by that variable, defaulting to no change", () => {
		expect(layout).toContain(`font-size: calc(100% * var(${FONT_SCALE.cssVar}, 1));`);
	});

	it("never interpolates the raw stored string into the style", () => {
		// Only the validated multiplier may reach the page.
		expect(layout).not.toMatch(/--grove-font-scale:\$\{data\.siteSettings/);
	});
});
