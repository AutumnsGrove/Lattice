/**
 * Tenant Provisioning
 *
 * Creates a new tenant in D1 after successful payment.
 */

export interface CreateTenantInput {
	onboardingId: string;
	username: string;
	displayName: string;
	email: string;
	plan: 'free' | 'seedling' | 'sapling' | 'oak' | 'evergreen';
	favoriteColor?: string | null;
	stripeCustomerId?: string | null;
	stripeSubscriptionId?: string | null;
}

/**
 * Create a new tenant in the database
 */
export async function createTenant(
	db: D1Database,
	input: CreateTenantInput
): Promise<{ tenantId: string; subdomain: string }> {
	const tenantId = crypto.randomUUID();

	// 1. Insert into tenants table
	await db
		.prepare(
			`INSERT INTO tenants (id, subdomain, display_name, email, plan, theme, accent_color, active, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, 'default', ?, 1, unixepoch(), unixepoch())`
		)
		.bind(
			tenantId,
			input.username,
			input.displayName,
			input.email,
			input.plan,
			input.favoriteColor || '#16a34a'
		)
		.run();

	// 2. Create platform_billing record (for all tiers, even free)
	const billingId = crypto.randomUUID();
	await db
		.prepare(
			`INSERT INTO platform_billing (id, tenant_id, plan, status, provider_customer_id, provider_subscription_id, created_at, updated_at)
			 VALUES (?, ?, ?, 'active', ?, ?, unixepoch(), unixepoch())`
		)
		.bind(
			billingId,
			tenantId,
			input.plan,
			input.stripeCustomerId || null,
			input.stripeSubscriptionId || null
		)
		.run();

	// 3. Create default tenant_settings
	const defaultSettings = [
		['site_title', input.displayName],
		['site_description', `${input.displayName}'s blog on Grove`],
		['accent_color', input.favoriteColor || '#16a34a'],
		['font', 'lexend']
	];

	for (const [key, value] of defaultSettings) {
		await db
			.prepare(
				`INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, updated_at)
				 VALUES (?, ?, ?, unixepoch())`
			)
			.bind(tenantId, key, value)
			.run();
	}

	// 4. Link onboarding record to tenant
	await db
		.prepare(
			`UPDATE user_onboarding
			 SET tenant_id = ?, tenant_created_at = unixepoch(), updated_at = unixepoch()
			 WHERE id = ?`
		)
		.bind(tenantId, input.onboardingId)
		.run();

	return {
		tenantId,
		subdomain: input.username
	};
}

/**
 * Check if a tenant already exists for an onboarding record
 */
export async function getTenantForOnboarding(
	db: D1Database,
	onboardingId: string
): Promise<{ tenantId: string; subdomain: string } | null> {
	const result = await db
		.prepare(
			`SELECT t.id, t.subdomain
			 FROM user_onboarding o
			 JOIN tenants t ON o.tenant_id = t.id
			 WHERE o.id = ?`
		)
		.bind(onboardingId)
		.first();

	if (!result) return null;

	return {
		tenantId: result.id as string,
		subdomain: result.subdomain as string
	};
}
