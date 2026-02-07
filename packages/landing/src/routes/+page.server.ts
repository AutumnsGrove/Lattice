import type { ServerLoad } from "@sveltejs/kit";
import { buildGroveAdminUrl } from "@autumnsgrove/groveengine/utils";

export const load: ServerLoad = async ({ locals, platform }) => {
  let groveUrl: string | null = null;

  // If logged in, find their grove
  if (locals.user?.email && platform?.env?.DB) {
    try {
      // Use LOWER() for case-insensitive email matching
      // Session might return "Autumn@Grove.Place" but DB stores "autumn@grove.place"
      const tenant = await platform.env.DB.prepare(
        "SELECT subdomain FROM tenants WHERE LOWER(email) = LOWER(?) LIMIT 1",
      )
        .bind(locals.user.email)
        .first<{ subdomain: string }>();

      if (tenant?.subdomain) {
        groveUrl = buildGroveAdminUrl(tenant.subdomain);
      }
    } catch {
      // No grove yet - that's fine
    }
  }

  // Fallback for logged-in users without a grove: link to Plant for signup
  // This prevents Header from falling back to relative "/arbor" (which becomes grove.place/arbor)
  if (locals.user && !groveUrl) {
    groveUrl = "https://plant.grove.place";
  }

  // Fetch landing-channel messages
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
         WHERE channel = 'landing' AND published = 1
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
    } catch {
      // Messages table may not exist yet — that's fine
    }
  }

  return {
    groveUrl,
    messages,
  };
};
