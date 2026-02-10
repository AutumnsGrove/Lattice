import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import {
  transformAllTiers,
  type PricingTier,
} from "@autumnsgrove/groveengine/grafts/pricing";
import { type TierKey, isValidTier } from "@autumnsgrove/groveengine/config";

// Valid billing cycles for database storage (maps from graft's "annual" to "yearly")
const VALID_BILLING_CYCLES = ["monthly", "yearly"] as const;
type BillingCycle = (typeof VALID_BILLING_CYCLES)[number];

// Transform all tiers including free (Wanderer) for onboarding
const tiers = transformAllTiers();

// Helper functions for validation
function isValidPlanId(id: string): id is TierKey {
  return isValidTier(id);
}

function isPlanAvailable(id: string): boolean {
  const tier = tiers.find((t) => t.key === id);
  return tier?.status === "available";
}

function getTierByKey(id: string): PricingTier | undefined {
  return tiers.find((t) => t.key === id);
}

export const load: PageServerLoad = async ({ parent, platform, cookies }) => {
  const { user, onboarding } = await parent();

  // Redirect if not authenticated
  if (!user) {
    redirect(302, "/");
  }

  // Redirect if profile not completed
  if (!onboarding?.profileCompleted) {
    redirect(302, "/profile");
  }

  // Redirect if email not verified
  if (!onboarding?.emailVerified) {
    redirect(302, "/verify-email");
  }

  // Redirect if already selected plan and paid
  if (onboarding?.paymentCompleted) {
    redirect(302, "/success");
  }

  // Check for comped/beta invite — skip plan selection entirely
  const db = platform?.env?.DB;
  if (db && user?.email) {
    try {
      const compedInvite = await db
        .prepare(
          `SELECT id, tier FROM comped_invites
           WHERE email = ? AND used_at IS NULL`,
        )
        .bind(user.email.toLowerCase())
        .first<{ id: string; tier: string }>();

      const validTiers = ["seedling", "sapling", "oak", "evergreen"];
      if (compedInvite && validTiers.includes(compedInvite.tier)) {
        // Auto-set the plan from the invite tier (idempotent — only if not already set)
        const onboardingId = cookies.get("onboarding_id");
        if (onboardingId) {
          await db
            .prepare(
              `UPDATE user_onboarding
               SET plan_selected = ?,
                   plan_billing_cycle = 'monthly',
                   plan_selected_at = unixepoch(),
                   updated_at = unixepoch()
               WHERE id = ? AND plan_selected IS NULL`,
            )
            .bind(compedInvite.tier, onboardingId)
            .run();
        }
        redirect(302, "/comped");
      }
    } catch (err) {
      // Don't block the plans page if the invite check fails
      if (
        err &&
        typeof err === "object" &&
        "status" in err &&
        (err as { status: number }).status >= 300 &&
        (err as { status: number }).status < 400
      ) {
        throw err;
      }
      console.error("[Plans] Error checking comped invite:", err);
    }
  }

  return {
    user,
    onboarding,
    tiers,
  };
};

export const actions: Actions = {
  default: async ({ request, cookies, platform }) => {
    const formData = await request.formData();
    const plan = formData.get("plan")?.toString();
    const billingCycle = formData.get("billingCycle")?.toString() || "monthly";

    // Validate plan
    if (!plan || !isValidPlanId(plan)) {
      return fail(400, { error: "Please select a valid plan" });
    }

    // Check plan availability
    if (!isPlanAvailable(plan)) {
      const selectedTier = getTierByKey(plan);
      const statusMessage =
        selectedTier?.status === "coming_soon"
          ? "This plan is coming soon and not yet available."
          : "This plan is not currently available.";
      return fail(400, { error: statusMessage });
    }

    if (!VALID_BILLING_CYCLES.includes(billingCycle as BillingCycle)) {
      return fail(400, { error: "Invalid billing cycle" });
    }

    // Get onboarding ID from cookie
    const onboardingId = cookies.get("onboarding_id");
    if (!onboardingId) {
      redirect(302, "/");
    }

    const db = platform?.env?.DB;
    if (!db) {
      return fail(500, { error: "Service temporarily unavailable" });
    }

    try {
      // Update onboarding record with selected plan
      await db
        .prepare(
          `UPDATE user_onboarding
					 SET plan_selected = ?,
							 plan_billing_cycle = ?,
							 plan_selected_at = unixepoch(),
							 updated_at = unixepoch()
					 WHERE id = ?`,
        )
        .bind(plan, billingCycle, onboardingId)
        .run();

      // Redirect to checkout
      redirect(302, "/checkout");
    } catch (err) {
      // Re-throw redirects
      if (
        err &&
        typeof err === "object" &&
        "status" in err &&
        err.status === 302
      ) {
        throw err;
      }
      console.error("[Plans] Error saving plan selection:", err);
      return fail(500, {
        error: "Unable to save selection. Please try again.",
      });
    }
  },
};
