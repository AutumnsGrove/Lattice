/**
 * Tenant Provisioning
 *
 * Creates a new tenant in D1 after successful payment.
 */

import { emitPulseEvent } from "@autumnsgrove/lattice/pulse";
import { DEFAULT_ACCENT_COLOR, DEFAULT_FONT } from "@autumnsgrove/lattice/platform/config";
import { logGroveError } from "@autumnsgrove/lattice/errors";
import { normalizeEmail } from "@autumnsgrove/lattice/utils/user";
import {
	describeBlock,
	findBlock,
	loadSignupBlocks,
	normalizeIdentity,
} from "@autumnsgrove/lattice/server/security/signup-blocks";
import { PLANT_ERRORS } from "$lib/errors";
import type { GroveDatabase } from "@autumnsgrove/infra";

export interface CreateTenantInput {
	onboardingId: string;
	username: string;
	displayName: string;
	email: string;
	plan: "wanderer" | "seedling" | "sapling" | "oak" | "evergreen";
	favoriteColor?: string | null;
	/** Payment provider customer ID (Lemon Squeezy customer_id) */
	providerCustomerId?: string | null;
	/** Payment provider subscription ID (Lemon Squeezy subscription_id) */
	providerSubscriptionId?: string | null;
}

/**
 * Thrown when the signup identity is on the deny list.
 *
 * A distinct type so routes can answer 403 with the user-facing copy instead of
 * collapsing into the generic "Unable to complete signup" 500.
 */
export class SignupBlockedError extends Error {
	readonly reason: string;

	constructor(reason: string) {
		super("Signup blocked by identity deny list");
		this.name = "SignupBlockedError";
		this.reason = reason;
	}
}

/**
 * Check the deny list one last time before the tenant exists.
 *
 * Heartwood checks at OTP send and at user creation, but a block can land while
 * someone is mid-onboarding — and comped claims don't pass through the OTP flow
 * at all. Fail open on a database error, loudly, for the same reason as
 * Heartwood: a broken deny list must not stop every writer from signing up.
 */
async function assertIdentityNotBlocked(db: GroveDatabase, email: string): Promise<void> {
	const identity = normalizeIdentity(email);
	if (!identity) return;

	try {
		const block = findBlock(identity, await loadSignupBlocks(db));
		if (!block) return;

		console.warn(`[Tenant] Blocked tenant creation for ${identity.normalized}`);
		throw new SignupBlockedError(describeBlock(block));
	} catch (err) {
		if (err instanceof SignupBlockedError) throw err;
		logGroveError("Plant", PLANT_ERRORS.SIGNUP_BLOCK_CHECK_FAILED, {
			detail: `signup_blocks lookup failed for ${identity.domain}: ${String(err)}`,
		});
	}
}

/**
 * Create a new tenant in the database
 */
