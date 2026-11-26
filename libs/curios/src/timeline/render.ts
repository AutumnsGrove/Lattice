/**
 * Timeline Markdown Rendering
 *
 * Turns a stored day into HTML, with its vines (gutter comments) placed by
 * anchor. Two anchor kinds are understood, both through `parseAnchor`:
 *
 * - `### ProjectName` — the legacy anchor. The vine renders in a group directly
 *   under that `<h3>`. Stored days use only this one, so it keeps working.
 * - `anchor:l3` — a line anchor. The markdown carries a `<!-- anchor:l3 -->`
 *   marker, which the renderer turns into a zero-width span; the vine becomes
 *   its own indented row under the bullet that holds the marker. It is not
 *   floated beside the line: a timeline bullet is a short `<li>`, so a floated
 *   note had nothing to push against and read as if the sentence continued
 *   into it (#1826). The block goes at the end of the list item, because the
 *   marker is written at the start of the line's own words.
 *
 * A marker with no matching vine renders as nothing (it is a zero-width span),
 * and a vine whose marker is missing is dropped rather than moved to a heading,
 * so a stale anchor can never appear under the wrong project.
 *
 * SECURITY: this module renders model output, so it enables `html` on its
 * markdown-it instance. Everything it returns has been through
 * `sanitizeMarkdown`, which allows a fixed tag list — the same boundary
 * `@autumnsgrove/grove-markdown` documents for the site's posts.
 */

import MarkdownIt from "markdown-it";
import {
	escapeHtml,
	parseAnchor,
	processAnchorTags,
	sanitizeMarkdown,
} from "@autumnsgrove/lattice/utils";

export interface TimelineVine {
	anchor: string;
	content: string;
	type?: string;
}

export interface RenderTimelineOptions {
	/** The day's stored markdown (`timeline_summaries.detailed_timeline`). */
	markdown: string;
	/** The day's vines (`timeline_summaries.gutter_content`). */
	gutterItems?: TimelineVine[];
	/** Turns `### repo` into a link to that repo, when known. */
	githubUsername?: string;
}

// Local instance: the timeline wants `breaks: true`, and `html` has to stay on
// for the anchor markers to survive rendering (see the module doc).
const timelineMd = new MarkdownIt({ html: true, linkify: true, breaks: true });

const VINE_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';

/** The zero-width span `processAnchorTags` emits for `<!-- anchor:name -->`. */
function markerHtml(name: string): string {
	return `<span class="anchor-marker" data-anchor="${escapeHtml(name)}"></span>`;
}

function vineHtml(item: TimelineVine, extraClass = ""): string {
	const className = extraClass ? `inline-gutter-comment ${extraClass}` : "inline-gutter-comment";
	return `<span class="${className}">${VINE_ICON}<span>${escapeHtml(item.content)}</span></span>`;
}

function groupVines(items: TimelineVine[], extraClass = ""): string {
	return items.map((item) => vineHtml(item, extraClass)).join("");
}

/**
 * A line's vines as one row under the line.
 *
 * One wrapper for the whole line, so two notes on the same line stack instead
 * of sitting side by side and losing which line they belong to.
 */
function lineVineBlock(items: TimelineVine[]): string {
	return `<div class="line-vine-block">${groupVines(items, "line-vine")}</div>`;
}

/** Group vines by their exact anchor string, preserving first-seen order. */
function groupByAnchor(items: TimelineVine[]): Map<string, TimelineVine[]> {
	const grouped = new Map<string, TimelineVine[]>();
	for (const item of items) {
		const anchor = item.anchor?.trim() || "General";
		const existing = grouped.get(anchor);
		if (existing) {
			existing.push(item);
		} else {
			grouped.set(anchor, [item]);
		}
	}
	return grouped;
}

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Place a group under an `### ProjectName` heading, linked or plain.
 * Returns the html unchanged when no such heading exists.
 */
