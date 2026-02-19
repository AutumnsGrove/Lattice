/**
 * Heartwood - Main Entry Point
 * Centralized authentication service for AutumnsGrove properties
 */

import { Hono } from "hono";
import type { Env } from "./types.js";

// Middleware
import { securityHeaders } from "./middleware/security.js";
import { corsMiddleware } from "./middleware/cors.js";

// Routes
import login from "./routes/login.js";
import tokenRoutes from "./routes/token.js";
import verifyRoutes from "./routes/verify.js";
import health from "./routes/health.js";
import subscription from "./routes/subscription.js";
import admin from "./routes/admin.js";
import session from "./routes/session.js";
import minecraft from "./routes/minecraft.js";
import cdn from "./routes/cdn.js";
import betterAuth from "./routes/betterAuth.js";
import settings from "./routes/settings.js";
import status from "./routes/status.js";
import device from "./routes/device.js";

// Create the main Hono app
const app = new Hono<{ Bindings: Env }>();

// Apply global middleware
app.use("*", securityHeaders);
app.use("*", corsMiddleware);

// Mount routes
app.route("/login", login);
app.route("/token", tokenRoutes);
app.route("/auth", device);

// Verify routes - mount at root level for /verify, /userinfo, /logout
app.get("/verify", async (c) => {
  const response = await verifyRoutes.fetch(
    new Request(new URL("/", c.req.url).toString(), {
      method: "GET",
      headers: c.req.raw.headers,
    }),
    c.env,
    c.executionCtx,
  );
  return response;
});

app.get("/userinfo", async (c) => {
  const response = await verifyRoutes.fetch(
    new Request(new URL("/userinfo", c.req.url).toString(), {
      method: "GET",
      headers: c.req.raw.headers,
    }),
    c.env,
    c.executionCtx,
  );
  return response;
});

app.post("/logout", async (c) => {
  const response = await verifyRoutes.fetch(
    new Request(new URL("/logout", c.req.url).toString(), {
      method: "POST",
      headers: c.req.raw.headers,
      body: c.req.raw.body,
    }),
    c.env,
    c.executionCtx,
  );
  return response;
});

app.route("/health", health);
app.route("/subscription", subscription);
app.route("/admin", admin);
app.route("/session", session);
app.route("/minecraft", minecraft);
app.route("/cdn", cdn);
app.route("/settings", settings);
app.route("/status", status);

// Better Auth routes (new auth system)
// Handles: /api/auth/sign-in/*, /api/auth/sign-out, /api/auth/session, etc.
app.route("/api/auth", betterAuth);

// Root - show API info
app.get("/", (c) => {
  return c.json({
    service: "GroveAuth",
    version: "1.0.0",
    description:
      "Centralized authentication service for AutumnsGrove properties",
    documentation: "https://github.com/AutumnsGrove/GroveAuth",
    endpoints: {
      // Better Auth (new, recommended)
      betterAuth: {
        signInSocial: "POST /api/auth/sign-in/social",
        signInMagicLink: "POST /api/auth/sign-in/magic-link",
        signInPasskey: "POST /api/auth/sign-in/passkey",
        signOut: "POST /api/auth/sign-out",
        session: "GET /api/auth/session",
        passkeyRegister: "POST /api/auth/passkey/generate-register-options",
        passkeyVerify: "POST /api/auth/passkey/verify-registration",
        passkeyList: "GET /api/auth/passkey/list-user-passkeys",
        passkeyDelete: "POST /api/auth/passkey/delete-passkey",
        twoFactorEnable: "POST /api/auth/two-factor/enable",
        twoFactorVerify: "POST /api/auth/two-factor/verify-totp",
        twoFactorDisable: "POST /api/auth/two-factor/disable",
        twoFactorStatus: "GET /api/auth/two-factor/get-status",
        callbackGoogle: "GET /api/auth/callback/google",
      },
      // Account settings
      settings: "GET /settings",
      // Token endpoint (device code polling)
      token: {
        deviceCode:
          "POST /token (grant_type=urn:ietf:params:oauth:grant-type:device_code)",
      },
      // Device authorization (RFC 8628 for CLI)
      deviceAuth: {
        initiate: "POST /auth/device-code",
        authorize: "GET /auth/device",
        approve: "POST /auth/device/authorize",
      },
      verify: "GET /verify",
      userinfo: "GET /userinfo",
      logout: "POST /logout",
      health: "GET /health",
      subscription: {
        get: "GET /subscription",
        getByUserId: "GET /subscription/:userId",
        canPost: "GET /subscription/:userId/can-post",
        updatePostCount: "POST /subscription/:userId/post-count",
        updateTier: "PUT /subscription/:userId/tier",
      },
      admin: {
        stats: "GET /admin/stats",
        users: "GET /admin/users",
        auditLog: "GET /admin/audit-log",
        clients: "GET /admin/clients",
      },
      session: {
        validate: "POST /session/validate",
        revoke: "POST /session/revoke",
        revokeAll: "POST /session/revoke-all",
        list: "GET /session/list",
        revokeById: "DELETE /session/:sessionId",
        check: "GET /session/check (legacy)",
      },
      minecraft: {
        status: "GET /minecraft/status",
        start: "POST /minecraft/start",
        stop: "POST /minecraft/stop",
        whitelist: "GET/POST /minecraft/whitelist",
        command: "POST /minecraft/command",
        sync: "POST /minecraft/sync",
        history: "GET /minecraft/history",
      },
      cdn: {
        upload: "POST /cdn/upload",
        files: "GET /cdn/files",
        folders: "GET /cdn/folders",
        delete: "DELETE /cdn/files/:id",
      },
      status: {
        incidents: "GET /status/incidents",
        createIncident: "POST /status/incidents",
        incidentDetail: "GET /status/incidents/:id",
        addUpdate: "POST /status/incidents/:id/updates",
        updateIncident: "PATCH /status/incidents/:id",
        components: "GET /status/components",
        updateComponent: "PATCH /status/components/:slug",
        scheduled: "GET /status/scheduled",
        createScheduled: "POST /status/scheduled",
      },
    },
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: "not_found", message: "Endpoint not found" }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    { error: "server_error", message: "An unexpected error occurred" },
    500,
  );
});

