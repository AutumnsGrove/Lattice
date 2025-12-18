/**
 * Create a session token for a user
 * @param {User} user - User data
 * @param {string} secret - Session secret
 * @returns {Promise<string>} - Signed JWT token
 */
export function createSession(user: User, secret: string): Promise<string>;
/**
 * Verify a session token and return user data
 * @param {string} token - Session token
 * @param {string} secret - Session secret
 * @returns {Promise<User|null>} - User data or null if invalid
 */
export function verifySession(token: string, secret: string): Promise<User | null>;
/**
 * Create Set-Cookie header value for session
 * @param {string} token - Session token
 * @param {boolean} isProduction - Whether in production (for secure flag)
 * @returns {string} - Cookie header value
 */
export function createSessionCookie(token: string, isProduction?: boolean): string;
/**
 * Create Set-Cookie header value to clear session
 * @returns {string} - Cookie header value
 */
export function clearSessionCookie(): string;
/**
 * Parse session token from cookie header
 * @param {string} cookieHeader - Cookie header value
 * @returns {string|null} - Session token or null
 */
export function parseSessionCookie(cookieHeader: string): string | null;
/**
 * Check if an email is in the allowed admin list
 * @param {string} email - Email address to check
 * @param {string} allowedList - Comma-separated list of allowed emails
 * @returns {boolean} - Whether the user is allowed
 */
export function isAllowedAdmin(email: string, allowedList: string): boolean;
/**
 * Verify that a user owns/has access to a tenant
 * @param {import('@cloudflare/workers-types').D1Database} db - D1 database instance
 * @param {string | undefined | null} tenantId - Tenant ID to check
 * @param {string} userEmail - User's email address
 * @returns {Promise<boolean>} - Whether the user owns the tenant
 */
export function verifyTenantOwnership(db: import("@cloudflare/workers-types").D1Database, tenantId: string | undefined | null, userEmail: string): Promise<boolean>;
/**
 * Get tenant ID with ownership verification
 * Throws 403 if user doesn't own the tenant
 * @param {import('@cloudflare/workers-types').D1Database} db - D1 database instance
 * @param {string | undefined | null} tenantId - Tenant ID from request
 * @param {User | null | undefined} user - User object with email
 * @returns {Promise<string>} - Verified tenant ID
 * @throws {SessionError} - If unauthorized
 */
export function getVerifiedTenantId(db: import("@cloudflare/workers-types").D1Database, tenantId: string | undefined | null, user: User | null | undefined): Promise<string>;
export type User = {
    email: string;
};
export type SessionError = {
    message: string;
    status: number;
};
export type TenantRow = {
    email: string;
};
