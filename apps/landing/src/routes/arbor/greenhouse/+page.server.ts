import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import {
	getGreenhouseTenants,
	getFeatureFlags,
	setFlagEnabled,
	setFlagMaturity,
} from "@autumnsgrove/lattice/feature-flags";
import type { FeatureFlagSummary } from "@autumnsgrove/lattice/feature-flags";
import { parseFormData } from "@autumnsgrove/lattice/server";
import { isWayfinder } from "@autumnsgrove/lattice/config";
import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────

const FlagIdSchema = z.object({
	flagId: z.string().min(1, "Flag ID is required"),
});

const MaturitySchema = z.object({
	flagId: z.string().min(1, "Flag ID is required"),
	maturity: z.enum(["experimental", "beta", "stable", "graduated"]),
});

// ── Load ─────────────────────────────────────────────────────────────

export const load: PageServerLoad = async ({ parent, platform }) => {
	const parentData = await parent();
	if (!parentData.isWayfinder) {
		throw redirect(302, "/arbor");
	}

	const env = platform?.env;
	if (!env?.DB || !env?.CACHE_KV) {
		return {
			enrolledCount: 0,
			activeCount: 0,
			featureFlags: [] as FeatureFlagSummary[],
		};
	}

	const flagsEnv = { DB: env.DB, FLAGS_KV: env.CACHE_KV };
	const [greenhouseTenants, featureFlags] = await Promise.all([
		getGreenhouseTenants(flagsEnv),
		getFeatureFlags(flagsEnv),
	]);

	return {
		enrolledCount: greenhouseTenants.length,
		activeCount: greenhouseTenants.filter((t) => t.enabled).length,
		featureFlags,
	};
};

// ── Actions ──────────────────────────────────────────────────────────

export const actions: Actions = {
	cultivate: async ({ request, locals, platform }) => {
		if (!locals.user || !isWayfinder(locals.user.email)) {
			return fail(403, { error: "Unauthorized" });
		}

		const env = platform?.env;
		if (!env?.DB || !env?.CACHE_KV) {
			return fail(500, { error: "Database not available" });
		}

		const result = parseFormData(await request.formData(), FlagIdSchema);
		if (!result.success) {
			return fail(400, { error: result.errors[0] ?? "Invalid input" });
		}

		const success = await setFlagEnabled(result.data.flagId, true, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!success) {
			return fail(500, { error: "Failed to cultivate flag" });
		}

		return { success: true, message: `${result.data.flagId} is now cultivated` };
	},

	prune: async ({ request, locals, platform }) => {
		if (!locals.user || !isWayfinder(locals.user.email)) {
			return fail(403, { error: "Unauthorized" });
		}

		const env = platform?.env;
		if (!env?.DB || !env?.CACHE_KV) {
			return fail(500, { error: "Database not available" });
		}

		const result = parseFormData(await request.formData(), FlagIdSchema);
		if (!result.success) {
			return fail(400, { error: result.errors[0] ?? "Invalid input" });
		}

		const success = await setFlagEnabled(result.data.flagId, false, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!success) {
			return fail(500, { error: "Failed to prune flag" });
		}

		return { success: true, message: `${result.data.flagId} is now pruned` };
	},

	setMaturity: async ({ request, locals, platform }) => {
		if (!locals.user || !isWayfinder(locals.user.email)) {
			return fail(403, { error: "Unauthorized" });
		}

		const env = platform?.env;
		if (!env?.DB || !env?.CACHE_KV) {
			return fail(500, { error: "Database not available" });
		}

		const result = parseFormData(await request.formData(), MaturitySchema);
		if (!result.success) {
			return fail(400, { error: result.errors[0] ?? "Invalid input" });
		}

		const success = await setFlagMaturity(result.data.flagId, result.data.maturity, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!success) {
			return fail(500, { error: "Failed to update maturity" });
		}

		return { success: true, message: `${result.data.flagId} is now ${result.data.maturity}` };
	},
};
