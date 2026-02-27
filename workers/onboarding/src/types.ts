/**
 * OnboardingAgent — Types & Sequence Configuration
 *
 * Env, state shape, audience segmentation, and email sequences.
 * Sequence config is duplicated locally from email-render/templates/types.ts
 * because this worker has no engine dependency.
 */

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

/**
 * User audience categories for email segmentation.
 * Mirrors email-render/templates/types.ts — duplicated to avoid engine dep.
 */
export type AudienceType = "wanderer" | "promo" | "rooted";

const VALID_AUDIENCES: ReadonlySet<string> = new Set<AudienceType>(["wanderer", "promo", "rooted"]);

export function isValidAudience(value: unknown): value is AudienceType {
	return typeof value === "string" && VALID_AUDIENCES.has(value);
}

export interface SequenceEmail {
	/** Days after signup to send this email */
	dayOffset: number;
	/** Email subject line */
	subject: string;
	/** Template component name (resolved by email-render worker) */
	template: string;
}

/**
 * Sequence definitions by audience type.
 * Must match services/email-render/src/templates/types.ts SEQUENCES.
 */
export const SEQUENCES: Record<AudienceType, SequenceEmail[]> = {
	wanderer: [
		{ dayOffset: 0, template: "WelcomeEmail", subject: "Welcome to the Grove 🌿" },
		{ dayOffset: 7, template: "Day7Email", subject: "What makes Grove different" },
		{ dayOffset: 14, template: "Day14Email", subject: "Why Grove exists" },
		{ dayOffset: 30, template: "Day30Email", subject: "Still there? 👋" },
	],
	promo: [
		{ dayOffset: 0, template: "WelcomeEmail", subject: "You found Grove 🌱" },
		{ dayOffset: 7, template: "Day7Email", subject: "Still thinking about it?" },
	],
	rooted: [
		{ dayOffset: 0, template: "WelcomeEmail", subject: "Welcome home 🏡" },
		{ dayOffset: 1, template: "Day1Email", subject: "Making it yours" },
		{ dayOffset: 7, template: "Day7Email", subject: "The blank page" },
	],
};

// =============================================================================
// Helpers
// =============================================================================

/** Convert day offset to delay in seconds */
export function dayToSeconds(days: number): number {
	return days * 24 * 60 * 60;
}
