/**
 * Minecraft Routes - Proxy to mc-control worker
 * All routes require admin access
 */

import { Hono } from "hono";
import type { Env } from "../types.js";
import { isUserAdmin } from "../db/queries.js";
import { verifyAccessToken } from "../services/jwt.js";
import { createDbSession } from "../db/session.js";

// Use custom domain to avoid Cloudflare error 1042 (worker-to-worker fetch restriction)
const MC_CONTROL_URL = "https://mc-control.grove.place";

// Define context variables for type-safe c.set()/c.get()
type Variables = {
  accessToken: string;
};

const minecraft = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Middleware: Verify admin access
 */
minecraft.use("/*", async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { error: "unauthorized", error_description: "Missing or invalid token" },
      401,
    );
  }

  const token = authHeader.substring(7);
  const payload = await verifyAccessToken(c.env, token);

  if (!payload) {
    return c.json(
      {
        error: "invalid_token",
        error_description: "Token is invalid or expired",
      },
      401,
    );
  }

  const db = createDbSession(c.env);
  const isAdmin = await isUserAdmin(db, payload.sub);
  if (!isAdmin) {
    return c.json(
      { error: "forbidden", error_description: "Admin access required" },
      403,
    );
  }

  // Store the token for forwarding to mc-control
  c.set("accessToken", token);
  await next();
});

/**
 * Helper to proxy requests to mc-control
 */
