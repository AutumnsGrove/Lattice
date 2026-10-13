/**
 * PostCarousel Component Tests
 *
 * jsdom has no layout and no Element.scrollTo, so each test gives the track a
 * width and a scrollTo spy, then drives scroll position directly. The
 * component treats scroll position as the source of truth for the current
 * slide, which is exactly what these tests exercise.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import PostCarousel from "./PostCarousel.svelte";

const images = [
	{ url: "https://cdn.grove.place/a.jpg", alt: "Autumn forest", caption: "The long way in" },
	{ url: "https://cdn.grove.place/b.jpg", alt: "Mossy path", caption: "" },
	{ url: "https://cdn.grove.place/c.jpg", alt: "", caption: "No alt on this one" },
];

const SLIDE_WIDTH = 300;

function setup(props = { images }) {
	const view = render(PostCarousel, { props });
	const track = view.container.querySelector(".grove-gallery-track") as HTMLDivElement;
	Object.defineProperty(track, "clientWidth", { value: SLIDE_WIDTH, configurable: true });
	const scrollTo = vi.fn();
	track.scrollTo = scrollTo as unknown as typeof track.scrollTo;
	return { ...view, track, scrollTo };
}

/** Scroll the track and let the component's requestAnimationFrame settle. */
async function scrollToSlide(track: HTMLElement, index: number) {
	track.scrollLeft = index * SLIDE_WIDTH;
	await fireEvent.scroll(track);
	await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
	await tick();
}

function mockReducedMotion(reduced: boolean) {
	window.matchMedia = vi
		.fn()
		.mockReturnValue({ matches: reduced }) as unknown as typeof window.matchMedia;
}

