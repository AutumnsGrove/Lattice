/**
 * GalleryBuilder Component Tests
 *
 * The builder is the arrange step of the photo modal: a list of photos to
 * describe, reorder, and remove, plus a live preview. The modal around it
 * (dialog, buttons, focus, saving) belongs to PhotoPicker and is tested there.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import GalleryBuilder from "./GalleryBuilder.svelte";

const rows = () => [
	{ id: 1, url: "https://cdn.grove.place/a.jpg", alt: "Autumn forest", caption: "The long way in" },
	{ id: 2, url: "https://cdn.grove.place/b.jpg", alt: "", caption: "" },
	{ id: 3, url: "https://cdn.grove.place/c.jpg", alt: "Mossy path", caption: "" },
];

const altInput = (n: number) => screen.getByLabelText(`Describe photo ${n}`) as HTMLInputElement;
const captionInput = (n: number) =>
	screen.getAllByLabelText("Caption (optional)")[n - 1] as HTMLInputElement;

describe("GalleryBuilder", () => {
	describe("Rendering", () => {
		it("shows each photo with its current alt text and caption filled in", () => {
			render(GalleryBuilder, { props: { rows: rows() } });
			expect(altInput(1).value).toBe("Autumn forest");
			expect(captionInput(1).value).toBe("The long way in");
			expect(altInput(2).value).toBe("");
			expect(altInput(3).value).toBe("Mossy path");
		});

		it("explains why to describe photos", () => {
			render(GalleryBuilder, { props: { rows: rows() } });
			expect(screen.getByText(/screen reader/)).toBeInTheDocument();
		});

		it("says so when there are no photos left", () => {
			render(GalleryBuilder, { props: { rows: [] } });
			expect(screen.getByText(/No photos left/)).toBeInTheDocument();
		});
	});

	describe("Editing text", () => {
		it("lets alt text and captions be typed in", async () => {
			render(GalleryBuilder, { props: { rows: rows() } });
			await fireEvent.input(altInput(2), { target: { value: "Fog in the valley" } });
			await fireEvent.input(captionInput(2), { target: { value: "Quiet, early" } });
			expect(altInput(2).value).toBe("Fog in the valley");
			expect(captionInput(2).value).toBe("Quiet, early");
		});
	});

	describe("Reordering", () => {
		it("moves a photo up and down, carrying its alt text and caption along", async () => {
			render(GalleryBuilder, { props: { rows: rows() } });
			await fireEvent.click(screen.getByRole("button", { name: "Move photo 1 down" }));

			expect(altInput(1).value).toBe("");
			expect(altInput(2).value).toBe("Autumn forest");
			expect(captionInput(2).value).toBe("The long way in");
		});

		it("disables up on the first photo and down on the last", () => {
			render(GalleryBuilder, { props: { rows: rows() } });
			expect(screen.getByRole("button", { name: "Move photo 1 up" })).toBeDisabled();
			expect(screen.getByRole("button", { name: "Move photo 3 down" })).toBeDisabled();
			expect(screen.getByRole("button", { name: "Move photo 2 up" })).toBeEnabled();
		});

		it("keeps focus on the moved photo's button, falling back when it reaches the end", async () => {
			render(GalleryBuilder, { props: { rows: rows() } });
			const up = screen.getByRole("button", { name: "Move photo 2 up" });
			up.focus();
			await fireEvent.click(up);
			await tick();

			// Photo 2 is now photo 1, so Up is disabled and focus moves to Down instead
			expect(screen.getByRole("button", { name: "Move photo 1 down" })).toHaveFocus();
		});

		it("announces where the photo went", async () => {
			render(GalleryBuilder, { props: { rows: rows() } });
			await fireEvent.click(screen.getByRole("button", { name: "Move photo 1 down" }));
			expect(screen.getByText("Photo moved to position 2 of 3")).toBeInTheDocument();
		});
	});

	describe("Removing", () => {
		it("removes a photo and renumbers the rest", async () => {
			render(GalleryBuilder, { props: { rows: rows() } });
			await fireEvent.click(screen.getByRole("button", { name: "Remove photo 2" }));

			expect(screen.queryByLabelText("Describe photo 3")).not.toBeInTheDocument();
			expect(altInput(2).value).toBe("Mossy path");
		});

		it("announces how many are left, and moves focus to the next photo's remove button", async () => {
			render(GalleryBuilder, { props: { rows: rows() } });
			await fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));
			await tick();

			expect(screen.getByText("Photo removed. 2 left.")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Remove photo 1" })).toHaveFocus();
		});
	});

	describe("Preview", () => {
		it("shows the real carousel once there are two or more photos", () => {
			render(GalleryBuilder, { props: { rows: rows() } });
			expect(screen.getByRole("region", { name: "Photo gallery" })).toBeInTheDocument();
		});

		it("asks for a second photo instead when there is only one", () => {
			render(GalleryBuilder, { props: { rows: [rows()[0]] } });
			expect(screen.queryByRole("region", { name: "Photo gallery" })).not.toBeInTheDocument();
			expect(screen.getByText(/at least two photos/)).toBeInTheDocument();
		});
	});
});
