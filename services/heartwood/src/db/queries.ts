/**
 * Database Queries — Re-export Barrel
 *
 * This file re-exports from the queries/ module for backward compatibility.
 * Prefer importing directly from the focused modules:
 *   - queries/clients.ts       — client lookups, redirect URI validation
 *   - queries/users.ts         — user CRUD & preferences
 *   - queries/auth-flow.ts     — auth codes, magic codes, OAuth state
 *   - queries/sessions.ts      — user sessions, refresh tokens, client prefs
 *   - queries/rate-limiting.ts — rate limits, failed attempts, lockouts
 *   - queries/audit.ts         — audit log, subscription audit
 *   - queries/subscriptions.ts — subscription lifecycle & status
 *   - queries/admin.ts         — admin queries & stats
 *   - queries/device-codes.ts  — RFC 8628 device authorization flow
 */

export {
	// Clients
	extractSubdomainFromRedirectUri,
	isActiveTenant,
	getTenantByEmail,
	getClientByClientId,
	validateRedirectUriForClient,
	validateClientRedirectUri,
	validateClientOrigin,
	getClientByDomain,
	getAllClients,
	// Users
	getUserById,
	getUserByEmail,
	createUser,
	updateUserLogin,
	updateUserAvatar,
	updateBetterAuthUserAvatar,
	updateUserPreferences,
	getOrCreateUser,
	// Auth Flow
	createAuthCode,
	getAuthCode,
	markAuthCodeUsed,
	consumeAuthCode,
	cleanupExpiredAuthCodes,
	createMagicCode,
	getMagicCode,
	markMagicCodeUsed,
	cleanupExpiredMagicCodes,
	saveOAuthState,
	getOAuthState,
	deleteOAuthState,
	cleanupExpiredOAuthStates,
	// Sessions & Tokens
	createRefreshToken,
	getRefreshTokenByHash,
	revokeRefreshToken,
	revokeAllUserTokens,
	cleanupExpiredRefreshTokens,
	createUserSession,
	getSessionByTokenHash,
	updateSessionLastUsed,
	revokeSession,
	revokeAllUserSessions,
	consumeRefreshToken,
	getRefreshTokenByHashAnyStatus,
	getUserClientPreference,
	updateLastUsedClient,
	// Rate Limiting
	checkRateLimit,
	recordFailedAttempt,
	clearFailedAttempts,
	isAccountLocked,
	// Audit
	createAuditLog,
	cleanupOldAuditLogs,
	createSubscriptionAuditLog,
	// Subscriptions
	getUserSubscription,
	createUserSubscription,
	getOrCreateUserSubscription,
	incrementPostCount,
	decrementPostCount,
	setPostCount,
	updateSubscriptionTier,
	getSubscriptionStatus,
	canUserCreatePost,
	// Admin
	isEmailAdmin,
	isUserAdmin,
	isUserBanned,
	getAdminStats,
	getAllUsers,
	getAuditLogs,
	// Device Codes
	createDeviceCode,
	getDeviceCodeByUserCode,
	getDeviceCodeByHash,
	authorizeDeviceCode,
	denyDeviceCode,
	updateDevicePollCount,
	incrementDeviceInterval,
	expireDeviceCode,
	isUserCodeUnique,
	cleanupExpiredDeviceCodes,
	deleteDeviceCode,
	consumeDeviceCode,
} from "./queries/index.js";
