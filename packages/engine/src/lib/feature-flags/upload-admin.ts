/**
 * Upload Admin — Management Functions for Upload Suspension
 *
 * Provides admin functions to view and toggle per-tenant upload suspension.
 * Used by the /arbor/uploads admin page.
 *
 * @see migrations/055_upload_gate_redesign.sql
 */

import { invalidateFlag } from "./cache.js";
import type { FeatureFlagsEnv } from "./types.js";

const UPLOADS_SUSPENDED_FLAG = "uploads_suspended";

export interface TenantUploadStatus {
  tenantId: string;
  /** True if uploads are suspended (default state) */
  suspended: boolean;
  /** The flag_rules row ID if an unsuspend rule exists */
  ruleId: number | null;
}

/**
 * Get upload suspension status for all tenants.
 *
 * Joins the tenants table with flag_rules for uploads_suspended to determine
 * which tenants have been individually unsuspended.
 *
 * @param env - Cloudflare environment bindings
 * @returns Array of tenant upload statuses
 */
export async function getUploadSuspensionStatus(
  env: FeatureFlagsEnv,
): Promise<TenantUploadStatus[]> {
  try {
    const result = await env.DB.prepare(
      `SELECT
        t.id as tenant_id,
        fr.id as rule_id,
        fr.result_value
      FROM tenants t
      LEFT JOIN flag_rules fr ON (
        fr.flag_id = ?
        AND fr.rule_type = 'tenant'
        AND fr.enabled = 1
        AND json_extract(fr.rule_value, '$.tenantIds') LIKE '%' || t.id || '%'
      )
      ORDER BY t.username`,
    )
      .bind(UPLOADS_SUSPENDED_FLAG)
      .all<{
        tenant_id: string;
        rule_id: number | null;
        result_value: string | null;
      }>();

    return (result.results ?? []).map((row) => {
      // A tenant is unsuspended if they have a rule that evaluates to false
      const hasUnsuspendRule =
        row.rule_id !== null && row.result_value === "false";

      return {
        tenantId: row.tenant_id,
        suspended: !hasUnsuspendRule,
        ruleId: row.rule_id,
      };
    });
  } catch (error) {
    console.error("[UploadAdmin] Failed to load suspension status:", error);
    return [];
  }
}

/**
 * Set upload suspension for a specific tenant.
 *
 * - Unsuspend: INSERT a flag_rules row with result_value='false'
 * - Re-suspend: DELETE that rule (falls back to default 'true')
 *
 * @param tenantId - The tenant to modify
 * @param suspended - True to suspend, false to unsuspend
 * @param env - Cloudflare environment bindings
 * @returns True if the operation succeeded
 */
export async function setUploadSuspension(
  tenantId: string,
  suspended: boolean,
  env: FeatureFlagsEnv,
): Promise<boolean> {
  try {
    if (suspended) {
      // Re-suspend: delete the unsuspend rule (tenant falls back to default=true)
      await env.DB.prepare(
        `DELETE FROM flag_rules
         WHERE flag_id = ?
           AND rule_type = 'tenant'
           AND enabled = 1
           AND json_extract(rule_value, '$.tenantIds') LIKE '%' || ? || '%'`,
      )
        .bind(UPLOADS_SUSPENDED_FLAG, tenantId)
        .run();
    } else {
      // Unsuspend: create a tenant rule that overrides to false
      // First check if one already exists
      const existing = await env.DB.prepare(
        `SELECT id FROM flag_rules
         WHERE flag_id = ?
           AND rule_type = 'tenant'
           AND json_extract(rule_value, '$.tenantIds') LIKE '%' || ? || '%'`,
      )
        .bind(UPLOADS_SUSPENDED_FLAG, tenantId)
        .first<{ id: number }>();

      if (existing) {
        // Update existing rule to ensure it's enabled and result is false
        await env.DB.prepare(
          `UPDATE flag_rules SET enabled = 1, result_value = 'false', updated_at = datetime('now')
           WHERE id = ?`,
        )
          .bind(existing.id)
          .run();
      } else {
        // Insert new unsuspend rule
        await env.DB.prepare(
          `INSERT INTO flag_rules (
            flag_id, rule_type, rule_value, result_value, priority, enabled, created_at, updated_at
          ) VALUES (?, 'tenant', ?, 'false', 100, 1, datetime('now'), datetime('now'))`,
        )
          .bind(
            UPLOADS_SUSPENDED_FLAG,
            JSON.stringify({ tenantIds: [tenantId] }),
          )
          .run();
      }
    }

    // Invalidate cache so the change takes effect immediately
    await invalidateFlag(UPLOADS_SUSPENDED_FLAG, env).catch((err) => {
      console.warn("[UploadAdmin] Cache invalidation failed:", err);
    });

    return true;
  } catch (error) {
    console.error(
      `[UploadAdmin] Failed to set suspension for ${tenantId}:`,
      error,
    );
    return false;
  }
}
