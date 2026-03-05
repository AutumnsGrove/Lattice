/**
 * ArtifactShowcase Component Tests
 *
 * Trophy-style: integration tests for user-facing behavior.
 * Tests the showcase frame (open, navigate, close, focus management,
 * admin mode) — not the artifact rendering itself.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import ArtifactShowcase from "./ArtifactShowcase.svelte";
import type { ArtifactDisplay } from "$lib/curios/artifacts";

// ── Test Fixtures ──

function makeArtifact(overrides: Partial<ArtifactDisplay> = {}): ArtifactDisplay {
	return {
		id: "art_test_1",
		name: "Cozy Evening Candle",
		artifactType: "moodcandle",
		placement: "sidebar",
		config: { flameColor: "amber" },
		visibility: "always",
		discoveryRules: [],
		revealAnimation: "fade",
		container: "none",
		positionX: null,
		positionY: null,
		zIndex: 10,
		fallbackZone: "floating",
		...overrides,
	};
}

const threeArtifacts: ArtifactDisplay[] = [
	makeArtifact({ id: "art_1", name: "Cozy Candle", artifactType: "moodcandle" }),
	makeArtifact({ id: "art_2", name: "Lucky Dice", artifactType: "diceroller" }),
	makeArtifact({
		id: "art_3",
		name: "Crystal Vision",
		artifactType: "crystalball",
		config: { mistColor: "purple" },
		visibility: "easter-egg",
		container: "glass-card",
	}),
];

// ── Tests ──

describe("ArtifactShowcase", () => {
	describe("Dialog rendering", () => {
		it("should render the dialog when open with an artifact", () => {
			render(ArtifactShowcase, {
				props: { artifacts: [makeArtifact()], open: true },
			});

			const dialog = screen.getByRole("dialog");
			expect(dialog).toBeInTheDocument();
			expect(dialog).toHaveAttribute("aria-modal", "true");
		});

		it("should not render when closed", () => {
			render(ArtifactShowcase, {
				props: { artifacts: [makeArtifact()], open: false },
			});

			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		it("should display the artifact name as the dialog title", () => {
			render(ArtifactShowcase, {
				props: { artifacts: [makeArtifact({ name: "Mystic Globe" })], open: true },
			});

			const title = screen.getByText("Mystic Globe");
			expect(title).toBeInTheDocument();
			expect(title.id).toBe("showcase-title");
		});

		it("should show the type label when artifact has a name", () => {
			render(ArtifactShowcase, {
				props: {
					artifacts: [makeArtifact({ name: "My Candle", artifactType: "moodcandle" })],
					open: true,
				},
			});

			expect(screen.getByText("Mood Candle")).toBeInTheDocument();
		});

		it("should fall back to type label when artifact has no name", () => {
			render(ArtifactShowcase, {
				props: { artifacts: [makeArtifact({ name: "" })], open: true },
			});

			// Type label becomes the title; no subtitle rendered
			expect(screen.getByText("Mood Candle")).toBeInTheDocument();
		});
	});

	describe("Navigation", () => {
		it("should show navigation when multiple artifacts exist", () => {
			render(ArtifactShowcase, {
				props: { artifacts: threeArtifacts, open: true, currentIndex: 0 },
			});

			expect(screen.getByLabelText("Artifact navigation")).toBeInTheDocument();
			expect(screen.getByText("1 / 3")).toBeInTheDocument();
		});

		it("should not show navigation for a single artifact", () => {
			render(ArtifactShowcase, {
				props: { artifacts: [makeArtifact()], open: true },
			});

			expect(screen.queryByLabelText("Artifact navigation")).not.toBeInTheDocument();
		});

		it("should navigate forward with the next button", async () => {
			render(ArtifactShowcase, {
				props: { artifacts: threeArtifacts, open: true, currentIndex: 0 },
			});

			expect(screen.getByText("Cozy Candle")).toBeInTheDocument();

			await fireEvent.click(screen.getByLabelText("Next artifact"));

			expect(screen.getByText("Lucky Dice")).toBeInTheDocument();
			expect(screen.getByText("2 / 3")).toBeInTheDocument();
		});

		it("should navigate backward with the previous button", async () => {
			render(ArtifactShowcase, {
				props: { artifacts: threeArtifacts, open: true, currentIndex: 1 },
			});

			expect(screen.getByText("Lucky Dice")).toBeInTheDocument();

			await fireEvent.click(screen.getByLabelText("Previous artifact"));

			expect(screen.getByText("Cozy Candle")).toBeInTheDocument();
			expect(screen.getByText("1 / 3")).toBeInTheDocument();
		});

		it("should disable previous button at the start", () => {
			render(ArtifactShowcase, {
				props: { artifacts: threeArtifacts, open: true, currentIndex: 0 },
			});

			expect(screen.getByLabelText("Previous artifact")).toBeDisabled();
			expect(screen.getByLabelText("Next artifact")).not.toBeDisabled();
		});

		it("should disable next button at the end", async () => {
			render(ArtifactShowcase, {
				props: { artifacts: threeArtifacts, open: true, currentIndex: 2 },
			});

			expect(screen.getByLabelText("Next artifact")).toBeDisabled();
			expect(screen.getByLabelText("Previous artifact")).not.toBeDisabled();
		});
	});

	describe("Keyboard interaction", () => {
		it("should navigate with ArrowRight and ArrowLeft", async () => {
			render(ArtifactShowcase, {
				props: { artifacts: threeArtifacts, open: true, currentIndex: 0 },
			});

			const dialog = screen.getByRole("dialog");

			await fireEvent.keyDown(dialog, { key: "ArrowRight" });
			expect(screen.getByText("Lucky Dice")).toBeInTheDocument();

			await fireEvent.keyDown(dialog, { key: "ArrowRight" });
			expect(screen.getByText("Crystal Vision")).toBeInTheDocument();

			await fireEvent.keyDown(dialog, { key: "ArrowLeft" });
			expect(screen.getByText("Lucky Dice")).toBeInTheDocument();
		});

		it("should close with Escape", async () => {
			const onclose = vi.fn();
			render(ArtifactShowcase, {
				props: { artifacts: [makeArtifact()], open: true, onclose },
			});

			const dialog = screen.getByRole("dialog");
			await fireEvent.keyDown(dialog, { key: "Escape" });

			expect(onclose).toHaveBeenCalledOnce();
		});

		it("should not navigate past the bounds with arrow keys", async () => {
			render(ArtifactShowcase, {
				props: { artifacts: threeArtifacts, open: true, currentIndex: 0 },
			});

			const dialog = screen.getByRole("dialog");

			// ArrowLeft at start should stay at start
			await fireEvent.keyDown(dialog, { key: "ArrowLeft" });
			expect(screen.getByText("Cozy Candle")).toBeInTheDocument();
			expect(screen.getByText("1 / 3")).toBeInTheDocument();
		});
	});

	describe("Admin mode", () => {
		it("should show placement, visibility, and reveal tags in admin mode", () => {
			render(ArtifactShowcase, {
				props: {
					artifacts: [
						makeArtifact({
							placement: "sidebar",
							visibility: "easter-egg",
							revealAnimation: "sparkle",
							container: "glass-card",
						}),
					],
					open: true,
					adminMode: true,
				},
			});

			expect(screen.getByText("sidebar")).toBeInTheDocument();
			expect(screen.getByText("easter-egg")).toBeInTheDocument();
			expect(screen.getByText("sparkle")).toBeInTheDocument();
			expect(screen.getByText("glass card")).toBeInTheDocument();
		});

		it("should show config tags in admin mode", () => {
			render(ArtifactShowcase, {
				props: {
					artifacts: [makeArtifact({ config: { flameColor: "amber" } })],
					open: true,
					adminMode: true,
				},
			});

			expect(screen.getByText("flameColor: amber")).toBeInTheDocument();
		});

		it("should not show admin info when adminMode is false", () => {
			render(ArtifactShowcase, {
				props: {
					artifacts: [makeArtifact({ placement: "sidebar", visibility: "easter-egg" })],
					open: true,
					adminMode: false,
				},
			});

			expect(screen.queryByText("easter-egg")).not.toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("should have aria-modal and aria-labelledby on the dialog", () => {
			render(ArtifactShowcase, {
				props: { artifacts: [makeArtifact()], open: true },
			});

			const dialog = screen.getByRole("dialog");
			expect(dialog).toHaveAttribute("aria-modal", "true");
			expect(dialog).toHaveAttribute("aria-labelledby", "showcase-title");
		});

		it("should have accessible labels on close and nav buttons", () => {
			render(ArtifactShowcase, {
				props: { artifacts: threeArtifacts, open: true },
			});

			expect(screen.getByLabelText("Close showcase")).toBeInTheDocument();
			expect(screen.getByLabelText("Previous artifact")).toBeInTheDocument();
			expect(screen.getByLabelText("Next artifact")).toBeInTheDocument();
		});

		it("should have aria-live on the navigation counter", () => {
			render(ArtifactShowcase, {
				props: { artifacts: threeArtifacts, open: true },
			});

			const counter = screen.getByText("1 / 3");
			expect(counter).toHaveAttribute("aria-live", "polite");
		});
	});
});
