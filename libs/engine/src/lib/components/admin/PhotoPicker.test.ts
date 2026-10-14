/**
 * PhotoPicker Component Tests
 *
 * One modal, two steps. Pick photos; a second photo turns it into a gallery
 * and "Arrange gallery" opens the second half (order, alt text, captions,
 * preview). These cover that swap, the single-photo description, the arrange
 * step, and that Escape and clicks behave in both halves.
 *
 * The photo library is off (galleryEnabled is false), so photos are added by
 * pasting URLs, which exercises the same selection logic without a network.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import { MAX_GALLERY_IMAGES } from "@autumnsgrove/grove-markdown/directives";
import PhotoPicker from "./PhotoPicker.svelte";

const A = "https://cdn.grove.place/a.jpg";
const B = "https://cdn.grove.place/b.jpg";
const C = "https://cdn.grove.place/c.jpg";

function setup(props: Record<string, unknown> = {}) {
	const onInsert = vi.fn();
	const onInsertGallery = vi.fn();
	const onClose = vi.fn();
	const view = render(PhotoPicker, {
		props: { onInsert, onInsertGallery, onClose, ...props } as any,
	});
	return { ...view, onInsert, onInsertGallery, onClose };
}

/** Select photos by pasting their URLs, the way someone without a photo library would. */
async function pick(...urls: string[]) {
	if (!screen.queryByLabelText("Enter image URL to insert")) {
		await fireEvent.click(screen.getByRole("button", { name: /Paste an image URL/ }));
	}
	for (const url of urls) {
		await fireEvent.input(screen.getByLabelText("Enter image URL to insert"), {
			target: { value: url },
		});
		await fireEvent.click(screen.getByRole("button", { name: "Add URL to selection" }));
	}
}

const primary = () =>
	screen.getByRole("button", { name: /^(Insert|Arrange gallery|Save changes)/ });
const altInput = (n: number) => screen.getByLabelText(`Describe photo ${n}`) as HTMLInputElement;
const describeBox = () =>
	screen.queryByLabelText("Describe this photo (optional)") as HTMLInputElement | null;

