/**
 * Long-Horizon Context Module
 *
 * Enables the daily summary AI to recognize and comment on multi-day tasks
 * by providing historical context from previous summaries.
 *
 * Key concepts:
 * - Context Brief: Condensed summary data stored for future reference
 * - Detected Focus: Pattern-matched task type (e.g., "security work", "refactoring")
 * - Continuation: When same focus detected across multiple days
 * - Focus Streak: Number of consecutive days on same task
 */

import type { Commit, GutterComment } from "./voices/types";
import { safeParseJson } from "../../utils/json.js";

// =============================================================================
// Types
// =============================================================================

/** Task type identifier from pattern matching */
export type TaskType =
  | "security work"
  | "migration"
  | "refactoring"
  | "testing improvements"
  | "documentation"
  | "UI/UX work"
  | "API development"
  | "authentication"
  | "performance optimization"
  | "deployment/CI work"
  | "database work"
  | "bug fixes";

/** Condensed summary data for historical context */
export interface ContextBrief {
  date: string;
  mainFocus: string;
  repos: string[];
  linesChanged: number;
  commitCount: number;
  detectedTask: TaskType | null;
}

/** Detected task focus for a day */
export interface DetectedFocus {
  task: TaskType;
  startDate: string;
  repos: string[];
}

/** Multi-day task continuation info */
export interface TaskContinuation {
  task: TaskType;
  startDate: string;
  dayCount: number;
}

/** Historical context entry from database */
export interface HistoricalContextEntry {
  date: string;
  brief: ContextBrief | null;
  focus: DetectedFocus | null;
  briefSummary: string | null;
}

/** Context data for storage alongside summary */
export interface SummaryContextData {
  contextBrief: ContextBrief;
  detectedFocus: DetectedFocus | null;
  continuationOf: string | null;
  focusStreak: number;
}

/** Context to pass to AI prompt */
export interface PromptContext {
  historicalContext: string;
  continuation: TaskContinuation | null;
}

// =============================================================================
// Task Detection Patterns
// =============================================================================

interface TaskPattern {
  pattern: RegExp;
  task: TaskType;
}

/**
 * 12 task detection patterns for recognizing work types.
 * Ordered roughly by specificity (more specific patterns first).
 */
const TASK_PATTERNS: TaskPattern[] = [
  {
    pattern: /security|audit|vulnerab|xss|csrf|auth.*fix/i,
    task: "security work",
  },
  { pattern: /migration?|migrate|upgrade/i, task: "migration" },
  { pattern: /refactor|cleanup|reorganize|restructur/i, task: "refactoring" },
  { pattern: /test|coverage|spec|jest|vitest/i, task: "testing improvements" },
  { pattern: /docs?|documentation|readme|comment/i, task: "documentation" },
  { pattern: /ui|design|style|css|tailwind|layout/i, task: "UI/UX work" },
  { pattern: /api|endpoint|route|graphql|rest/i, task: "API development" },
  { pattern: /auth|login|session|oauth|jwt/i, task: "authentication" },
  {
    pattern: /perf|performance|optimiz|speed|cache/i,
    task: "performance optimization",
  },
  {
    pattern: /deploy|ci|cd|pipeline|docker|build/i,
    task: "deployment/CI work",
  },
  { pattern: /database|schema|sql|d1|migration/i, task: "database work" },
  { pattern: /bug|fix|patch|issue|error/i, task: "bug fixes" },
];

// =============================================================================
// Task Detection Functions
// =============================================================================

/**
 * Quick task detection from text only (for pre-summary detection).
 * Used before AI generates the summary to detect multi-day continuation early.
 */
export function detectTaskFromText(text: string): TaskType | null {
  if (!text) return null;

  const scores = TASK_PATTERNS.map(({ pattern, task }) => {
    const matches = text.match(new RegExp(pattern, "gi")) || [];
    return { task, score: matches.length };
  }).filter((s) => s.score > 0);

  if (scores.length === 0) return null;
  scores.sort((a, b) => b.score - a.score);
  return scores[0].task;
}

/**
 * Comprehensive task detection from summary and commits.
 * More accurate after AI has analyzed the work.
 */
