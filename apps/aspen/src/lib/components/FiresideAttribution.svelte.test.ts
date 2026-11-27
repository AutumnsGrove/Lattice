/**
 * The disclosure, as a reader and as the writer see it.
 *
 * Three things could be quietly wrong here, and none of them throws:
 *
 * - the marker could vanish when the writer edits the post (it must not, and it is
 *   derived from the flag rather than the prose precisely so it cannot)
 * - a proposal's stored JSON could reach the page instead of the sentence about it
 * - a failed toggle could look like it worked, which is the one failure that
 *   changes what a reader sees without anyone deciding it should
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FiresideAttribution from "./FiresideAttribution.svelte";

const ENTRIES = [
	{ role: "user" as const, kind: "turn" as const, content: "The sign said eight." },
	{ role: "wisp" as const, kind: "turn" as const, content: "Say more about the sign." },
	{
		role: "wisp" as const,
		kind: "draft" as const,
		title: "The sign said eight",
		words: 8,
		accepted: true,
	},
];

const TRANSCRIPT = { publishedAt: 1_700_000_000, entries: ENTRIES };

function renderFooter(
	overrides: Partial<{
		assisted: boolean;
		transcript: typeof TRANSCRIPT | null;
		transcriptSwitch: { sessionId: string; transcriptPublic: boolean } | null;
	}> = {},
) {
	return render(FiresideAttribution, {
		assisted: true,
		transcript: null,
		author: "Autumn",
		transcriptSwitch: null,
		...overrides,
	});
}

beforeEach(() => {
	vi.unstubAllGlobals();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("FiresideAttribution", () => {
	describe("happy", () => {
		it("says the post was written fireside, with no conversation needed", () => {
			renderFooter();

			expect(screen.getByText(/written fireside with Wisp/)).toBeTruthy();
			expect(screen.queryByText("Read how this was written")).toBeNull();
		});

		it("shows both sides, and counts the proposal instead of reprinting it", () => {
			renderFooter({ transcript: TRANSCRIPT });

			expect(screen.getByText("Read how this was written")).toBeTruthy();
			expect(screen.getByText("The sign said eight.")).toBeTruthy();
			expect(screen.getByText("Say more about the sign.")).toBeTruthy();
			expect(screen.getByText(/Wisp proposed a draft/)).toBeTruthy();
			expect(screen.getByText(/8 words/)).toBeTruthy();
			expect(screen.getByText("The writer accepted this one.")).toBeTruthy();
		});

		it("names the writer's own turns, rather than calling them you", () => {
			renderFooter({ transcript: TRANSCRIPT });

			expect(screen.getAllByText("Autumn").length).toBeGreaterThan(0);
		});

		it("publishes from the footer, and shows the conversation it just published", async () => {
			const fetchMock = vi.fn(
				async () =>
					new Response(JSON.stringify({ transcriptPublic: true, transcript: TRANSCRIPT }), {
						status: 200,
						headers: { "content-type": "application/json" },
					}),
			);
			vi.stubGlobal("fetch", fetchMock);

			renderFooter({ transcriptSwitch: { sessionId: "session-1", transcriptPublic: false } });

			await fireEvent.click(screen.getByText("Share how this was written"));

			await waitFor(() => expect(screen.getByText("Read how this was written")).toBeTruthy());
			expect(screen.getByText("The sign said eight.")).toBeTruthy();
			expect(screen.getByText("Stop sharing this conversation")).toBeTruthy();

			const [input, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
			expect(String(input)).toBe("/api/fireside/session-1/transcript");
			expect(init.method).toBe("POST");
			expect(JSON.parse(String(init.body))).toEqual({ public: true });
		});

		it("takes it back down, and leaves the marker standing", async () => {
			vi.stubGlobal(
				"fetch",
				vi.fn(
					async () =>
						new Response(JSON.stringify({ transcriptPublic: false, transcript: null }), {
							status: 200,
							headers: { "content-type": "application/json" },
						}),
				),
			);

			renderFooter({
				transcript: TRANSCRIPT,
				transcriptSwitch: { sessionId: "session-1", transcriptPublic: true },
			});

			await fireEvent.click(screen.getByText("Stop sharing this conversation"));

			await waitFor(() => expect(screen.queryByText("Read how this was written")).toBeNull());
			expect(screen.queryByText("The sign said eight.")).toBeNull();
			// The attribution is not a reward for sharing; it stays because it is true.
			expect(screen.getByText(/written fireside with Wisp/)).toBeTruthy();
		});
	});

	describe("bad", () => {
		it("renders nothing at all when the flag is not set", () => {
			const { container } = renderFooter({ assisted: false, transcript: TRANSCRIPT });

			expect(container.textContent?.trim()).toBe("");
		});

		it("offers no switch to a reader who is not the writer", () => {
			renderFooter({ transcript: TRANSCRIPT });

			expect(screen.queryByText("Stop sharing this conversation")).toBeNull();
			expect(screen.queryByText("Share how this was written")).toBeNull();
		});
	});

	describe("sad", () => {
		it("says the toggle failed, and leaves the conversation as it was", async () => {
			vi.stubGlobal(
				"fetch",
				vi.fn(async () => new Response(JSON.stringify({}), { status: 500 })),
			);

			renderFooter({ transcriptSwitch: { sessionId: "session-1", transcriptPublic: false } });

			await fireEvent.click(screen.getByText("Share how this was written"));

			await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
			expect(screen.getByRole("status").textContent).toMatch(/still private/i);
			expect(screen.queryByText("Read how this was written")).toBeNull();
			expect(screen.getByText("Share how this was written")).toBeTruthy();
		});
	});
});
