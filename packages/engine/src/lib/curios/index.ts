/**
 * Grove Curios
 *
 * Fun, delightful tools and features that make a website feel alive.
 * These are the guestbooks, hit counters, and strange artifacts of the modern web.
 *
 * Developer Curios:
 * - Timeline: AI-powered daily summaries of GitHub activity
 * - Journey: Visualize your repo's growth over time
 *
 * Visitor Curios (coming soon):
 * - Guestbooks, hit counters, shrines, link gardens, etc.
 */

// =============================================================================
// Developer Curios
// =============================================================================

export * from "./timeline";
// Re-export journey except CLEAR_TOKEN_VALUE (which is identical to timeline's)
// This avoids "Module has already exported a member named 'CLEAR_TOKEN_VALUE'" error
export {
  // Types
  type JourneyCurioConfig,
  type LanguageBreakdown,
  type JourneySnapshot,
  type JourneySummaryStats,
  type JourneySummary,
  type JourneyJob,
  // Constants
  DEFAULT_JOURNEY_CONFIG,
  GITHUB_REPO_PATTERN,
  DEFAULT_SNAPSHOT_LIMIT,
  MAX_SNAPSHOT_LIMIT,
  DEFAULT_MILESTONE_LIMIT,
  MAX_MILESTONE_LIMIT,
  // Functions
  isValidGithubRepoUrl,
  toSqliteBoolean,
  safeParseInt,
} from "./journey";