export function detectTask(
  summary: { brief: string; detailed: string },
  commits: Commit[],
): TaskType | null {
  const allMessages = commits.map((c) => c.message).join(" ");
  const summaryText = [summary.brief || "", summary.detailed || ""].join(" ");
  const combinedText = allMessages + " " + summaryText;

  const scores = TASK_PATTERNS.map(({ pattern, task }) => {
    const matches = combinedText.match(new RegExp(pattern, "gi")) || [];
    return { task, score: matches.length };
  }).filter((s) => s.score > 0);

  if (scores.length === 0) return null;
  scores.sort((a, b) => b.score - a.score);
  return scores[0].task;
}

// =============================================================================
// Context Brief Generation
// =============================================================================

/**
 * Extract main focus from summary markdown.
 * Looks for the brief summary or first substantive sentence.
 */
function extractMainFocus(summary: {
  brief: string;
  detailed: string;
}): string {
  // Use the brief summary if available
  if (summary.brief && summary.brief.length > 20) {
    const brief = summary.brief.substring(0, 200);
    const sentenceEnd = brief.search(/[.!?]\s/);
    if (sentenceEnd > 50) {
      return brief.substring(0, sentenceEnd + 1).trim();
    }
    return brief.trim();
  }

  // Fallback: try to extract from detailed content
  if (summary.detailed) {
    const lines = summary.detailed.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      if (line.startsWith("#")) continue;
      if (line.match(/^[-*+]\s*$/)) continue;
      if (line.length > 20 && line.length < 200) {
        return line
          .replace(/^[-*+]\s*/, "")
          .replace(/\*\*/g, "")
          .trim();
      }
    }
  }

  return "Various development tasks";
}

/**
 * Generate a condensed context brief from a summary.
 * Used for passing historical context to future summaries.
 */
export function generateContextBrief(
  summary: { brief: string; detailed: string },
  commits: Commit[],
  date: string,
): ContextBrief {
  const repos = [...new Set(commits.map((c) => c.repo))];
  const linesChanged = commits.reduce(
    (sum, c) => sum + (c.additions || 0) + (c.deletions || 0),
    0,
  );
  const mainFocus = extractMainFocus(summary);
  const detectedTask = detectTask(summary, commits);

  return {
    date,
    mainFocus,
    repos: repos.slice(0, 3), // Top 3 repos
    linesChanged,
    commitCount: commits.length,
    detectedTask,
  };
}

/**
 * Build detected focus object for storage.
 */
export function buildDetectedFocus(
  task: TaskType | null,
  date: string,
  repos: string[],
): DetectedFocus | null {
  if (!task) return null;

  return {
    task,
    startDate: date,
    repos: repos.slice(0, 3),
  };
}

// =============================================================================
// Historical Context Retrieval
// =============================================================================

/** Database row structure for historical context query */
interface HistoricalContextRow {
  summary_date: string;
  context_brief: string | null;
  detected_focus: string | null;
  brief_summary: string | null;
  commit_count: number;
}

/**
 * Retrieve historical context for summary generation.
 * Returns last 3 days of context briefs (skipping rest days).
 *
 * @param db - D1 database binding
 * @param tenantId - Tenant ID for multi-tenant isolation
 * @param targetDate - Target date (YYYY-MM-DD) to get context for
 */
export async function getHistoricalContext(
  db: D1Database,
  tenantId: string,
  targetDate: string,
): Promise<HistoricalContextEntry[]> {
  const dateObj = new Date(targetDate);

  // Get past 7 days to account for gaps (weekends, etc)
  // but only return up to 3 with actual context
  const dates: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(dateObj);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  const placeholders = dates.map(() => "?").join(",");
  const query = `
    SELECT summary_date, context_brief, detected_focus, brief_summary, commit_count
    FROM timeline_summaries
    WHERE tenant_id = ?
      AND summary_date IN (${placeholders})
      AND commit_count > 0
    ORDER BY summary_date DESC
    LIMIT 3
  `;

  try {
    const results = await db
      .prepare(query)
      .bind(tenantId, ...dates)
      .all<HistoricalContextRow>();

    return results.results
      .map((row) => ({
        date: row.summary_date,
        brief: row.context_brief
          ? safeParseJson<ContextBrief | null>(row.context_brief, null, {
              context: "timeline.contextBrief",
            })
          : null,
        focus: row.detected_focus
          ? safeParseJson<DetectedFocus | null>(row.detected_focus, null, {
              context: "timeline.detectedFocus",
            })
          : null,
        briefSummary: row.brief_summary,
      }))
      .filter((r) => r.brief || r.briefSummary);
  } catch (error) {
    console.error("Failed to get historical context:", error);
    return [];
  }
}

