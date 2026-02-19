/**
 * Meadow Reaction Emoji Set
 *
 * 10 warm emojis — no angry, no negative. Encouragement without performance.
 * Pattern follows guestbook's isValidEmoji() guard.
 */

export const MEADOW_REACTIONS = [
  { emoji: "❤️", label: "Love" },
  { emoji: "💛", label: "Warm" },
  { emoji: "💚", label: "Growth" },
  { emoji: "💙", label: "Calm" },
  { emoji: "💜", label: "Creative" },
  { emoji: "😂", label: "Joy" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Moved" },
  { emoji: "✨", label: "Magic" },
  { emoji: "🌱", label: "Growing" },
] as const;

/** O(1) validation set */
const VALID_REACTIONS = new Set<string>(MEADOW_REACTIONS.map((r) => r.emoji));

/** Check if an emoji is a valid Meadow reaction */
export function isValidReaction(emoji: string): boolean {
  return VALID_REACTIONS.has(emoji);
}
