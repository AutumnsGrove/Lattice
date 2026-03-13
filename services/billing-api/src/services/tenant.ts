/**
 * Tenant Provisioning Service
 *
 * Creates a new tenant in D1 after successful checkout.
 * Adapted from apps/plant/src/lib/server/tenant.ts
 */

// =============================================================================
// TYPES
// =============================================================================

export interface CreateTenantInput {
	onboardingId: string;
	username: string;
	displayName: string;
	email: string;
	plan: string;
	favoriteColor?: string | null;
	providerCustomerId?: string | null;
	providerSubscriptionId?: string | null;
}

// =============================================================================
// TENANT CREATION
// =============================================================================

/**
 * Create a new tenant in the database.
 *
 * This is the same logic that runs in Plant's webhook handler,
 * now centralized in billing-api.
 */
export async function createTenant(
	db: D1Database,
	input: CreateTenantInput,
): Promise<{ tenantId: string; subdomain: string }> {
	const tenantId = crypto.randomUUID();

	console.log("[Tenant] Creating tenant:", {
		tenantId,
		username: input.username,
		plan: input.plan,
	});

	const billingId = crypto.randomUUID();
	const homePageId = crypto.randomUUID();
	const aboutPageId = crypto.randomUUID();

	// Escape displayName for HTML context (user-provided, could contain <script> etc.)
	const safeDisplayName = input.displayName
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

	const homeContent = `# Welcome to ${safeDisplayName}

Thanks for visiting! This is my blog on Grove.

## About This Site

I'm just getting started here. Check back soon for new posts!

*Powered by [Grove](https://grove.place) — the cozy blogging platform.*`;

	const aboutMarkdown = `# About

Welcome! This page is waiting for your story.

*Edit this page from your [admin panel](/arbor/pages/edit/about).*`;

	// Default site settings
	const defaultSettings: [string, string][] = [
		["site_title", input.displayName],
		["site_description", `${input.displayName}'s blog on Grove`],
		["accent_color", input.favoriteColor || "#16a34a"],
		["font_family", "lexend"],
	];

	const settingsStmt = db.prepare(
		`INSERT INTO site_settings (tenant_id, setting_key, setting_value, updated_at)
     VALUES (?, ?, ?, unixepoch())`,
	);

	// All operations in a single db.batch() — atomic transaction.
	// If any statement fails, all are rolled back. Prevents orphaned
	// tenant rows, missing billing records, or missing default pages.
	await db.batch([
		// 1. Insert tenant
		db
			.prepare(
				`INSERT INTO tenants (id, subdomain, display_name, email, plan, theme, accent_color, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'default', ?, 1, unixepoch(), unixepoch())`,
			)
			.bind(
				tenantId,
				input.username,
				input.displayName,
				input.email,
				input.plan,
				input.favoriteColor || "#16a34a",
			),

		// 2. Create platform_billing record
		db
			.prepare(
				`INSERT INTO platform_billing (id, tenant_id, plan, status, provider_customer_id, provider_subscription_id, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?, unixepoch(), unixepoch())`,
			)
			.bind(
				billingId,
				tenantId,
				input.plan,
				input.providerCustomerId || null,
				input.providerSubscriptionId || null,
			),

		// 3. Create default site_settings
		...defaultSettings.map(([key, value]) => settingsStmt.bind(tenantId, key, value)),

		// 4. Link onboarding record to tenant
		db
			.prepare(
				`UPDATE user_onboarding
         SET tenant_id = ?, tenant_created_at = unixepoch(), updated_at = unixepoch()
         WHERE id = ?`,
			)
			.bind(tenantId, input.onboardingId),

		// 5. Create default home page
		db
			.prepare(
				`INSERT INTO pages (id, tenant_id, slug, title, description, type, markdown_content, html_content, hero, gutter_content, font, created_at, updated_at)
         VALUES (?, ?, 'home', 'Home', 'Your home page', 'home', ?, ?, ?, '[]', 'default', unixepoch(), unixepoch())`,
			)
			.bind(
				homePageId,
				tenantId,
				homeContent,
				`<h1>Welcome to ${safeDisplayName}</h1><p>Thanks for visiting! This is my blog on Grove.</p><h2>About This Site</h2><p>I'm just getting started here. Check back soon for new posts!</p><p><em>Powered by <a href="https://grove.place">Grove</a> — the cozy blogging platform.</em></p>`,
				JSON.stringify({
					title: input.displayName,
					subtitle: "Welcome to my corner of the internet",
					cta: { text: "Read the Blog", link: "/blog" },
				}),
			),

		// 6. Create default about page
		db
			.prepare(
				`INSERT INTO pages (id, tenant_id, slug, title, description, type, markdown_content, html_content, gutter_content, font, show_in_nav, nav_order, created_at, updated_at)
         VALUES (?, ?, 'about', 'About', 'A little about this site', 'about', ?, ?, '[]', 'default', 0, 0, unixepoch(), unixepoch())`,
			)
			.bind(
				aboutPageId,
				tenantId,
				aboutMarkdown,
				'<h1>About</h1><p>Welcome! This page is waiting for your story.</p><p><em>Edit this page from your <a href="/arbor/pages/edit/about">admin panel</a>.</em></p>',
			),
	]);

	console.log("[Tenant] Created successfully:", { tenantId, subdomain: input.username });

	return {
		tenantId,
		subdomain: input.username,
	};
}

/**
 * Check if a tenant already exists for an onboarding record
 */
export async function getTenantForOnboarding(
	db: D1Database,
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
