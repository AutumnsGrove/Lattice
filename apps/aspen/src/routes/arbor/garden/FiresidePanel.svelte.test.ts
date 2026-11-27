/**
 * The panel, as a component: the state it mirrors and the requests it makes.
 *
 * This is Aspen's first component test, and it covers the one thing the route
 * suites cannot reach: the panel keeps a *local* copy of the conversation while
 * sending a message, reconciles it with the reply, and decides what "accept" means
 * for the page. Those are the places it could be silently wrong.
 *
 * The real DOM is jsdom (a component has to run somewhere), and `fetch` is stubbed
 * at the boundary — the same line the worker suites draw with `setService`. Nothing
 * below it is faked: no mocked storage, no mocked component internals.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FiresidePanel from "./FiresidePanel.svelte";

const OPENING = "The page is blank. That's the good part — what did you notice first?";

type Reply = { status?: number; body?: unknown };

/** A `fetch` that answers the paths the panel uses, and records what was asked. */
function stubFetch(replies: Record<string, Reply | Reply[]>) {
	const calls: { path: string; body: unknown }[] = [];
	const queues = new Map<string, Reply[]>();

	const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const path = new URL(String(input), "http://localhost").pathname;
		const queued = queues.get(path) ?? [];
		const scripted = queued.shift() ?? replies[path] ?? { status: 404, body: {} };
		const reply = Array.isArray(scripted) ? (scripted[0] ?? { status: 404 }) : scripted;

		calls.push({
			path,
			body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
		});

		return new Response(JSON.stringify(reply.body ?? {}), {
			status: reply.status ?? 200,
			headers: { "content-type": "application/json" },
		});
	});

	vi.stubGlobal("fetch", fetchMock);

	return {
		calls,
		/** Queue several answers for one path, in order. */
		queue(path: string, ...replies: Reply[]) {
			queues.set(path, replies);
		},
		callsTo(path: string) {
			return calls.filter((call) => call.path === path);
		},
	};
}

