/**
 * Pulse Curio
 *
 * Live development heartbeat from GitHub webhooks.
 * Shows real-time activity: commits flowing, PRs merging, issues moving, releases shipping.
 *
 * Unlike Timeline (polling + AI) and Journey (snapshots), Pulse uses push-based
 * webhooks — events arrive in seconds, no GitHub token needed, no API rate limits.
 *
 * Features:
 * - Real-time webhook events from GitHub
 * - Activity heatmap (7-day x 24-hour)
 * - Today's stats dashboard
 * - Chronological event feed with type filters
 * - 30-day trend sparklines
 * - Commit streak tracking
 */

// =============================================================================
// Svelte Components
// =============================================================================

export { default as Pulse } from "./Pulse.svelte";
export { default as PulseCompact } from "./PulseCompact.svelte";
export { default as PulseIndicator } from "./PulseIndicator.svelte";
export { default as PulseStats } from "./PulseStats.svelte";
export { default as PulseHeatmap } from "./PulseHeatmap.svelte";
export { default as PulseFeed } from "./PulseFeed.svelte";
export { default as PulseTrends } from "./PulseTrends.svelte";

// =============================================================================
// Types
// =============================================================================

/**
 * Pulse curio configuration stored per tenant
 */
export interface PulseCurioConfig {
  enabled: boolean;
  showHeatmap: boolean;
  showFeed: boolean;
  showStats: boolean;
  showTrends: boolean;
  showCi: boolean;
  reposInclude: string[] | null;
  reposExclude: string[] | null;
  timezone: string;
  feedMaxItems: number;
  /** Whether a webhook secret exists (never expose the actual secret) */
  hasWebhookSecret: boolean;
  /** The webhook URL for this tenant */
  webhookUrl: string;
}

/**
 * Normalized webhook event stored in pulse_events
 */
export interface PulseEvent {
  id: string;
  tenantId: string;
  deliveryId: string | null;
  eventType: string;
  action: string | null;
  repoName: string;
  repoFullName: string;
  actor: string;
  title: string | null;
  ref: string | null;
  data: Record<string, unknown>;
  occurredAt: number;
}

/**
 * Aggregated daily stats from pulse_daily_stats
 */
export interface PulseDailyStats {
  date: string;
  repoName: string | null;
  commits: number;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
  prsOpened: number;
  prsMerged: number;
  prsClosed: number;
  issuesOpened: number;
  issuesClosed: number;
  releases: number;
  ciPasses: number;
  ciFailures: number;
  starsTotal: number | null;
  forksTotal: number | null;
}

/**
 * Hourly activity data for heatmap
 */
export interface PulseHourlyActivity {
  date: string;
  hour: number;
  commits: number;
  events: number;
}

/**
 * KV-cached "active" indicator
 */
export interface PulseActiveStatus {
  isActive: boolean;
  lastCommit?: number;
  author?: string;
  message?: string;
}

/**
 * KV-cached today's stats
 */
export interface PulseTodayStats {
  commits: number;
  prsMerged: number;
  issuesClosed: number;
  linesAdded: number;
  linesRemoved: number;
}

/**
 * KV-cached streak data
 */
export interface PulseStreak {
  days: number;
  since: string;
}

/**
 * Full page data for the /pulse route
 */
export interface PulsePageData {
  config: PulseCurioConfig;
  active: PulseActiveStatus;
  today: PulseTodayStats;
  streak: PulseStreak;
  events: PulseEvent[];
  dailyStats: PulseDailyStats[];
  hourlyActivity: PulseHourlyActivity[];
}

// =============================================================================
// Constants
// =============================================================================

/** Webhook receiver URL base */
export const PULSE_WEBHOOK_BASE = "https://grove-pulse.workers.dev/webhook";

/** Supported GitHub webhook event types */
export const PULSE_EVENT_TYPES = [
  "push",
  "pull_request",
  "issues",
  "release",
  "workflow_run",
  "star",
  "fork",
  "create",
  "delete",
] as const;

export type PulseEventType = (typeof PULSE_EVENT_TYPES)[number];

/** Event type display configuration */
export const EVENT_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  push: { label: "Push", color: "var(--color-primary)", icon: "git-commit" },
  pull_request_merged: {
    label: "PR Merged",
    color: "#a855f7",
    icon: "git-merge",
  },
  pull_request_opened: {
    label: "PR Opened",
    color: "#3b82f6",
    icon: "git-pull-request",
  },
  pull_request_closed: {
    label: "PR Closed",
    color: "#6b7280",
    icon: "git-pull-request",
  },
  issues_opened: {
    label: "Issue Opened",
    color: "#f59e0b",
    icon: "circle-dot",
  },
  issues_closed: {
    label: "Issue Closed",
    color: "#6b7280",
    icon: "circle-check",
  },
  release: { label: "Release", color: "#eab308", icon: "tag" },
  workflow_run_success: {
    label: "CI Passed",
    color: "#22c55e",
    icon: "check-circle",
  },
  workflow_run_failure: {
    label: "CI Failed",
    color: "#ef4444",
    icon: "x-circle",
  },
  star: { label: "Star", color: "#eab308", icon: "star" },
  fork: { label: "Fork", color: "#8b5cf6", icon: "git-fork" },
  create: { label: "Branch/Tag Created", color: "#22c55e", icon: "git-branch" },
  delete: { label: "Branch/Tag Deleted", color: "#6b7280", icon: "trash-2" },
};

/**
 * Default configuration for new Pulse Curio setups
 */
export const DEFAULT_PULSE_CONFIG = {
  enabled: false,
  showHeatmap: true,
  showFeed: true,
  showStats: true,
  showTrends: true,
  showCi: true,
  timezone: "America/New_York",
  feedMaxItems: 100,
  reposInclude: null,
  reposExclude: null,
  hasWebhookSecret: false,
  webhookUrl: "",
} as const;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the display key for an event (combines eventType + action for color coding)
 */
export function getEventDisplayKey(
  eventType: string,
  action: string | null,
  data?: Record<string, unknown>,
): string {
  if (eventType === "pull_request") {
    if (data?.merged) return "pull_request_merged";
    if (action === "opened" || action === "reopened")
      return "pull_request_opened";
    return "pull_request_closed";
  }
  if (eventType === "issues") {
    if (action === "opened" || action === "reopened") return "issues_opened";
    return "issues_closed";
  }
  if (eventType === "workflow_run") {
    const conclusion = data?.conclusion as string | undefined;
    return conclusion === "success"
      ? "workflow_run_success"
      : "workflow_run_failure";
  }
  return eventType;
}

/**
 * Format a relative timestamp (e.g., "2 hours ago", "just now")
 */
export function formatRelativeTime(unixSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixSeconds;

  if (diff < 60) return "just now";
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return `${mins}m ago`;
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours}h ago`;
  }
  if (diff < 604800) {
    const days = Math.floor(diff / 86400);
    return `${days}d ago`;
  }
  const date = new Date(unixSeconds * 1000);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Build the webhook URL for a tenant
 */
export function buildWebhookUrl(tenantId: string): string {
  return `${PULSE_WEBHOOK_BASE}/${tenantId}`;
}
