/**
 * Link policy — who earns `nofollow ugc`
 *
 * The premise of #1682: rotating an email address costs an operator almost
 * nothing, and blocking a domain is a race. But a link that search engines
 * ignore costs them the *entire point* of the account. So the cheapest durable
 * defence is not detection, it is devaluation.
 *
 * The rule, and why each half exists:
 *
 * - **Free tier (`wanderer`)**. It costs Grove money, and it grants a subdomain
 *   on a domain with real SEO standing. It is fair for those outbound links to
 *   be `ugc`.
 * - **Young accounts (under 14 days)**. A brand new blog is not useful to the
 *   open web in its first hour; it is very useful to a link farm. The window
 *   lifts on its own, which means no support burden and no manual review.
 *
 * Both conditions only *add* the downgrade. Nothing here removes trust from an
 * established paid tenant, and nothing is permanent unless the account stays
 * free.
 */

import type { LinkPolicy } from "@autumnsgrove/grove-markdown";

/** Age below which an account's outbound links do not count. */
export const YOUNG_ACCOUNT_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

const FREE_TIERS = new Set(["wanderer", "free"]);

export interface LinkPolicyInput {
	/** `tenants.plan` — `wanderer`/`free` are the no-cost tiers. */
	plan?: string | null;
	/**
	 * `tenants.created_at` in **unix seconds**. Missing or 0 means "we do not
	 * know how old this account is" — which is treated as young, because the
	 * failure mode we care about is a link farm, not a two-week-old blog losing
	 * a little link equity.
	 */
	createdAt?: number | null;
}

export interface LinkPolicyDecision {
	policy: LinkPolicy;
	/** Why, for logs and tests. Never shown to the reader. */
	reason: "free-tier" | "young-account" | "established" | "unknown-age";
	ageDays: number | null;
}

/**
 * Decide the outbound link policy for a tenant.
 *
 * @param input tenant plan and creation time
 * @param now milliseconds since epoch, injectable for tests
 */
export function decideLinkPolicy(
	input: LinkPolicyInput,
	now: number = Date.now(),
): LinkPolicyDecision {
	const ageDays =
		input.createdAt && input.createdAt > 0
			? Math.floor((now - input.createdAt * 1000) / DAY_MS)
			: null;

	const free = FREE_TIERS.has((input.plan ?? "").toLowerCase());

	if (free) return { policy: "nofollow-ugc", reason: "free-tier", ageDays };

	if (ageDays === null) {
		return { policy: "nofollow-ugc", reason: "unknown-age", ageDays };
	}

	if (ageDays < YOUNG_ACCOUNT_DAYS) {
		return { policy: "nofollow-ugc", reason: "young-account", ageDays };
	}

	return { policy: "standard", reason: "established", ageDays };
}

/** Convenience for render sites that only need the policy value. */
export function linkPolicyFor(input: LinkPolicyInput, now: number = Date.now()): LinkPolicy {
	return decideLinkPolicy(input, now).policy;
}

/**
 * Should a young account's post be `<meta name="robots" content="noindex">`?
 *
 * Deliberately the same window as the link policy, so the rule and the behaviour
 * stay together. Free tier alone is not enough to hide a page — a free-tier
 * writer should still be findable; a two-day-old page should not be indexed yet.
 */
export function shouldNoindex(input: LinkPolicyInput, now: number = Date.now()): boolean {
	// Free tier does not hide a page — a free-tier writer should still be
	// findable. Only age decides, and an unknown age is treated as young.
	const { ageDays } = decideLinkPolicy({ ...input, plan: "seedling" }, now);
	return ageDays === null || ageDays < YOUNG_ACCOUNT_DAYS;
}
