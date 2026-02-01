/**
 * Type definitions for Grove Broadcast System
 */

// =============================================================================
// D1 TYPES
// =============================================================================

export interface EmailSignup {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
  unsubscribed_at: string | null;
  source: string;
}

// =============================================================================
// RESEND TYPES
// =============================================================================

export interface ResendContact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  unsubscribed: boolean;
}

export interface ResendContactsResponse {
  object: "list";
  has_more: boolean;
  data: ResendContact[];
}

export interface ResendBroadcast {
  id: string;
  name: string | null;
  segment_id: string;
  from: string;
  subject: string;
  preview_text: string | null;
  html: string;
  text: string | null;
  status: "draft" | "queued" | "sent";
  created_at: string;
  scheduled_at: string | null;
  sent_at: string | null;
}

export interface ResendBroadcastsResponse {
  object: "list";
  has_more: boolean;
  data: ResendBroadcast[];
}

export interface CreateBroadcastParams {
  segmentId: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  name?: string;
  replyTo?: string;
}

// =============================================================================
// CLI TYPES
// =============================================================================

export interface SyncResult {
  added: number;
  skipped: number;
  errors: string[];
}

export interface UnsubscribeSyncResult {
  deleted: number;
  errors: string[];
}