async function proxyToMcControl(
  c: any,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const token = c.get("accessToken");
  const url = `${MC_CONTROL_URL}${path}`;

  console.log(`[mc-proxy] ${method} ${url}`);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log(`[mc-proxy] Response status: ${response.status}`);

    const text = await response.text();
    console.log(`[mc-proxy] Response body: ${text.substring(0, 500)}`);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Log details internally for debugging
      console.error(
        `[Minecraft Proxy] Invalid response from upstream: ${response.status}`,
      );
      // Return generic error to client
      return c.json(
        {
          error: "service_unavailable",
          error_description:
            "Minecraft control service is temporarily unavailable",
        },
        503,
      );
    }

    return c.json(data, response.status);
  } catch (error) {
    // Log details internally for debugging
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Minecraft Proxy] Fetch error: ${errorMsg}`);
    // Return generic error to client
    return c.json(
      {
        error: "service_unavailable",
        error_description:
          "Minecraft control service is temporarily unavailable",
      },
      503,
    );
  }
}

/**
 * GET /minecraft/status - Get full server status
 */
minecraft.get("/status", async (c) => {
  return proxyToMcControl(c, "GET", "/api/mc/status");
});

/**
 * POST /minecraft/start - Start the server
 */
minecraft.post("/start", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return proxyToMcControl(c, "POST", "/api/mc/start", body);
});

/**
 * POST /minecraft/stop - Stop the server
 */
minecraft.post("/stop", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return proxyToMcControl(c, "POST", "/api/mc/stop", body);
});

/**
 * GET /minecraft/whitelist - Get whitelist
 */
minecraft.get("/whitelist", async (c) => {
  return proxyToMcControl(c, "GET", "/api/mc/whitelist");
});

/**
 * POST /minecraft/whitelist - Add/remove from whitelist
 */
minecraft.post("/whitelist", async (c) => {
  const body = await c.req.json();
  return proxyToMcControl(c, "POST", "/api/mc/whitelist", body);
});

/**
 * POST /minecraft/command - Send console command
 */
minecraft.post("/command", async (c) => {
  const body = await c.req.json();
  return proxyToMcControl(c, "POST", "/api/mc/command", body);
});

/**
 * POST /minecraft/sync - Trigger manual backup
 */
minecraft.post("/sync", async (c) => {
  return proxyToMcControl(c, "POST", "/api/mc/sync");
});

/**
 * GET /minecraft/history - Get session history
 */
minecraft.get("/history", async (c) => {
  const limit = c.req.query("limit");
  const offset = c.req.query("offset");
  const months = c.req.query("months");

  let path = "/api/mc/history";
  const params = new URLSearchParams();
  if (limit) params.set("limit", limit);
  if (offset) params.set("offset", offset);
  if (months) params.set("months", months);

  if (params.toString()) {
    path += `?${params.toString()}`;
  }

  return proxyToMcControl(c, "GET", path);
});

// ============================================================================
// Mod Management Routes
// ============================================================================

/**
 * GET /minecraft/mods - List all mods
 */
minecraft.get("/mods", async (c) => {
  return proxyToMcControl(c, "GET", "/api/mc/mods");
});

/**
 * DELETE /minecraft/mods - Delete all mods
 */
minecraft.delete("/mods", async (c) => {
  // Forward confirmation header
  const confirmHeader = c.req.header("X-Confirm-Delete");
  const token = c.get("accessToken");

  const response = await fetch(`${MC_CONTROL_URL}/api/mc/mods`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(confirmHeader ? { "X-Confirm-Delete": confirmHeader } : {}),
    },
  });

  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * DELETE /minecraft/mods/:filename - Delete specific mod
 */
minecraft.delete("/mods/:filename", async (c) => {
  const filename = c.req.param("filename");
  return proxyToMcControl(
    c,
    "DELETE",
    `/api/mc/mods/${encodeURIComponent(filename)}`,
  );
});

/**
 * POST /minecraft/mods/upload - Upload a mod
 */
minecraft.post("/mods/upload", async (c) => {
  const token = c.get("accessToken");
  const contentType = c.req.header("Content-Type") || "";

  // Forward the request body as-is
  const body = await c.req.arrayBuffer();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": contentType,
  };

  // Forward X-Filename if present (for raw uploads)
  const filename = c.req.header("X-Filename");
  if (filename) {
    headers["X-Filename"] = filename;
  }

  const response = await fetch(`${MC_CONTROL_URL}/api/mc/mods/upload`, {
    method: "POST",
    headers,
    body,
  });

  const data = await response.json();
  return c.json(data, response.status as any);
});

// ============================================================================
// World Management Routes
// ============================================================================

/**
 * GET /minecraft/world - Get world info
 */
minecraft.get("/world", async (c) => {
  return proxyToMcControl(c, "GET", "/api/mc/world");
});

/**
 * DELETE /minecraft/world - Reset world
 */
minecraft.delete("/world", async (c) => {
  const confirmHeader = c.req.header("X-Confirm-Delete");
  const token = c.get("accessToken");

  const response = await fetch(`${MC_CONTROL_URL}/api/mc/world`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(confirmHeader ? { "X-Confirm-Delete": confirmHeader } : {}),
    },
  });

  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * GET /minecraft/backups - List backups
 */
minecraft.get("/backups", async (c) => {
  const limit = c.req.query("limit");
  let path = "/api/mc/backups";
  if (limit) path += `?limit=${limit}`;
  return proxyToMcControl(c, "GET", path);
});

/**
 * POST /minecraft/backups/:id/restore - Restore a backup
 */
minecraft.post("/backups/:id/restore", async (c) => {
  const backupId = c.req.param("id");
  const confirmHeader = c.req.header("X-Confirm-Restore");
  const token = c.get("accessToken");

  const response = await fetch(
    `${MC_CONTROL_URL}/api/mc/backups/${backupId}/restore`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(confirmHeader ? { "X-Confirm-Restore": confirmHeader } : {}),
      },
    },
  );

  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * GET /minecraft/backups/:id/download - Download a backup
 */
minecraft.get("/backups/:id/download", async (c) => {
  const backupId = c.req.param("id");
  const token = c.get("accessToken");

  const response = await fetch(
    `${MC_CONTROL_URL}/api/mc/backups/${backupId}/download`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const data = await response.json();
    return c.json(data, response.status as any);
  }

  // Stream the file back
  return new Response(response.body, {
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") || "application/gzip",
      "Content-Disposition":
        response.headers.get("Content-Disposition") ||
        `attachment; filename="${backupId}.tar.gz"`,
    },
  });
});

export default minecraft;
