import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "@autumnsgrove/lattice/errors";
import type { PageServerLoad, Actions } from "./$types";
import {
	getGreenhouseTenant,
	getTenantControllableGrafts,
	setTenantGraftOverride,
	resetTenantGraftOverrides,
	// Wayfinder-only imports
	getGreenhouseTenants,
	enrollInGreenhouse,
	removeFromGreenhouse,
	toggleGreenhouseStatus,
	getFeatureFlags,
	setFlagEnabled,
} from "@autumnsgrove/lattice/feature-flags";
import type { TenantGraftInfo } from "@autumnsgrove/lattice/feature-flags/tenant-grafts";
import type { GreenhouseTenant } from "@autumnsgrove/lattice/feature-flags/types";
import type { FeatureFlagSummary } from "@autumnsgrove/lattice/feature-flags/admin";
import { isWayfinder } from "@autumnsgrove/lattice/config/wayfinder";
import { isValidTier, type TierKey } from "@autumnsgrove/lattice/config/tiers";
import {
	validateUsernameAvailability,
	canChangeUsername,
	changeUsername,
	getUsernameHistory,
	type UsernameChangeHistoryEntry,
} from "@autumnsgrove/lattice/server/services/username";

export const load: PageServerLoad = async ({ locals, platform }) => {
	const env = platform?.env;

	// Check greenhouse status for this tenant
	let greenhouseStatus: {
		inGreenhouse: boolean;
		enrolledAt?: Date;
		notes?: string;
	} = { inGreenhouse: false };

	// Tenant-controllable grafts (only for greenhouse members)
	let tenantGrafts: TenantGraftInfo[] = [];

	// Wayfinder-only data for greenhouse admin
	let greenhouseTenants: GreenhouseTenant[] = [];
	const tenantNames: Record<string, string> = {};
	const availableTenants: Record<string, string> = {};
	let featureFlags: FeatureFlagSummary[] = [];

	const userIsWayfinder = isWayfinder(locals.user?.email);

	// Username change data
	let currentSubdomain = "";
	let tenantPlan = "seedling";
	let usernameChangeAllowed = false;
	let usernameChangeNextAllowedAt: number | undefined;
	let usernameChangeReason: string | undefined;
	let usernameHistory: UsernameChangeHistoryEntry[] = [];

	// Load greenhouse and username data in parallel (independent blocks)
	if (env?.DB && locals.tenantId) {
		const loadGreenhouse = async () => {
			if (!env.CACHE_KV) return;
			try {
				const tenant = await getGreenhouseTenant(locals.tenantId!, {
					DB: env.DB!,
					FLAGS_KV: env.CACHE_KV,
				});

				if (tenant && tenant.enabled) {
					greenhouseStatus = {
						inGreenhouse: true,
						enrolledAt: tenant.enrolledAt,
						notes: tenant.notes,
					};

					tenantGrafts = await getTenantControllableGrafts(locals.tenantId!, {
						DB: env.DB!,
						FLAGS_KV: env.CACHE_KV,
					});
				}

				if (userIsWayfinder) {
					const flagsEnv = { DB: env.DB!, FLAGS_KV: env.CACHE_KV };

					const [ghTenants, flags] = await Promise.all([
						getGreenhouseTenants(flagsEnv),
						getFeatureFlags(flagsEnv),
					]);

					greenhouseTenants = ghTenants;
					featureFlags = flags;

					const enrolledIds = new Set(ghTenants.map((t) => t.tenantId));

					interface TenantRow {
						id: string;
						username: string;
						display_name: string | null;
					}

					try {
						const result = await env
							.DB!.prepare("SELECT id, username, display_name FROM tenants ORDER BY username")
							.all<TenantRow>();

						for (const t of result.results ?? []) {
							const displayName = t.display_name || t.username || t.id;
							tenantNames[t.id] = displayName;

							if (!enrolledIds.has(t.id)) {
								availableTenants[t.id] = displayName;
							}
						}
					} catch (error) {
						console.error("Failed to load tenants for Wayfinder:", error);
					}
				}
			} catch (error) {
				console.error("Failed to check greenhouse status:", error);
			}
		};

		const loadUsername = async () => {
			try {
				const tenantRow = await env
					.DB!.prepare("SELECT subdomain, plan FROM tenants WHERE id = ?")
					.bind(locals.tenantId!)
					.first<{ subdomain: string; plan: string | null }>();

				if (tenantRow) {
					currentSubdomain = tenantRow.subdomain;
					tenantPlan = tenantRow.plan || "seedling";
				}

				const tier: TierKey = isValidTier(tenantPlan) ? (tenantPlan as TierKey) : "seedling";
				const [rateResult, history] = await Promise.all([
					canChangeUsername(env.DB!, locals.tenantId!, tier),
					getUsernameHistory(env.DB!, locals.tenantId!),
				]);
				usernameChangeAllowed = rateResult.allowed;
				usernameChangeNextAllowedAt = rateResult.nextAllowedAt;
				usernameChangeReason = rateResult.reason;
				usernameHistory = history;
			} catch (error) {
				console.error("Failed to load username change data:", error);
			}
		};

		await Promise.all([loadGreenhouse(), loadUsername()]);
	}

	return {
		isWayfinder: userIsWayfinder,
		greenhouseStatus,
		tenantGrafts,
		oauthAvatarUrl: locals.user?.picture ?? null,
		// Username change data
		currentSubdomain,
		tenantPlan,
		usernameChangeAllowed,
		usernameChangeNextAllowedAt,
		usernameChangeReason,
		usernameHistory,
		// Wayfinder-only data
		greenhouseTenants,
		tenantNames,
		availableTenants,
		featureFlags,
	};
};

