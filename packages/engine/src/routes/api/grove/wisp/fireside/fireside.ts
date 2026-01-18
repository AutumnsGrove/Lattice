/**
 * Fireside - Pure Functions & Types
 *
 * Extracted logic for testing. This module contains all pure functions
 * that don't depend on request/response handling.
 */

// ============================================================================
// Types
// ============================================================================

export interface FiresideMessage {
  role: "wisp" | "user";
  content: string;
  timestamp: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum length of a single user message */
export const MAX_MESSAGE_LENGTH = 2000;

/** Minimum number of user messages before drafting is allowed */
export const MIN_MESSAGES_FOR_DRAFT = 3;

/** Minimum estimated tokens from user before drafting is allowed */
export const MIN_TOKENS_FOR_DRAFT = 150;

/** Average characters per token (rough estimate) */
export const CHARS_PER_TOKEN = 4;

/** Max tokens for Wisp's response in conversation */
export const RESPONSE_MAX_TOKENS = 150;

/** Max tokens for draft generation */
export const DRAFT_MAX_TOKENS = 2000;

/** Max tokens for entire conversation (prevents unbounded growth) */
export const MAX_CONVERSATION_TOKENS = 120000;

// ============================================================================
// Starter Prompts
// ============================================================================

export const STARTER_PROMPTS = [
  // Open & Warm
  "What's been living in your head lately?",
  "What surprised you this week?",
  "What are you excited about right now?",
  "What's something small that made you smile recently?",
  // Reflective
  "What's something you've been meaning to write about but haven't found the words for?",
  "What would you tell a friend who asked how you're *really* doing?",
  "What's a thought you keep turning over?",
  // Creative & Playful
  "If you could ramble about anything right now, what would it be?",
  "What's something you wish more people understood?",
  "What did you learn recently that you can't stop thinking about?",
  // Returning Writers
  "It's been a while. What's been happening in your world?",
  "What are you working on that you'd love to talk about?",
];

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * Simple string hash for pseudorandom selection
 * Uses a basic djb2-style hash algorithm
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Select a starter prompt using pseudorandom rotation
 * Same user sees same prompt on same day, different prompt each day
 */
export function selectStarterPrompt(userId: string, date?: string): string {
  const today = date || new Date().toISOString().slice(0, 10);
  const seed = hashString(`${userId}:${today}`);
  return STARTER_PROMPTS[seed % STARTER_PROMPTS.length];
}

/**
 * Rough token estimation based on character count
 * Uses ~4 characters per token as a reasonable approximation
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Estimate total tokens in a conversation
 */
export function estimateConversationTokens(conversation: FiresideMessage[]): number {
  return conversation.reduce((sum, m) => sum + estimateTokens(m.content), 0);
}

/**
 * Check if conversation is approaching the token limit
 */
export function isConversationTooLong(conversation: FiresideMessage[]): boolean {
  return estimateConversationTokens(conversation) > MAX_CONVERSATION_TOKENS;
}

/**
 * Check if enough substance exists to generate a draft
 * Requires minimum messages AND minimum token count from user
 */
export function canDraft(conversation: FiresideMessage[]): boolean {
  const userMessages = conversation.filter((m) => m.role === "user");
  const totalUserTokens = userMessages.reduce(
    (sum, m) => sum + estimateTokens(m.content),
    0
  );

  return userMessages.length >= MIN_MESSAGES_FOR_DRAFT && totalUserTokens >= MIN_TOKENS_FOR_DRAFT;
}

/**
 * Generate a conversation ID
 * Format: timestamp-random
 */
export function generateConversationId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}
