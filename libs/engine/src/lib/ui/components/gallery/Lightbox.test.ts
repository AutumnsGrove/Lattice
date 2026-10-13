/**
 * Lightbox Component Tests
 *
 * Covers the gallery additions (arrow buttons, arrow keys, position label,
 * focus handling) and that single-image use, as in GutterItem, is unchanged.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import Lightbox from "./Lightbox.svelte";

const base = { src: "https://cdn.grove.place/a.jpg", alt: "A photo", isOpen: true };

describe("Lightbox", () => {
	describe("Single image (unchanged behaviour)", () => {
		it("renders nothing when closed", () => {
			render(Lightbox, { props: { ...base, isOpen: false } });
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		it("has no arrow buttons or position label without gallery props", () => {
			render(Lightbox, { props: base });
			expect(screen.getByRole("dialog", { name: "Image viewer" })).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: "Previous image" })).not.toBeInTheDocument();
			expect(screen.queryByRole("button", { name: "Next image" })).not.toBeInTheDocument();
		});

		it("closes on Escape and on the close button", async () => {
			const onClose = vi.fn();
			render(Lightbox, { props: { ...base, onClose } });

			await fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
			expect(onClose).toHaveBeenCalledTimes(1);

			await fireEvent.click(screen.getByRole("button", { name: "Close" }));
			expect(onClose).toHaveBeenCalledTimes(2);
		});

		it("ignores Escape while closed", async () => {
			const onClose = vi.fn();
			render(Lightbox, { props: { ...base, isOpen: false, onClose } });
			await fireEvent.keyDown(window, { key: "Escape" });
			expect(onClose).not.toHaveBeenCalled();
		});
	});

	describe("Gallery mode", () => {
		it("shows arrows and the position label when given handlers", () => {
			render(Lightbox, {
				props: { ...base, position: "2 of 5", onPrevious: vi.fn(), onNext: vi.fn() },
			});
			expect(screen.getByRole("button", { name: "Previous image" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Next image" })).toBeInTheDocument();
			expect(screen.getByText("2 of 5")).toBeInTheDocument();
		});

		it("steps with the arrow buttons", async () => {
			const onPrevious = vi.fn();
			const onNext = vi.fn();
			render(Lightbox, { props: { ...base, onPrevious, onNext } });

			await fireEvent.click(screen.getByRole("button", { name: "Next image" }));
			await fireEvent.click(screen.getByRole("button", { name: "Previous image" }));
			expect(onNext).toHaveBeenCalledTimes(1);
			expect(onPrevious).toHaveBeenCalledTimes(1);
		});

		it("steps once per arrow key, even though the key reaches two listeners", async () => {
			const onPrevious = vi.fn();
			const onNext = vi.fn();
			render(Lightbox, { props: { ...base, onPrevious, onNext } });
			const dialog = screen.getByRole("dialog");

			await fireEvent.keyDown(dialog, { key: "ArrowRight" });
			expect(onNext).toHaveBeenCalledTimes(1);

			await fireEvent.keyDown(dialog, { key: "ArrowLeft" });
			expect(onPrevious).toHaveBeenCalledTimes(1);
		});

		it("ignores arrow keys that have no handler", async () => {
			const onNext = vi.fn();
			render(Lightbox, { props: { ...base, onNext } });
			await fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
			expect(onNext).not.toHaveBeenCalled();
		});
	});

	describe("Focus", () => {
		it("moves focus to the close button on open", async () => {
			render(Lightbox, { props: base });
			await tick();
			expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
		});

		it("hands focus back to whatever had it before", async () => {
			const opener = document.createElement("button");
			document.body.appendChild(opener);
			opener.focus();

			const { rerender } = render(Lightbox, { props: base });
			await tick();
			expect(opener).not.toHaveFocus();

			await rerender({ ...base, isOpen: false });
			await tick();
			expect(opener).toHaveFocus();
			opener.remove();
		});

		it("keeps Tab inside the dialog", async () => {
			render(Lightbox, { props: { ...base, onPrevious: vi.fn(), onNext: vi.fn() } });
			await tick();
			const close = screen.getByRole("button", { name: "Close" });
			// The zoomable image is itself a button, and the last stop in the dialog
			const zoom = screen.getByRole("button", { name: "Click to zoom image" });

			// Tab off the last stop wraps to the first; Shift+Tab off the first wraps to the last
			zoom.focus();
			await fireEvent.keyDown(zoom, { key: "Tab" });
			expect(close).toHaveFocus();

			await fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
			expect(zoom).toHaveFocus();
		});
	});
});
