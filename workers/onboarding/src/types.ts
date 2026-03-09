/**
 * OnboardingAgent — Types & Sequence Configuration
 *
 * Env, state shape, audience segmentation, and email sequences.
 */

import {
	SEQUENCES,
	type AudienceType,
	type SequenceEmailConfig,
} from "@autumnsgrove/lattice/email";
export { SEQUENCES, type AudienceType, type SequenceEmailConfig as SequenceEmail };

// =============================================================================
// Environment
// =============================================================================

export interface Env extends Record<string, unknown> {
	/** Durable Object namespace — one instance per email address */
	ONBOARDING_AGENT: DurableObjectNamespace;
	/** Service binding to grove-zephyr email gateway */
	ZEPHYR: Fetcher;
	/** Shared secret for authenticating with Zephyr */
	ZEPHYR_API_KEY: string;
	/** HMAC secret for unsubscribe token generation */
	UNSUBSCRIBE_SECRET: string;
}

// =============================================================================
// Agent State
// =============================================================================

export interface SentRecord {
	day: number;
	sentAt: number;
	messageId?: string;
}

export interface OnboardingState {
	email: string | null;
	audience: AudienceType | null;
	emailsSent: SentRecord[];
	unsubscribed: boolean;
}

export const INITIAL_STATE: OnboardingState = {
	email: null,
	audience: null,
	emailsSent: [],
	unsubscribed: false,
};

// =============================================================================
// Audience & Sequences
// =============================================================================

const VALID_AUDIENCES: ReadonlySet<string> = new Set<AudienceType>(["wanderer", "promo", "rooted"]);

export function isValidAudience(value: unknown): value is AudienceType {
	return typeof value === "string" && VALID_AUDIENCES.has(value);
}

// =============================================================================
// Helpers
// =============================================================================

/** Convert day offset to delay in seconds */
export function dayToSeconds(days: number): number {
	return days * 24 * 60 * 60;
}