describe("PostCarousel", () => {
	beforeEach(() => mockReducedMotion(false));
	afterEach(() => vi.restoreAllMocks());

	describe("Structure and accessibility", () => {
		it("is a labelled carousel region", () => {
			render(PostCarousel, { props: { images } });
			const region = screen.getByRole("region", { name: "Photo gallery" });
			expect(region).toHaveAttribute("aria-roledescription", "carousel");
		});

		it("renders one slide per image, announced by position", () => {
			render(PostCarousel, { props: { images } });
			const slides = screen.getAllByRole("group");
			expect(slides).toHaveLength(3);
			expect(slides[0]).toHaveAttribute("aria-roledescription", "slide");
			expect(slides[0]).toHaveAttribute("aria-label", "1 of 3");
			expect(slides[2]).toHaveAttribute("aria-label", "3 of 3");
		});

		it("keeps alt text and shows captions only where they exist", () => {
			const { container } = render(PostCarousel, { props: { images } });
			const imgs = container.querySelectorAll(".grove-gallery-item img");
			expect(imgs[0]).toHaveAttribute("alt", "Autumn forest");
			expect(imgs[2]).toHaveAttribute("alt", "");
			expect(screen.getByText("The long way in")).toBeInTheDocument();
			expect(container.querySelectorAll("figcaption")).toHaveLength(2);
		});

		it("names each open-lightbox button, with alt text when there is some", () => {
			render(PostCarousel, { props: { images } });
			expect(
				screen.getByRole("button", { name: "View photo 1 larger: Autumn forest" }),
			).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "View photo 3 larger" })).toBeInTheDocument();
		});
	});

	describe("Navigation", () => {
		it("marks the first dot current and announces the position", () => {
			render(PostCarousel, { props: { images } });
			expect(screen.getByRole("button", { name: "Go to photo 1" })).toHaveAttribute(
				"aria-current",
				"true",
			);
			expect(screen.getByText("Photo 1 of 3")).toBeInTheDocument();
		});

		it("scrolls to a slide when its dot is clicked", async () => {
			const { scrollTo } = setup();
			await fireEvent.click(screen.getByRole("button", { name: "Go to photo 3" }));
			expect(scrollTo).toHaveBeenCalledWith({ left: 2 * SLIDE_WIDTH, behavior: "smooth" });
		});

		it("follows the scroll position, however it got there (swipe included)", async () => {
			const { track } = setup();
			await scrollToSlide(track, 1);
			expect(screen.getByRole("button", { name: "Go to photo 2" })).toHaveAttribute(
				"aria-current",
				"true",
			);
			expect(screen.getByRole("button", { name: "Go to photo 1" })).not.toHaveAttribute(
				"aria-current",
			);
			expect(screen.getByText("Photo 2 of 3")).toBeInTheDocument();
		});

		it("steps with the next and previous buttons", async () => {
			const { track, scrollTo } = setup();
			await fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
			expect(scrollTo).toHaveBeenLastCalledWith({ left: SLIDE_WIDTH, behavior: "smooth" });

			await scrollToSlide(track, 1);
			await fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));
			expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: "smooth" });
		});

		it("steps with the arrow keys", async () => {
			const { track, scrollTo } = setup();
			const region = screen.getByRole("region");
			await fireEvent.keyDown(region, { key: "ArrowRight" });
			expect(scrollTo).toHaveBeenLastCalledWith({ left: SLIDE_WIDTH, behavior: "smooth" });

			await scrollToSlide(track, 1);
			await fireEvent.keyDown(region, { key: "ArrowLeft" });
			expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: "smooth" });
		});

		it("dims prev at the start and next at the end instead of disabling them", async () => {
			const { track } = setup();
			const prev = screen.getByRole("button", { name: "Previous photo" });
			const next = screen.getByRole("button", { name: "Next photo" });
			expect(prev).toHaveAttribute("aria-disabled", "true");
			expect(next).toHaveAttribute("aria-disabled", "false");
			// aria-disabled (not disabled) so focus isn't dropped when the end is reached
			expect(prev).not.toBeDisabled();

			await scrollToSlide(track, 2);
			expect(prev).toHaveAttribute("aria-disabled", "false");
			expect(next).toHaveAttribute("aria-disabled", "true");
		});

		it("never scrolls past either end", async () => {
			const { scrollTo } = setup();
			await fireEvent.keyDown(screen.getByRole("region"), { key: "ArrowLeft" });
			expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: "smooth" });
		});
	});

	describe("Reduced motion", () => {
		it("snaps instantly instead of animating", async () => {
			mockReducedMotion(true);
			const { scrollTo } = setup();
			await fireEvent.click(screen.getByRole("button", { name: "Go to photo 2" }));
			expect(scrollTo).toHaveBeenCalledWith({ left: SLIDE_WIDTH, behavior: "instant" });
		});
	});

	describe("Lightbox", () => {
		it("opens on the clicked photo, with its caption and position", async () => {
			setup();
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

			await fireEvent.click(
				screen.getByRole("button", { name: "View photo 1 larger: Autumn forest" }),
			);

			expect(screen.getByRole("dialog", { name: "Image viewer" })).toBeInTheDocument();
			expect(screen.getAllByText("The long way in").length).toBeGreaterThan(1); // slide + lightbox
			expect(screen.getByText("1 of 3")).toBeInTheDocument();
		});

		// Regression: left inside the post it opened underneath the site header
		// (a parent stacking context caps its z-index) and hid its own close button.
		it("renders on <body>, outside the carousel and its stacking contexts", async () => {
			const { container } = setup();
			await fireEvent.click(
				screen.getByRole("button", { name: "View photo 1 larger: Autumn forest" }),
			);

			const dialog = screen.getByRole("dialog", { name: "Image viewer" });
			expect(container.contains(dialog)).toBe(false);
			expect(document.body.contains(dialog)).toBe(true);
		});

		it("puts focus on Close when it opens, even after moving to <body>", async () => {
			setup();
			await fireEvent.click(
				screen.getByRole("button", { name: "View photo 1 larger: Autumn forest" }),
			);
			await tick();
			expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
		});

		it("removes the lightbox from <body> when it closes", async () => {
			setup();
			await fireEvent.click(
				screen.getByRole("button", { name: "View photo 1 larger: Autumn forest" }),
			);
			await fireEvent.click(screen.getByRole("button", { name: "Close" }));
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			expect(document.querySelector(".lightbox-backdrop")).toBeNull();
		});

		it("steps through photos and hides the arrow at each end", async () => {
			setup();
			await fireEvent.click(
				screen.getByRole("button", { name: "View photo 1 larger: Autumn forest" }),
			);
			expect(screen.queryByRole("button", { name: "Previous image" })).not.toBeInTheDocument();

			await fireEvent.click(screen.getByRole("button", { name: "Next image" }));
			expect(screen.getByText("2 of 3")).toBeInTheDocument();

			await fireEvent.click(screen.getByRole("button", { name: "Next image" }));
			expect(screen.getByText("3 of 3")).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: "Next image" })).not.toBeInTheDocument();
		});

		it("closes on Escape and lands the strip on the photo you ended on", async () => {
			const { scrollTo } = setup();
			await fireEvent.click(
				screen.getByRole("button", { name: "View photo 1 larger: Autumn forest" }),
			);
			await fireEvent.click(screen.getByRole("button", { name: "Next image" }));

			await fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			expect(scrollTo).toHaveBeenLastCalledWith({ left: SLIDE_WIDTH, behavior: "instant" });
		});
	});
});
