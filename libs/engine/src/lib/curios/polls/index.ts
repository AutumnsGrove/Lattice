/**
 * Polls Curio
 *
 * Run interactive polls on your site with live results.
 * Low friction voting — no login required, one vote per visitor.
 *
 * Features:
 * - Single choice and multiple choice polls
 * - Configurable results visibility
 * - Close dates for time-limited polls
 * - Pinned polls for homepage display
 * - Rate-limited voting via IP hash
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Poll type
 */
export type PollType = "single" | "multiple";

/**
 * When results are visible
 */
export type ResultsVisibility =
  | "always"
  | "after-vote"
  | "after-close"
  | "admin-only";

/**
 * Poll option
 */
export interface PollOption {
  id: string;
  text: string;
}

/**
 * Poll record stored in database
 */
export interface PollRecord {
  id: string;
  tenantId: string;
  question: string;
  description: string | null;
  pollType: PollType;
  options: PollOption[];
  resultsVisibility: ResultsVisibility;
  isPinned: boolean;
  closeDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Vote record
 */
export interface VoteRecord {
  id: string;
  pollId: string;
  tenantId: string;
  voterHash: string;
  selectedOptions: string[];
  votedAt: string;
}

/**
 * Poll results for display
 */
export interface PollResults {
  totalVotes: number;
  optionCounts: Record<string, number>;
}

/**
 * Poll for public display
 */
export interface PollDisplay {
  id: string;
  question: string;
  description: string | null;
  pollType: PollType;
  options: PollOption[];
  resultsVisibility: ResultsVisibility;
  isPinned: boolean;
  isClosed: boolean;
  closeDate: string | null;
  results: PollResults | null;
  hasVoted: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Poll type options
 */
export const POLL_TYPE_OPTIONS: { value: PollType; label: string }[] = [
  { value: "single", label: "Single Choice" },
  { value: "multiple", label: "Multiple Choice" },
];

/**
 * Results visibility options
 */
export const RESULTS_VISIBILITY_OPTIONS: {
  value: ResultsVisibility;
  label: string;
  description: string;
}[] = [
  {
    value: "always",
    label: "Always",
    description: "Results visible before voting",
  },
  {
    value: "after-vote",
    label: "After Voting",
    description: "Visible only after casting a vote",
  },
  {
    value: "after-close",
    label: "After Close",
    description: "Visible only after the poll closes",
  },
  {
    value: "admin-only",
    label: "Admin Only",
    description: "Only you can see results",
  },
];

/**
 * Valid poll types
 */
export const VALID_POLL_TYPES = new Set<string>(["single", "multiple"]);

/**
 * Valid results visibility options
 */
export const VALID_RESULTS_VISIBILITY = new Set<string>(
  RESULTS_VISIBILITY_OPTIONS.map((v) => v.value),
);

/**
 * Maximum question length
 */
export const MAX_QUESTION_LENGTH = 300;

/**
 * Maximum description length
 */
export const MAX_DESCRIPTION_LENGTH = 500;

/**
 * Maximum option text length
 */
export const MAX_OPTION_TEXT_LENGTH = 200;

/**
 * Maximum number of options per poll
 */
export const MAX_OPTIONS = 20;

/**
 * Minimum number of options per poll
 */
export const MIN_OPTIONS = 2;

/**
 * Max polls per tenant
 */
export const MAX_POLLS_PER_TENANT = 100;

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

/**
 * Generate a unique poll ID
 */
export function generatePollId(): string {
  return `poll_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate a unique vote ID
 */
export function generateVoteId(): string {
  return `pv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate a unique option ID
 */
export function generateOptionId(): string {
  return `opt_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Check if a poll is closed
 */
export function isPollClosed(closeDate: string | null): boolean {
  if (!closeDate) return false;
  return new Date(closeDate).getTime() < Date.now();
}

/**
 * Validate poll type
 */
export function isValidPollType(type: string): type is PollType {
  return VALID_POLL_TYPES.has(type);
}

/**
 * Validate results visibility
 */
export function isValidResultsVisibility(
  visibility: string,
): visibility is ResultsVisibility {
  return VALID_RESULTS_VISIBILITY.has(visibility);
}

/**
 * Sanitize question text
 */
export function sanitizeQuestion(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_QUESTION_LENGTH)
    return cleaned.slice(0, MAX_QUESTION_LENGTH);
  return cleaned;
}

/**
 * Sanitize option text
 */
export function sanitizeOptionText(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_OPTION_TEXT_LENGTH)
    return cleaned.slice(0, MAX_OPTION_TEXT_LENGTH);
  return cleaned;
}

/**
 * Parse and validate poll options from JSON string
 */
export function parseOptions(optionsJson: string): PollOption[] {
  try {
    const parsed = JSON.parse(optionsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (opt: unknown) =>
          opt &&
          typeof opt === "object" &&
          "id" in opt &&
          "text" in opt &&
          typeof (opt as PollOption).id === "string" &&
          typeof (opt as PollOption).text === "string",
      )
      .slice(0, MAX_OPTIONS);
  } catch {
    return [];
  }
}

/**
 * Calculate results from votes
 */
export function calculateResults(
  options: PollOption[],
  votes: { selectedOptions: string[] }[],
): PollResults {
  const optionCounts: Record<string, number> = {};
  for (const opt of options) {
    optionCounts[opt.id] = 0;
  }

  for (const vote of votes) {
    for (const optId of vote.selectedOptions) {
      if (optId in optionCounts) {
        optionCounts[optId]++;
      }
    }
  }

  return {
    totalVotes: votes.length,
    optionCounts,
  };
}

/**
 * Parse selected options from JSON string
 */
export function parseSelectedOptions(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s: unknown) => typeof s === "string");
  } catch {
    return [];
  }
}
