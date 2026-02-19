/**
 * Weird Artifacts Curio
 *
 * Interactive chaos objects — Magic 8-Ball, fortune cookies,
 * dice rollers, marquee text. Playful elements that make
 * personal sites delightful.
 *
 * Features:
 * - Self-contained interactive artifacts
 * - Daily draws seeded by date (consistent per day per tenant)
 * - Custom configuration per artifact (JSON)
 * - Keyboard-accessible with reduced motion fallbacks
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Artifact type — the kind of interactive object
 */
export type ArtifactType =
  | "magic8ball"
  | "fortunecookie"
  | "diceroller"
  | "marqueetext"
  | "tarotcard"
  | "coinflip"
  | "blinkingnew"
  | "rainbowdivider";

/**
 * Placement options for artifacts
 */
export type ArtifactPlacement = "right-vine" | "left-vine" | "floating";

/**
 * Artifact record stored in database
 */
export interface ArtifactRecord {
  id: string;
  tenantId: string;
  artifactType: ArtifactType;
  placement: ArtifactPlacement;
  config: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
}

/**
 * Artifact for public display
 */
export interface ArtifactDisplay {
  id: string;
  artifactType: ArtifactType;
  placement: ArtifactPlacement;
  config: Record<string, unknown>;
}

/**
 * Magic 8-Ball config
 */
export interface Magic8BallConfig {
  customAnswers?: string[];
}

/**
 * Dice Roller config
 */
export interface DiceRollerConfig {
  diceType?: "d4" | "d6" | "d8" | "d12" | "d20";
}

/**
 * Marquee Text config
 */
export interface MarqueeTextConfig {
  text?: string;
  speed?: "slow" | "normal" | "fast";
  direction?: "left" | "right";
}

// =============================================================================
// Constants
// =============================================================================

/**
 * All artifact type definitions
 */
export const ARTIFACT_TYPES: {
  value: ArtifactType;
  label: string;
  description: string;
  category: "mystical" | "interactive" | "classic";
}[] = [
  {
    value: "magic8ball",
    label: "Magic 8-Ball",
    description: "Shake for an answer to your question",
    category: "mystical",
  },
  {
    value: "fortunecookie",
    label: "Fortune Cookie",
    description: "Crack open for a daily fortune",
    category: "mystical",
  },
  {
    value: "tarotcard",
    label: "Tarot Card",
    description: "Daily card draw with meaning",
    category: "mystical",
  },
  {
    value: "diceroller",
    label: "Dice Roller",
    description: "Roll any die from d4 to d20",
    category: "interactive",
  },
  {
    value: "coinflip",
    label: "Coin Flip",
    description: "Heads or tails with flip animation",
    category: "interactive",
  },
  {
    value: "marqueetext",
    label: "Marquee Text",
    description: "Scrolling message across the page",
    category: "classic",
  },
  {
    value: "blinkingnew",
    label: 'Blinking "NEW!"',
    description: "The classic blinking new indicator",
    category: "classic",
  },
  {
    value: "rainbowdivider",
    label: "Rainbow Divider",
    description: "Colorful separator line",
    category: "classic",
  },
];

/**
 * Placement options
 */
export const PLACEMENT_OPTIONS: {
  value: ArtifactPlacement;
  label: string;
}[] = [
  { value: "right-vine", label: "Right Vine" },
  { value: "left-vine", label: "Left Vine" },
  { value: "floating", label: "Floating" },
];

/**
 * Default Magic 8-Ball answers
 */
export const DEFAULT_8BALL_ANSWERS: string[] = [
  "It is certain",
  "Without a doubt",
  "Yes definitely",
  "You may rely on it",
  "As I see it, yes",
  "Most likely",
  "Outlook good",
  "Yes",
  "Signs point to yes",
  "Reply hazy, try again",
  "Ask again later",
  "Better not tell you now",
  "Cannot predict now",
  "Concentrate and ask again",
  "Don't count on it",
  "My reply is no",
  "My sources say no",
  "Outlook not so good",
  "Very doubtful",
  "The forest whispers no",
];

/**
 * Daily fortunes
 */