beforeEach(() => {
	vi.unstubAllGlobals();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("FiresidePanel", () => {
	describe("happy", () => {
		it("lights a fire on open and shows the opening line", async () => {
			const net = stubFetch({
				"/api/fireside": { body: { sessionId: "session-1", opening: OPENING } },
			});

			render(FiresidePanel, { open: true, mode: "solo", draftPreview: "", hasKey: true });

			await waitFor(() => expect(screen.getByText(OPENING)).toBeTruthy());
			// A fire is a session: POST to light it (with the page's words), then GET so
			// the panel shows what the database holds rather than what it hoped.
			const [started] = net.callsTo("/api/fireside");
			expect(started?.body).toEqual({ draft: "" });
			expect(net.calls.map((call) => call.path)).toEqual([
				"/api/fireside",
				"/api/fireside/session-1",
			]);
		});

		it("sends a turn, keeps the writer's words and appends the reply", async () => {
			const net = stubFetch({
				"/api/fireside": { body: { sessionId: "session-1", opening: OPENING } },
				// The boundary answers the same way every time it is asked: a resume is a
				// read, and a read that changes shape mid-test proves nothing.
				"/api/fireside/session-1": {
					body: {
						messages: [{ id: "m1", role: "wisp", kind: "turn", content: OPENING }],
						canDraft: false,
					},
				},
				"/api/fireside/session-1/turn": { body: { reply: "That's the sentence." } },
			});

			render(FiresidePanel, {
				open: true,
				mode: "solo",
				draftPreview: "the sign says eight",
				hasKey: true,
			});
			await waitFor(() => expect(screen.getByText(OPENING)).toBeTruthy());

			const box = screen.getByLabelText("Message Wisp") as HTMLTextAreaElement;
			await fireEvent.input(box, { target: { value: "The lights stay on." } });
			await waitFor(() =>
				expect((screen.getByLabelText("Send") as HTMLButtonElement).disabled).toBe(false),
			);
			await fireEvent.click(screen.getByLabelText("Send"));

			await waitFor(() =>
				expect(screen.getByRole("log").textContent).toContain("That's the sentence."),
			);
			expect(screen.getByRole("log").textContent).toContain("The lights stay on.");

			// The page's words go with the turn, so `read_draft` can read them.
			const [turn] = net.callsTo("/api/fireside/session-1/turn");
			expect(turn?.body).toEqual({ message: "The lights stay on.", draft: "the sign says eight" });
		});

		it("hands an accepted proposal to the page with its anchors and the opt-in", async () => {
			const net = stubFetch({
				"/api/fireside": { body: { sessionId: "session-1", opening: OPENING } },
			});
			net.queue("/api/fireside/session-1", {
				body: {
					messages: [{ id: "m1", role: "wisp", kind: "turn", content: OPENING }],
					canDraft: true,
				},
			});
			net.queue("/api/fireside/session-1/draft", {
				body: {
					drafted: true,
					proposal: {
						title: "Resonance",
						body: "The sign says eight.\n\nThe lights say otherwise.",
						vines: [{ anchor: "paragraph:2", text: "This is the line the post earns." }],
					},
				},
			});

			const onaccept = vi.fn(async () => {});
			render(FiresidePanel, {
				open: true,
				mode: "solo",
				draftPreview: "",
				hasKey: true,
				onaccept,
			});
			await waitFor(() => expect(screen.getByText(OPENING)).toBeTruthy());

			// `canDraft` arrives with the resumed session, a tick after the opening.
			await waitFor(() => expect(screen.getByText("Shape it into a draft")).toBeTruthy());
			await fireEvent.click(screen.getByText("Shape it into a draft"));
			await waitFor(() => expect(screen.getByText(/Wisp proposed a draft/)).toBeTruthy());

			// A fresh proposal arrives open — the writer is looking at it already.
			await fireEvent.click(screen.getByText("Use this draft"));

			// A blank page has nothing to merge with, so the offer is a single "Use it".
			await fireEvent.click(screen.getByText("Use it"));

			await waitFor(() => expect(onaccept).toHaveBeenCalledTimes(1));
			expect(onaccept).toHaveBeenCalledWith(
				{
					title: "Resonance",
					body: "The sign says eight.\n\nThe lights say otherwise.",
					vines: [{ anchor: "paragraph:2", text: "This is the line the post earns." }],
				},
				"replace",
				false,
				"session-1",
			);
		});
	});

	describe("bad", () => {
		it("says the fire is not switched on here rather than showing an error", async () => {
			stubFetch({ "/api/fireside": { status: 404 } });

			render(FiresidePanel, { open: true, mode: "solo", draftPreview: "", hasKey: true });

			await waitFor(() => expect(screen.getByText(/isn't switched on here yet/)).toBeTruthy());
			expect(screen.queryByText(/Something went wrong/)).toBeNull();
		});

		it("shows the explainer without asking the server when there is no key", async () => {
			const net = stubFetch({});

			render(FiresidePanel, { open: true, mode: "solo", draftPreview: "", hasKey: false });

			expect(screen.getByText(/needs a key before it can listen/)).toBeTruthy();
			expect(screen.getByText("Add your AI key")).toBeTruthy();
			// A door that falls back to "add a key" must not spend the writer's time.
			expect(net.calls).toHaveLength(0);
		});
	});

	describe("sad", () => {
		it("keeps the writer's message when the turn fails, and says so", async () => {
			const net = stubFetch({
				"/api/fireside": { body: { sessionId: "session-1", opening: OPENING } },
			});
			net.queue("/api/fireside/session-1", { body: { messages: [], canDraft: false } });
			net.queue("/api/fireside/session-1/turn", {
				status: 502,
				body: { message: "Wisp could not answer that one. Your message is saved — try again." },
			});

			render(FiresidePanel, { open: true, mode: "solo", draftPreview: "", hasKey: true });
			await waitFor(() => expect(screen.getByText(OPENING)).toBeTruthy());

			const box = screen.getByLabelText("Message Wisp") as HTMLTextAreaElement;
			await fireEvent.input(box, { target: { value: "The lights stay on." } });
			await waitFor(() => expect((box as HTMLTextAreaElement).value).toBe("The lights stay on."));
			await fireEvent.click(screen.getByLabelText("Send"));

			await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
			expect(screen.getByRole("alert").textContent).toMatch(/could not answer|saved/i);
			// They did say it. A failed turn must not erase their words.
			expect(screen.getByText("The lights stay on.")).toBeTruthy();
		});

		it("turns a missing-key refusal into the explainer instead of an error", async () => {
			const net = stubFetch({
				"/api/fireside": { body: { sessionId: "session-1", opening: OPENING } },
			});
			net.queue("/api/fireside/session-1", { body: { messages: [], canDraft: false } });
			net.queue("/api/fireside/session-1/turn", {
				status: 400,
				body: { error: "openrouter_key_missing", message: "No AI key is set." },
			});

			render(FiresidePanel, { open: true, mode: "solo", draftPreview: "", hasKey: true });
			await waitFor(() => expect(screen.getByText(OPENING)).toBeTruthy());

			const box = screen.getByLabelText("Message Wisp") as HTMLTextAreaElement;
			await fireEvent.input(box, { target: { value: "hello" } });
			await waitFor(() => expect((box as HTMLTextAreaElement).value).toBe("hello"));
			await fireEvent.click(screen.getByLabelText("Send"));

			await waitFor(() =>
				expect(screen.getByText(/needs a key before it can listen/)).toBeTruthy(),
			);
		});
	});
});
