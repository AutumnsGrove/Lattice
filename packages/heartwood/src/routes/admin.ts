/**
 * Admin Routes - Dashboard statistics and management
 * All routes require admin access (autumn@grove.place or autumnbrown23@pm.me)
 */

import { Hono } from "hono";
import type { Env } from "../types.js";
import {
  getAdminStats,
  getAllUsers,
  getAuditLogs,
  getAllClients,
} from "../db/queries.js";
import { createDbSession } from "../db/session.js";
import { adminRateLimiter } from "../middleware/rateLimit.js";
import { adminCookieAuth } from "../middleware/cookieAuth.js";
import {
  ADMIN_PAGINATION_MAX_LIMIT,
  ADMIN_PAGINATION_DEFAULT_LIMIT,
} from "../utils/constants.js";

const admin = new Hono<{ Bindings: Env }>();

/**
 * Middleware: Apply rate limiting to all admin routes
 */
admin.use("/*", adminRateLimiter);

/**
 * Middleware: Verify admin access (supports Bearer token + cookie auth)
 */
admin.use("/*", adminCookieAuth());

/**
 * GET /admin/stats - Get dashboard statistics
 */
admin.get("/stats", async (c) => {
  const db = createDbSession(c.env);
  const stats = await getAdminStats(db, c.env.ENGINE_DB);

  // Get replication info from the last query
  const replicationInfo = {
    served_by_region: null as string | null,
    served_by_primary: null as boolean | null,
  };

  // Run a simple query to get current replication status
  try {
    const result = await db.prepare("SELECT 1").run();
    replicationInfo.served_by_region = result.meta?.served_by_region ?? null;
    replicationInfo.served_by_primary = result.meta?.served_by_primary ?? null;
  } catch {
    // Ignore errors, replication info is optional
  }

  return c.json({
    ...stats,
    replication: replicationInfo,
  });
});

/**
 * GET /admin/users - List all users with pagination
 */
admin.get("/users", async (c) => {
  const db = createDbSession(c.env);
  // Enforce pagination bounds to prevent large data dumps
  const limit = Math.min(
    Math.max(
      parseInt(c.req.query("limit") || String(ADMIN_PAGINATION_DEFAULT_LIMIT)),
      1,
    ),
    ADMIN_PAGINATION_MAX_LIMIT,
  );
  const offset = Math.max(parseInt(c.req.query("offset") || "0"), 0);

  const users = await getAllUsers(db, limit, offset);

  return c.json({ users, pagination: { limit, offset } });
});

/**
 * GET /admin/audit-log - Get audit log entries with filtering
 */
admin.get("/audit-log", async (c) => {
  const db = createDbSession(c.env);
  // Enforce pagination bounds to prevent large data dumps
  const limit = Math.min(
    Math.max(
      parseInt(c.req.query("limit") || String(ADMIN_PAGINATION_DEFAULT_LIMIT)),
      1,
    ),
    ADMIN_PAGINATION_MAX_LIMIT,
  );
  const offset = Math.max(parseInt(c.req.query("offset") || "0"), 0);
  const eventType = c.req.query("event_type") || undefined;

  const logs = await getAuditLogs(db, { limit, offset, eventType });

  return c.json({ logs, pagination: { limit, offset } });
});

/**
 * GET /admin/clients - List all registered clients
 */
admin.get("/clients", async (c) => {
  const db = createDbSession(c.env);
  const clients = await getAllClients(db);

  // Remove sensitive data
  const safeClients = clients.map((client) => ({
    id: client.id,
    name: client.name,
    client_id: client.client_id,
    domain: client.domain,
    redirect_uris: JSON.parse(client.redirect_uris),
    allowed_origins: JSON.parse(client.allowed_origins),
    created_at: client.created_at,
  }));

  return c.json({ clients: safeClients });
});

export default admin;
