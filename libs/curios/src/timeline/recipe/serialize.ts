/**
 * The page as the timeline stores it (#1798, slice 2).
 *
 * Two things are written here from one value, and that is the whole point of the
 * serializer existing: `add_line` mints `l1`, `add_vine` takes `l1`, and neither the
 * model nor a prompt ever types an anchor. The markdown carries
 * `<!-- anchor:l1 -->` at the start of the line's text, and the gutter carries
 * `anchor:l1`, which is the shape `libs/curios/src/timeline/render.ts` places a
 * vine by (see #1687, landed in #1802).
 *
 * Continuation is returned as data rather than written into the page: the stored
 * day has columns for it (`continuation_of`), and pages written before this change
 * never carried the sentence, so putting it in the markdown would invent a new
 * element in the middle of a comparison.
 */

import type { GutterComment } from "../voices/types";
import { coveredHandles, type TimelinePage, type TimelineState } from "./state";

export interface SerializedPage {
	/** The day's markdown, in the shape `timeline_summaries.detailed_timeline` holds. */
	markdown: string;
	/** The vines, in the shape `timeline_summaries.gutter_content` holds. */
	gutter: GutterComment[];
	/** The day this one continues, for the summary row. */
	continuation: { day: string; text: string } | null;
}

/** The marker the renderer turns into a zero-width span. */
export function lineAnchor(lineId: string): string {
	return `anchor:${lineId}`;
}

/**
 * The page and what is still uncovered, which is what the model is told after the
 * run compacts (decision 40). It reads the rebuilt state rather than a summary, so
 * what the model sees is exact.
 */
export function describeState(state: TimelineState): string {
	const { markdown } = serializePage(state.page);
	const covered = coveredHandles(state);
	const missing = state.handles.all().filter((handle) => !covered.has(handle));
	const lines = [markdown.trim() === "" ? "(the page is empty)" : markdown];
	if (missing.length > 0) {
		lines.push("", `Not covered yet: ${missing.join(", ")}`);
	} else {
		lines.push("", "Every handle on the day is covered.");
	}
	return lines.join("\n");
}

export function serializePage(page: TimelinePage): SerializedPage {
	const sections: string[] = [];

	for (const project of page.projects) {
		// A project with nothing to say is a heading with no content: noise, not a page.
		if (project.lines.length === 0) continue;
		const lines = project.lines.map((line) => `- <!-- ${lineAnchor(line.id)} -->${line.text}`);
		sections.push([`### ${project.repo}`, "", ...lines].join("\n"));
	}

	return {
		markdown: sections.join("\n\n"),
		gutter: page.vines.map((vine) => ({
			anchor: lineAnchor(vine.line),
			type: "comment",
			content: vine.text,
		})),
		continuation: page.continuation,
	};
}
