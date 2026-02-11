/**
 * Upload Gate — Centralized Upload Permission Check
 *
 * Replaces the scattered greenhouse + photo_gallery checks with a clean
 * two-flag system:
 *   - `image_uploads` — master switch (feature exists)
 *   - `uploads_suspended` — per-tenant suspension (default: everyone suspended)
 *
 * canUpload = image_uploads && !uploads_suspended
 *
 * When PhotoDNA is approved, flip `uploads_suspended` default to `false`
 * and all tenants are unsuspended at once.
 *
 * @see migrations/055_upload_gate_redesign.sql
 */

import { isFeatureEnabled } from "../feature-flags/index.js";
import type { FeatureFlagsEnv } from "../feature-flags/types.js";

export interface UploadGateResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a tenant can upload images.
 *
 * @param tenantId - The tenant to check
 * @param userId - The user uploading (for future per-user rules)
 * @param env - Cloudflare environment bindings (DB + FLAGS_KV)
 * @returns Whether uploads are allowed, with a reason if not
 *
 * @example
 * ```typescript
 * const gate = await canUploadImages(locals.tenantId, locals.user.id, flagsEnv);
 * if (!gate.allowed) {
 *   throwGroveError(403, API_ERRORS.FEATURE_DISABLED, "API");
 * }
 * ```
 */
export async function canUploadImages(
  tenantId: string,
  userId: string | undefined,
  env: FeatureFlagsEnv,
): Promise<UploadGateResult> {
  const context = { tenantId, userId };

  // Check 1: Is the image upload feature globally enabled?
  const featureEnabled = await isFeatureEnabled(
    "image_uploads",
    context,
    env,
  ).catch(() => false);

  if (!featureEnabled) {
    return { allowed: false, reason: "Image uploads are disabled" };
  }

  // Check 2: Is this tenant suspended from uploads?
  // Default is true (suspended), tenant rules can override to false (unsuspended)
  const isSuspended = await isFeatureEnabled(
    "uploads_suspended",
    context,
    env,
  ).catch(() => true); // Fail-closed: assume suspended on error

  if (isSuspended) {
    return {
      allowed: false,
      reason: "Image uploads are suspended for this account",
    };
  }

  return { allowed: true };
}
