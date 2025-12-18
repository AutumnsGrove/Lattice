/**
 * Session management utilities
 */

import { signJwt, verifyJwt } from "./jwt.js";

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

const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Create a session token for a user
 * @param {User} user - User data
 * @param {string} secret - Session secret
 * @returns {Promise<string>} - Signed JWT token
 */
export async function createSession(user, secret) {
  const payload = {
    sub: user.email,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };

  return await signJwt(payload, secret);
}

/**
 * Verify a session token and return user data
 * @param {string} token - Session token
 * @param {string} secret - Session secret
 * @returns {Promise<User|null>} - User data or null if invalid
 */
export async function verifySession(token, secret) {
  const payload = await verifyJwt(token, secret);

  if (!payload || !payload.email) {
    return null;
  }

  return {
    email: payload.email,
  };
}

/**
 * Create Set-Cookie header value for session
 * @param {string} token - Session token
 * @param {boolean} isProduction - Whether in production (for secure flag)
 * @returns {string} - Cookie header value
 */
export function createSessionCookie(token, isProduction = true) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${SESSION_DURATION_SECONDS}`,
    "HttpOnly",
    "SameSite=Strict",
  ];

  if (isProduction) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

/**
 * Create Set-Cookie header value to clear session
 * @returns {string} - Cookie header value
 */
export function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`;
}

/**
 * Parse session token from cookie header
 * @param {string} cookieHeader - Cookie header value
 * @returns {string|null} - Session token or null
 */
export function parseSessionCookie(cookieHeader) {
  if (!cookieHeader) {
    return null;
  }

  /** @type {Record<string, string>} */
  const cookies = cookieHeader.split(";").reduce((/** @type {Record<string, string>} */ acc, /** @type {string} */ cookie) => {
    const [key, value] = cookie.trim().split("=");
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});

  return cookies[SESSION_COOKIE_NAME] || null;
}

/**
 * Check if an email is in the allowed admin list
 * @param {string} email - Email address to check
 * @param {string} allowedList - Comma-separated list of allowed emails
 * @returns {boolean} - Whether the user is allowed
 */
export function isAllowedAdmin(email, allowedList) {
  const allowed = allowedList.split(",").map((e) => e.trim().toLowerCase());
  return allowed.includes(email.toLowerCase());
}

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