export async function createTenant(
	db: GroveDatabase,
	input: CreateTenantInput,
): Promise<{ tenantId: string; subdomain: string }> {
	await assertIdentityNotBlocked(db, input.email);

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
				input.favoriteColor || DEFAULT_ACCENT_COLOR,
			)
			.run();
		console.log("[Tenant] Tenants table insert successful");
	} catch (err) {
		logGroveError(
			"Plant/Tenant",
			{
				code: "PLANT-050",
				category: "bug",
				userMessage: "Something went wrong creating your account. Please try again.",
				adminMessage:
					"Step 1 FAILED — INSERT into tenants table. Possible constraint violation or schema mismatch.",
			},
			{ cause: err, tenantId, username: input.username },
		);
		throw err;
	}

	// 2. Create platform_billing record (for all tiers, even free)
	try {
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
		console.log("[Tenant] Platform billing record created");
	} catch (err) {
		logGroveError(
			"Plant/Tenant",
			{
				code: "PLANT-051",
				category: "bug",
				userMessage: "Something went wrong setting up your account. Please try again.",
				adminMessage:
					"Step 2 FAILED — INSERT into platform_billing. Possible constraint violation or missing column.",
			},
			{ cause: err, tenantId, plan: input.plan },
		);
		throw err;
	}

	// 3. Create default site_settings (used by Arbor admin panel)
	try {
		const defaultSettings = [
			["site_title", input.displayName],
			["site_description", `${input.displayName}'s blog on Grove`],
			["accent_color", input.favoriteColor || DEFAULT_ACCENT_COLOR],
			["font_family", DEFAULT_FONT],
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
		console.log("[Tenant] Site settings created (4 rows)");
	} catch (err) {
		logGroveError(
			"Plant/Tenant",
			{
				code: "PLANT-052",
				category: "bug",
				userMessage: "Something went wrong configuring your site. Please try again.",
				adminMessage:
					"Step 3 FAILED — INSERT into site_settings. Possible schema mismatch or missing table.",
			},
			{ cause: err, tenantId },
		);
		throw err;
	}

	// 4. Link onboarding record to tenant
	try {
		await db
			.prepare(
				`UPDATE user_onboarding
				 SET tenant_id = ?, tenant_created_at = unixepoch(), updated_at = unixepoch()
				 WHERE id = ?`,
			)
			.bind(tenantId, input.onboardingId)
			.run();
		console.log("[Tenant] Onboarding record linked to tenant");

		emitPulseEvent("signup.tenant_created", {
			app: "plant",
			route: "/api/select-plan",
			metadata: {
				tenant_id: tenantId,
				subdomain: input.username,
				plan: input.plan,
				onboarding_id: input.onboardingId,
			},
		});
	} catch (err) {
		logGroveError("Plant/Tenant", PLANT_ERRORS.ONBOARDING_UPDATE_FAILED, {
			cause: err,
			detail: "Step 4 — UPDATE user_onboarding to link tenant_id",
			tenantId,
			onboardingId: input.onboardingId,
		});
		throw err;
	}

	// 4b. Upsert users table (SSOT for identity → tenant mapping)
	// Reads groveauth_id from user_onboarding since it's not in CreateTenantInput
	try {
		const onboardingRow = await db
			.prepare("SELECT groveauth_id FROM user_onboarding WHERE id = ?")
			.bind(input.onboardingId)
			.first<{ groveauth_id: string }>();

		console.log("[Tenant] Step 4b - groveauth_id lookup:", onboardingRow?.groveauth_id ?? "NULL");

		if (onboardingRow?.groveauth_id) {
			await db
				.prepare(
					`INSERT INTO users (id, groveauth_id, email, display_name, tenant_id, is_active, created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
					 ON CONFLICT(email) DO UPDATE SET
					   groveauth_id = COALESCE(excluded.groveauth_id, users.groveauth_id),
					   display_name = excluded.display_name,
					   tenant_id = excluded.tenant_id,
					   updated_at = datetime('now')`,
				)
				.bind(
					crypto.randomUUID(),
					onboardingRow.groveauth_id,
					// Normalized so the case-insensitive uniqueness on users.email
					// (idx_users_email_unique_ci, #1580) can't be violated by a
					// provider sending different case than a prior sign-in did.
					normalizeEmail(input.email) ?? input.email,
					input.displayName,
					tenantId,
				)
				.run();
			console.log("[Tenant] Users table synced");
		} else {
			console.warn("[Tenant] Step 4b - No groveauth_id found, skipping users upsert");
		}
	} catch (err) {
		logGroveError(
			"Plant/Tenant",
			{
				code: "PLANT-053",
				category: "bug",
				userMessage: "Something went wrong syncing your account. Please try again.",
				adminMessage: "Step 4b FAILED — SELECT from user_onboarding or UPSERT into users table.",
			},
			{ cause: err, tenantId, onboardingId: input.onboardingId },
		);
		throw err;
	}

	// 5. Create default home page
	try {
		const homePageId = crypto.randomUUID();
		const homeContent = `# Welcome to ${input.displayName}

Thanks for visiting! This is my blog on Grove.

## About This Site

I'm just getting started here. Check back soon for new posts!

*Powered by [Grove](https://grove.place) — the cozy blogging platform.*`;

		await db
			.prepare(
				`INSERT INTO pages (id, tenant_id, slug, title, description, type, markdown_content, html_content, hero, gutter_content, font, created_at, updated_at)
				 VALUES (?, ?, 'home', 'Home', 'Your home page', 'home', ?, ?, ?, '[]', 'default', unixepoch(), unixepoch())`,
			)
			.bind(
				homePageId,
				tenantId,
				homeContent,
				`<h1>Welcome to ${input.displayName}</h1><p>Thanks for visiting! This is my blog on Grove.</p><h2>About This Site</h2><p>I'm just getting started here. Check back soon for new posts!</p><p><em>Powered by <a href="https://grove.place">Grove</a> — the cozy blogging platform.</em></p>`,
				JSON.stringify({
					title: input.displayName,
					subtitle: "Welcome to my corner of the internet",
					cta: { text: "Read the Blog", link: "/blog" },
				}),
			)
			.run();
		console.log("[Tenant] Step 5 - Home page created");
	} catch (err) {
		logGroveError(
			"Plant/Tenant",
			{
				code: "PLANT-054",
				category: "bug",
				userMessage: "Something went wrong creating your home page. Please try again.",
				adminMessage:
					"Step 5 FAILED — INSERT into pages (slug: home). Possible schema mismatch or missing table.",
			},
			{ cause: err, tenantId },
		);
		throw err;
	}

	// 6. Create default about page
	try {
		const aboutPageId = crypto.randomUUID();
		const aboutMarkdown = `# About

Welcome! This page is waiting for your story.

*Edit this page from your [admin panel](/arbor/pages/edit/about).*`;

		await db
			.prepare(
				`INSERT INTO pages (id, tenant_id, slug, title, description, type, markdown_content, html_content, gutter_content, font, show_in_nav, nav_order, created_at, updated_at)
				 VALUES (?, ?, 'about', 'About', 'A little about this site', 'about', ?, ?, '[]', 'default', 0, 0, unixepoch(), unixepoch())`,
			)
			.bind(
				aboutPageId,
				tenantId,
				aboutMarkdown,
				'<h1>About</h1><p>Welcome! This page is waiting for your story.</p><p><em>Edit this page from your <a href="/arbor/pages/edit/about">admin panel</a>.</em></p>',
			)
			.run();
		console.log("[Tenant] Step 6 - About page created");
	} catch (err) {
		logGroveError(
			"Plant/Tenant",
			{
				code: "PLANT-055",
				category: "bug",
				userMessage: "Something went wrong creating your about page. Please try again.",
				adminMessage:
					"Step 6 FAILED — INSERT into pages (slug: about). Possible schema mismatch or missing table.",
			},
			{ cause: err, tenantId },
		);
		throw err;
	}

	return {
		tenantId,
		subdomain: input.username,
	};
}

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
