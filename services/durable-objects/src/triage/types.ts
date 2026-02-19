/**
 * Shared types for the Triage system.
 * Used by TriageDO, filters, classifier, and digest modules.
 */

export type EmailCategory =
  | "important"
  | "actionable"
  | "fyi"
  | "social"
  | "marketing"
  | "transactional"
  | "junk"
  | "uncategorized";

export type SuggestedAction =
  | "respond"
  | "read"
  | "archive"
  | "delete"
  | "review";

export interface ClassificationResult {
  category: EmailCategory;
  confidence: number;
  reason: string;
  suggestedAction: SuggestedAction;
  topics: string[];
}
