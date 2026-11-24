/**
 * The side-by-side page (#1798, slice 4).
 *
 * What matters here is that the two halves are actually different pages and that
 * neither can inject markup through the model's words: the prose is sanitized by
 * the site's renderer, and everything this file writes itself is escaped.
 */

import { describe, expect, it } from "vitest";
import { buildComparisonPage, type NewDay, type OldDay } from "./compare-page";

const OLD: OldDay = {
	brief: "The timeline got some attention.",
	markdown: "### Lattice\n\n- Wired the day fetcher.",
	gutter: [
		{
			anchor: "### Lattice",
			content: "the old prompt put this under the heading",
			type: "comment",
		},
	],
	commitCount: 4,
	voice: "professional",
	model: "anthropic/claude-3.5-haiku",
	cost: 0.012,
};

const NEW: NewDay = {
	status: "done",
	brief: "The day fetcher landed, and a vine can hang from a line.",
	markdown: "### Lattice\n\n- <!-- anchor:l1 -->Wired the day fetcher.",
	gutter: [{ anchor: "anchor:l1", content: "beside the line, not under it", type: "comment" }],
	turns: 6,
	cost: 0.031,
	warnings: [],
	error: null,
};

const PAGE = {
	tenantId: "midnight-bloom",
	date: "2026-11-21",
	githubUsername: "autumn",
	voice: "casual",
};

describe("buildComparisonPage", () => {
	it("shows both pages, each with its own brief", () => {
		const html = buildComparisonPage({ ...PAGE, old: OLD, next: NEW });

		expect(html).toContain("2026-11-21");
		expect(html).toContain("The current path");
		expect(html).toContain("The new path");

		expect(html).toContain("The timeline got some attention.");
		expect(html).toContain("Wired the day fetcher.");

		expect(html).toContain("The day fetcher landed, and a vine can hang from a line.");
	});

	it("places each path's vines the way its own renderer would", () => {
		const html = buildComparisonPage({ ...PAGE, old: OLD, next: NEW });

		// The old path anchors under a heading.
		expect(html).toContain("header-gutter-group");
		expect(html).toContain("the old prompt put this under the heading");

		// The new path anchors beside the line.
		expect(html).toContain("inline-gutter-comment line-vine");
		expect(html).toContain("beside the line, not under it");
	});

	it("says so when the current path stored nothing for the day", () => {
		const html = buildComparisonPage({ ...PAGE, old: null, next: NEW });

		expect(html).toContain("Nothing was stored for this day by the current path");
		expect(html).not.toContain("The timeline got some attention.");
	});

	it("says so when nothing happened at all", () => {
		const html = buildComparisonPage({
			...PAGE,
			old: null,
			next: { ...NEW, status: "empty", brief: null, markdown: "", gutter: [], turns: 0 },
		});

		expect(html).toContain("Nothing happened on any repo that day");
	});

	it("shows a run that did not finish, with its warnings", () => {
		const html = buildComparisonPage({
			...PAGE,
			old: OLD,
			next: {
				...NEW,
				status: "failed",
				error: "the model never answered",
				warnings: ["could not open the run's record: the database is down"],
			},
		});

		expect(html).toContain("failed");
		expect(html).toContain("the model never answered");
		expect(html).toContain("could not open the run&#39;s record");
	});

	it("escapes the model's words wherever this page writes them", () => {
		const html = buildComparisonPage({
			...PAGE,
			old: OLD,
			next: { ...NEW, brief: "<script>alert(1)</script>" },
		});

		expect(html).not.toContain("<script>alert(1)</script>");
		expect(html).toContain("&lt;script&gt;");
	});

	it("reports what each side cost", () => {
		const html = buildComparisonPage({ ...PAGE, old: OLD, next: NEW });

		expect(html).toContain("$0.0120");
		expect(html).toContain("$0.0310");
		expect(html).toContain("casual voice");
	});
});
