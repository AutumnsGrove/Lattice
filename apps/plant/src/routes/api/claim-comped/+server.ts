/**
 * API: Claim Comped Invite
 *
 * POST /api/claim-comped
 *
 * JSON API endpoint for claiming a comped/beta invite.
 * Creates the tenant and marks the invite as used.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createTenant, getTenantForOnboarding } from "$lib/server/tenant";
import { PLANT_ERRORS, logPlantError } from "$lib/errors";

interface CompedInvite {
  id: string;
  email: string;
  tier: "seedling" | "sapling" | "oak" | "evergreen";
  invite_type: "comped" | "beta";
  custom_message: string | null;
}

export const POST: RequestHandler = async ({ cookies, platform }) => {
  const onboardingId = cookies.get("onboarding_id");
  if (!onboardingId) {
    logPlantError(PLANT_ERRORS.COOKIE_ERROR, {
      path: "/api/claim-comped",
      detail: "Missing onboarding_id cookie",
    });
    return json(
      { error: "Session expired. Please sign in again." },
      { status: 401 },
    );
  }

  const db = platform?.env?.DB;
  if (!db) {
    logPlantError(PLANT_ERRORS.DB_UNAVAILABLE, { path: "/api/claim-comped" });
    return json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  // Get onboarding data
  let onboarding: Record<string, unknown> | null;
  try {
    onboarding = await db
      .prepare(
        `SELECT id, email, username, display_name, favorite_color, plan_selected
         FROM user_onboarding WHERE id = ?`,
      )
      .bind(onboardingId)
      .first();
  } catch (err) {
    logPlantError(PLANT_ERRORS.ONBOARDING_QUERY_FAILED, {
      path: "/api/claim-comped",
      detail: "SELECT user_onboarding failed",
      cause: err,
    });
    return json(
      { error: "Unable to load your session. Please try again." },
      { status: 500 },
    );
  }

  if (!onboarding) {
    return json(
      { error: "Onboarding session not found. Please sign in again." },
      { status: 404 },
    );
  }

  // Check for comped invite
  let compedInvite: CompedInvite | null;
  try {
    compedInvite = await db
      .prepare(
        `SELECT id, email, tier, invite_type, custom_message
         FROM comped_invites
         WHERE email = ? AND used_at IS NULL`,
      )
      .bind((onboarding.email as string).toLowerCase())
      .first<CompedInvite>();
  } catch (err) {
    logPlantError(PLANT_ERRORS.ONBOARDING_QUERY_FAILED, {
      path: "/api/claim-comped",
      detail: "SELECT comped_invites failed",
      cause: err,
    });
    return json(
      { error: "Unable to verify your invite. Please try again." },
      { status: 500 },
    );
  }

  if (!compedInvite) {
    return json(
      { error: "No valid invite found for this account." },
      { status: 403 },
    );
  }

  // Check if tenant already exists (idempotent)
  const existingTenant = await getTenantForOnboarding(db, onboardingId);
  if (existingTenant) {
    return json({
      success: true,
      redirect: "/success",
      subdomain: existingTenant.subdomain,
    });
  }

  try {
    // Create the tenant with the comped tier
    const { tenantId, subdomain } = await createTenant(db, {
      onboardingId: onboarding.id as string,
      username: onboarding.username as string,
      displayName: onboarding.display_name as string,
      email: onboarding.email as string,
      plan: compedInvite.tier,
      favoriteColor: onboarding.favorite_color as string | null,
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

    // Audit log
    const auditId = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO comped_invites_audit (id, action, invite_id, email, tier, invite_type, actor_email, notes, created_at)
         VALUES (?, 'use', ?, ?, ?, ?, ?, ?, unixepoch())`,
      )
      .bind(
        auditId,
        compedInvite.id,
        compedInvite.email,
        compedInvite.tier,
        compedInvite.invite_type,
        onboarding.email as string,
        `Claimed by ${onboarding.username}`,
      )
      .run();

    console.log("[Claim Comped API] Tenant created:", {
      tenantId,
      subdomain,
      tier: compedInvite.tier,
    });

    return json({
      success: true,
      redirect: "/success",
      subdomain,
    });
  } catch (err) {
    logPlantError(PLANT_ERRORS.ONBOARDING_UPDATE_FAILED, {
      path: "/api/claim-comped",
      detail: "Tenant creation or invite claim failed",
      cause: err,
    });
    return json(
      { error: "Failed to create your blog. Please try again." },
      { status: 500 },
    );
  }
};
