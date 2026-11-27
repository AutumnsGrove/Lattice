/**
 * The two small decisions a route makes without the model: what Wisp says first,
 * and when there is enough to organize.
 *
 * Both are pure so they can be tested without a run, and both are here rather than
 * inside a route so the panel and the API cannot disagree about them.
 */

import type { FiresideMessageRow } from "./session";

/** Below the gate, the draft route says this instead of spending the writer's money. */
export const NOT_ENOUGH_YET =
	"We're just getting started! Tell me a bit more before we shape it into words.";

/** Three writer messages, and enough of them to be worth organizing. */
export const CAN_DRAFT_MIN_MESSAGES = 3;
export const CAN_DRAFT_MIN_TOKENS = 150;

/** Four characters per token: conservative, and exact enough for a gate. */
export function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}

/**
 * Whether there is enough substance to organize.
 *
 * **Wisp's own messages never count.** A model that talks a lot has not given the
 * writer anything to organize — the input is the writer's sentences, and counting
 * the reply would let a single anxious message qualify.
 */
export function canDraft(messages: readonly FiresideMessageRow[]): boolean {
	const writerMessages = messages.filter(
		(message) => message.role === "user" && message.kind === "turn",
	);
	if (writerMessages.length < CAN_DRAFT_MIN_MESSAGES) return false;

	const tokens = writerMessages.reduce(
		(total, message) => total + estimateTokens(message.content),
		0,
	);
	return tokens >= CAN_DRAFT_MIN_TOKENS;
}

/**
 * What Wisp says when the fire is lit.
 *
 * Deliberately *not* a model call: opening a session is the one moment nobody has
 * said anything worth answering yet, and spending the writer's key on "hello" is a
 * strange way to begin. Two openings, because the page's state is the only thing
 * that changes what is worth asking first.
 */
export function openingLine(hasDraft: boolean): string {
	return hasDraft
		? "You're not starting from nothing — the page has words in it. What's the part that isn't working yet?"
		: "The page is blank. That's the good part — what did you notice first?";
}
