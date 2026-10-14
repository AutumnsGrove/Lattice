/**
 * Finds the gallery directive under the cursor, so the editor can reopen it in
 * the gallery builder instead of making someone edit directive syntax by hand.
 *
 * Understands both forms the renderer does: the multi-line block
 * (`::gallery` ... `::`) and the older single-line `::gallery[url, url]::`.
 * A block with no closing `::` is not a gallery (the renderer ignores it too),
 * so it is not found here either.
 */

import {
	parseGalleryLines,
	parseGalleryUrls,
	type GalleryItem,
} from "@autumnsgrove/grove-markdown/directives";

export interface GalleryBlockRange {
	/** Offset of the first character of the directive. */
	from: number;
	/** Offset just past the last character of the directive (before any newline). */
	to: number;
	items: GalleryItem[];
}

const SINGLE_LINE_RE = /^::gallery\[(.*)\]::$/i;
const OPEN_RE = /^::gallery$/i;
const CLOSE_RE = /^::$/;

/** The gallery directive the cursor sits in or touches, or null if there isn't one. */
export function findGalleryBlock(text: string, cursor: number): GalleryBlockRange | null {
	const lines: { text: string; start: number }[] = [];
	let start = 0;
	for (const line of text.split("\n")) {
		lines.push({ text: line, start });
		start += line.length + 1;
	}

	const at = lines.findIndex((l) => cursor >= l.start && cursor <= l.start + l.text.length);
	if (at === -1) return null;

	// Where a line's directive text starts and ends, ignoring indentation
	const bounds = (index: number) => {
		const line = lines[index];
		return {
			from: line.start + (line.text.length - line.text.trimStart().length),
			to: line.start + line.text.trimEnd().length,
		};
	};

	const single = SINGLE_LINE_RE.exec(lines[at].text.trim());
	if (single) {
		return { ...bounds(at), items: parseGalleryUrls(single[1]) };
	}

	// Block form: walk up to the opening fence, then down to the closing one
	let open = -1;
	for (let i = at; i >= 0; i--) {
		const trimmed = lines[i].text.trim();
		if (OPEN_RE.test(trimmed)) {
			open = i;
			break;
		}
		// A closing fence above us belongs to a block we're not inside
		if (i !== at && CLOSE_RE.test(trimmed)) return null;
	}
	if (open === -1) return null;

	let close = -1;
	for (let j = open + 1; j < lines.length; j++) {
		const trimmed = lines[j].text.trim();
		if (CLOSE_RE.test(trimmed)) {
			close = j;
			break;
		}
		if (OPEN_RE.test(trimmed)) return null;
	}
	if (close === -1 || close < at) return null;

	return {
		from: bounds(open).from,
		to: bounds(close).to,
		items: parseGalleryLines(lines.slice(open + 1, close).map((l) => l.text)),
	};
}
