// Clients & Redirect URI Validation
export {
	extractSubdomainFromRedirectUri,
	isActiveTenant,
	getTenantByEmail,
	getClientByClientId,
	validateRedirectUriForClient,
	validateClientRedirectUri,
	validateClientOrigin,
	getClientByDomain,
	getAllClients,
} from "./clients.js";

// Users
export {
	getUserById,
	getUserByEmail,
	createUser,
	updateUserLogin,
	updateUserAvatar,
	updateBetterAuthUserAvatar,
	updateUserPreferences,
	getOrCreateUser,
} from "./users.js";

// Auth Codes, Magic Codes, OAuth State
export {
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
} from "./auth-flow.js";

// Sessions, Refresh Tokens, Client Preferences
export {
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
} from "./sessions.js";

// Rate Limiting & Failed Attempts
export {
	checkRateLimit,
	recordFailedAttempt,
	clearFailedAttempts,
	isAccountLocked,
} from "./rate-limiting.js";

// Audit Logging
export { createAuditLog, cleanupOldAuditLogs, createSubscriptionAuditLog } from "./audit.js";

// Subscriptions
export {
	getUserSubscription,
	createUserSubscription,
	getOrCreateUserSubscription,
	incrementPostCount,
	decrementPostCount,
	setPostCount,
	updateSubscriptionTier,
	getSubscriptionStatus,
	canUserCreatePost,
} from "./subscriptions.js";

// Admin
export {
	isEmailAdmin,
	isUserAdmin,
	isUserBanned,
	getAdminStats,
	getAllUsers,
	getAuditLogs,
} from "./admin.js";

// Device Codes (RFC 8628)
export {
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
} from "./device-codes.js";