function placeOnHeading(html: string, anchor: string, vines: string): string {
	const headerName = anchor.replace(/^#+\s*/, "").trim();
	const name = escapeRegex(headerName);

	const linkPattern = new RegExp(`(<h3>\\s*<a[^>]*>\\s*${name}\\s*</a>\\s*</h3>)`, "i");
	const plainPattern = new RegExp(`(<h3>\\s*${name}\\s*</h3>)`, "i");

	if (linkPattern.test(html)) {
		return html.replace(linkPattern, `$1\n<div class="header-gutter-group">${vines}</div>`);
	}
	if (plainPattern.test(html)) {
		return html.replace(plainPattern, `$1\n<div class="header-gutter-group">${vines}</div>`);
	}
	return html;
}

/**
 * Where a line's vines go: the end of the list item that holds the marker.
 *
 * The marker sits at the start of the line's own words, so inserting beside it
 * would put the note in front of the sentence it comments on. The item's end is
 * the first of these after the marker — whichever comes first:
 *
 * - `</li>` — the item itself closes.
 * - `<ul` / `<ol` — a nested list starts, and the note belongs to the parent
 *   line, above its sub-bullets rather than after them.
 *
 * `null` means the marker is not inside a list item at all (a paragraph, in a
 * day written before the bullet format). The note then goes after that
 * paragraph: a block element inside a `<p>` would break the paragraph in the
 * browser, and the note would land in the middle of its own sentence.
 *
 * Only looking for the next `</li>` is not enough: a paragraph marker followed
 * by any list would attach its note to whichever bullet came next, and a parent
 * with a nested list would attach it to the child's `</li>`.
 */
function endOfListItem(html: string, from: number): number | null {
	const openItem = html.lastIndexOf("<li", from);
	const closedItem = html.lastIndexOf("</li>", from);

	// Not inside an item: no item opened, or the last one had already closed.
	if (openItem === -1 || openItem < closedItem) {
		return null;
	}

	const candidates = ["</li>", "<ul", "<ol"]
		.map((closer) => html.indexOf(closer, from))
		.filter((at) => at !== -1);

	return candidates.length === 0 ? null : Math.min(...candidates);
}

/**
 * Place a group at the end of the list item that holds the marker, so the vine
 * sits under the line's own words rather than in front of them.
 *
 * Returns the html unchanged when the marker is absent.
 */
function placeOnMarker(html: string, name: string, vines: string): string {
	const marker = markerHtml(name);
	const index = html.indexOf(marker);
	if (index === -1) {
		return html;
	}

	const paragraphEnd = html.indexOf("</p>", index);
	const at =
		endOfListItem(html, index) ??
		(paragraphEnd === -1 ? index + marker.length : paragraphEnd + "</p>".length);

	return `${html.slice(0, at)}${vines}${html.slice(at)}`;
}

/**
 * Render a day's markdown with its vines in place.
 */
export function renderTimelineHtml({
	markdown,
	gutterItems = [],
	githubUsername = "",
}: RenderTimelineOptions): string {
	if (!markdown) {
		return "";
	}

	// `### RepoName` becomes a link to that repo, when we know the owner.
	let withRepoLinks = markdown;
	if (githubUsername) {
		withRepoLinks = markdown.replace(/^### (?!\[)(.+)$/gm, (match, repoName) => {
			const cleanName = repoName.trim();
			return `### [${cleanName}](https://github.com/${githubUsername}/${cleanName})`;
		});
	}

	let html = sanitizeMarkdown(processAnchorTags(timelineMd.render(withRepoLinks)));

	for (const [anchor, items] of groupByAnchor(gutterItems)) {
		const parsed = parseAnchor(anchor);

		if (parsed.type === "tag") {
			html = placeOnMarker(html, String(parsed.value), lineVineBlock(items));
		} else {
			// Header anchors, and the unknown-format strings parseAnchor treats as
			// headers for backwards compatibility.
			html = placeOnHeading(html, anchor, groupVines(items));
		}
	}

	return html;
}
