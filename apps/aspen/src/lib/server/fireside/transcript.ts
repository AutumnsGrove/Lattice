/**
 * The conversation, as a reader sees it.
 *
 * The spec is strict about three things here, and all three are about honesty
 * rather than presentation:
 *
 * 1. **Both sides, verbatim.** The writer's own words are the proof that the fire
 *    did not write them. Nothing is trimmed, summarized, or relabelled.
 * 2. **Proposals are counted, not reprinted.** The accepted draft *is* the post
 *    above; printing it again would double the page and, worse, would let a
 *    proposal that was never accepted look like the article.
 * 3. **The acceptance is stated once**, under the proposal that became the post.
 *
 * The stored shape of a proposal is its JSON payload (`{ title, body, vines }`),
 * written by `POST /draft` so a resume can show it without re-running the model.
 * A reader must never be shown that JSON, which is why every draft message goes
 * through `readProposal` and comes out as a sentence — including one written by an
 * older shape, which falls back to "a draft" rather than leaking the raw row.
 */

import type { FiresideMessageRow } from "./session";

export type TranscriptEntry =
	| { role: "user"; kind: "turn"; content: string }
	| { role: "wisp"; kind: "turn"; content: string }
	| { role: "wisp"; kind: "draft"; title: string; words: number; accepted: boolean };

/**
 * Build what the post page renders.
 *
 * `accepted` is the session's status, not the message's: the schema records that a
 * session was accepted and links it to a post, but not *which* proposal was taken,
 * so the last one is the answer. The panel only ever offers the latest proposal,
 * and a note claiming the wrong paragraph would be worse than the note.
 */
export function buildTranscript(
	messages: readonly FiresideMessageRow[],
	options: { accepted: boolean },
): TranscriptEntry[] {
	const entries: TranscriptEntry[] = [];
	let lastDraft = -1;

	for (const message of messages) {
		const content = message.content.trim();
		if (content === "") continue;

		if (message.kind === "draft") {
			const proposal = readProposal(content);
			lastDraft = entries.length;
			entries.push({
				role: "wisp",
				kind: "draft",
				title: proposal.title,
				words: proposal.words,
				accepted: false,
			});
			continue;
		}

		entries.push({ role: message.role, kind: "turn", content });
	}

	// The writer took the most recent proposal and it became the post above.
	if (options.accepted && lastDraft >= 0) {
		const entry = entries[lastDraft];
		if (entry?.kind === "draft") entry.accepted = true;
	}

	return entries;
}

/** The one line a reader sees for a proposal, and its size. */
export function readProposal(content: string): { title: string; words: number } {
	try {
		const parsed = JSON.parse(content) as { title?: unknown; body?: unknown };
		const title =
			typeof parsed.title === "string" && parsed.title.trim() !== ""
				? parsed.title.trim()
				: "a draft";
		const body = typeof parsed.body === "string" ? parsed.body : "";
		return { title, words: wordCount(body) };
	} catch {
		// An unreadable payload is still a proposal — it just cannot be described.
		return { title: "a draft", words: 0 };
	}
}

/** Words, the way a writer counts them: whitespace-separated runs. */
export function wordCount(text: string): number {
	return text.split(/\s+/).filter((word) => word !== "").length;
}

/**
 * The text Thorn reads when a transcript is first published.
 *
 * Only the words, both sides, one message per block — not the reader-facing
 * markup. Moderation is about what was said, and a proposal contributes the draft
 * it proposed, because that is what the writer could have published.
 */
export function transcriptTextForModeration(messages: readonly FiresideMessageRow[]): string {
	return messages
		.map((message) => {
			if (message.kind === "draft") return readProposalText(message.content);
			return message.content.trim();
		})
		.filter((block) => block !== "")
		.join("\n\n");
}

/** A proposal's body, for moderation only — never for a reader. */
function readProposalText(content: string): string {
	try {
		const parsed = JSON.parse(content) as { title?: unknown; body?: unknown };
		const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
		const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
		return [title, body].filter((part) => part !== "").join("\n\n");
	} catch {
		return "";
	}
}
