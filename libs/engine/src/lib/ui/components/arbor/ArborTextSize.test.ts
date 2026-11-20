/**
 * ArborTextSize — Component tests (#1369)
 *
 * The slider and step buttons choose a grove-wide text size inside the range
 * FONT_SCALE defines. The sample text is sized against the scale already applied
 * to the page, so it shows the choice rather than compounding on the current size.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/svelte";
import ArborTextSize from "./ArborTextSize.svelte";
import { FONT_SCALE } from "$lib/platform/config/presets";

afterEach(cleanup);

const slider = () => screen.getByRole("slider", { name: "Text size" }) as HTMLInputElement;
const smaller = () => screen.getByRole("button", { name: "Smaller text" }) as HTMLButtonElement;
const larger = () => screen.getByRole("button", { name: "Larger text" }) as HTMLButtonElement;
const sample = () => document.querySelector(".size-sample") as HTMLElement;

describe("ArborTextSize", () => {
	describe("the slider", () => {
		it("takes its range from FONT_SCALE", () => {
			render(ArborTextSize, { value: 100, applied: 100 });

			expect(slider().min).toBe(String(FONT_SCALE.min));
			expect(slider().max).toBe(String(FONT_SCALE.max));
			expect(slider().step).toBe(String(FONT_SCALE.step));
		});

		it("shows the chosen size", () => {
			render(ArborTextSize, { value: 120, applied: 100 });

			expect(slider().value).toBe("120");
			expect(screen.getByText("120%")).toBeTruthy();
		});

		it("says the size aloud as a percent", () => {
			render(ArborTextSize, { value: 120, applied: 100 });

			expect(slider().getAttribute("aria-valuetext")).toBe("120 percent");
		});

		it("updates the shown size when moved", async () => {
			render(ArborTextSize, { value: 100, applied: 100 });

			await fireEvent.input(slider(), { target: { value: "140" } });

			expect(screen.getByText("140%")).toBeTruthy();
		});
	});

	describe("the step buttons", () => {
		it("each move one step", async () => {
			render(ArborTextSize, { value: 100, applied: 100 });

			await fireEvent.click(larger());
			expect(screen.getByText("110%")).toBeTruthy();

			await fireEvent.click(smaller());
			await fireEvent.click(smaller());
			expect(screen.getByText("90%")).toBeTruthy();
		});

		it("cannot go below the minimum", async () => {
			render(ArborTextSize, { value: FONT_SCALE.min, applied: 100 });

			expect(smaller().disabled).toBe(true);
			expect(larger().disabled).toBe(false);

			await fireEvent.click(smaller());
			expect(screen.getByText(`${FONT_SCALE.min}%`)).toBeTruthy();
		});

		it("cannot go above the maximum", async () => {
			render(ArborTextSize, { value: FONT_SCALE.max, applied: 100 });

			expect(larger().disabled).toBe(true);
			expect(smaller().disabled).toBe(false);

			await fireEvent.click(larger());
			expect(screen.getByText(`${FONT_SCALE.max}%`)).toBeTruthy();
		});

		it("enable and disable as the size reaches an end", async () => {
			render(ArborTextSize, { value: FONT_SCALE.min + FONT_SCALE.step, applied: 100 });
			expect(smaller().disabled).toBe(false);

			await fireEvent.click(smaller());
			expect(smaller().disabled).toBe(true);

			await fireEvent.click(larger());
			expect(smaller().disabled).toBe(false);
		});

		it("walk the whole range in exactly the steps the API accepts", async () => {
			render(ArborTextSize, { value: FONT_SCALE.min, applied: 100 });
			const seen = [FONT_SCALE.min];

			while (!larger().disabled) {
				await fireEvent.click(larger());
				seen.push(Number(slider().value));
			}

			expect(seen).toEqual([80, 90, 100, 110, 120, 130, 140, 150]);
		});
	});

	describe("the sample text", () => {
		it("is sized against the applied scale, not stacked on top of it", () => {
			// The page is already at 100%, so a 130% choice is 1.3rem.
			render(ArborTextSize, { value: 130, applied: 100 });
			expect(parseFloat(sample().style.fontSize)).toBeCloseTo(1.3);
		});

		it("shrinks the sample back when the page is already scaled up", () => {
			// The page root is already 130%; choosing 130% must read as 1rem, or the
			// sample would show 169% (1.3 x 1.3).
			render(ArborTextSize, { value: 130, applied: 130 });
			expect(parseFloat(sample().style.fontSize)).toBeCloseTo(1);
		});

		it("follows the choice as it moves", async () => {
			render(ArborTextSize, { value: 100, applied: 100 });
			expect(parseFloat(sample().style.fontSize)).toBeCloseTo(1);

			await fireEvent.click(larger());
			expect(parseFloat(sample().style.fontSize)).toBeCloseTo(1.1);

			await fireEvent.click(smaller());
			await fireEvent.click(smaller());
			expect(parseFloat(sample().style.fontSize)).toBeCloseTo(0.9);
		});
	});

	describe("accessibility", () => {
		it("labels the step buttons for people who cannot see the glyphs", () => {
			render(ArborTextSize, { value: 100, applied: 100 });

			expect(smaller().getAttribute("type")).toBe("button");
			expect(larger().getAttribute("type")).toBe("button");
			// The visible "A−" / "A+" is decoration; the label carries the meaning.
			expect(smaller().querySelector("[aria-hidden='true']")).not.toBeNull();
		});

		it("announces the value as the output for the slider", () => {
			render(ArborTextSize, { value: 100, applied: 100 });

			const output = document.querySelector("output")!;
			expect(output.getAttribute("for")).toBe(slider().id);
		});
	});
});
