/**
 * Minecraft Server Control - Proxy to Heartwood → mc-control
 *
 * Uses Heartwood service binding (platform.env.AUTH.fetch()) with cookie
 * forwarding. The cookieAuth middleware in Heartwood validates the session
 * and proxies requests to the mc-control worker.
 */

import { redirect, fail, error } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { isWayfinder } from "@autumnsgrove/groveengine/config";

/**
 * Helper to call Heartwood via service binding with cookie forwarding.
 * Landing → AUTH service binding → Heartwood cookieAuth → mc-control
 */
async function heartwoodFetch(
  platform: App.Platform,
  request: Request,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return platform.env.AUTH.fetch(
    new Request(`https://login.grove.place${path}`, {
      ...init,
      headers: {
        ...Object.fromEntries(new Headers(init?.headers).entries()),
        Cookie: request.headers.get("Cookie") || "",
      },
    }),
  );
}

interface ServerStatus {
  state: string;
  players?: { online: number; max: number; list: string[] };
  region?: string;
  ttl?: number;
  worldSize?: number;
  lastBackup?: string;
  sessionCost?: number;
  uptime?: number;
}

interface WhitelistEntry {
  username: string;
  added_at?: string;
}

interface SessionHistoryEntry {
  id: string;
  started_at: string;
  stopped_at?: string;
  region: string;
  duration?: number;
  cost?: number;
  peak_players?: number;
}

export const load: PageServerLoad = async ({ parent, platform, request }) => {
  const parentData = await parent();
  if (!parentData.isWayfinder) {
    throw redirect(302, "/arbor");
  }

  if (!platform?.env?.AUTH) {
    throw error(500, "Heartwood service binding not available");
  }

  // Fetch status, whitelist, and history in parallel
  const [statusRes, whitelistRes, historyRes] = await Promise.all([
    heartwoodFetch(platform, request, "/minecraft/status").catch(() => null),
    heartwoodFetch(platform, request, "/minecraft/whitelist").catch(() => null),
    heartwoodFetch(platform, request, "/minecraft/history?limit=20").catch(
      () => null,
    ),
  ]);

  let serverStatus: ServerStatus = { state: "UNKNOWN" };
  let whitelist: WhitelistEntry[] = [];
  let history: SessionHistoryEntry[] = [];

  if (statusRes?.ok) {
    try {
      const data = await statusRes.json<any>();
      serverStatus = data.status || data;
    } catch {
      /* ignore parse errors */
    }
  }

  if (whitelistRes?.ok) {
    try {
      const data = await whitelistRes.json<any>();
      whitelist = data.whitelist || data.players || [];
    } catch {
      /* ignore */
    }
  }

  if (historyRes?.ok) {
    try {
      const data = await historyRes.json<any>();
      history = data.sessions || data.history || [];
    } catch {
      /* ignore */
    }
  }

  return {
    serverStatus,
    whitelist,
    history,
  };
};

export const actions: Actions = {
  start: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(403, { error: "Not authenticated" });
    if (!isWayfinder(user.email)) return fail(403, { error: "Access denied" });
    if (!platform?.env?.AUTH)
      return fail(500, { error: "Service not available" });

    const formData = await request.formData();
    const region = formData.get("region")?.toString() || "eu";

    const res = await heartwoodFetch(platform, request, "/minecraft/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region }),
    });

    if (!res.ok) {
      const data = await res.json<any>().catch(() => ({}));
      return fail(res.status, {
        error: data.error_description || data.error || "Failed to start server",
      });
    }

    return { success: true, action: "start" };
  },

  stop: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(403, { error: "Not authenticated" });
    if (!isWayfinder(user.email)) return fail(403, { error: "Access denied" });
    if (!platform?.env?.AUTH)
      return fail(500, { error: "Service not available" });

    const res = await heartwoodFetch(platform, request, "/minecraft/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const data = await res.json<any>().catch(() => ({}));
      return fail(res.status, {
        error: data.error_description || data.error || "Failed to stop server",
      });
    }

    return { success: true, action: "stop" };
  },

  sync: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(403, { error: "Not authenticated" });
    if (!isWayfinder(user.email)) return fail(403, { error: "Access denied" });
    if (!platform?.env?.AUTH)
      return fail(500, { error: "Service not available" });

    const res = await heartwoodFetch(platform, request, "/minecraft/sync", {
      method: "POST",
    });

    if (!res.ok) {
      const data = await res.json<any>().catch(() => ({}));
      return fail(res.status, {
        error: data.error_description || data.error || "Failed to sync",
      });
    }

    return { success: true, action: "sync" };
  },

  command: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(403, { error: "Not authenticated" });
    if (!isWayfinder(user.email)) return fail(403, { error: "Access denied" });
    if (!platform?.env?.AUTH)
      return fail(500, { error: "Service not available" });

    const formData = await request.formData();
    const command = formData.get("command")?.toString().trim();

    if (!command) return fail(400, { error: "Command is required" });

    // Block dangerous commands
    const blocked = [
      "stop",
      "restart",
      "kill",
      "ban-ip",
      "op",
      "deop",
      "pardon-ip",
    ];
    const firstWord = command.split(" ")[0].toLowerCase();
    if (blocked.includes(firstWord)) {
      return fail(400, {
        error: `Command "${firstWord}" is blocked. Use the dedicated controls instead.`,
      });
    }

    const res = await heartwoodFetch(platform, request, "/minecraft/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });

    if (!res.ok) {
      const data = await res.json<any>().catch(() => ({}));
      return fail(res.status, {
        error: data.error_description || data.error || "Failed to send command",
      });
    }

    const data = await res.json<any>().catch(() => ({}));
    return {
      success: true,
      action: "command",
      response: data.response || "Command sent",
    };
  },

  whitelistAdd: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(403, { error: "Not authenticated" });
    if (!isWayfinder(user.email)) return fail(403, { error: "Access denied" });
    if (!platform?.env?.AUTH)
      return fail(500, { error: "Service not available" });

    const formData = await request.formData();
    const username = formData.get("username")?.toString().trim();

    if (!username) return fail(400, { error: "Username is required" });

    const res = await heartwoodFetch(
      platform,
      request,
      "/minecraft/whitelist",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", username }),
      },
    );

    if (!res.ok) {
      const data = await res.json<any>().catch(() => ({}));
      return fail(res.status, {
        error: data.error_description || data.error || "Failed to add player",
      });
    }

    return { success: true, action: "whitelistAdd" };
  },

  whitelistRemove: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(403, { error: "Not authenticated" });
    if (!isWayfinder(user.email)) return fail(403, { error: "Access denied" });
    if (!platform?.env?.AUTH)
      return fail(500, { error: "Service not available" });

    const formData = await request.formData();
    const username = formData.get("username")?.toString().trim();

    if (!username) return fail(400, { error: "Username is required" });

    const res = await heartwoodFetch(
      platform,
      request,
      "/minecraft/whitelist",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", username }),
      },
    );

    if (!res.ok) {
      const data = await res.json<any>().catch(() => ({}));
      return fail(res.status, {
        error:
          data.error_description || data.error || "Failed to remove player",
      });
    }

    return { success: true, action: "whitelistRemove" };
  },
};
