/**
 * Timeline Sync Configuration
 *
 * Types and constants for the timeline sync cron worker.
 */

// =============================================================================
// Environment Types
// =============================================================================

export interface Env {
  /** D1 database (grove-engine-db) */
  DB: D1Database;
  /** Encryption key for decrypting tenant API tokens (hex string) */
  TOKEN_ENCRYPTION_KEY: string;
  /** Optional fallback OpenRouter key if tenant key fails */
  OPENROUTER_API_KEY?: string;
}

// =============================================================================
// Database Types
// =============================================================================

/** Raw row from timeline_curio_config table */
export interface TenantConfigRow {
  tenant_id: string;
  github_username: string;
  github_token_encrypted: string;
  openrouter_key_encrypted: string;
  openrouter_model: string;
  voice_preset: string;
  custom_system_prompt: string | null;
  custom_summary_instructions: string | null;
  custom_gutter_style: string | null;
  repos_include: string | null;
  repos_exclude: string | null;
  timezone: string;
  owner_name: string | null;
}

/** Parsed tenant configuration */
export interface TenantConfig {
  tenantId: string;
  githubUsername: string;
  githubTokenEncrypted: string;
  openrouterKeyEncrypted: string;
  openrouterModel: string;
  voicePreset: string;
  customSystemPrompt: string | null;
  customSummaryInstructions: string | null;
  customGutterStyle: string | null;
  reposInclude: string[] | null;
  reposExclude: string[] | null;
  timezone: string;
  ownerName: string | null;
}

/** Historical context row from database */
export interface HistoricalContextRow {
  summary_date: string;
  context_brief: string | null;
  detected_focus: string | null;
  brief_summary: string | null;
  commit_count: number;
}

// =============================================================================
// GitHub Types
// =============================================================================

export interface GitHubRepo {
  name: string;
  full_name: string;
  fork: boolean;
  pushed_at: string;
}

export interface GitHubCommitDetail {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
      name: string;
      email: string;
    };
  };
  stats?: {
    additions: number;
    deletions: number;
  };
}

export interface Commit {
  sha: string;
  repo: string;
  message: string;
  timestamp: string;
  additions: number;
  deletions: number;
}

// =============================================================================
// Voice Types
// =============================================================================

export interface GutterComment {
  anchor: string;
  type: "comment";
  content: string;
}

export interface VoicePreset {
  id: string;
  name: string;
  systemPrompt: string;
  buildPrompt: (commits: Commit[], date: string, ownerName?: string) => string;
}

export interface CustomVoiceConfig {
  systemPrompt?: string;
  summaryInstructions?: string;
  gutterStyle?: string;
}

// =============================================================================
// Context Types
// =============================================================================

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

export interface ContextBrief {
  date: string;
  mainFocus: string;
  repos: string[];
  linesChanged: number;
  commitCount: number;
  detectedTask: TaskType | null;
}

export interface DetectedFocus {
  task: TaskType;
  startDate: string;
  repos: string[];
}

export interface TaskContinuation {
  task: TaskType;
  startDate: string;
  dayCount: number;
}

export interface HistoricalContextEntry {
  date: string;
  brief: ContextBrief | null;
  focus: DetectedFocus | null;
  briefSummary: string | null;
}

export interface SummaryContextData {
  contextBrief: ContextBrief;
  detectedFocus: DetectedFocus | null;
  continuationOf: string | null;
  focusStreak: number;
}

// =============================================================================
// Generation Types
// =============================================================================

export interface GenerationResult {
  success: boolean;
  tenantId: string;
  date: string;
  commitCount?: number;
  error?: string;
}

export interface ParsedAIResponse {
  success: boolean;
  brief: string;
  detailed: string;
  gutter: GutterComment[];
}

// =============================================================================
// Constants
// =============================================================================

export const USER_AGENT = "GroveEngine-Timeline-Sync";
export const DEFAULT_OPENROUTER_MODEL = "anthropic/claude-3.5-haiku";
export const DEFAULT_VOICE = "professional";