// =============================================================================
// Continuation Detection
// =============================================================================

/**
 * Detect multi-day task continuation.
 * Checks if the same task type appears across consecutive days.
 */
export function detectContinuation(
  historicalContext: HistoricalContextEntry[],
  currentFocus: TaskType | null,
): TaskContinuation | null {
  if (!currentFocus || historicalContext.length === 0) {
    return null;
  }

  let streak = 0;
  let startDate: string | null = null;

  for (const ctx of historicalContext) {
    const ctxFocus = ctx.focus?.task || ctx.brief?.detectedTask;
    if (ctxFocus === currentFocus) {
      streak++;
      startDate = ctx.date;
    } else {
      break; // Streak broken
    }
  }

  if (streak >= 1 && startDate) {
    return {
      task: currentFocus,
      startDate,
      dayCount: streak + 1, // +1 for current day
    };
  }

  return null;
}

// =============================================================================
// Prompt Formatting
// =============================================================================

/**
 * Format historical context for prompt inclusion.
 * Condensed single-line format to minimize token usage.
 */
export function formatHistoricalContextForPrompt(
  historicalContext: HistoricalContextEntry[],
): string {
  if (!historicalContext || historicalContext.length === 0) {
    return "";
  }

  // Condensed format: one line per day to save tokens
  const lines = historicalContext.map((ctx) => {
    const brief = ctx.brief;
    const focus = brief?.mainFocus || ctx.briefSummary || "Various work";
    const repos = brief?.repos?.join(", ") || "multiple repos";
    const task = ctx.focus?.task || brief?.detectedTask;
    const loc = brief?.linesChanged || 0;
    // Truncate focus to ~80 chars to keep context lean
    const shortFocus =
      focus.length > 80 ? focus.substring(0, 77) + "..." : focus;
    const locStr = loc > 0 ? `, ~${loc} lines` : "";

    return `- ${ctx.date}: ${shortFocus} (${repos}${locStr}${task ? `, ${task}` : ""})`;
  });

  return lines.join("\n");
}

/**
 * Format continuation info for prompt inclusion.
 * Gives the AI guidance on acknowledging multi-day work naturally.
 */
export function formatContinuationForPrompt(
  continuation: TaskContinuation | null,
): string {
  if (!continuation) return "";

  return `## Ongoing Task Detected

This appears to be day ${continuation.dayCount} of work on "${continuation.task}"
(started ${continuation.startDate}).

When appropriate, acknowledge this multi-day effort naturally without being
cheerleader-y. Examples:
- "Day 3 of the auth refactor. Good progress on the session handling."
- "Still working through the migration—today focused on the API layer."
- "The security audit continues with rate limiting improvements."

Avoid: "Amazing progress!" or "You're crushing it!" or any excitement about streaks.`;
}

/**
 * Build the complete prompt context for AI generation.
 */
export function buildPromptContext(
  historicalContext: HistoricalContextEntry[],
  preDetectedTask: TaskType | null,
): PromptContext {
  const continuation = detectContinuation(historicalContext, preDetectedTask);

  return {
    historicalContext: formatHistoricalContextForPrompt(historicalContext),
    continuation,
  };
}

/**
 * Build complete context data for storage after summary generation.
 */
export function buildSummaryContextData(
  summary: { brief: string; detailed: string },
  commits: Commit[],
  date: string,
  historicalContext: HistoricalContextEntry[],
  preDetectedTask: TaskType | null,
): SummaryContextData {
  const repos = [...new Set(commits.map((c) => c.repo))];

  // Generate context brief
  const contextBrief = generateContextBrief(summary, commits, date);

  // Refine task detection with full summary content
  const detectedTaskType = detectTask(summary, commits);
  const detectedFocus = buildDetectedFocus(detectedTaskType, date, repos);

  // Update continuation detection with refined task type
  let continuation = detectContinuation(historicalContext, preDetectedTask);
  if (detectedTaskType && detectedTaskType !== preDetectedTask) {
    continuation = detectContinuation(historicalContext, detectedTaskType);
  }

  const focusStreak = continuation
    ? continuation.dayCount
    : detectedTaskType
      ? 1
      : 0;

  return {
    contextBrief,
    detectedFocus,
    continuationOf: continuation?.startDate || null,
    focusStreak,
  };
}
