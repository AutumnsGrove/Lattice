/**
 * Lantern term help — the "?" beside a Grove term in the panel (#1348).
 *
 * Grove Mode ON shows Grove terms, each with a "?" that opens its definition.
 * Grove Mode OFF shows standard terms with no "?". The "?" is a sibling of the
 * link, so the link keeps navigating, and Escape in the popup must not also
 * close the panel behind it.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/svelte";
import Lantern from "./Lantern.svelte";
import LanternPanel from "./LanternPanel.svelte";
import LanternTermHelp from "./LanternTermHelp.svelte";
import { groveModeStore } from "$lib/ui/stores/grove-mode.svelte";
import { lanternStore } from "$lib/ui/stores/lantern.svelte";
import type { LanternLayoutData } from "./types";

const DATA: LanternLayoutData = {
	homeGrove: "autumn",
	displayName: "Autumn",
	enabled: true,
	visitingGrove: null,
	demoIdentities: null,
};

/**
 * The term popup, not the panel: the panel is itself a role="dialog", so the
 * role alone matches both.
 */
const termPopup = () => document.querySelector('[aria-labelledby="grove-term-popup-title"]');

function openPanelOn(tab: "destinations" | "services") {
	if (!lanternStore.open) lanternStore.toggle();
	lanternStore.setTab(tab);
}

beforeEach(() => {
	groveModeStore.enable();
});

afterEach(() => {
	cleanup();
	lanternStore.close();
	lanternStore.setTab("destinations");
	groveModeStore.disable();
});

describe("LanternTermHelp", () => {
	it("renders a labelled button for a Grove term", () => {
		render(LanternTermHelp, { slug: "canopy" });

		const button = screen.getByRole("button", { name: "About Canopy" });
		expect(button.getAttribute("aria-haspopup")).toBe("dialog");
		expect(button.getAttribute("type")).toBe("button");
	});

	it("renders nothing for a slug that is not a Grove term", () => {
		render(LanternTermHelp, { slug: "not-a-real-term" });

		expect(screen.queryByRole("button")).toBeNull();
	});

	it("opens the term's definition when clicked", async () => {
		render(LanternTermHelp, { slug: "canopy" });
		expect(termPopup()).toBeNull();

		await fireEvent.click(screen.getByRole("button", { name: "About Canopy" }));

		await waitFor(() => expect(termPopup()).not.toBeNull());
		expect(termPopup()!.textContent).toContain("Canopy");
	});
});

describe("LanternPanel destinations and services", () => {
	it("Grove Mode ON: Grove terms, each with a help button", () => {
		openPanelOn("destinations");
		render(LanternPanel, { data: DATA });

		expect(screen.getByRole("link", { name: /Canopy/ })).toBeTruthy();
		expect(screen.getByRole("button", { name: "About Canopy" })).toBeTruthy();
	});

	it("Grove Mode ON: services each get a help button", () => {
		openPanelOn("services");
		render(LanternPanel, { data: DATA });

		expect(screen.getByRole("link", { name: /Amber/ })).toBeTruthy();
		expect(screen.getByRole("button", { name: "About Amber" })).toBeTruthy();
		expect(screen.getByRole("link", { name: /Arbor/ })).toBeTruthy();
		expect(screen.getByRole("button", { name: "About Arbor" })).toBeTruthy();
	});

	it("a destination that is not a Grove term gets no help button", () => {
		openPanelOn("destinations");
		render(LanternPanel, { data: DATA });

		// Knowledge Base has no termSlug, so it is a link and nothing more.
		expect(screen.getByRole("link", { name: /Knowledge Base/ })).toBeTruthy();
		expect(screen.getAllByRole("button", { name: /^About / })).toHaveLength(1);
	});

	it("Grove Mode OFF: standard terms and no help buttons", () => {
		groveModeStore.disable();
		openPanelOn("destinations");
		render(LanternPanel, { data: DATA });

		expect(screen.getByRole("link", { name: /Directory/ })).toBeTruthy();
		expect(screen.queryByRole("link", { name: /Canopy/ })).toBeNull();
		expect(screen.queryByRole("button", { name: /^About / })).toBeNull();
	});

	it("keeps the help button outside the link", () => {
		openPanelOn("destinations");
		render(LanternPanel, { data: DATA });

		const help = screen.getByRole("button", { name: "About Canopy" });
		const link = screen.getByRole("link", { name: /Canopy/ });
		// A button inside an anchor is invalid HTML and would navigate on click.
		expect(help.closest("a")).toBeNull();
		expect(link.contains(help)).toBe(false);
		expect(help.parentElement).toBe(link.parentElement);
	});

	it("the help button does not navigate, and the link does not open the popup", async () => {
		openPanelOn("destinations");
		render(LanternPanel, { data: DATA });
		const link = screen.getByRole("link", { name: /Canopy/ });
		const help = screen.getByRole("button", { name: "About Canopy" });

		// Clicking "?" must not be treated as a click on the link.
		let linkClicked = false;
		link.addEventListener("click", () => (linkClicked = true));
		await fireEvent.click(help);
		expect(linkClicked).toBe(false);
		await waitFor(() => expect(termPopup()).not.toBeNull());

		// And the link itself still behaves as a plain link (default not prevented).
		cleanup();
		openPanelOn("destinations");
		render(LanternPanel, { data: DATA });
		const plainLink = screen.getByRole("link", { name: /Canopy/ });
		const notPrevented = await fireEvent.click(plainLink);
		expect(notPrevented).toBe(true);
		expect(termPopup()).toBeNull();
		expect(plainLink.getAttribute("href")).toBe("https://grove.place/canopy");
	});
});

describe("Escape with a term popup open", () => {
	it("closes the popup first and leaves the panel open", async () => {
		openPanelOn("destinations");
		render(Lantern, { data: DATA });
		expect(lanternStore.open).toBe(true);

		await fireEvent.click(screen.getByRole("button", { name: "About Canopy" }));
		await waitFor(() => expect(termPopup()).not.toBeNull());

		await fireEvent.keyDown(document.body, { key: "Escape" });

		await waitFor(() => expect(termPopup()).toBeNull());
		expect(lanternStore.open).toBe(true);
	});

	it("still closes the panel when Escape is pressed with no popup open", async () => {
		openPanelOn("destinations");
		render(Lantern, { data: DATA });
		expect(lanternStore.open).toBe(true);

		await fireEvent.keyDown(document.body, { key: "Escape" });

		expect(lanternStore.open).toBe(false);
	});
});
