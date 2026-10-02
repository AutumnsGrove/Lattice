/**
 * Better Auth Configuration for Heartwood
 *
 * This configuration integrates Better Auth with Cloudflare's D1 and KV,
 * providing Google OAuth authentication.
 *
 * Grove-specific features:
 * - Email allowlist enforcement (admin-only access)
 * - Extended user schema with tenantId, isAdmin, banned, etc.
 * - Cross-subdomain session cookie (.grove.place)
 * - Rate limiting via Grove's Threshold pattern (not Better Auth's built-in)
 */

import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import type { CloudflareGeolocation } from "better-auth-cloudflare";
import { APIError } from "better-auth/api";
import { twoFactor, emailOTP } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import { logGroveError } from "@autumnsgrove/lattice/errors";
import { HW_SVC_ERRORS } from "../errors.js";
import type { Env } from "../types.js";
import { schema } from "../db/auth.schema.js";
import { getRequestContext, bridgeSessionToSessionDO } from "../lib/sessionBridge.js";
import { sendLoginCodeEmail } from "../services/email.js";
import {
	EMAIL_OTP_LENGTH,
	EMAIL_OTP_EXPIRES_IN,
	EMAIL_OTP_ALLOWED_ATTEMPTS,
	EMAIL_OTP_SEND_LIMIT,
	EMAIL_OTP_SEND_LIMIT_LOCAL,
	EMAIL_OTP_SEND_WINDOW,
	EMAIL_OTP_VERIFY_LIMIT,
	EMAIL_OTP_VERIFY_WINDOW,
} from "../utils/constants.js";

/**
 * Paths where Better Auth's twoFactor plugin creates a real session first,
 * then immediately deletes it and issues a 2FA-pending cookie if the user
 * has 2FA enabled (better-auth's own after-hook, matched on these same three
 * paths). Bridging a session created on one of these paths would hand out a
 * live grove_session before the TOTP/OTP/backup code is checked — a 2FA
 * bypass. A fresh session (and bridge) fires again once the user completes
 * verification via /two-factor/verify-*, which creates a brand new session.
 */
export function isPendingTwoFactorSignInPath(pathname: string): boolean {
	return (
		pathname.endsWith("/sign-in/email") ||
		pathname.endsWith("/sign-in/username") ||
		pathname.endsWith("/sign-in/phone-number")
	);
}

interface RateLimitEntry {
	key: string;
	count: number;
	lastRequest: number;
}

/**
 * Read a Better Auth rate-limit counter from D1.
 *
 * On a storage failure this returns null, which Better Auth's rate limiter
 * treats as "no prior record" and allows the request — the same fail-open
 * behavior as before. That tradeoff is intentional (a D1 hiccup shouldn't
 * lock every user out of sign-in), but it used to be silent. Failures are
 * now logged so an outage in rate-limit storage is observable instead of
 * invisibly disabling brute-force protection.
 */
export async function readBetterAuthRateLimitEntry(
	env: Env,
	key: string,
): Promise<RateLimitEntry | null> {
	try {
		const row = await env.DB.prepare("SELECT count, window_start FROM rate_limits WHERE key = ?")
			.bind(key)
			.first<{ count: number; window_start: string }>();
		if (!row) return null;
		return {
			key,
			count: row.count,
			lastRequest: new Date(row.window_start).getTime(),
		};
	} catch (error) {
		console.error(`[BetterAuth] Rate limit storage read failed for key ${key}:`, error);
		return null;
	}
}

/**
 * Persist a Better Auth rate-limit counter to D1. See
 * readBetterAuthRateLimitEntry for the fail-open rationale.
 */
export async function writeBetterAuthRateLimitEntry(
	env: Env,
	key: string,
	value: { count: number; lastRequest: number },
): Promise<void> {
	try {
		await env.DB.prepare(
			`INSERT INTO rate_limits (key, count, window_start)
                 VALUES (?, ?, ?)
                 ON CONFLICT(key) DO UPDATE SET count = ?, window_start = ?`,
		)
			.bind(
				key,
				value.count,
				new Date(value.lastRequest).toISOString(),
				value.count,
				new Date(value.lastRequest).toISOString(),
			)
			.run();
	} catch (error) {
		console.error(`[BetterAuth] Rate limit storage write failed for key ${key}:`, error);
	}
}

/**
 * Create a Better Auth instance configured for Cloudflare
 *
 * @param env - Cloudflare Worker environment bindings
 * @param cf - Cloudflare request context (for geolocation/IP detection)
 * @returns Configured Better Auth instance
 */
