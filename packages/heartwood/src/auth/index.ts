/**
 * Better Auth Configuration for Heartwood
 *
 * This configuration integrates Better Auth with Cloudflare's D1 and KV,
 * providing OAuth (Google), magic link, and passkey authentication.
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
import { magicLink, twoFactor } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { drizzle } from "drizzle-orm/d1";
import type { Env } from "../types.js";
import { isEmailAllowed } from "../db/queries.js";
import { createDbSession } from "../db/session.js";
import { schema } from "../db/auth.schema.js";
import {
  getRequestContext,
  bridgeSessionToSessionDO,
} from "../lib/sessionBridge.js";

// Email template for magic link
const MAGIC_LINK_EMAIL_HTML = (url: string) =>
  `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Heartwood Login</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #18181b; text-align: center;">
            Heartwood
          </h1>

          <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.5;">
            Click the button below to sign in. This link will expire in 10 minutes.
          </p>

          <div style="text-align: center; margin: 0 0 24px;">
            <a href="${url}" style="display: inline-block; background-color: #18181b; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Sign In to Heartwood
            </a>
          </div>

          <p style="margin: 0 0 8px; font-size: 14px; color: #71717a; line-height: 1.5;">
            If you didn't request this link, you can safely ignore this email.
          </p>

          <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5; word-break: break-all;">
            Or copy this link: ${url}
          </p>
        </div>

        <p style="margin: 24px 0 0; font-size: 12px; color: #a1a1aa; text-align: center;">
          Heartwood - Authentication for AutumnsGrove
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

const MAGIC_LINK_EMAIL_TEXT = (url: string) =>
  `
Heartwood Login

Click the link below to sign in:
${url}

This link will expire in 10 minutes.

If you didn't request this link, you can safely ignore this email.

---
Heartwood - Authentication for AutumnsGrove
`.trim();

/**
 * Create a Better Auth instance configured for Cloudflare
 *
 * @param env - Cloudflare Worker environment bindings
 * @param cf - Cloudflare request context (for geolocation/IP detection)
 * @returns Configured Better Auth instance
 */
