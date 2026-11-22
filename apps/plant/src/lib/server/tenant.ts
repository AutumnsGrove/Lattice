/**
 * Tenant Provisioning
 *
 * Creates a new tenant in D1 after successful payment.
 *
 * The implementation lives in the engine (`create-tenant.ts`) so that the
 * operator path — `gw tenant create` → ops worker — and this one create the
 * same shape. That is not tidiness: #1596 §B's acceptance criterion is that a
 * fixture tenant can be handed straight to `removeTenant()` and come back with
 * zero leftovers, which only means anything if fixtures are made by the same
 * code that makes real tenants.
 *
 * This file keeps Plant's import surface so routes and tests don't churn. The
 * one thing that stays here is `getTenantForOnboarding`, which is about
 * onboarding, not tenancy.
 */

import type { GroveDatabase } from "@autumnsgrove/infra";

export {
	createTenant,
	planTenantCreation,
	describeTenantCreationPlan,
	assertIdentityNotBlocked,
	SignupBlockedError,
	type CreateTenantInput,
	type CreateTenantOptions,
	type TenantCreationPlan,
	type TenantWrite,
} from "@autumnsgrove/lattice/server/tenants/create-tenant";

/**
 * Check if a tenant already exists for an onboarding record
 */
export async function getTenantForOnboarding(
	db: GroveDatabase,
	onboardingId: string,
): Promise<{ tenantId: string; subdomain: string } | null> {
	const result = await db
		.prepare(
			`SELECT t.id, t.subdomain
			 FROM user_onboarding o
			 JOIN tenants t ON o.tenant_id = t.id
			 WHERE o.id = ?`,
		)
		.bind(onboardingId)
		.first();

	if (!result) return null;

	return {
		tenantId: result.id as string,
		subdomain: result.subdomain as string,
	};
}