export function createAuth(env: Env, cf?: CloudflareGeolocation) {
	if (!env.DB) {
		logGroveError("Heartwood", HW_SVC_ERRORS.MISSING_DB_BINDING);
		throw new Error(HW_SVC_ERRORS.MISSING_DB_BINDING.userMessage);
	}
	if (!env.AUTH_BASE_URL) {
		logGroveError("Heartwood", HW_SVC_ERRORS.MISSING_AUTH_BASE_URL);
		throw new Error(HW_SVC_ERRORS.MISSING_AUTH_BASE_URL.userMessage);
	}
	if (!env.SESSION_SECRET) {
		logGroveError("Heartwood", HW_SVC_ERRORS.MISSING_SESSION_SECRET);
		throw new Error(HW_SVC_ERRORS.MISSING_SESSION_SECRET.userMessage);
	}
	if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
		console.warn(
			"[createAuth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET — Google OAuth will fail",
		);
	}

	const isLocalDev = env.AUTH_BASE_URL.startsWith("http://localhost");

	// Create Drizzle instance for D1 with schema
	const db = drizzle(env.DB, { schema });

	// Extract withCloudflare config so we can deep-merge session/advanced
	// instead of letting Heartwood's keys silently replace them.
	const cfConfig = withCloudflare(
		{
			autoDetectIpAddress: true,
			geolocationTracking: true,
			cf: cf || {},
			d1: {
				db: db as any, // Bridge drizzle-orm version mismatch (0.45 vs 0.44)
				options: {
					usePlural: false, // ba_user, ba_session, etc. (not plural)
					debugLogs: true,
				},
			},
		},
		{
			// Better Auth's built-in rate limiting — catch-all safety net.
			// Grove's Hono middleware rate limiters (rateLimit.ts) provide tight
			// per-endpoint controls on sensitive routes.
			// See HAWK-001 in docs/security/hawk-report-2026-02-10-login-auth-hub.md
			rateLimit: {
				enabled: true,
				window: 60,
				max: 100,
				// Exact email-OTP rules must come BEFORE the "/sign-in/*" wildcard:
				// Better Auth applies the first matching key in insertion order.
				customRules: {
					"/email-otp/send-verification-otp": {
						window: EMAIL_OTP_SEND_WINDOW,
						max: isLocalDev ? EMAIL_OTP_SEND_LIMIT_LOCAL : EMAIL_OTP_SEND_LIMIT,
					},
					"/sign-in/email-otp": { window: EMAIL_OTP_VERIFY_WINDOW, max: EMAIL_OTP_VERIFY_LIMIT },
					"/sign-in/*": { window: 60, max: 20 },
					"/sign-up/*": { window: 60, max: 10 },
					"/callback/*": { window: 60, max: 30 },
				},
				customStorage: {
					get: async (key: string) => readBetterAuthRateLimitEntry(env, `ba:${key}`),
					set: async (key: string, value: { count: number; lastRequest: number }) =>
						writeBetterAuthRateLimitEntry(env, `ba:${key}`, value),
				},
			},
		} as any,
	) as Record<string, any>;

	return betterAuth({
		baseURL: env.AUTH_BASE_URL,
		secret: env.SESSION_SECRET,
		trustedOrigins: [
			"https://autumnsgrove.com",
			"https://*.grove.place",
			...(isLocalDev
				? [
						"http://localhost:5173",
						"http://localhost:5174",
						"http://localhost:5175",
						"http://localhost:5176", // login hub (apps/login) under dev-stack
						"http://localhost:8787",
					]
				: []),
		],
		...cfConfig,

		session: {
			...cfConfig.session,
			modelName: "ba_session",
			expiresIn: 30 * 24 * 60 * 60,
			updateAge: 24 * 60 * 60,
			freshAge: 5 * 60, // 5 minutes — require recent auth for sensitive operations
			cookieCache: {
				enabled: true,
				maxAge: 5 * 60,
			},
		},

		advanced: {
			...cfConfig.advanced,
			crossSubDomainCookies: isLocalDev
				? { enabled: false }
				: { enabled: true, domain: ".grove.place" },
			defaultCookieAttributes: {
				httpOnly: true,
				secure: !isLocalDev,
				sameSite: "lax",
				path: "/",
			},
			// oauth_state previously overrode sameSite to "none" in production.
			// That buys nothing — the Google -> /api/auth/callback/google return
			// trip is a top-level GET navigation, which SameSite=Lax already
			// permits — and it exposes the CSRF-defense cookie to cross-site
			// sub-resource requests and POSTs. Let it inherit the Lax default.
		},

		user: {
			modelName: "ba_user",
			additionalFields: {
				tenantId: {
					type: "string",
					required: false,
					input: false,
				},
				isAdmin: {
					type: "boolean",
					required: false,
					defaultValue: false,
					input: false,
				},
				loginCount: {
					type: "number",
					required: false,
					defaultValue: 0,
					input: false,
				},
				banned: {
					type: "boolean",
					required: false,
					defaultValue: false,
					input: false,
				},
				banReason: {
					type: "string",
					required: false,
					input: false,
				},
				banExpires: {
					type: "date",
					required: false,
					input: false,
				},
			},
		},

		socialProviders: {
			google: {
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET,
				scope: ["openid", "email", "profile"],
			},
		},

		plugins: [
			// Two-factor authentication (TOTP)
			twoFactor({
				issuer: "Heartwood",
				totpOptions: {
					digits: 6,
					period: 30,
				},
				backupCodeOptions: {
					length: 10,
					count: 10,
				},
			}),

			// Passwordless email codes: "sign in / sign up with email".
			// One flow for both — an unknown email becomes a new account once the
			// code is proven (disableSignUp stays false: signup is open to all).
			// Codes are stored hashed in ba_verification and burned after
			// EMAIL_OTP_ALLOWED_ATTEMPTS wrong guesses.
			emailOTP({
				otpLength: EMAIL_OTP_LENGTH,
				expiresIn: EMAIL_OTP_EXPIRES_IN,
				allowedAttempts: EMAIL_OTP_ALLOWED_ATTEMPTS,
				storeOTP: "hashed",
				sendVerificationOTP: async ({ email, otp, type }) => {
					// Local dev: Zephyr may have no Resend key, so surface the code
					// in the Heartwood terminal. Never reachable in production —
					// isLocalDev is derived from the localhost AUTH_BASE_URL.
					if (isLocalDev) {
						console.log(`[LoginCode:dev] ${type} code for ${email}: ${otp}`);
					}
					// Awaited on purpose: every email (new or existing account) takes
					// the same path, and a delivery failure should reach the user.
					const result = await sendLoginCodeEmail(env, email, otp);
					if (result === "sent" || isLocalDev) return;

					if (result === "rate_limited") {
						logGroveError("Heartwood", HW_SVC_ERRORS.LOGIN_CODE_RATE_LIMITED);
						throw new APIError("TOO_MANY_REQUESTS", {
							message: HW_SVC_ERRORS.LOGIN_CODE_RATE_LIMITED.userMessage,
						});
					}
					throw new APIError("INTERNAL_SERVER_ERROR", {
						message: HW_SVC_ERRORS.LOGIN_CODE_SEND_FAILED.userMessage,
					});
				},
			}),
		],

		databaseHooks: {
			user: {
				create: {
					before: async (user) => {
						console.log("[Auth] Creating new user");
						return { data: user };
					},
				},
			},

			session: {
				create: {
					after: async (session, context) => {
						const request = context?.request;
						if (!request) {
							console.warn("[SessionBridge] No request in context, skipping bridge");
							return;
						}

						const reqContext = getRequestContext(request);
						if (!reqContext) {
							console.warn("[SessionBridge] Request not registered, skipping bridge");
							return;
						}

						// See isPendingTwoFactorSignInPath: skip bridging the transient
						// session BA creates before checking 2FA — bridging it would
						// hand out a live grove_session before the code is verified.
						const pathname = new URL(request.url).pathname;
						if (isPendingTwoFactorSignInPath(pathname)) {
							const userRow = await reqContext.env.DB.prepare(
								"SELECT two_factor_enabled FROM ba_user WHERE id = ?",
							)
								.bind(session.userId as string)
								.first<{ two_factor_enabled: number }>();
							if (userRow?.two_factor_enabled) {
								console.log("[SessionBridge] Skipping bridge for pre-2FA-verification session");
								return;
							}
						}

						const result = await bridgeSessionToSessionDO(
							request,
							{
								id: session.id as string,
								userId: session.userId as string,
								expiresAt: session.expiresAt as Date,
								ipAddress: session.ipAddress as string | undefined,
								userAgent: session.userAgent as string | undefined,
							},
							reqContext.env,
						);

						// Surface bridge failures loudly — a silent failure here leaves
						// the user with a valid Better Auth session but no grove_session,
						// which breaks every grove_session-only endpoint (admin routes,
						// device authorization) with no diagnostic trail.
						if (result.error) {
							logGroveError("Heartwood", HW_SVC_ERRORS.SESSION_BRIDGE_FAILED, {
								userId: session.userId as string,
								detail: result.error,
							});
						}
					},
				},
			},
		},

		account: {
			modelName: "ba_account",
			accountLinking: {
				enabled: true,
				trustedProviders: ["google"],
			},
		},

		verification: {
			modelName: "ba_verification",
		},
	});
}

export type Auth = ReturnType<typeof createAuth>;
