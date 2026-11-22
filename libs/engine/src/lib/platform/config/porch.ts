/**
 * Porch — visit categories, and the one place a Porch link is built.
 *
 * Porch is Grove's support conversation system (landing app, `porch_visits`).
 * Two things kept drifting before this file existed:
 *
 * 1. **The category list.** A new category used to touch eight places: the
 *    schema `CHECK`, a `VALID_CATEGORIES` array, the picker's category array,
 *    and four separate `categoryLabels` records — plus the notification email's
 *    fifth copy. Missing one meant a visit labelled `appeal` rendered as
 *    `appeal`, or was refused by the server after the database accepted it.
 *    Now the list lives here and everything else derives from it.
 * 2. **The deep link.** Every surface that sends someone to Porch — a blocked
 *    sign-in, a suspended grove, a suspended uploader, a requested deletion —
 *    needs the same URL with the same escaping. Hand-writing it four times is
 *    how one of them ends up with an unencoded `&`.
 *
 * The category is a *hint from the person*, never evidence: everything in this
 * file lands in a URL the visitor can edit before submitting. Treat a prefilled
 * ticket as context for a human to read, not as a claim about who they are.
 *
 * @module porch
 */

/**
 * Every Porch visit category.
 *
 * Order is the order the picker renders. `appeal` sits after `account` (its
 * nearest neighbour in intent) rather than at the end, because someone looking
 * for it should not have to scroll past "Just saying hi".
 */
export const PORCH_CATEGORIES = [
	{
		id: "billing",
		label: "Billing",
		description: "Payments, subscriptions, refunds",
	},
	{
		id: "technical",
		label: "Technical",
		description: "Something isn't working",
	},
	{
		id: "account",
		label: "Account",
		description: "Login, settings, data",
	},
	{
		id: "uploads",
		label: "Uploads",
		description: "Photo uploads on your grove",
	},
	{
		id: "appeal",
		label: "Appeal",
		description: "I was blocked, suspended, or banned",
	},
	{
		id: "hello",
		label: "Just saying hi",
		description: "No issue, just chatting",
	},
	{
		id: "other",
		label: "Other",
		description: "Anything else",
	},
] as const;

/** A valid Porch category id. */
export type PorchCategory = (typeof PORCH_CATEGORIES)[number]["id"];

/** Category ids in picker order. */
export const PORCH_CATEGORY_IDS = PORCH_CATEGORIES.map((c) => c.id) as readonly PorchCategory[];

/** The category a visit falls back to when nothing better is known. */
export const DEFAULT_PORCH_CATEGORY: PorchCategory = "other";

/**
 * Is this string a category we know?
 *
 * The trust boundary is `porch/new`'s form action, where the value came from a
 * hidden input a visitor controls. TypeScript cannot help there.
 */
export function isPorchCategory(value: unknown): value is PorchCategory {
	return typeof value === "string" && (PORCH_CATEGORY_IDS as readonly string[]).includes(value);
}

/**
 * Human-readable label for a category, for anything rendered or emailed.
 *
 * Unknown values pass through rather than becoming "Other" — seeing `appeals`
 * (a typo, a hand-inserted row) in the Arbor list is more useful than silently
 * rendering it as "Other" and losing the difference.
 */
export function porchCategoryLabel(value: string): string {
	return PORCH_CATEGORIES.find((c) => c.id === value)?.label ?? value;
}

/** Where a visit starts. Absolute, because Aspen and Login link here cross-origin. */
export const PORCH_NEW_VISIT_URL = "https://grove.place/porch/new";

export interface PorchLinkOptions {
	category: PorchCategory;
	/** One line. Appears as the visit subject and in Autumn's notification. */
	subject: string;
	/**
	 * The opening message. Keep it short — this travels in a URL, and a link a
	 * mail client wraps into nothing is worse than no prefill at all. Say what
	 * happened and where; the conversation fills in the rest.
	 */
	message?: string;
	/** Helps a signed-out visitor avoid retyping it. Never proof of identity. */
	email?: string;
	/** How to address them, if the caller knows. */
	name?: string;
}

/**
 * Build a pre-filled Porch visit link.
 *
 * Plain text only: `subject`, `message` and `name` are form values, and the
 * notification email escapes them at render time. Do not pass HTML here
 * expecting it to be stripped — there is nothing to strip it.
 *
 * @example
 * ```ts
 * const url = buildPorchUrl({
 *   category: "appeal",
 *   subject: "Suspended grove: quietfern",
 *   message: "My grove at quietfern.grove.place says it isn't available…",
 * });
 * ```
 */
export function buildPorchUrl(options: PorchLinkOptions): string {
	const url = new URL(PORCH_NEW_VISIT_URL);

	url.searchParams.set("category", options.category);
	url.searchParams.set("subject", options.subject);

	if (options.message) url.searchParams.set("message", options.message);
	if (options.email) url.searchParams.set("email", options.email);
	if (options.name) url.searchParams.set("name", options.name);

	return url.toString();
}

/** What a suspended uploader needs to say, and who they are. */
export interface UploadAccessRequest {
	/** The tenant asking, so the ticket is actionable without a reply round-trip. */
	subdomain: string;
	/** How to address them, if the caller knows (Arbor does; the gallery does not). */
	name?: string;
	/** Saves a signed-out visitor retyping it. Never proof of identity. */
	email?: string | null;
}

/**
 * The one place an "ask for uploads" link is built.
 *
 * Three surfaces hit the same gate — the Arbor upload form, the gallery page and
 * the editor's image drop — and every one of them used to dead-end. Hand-writing
 * the link three times is how one of them ends up with an unencoded tenant name;
 * more to the point, the three should ask the same question in the same words.
 *
 * The message stays one line on purpose: it travels in a URL, and it names the
 * grove and the person so the visit can be answered without asking "which one?".
 */
export function buildUploadAccessRequestUrl(request: UploadAccessRequest): string {
	const { subdomain, name, email } = request;

	return buildPorchUrl({
		category: "uploads",
		subject: `Photo uploads for ${subdomain}`,
		message: `Hi — my grove at ${subdomain}.grove.place is still waiting on photo uploads. Could they be switched on when you get a chance?`,
		...(name ? { name } : {}),
		...(email ? { email } : {}),
	});
}
