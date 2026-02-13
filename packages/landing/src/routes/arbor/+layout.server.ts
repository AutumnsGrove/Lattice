import { redirect, error } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { loadChannelMessages } from "@autumnsgrove/groveengine/services";
import { isWayfinder } from "@autumnsgrove/groveengine/config";

/**
 * Admin Layout Server
 *
 * Handles authentication once for all /arbor/* routes.
 * Child pages can access user data via `await parent()`.
 *
 * Wayfinder-only pages (greenhouse, porch) should check
 * `parentData.isWayfinder` before allowing access.
 */

export const load: LayoutServerLoad = async ({ locals, url, platform }) => {
  // Allow access to login page (its +page.server.ts handles the redirect to login hub)
  if (url.pathname === "/arbor/login") {
    return { user: locals.user, isWayfinder: false, messages: [] };
  }

  // Auth check - redirect to login if not authenticated
  if (!locals.user) {
    throw redirect(
      302,
      `/arbor/login?redirect=${encodeURIComponent(url.pathname)}`,
    );
  }

  // Admin check - only admins can access /arbor/*
  if (!locals.user.is_admin) {
    throw error(403, "Admin access required");
  }

  // Determine if user is the Wayfinder (has access to greenhouse, porch, etc.)
  const wayfinderCheck = isWayfinder(locals.user.email);

  // Fetch arbor-channel messages for admin panel banner
  const messages = platform?.env?.DB
    ? await loadChannelMessages(platform.env.DB, "arbor").catch((err) => {
        console.error("[Arbor] Failed to load messages:", err);
        return [];
      })
    : [];

  return {
    user: locals.user,
    isWayfinder: wayfinderCheck,
    messages,
  };
};
