/**
 * Grove Messages Service
 *
 * Shared utility for loading published messages by channel.
 * Used by landing, arbor, plant, meadow, and clearing to display
 * announcements from the Wayfinder.
 */

import type {
  GroveMessage,
  GroveMessageChannel,
} from "../../ui/components/ui/grove-messages/types.js";

/** All supported message channels across Grove properties */
export const GROVE_MESSAGE_CHANNELS = [
  "landing",
  "arbor",
  "plant",
  "meadow",
  "clearing",
] as const;

export type { GroveMessageChannel };

/**
 * Load published, non-expired messages for a given channel.
 *
 * Encapsulates the standard query + type-mapping pattern that was
 * previously duplicated across 3 files (~40 lines each).
 */
export async function loadChannelMessages(
  db: D1Database,
  channel: GroveMessageChannel,
  limit = 5,
): Promise<GroveMessage[]> {
  const result = await db
    .prepare(
      `SELECT id, title, body, message_type, pinned, created_at
       FROM grove_messages
       WHERE channel = ? AND published = 1
         AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY pinned DESC, created_at DESC
       LIMIT ?`,
    )
    .bind(channel, limit)
    .all();

  return (result.results || []).map((m) => ({
    id: m.id as string,
    title: m.title as string,
    body: m.body as string,
    message_type: m.message_type as GroveMessage["message_type"],
    pinned: !!m.pinned,
    created_at: m.created_at as string,
  }));
}
