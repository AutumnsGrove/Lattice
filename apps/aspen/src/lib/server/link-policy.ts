/**
 * Link policy for the current request's tenant
 *
 * One line per render site:
 *
 * ```ts
 * const policy = linkPolicyFromContext(locals.context);
 * ```
 *
 * The rule itself lives in `@autumnsgrove/lattice/server/security/link-policy`
 * so it is not re-derived here — this only pulls the tenant facts out of the
 * request context.
 *
 * Applied to posts that already have rendered HTML stored in D1 as well as fresh
 * renders: a spam post published before this shipped still carries its links, and
 * `applyLinkPolicy` rewrites `rel` in place rather than re-rendering the body.
 */

import type { LinkPolicy } from "@autumnsgrove/grove-markdown";
import { decideLinkPolicy, shouldNoindex } from "@autumnsgrove/lattice/server/security/link-policy";

interface TenantContextLike {
	tenant?: {
		plan?: string | null;
		createdAt?: number;
	};
}

export interface TenantLinkPolicy {
	policy: LinkPolicy;
	noindex: boolean;
	reason: string;
}

const STANDARD: TenantLinkPolicy = { policy: "standard", noindex: false, reason: "no-tenant" };

/**
 * Decide the outbound link policy for whatever tenant this request belongs to.
 *
 * Returns the standard policy outside a tenant context (root site, 404s, admin)
 * rather than guessing — there is no account to devalue there.
 */
export function linkPolicyFromContext(
	context: unknown,
	now: number = Date.now(),
): TenantLinkPolicy {
	const tenant = (context as TenantContextLike | undefined)?.tenant;
	if (!tenant) return STANDARD;

	const decision = decideLinkPolicy({ plan: tenant.plan, createdAt: tenant.createdAt }, now);

	return {
		policy: decision.policy,
		noindex: shouldNoindex({ plan: tenant.plan, createdAt: tenant.createdAt }, now),
		reason: decision.reason,
	};
}
