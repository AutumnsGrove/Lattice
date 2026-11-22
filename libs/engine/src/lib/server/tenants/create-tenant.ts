/**
 * Tenant Creation — one implementation
 *
 * This lived in `apps/plant/src/lib/server/tenant.ts` and was reachable only by
 * walking the real signup. That made it untestable as an operation: there was
 * no way to create a tenant except by being a person with a plan, which is why
 * every abuse fixture so far was made by a bot and every removal test ran
 * against whatever happened to be in production (#1710).
 *
 * It lives here for the reason all of Grove's shared behaviour lives here: the
 * operator path (`gw tenant create` → ops worker) and Plant's signup path must
 * create the same shape, or the deletion test ends up testing a shape only
 * fixtures have.
 *
 * ## Plan, then write
 *
 * Creation is expressed as a plan (`planTenantCreation`) and an executor
 * (`createTenant`). Every statement is built exactly once, in the plan, which
 * is what lets `--dry-run` print the rows it *would* write without a second,
 * drifting description of them.
 *
 * @see docs/security/incident-response-runbook.md — removal, the other half
 */

import { logGroveError } from "@autumnsgrove/grove-errors";
import { emitPulseEvent } from "../../pulse/emitter.js";
import { DEFAULT_ACCENT_COLOR, DEFAULT_FONT } from "../../platform/config/index.js";
import { normalizeEmail } from "../../utils/user.js";
import type { TierKey } from "../../platform/config/tiers/types.js";
import {
	describeBlock,
	findBlock,
	loadSignupBlocks,
	normalizeIdentity,
} from "../security/signup-blocks.js";
import { TENANT_ERRORS, type TenantErrorKey } from "../../errors/tenant-errors.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Minimal DB shape — matches both D1Database and GroveDatabase.
 *
 * A local structural interface rather than the infra type, following
 * `removal-database` in `remove-tenant.ts`: the engine should not need to know
 * which adapter the caller holds, and every caller already has one of the two.
 */
export interface TenantWriteDatabase {
	prepare(sql: string): {
		bind(...params: unknown[]): {
			first<T = Record<string, unknown>>(): Promise<T | null>;
			all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
			run(): Promise<unknown>;
		};
	};
}

export interface CreateTenantInput {
	/**
	 * The onboarding row to link. Optional, because an operator-created fixture
	 * has no signup behind it — pass `groveauthId` instead.
	 */
	onboardingId?: string | null;
	/** Subdomain. `tenants.username` is the column; the subdomain is the name. */
	username: string;
	displayName: string;
	email: string;
	plan: TierKey;
	favoriteColor?: string | null;
	/** Payment provider customer ID (Stripe customer_id) */
	providerCustomerId?: string | null;
	/** Payment provider subscription ID (Stripe subscription_id) */
	providerSubscriptionId?: string | null;
	/**
	 * groveauth identity to attach, when there is no onboarding row to read it
	 * from. Ignored when `onboardingId` resolves one — the row is authoritative.
	 */
	groveauthId?: string | null;
	/**
	 * `tenants.created_at`, in unix seconds. Defaults to now.
	 *
	 * Exists so a fixture can be young or established: the link policy (#1682)
	 * decides `nofollow ugc` on a 14-day window, and testing both sides of it
	 * should not require waiting two weeks.
	 */
	createdAt?: number | null;
	/**
	 * Skip the signup deny list, with a reason that is recorded in `audit_log`
	 * by the caller. Operator-only; never reachable from a tenant-facing app.
	 */
	forceIdentityReason?: string | null;
}

/** One statement, with the error that names it if it fails. */
export interface TenantWrite {
	/** Short step name, used in logs and in `--dry-run` output. */
	step: string;
	/** Which catalog entry to log if this statement throws. */
	errorKey: TenantErrorKey;
	sql: string;
	bindings: unknown[];
}

export interface TenantCreationPlan {
	tenantId: string;
	subdomain: string;
	/** Statements to run, in order. */
	writes: TenantWrite[];
	/** The groveauth identity attached by step 4b, if one was found. */
	groveauthId: string | null;
	/** True when the deny list was skipped deliberately. */
	identityBlockOverridden: boolean;
}

