import { describe, expect, it } from "vitest";
import { renderTimelineHtml, type TimelineVine } from "./render";

const day = [
	"### midnight-bloom",
	"- added the vine marker <!-- anchor:l1 -->",
	"- wired the timeline renderer <!-- anchor:l2 -->",
].join("\n");

function vine(anchor: string, content: string): TimelineVine {
	return { anchor, content };
}

describe("renderTimelineHtml", () => {
	it("returns nothing for an empty day", () => {
		expect(renderTimelineHtml({ markdown: "" })).toBe("");
	});

	it("renders a day with no vines", () => {
		const html = renderTimelineHtml({ markdown: "### midnight-bloom\n- one commit" });

		expect(html).toContain("midnight-bloom");
		expect(html).toContain("one commit");
		expect(html).not.toContain("inline-gutter-comment");
	});
});

describe("line anchors", () => {
	it("places a vine after the line it is anchored to", () => {
		const html = renderTimelineHtml({
			markdown: day,
			gutterItems: [vine("anchor:l2", "this one")],
		});

		const marker = html.indexOf('data-anchor="l2"');
		const firstVine = html.indexOf("this one");

		expect(marker).toBeGreaterThan(-1);
		expect(firstVine).toBeGreaterThan(marker);
		// The vine for l2 must not have drifted up to l1.
		expect(firstVine).toBeGreaterThan(html.indexOf('data-anchor="l1"'));
	});

	it("keeps one vine per line, in page order", () => {
		const html = renderTimelineHtml({
			markdown: day,
			gutterItems: [vine("anchor:l1", "first note"), vine("anchor:l2", "second note")],
		});

		expect(html.indexOf("first note")).toBeGreaterThan(html.indexOf('data-anchor="l1"'));
		expect(html.indexOf("first note")).toBeLessThan(html.indexOf('data-anchor="l2"'));
		expect(html.indexOf("second note")).toBeGreaterThan(html.indexOf('data-anchor="l2"'));
	});

	it("gives every vine on the same line a home", () => {
		const html = renderTimelineHtml({
			markdown: day,
			gutterItems: [vine("anchor:l1", "one"), vine("anchor:l1", "two")],
		});

		expect(html).toContain("one");
		expect(html).toContain("two");
		expect(html.match(/class="inline-gutter-comment line-vine"/g)?.length).toBe(2);
	});

	it("puts the note under the line's words when the marker comes first", () => {
		// The recipe writes the marker at the start of the text, so inserting the
		// note beside the marker would put it in front of the sentence it comments
		// on. It belongs at the end of the bullet (#1826).
		const html = renderTimelineHtml({
			markdown: "### repo\n- <!-- anchor:l1 -->Wrote the day.",
			gutterItems: [vine("anchor:l1", "finally")],
		});

		const words = html.indexOf("Wrote the day");
		const note = html.indexOf("finally");
		const itemEnd = html.indexOf("</li>", note);

		expect(words).toBeGreaterThan(-1);
		expect(note).toBeGreaterThan(words);
		expect(itemEnd).toBeGreaterThan(note);
	});

	it("gives a line's notes one block, stacked, in page order", () => {
		const html = renderTimelineHtml({
			markdown: day,
			gutterItems: [vine("anchor:l1", "first note"), vine("anchor:l1", "second note")],
		});

		// One wrapper per line, so two notes cannot sit side by side and lose which
		// line they belong to.
		expect(html.match(/class="line-vine-block"/g)?.length).toBe(1);
		expect(html.indexOf("first note")).toBeLessThan(html.indexOf("second note"));
	});

	it("does not float the note beside the line", () => {
		const html = renderTimelineHtml({ markdown: day, gutterItems: [vine("anchor:l2", "a note")] });

		// The block wrapper is what makes it a row of its own; a bare inline span
		// would go back to sitting against the words.
		expect(html).toContain('class="line-vine-block"');
		expect(html).toContain("line-vine");
	});

	it("drops a vine whose marker is not in the day", () => {
		const html = renderTimelineHtml({
			markdown: day,
			gutterItems: [vine("anchor:l9", "ghost note")],
		});

		expect(html).not.toContain("ghost note");
		// It must not fall back to a project heading either.
		expect(html).not.toContain("header-gutter-group");
	});

	it("leaves a marker with no vine invisible", () => {
		const html = renderTimelineHtml({ markdown: day });

		expect(html).toContain("anchor-marker");
		expect(html).not.toContain("inline-gutter-comment");
	});
});

describe("heading anchors, for stored days", () => {
	it("places a plain heading vine under its project", () => {
		const html = renderTimelineHtml({
			markdown: day,
			gutterItems: [vine("### midnight-bloom", "a whole-project note")],
		});

		expect(html).toContain("header-gutter-group");
		expect(html.indexOf("a whole-project note")).toBeGreaterThan(html.indexOf("<h3>"));
	});

	it("finds the heading once the repo name has been linked", () => {
		const html = renderTimelineHtml({
			markdown: day,
			githubUsername: "autumn",
			gutterItems: [vine("### midnight-bloom", "linked note")],
		});

		expect(html).toContain("https://github.com/autumn/midnight-bloom");
		expect(html).toContain("header-gutter-group");
		expect(html).toContain("linked note");
	});

	it("drops a heading vine for a project that is not in the day", () => {
		const html = renderTimelineHtml({
			markdown: day,
			gutterItems: [vine("### other-project", "stray note")],
		});

		expect(html).not.toContain("stray note");
	});
});

describe("safety", () => {
	it("never renders the anchor comment as visible text", () => {
		const html = renderTimelineHtml({ markdown: day });

		expect(html).not.toContain("<!--");
		expect(html).not.toContain("anchor:l1");
	});

	it("strips scripts that arrive in the stored markdown", () => {
		const html = renderTimelineHtml({
			markdown: "### repo\n- one <script>alert(1)</script>",
		});

		expect(html).not.toContain("<script");
		expect(html).not.toContain("alert(1)");
	});

	it("escapes vine content instead of rendering its html", () => {
		const html = renderTimelineHtml({
			markdown: day,
			gutterItems: [vine("anchor:l1", '<img src=x onerror="alert(1)">')],
		});

		expect(html).not.toContain("<img");
		expect(html).toContain("&lt;img");
	});
});
