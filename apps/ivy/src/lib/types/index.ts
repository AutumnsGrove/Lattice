/**
 * Ivy Type Definitions
 */

// ============================================================================
// Triage & Classification
// ============================================================================

export type EmailCategory =
	| "important"
	| "actionable"
	| "fyi"
	| "social"
	| "marketing"
	| "transactional"
	| "junk"
	| "uncategorized";

export type SuggestedAction = "respond" | "read" | "archive" | "delete" | "review";

export interface ClassificationResult {
	category: EmailCategory;
	confidence: number;
	reason: string;
	suggestedAction: SuggestedAction;
	topics: string[];
}

export interface FilterRule {
	id: string;
	type: "blocklist" | "allowlist";
	pattern: string;
	match_type: "exact" | "domain" | "contains";
	notes: string | null;
	created_at: string;
}

export interface DigestSchedule {
	times: string[];
	timezone: string;
	recipient: string;
	enabled: boolean;
}

export interface DigestEntry {
	id: string;
	sent_at: string;
	recipient: string;
	email_count: number;
	categories: Record<EmailCategory, number>;
	zephyr_message_id: string | null;
	digest_type: "scheduled" | "manual";
	created_at: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface IvyConfig {
	limits: {
		maxAttachmentBytes: number;
		maxEmailSizeBytes: number;
		maxRecipientsPerEmail: number;
		maxAttachmentsPerEmail: number;
	};
	rateLimits: {
		outgoingPerHour: number;
		attachmentUploadMbPerHour: number;
		apiRequestsPerHour: number;
		contactFormPerIpPerDay: number;
	};
	newsletterLimitsPerWeek: {
		oak: number;
		evergreen: number;
	};
	unsend: {
		defaultDelayMinutes: number;
		minDelayMinutes: number;
		maxDelayMinutes: number;
	};
	retention: {
		trashDays: number;
		deadLetterDays: number;
	};
}

// ============================================================================
// Database Types (D1)
// ============================================================================

export interface IvySettings {
	user_id: string;
	email_address: string;
	email_selected_at: string;
	email_locked_at: string;
	encrypted_email_key: string;
	unsend_delay_minutes: number;
	encrypted_signature: string | null;
	recovery_phrase_downloaded: boolean;
	created_at: string;
	updated_at: string;
}

export interface IvyEmail {
	id: string;
	user_id: string;
	encrypted_envelope: string;
	r2_content_key: string;
	is_draft: boolean;
	category: EmailCategory;
	confidence: number;
	suggested_action: SuggestedAction;
	topics: string;
	classification_model: string | null;
	classified_at: string | null;
	is_read: number;
	original_sender: string | null;
	created_at: string;
}

export interface IvyEmailQueue {
	id: string;
	user_id: string;
	encrypted_email_data: string;
	scheduled_send_at: string;
	status: "pending" | "cancelled" | "sent" | "failed";
	cancelled_at: string | null;
	sent_at: string | null;
	error_message: string | null;
	created_at: string;
}

export interface IvyWebhookBuffer {
	id: string;
	user_id: string;
	raw_payload: string;
	webhook_signature: string;
	status: "pending" | "processing" | "completed" | "failed" | "dead_letter";
	retry_count: number;
	error_message: string | null;
	received_at: string;
	processed_at: string | null;
}

// ============================================================================
// Decrypted Types (Client-Side)
// ============================================================================

export interface DecryptedEnvelope {
	from: string;
	to: string[];
	cc: string[];
	bcc: string[];
	subject: string;
	snippet: string;
	date: string;
	threadId: string;
	labels: string[];
	isRead: boolean;
	isStarred: boolean;
}

export interface DecryptedEmail extends DecryptedEnvelope {
	id: string;
	htmlBody: string;
	textBody: string;
	attachments: Array<{
		id: string;
		filename: string;
		contentType: string;
		size: number;
	}>;
}

// ============================================================================
// API Types
// ============================================================================

export interface WebhookPayload {
	raw: string;
	headers: Record<string, string>;
	recipients: string[];
	attachments: Array<{
		filename: string;
		contentType: string;
		content: string; // Base64 encoded
	}>;
	dkim: { valid: boolean };
	spf: { valid: boolean };
	dmarc: { valid: boolean };
}

// ============================================================================
// User Tiers
// ============================================================================

export type UserTier = "free" | "seedling" | "sapling" | "oak" | "evergreen";

export interface TierCapabilities {
	canAccessIvy: boolean;
	canSendEmail: boolean;
	canReceiveEmail: boolean;
	newsletterSendsPerWeek: number;
	storageGb: number;
}

export const TIER_CAPABILITIES: Record<UserTier, TierCapabilities> = {
	free: {
		canAccessIvy: false,
		canSendEmail: false,
		canReceiveEmail: false,
		newsletterSendsPerWeek: 0,
		storageGb: 0,
	},
	seedling: {
		canAccessIvy: false,
		canSendEmail: false,
		canReceiveEmail: false,
		newsletterSendsPerWeek: 0,
		storageGb: 1,
	},
	sapling: {
		canAccessIvy: true,
		canSendEmail: false,
		canReceiveEmail: false, // Read-only, forwarded view
		newsletterSendsPerWeek: 0,
		storageGb: 5,
	},
	oak: {
		canAccessIvy: true,
		canSendEmail: true,
		canReceiveEmail: true,
		newsletterSendsPerWeek: 2,
		storageGb: 20,
	},
	evergreen: {
		canAccessIvy: true,
		canSendEmail: true,
		canReceiveEmail: true,
		newsletterSendsPerWeek: 5,
		storageGb: 100,
	},
};