describe("PhotoPicker", () => {
	describe("Photos step, one photo", () => {
		it("starts as a plain photo picker with nothing to insert", () => {
			setup();
			expect(screen.getByRole("dialog", { name: "Insert photo" })).toBeInTheDocument();
			expect(screen.getByText("Select or paste photos to insert")).toBeInTheDocument();
			expect(primary()).toBeDisabled();
			expect(describeBox()).not.toBeInTheDocument();
		});

		it("with one photo, offers a description and hints that more makes a gallery", async () => {
			setup();
			await pick(A);

			expect(screen.getByText(/1 photo selected/)).toBeInTheDocument();
			expect(screen.getByText("Pick more than one to make a gallery")).toBeInTheDocument();
			expect(describeBox()).toBeInTheDocument();
			expect(primary()).toHaveTextContent("Insert (1)");
		});

		it("inserts the photo with the description that was typed", async () => {
			const { onInsert, onInsertGallery } = setup();
			await pick(A);
			await fireEvent.input(describeBox()!, { target: { value: "Sunlight on a path" } });
			await fireEvent.click(primary());

			expect(onInsert).toHaveBeenCalledWith([A], "Sunlight on a path");
			expect(onInsertGallery).not.toHaveBeenCalled();
		});

		it("passes no description when the box is left blank", async () => {
			const { onInsert } = setup();
			await pick(A);
			await fireEvent.click(primary());
			expect(onInsert).toHaveBeenCalledWith([A], undefined);
		});

		it("inserts on Enter in the description box", async () => {
			const { onInsert } = setup();
			await pick(A);
			await fireEvent.input(describeBox()!, { target: { value: "A path" } });
			await fireEvent.keyDown(describeBox()!, { key: "Enter" });
			expect(onInsert).toHaveBeenCalledWith([A], "A path");
		});
	});

	describe("The automatic swap to a gallery", () => {
		it("flips to gallery mode when a second photo is picked", async () => {
			setup();
			await pick(A, B);

			expect(screen.getByText("(will insert as gallery)")).toBeInTheDocument();
			expect(primary()).toHaveTextContent("Arrange gallery (2)");
			expect(describeBox()).not.toBeInTheDocument();
		});

		it("flips back, and remembers the description, when deselected to one photo", async () => {
			setup();
			await pick(A);
			await fireEvent.input(describeBox()!, { target: { value: "Keep me" } });
			await pick(B);
			expect(primary()).toHaveTextContent("Arrange gallery (2)");

			await fireEvent.click(screen.getByRole("button", { name: "Remove b.jpg from selection" }));

			expect(primary()).toHaveTextContent("Insert (1)");
			expect(describeBox()!.value).toBe("Keep me");
		});

		it("only ever inserts photos when galleries are not enabled", async () => {
			const onInsert = vi.fn();
			render(PhotoPicker, { props: { onInsert, onClose: vi.fn() } as any });
			await pick(A, B);

			expect(screen.queryByText("Pick more than one to make a gallery")).not.toBeInTheDocument();
			expect(primary()).toHaveTextContent("Insert (2)");
			await fireEvent.click(primary());
			expect(onInsert).toHaveBeenCalledWith([A, B], undefined);
		});

		it("stops at the gallery limit", async () => {
			setup();
			const urls = Array.from(
				{ length: MAX_GALLERY_IMAGES + 2 },
				(_, i) => `https://cdn.grove.place/${i}.jpg`,
			);
			await pick(...urls);

			expect(
				screen.getByText(new RegExp(`${MAX_GALLERY_IMAGES} photos selected`)),
			).toBeInTheDocument();
			expect(
				screen.getByText(new RegExp(`full, a gallery holds ${MAX_GALLERY_IMAGES}`)),
			).toBeInTheDocument();
		});
	});

	describe("Arrange step", () => {
		it("opens as a gallery builder, focused on the first description", async () => {
			setup();
			await pick(A, B, C);
			await fireEvent.click(primary());
			await tick();

			expect(screen.getByRole("dialog", { name: "Build your gallery" })).toBeInTheDocument();
			expect(altInput(1)).toHaveFocus();
			expect(screen.getByText("3 of 20 photos")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Insert gallery" })).toBeInTheDocument();
		});

		it("hands back the finished gallery, in order, with what was typed", async () => {
			const { onInsertGallery } = setup();
			await pick(A, B, C);
			await fireEvent.click(primary());

			await fireEvent.input(altInput(1), { target: { value: "Forest" } });
			await fireEvent.input(screen.getAllByLabelText("Caption (optional)")[0], {
				target: { value: "Mid-October" },
			});
			await fireEvent.click(screen.getByRole("button", { name: "Move photo 3 up" }));
			await fireEvent.click(screen.getByRole("button", { name: "Insert gallery" }));

			expect(onInsertGallery).toHaveBeenCalledWith([
				{ url: A, alt: "Forest", caption: "Mid-October" },
				{ url: C, alt: "", caption: "" },
				{ url: B, alt: "", caption: "" },
			]);
		});

		it("goes back to the photos with the same ones selected", async () => {
			setup();
			await pick(A, B);
			await fireEvent.click(primary());
			await fireEvent.click(screen.getByRole("button", { name: "Back to photos" }));
			await tick();

			expect(screen.getByRole("dialog", { name: "Insert photo" })).toBeInTheDocument();
			expect(screen.getByText(/2 photos selected/)).toBeInTheDocument();
			expect(primary()).toHaveTextContent("Arrange gallery (2)");
			expect(primary()).toHaveFocus();
		});

		it("keeps typed descriptions and the arranged order across a trip back", async () => {
			setup();
			await pick(A, B);
			await fireEvent.click(primary());
			await fireEvent.input(altInput(1), { target: { value: "First" } });
			await fireEvent.click(screen.getByRole("button", { name: "Move photo 1 down" }));
			await fireEvent.click(screen.getByRole("button", { name: "Back to photos" }));
			await pick(C);
			await fireEvent.click(primary());

			// B moved ahead of A, C was added last, and A kept its description
			const thumbs = screen
				.getAllByRole("listitem")
				.map((li) => li.querySelector("img")?.getAttribute("src"));
			expect(thumbs).toEqual([B, A, C]);
			expect(altInput(2).value).toBe("First");
		});

		it("cannot be inserted once every photo is removed", async () => {
			setup();
			await pick(A, B);
			await fireEvent.click(primary());
			await fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));
			await fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));

			expect(screen.getByRole("button", { name: "Insert gallery" })).toBeDisabled();
		});
	});

	describe("Editing an existing gallery", () => {
		const existing = [
			{ url: A, alt: "Autumn forest", caption: "The long way in" },
			{ url: B, alt: "", caption: "" },
		];

		it("opens straight on the arrange step, pre-filled, worded for editing", () => {
			setup({ initialGallery: existing });

			expect(screen.getByRole("dialog", { name: "Edit your gallery" })).toBeInTheDocument();
			expect(altInput(1).value).toBe("Autumn forest");
			expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
		});

		it("saves the changes through the gallery callback", async () => {
			const { onInsertGallery } = setup({ initialGallery: existing });
			await fireEvent.input(altInput(2), { target: { value: "Fog" } });
			await fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

			expect(onInsertGallery).toHaveBeenCalledWith([
				{ url: A, alt: "Autumn forest", caption: "The long way in" },
				{ url: B, alt: "Fog", caption: "" },
			]);
		});

		it("can step back to add more photos, keeping the existing ones selected", async () => {
			setup({ initialGallery: existing });
			await fireEvent.click(screen.getByRole("button", { name: "Back to photos" }));
			await pick(C);

			expect(screen.getByText(/3 photos selected/)).toBeInTheDocument();
			await fireEvent.click(primary());
			expect(altInput(1).value).toBe("Autumn forest");
			expect(screen.getByText("3 of 20 photos")).toBeInTheDocument();
		});
	});

	describe("Closing", () => {
		it("closes on Escape from the photos step", async () => {
			const { onClose } = setup();
			await fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
			expect(onClose).toHaveBeenCalledTimes(1);
		});

		// Regression: the old design opened the arrange step as a second dialog on top of the
		// picker, and Escape on the way out was lost when focus fell to <body>. One modal, one handler.
		it("closes on Escape from the arrange step, in one press", async () => {
			const { onClose } = setup();
			await pick(A, B);
			await fireEvent.click(primary());
			await tick();

			await fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Escape" });
			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it("closes on a backdrop click on the photos step", async () => {
			const { onClose, container } = setup();
			await fireEvent.click(container.querySelector(".photo-picker-backdrop") as HTMLElement);
			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it("does not close on a backdrop click while arranging, so typed descriptions are not lost", async () => {
			const { onClose, container } = setup();
			await pick(A, B);
			await fireEvent.click(primary());
			await fireEvent.click(container.querySelector(".photo-picker-backdrop") as HTMLElement);
			expect(onClose).not.toHaveBeenCalled();
		});
	});
});