export const DEFAULT_FORTUNES: string[] = [
  "A pleasant surprise is waiting for you",
  "The path ahead is clear — walk boldly",
  "Something you lost will soon be found",
  "A creative endeavor will bear fruit",
  "Trust the process; the grove grows slowly",
  "An old friend will reach out soon",
  "Your patience will be rewarded today",
  "The answer you seek is closer than you think",
  "A small kindness will ripple outward",
  "Today is a good day for new beginnings",
  "The stars are aligned in your favor",
  "Rest is productive too — the forest rests",
  "Something wonderful is on its way",
  "Your instincts are right — trust them",
  "A gentle wind carries good news",
];

/**
 * Dice types
 */
export const DICE_TYPES = ["d4", "d6", "d8", "d12", "d20"] as const;
export type DiceType = (typeof DICE_TYPES)[number];

/**
 * Dice faces per type
 */
export const DICE_FACES: Record<DiceType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d12: 12,
  d20: 20,
};

/**
 * Valid artifact types set
 */
export const VALID_ARTIFACT_TYPES = new Set<string>(
  ARTIFACT_TYPES.map((a) => a.value),
);

/**
 * Valid placements set
 */
export const VALID_PLACEMENTS = new Set<string>(
  PLACEMENT_OPTIONS.map((p) => p.value),
);

/**
 * Max config JSON size
 */
export const MAX_CONFIG_SIZE = 4096;

/**
 * Max marquee text length
 */
export const MAX_MARQUEE_TEXT_LENGTH = 200;

/**
 * Max artifacts per tenant
 */
export const MAX_ARTIFACTS_PER_TENANT = 100;

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

/**
 * Generate a unique artifact ID
 */
export function generateArtifactId(): string {
  return `art_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Validate artifact type
 */
export function isValidArtifactType(type: string): type is ArtifactType {
  return VALID_ARTIFACT_TYPES.has(type);
}

/**
 * Validate placement
 */
export function isValidPlacement(
  placement: string,
): placement is ArtifactPlacement {
  return VALID_PLACEMENTS.has(placement);
}

/**
 * Sanitize artifact config JSON
 */
export function sanitizeConfig(
  configStr: string | null | undefined,
): Record<string, unknown> {
  if (!configStr) return {};
  try {
    const parsed = JSON.parse(configStr);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Sanitize marquee text
 */
export function sanitizeMarqueeText(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_MARQUEE_TEXT_LENGTH)
    return cleaned.slice(0, MAX_MARQUEE_TEXT_LENGTH);
  return cleaned;
}

/**
 * Get a seeded daily value (consistent for a given date + tenant)
 */
export function getDailyIndex(
  tenantId: string,
  totalOptions: number,
  dateStr?: string,
): number {
  const date = dateStr || new Date().toISOString().slice(0, 10);
  const seed = `${date}:${tenantId}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash) % totalOptions;
}

/**
 * Get a random 8-Ball answer
 */
export function get8BallAnswer(customAnswers?: string[]): string {
  const answers =
    customAnswers && customAnswers.length > 0
      ? customAnswers
      : DEFAULT_8BALL_ANSWERS;
  return answers[Math.floor(Math.random() * answers.length)];
}

/**
 * Get daily fortune for a tenant
 */
export function getDailyFortune(tenantId: string, dateStr?: string): string {
  const index = getDailyIndex(tenantId, DEFAULT_FORTUNES.length, dateStr);
  return DEFAULT_FORTUNES[index];
}

/**
 * Roll a die
 */
export function rollDice(diceType: DiceType): number {
  const faces = DICE_FACES[diceType] || 6;
  return Math.floor(Math.random() * faces) + 1;
}

/**
 * Flip a coin
 */
export function flipCoin(): "heads" | "tails" {
  return Math.random() < 0.5 ? "heads" : "tails";
}

/**
 * Transform record to public display
 */
export function toDisplayArtifact(record: ArtifactRecord): ArtifactDisplay {
  return {
    id: record.id,
    artifactType: record.artifactType,
    placement: record.placement,
    config: record.config,
  };
}
