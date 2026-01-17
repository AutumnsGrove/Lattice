/**
 * Journey Curio
 *
 * Repository evolution tracking with beautiful visualizations.
 * The second Developer Curio for Grove.
 *
 * Features:
 * - Tracks code growth over time
 * - Language composition breakdown
 * - Version milestones with AI summaries
 * - Multi-tenant support
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Journey curio configuration stored per tenant
 */
export interface JourneyCurioConfig {
  enabled: boolean;
  githubRepoUrl: string;
  githubToken?: string; // Encrypted
  openrouterKey?: string; // Encrypted
  openrouterModel: string;
  snapshotFrequency: "release" | "weekly" | "monthly" | "manual";
  showLanguageChart: boolean;
  showGrowthChart: boolean;
  showMilestones: boolean;
  timezone: string;
}

/**
 * Language breakdown by lines of code
 */
export interface LanguageBreakdown {
  [language: string]: {
    lines: number;
    pct: number;
  };
}

/**
 * A point-in-time snapshot of repository metrics
 */
export interface JourneySnapshot {
  id: string;
  tenantId: string;
  snapshotDate: string; // YYYY-MM-DD
  label: string; // "v1.0.0" or "weekly-2024-01-15"
  gitHash: string;
  totalLines: number; // Standardized: total code lines
  languageBreakdown: LanguageBreakdown;
  docLines: number; // Standardized: doc LINES (not words)
  totalFiles: number;
  directories: number;
  totalCommits: number;
  commitsSinceLast: number;
  testFiles: number;
  testLines: number;
  estimatedTokens: number;
  bundleSizeKb: number;
  ingestionSource: "firefly" | "api" | "manual";
  createdAt: number;
}

/**
 * Stats breakdown for a version summary
 */
export interface JourneySummaryStats {
  commits: number;
  features: number;
  fixes: number;
  refactoring: number;
  docs: number;
  tests: number;
  performance: number;
}

/**
 * AI-generated summary for a version milestone
 */
export interface JourneySummary {
  id: string;
  tenantId: string;
  snapshotId: string;
  version: string;
  summaryDate: string;
  summary: string; // Markdown narrative
  highlightsFeatures: string[];
  highlightsFixes: string[];
  stats: JourneySummaryStats;
  aiModel: string;
  aiCostUsd: number;
  createdAt: number;
}

/**
 * Background job for repository analysis
 */
export interface JourneyJob {
  id: string;
  tenantId: string;
  jobType: "analyze" | "backfill";
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  resultSnapshotId?: string;
  errorMessage?: string;
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default configuration for new Journey Curio setups
 */
export const DEFAULT_JOURNEY_CONFIG: Omit<
  JourneyCurioConfig,
  "githubRepoUrl" | "githubToken" | "openrouterKey"
> = {
  enabled: false,
  openrouterModel: "deepseek/deepseek-v3.2",
  snapshotFrequency: "release",
  showLanguageChart: true,
  showGrowthChart: true,
  showMilestones: true,
  timezone: "America/New_York",
};
