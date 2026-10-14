/**
 * GalleryBuilder Component Tests
 *
 * The builder is how people make galleries without ever seeing directive
 * syntax, so these cover what they would rely on: describing photos, ordering
 * them, adding more, and not losing work by accident.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { MAX_GALLERY_IMAGES } from "@autumnsgrove/grove-markdown/directives";
import GalleryBuilder from "./GalleryBuilder.svelte";

const photos = [
	{ url: "https://cdn.grove.place/a.jpg", alt: "Autumn forest", caption: "The long way in" },
	{ url: "https://cdn.grove.place/b.jpg", alt: "", caption: "" },
	{ url: "https://cdn.grove.place/c.jpg", alt: "Mossy path", caption: "" },
];

function setup(props: Partial<Parameters<typeof render<typeof GalleryBuilder>>[1]> = {}) {
	const onSave = vi.fn();
	const onClose = vi.fn();
	const view = render(GalleryBuilder, {
		props: { items: photos, onSave, onClose, ...props } as any,
	});
	return { ...view, onSave, onClose };
}

const altInput = (n: number) => screen.getByLabelText(`Describe photo ${n}`) as HTMLInputElement;

afterEach(() => vi.restoreAllMocks());

describe("GalleryBuilder", () => {
	describe("Rendering", () => {
		it("is a labelled dialog with wording that matches the mode", () => {
			setup();
			expect(screen.getByRole("dialog", { name: "Build your gallery" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Insert gallery" })).toBeInTheDocument();
		});

		it("says Edit and Save changes when reopening an existing gallery", () => {
			setup({ mode: "edit" });
			expect(screen.getByRole("dialog", { name: "Edit your gallery" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
		});

		it("shows each photo with its current alt text and caption filled in", () => {
			setup();
			expect(altInput(1).value).toBe("Autumn forest");
			expect((screen.getAllByLabelText("Caption (optional)")[0] as HTMLInputElement).value).toBe(
				"The long way in",
			);
			expect(altInput(2).value).toBe("");
			expect(screen.getByText("3 of 20 photos")).toBeInTheDocument();
		});

		it("starts with focus on the first description field", async () => {
			setup();
			await tick();
			expect(altInput(1)).toHaveFocus();
		});

		it("explains an empty gallery and cannot be saved", () => {
			setup({ items: [] });
			expect(screen.getByText(/No photos yet/)).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Insert gallery" })).toBeDisabled();
		});
	});

	describe("Saving", () => {
		it("hands back what was typed, in order", async () => {
			const { onSave } = setup();
			await fireEvent.input(altInput(2), { target: { value: "Fog in the valley" } });
			await fireEvent.input(screen.getAllByLabelText("Caption (optional)")[1], {
				target: { value: "Quiet, early" },
			});

			await fireEvent.click(screen.getByRole("button", { name: "Insert gallery" }));

			expect(onSave).toHaveBeenCalledWith([
				{ url: "https://cdn.grove.place/a.jpg", alt: "Autumn forest", caption: "The long way in" },
				{ url: "https://cdn.grove.place/b.jpg", alt: "Fog in the valley", caption: "Quiet, early" },
				{ url: "https://cdn.grove.place/c.jpg", alt: "Mossy path", caption: "" },
			]);
		});

		it("returns plain photos, without the builder's internal row ids", async () => {
			const { onSave } = setup();
			await fireEvent.click(screen.getByRole("button", { name: "Insert gallery" }));
			for (const item of onSave.mock.calls[0][0]) {
				expect(Object.keys(item).sort()).toEqual(["alt", "caption", "url"]);
			}
		});
	});

	describe("Reordering", () => {
		it("moves a photo up and down, and saves the new order", async () => {
			const { onSave } = setup();
			await fireEvent.click(screen.getByRole("button", { name: "Move photo 3 up" }));
			await fireEvent.click(screen.getByRole("button", { name: "Move photo 1 down" }));
			await fireEvent.click(screen.getByRole("button", { name: "Insert gallery" }));

			expect(onSave.mock.calls[0][0].map((p: { url: string }) => p.url.split("/").pop())).toEqual([
				"c.jpg",
				"a.jpg",
				"b.jpg",
			]);
		});

		it("carries alt text and captions along with the photo", async () => {
			setup();
			await fireEvent.click(screen.getByRole("button", { name: "Move photo 1 down" }));
			expect(altInput(2).value).toBe("Autumn forest");
			expect((screen.getAllByLabelText("Caption (optional)")[1] as HTMLInputElement).value).toBe(
				"The long way in",
			);
		});

		it("disables up on the first photo and down on the last", () => {
			setup();
			expect(screen.getByRole("button", { name: "Move photo 1 up" })).toBeDisabled();
			expect(screen.getByRole("button", { name: "Move photo 3 down" })).toBeDisabled();
			expect(screen.getByRole("button", { name: "Move photo 2 up" })).toBeEnabled();
		});

		it("keeps focus on the moved photo's button, falling back when it reaches the end", async () => {
			setup();
			const up = screen.getByRole("button", { name: "Move photo 2 up" });
			up.focus();
			await fireEvent.click(up);
			await tick();

			// Photo 2 is now photo 1, so Up is disabled and focus moves to Down instead
			expect(screen.getByRole("button", { name: "Move photo 1 down" })).toHaveFocus();
		});

		it("announces where the photo went", async () => {
			setup();
			await fireEvent.click(screen.getByRole("button", { name: "Move photo 1 down" }));
			expect(screen.getByText("Photo moved to position 2 of 3")).toBeInTheDocument();
		});
	});

	describe("Removing", () => {
		it("removes a photo and renumbers the rest", async () => {
			const { onSave } = setup();
			await fireEvent.click(screen.getByRole("button", { name: "Remove photo 2" }));

			expect(screen.getByText("2 of 20 photos")).toBeInTheDocument();
			expect(altInput(2).value).toBe("Mossy path");

			await fireEvent.click(screen.getByRole("button", { name: "Insert gallery" }));
			expect(onSave.mock.calls[0][0]).toHaveLength(2);
		});

		it("cannot be saved once every photo is removed", async () => {
			setup({ items: [photos[0]] });
			await fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));
			expect(screen.getByRole("button", { name: "Insert gallery" })).toBeDisabled();
		});
	});

	describe("Preview", () => {
		it("shows the real carousel once there are two or more photos", () => {
			setup();
			expect(screen.getByRole("region", { name: "Photo gallery" })).toBeInTheDocument();
		});

		it("asks for a second photo instead when there is only one", () => {
			setup({ items: [photos[0]] });
			expect(screen.queryByRole("region", { name: "Photo gallery" })).not.toBeInTheDocument();
			expect(screen.getByText(/at least two photos/)).toBeInTheDocument();
		});
	});

	describe("Adding photos", () => {
		it("opens the photo picker, and adds what is chosen to the end", async () => {
			const { onSave } = setup({ items: [photos[0]] });

			await fireEvent.click(screen.getByRole("button", { name: "Add photos" }));
			const picker = screen.getByRole("dialog", { name: "Insert photo" });
			expect(picker).toBeInTheDocument();

			await fireEvent.click(within(picker).getByRole("button", { name: /Paste an image URL/ }));
			const input = within(picker).getByLabelText("Enter image URL to insert");
			await fireEvent.input(input, { target: { value: "https://cdn.grove.place/new.jpg" } });
			await fireEvent.click(within(picker).getByRole("button", { name: "Add URL to selection" }));
			await fireEvent.click(within(picker).getByRole("button", { name: /^Insert/ }));

			expect(screen.queryByRole("dialog", { name: "Insert photo" })).not.toBeInTheDocument();
			expect(screen.getByText("2 of 20 photos")).toBeInTheDocument();
			expect(altInput(2).value).toBe("");

			await fireEvent.click(screen.getByRole("button", { name: "Insert gallery" }));
			expect(onSave.mock.calls[0][0][1].url).toBe("https://cdn.grove.place/new.jpg");
		});

		// Regression: the picker is removed while it holds focus, which dropped focus
		// onto <body>, where Escape never reached the builder. The second Escape of
		// "Escape out of the picker, Escape out of the builder" did nothing.
		it("hands focus back to Add photos when the picker is cancelled, so Escape still works", async () => {
			const { onClose } = setup();
			await fireEvent.click(screen.getByRole("button", { name: "Add photos" }));
			const picker = screen.getByRole("dialog", { name: "Insert photo" });

			await fireEvent.keyDown(picker, { key: "Escape" });
			await tick();

			expect(screen.queryByRole("dialog", { name: "Insert photo" })).not.toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Add photos" })).toHaveFocus();

			// Key events come from the focused element, which is now inside the builder
			await fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Escape" });
			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it("moves focus to the first new photo's description after adding photos", async () => {
			setup({ items: [photos[0]] });
			await fireEvent.click(screen.getByRole("button", { name: "Add photos" }));
			const picker = screen.getByRole("dialog", { name: "Insert photo" });

			await fireEvent.click(within(picker).getByRole("button", { name: /Paste an image URL/ }));
			await fireEvent.input(within(picker).getByLabelText("Enter image URL to insert"), {
				target: { value: "https://cdn.grove.place/new.jpg" },
			});
			await fireEvent.click(within(picker).getByRole("button", { name: "Add URL to selection" }));
			await fireEvent.click(within(picker).getByRole("button", { name: /^Insert/ }));
			await tick();

			expect(altInput(2)).toHaveFocus();
		});

		it("opens the picker straight away when started empty from the command menu", () => {
			setup({ items: [], startWithPicker: true });
			expect(screen.getByRole("dialog", { name: "Insert photo" })).toBeInTheDocument();
		});

		it("does not auto-open the picker when there are already photos", () => {
			setup({ startWithPicker: true });
			expect(screen.queryByRole("dialog", { name: "Insert photo" })).not.toBeInTheDocument();
		});

		it("stops adding at the limit", () => {
			const full = Array.from({ length: MAX_GALLERY_IMAGES }, (_, i) => ({
				url: `https://cdn.grove.place/${i}.jpg`,
				alt: "",
				caption: "",
			}));
			setup({ items: full });

			expect(screen.getByRole("button", { name: "Add photos" })).toBeDisabled();
			expect(
				screen.getByText(`Full: ${MAX_GALLERY_IMAGES} of ${MAX_GALLERY_IMAGES} photos`),
			).toBeInTheDocument();
		});
	});

	describe("Closing", () => {
		it("closes on Escape and on Cancel, saving nothing", async () => {
			const { onClose, onSave } = setup();
			await fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
			await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
			expect(onClose).toHaveBeenCalledTimes(2);
			expect(onSave).not.toHaveBeenCalled();
		});

		it("does not close when the backdrop is clicked, so typed descriptions are not lost", async () => {
			const { onClose, container } = setup();
			const backdrop = container.querySelector(".gallery-builder-backdrop") as HTMLElement;
			await fireEvent.click(backdrop);
			expect(onClose).not.toHaveBeenCalled();
		});
	});
});
