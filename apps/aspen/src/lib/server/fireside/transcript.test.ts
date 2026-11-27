/**
 * The reader's half of Fireside.
 *
 * Three rules, each one a way the transcript could quietly lie:
 *
 * - a proposal must never be printed as JSON (the row is a payload, not prose)
 * - a proposal must never be reprinted as a draft (the accepted one is the post)
 * - the writer's own words must survive exactly as typed, whitespace and all
 */

import { describe, expect, it } from "vitest";
import {
	buildTranscript,
	readProposal,
	transcriptTextForModeration,
	wordCount,
} from "./transcript";
import type { FiresideMessageRow } from "./session";

function message(
	role: "user" | "wisp",
	kind: "turn" | "draft",
	content: string,
	seq: number,
): FiresideMessageRow {
	return {
		id: `m-${seq}`,
		session_id: "s-1",
		role,
		kind,
		content,
		seq,
		created_at: 1_700_000_000 + seq,
	};
}

const PROPOSAL = JSON.stringify({
	title: "The sign says eight",
	body: "One two three four five. Six seven eight.",
	vines: [],
});

describe("buildTranscript", () => {
	it("keeps both sides, in order, verbatim", () => {
		const entries = buildTranscript(
			[
				message("wisp", "turn", "What did you notice first?", 1),
				message("user", "turn", "  The sign said eight.\n\nNobody believed it.  ", 2),
				message("wisp", "turn", "Say more about the sign.", 3),
			],
			{ accepted: false },
		);

		expect(entries).toEqual([
			{ role: "wisp", kind: "turn", content: "What did you notice first?" },
			{ role: "user", kind: "turn", content: "The sign said eight.\n\nNobody believed it." },
			{ role: "wisp", kind: "turn", content: "Say more about the sign." },
		]);
	});

	it("counts a proposal instead of reprinting it", () => {
		const entries = buildTranscript(
			[
				message("user", "turn", "Eight comes before nine.", 1),
				message("wisp", "draft", PROPOSAL, 2),
			],
			{ accepted: false },
		);

		expect(entries[1]).toEqual({
			role: "wisp",
			kind: "draft",
			title: "The sign says eight",
			words: 8,
			accepted: false,
		});
		expect(JSON.stringify(entries)).not.toContain("vines");
	});

	it("says the last proposal became the post, once", () => {
		const entries = buildTranscript(
			[message("wisp", "draft", PROPOSAL, 1), message("wisp", "draft", PROPOSAL, 2)],
			{ accepted: true },
		);

		expect(entries.map((entry) => entry.kind === "draft" && entry.accepted)).toEqual([false, true]);
	});

	it("never claims an acceptance on an unaccepted session", () => {
		const entries = buildTranscript([message("wisp", "draft", PROPOSAL, 1)], { accepted: false });

		expect(entries[0]?.kind === "draft" && entries[0].accepted).toBe(false);
	});

	it("describes an unreadable proposal without leaking the row", () => {
		const entries = buildTranscript([message("wisp", "draft", "{not json", 1)], {
			accepted: false,
		});

		expect(entries[0]).toEqual({
			role: "wisp",
			kind: "draft",
			title: "a draft",
			words: 0,
			accepted: false,
		});
	});

	it("drops empty messages rather than rendering blank paragraphs", () => {
		const entries = buildTranscript(
			[message("user", "turn", "   ", 1), message("user", "turn", "Real words.", 2)],
			{ accepted: false },
		);

		expect(entries).toHaveLength(1);
	});
});

describe("readProposal", () => {
	it("falls back to a plain name when the title is blank", () => {
		expect(readProposal(JSON.stringify({ title: "  ", body: "Words." }))).toEqual({
			title: "a draft",
			words: 1,
		});
	});

	it("counts zero words when there is no body", () => {
		expect(readProposal(JSON.stringify({ title: "A title" })).words).toBe(0);
	});
});

describe("wordCount", () => {
	it("counts whitespace-separated runs, ignoring padding", () => {
		expect(wordCount("  one\ntwo\tthree  ")).toBe(3);
		expect(wordCount("")).toBe(0);
	});
});

describe("transcriptTextForModeration", () => {
	it("sends the proposal's words, not its payload", () => {
		const text = transcriptTextForModeration([
			message("user", "turn", "Here is what happened.", 1),
			message("wisp", "draft", PROPOSAL, 2),
		]);

		expect(text).toContain("Here is what happened.");
		expect(text).toContain("The sign says eight");
		expect(text).toContain("Six seven eight.");
		expect(text).not.toContain("{");
	});

	it("skips a payload it cannot read instead of moderating raw JSON", () => {
		expect(transcriptTextForModeration([message("wisp", "draft", "{not json", 1)])).toBe("");
	});
});
