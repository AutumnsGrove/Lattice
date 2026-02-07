import { redirect, error } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

/**
 * Admin Layout Server
 *
 * Handles authentication once for all /arbor/* routes.
 * Child pages can access user data via `await parent()`.
 *
 * Wayfinder-only pages (greenhouse, porch) should check
 * `parentData.isWayfinder` before allowing access.
 */

// The Wayfinder (platform owner) has access to all admin features
// Multiple emails for the same person (work + personal)
const WAYFINDER_EMAILS = ["autumn@grove.place", "autumnbrown23@pm.me"];

export const load: LayoutServerLoad = async ({ locals, platform }) => {
  // Auth check - redirect to login if not authenticated
  if (!locals.user) {
    throw redirect(302, "/arbor/login");
  }

  // Admin check - only admins can access /arbor/*
  if (!locals.user.is_admin) {
    throw error(403, "Admin access required");
  }

  // Determine if user is the Wayfinder (has access to greenhouse, porch, etc.)
  const isWayfinder = WAYFINDER_EMAILS.includes(
    locals.user.email.toLowerCase(),
  );

  // Fetch arbor-channel messages for admin panel banner
  type MessageType = "info" | "warning" | "celebration" | "update";
  let messages: Array<{
    id: string;
    title: string;
    body: string;
    message_type: MessageType;
    pinned: boolean;
    created_at: string;
  }> = [];

  if (platform?.env?.DB) {
    try {
      const result = await platform.env.DB.prepare(
        `SELECT id, title, body, message_type, pinned, created_at
         FROM grove_messages
         WHERE channel = 'arbor' AND published = 1
           AND (expires_at IS NULL OR expires_at > datetime('now'))
         ORDER BY pinned DESC, created_at DESC
         LIMIT 5`,
      ).all<{
        id: string;
        title: string;
        body: string;
        message_type: string;
        pinned: number;
        created_at: string;
      }>();
      messages = (result.results || []).map((m) => ({
        id: m.id,
        title: m.title,
        body: m.body,
        message_type: m.message_type as MessageType,
        pinned: !!m.pinned,
        created_at: m.created_at,
      }));
    } catch (err) {
      console.error("[Arbor] Failed to load messages:", err);
    }
  }

  return {
    user: locals.user,
    isWayfinder,
    messages,
  };
};
