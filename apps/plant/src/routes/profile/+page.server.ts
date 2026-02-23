import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { PLANT_ERRORS, logPlantError } from "$lib/errors";
import { z } from "zod";
import { parseFormData } from "@autumnsgrove/lattice/server";

// ─── Zod schema for profile form validation (Rootwork Phase 3) ──────
const ProfileSchema = z.object({
	displayName: z.string().trim().min(1, "Display name is required"),
	username: z
		.string()
		.trim()
		.toLowerCase()
		.min(3, "Username must be 3-30 characters")
		.max(30, "Username must be 3-30 characters")
		.regex(
			/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
			"Username must start with a letter and contain only lowercase letters, numbers, and hyphens",
		),
	favoriteColor: z.string().optional().default(""),
	interests: z.string().optional().default("[]"),
});

const InterestsSchema = z.array(z.string()).max(20);

export const load: PageServerLoad = async ({ parent }) => {
	const { user, onboarding } = await parent();

	// Redirect if not authenticated
	if (!user) {
		redirect(302, "/");
	}

	// Redirect if profile already completed
	if (onboarding?.profileCompleted) {
		redirect(302, "/plans");
	}

	return {
		user,
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, platform }) => {
		const formData = await request.formData();
		const result = parseFormData(formData, ProfileSchema);
		if (!result.success) {
			const firstError = Object.values(result.errors).flat()[0];
			return fail(400, { error: firstError || "Invalid form data" });
		}

		const { displayName, username } = result.data;
		const favoriteColor = result.data.favoriteColor || null;
		const interestsRaw = result.data.interests;

		// Get onboarding ID from cookie
		const onboardingId = cookies.get("onboarding_id");
		if (!onboardingId) {
			logPlantError(PLANT_ERRORS.COOKIE_ERROR, {
				path: "/profile",
				detail: "Missing onboarding_id cookie in profile form action",
			});
			redirect(302, "/");
		}

		const db = platform?.env?.DB;
		if (!db) {
			logPlantError(PLANT_ERRORS.DB_UNAVAILABLE, { path: "/profile" });
			return fail(500, { error: "Service temporarily unavailable" });
		}

		// ─── Double-check username availability ──────────────────────────
		try {
			const reserved = await db
				.prepare("SELECT username FROM reserved_usernames WHERE username = ?")
				.bind(username)
				.first();

			if (reserved) {
				return fail(400, { error: "This username is reserved" });
			}
		} catch (err) {
			logPlantError(PLANT_ERRORS.ONBOARDING_QUERY_FAILED, {
				path: "/profile",
				detail: "SELECT reserved_usernames failed",
				cause: err,
			});
			return fail(500, {
				error: "Unable to check username. Please try again.",
			});
		}

		try {
			const existingTenant = await db
				.prepare("SELECT subdomain FROM tenants WHERE subdomain = ?")
				.bind(username)
				.first();

			if (existingTenant) {
				return fail(400, { error: "This username is already taken" });
			}
		} catch (err) {
			logPlantError(PLANT_ERRORS.TENANT_QUERY_FAILED, {
				path: "/profile",
				detail: "SELECT tenants for username check failed",
				cause: err,
			});
			return fail(500, {
				error: "Unable to check username. Please try again.",
			});
		}

		// ─── Parse interests (validated with Zod) ────────────────────────
		let interests: string[] = [];
		try {
			const parsed = interestsRaw ? JSON.parse(interestsRaw) : [];
			const validated = InterestsSchema.safeParse(parsed);
			interests = validated.success ? validated.data : [];
		} catch {
			interests = [];
		}

		// ─── Update onboarding record ────────────────────────────────────
		try {
			await db
				.prepare(
					`UPDATE user_onboarding
					 SET display_name = ?,
							 username = ?,
							 favorite_color = ?,
							 interests = ?,
							 profile_completed_at = unixepoch(),
							 updated_at = unixepoch()
					 WHERE id = ?`,
				)
				.bind(displayName, username, favoriteColor, JSON.stringify(interests), onboardingId)
				.run();
		} catch (err) {
			logPlantError(PLANT_ERRORS.ONBOARDING_UPDATE_FAILED, {
				path: "/profile",
				detail: `UPDATE user_onboarding profile fields for id=${onboardingId}`,
				cause: err,
			});
			return fail(500, { error: "Unable to save profile. Please try again." });
		}

		// ─── Verify email status before redirecting ──────────────────────
		// (diagnostic: confirm magic link set email_verified correctly)
		try {
			const record = await db
				.prepare("SELECT email_verified FROM user_onboarding WHERE id = ?")
				.bind(onboardingId)
				.first<{ email_verified: number | null }>();

			console.log(
				`[Profile] Saved profile for ${onboardingId.slice(0, 8)}... ` +
					`username=${username}, email_verified=${record?.email_verified}`,
			);
		} catch {
			// Non-critical diagnostic — don't block the redirect
		}

		// Redirect to plan selection
		redirect(302, "/plans");
	},
};