export const actions: Actions = {
	changeUsername: async ({ request, locals, platform }) => {
		const env = platform?.env;
		if (!env?.DB) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		if (!locals.user || !locals.tenantId) {
			return fail(403, {
				error: ARBOR_ERRORS.UNAUTHORIZED.userMessage,
				error_code: ARBOR_ERRORS.UNAUTHORIZED.code,
			});
		}

		const formData = await request.formData();
		const newUsername = formData.get("newUsername")?.toString()?.toLowerCase().trim();

		if (!newUsername) {
			return fail(400, {
				error: ARBOR_ERRORS.FIELD_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.FIELD_REQUIRED.code,
			});
		}

		const tenantRow = await env.DB.prepare("SELECT subdomain, plan FROM tenants WHERE id = ?")
			.bind(locals.tenantId)
			.first<{ subdomain: string; plan: string | null }>();

		if (!tenantRow) {
			return fail(404, {
				error: ARBOR_ERRORS.RESOURCE_NOT_FOUND.userMessage,
				error_code: ARBOR_ERRORS.RESOURCE_NOT_FOUND.code,
			});
		}

		const currentSubdomain = tenantRow.subdomain;

		if (newUsername === currentSubdomain) {
			return fail(400, {
				error: ARBOR_ERRORS.USERNAME_SAME_AS_CURRENT.userMessage,
				error_code: ARBOR_ERRORS.USERNAME_SAME_AS_CURRENT.code,
			});
		}

		const validation = await validateUsernameAvailability(env.DB, newUsername, locals.tenantId);

		if (!validation.available) {
			return fail(400, {
				error: validation.error || ARBOR_ERRORS.USERNAME_UNAVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.USERNAME_UNAVAILABLE.code,
			});
		}

		const tier: TierKey = isValidTier(tenantRow.plan || "seedling")
			? ((tenantRow.plan || "seedling") as TierKey)
			: "seedling";
		const rateLimit = await canChangeUsername(env.DB, locals.tenantId, tier);

		if (!rateLimit.allowed) {
			return fail(429, {
				error: rateLimit.reason || ARBOR_ERRORS.USERNAME_CHANGE_RATE_LIMITED.userMessage,
				error_code: ARBOR_ERRORS.USERNAME_CHANGE_RATE_LIMITED.code,
			});
		}

		const result = await changeUsername(env.DB, {
			tenantId: locals.tenantId,
			currentSubdomain,
			newSubdomain: newUsername,
			actorEmail: locals.user.email || "unknown",
			tier,
		});

		if (!result.success) {
			logGroveError("Arbor", ARBOR_ERRORS.USERNAME_CHANGE_FAILED, {
				tenantId: locals.tenantId,
				from: currentSubdomain,
				to: newUsername,
				error: result.error,
			});
			return fail(500, {
				error: result.error || ARBOR_ERRORS.USERNAME_CHANGE_FAILED.userMessage,
				error_code: result.errorCode || ARBOR_ERRORS.USERNAME_CHANGE_FAILED.code,
			});
		}

		// Migrate drafts from old TenantDO to new TenantDO (best-effort)
		const tenantsDO = env.TENANTS as DurableObjectNamespace | undefined;
		if (tenantsDO) {
			try {
				const oldDoId = tenantsDO.idFromName(`tenant:${currentSubdomain}`);
				const oldStub = tenantsDO.get(oldDoId);
				const draftsResponse = await oldStub.fetch("https://tenant.internal/drafts");

				if (draftsResponse.ok) {
					const drafts = (await draftsResponse.json()) as Array<{
						slug: string;
						metadata: Record<string, unknown>;
						lastSaved: number;
						deviceId: string;
					}>;

					const draftsToMigrate = drafts.slice(0, 20);

					if (draftsToMigrate.length > 0) {
						const newDoId = tenantsDO.idFromName(`tenant:${newUsername}`);
						const newStub = tenantsDO.get(newDoId);

						for (let i = 0; i < draftsToMigrate.length; i += 5) {
							const batch = draftsToMigrate.slice(i, i + 5);
							await Promise.all(
								batch.map(async (draft) => {
									const fullDraftRes = await oldStub.fetch(
										`https://tenant.internal/drafts/${encodeURIComponent(draft.slug)}`,
									);
									if (fullDraftRes.ok) {
										const fullDraft = await fullDraftRes.json();
										await newStub.fetch(
											`https://tenant.internal/drafts/${encodeURIComponent(draft.slug)}`,
											{
												method: "PUT",
												headers: { "Content-Type": "application/json" },
												body: JSON.stringify(fullDraft),
											},
										);
									}
								}),
							);
						}
					}
				}
			} catch (draftErr) {
				console.warn("[Username] Draft migration failed (non-blocking):", draftErr);
			}

			// Push config to new TenantDO so first request is warm
			try {
				const newDoId = tenantsDO.idFromName(`tenant:${newUsername}`);
				const newStub = tenantsDO.get(newDoId);
				await newStub.fetch("https://tenant.internal/config", {
					method: "PUT",
					headers: {
						"X-Tenant-Subdomain": newUsername,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						subdomain: newUsername,
					}),
				});
			} catch (cacheErr) {
				console.warn("[Username] TenantDO cache push failed (non-blocking):", cacheErr);
			}
		}

		return {
			success: true,
			message: `Username changed to ${newUsername}`,
			newSubdomain: newUsername,
		};
	},

	toggleGraft: async ({ request, locals, platform }) => {
		const env = platform?.env;
		if (!env?.DB || !env?.CACHE_KV) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		if (!locals.tenantId) {
			return fail(403, {
				error: ARBOR_ERRORS.TENANT_CONTEXT_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.TENANT_CONTEXT_REQUIRED.code,
			});
		}

		const tenant = await getGreenhouseTenant(locals.tenantId, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!tenant?.enabled) {
			return fail(403, {
				error: ARBOR_ERRORS.GREENHOUSE_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.GREENHOUSE_REQUIRED.code,
			});
		}

		const formData = await request.formData();
		const graftId = formData.get("graftId")?.toString();
		const enabled = formData.get("enabled") === "true";

		if (!graftId) {
			return fail(400, {
				error: ARBOR_ERRORS.FIELD_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.FIELD_REQUIRED.code,
			});
		}

		const success = await setTenantGraftOverride(graftId, locals.tenantId, enabled, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!success) {
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}

		return {
			success: true,
			message: enabled ? `${graftId} enabled for your site` : `${graftId} disabled for your site`,
		};
	},

	resetGrafts: async ({ locals, platform }) => {
		const env = platform?.env;
		if (!env?.DB || !env?.CACHE_KV) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		if (!locals.tenantId) {
			return fail(403, {
				error: ARBOR_ERRORS.TENANT_CONTEXT_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.TENANT_CONTEXT_REQUIRED.code,
			});
		}

		const tenant = await getGreenhouseTenant(locals.tenantId, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!tenant?.enabled) {
			return fail(403, {
				error: ARBOR_ERRORS.GREENHOUSE_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.GREENHOUSE_REQUIRED.code,
			});
		}

		const count = await resetTenantGraftOverrides(locals.tenantId, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		return {
			success: true,
			message:
				count > 0
					? `Reset ${count} graft preference${count === 1 ? "" : "s"} to defaults`
					: "No custom preferences to reset",
		};
	},

	// Wayfinder-only actions
	enrollTenant: async ({ request, locals, platform }) => {
		if (!isWayfinder(locals.user?.email)) {
			return fail(403, {
				error: ARBOR_ERRORS.ACCESS_DENIED.userMessage,
				error_code: ARBOR_ERRORS.ACCESS_DENIED.code,
			});
		}

		const env = platform?.env;
		if (!env?.DB || !env?.CACHE_KV) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const tenantId = formData.get("tenantId")?.toString();
		const notes = formData.get("notes")?.toString() || undefined;

		if (!tenantId) {
			return fail(400, {
				error: ARBOR_ERRORS.FIELD_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.FIELD_REQUIRED.code,
			});
		}

		const success = await enrollInGreenhouse(tenantId, locals.user?.email || "wayfinder", notes, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!success) {
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}

		return { success: true, message: "Tenant enrolled in greenhouse" };
	},

	removeTenant: async ({ request, locals, platform }) => {
		if (!isWayfinder(locals.user?.email)) {
			return fail(403, {
				error: ARBOR_ERRORS.ACCESS_DENIED.userMessage,
				error_code: ARBOR_ERRORS.ACCESS_DENIED.code,
			});
		}

		const env = platform?.env;
		if (!env?.DB || !env?.CACHE_KV) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const tenantId = formData.get("tenantId")?.toString();

		if (!tenantId) {
			return fail(400, {
				error: ARBOR_ERRORS.FIELD_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.FIELD_REQUIRED.code,
			});
		}

		const success = await removeFromGreenhouse(tenantId, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!success) {
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}

		return { success: true, message: "Tenant removed from greenhouse" };
	},

	toggleTenant: async ({ request, locals, platform }) => {
		if (!isWayfinder(locals.user?.email)) {
			return fail(403, {
				error: ARBOR_ERRORS.ACCESS_DENIED.userMessage,
				error_code: ARBOR_ERRORS.ACCESS_DENIED.code,
			});
		}

		const env = platform?.env;
		if (!env?.DB || !env?.CACHE_KV) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const tenantId = formData.get("tenantId")?.toString();
		const enabled = formData.get("enabled") === "true";

		if (!tenantId) {
			return fail(400, {
				error: ARBOR_ERRORS.FIELD_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.FIELD_REQUIRED.code,
			});
		}

		const success = await toggleGreenhouseStatus(tenantId, enabled, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!success) {
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}

		return {
			success: true,
			message: enabled ? "Greenhouse access enabled" : "Greenhouse access disabled",
		};
	},

	cultivateFlag: async ({ request, locals, platform }) => {
		if (!isWayfinder(locals.user?.email)) {
			return fail(403, {
				error: ARBOR_ERRORS.ACCESS_DENIED.userMessage,
				error_code: ARBOR_ERRORS.ACCESS_DENIED.code,
			});
		}

		const env = platform?.env;
		if (!env?.DB || !env?.CACHE_KV) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const flagId = formData.get("flagId")?.toString();

		if (!flagId) {
			return fail(400, {
				error: ARBOR_ERRORS.FIELD_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.FIELD_REQUIRED.code,
			});
		}

		const success = await setFlagEnabled(flagId, true, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!success) {
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}

		return { success: true, message: `${flagId} is now cultivated` };
	},

	pruneFlag: async ({ request, locals, platform }) => {
		if (!isWayfinder(locals.user?.email)) {
			return fail(403, {
				error: ARBOR_ERRORS.ACCESS_DENIED.userMessage,
				error_code: ARBOR_ERRORS.ACCESS_DENIED.code,
			});
		}

		const env = platform?.env;
		if (!env?.DB || !env?.CACHE_KV) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const flagId = formData.get("flagId")?.toString();

		if (!flagId) {
			return fail(400, {
				error: ARBOR_ERRORS.FIELD_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.FIELD_REQUIRED.code,
			});
		}

		const success = await setFlagEnabled(flagId, false, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!success) {
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}

		return { success: true, message: `${flagId} is now pruned` };
	},
};
