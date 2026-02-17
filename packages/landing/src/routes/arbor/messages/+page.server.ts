/**
 * Grove Messages — Admin compose page
 *
 * Wayfinder-only. Create, edit, publish, and archive messages
 * that display on the landing homepage or arbor admin panel.
 */

import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { GROVE_MESSAGE_CHANNELS } from "@autumnsgrove/lattice/services";
import { isWayfinder } from "@autumnsgrove/lattice/config";

interface DbMessage {
  id: string;
  channel: string;
  title: string;
  body: string;
  message_type: string;
  pinned: number;
  published: number;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

function generateId(): string {
  return crypto.randomUUID();
}

export const load: PageServerLoad = async ({ parent, platform }) => {
  const parentData = await parent();
  if (!parentData.isWayfinder) {
    throw redirect(302, "/arbor");
  }

  let messages: DbMessage[] = [];

  if (platform?.env?.DB) {
    const DB = platform.env.DB;
    try {
      const result = await DB.prepare(
        `SELECT * FROM grove_messages
         ORDER BY pinned DESC, created_at DESC`,
      ).all<DbMessage>();
      messages = result.results || [];
    } catch (err) {
      console.error("[Messages] Failed to load messages:", err);
    }
  }

  // Stats
  const total = messages.length;
  const published = messages.filter((m) => m.published).length;
  const byChannel = {
    landing: messages.filter((m) => m.channel === "landing").length,
    arbor: messages.filter((m) => m.channel === "arbor").length,
    plant: messages.filter((m) => m.channel === "plant").length,
    meadow: messages.filter((m) => m.channel === "meadow").length,
    clearing: messages.filter((m) => m.channel === "clearing").length,
  };

  return { messages, stats: { total, published, byChannel } };
};

export const actions: Actions = {
  create: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(403, { error: "Not authenticated" });
    if (!isWayfinder(user.email)) return fail(403, { error: "Access denied" });

    if (!platform?.env?.DB)
      return fail(500, { error: "Database not available" });
    const DB = platform.env.DB;

    const form = await request.formData();
    const title = form.get("title")?.toString()?.trim();
    const body = form.get("body")?.toString()?.trim();
    const channel = form.get("channel")?.toString();
    const message_type = form.get("message_type")?.toString() || "info";
    const pinned = form.get("pinned") === "on" ? 1 : 0;
    const published = form.get("published") === "on" ? 1 : 0;
    const expires_at = form.get("expires_at")?.toString() || null;

    if (!title || !body) {
      return fail(400, { error: "Title and body are required" });
    }
    if (
      !channel ||
      !(GROVE_MESSAGE_CHANNELS as readonly string[]).includes(channel)
    ) {
      return fail(400, { error: "Invalid channel" });
    }
    if (!["info", "warning", "celebration", "update"].includes(message_type)) {
      return fail(400, { error: "Invalid message type" });
    }

    try {
      const id = generateId();
      const now = new Date().toISOString();
      await DB.prepare(
        `INSERT INTO grove_messages (id, channel, title, body, message_type, pinned, published, expires_at, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          channel,
          title,
          body,
          message_type,
          pinned,
          published,
          expires_at || null,
          user.email,
          now,
          now,
        )
        .run();

      return { success: true, action: "create" };
    } catch (err) {
      console.error("[Messages] Failed to create:", err);
      return fail(500, { error: "Failed to create message" });
    }
  },

  update: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(403, { error: "Not authenticated" });
    if (!isWayfinder(user.email)) return fail(403, { error: "Access denied" });

    if (!platform?.env?.DB)
      return fail(500, { error: "Database not available" });
    const DB = platform.env.DB;

    const form = await request.formData();
    const id = form.get("id")?.toString();
    const title = form.get("title")?.toString()?.trim();
    const body = form.get("body")?.toString()?.trim();
    const channel = form.get("channel")?.toString();
    const message_type = form.get("message_type")?.toString();
    const pinned = form.get("pinned") === "on" ? 1 : 0;
    const expires_at = form.get("expires_at")?.toString() || null;

    if (!id || !title || !body) {
      return fail(400, { error: "ID, title, and body are required" });
    }

    try {
      const now = new Date().toISOString();
      await DB.prepare(
        `UPDATE grove_messages
         SET title = ?, body = ?, channel = ?, message_type = ?, pinned = ?, expires_at = ?, updated_at = ?
         WHERE id = ?`,
      )
        .bind(
          title,
          body,
          channel,
          message_type,
          pinned,
          expires_at || null,
          now,
          id,
        )
        .run();

      return { success: true, action: "update" };
    } catch (err) {
      console.error("[Messages] Failed to update:", err);
      return fail(500, { error: "Failed to update message" });
    }
  },

  publish: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(403, { error: "Not authenticated" });
    if (!isWayfinder(user.email)) return fail(403, { error: "Access denied" });

    if (!platform?.env?.DB)
      return fail(500, { error: "Database not available" });
    const DB = platform.env.DB;

    const form = await request.formData();
    const id = form.get("id")?.toString();
    const published = form.get("published") === "1" ? 1 : 0;

    if (!id) return fail(400, { error: "Message ID required" });

    try {
      const now = new Date().toISOString();
      await DB.prepare(
        `UPDATE grove_messages SET published = ?, updated_at = ? WHERE id = ?`,
      )
        .bind(published, now, id)
        .run();

      return { success: true, action: "publish" };
    } catch (err) {
      console.error("[Messages] Failed to toggle publish:", err);
      return fail(500, { error: "Failed to update message" });
    }
  },

  archive: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(403, { error: "Not authenticated" });
    if (!isWayfinder(user.email)) return fail(403, { error: "Access denied" });

    if (!platform?.env?.DB)
      return fail(500, { error: "Database not available" });
    const DB = platform.env.DB;

    const form = await request.formData();
    const id = form.get("id")?.toString();

    if (!id) return fail(400, { error: "Message ID required" });

    try {
      await DB.prepare("DELETE FROM grove_messages WHERE id = ?")
        .bind(id)
        .run();

      return { success: true, action: "archive" };
    } catch (err) {
      console.error("[Messages] Failed to archive:", err);
      return fail(500, { error: "Failed to archive message" });
    }
  },
};
