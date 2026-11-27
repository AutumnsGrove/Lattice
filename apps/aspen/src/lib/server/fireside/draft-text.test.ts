/**
 * The paragraph rule, which is the only thing in Fireside that can silently land
 * a note in the wrong place.
 *
 * The editor numbers anchors from the rendered preview: `:scope > p` over the
 * markdown's output, so a paragraph inside a blockquote or a list is not one of
 * the numbered paragraphs. These tests pin the same behaviour here, because a vine
 * on paragraph:3 that the editor calls paragraph:4 is a note about the wrong
 * sentence — and nobody would see it until a post was published.
 */

import { describe, expect, it } from "vitest";
import {
	DRAFT_CONTINUES,
	findParagraph,
	readDraftWindow,
	resolveVines,
	topLevelParagraphs,
} from "./draft-text";

describe("topLevelParagraphs", () => {
	it("counts blank-line separated prose, in order", () => {
		const markdown = ["First paragraph.", "", "Second paragraph.", "", "Third."].join("\n");
		expect(topLevelParagraphs(markdown)).toEqual([
			"First paragraph.",
			"Second paragraph.",
			"Third.",
		]);
	});

	it("joins a paragraph's wrapped lines into one", () => {
		expect(topLevelParagraphs("A line\nand its continuation.\n\nNext.")).toEqual([
			"A line and its continuation.",
			"Next.",
		]);
	});

	it("does not count headings, lists, quotes, code, tables or rules", () => {
		const markdown = [
			"# A heading",
			"",
			"Prose one.",
			"",
			"- a list item",
			"- another",
			"",
			"> a quotation",
			"",
			"```js",
			"const notAHeading = 1;",
			"# nor this",
			"```",
			"",
			"| a | table |",
			"| - | ----- |",
			"",
			"---",
			"",
			"Prose two.",
		].join("\n");

		expect(topLevelParagraphs(markdown)).toEqual(["Prose one.", "Prose two."]);
	});

	it("keeps a code block's # lines from becoming headings", () => {
		// A fence that is never closed must not swallow the rest of the document.
		expect(topLevelParagraphs("```\n# not a heading\n```\n\nAfter.")).toEqual(["After."]);
	});
});

describe("findParagraph", () => {
	const paragraphs = topLevelParagraphs(
		[
			"The sign says eight.",
			"",
			"I have been the last one in the room more times than I can count.",
			"",
			"So I stay.",
		].join("\n\n"),
	);

	it("resolves a quote to its 1-indexed paragraph anchor", () => {
		expect(findParagraph(paragraphs, "The sign says eight.")?.anchor).toBe("paragraph:1");
		expect(findParagraph(paragraphs, "more times than I can count")?.anchor).toBe("paragraph:2");
	});

	it("matches across a line break, because the model re-wraps what it wrote", () => {
		expect(findParagraph(paragraphs, "the last one\nin the room")?.anchor).toBe("paragraph:2");
	});

	it("returns nothing for a quote that is not there", () => {
		expect(findParagraph(paragraphs, "the tea shop never closes")).toBeUndefined();
	});
});

describe("resolveVines", () => {
	it("anchors every quote and keeps the text", () => {
		const resolution = resolveVines("One.\n\nTwo, with the line.\n\nThree.", [
			{ quote: "the line", text: "this is the sentence the post earns" },
		]);
		expect(resolution).toEqual({
			ok: true,
			vines: [{ anchor: "paragraph:2", text: "this is the sentence the post earns" }],
		});
	});

	it("refuses a quote that is not in the body, and names what is", () => {
		const resolution = resolveVines("One.\n\nTwo.", [{ quote: "not here", text: "note" }]);
		expect(resolution.ok).toBe(false);
		if (resolution.ok) return;
		expect(resolution.message).toContain("is not in the draft you proposed");
		expect(resolution.message).toContain("paragraph 1");
	});

	it("refuses when there is no prose to anchor to", () => {
		const resolution = resolveVines("# Only a heading", [{ quote: "heading", text: "note" }]);
		expect(resolution.ok).toBe(false);
	});

	it("accepts a proposal with no vines", () => {
		expect(resolveVines("One.", [])).toEqual({ ok: true, vines: [] });
	});
});

describe("readDraftWindow", () => {
	it("returns a short draft whole", () => {
		const window = readDraftWindow("A short draft.", 10);
		expect(window.truncated).toBe(false);
		expect(window.text).toBe("A short draft.");
	});

	it("cuts a long draft and says the rest is there", () => {
		const words = Array.from({ length: 40 }, (_, i) => `w${i}`).join(" ");
		const window = readDraftWindow(words, 10);
		expect(window.truncated).toBe(true);
		expect(window.wordCount).toBe(40);
		expect(window.text).toContain(DRAFT_CONTINUES);
		expect(window.text.startsWith("w0 w1")).toBe(true);
		expect(window.text).not.toContain("w10");
	});
});