export function createAuth(env: Env, cf?: CloudflareGeolocation) {
  // Create Drizzle instance for D1 with schema
  const db = drizzle(env.DB, { schema });
  const groveDb = createDbSession(env);

  return betterAuth({
    // Base URL for auth endpoints
    baseURL: env.AUTH_BASE_URL,

    // Secret for signing tokens and cookies
    secret: env.SESSION_SECRET,

    // Trusted origins for callback URLs and redirects
    // Wildcard covers all tenant subdomains (Better Auth uses internal wildcardMatch())
    trustedOrigins: ["https://autumnsgrove.com", "https://*.grove.place"],

    // Database configuration via better-auth-cloudflare
    ...withCloudflare(
      {
        autoDetectIpAddress: true,
        geolocationTracking: true,
        cf: cf || {}, // Cloudflare request context for geolocation
        d1: {
          db: db as any, // Bridge drizzle-orm version mismatch (0.45 vs 0.44)
          options: {
            usePlural: false, // ba_user, ba_session, etc. (not plural)
            debugLogs: true, // Enable debug logging to see errors
          },
        },
        // kv: env.SESSION_KV,  // Disabled: KV session bug (PR #7583) - sessions lack ID field
      },
      {
        // Better Auth's built-in rate limiting — catch-all safety net.
        // Grove's Hono middleware rate limiters (rateLimit.ts) provide tight
        // per-endpoint controls on sensitive routes (magic link, passkey, admin).
        // This layer catches everything else (OAuth, sign-up, etc.).
        // See HAWK-001 in docs/security/hawk-report-2026-02-10-login-auth-hub.md
        // Uses customStorage to reuse the existing rate_limits D1 table.
        rateLimit: {
          enabled: true,
          window: 60,
          max: 100,
          customRules: {
            "/sign-in/*": { window: 60, max: 20 },
            "/sign-up/*": { window: 60, max: 10 },
            "/callback/*": { window: 60, max: 30 },
          },
          customStorage: {
            get: async (key) => {
              try {
                const row = await env.DB.prepare(
                  "SELECT count, window_start FROM rate_limits WHERE key = ?",
                )
                  .bind(`ba:${key}`)
                  .first<{ count: number; window_start: string }>();
                if (!row) return null;
                return {
                  key: `ba:${key}`,
                  count: row.count,
                  lastRequest: new Date(row.window_start).getTime(),
                };
              } catch {
                return null;
              }
            },
            set: async (key, value) => {
              try {
                await env.DB.prepare(
                  `INSERT INTO rate_limits (key, count, window_start)
                   VALUES (?, ?, ?)
                   ON CONFLICT(key) DO UPDATE SET count = ?, window_start = ?`,
                )
                  .bind(
                    `ba:${key}`,
                    value.count,
                    new Date(value.lastRequest).toISOString(),
                    value.count,
                    new Date(value.lastRequest).toISOString(),
                  )
                  .run();
              } catch {
                // Rate limit storage failure shouldn't block auth requests
              }
            },
          },
        },
      },
    ),

    // Session configuration with custom table name
    session: {
      modelName: "ba_session", // Map to our ba_session table
      // 7 days session expiry
      expiresIn: 7 * 24 * 60 * 60,
      // Refresh session if within 7 days of expiry
      updateAge: 7 * 24 * 60 * 60,
      // Cross-subdomain cookie for .grove.place
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minute cache
      },
    },

    // Cookie configuration for cross-subdomain auth
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
        domain: ".grove.place",
      },
      defaultCookieAttributes: {
        httpOnly: true,
        secure: true,
        sameSite: "lax", // Must be 'lax' for OAuth redirects to work
        path: "/",
      },
      // OAuth state cookie — SameSite=None retained for compatibility.
      // Auth flows now go through login.grove.place (same-origin), so Lax would work.
      cookies: {
        oauth_state: {
          name: "better-auth.oauth_state",
          attributes: {
            sameSite: "none", // Required for cross-origin POST responses
            secure: true,
            httpOnly: true,
            path: "/",
          },
        },
      },
    },

    // Extended user schema (Grove-specific fields)
    user: {
      modelName: "ba_user", // Map to our ba_user table
      additionalFields: {
        // Multi-tenant association
        tenantId: {
          type: "string",
          required: false,
          input: false,
        },
        // Administrative access flag
        isAdmin: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false,
        },
        // Track login frequency
        loginCount: {
          type: "number",
          required: false,
          defaultValue: 0,
          input: false,
        },
        // Moderation: is user banned?
        banned: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false,
        },
        // Moderation: reason for ban
        banReason: {
          type: "string",
          required: false,
          input: false,
        },
        // Moderation: when ban expires (null = permanent)
        banExpires: {
          type: "date",
          required: false,
          input: false,
        },
      },
    },

    // OAuth providers (Passkeys handled via plugin, Google as fallback)
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        scope: ["openid", "email", "profile"],
      },
    },

    // Plugins
    plugins: [
      // Magic link authentication
      magicLink({
        // Link expires in 10 minutes
        expiresIn: 10 * 60,

        // Disable signup via magic link (allowlist only)
        disableSignUp: false,

        // Send magic link email via Resend
        sendMagicLink: async ({ email, url }) => {
          try {
            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Heartwood <auth@grove.place>",
                to: email,
                subject: "Sign in to Heartwood",
                html: MAGIC_LINK_EMAIL_HTML(url),
                text: MAGIC_LINK_EMAIL_TEXT(url),
              }),
            });

            if (!response.ok) {
              const error = await response.text();
              console.error("[MagicLink] Failed to send email:", error);
              throw new Error("Failed to send magic link email");
            }

            console.log("[MagicLink] Sent magic link");
          } catch (error) {
            console.error("[MagicLink] Error sending email:", error);
            throw error;
          }
        },
      }),

      // Passkey (WebAuthn) authentication
      // origin supports comma-separated values for multi-origin (e.g. "https://login.grove.place,http://localhost:5173")
      passkey({
        rpID: env.PASSKEY_RP_ID || "grove.place",
        rpName: "Heartwood",
        origin: (env.PASSKEY_ORIGIN || "https://login.grove.place")
          .split(",")
          .map((o: string) => o.trim()),
      }),

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
    ],

    // Hooks for Grove-specific logic
    databaseHooks: {
      user: {
        // Enforce email allowlist before creating user (unless public signup is enabled)
        create: {
          before: async (user) => {
            // Check feature flag first - if public signup is enabled, skip allowlist
            if (env.PUBLIC_SIGNUP_ENABLED === "true") {
              console.log("[Auth] Public signup enabled - creating new user");
              return { data: user };
            }

            // Check primary allowlist in groveauth DB
            const allowed = await isEmailAllowed(groveDb, user.email);
            if (allowed) {
              console.log("[Auth] User in allowlist - creating");
              return { data: user };
            }

            // Fallback: check comped/beta invites in GroveEngine DB
            // Comped invites grant authentication access (unused invites only)
            if (env.ENGINE_DB) {
              try {
                const comped = await env.ENGINE_DB.prepare(
                  "SELECT email FROM comped_invites WHERE email = ? AND used_at IS NULL",
                )
                  .bind(user.email.toLowerCase())
                  .first();
                if (comped) {
                  console.log("[Auth] User has comped/beta invite - creating");
                  return { data: user };
                }
              } catch (err) {
                console.error("[Auth] Failed to check comped_invites:", err);
                // Don't block auth if ENGINE_DB query fails - fall through to reject
              }
            }

            console.log(
              "[Auth] Signup blocked - email not in allowlist or comped invites",
            );
            throw new Error(
              "Email not authorized. Contact an administrator for access.",
            );
          },
        },
      },

      // Bridge Better Auth sessions to SessionDO for unified session management
      session: {
        create: {
          after: async (session, context) => {
            // Get the request from context (Better Auth passes it through)
            const request = context?.request;
            if (!request) {
              console.warn(
                "[SessionBridge] No request in context, skipping bridge",
              );
              return;
            }

            // Check if this request was registered for bridging
            const reqContext = getRequestContext(request);
            if (!reqContext) {
              console.warn(
                "[SessionBridge] Request not registered, skipping bridge",
              );
              return;
            }

            // Bridge the BA session to SessionDO
            // This creates a parallel session in our Durable Object system
            await bridgeSessionToSessionDO(
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
          },
        },
      },
    },

    // Account linking - allow multiple providers per user
    account: {
      modelName: "ba_account", // Map to our ba_account table
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
      },
    },

    // Verification table for magic links
    verification: {
      modelName: "ba_verification", // Map to our ba_verification table
    },
  });
}

// Type export for use in routes
export type Auth = ReturnType<typeof createAuth>;