// Export SessionDO for Cloudflare Workers runtime
export { SessionDO } from "./durables/SessionDO.js";
import type { SessionDO } from "./durables/SessionDO.js";

/**
 * Warm SessionDOs for recently active users
 * Queries the audit_log for recent logins and pings their SessionDOs
 * This reduces cold start latency for returning users
 */
async function warmRecentSessionDOs(env: Env): Promise<void> {
  try {
    // Get unique user IDs from recent logins (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const recentUsers = await env.DB.prepare(
      `SELECT DISTINCT user_id FROM audit_log
       WHERE event_type = 'login' AND user_id IS NOT NULL AND created_at > ?
       LIMIT 20`,
    )
      .bind(fiveMinutesAgo)
      .all<{ user_id: string }>();

    if (!recentUsers.results || recentUsers.results.length === 0) {
      return;
    }

    // Warm each user's SessionDO by calling getSessionCount (lightweight operation)
    const warmPromises = recentUsers.results.map(async ({ user_id }) => {
      try {
        const sessionDO = env.SESSIONS.get(
          env.SESSIONS.idFromName(`session:${user_id}`),
        ) as DurableObjectStub<SessionDO>;
        // getSessionCount is a lightweight query that warms the DO
        await sessionDO.getSessionCount();
      } catch (error) {
        // Silently ignore individual DO warm failures
        console.warn(
          `[Keepalive] Failed to warm SessionDO for ${user_id}:`,
          error,
        );
      }
    });

    await Promise.all(warmPromises);
    console.log(`[Keepalive] Warmed ${recentUsers.results.length} SessionDOs`);
  } catch (error) {
    // Don't let SessionDO warming failures break the keepalive
    console.error("[Keepalive] Error warming SessionDOs:", error);
  }
}

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) =>
    app.fetch(request, env, ctx),
  scheduled: async (
    controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext,
  ) => {
    // Keepalive: warm all cold-start-prone resources
    // This runs every minute to keep the worker and its dependencies hot
    await Promise.all([
      // Warm both D1 databases (each has separate connection overhead)
      env.DB.prepare("SELECT 1").first(),
      env.ENGINE_DB.prepare("SELECT 1").first(),
      // Warm KV namespace (connection initialization)
      env.SESSION_KV.get("__keepalive__"),
      // Warm SessionDOs for recently active users (reduces cold starts for returning users)
      warmRecentSessionDOs(env),
    ]);
    // Note: Cron only warms ONE region; users in other regions may still see cold starts

    // Daily maintenance: cleanup old audit logs (run once per day at midnight UTC)
    if (controller.cron === "0 0 * * *") {
      try {
        const { cleanupOldAuditLogs } = await import("./db/queries.js");
        const deleted = await cleanupOldAuditLogs(env.DB, 90); // 90-day retention
        if (deleted > 0) {
          console.log(
            `[Maintenance] Cleaned up ${deleted} old audit log entries`,
          );
        }
        // Alert if deletion count is unexpectedly high (potential attack indicator)
        if (deleted > 10000) {
          console.warn(
            `[Maintenance] High audit log deletion count: ${deleted} entries`,
          );
        }
      } catch (error) {
        console.error("[Maintenance] Failed to cleanup audit logs:", error);
      }
    } else if (controller.cron !== "* * * * *") {
      // Log unknown cron patterns for debugging (keepalive is handled above)
      console.warn("[Cron] Unknown cron pattern executed:", controller.cron);
    }
  },
};