export interface CreateTenantOptions {
	/**
	 * Build and return the plan without writing anything. This is `--dry-run`:
	 * the same statements, from the same code, with no side effects.
	 */
	dryRun?: boolean;
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

// ============================================================================
// Signup deny list
// ============================================================================

/**
 * Check the deny list one last time before the tenant exists.
 *
 * Heartwood checks at OTP send and at user creation, but a block can land while
 * someone is mid-onboarding — and comped claims don't pass through the OTP flow
 * at all. Fail open on a database error, loudly, for the same reason as
 * Heartwood: a broken deny list must not stop every writer from signing up.
 */
export async function assertIdentityNotBlocked(
	db: TenantWriteDatabase,
	email: string,
): Promise<void> {
	const identity = normalizeIdentity(email);
	if (!identity) return;

	try {
		const block = findBlock(identity, await loadSignupBlocks(db));
		if (!block) return;

		console.warn(`[Tenant] Blocked tenant creation for ${identity.normalized}`);
		throw new SignupBlockedError(describeBlock(block));
	} catch (err) {
		if (err instanceof SignupBlockedError) throw err;
		logGroveError("Engine/Tenant", TENANT_ERRORS.SIGNUP_BLOCK_CHECK_FAILED, {
			detail: `signup_blocks lookup failed for ${identity.domain}: ${String(err)}`,
		});
	}
}

// ============================================================================
// Plan
// ============================================================================

const DEFAULT_HOME_MARKDOWN = (displayName: string) => `# Welcome to ${displayName}

Thanks for visiting! This is my blog on Grove.

## About This Site

I'm just getting started here. Check back soon for new posts!

*Powered by [Grove](https://grove.place) — the cozy blogging platform.*`;

const DEFAULT_HOME_HTML = (displayName: string) =>
	`<h1>Welcome to ${displayName}</h1><p>Thanks for visiting! This is my blog on Grove.</p><h2>About This Site</h2><p>I'm just getting started here. Check back soon for new posts!</p><p><em>Powered by <a href="https://grove.place">Grove</a> — the cozy blogging platform.</em></p>`;

const DEFAULT_ABOUT_MARKDOWN = `# About

Welcome! This page is waiting for your story.

*Edit this page from your [admin panel](/arbor/pages/edit/about).*`;

const DEFAULT_ABOUT_HTML =
	'<h1>About</h1><p>Welcome! This page is waiting for your story.</p><p><em>Edit this page from your <a href="/arbor/pages/edit/about">admin panel</a>.</em></p>';

/**
 * Build every statement creation needs, without running any of them.
 *
 * Reads (the deny list, the onboarding identity) happen in `createTenant`, not
 * here, so a plan is a pure description of writes.
 */
export function planTenantCreation(
	input: CreateTenantInput,
	options: { tenantId?: string; groveauthId?: string | null } = {},
): TenantCreationPlan {
	const tenantId = options.tenantId ?? crypto.randomUUID();
	const accentColor = input.favoriteColor || DEFAULT_ACCENT_COLOR;
	const createdAt = input.createdAt ?? null;

	const writes: TenantWrite[] = [];

	// 1. The tenant row itself.
	writes.push({
		step: "tenants",
		errorKey: "INSERT_FAILED",
		sql: `INSERT INTO tenants (id, subdomain, display_name, email, plan, theme, accent_color, active, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, 'default', ?, 1, ${createdAt === null ? "unixepoch()" : "?"}, unixepoch())`,
		bindings:
			createdAt === null
				? [tenantId, input.username, input.displayName, input.email, input.plan, accentColor]
				: [
						tenantId,
						input.username,
						input.displayName,
						input.email,
						input.plan,
						accentColor,
						createdAt,
					],
	});

	// 2. Billing, for every tier including free — the row is what the plan UI and
	//    the reclamation exclusion read.
	writes.push({
		step: "platform_billing",
		errorKey: "BILLING_INSERT_FAILED",
		sql: `INSERT INTO platform_billing (id, tenant_id, plan, status, provider_customer_id, provider_subscription_id, created_at, updated_at)
				 VALUES (?, ?, ?, 'active', ?, ?, unixepoch(), unixepoch())`,
		bindings: [
			crypto.randomUUID(),
			tenantId,
			input.plan,
			input.providerCustomerId || null,
			input.providerSubscriptionId || null,
		],
	});

	// 3. Default site settings (Arbor's admin panel reads these).
	for (const [key, value] of [
		["site_title", input.displayName],
		["site_description", `${input.displayName}'s blog on Grove`],
		["accent_color", accentColor],
		["font_family", DEFAULT_FONT],
	] as const) {
		writes.push({
			step: `site_settings:${key}`,
			errorKey: "SETTINGS_INSERT_FAILED",
			sql: `INSERT INTO site_settings (tenant_id, setting_key, setting_value, updated_at)
					 VALUES (?, ?, ?, unixepoch())`,
			bindings: [tenantId, key, value],
		});
	}

	// 4. Link the onboarding row, when there is one.
	if (input.onboardingId) {
		writes.push({
			step: "user_onboarding",
			errorKey: "ONBOARDING_LINK_FAILED",
			sql: `UPDATE user_onboarding
				 SET tenant_id = ?, tenant_created_at = unixepoch(), updated_at = unixepoch()
				 WHERE id = ?`,
			bindings: [tenantId, input.onboardingId],
		});
	}

	// 4b. Identity → tenant, the SSOT mapping. Skipped when nobody can name the
	//     identity, rather than writing a half-user.
	if (options.groveauthId) {
		writes.push({
			step: "users",
			errorKey: "USER_SYNC_FAILED",
			sql: `INSERT INTO users (id, groveauth_id, email, display_name, tenant_id, is_active, created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
					 ON CONFLICT(email) DO UPDATE SET
					   groveauth_id = COALESCE(excluded.groveauth_id, users.groveauth_id),
					   display_name = excluded.display_name,
					   tenant_id = excluded.tenant_id,
					   updated_at = datetime('now')`,
			bindings: [
				crypto.randomUUID(),
				options.groveauthId,
				// Normalized so the case-insensitive uniqueness on users.email
				// (idx_users_email_unique_ci, #1580) can't be violated by a
				// provider sending different case than a prior sign-in did.
				normalizeEmail(input.email) ?? input.email,
				input.displayName,
				tenantId,
			],
		});
	}

	// 5. Home page.
	writes.push({
		step: "pages:home",
		errorKey: "HOME_PAGE_FAILED",
		sql: `INSERT INTO pages (id, tenant_id, slug, title, description, type, markdown_content, html_content, hero, gutter_content, font, created_at, updated_at)
				 VALUES (?, ?, 'home', 'Home', 'Your home page', 'home', ?, ?, ?, '[]', 'default', unixepoch(), unixepoch())`,
		bindings: [
			crypto.randomUUID(),
			tenantId,
			DEFAULT_HOME_MARKDOWN(input.displayName),
			DEFAULT_HOME_HTML(input.displayName),
			JSON.stringify({
				title: input.displayName,
				subtitle: "Welcome to my corner of the internet",
				cta: { text: "Read the Blog", link: "/blog" },
			}),
		],
	});

	// 6. About page.
	writes.push({
		step: "pages:about",
		errorKey: "ABOUT_PAGE_FAILED",
		sql: `INSERT INTO pages (id, tenant_id, slug, title, description, type, markdown_content, html_content, gutter_content, font, show_in_nav, nav_order, created_at, updated_at)
				 VALUES (?, ?, 'about', 'About', 'A little about this site', 'about', ?, ?, '[]', 'default', 0, 0, unixepoch(), unixepoch())`,
		bindings: [crypto.randomUUID(), tenantId, DEFAULT_ABOUT_MARKDOWN, DEFAULT_ABOUT_HTML],
	});

	return {
		tenantId,
		subdomain: input.username,
		writes,
		groveauthId: options.groveauthId ?? null,
		identityBlockOverridden: Boolean(input.forceIdentityReason),
	};
}

// ============================================================================
// Execute
// ============================================================================

/**
 * Create a tenant.
 *
 * Order matters and is not incidental: the deny list is checked before any
 * write, the tenant row exists before anything references it, and the billing
 * row is written before the site settings so a failure leaves a tenant that
 * looks unbilled rather than a tenant with no billing row at all.
 */
export async function createTenant(
	db: TenantWriteDatabase,
	input: CreateTenantInput,
	options: CreateTenantOptions = {},
): Promise<{ tenantId: string; subdomain: string; plan: TenantCreationPlan }> {
	if (!input.forceIdentityReason) {
		await assertIdentityNotBlocked(db, input.email);
	} else {
		console.warn(
			`[Tenant] Deny list overridden for ${input.username}: ${input.forceIdentityReason}`,
		);
	}

	// Resolve the identity to attach. The onboarding row wins when both are
	// given — it is the row the signup flow just wrote.
	let groveauthId = input.groveauthId ?? null;
	if (input.onboardingId) {
		try {
			const onboardingRow = await db
				.prepare("SELECT groveauth_id FROM user_onboarding WHERE id = ?")
				.bind(input.onboardingId)
				.first<{ groveauth_id: string }>();
			if (onboardingRow?.groveauth_id) groveauthId = onboardingRow.groveauth_id;
		} catch (err) {
			logGroveError("Engine/Tenant", TENANT_ERRORS.USER_SYNC_FAILED, {
				cause: err,
				detail: "Step 4b pre-read — SELECT groveauth_id from user_onboarding",
				onboardingId: input.onboardingId,
			});
			throw err;
		}
		if (!groveauthId) {
			console.warn("[Tenant] Step 4b - No groveauth_id found, skipping users upsert");
		}
	}

	const plan = planTenantCreation(input, { groveauthId });

	if (options.dryRun) return { tenantId: plan.tenantId, subdomain: plan.subdomain, plan };

	for (const write of plan.writes) {
		try {
			await db
				.prepare(write.sql)
				.bind(...write.bindings)
				.run();
		} catch (err) {
			logGroveError("Engine/Tenant", TENANT_ERRORS[write.errorKey], {
				cause: err,
				detail: `Tenant creation step "${write.step}" failed`,
				tenantId: plan.tenantId,
				username: input.username,
				onboardingId: input.onboardingId ?? undefined,
			});
			throw err;
		}
	}

	if (input.onboardingId) {
		emitPulseEvent("signup.tenant_created", {
			app: "plant",
			route: "/api/select-plan",
			metadata: {
				tenant_id: plan.tenantId,
				subdomain: input.username,
				plan: input.plan,
				onboarding_id: input.onboardingId,
			},
		});
	}

	return { tenantId: plan.tenantId, subdomain: plan.subdomain, plan };
}

/**
 * Human-readable summary of what a plan would write, for `--dry-run`.
 *
 * Steps only — never bindings. A dry run is safe to paste into a ticket, and
 * the bindings contain an email address and a customer ID.
 */
export function describeTenantCreationPlan(plan: TenantCreationPlan): string[] {
	return plan.writes.map((w) => `${w.step} (${w.bindings.length} values)`);
}
