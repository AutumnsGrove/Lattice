/**
 * Comped Welcome Page Server
 *
 * Handles comped users who skip payment. Creates their tenant directly
 * and marks their comped invite as used.
 */

import { redirect, error } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { createTenant, getTenantForOnboarding } from "$lib/server/tenant";

interface CompedInvite {
  id: string;
  email: string;
  tier: "seedling" | "sapling" | "oak" | "evergreen";
  custom_message: string | null;
  invited_by: string;
}

export const load: PageServerLoad = async ({ parent, cookies, platform }) => {
  const { user, onboarding } = await parent();

  // Redirect if not authenticated
  if (!user) {
    redirect(302, "/");
  }

  // Redirect if profile not completed
  if (!onboarding?.profileCompleted) {
    redirect(302, "/profile");
  }

  // Redirect if no plan selected
  if (!onboarding?.planSelected) {
    redirect(302, "/plans");
  }

  // If tenant already created, redirect to success
  if (onboarding?.tenantCreated) {
    redirect(302, "/success");
  }

  const db = platform?.env?.DB;
  if (!db) {
    throw error(503, "Database not available");
  }

  // Check for comped invite
  const compedInvite = await db
    .prepare(
      `SELECT id, email, tier, custom_message, invited_by
       FROM comped_invites
       WHERE email = ? AND used_at IS NULL`,
    )
    .bind(user.email.toLowerCase())
    .first<CompedInvite>();

  if (!compedInvite) {
    // Not comped - redirect to regular checkout
    redirect(302, "/checkout");
  }

  return {
    user,
    onboarding,
    compedInvite: {
      tier: compedInvite.tier,
      customMessage: compedInvite.custom_message,
      invitedBy: compedInvite.invited_by,
    },
  };
};

export const actions: Actions = {
  /**
   * Claim the comped invite and create the tenant
   */
  claim: async ({ cookies, platform, request }) => {
    const onboardingId = cookies.get("onboarding_id");
    if (!onboardingId) {
      throw error(401, "Session expired");
    }

    const db = platform?.env?.DB;
    if (!db) {
      throw error(503, "Database not available");
    }

    // Get onboarding data
    const onboarding = await db
      .prepare(
        `SELECT id, email, username, display_name, favorite_color, plan_selected
         FROM user_onboarding WHERE id = ?`,
      )
      .bind(onboardingId)
      .first();

    if (!onboarding) {
      throw error(404, "Onboarding session not found");
    }

    // Check for comped invite
    const compedInvite = await db
      .prepare(
        `SELECT id, email, tier, custom_message
         FROM comped_invites
         WHERE email = ? AND used_at IS NULL`,
      )
      .bind((onboarding.email as string).toLowerCase())
      .first<CompedInvite>();

    if (!compedInvite) {
      throw error(403, "No valid comped invite found");
    }

    // Check if tenant already exists
    const existingTenant = await getTenantForOnboarding(db, onboardingId);
    if (existingTenant) {
      return {
        success: true,
        subdomain: existingTenant.subdomain,
      };
    }

    try {
      // Create the tenant with the comped tier (not the selected plan)
      // Comped users get the tier specified in their invite
      const { tenantId, subdomain } = await createTenant(db, {
        onboardingId: onboarding.id as string,
        username: onboarding.username as string,
        displayName: onboarding.display_name as string,
        email: onboarding.email as string,
        plan: compedInvite.tier,
        favoriteColor: onboarding.favorite_color as string | null,
        // No provider IDs for comped accounts
        providerCustomerId: null,
        providerSubscriptionId: null,
      });

      // Mark onboarding as payment completed (even though no payment)
      await db
        .prepare(
          `UPDATE user_onboarding
           SET payment_completed_at = unixepoch(),
               plan_selected = ?,
               updated_at = unixepoch()
           WHERE id = ?`,
        )
        .bind(compedInvite.tier, onboardingId)
        .run();

      // Mark the comped invite as used
      await db
        .prepare(
          `UPDATE comped_invites
           SET used_at = unixepoch(), used_by_tenant_id = ?
           WHERE id = ?`,
        )
        .bind(tenantId, compedInvite.id)
        .run();

      // Add audit log entry
      const auditId = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO comped_invites_audit (id, action, invite_id, email, tier, actor_email, notes, created_at)
           VALUES (?, 'use', ?, ?, ?, ?, ?, unixepoch())`,
        )
        .bind(
          auditId,
          compedInvite.id,
          compedInvite.email,
          compedInvite.tier,
          onboarding.email as string,
          `Claimed by ${onboarding.username}`,
        )
        .run();

      console.log("[Comped] Tenant created for comped user:", {
        tenantId,
        subdomain,
        tier: compedInvite.tier,
        email: onboarding.email,
      });

      return {
        success: true,
        subdomain,
      };
    } catch (err) {
      console.error("[Comped] Error creating tenant:", err);
      throw error(500, "Failed to create your blog. Please try again.");
    }
  },
};
