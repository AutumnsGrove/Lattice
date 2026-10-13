import { error } from "@sveltejs/kit";
import { ARBOR_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";
import type { PageServerLoad, Actions } from "./$types";
import { type TierKey, getTier } from "@autumnsgrove/lattice/platform/config/tiers";
import { getTenantStorageUsed } from "@autumnsgrove/lattice/server/services/gallery-storage";

/**
 * Account & Subscription Management Page
 *
 * Allows users to:
 * - View current subscription status
 * - Cancel/resume subscription
 * - Change plan (upgrade/downgrade)
 * - Access billing portal for payment updates
 * - Export their data
 */

interface BillingRecord {
	id: string;
	tenant_id: string;
	plan: string;
	status: string;
	provider_customer_id: string | null;
	provider_subscription_id: string | null;
	current_period_start: number | null;
	current_period_end: number | null;
	cancel_at_period_end: number;
	payment_method_last4: string | null;
	payment_method_brand: string | null;
	created_at: number;
	updated_at: number;
}

interface TenantRecord {
	id: string;
	subdomain: string;
	display_name: string;
	email: string;
	plan: string;
	created_at: number;
}

export const load: PageServerLoad = async ({ locals, platform, parent, cookies }) => {
	const parentData = await parent();

	if (!locals.tenantId) {
		throwGroveError(400, ARBOR_ERRORS.TENANT_CONTEXT_REQUIRED, "Arbor");
	}

	if (!platform?.env?.DB) {
		// This is a critical infrastructure failure - fail hard.
		// Query-level errors below use graceful degradation (billingError, usageError).
		throwGroveError(500, ARBOR_ERRORS.DB_NOT_AVAILABLE, "Arbor");
	}

	// ISOLATED QUERIES: D1 queries are fast (~50ms) and critical for page render
	let billing: BillingRecord | null = null;
	let billingError = false;
	let tenant: TenantRecord | null = null;
	let usageError = false;

	// Await critical D1 queries
	const [billingResult, tenantResult] = await Promise.all([
		// Billing query
		platform.env.DB.prepare(
			`SELECT id, tenant_id, plan, status, provider_customer_id, provider_subscription_id,
              current_period_start, current_period_end, cancel_at_period_end,
              payment_method_last4, payment_method_brand,
              created_at, updated_at
       FROM platform_billing WHERE tenant_id = ?`,
		)
			.bind(locals.tenantId)
			.first<BillingRecord>()
			.catch((e) => {
				console.error("[Account] Failed to load billing:", e);
				billingError = true;
				return null;
			}),

		// Tenant query (limits come from tier config, not DB)
		platform.env.DB.prepare(
			`SELECT id, subdomain, display_name, email, plan, created_at
       FROM tenants WHERE id = ?`,
		)
			.bind(locals.tenantId)
			.first<TenantRecord>()
			.catch((e) => {
				console.error("[Account] Failed to load tenant:", e);
				usageError = true;
				return null;
			}),
	]);

	billing = billingResult;
	tenant = tenantResult;

	// Load export counts for size validation in frontend
	// This prevents users from wasting rate limit quota on oversized exports
	const MAX_EXPORT_ITEMS = 5000;
	let exportCounts = { posts: 0, pages: 0, media: 0 };
	let exportTooLarge = false;
	let storageUsedBytes = 0;
	try {
		const [postResult, pageResult, mediaResult, storageResult] = await Promise.all([
			platform.env.DB.prepare("SELECT COUNT(*) as count FROM posts WHERE tenant_id = ?")
				.bind(locals.tenantId)
				.first<{ count: number }>()
				.catch((e) => {
					console.error("[Account] Failed to load post count:", e);
					return null;
				}),
			platform.env.DB.prepare("SELECT COUNT(*) as count FROM pages WHERE tenant_id = ?")
				.bind(locals.tenantId)
				.first<{ count: number }>()
				.catch((e) => {
					console.error("[Account] Failed to load page count:", e);
					return null;
				}),
			// gallery_images is the primary image store (media table is legacy/empty)
			platform.env.DB.prepare("SELECT COUNT(*) as count FROM gallery_images WHERE tenant_id = ?")
				.bind(locals.tenantId)
				.first<{ count: number }>()
				.catch((e) => {
					console.error("[Account] Failed to load media count:", e);
					return null;
				}),
			getTenantStorageUsed(platform.env.DB, locals.tenantId),
		]);
		if (storageResult.ok) {
			storageUsedBytes = storageResult.bytes;
		} else {
			usageError = true;
		}
		exportCounts = {
			posts: postResult?.count ?? 0,
			pages: pageResult?.count ?? 0,
			media: mediaResult?.count ?? 0,
		};
		exportTooLarge = Object.values(exportCounts).some((count) => count > MAX_EXPORT_ITEMS);
	} catch (e) {
		console.error("[Account] Failed to load export counts:", e);
		// Non-critical - continue without counts
	}

	// Get tier configuration
	// Prioritize billing.plan (source of truth from Stripe) using nullish coalescing
	const currentPlan = (billing?.plan ?? tenant?.plan ?? "seedling") as TierKey;
	const tierConfig = getTier(currentPlan);

	// Build billing data - handle comped accounts (oak/evergreen without billing record)
	const isCompedPremium = !billing && ["oak", "evergreen"].includes(currentPlan);

	const billingData = billing
		? {
				plan: billing.plan,
				status: billing.status,
				hasSubscription:
					!!billing.provider_subscription_id || ["oak", "evergreen"].includes(billing.plan),
				currentPeriodStart: billing.current_period_start
					? new Date(billing.current_period_start * 1000).toISOString()
					: null,
				currentPeriodEnd: billing.current_period_end
					? new Date(billing.current_period_end * 1000).toISOString()
					: null,
				cancelAtPeriodEnd: billing.cancel_at_period_end === 1,
				paymentMethod: billing.payment_method_last4
					? {
							last4: billing.payment_method_last4,
							brand: billing.payment_method_brand,
						}
					: null,
				customerId: billing.provider_customer_id,
			}
		: isCompedPremium
			? {
					// Synthetic billing for comped premium accounts (admin, invited, etc.)
					plan: currentPlan,
					status: "active" as const,
					hasSubscription: true,
					currentPeriodStart: null,
					currentPeriodEnd: null,
					cancelAtPeriodEnd: false,
					paymentMethod: null,
					customerId: null,
				}
			: null;

	return {
		...parentData,
		tenantId: locals.tenantId,
		isComped: isCompedPremium,
		billing: billingData,
		billingError,
		usage: tenant
			? {
					// Use actual storage from gallery_images.file_size, not stale tenants.storage_used
					storageUsed: storageUsedBytes,
					storageLimit: tierConfig.limits.storage,
					// Use actual post count from posts table, not stale tenants.post_count
					postCount: exportCounts.posts,
					postLimit: tierConfig.limits.posts === Infinity ? null : tierConfig.limits.posts,
					accountAge: tenant.created_at
						? Math.floor((Date.now() / 1000 - tenant.created_at) / (24 * 60 * 60))
						: 0,
				}
			: null,
		usageError,
		exportCounts,
		exportTooLarge,
		currentPlan,
		tierConfig: {
			name: tierConfig.display.name,
			tagline: tierConfig.display.tagline,
			icon: tierConfig.display.icon,
			features: tierConfig.display.featureStrings,
			support: tierConfig.support.displayString,
		},
	};
};
