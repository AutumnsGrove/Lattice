/**
 * Tenant Access Control Utilities
 *
 * Note: Legacy JWT session functions have been removed.
 * Session management is now handled by Heartwood SessionDO.
 * This file only contains tenant verification functions.
 */

/**
 * @typedef {Object} User
 * @property {string} email
 */

/**
 * @typedef {Object} SessionError
 * @property {string} message
 * @property {number} status
 */

/**
 * @typedef {Object} TenantRow
 * @property {string} email
 */

/**
 * Verify that a user owns/has access to a tenant
 * @param {import('@cloudflare/workers-types').D1Database} db - D1 database instance
 * @param {string | undefined | null} tenantId - Tenant ID to check
 * @param {string} userEmail - User's email address
 * @returns {Promise<boolean>} - Whether the user owns the tenant
 */
export async function verifyTenantOwnership(db, tenantId, userEmail) {
  if (!tenantId || !userEmail) {
    return false;
  }

  try {
    const tenant = /** @type {TenantRow | null} */ (await db
      .prepare("SELECT email FROM tenants WHERE id = ?")
      .bind(tenantId)
      .first());

    if (!tenant) {
      return false;
    }

    // Check if user email matches tenant owner email
    return tenant.email.toLowerCase() === userEmail.toLowerCase();
  } catch (error) {
    console.error("Error verifying tenant ownership:", error);
    return false;
  }
}

/**
 * Get tenant ID with ownership verification
 * Throws 403 if user doesn't own the tenant
 * @param {import('@cloudflare/workers-types').D1Database} db - D1 database instance
 * @param {string | undefined | null} tenantId - Tenant ID from request
 * @param {User | null | undefined} user - User object with email
 * @returns {Promise<string>} - Verified tenant ID
 * @throws {SessionError} - If unauthorized
 */
export async function getVerifiedTenantId(db, tenantId, user) {
  if (!tenantId) {
    /** @type {SessionError & Error} */
    const err = /** @type {SessionError & Error} */ (new Error("Tenant ID required"));
    err.status = 400;
    throw err;
  }

  if (!user?.email) {
    /** @type {SessionError & Error} */
    const err = /** @type {SessionError & Error} */ (new Error("Unauthorized"));
    err.status = 401;
    throw err;
  }

  const isOwner = await verifyTenantOwnership(db, tenantId, user.email);
  if (!isOwner) {
    /** @type {SessionError & Error} */
    const err = /** @type {SessionError & Error} */ (new Error("Access denied - you do not own this tenant"));
    err.status = 403;
    throw err;
  }

  return tenantId;
}
