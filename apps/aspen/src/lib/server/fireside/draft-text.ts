/**
 * Reading a draft the way the editor numbers it.
 *
 * Two jobs, both of which have to agree with something outside this file:
 *
 * 1. **The window the model reads.** Fireside gets the first ~400 words, not the
 *    whole post: a conversation about the *start* of a piece is what the feature
 *    is for, and handing over 4,000 words makes the model summarize instead of
 *    listen. The note about the rest is what turns "I can't see it" into "ask
 *    about a section".
 *
 * 2. **`paragraph:N` anchors for vines.** The editor counts anchors from the
 *    *rendered* preview, `:scope > p` over the markdown's output — direct-child
 *    paragraphs only, so a paragraph inside a blockquote or a list is not one of
 *    the numbered paragraphs. This file reproduces that count from the markdown
 *    source without a parser, and the rules below are the ones that decide it.
 *    Anything it is unsure about is treated as *not a paragraph*, because a vine
 *    that lands on the wrong paragraph is worse than a vine the tool refuses.
 */

/** The continuity line, said only when the draft was longer than the window. */
export const DRAFT_CONTINUES =
	"… the post continues from here; ask the writer about a section you cannot see.";

export const DEFAULT_DRAFT_WORDS = 400;

/** Block starts that do not render as a top-level `<p>`. */
const NOT_A_PARAGRAPH =
	/^(?:#{1,6}\s|>|[-*+]\s|\d+[.)]\s|\||```|~~~|<!--|<|(?:---+|\*\*\*+|___+)\s*$)/;

/**
 * The markdown's top-level paragraphs, in the order the editor numbers them.
 *
 * A paragraph is a run of lines separated from its neighbours by a blank line,
 * whose first line does not start a different block. Fenced code is skipped
 * whole, including its closing fence, so a `# comment` inside a code block does
 * not become a heading and shift every anchor after it.
 */
export function topLevelParagraphs(markdown: string): string[] {
	const paragraphs: string[] = [];
	const lines = markdown.replace(/\r\n?/g, "\n").split("\n");

	let block: string[] = [];
	let fence: string | null = null;

	const flush = () => {
		if (block.length === 0) return;
		const first = block[0] ?? "";
		if (!NOT_A_PARAGRAPH.test(first.trim()) && !/^\s{4,}/.test(first)) {
			paragraphs.push(block.join(" ").replace(/\s+/g, " ").trim());
		}
		block = [];
	};

	for (const line of lines) {
		const trimmed = line.trim();

		if (fence !== null) {
			if (trimmed.startsWith(fence)) fence = null;
			continue;
		}
		if (/^(?:```|~~~)/.test(trimmed)) {
			flush();
			fence = trimmed.slice(0, 3);
			continue;
		}
		if (trimmed === "") {
			flush();
			continue;
		}
		block.push(trimmed);
	}
	flush();

	return paragraphs;
}

/** Whitespace-insensitive form: a quote copied across a line break still matches. */
export function normalise(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}

export interface ParagraphMatch {
	/** 1-indexed, matching the editor's `:scope > p` count. */
	anchor: string;
	/** The paragraph the quote was found in, for the tool's answer to the model. */
	paragraph: string;
}

/**
 * The paragraph a quote belongs to, or nothing.
 *
 * The quote is matched on its own text after whitespace normalisation, so the
 * model may quote one sentence out of a long paragraph — which is what it will
 * naturally do — and still land on the right anchor.
 */
export function findParagraph(
	paragraphs: readonly string[],
	quote: string,
): ParagraphMatch | undefined {
	const needle = normalise(quote);
	if (needle === "") return undefined;

	for (const [index, paragraph] of paragraphs.entries()) {
		if (normalise(paragraph).includes(needle)) {
			return { anchor: `paragraph:${index + 1}`, paragraph };
		}
	}
	return undefined;
}

export interface DraftWindow {
	text: string;
	wordCount: number;
	truncated: boolean;
}

/** The first `maxWords` words, plus the note about the rest when there is a rest. */
export function readDraftWindow(markdown: string, maxWords = DEFAULT_DRAFT_WORDS): DraftWindow {
	const words = markdown.trim().split(/\s+/).filter(Boolean);
	if (words.length <= maxWords) {
		return { text: markdown.trim(), wordCount: words.length, truncated: false };
	}
	const head = words.slice(0, maxWords).join(" ");
	return { text: `${head}\n\n${DRAFT_CONTINUES}`, wordCount: words.length, truncated: true };
}

export interface ResolvedVine {
	/** `paragraph:N`, resolved here — the model never types an anchor. */
	anchor: string;
	text: string;
}

export type VineResolution = { ok: true; vines: ResolvedVine[] } | { ok: false; message: string };

/**
 * Turn the model's `{ quote, text }` vines into anchored ones, or refuse.
 *
 * A refusal names what is actually in the draft, because that is what lets the
 * model correct itself inside the loop rather than guessing again.
 */
export function resolveVines(
	body: string,
	vines: readonly { quote: string; text: string }[],
): VineResolution {
	if (vines.length === 0) return { ok: true, vines: [] };

	const paragraphs = topLevelParagraphs(body);
	if (paragraphs.length === 0) {
		return {
			ok: false,
			message:
				"this draft has no paragraphs to anchor a vine to; write the body as prose paragraphs first",
		};
	}

	const resolved: ResolvedVine[] = [];
	for (const vine of vines) {
		const match = findParagraph(paragraphs, vine.quote);
		if (match === undefined) {
			const openers = paragraphs
				.slice(0, 3)
				.map(
					(paragraph, index) => `paragraph ${index + 1}: "${normalise(paragraph).slice(0, 60)}…"`,
				)
				.join("; ");
			return {
				ok: false,
				message: `"${normalise(vine.quote).slice(0, 80)}" is not in the draft you proposed. Quote a sentence that is. The draft opens with ${openers}`,
			};
		}
		resolved.push({ anchor: match.anchor, text: vine.text });
	}

	return { ok: true, vines: resolved };
}
