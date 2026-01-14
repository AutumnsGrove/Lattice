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
  plan: "free" | "seedling" | "sapling" | "oak" | "evergreen";
  favoriteColor?: string | null;
  /** Payment provider customer ID (Lemon Squeezy customer_id) */
  providerCustomerId?: string | null;
  /** Payment provider subscription ID (Lemon Squeezy subscription_id) */
  providerSubscriptionId?: string | null;
}

/**
 * Create a new tenant in the database
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

  // 1. Insert into tenants table
  try {
    await db
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
      )
      .run();
    console.log("[Tenant] Tenants table insert successful");
  } catch (err) {
    console.error("[Tenant] Failed to insert into tenants table:", err);
    throw err;
  }

  // 2. Create platform_billing record (for all tiers, even free)
  const billingId = crypto.randomUUID();
  await db
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
    )
    .run();

  // 3. Create default site_settings (used by Arbor admin panel)
  const defaultSettings = [
    ["site_title", input.displayName],
    ["site_description", `${input.displayName}'s blog on Grove`],
    ["accent_color", input.favoriteColor || "#16a34a"],
    ["font_family", "lexend"],
  ];

  for (const [key, value] of defaultSettings) {
    await db
      .prepare(
        `INSERT INTO site_settings (tenant_id, setting_key, setting_value, updated_at)
				 VALUES (?, ?, ?, unixepoch())`,
      )
      .bind(tenantId, key, value)
      .run();
  }

  // 4. Link onboarding record to tenant
  await db
    .prepare(
      `UPDATE user_onboarding
			 SET tenant_id = ?, tenant_created_at = unixepoch(), updated_at = unixepoch()
			 WHERE id = ?`,
    )
    .bind(tenantId, input.onboardingId)
    .run();

  // 5. Create default home page
  const homePageId = crypto.randomUUID();
  const homeContent = `# Welcome to ${input.displayName}

Thanks for visiting! This is my blog on Grove.

## About This Site

I'm just getting started here. Check back soon for new posts!

*Powered by [Grove](https://grove.place) — the cozy blogging platform.*`;

  await db
    .prepare(
      `INSERT INTO pages (id, tenant_id, slug, title, description, type, markdown_content, html_content, hero, gutter_content, font, created_at, updated_at)
       VALUES (?, ?, 'home', ?, ?, 'home', ?, ?, ?, '[]', 'default', unixepoch(), unixepoch())`,
    )
    .bind(
      homePageId,
      tenantId,
      input.displayName,
      `Welcome to ${input.displayName}`,
      homeContent,
      `<h1>Welcome to ${input.displayName}</h1><p>Thanks for visiting! This is my blog on Grove.</p><h2>About This Site</h2><p>I'm just getting started here. Check back soon for new posts!</p><p><em>Powered by <a href="https://grove.place">Grove</a> — the cozy blogging platform.</em></p>`,
      JSON.stringify({
        title: input.displayName,
        subtitle: "Welcome to my corner of the internet",
        cta: { text: "Read the Blog", link: "/blog" },
      }),
    )
    .run();

  console.log("[Tenant] Default home page created");

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
