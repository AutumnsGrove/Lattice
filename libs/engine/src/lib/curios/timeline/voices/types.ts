/**
 * Voice Presets Type Definitions
 */

export interface Commit {
  repo: string;
  message: string;
  additions: number;
  deletions: number;
  /** Git commit SHA hash */
  sha?: string;
  /** @deprecated Use sha instead */
  hash?: string;
  /** ISO8601 timestamp of the commit */
  timestamp?: string;
  /** @deprecated Use timestamp instead */
  date?: string;
}

export interface GutterComment {
  anchor: string;
  type: "comment";
  content: string;
}

export interface VoicePreset {
  id: string;
  name: string;
  description: string;
  preview: string;
  systemPrompt: string;
  buildPrompt: (commits: Commit[], date: string, ownerName?: string) => string;
}

export interface VoicePromptResult {
  systemPrompt: string;
  userPrompt: string;
  voiceId: string;
  voiceName: string;
}

/** Context for long-horizon awareness (optional) */
export interface PromptContextInput {
  historicalContext?: string;
  continuationNote?: string;
}

export interface CustomVoiceConfig {
  systemPrompt?: string;
  summaryInstructions?: string;
  gutterStyle?: string;
}
