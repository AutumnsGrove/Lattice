/**
 * Outbound link `rel` policy
 *
 * One helper, used by every renderer. Two jobs, deliberately in one place:
 *
 * 1. **Reverse tabnabbing** — every external link gets `noopener noreferrer`.
 *    This is unconditional and has always been the rule.
 * 2. **SEO value** — young or free-tier accounts get `nofollow ugc` as well.
 *
 * The second one exists because rotating an email address costs an operator
 * almost nothing, while a link that doesn't count costs them the entire point of
 * the account (#1682). It is a permanent downgrade of the attack's value that
 * works no matter what the next wave looks like.
 *
 * @see libs/engine/src/lib/server/security/link-policy.ts — who earns which policy
 */

/** `standard` for established accounts; `nofollow-ugc` for young or free ones. */
export type LinkPolicy = "standard" | "nofollow-ugc";

/** Is this an outbound link, by href or by target? */
export function isExternalLink(href: string | undefined, target: string | undefined): boolean {
	const value = href ?? "";
	return value.startsWith("http://") || value.startsWith("https://") || target === "_blank";
}

/**
 * Build the `rel` attribute for an external link.
 *
 * Existing tokens are preserved (some renderers add `mention`, `passage`, etc.)
 * and the result is stable-ordered so tests and diffs don't churn.
 */
export function externalLinkRel(existingRel: string | undefined, policy: LinkPolicy): string {
	const parts = new Set((existingRel ?? "").split(/\s+/).filter(Boolean));

	parts.add("noopener");
	parts.add("noreferrer");

	if (policy === "nofollow-ugc") {
		parts.add("nofollow");
		parts.add("ugc");
	}

	return Array.from(parts).join(" ");
}

/**
 * Rewrite the `rel` on every external anchor in a block of HTML.
 *
 * Only needed where a renderer hands us HTML we did not build ourselves. The
 * markdown sanitizers do this during their own pass and should use
 * `externalLinkRel` directly, so links are touched once rather than twice.
 */
export function applyLinkPolicy(html: string, policy: LinkPolicy): string {
	if (!html || policy === "standard") return html;

	return html.replace(/<a\b([^>]*)>/gi, (match, attrs: string) => {
		const href = /\bhref\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1];
		const target = /\btarget\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1];
		if (!isExternalLink(href, target)) return match;

		const existingRel = /\brel\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1] ?? "";
		const rel = externalLinkRel(existingRel, policy);

		if (/\brel\s*=\s*["'][^"']*["']/i.test(attrs)) {
			return `<a${attrs.replace(/\brel\s*=\s*["'][^"']*["']/i, `rel="${rel}"`)}>`;
		}
		return `<a${attrs} rel="${rel}">`;
	});
}
