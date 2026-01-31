/**
 * Tenant Access Control Utilities
 *
 * Note: Legacy JWT session functions have been removed.
 * Session management is now handled by Heartwood SessionDO.
 * This file only contains tenant verification functions.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { emailsMatch } from "$lib/utils/user.js";

export interface User {
  email: string;
}

export interface SessionError extends Error {
  status: number;
}

interface TenantRow {
  email: string;
}

/**
 * Verify that a user owns/has access to a tenant
 */
export async function verifyTenantOwnership(
  db: D1Database,
  tenantId: string | undefined | null,
  userEmail: string,
): Promise<boolean> {
  if (!tenantId || !userEmail) {
    return false;
  }

  try {
    const tenant = await db
      .prepare("SELECT email FROM tenants WHERE id = ?")
      .bind(tenantId)
      .first<TenantRow>();

    if (!tenant) {
      return false;
    }

    // Check if user email matches tenant owner email
    return emailsMatch(tenant.email, userEmail);
  } catch (error) {
    console.error("Error verifying tenant ownership:", error);
    return false;
  }
}

/**
 * Get tenant ID with ownership verification
 * Throws 403 if user doesn't own the tenant
 */
export async function getVerifiedTenantId(
  db: D1Database,
  tenantId: string | undefined | null,
  user: User | null | undefined,
): Promise<string> {
  if (!tenantId) {
    const err = new Error("Tenant ID required") as SessionError;
    err.status = 400;
    throw err;
  }

  if (!user?.email) {
    const err = new Error("Unauthorized") as SessionError;
    err.status = 401;
    throw err;
  }

  const isOwner = await verifyTenantOwnership(db, tenantId, user.email);
  if (!isOwner) {
    const err = new Error(
      "Access denied - you do not own this tenant",
    ) as SessionError;
    err.status = 403;
    throw err;
  }

  return tenantId;
}
