/**
 * OnboardingAgent — Email Sequence Durable Object
 *
 * One instance per email address. Schedules the entire email sequence
 * at signup time (Day 0/1/7/14/30 depending on audience), then each
 * alarm fires and sends via Zephyr. No cron polling, no shared state.
 *
 * Triple idempotency:
 * 1. State check  — skip if day already in emailsSent
 * 2. Zephyr key   — idempotencyKey prevents double-send at the gateway
 * 3. DO naming    — idFromName(email) means same email = same instance
 */

import { GroveAgent, callable } from "@autumnsgrove/grove-agent";
import { ZephyrClient } from "@autumnsgrove/lattice/zephyr";
import { ONBOARDING_ERRORS } from "./errors.js";
import {
	INITIAL_STATE,
	SEQUENCES,
	dayToSeconds,
	isValidAudience,
	type AudienceType,
	type Env,
	type OnboardingState,
	type SentRecord,
} from "./types.js";

// =============================================================================
// Unsubscribe Token (HMAC-SHA256, same algorithm as landing app)
// =============================================================================

const UNSUBSCRIBE_PREFIX = "grove-unsubscribe-v1";

async function generateUnsubscribeToken(email: string, secret: string): Promise<string> {
	const encoder = new TextEncoder();
	const keyData = encoder.encode(secret);
	const messageData = encoder.encode(`${UNSUBSCRIBE_PREFIX}:${email.toLowerCase()}`);

	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		keyData,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);

	const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
	const hashArray = Array.from(new Uint8Array(signature));
	return hashArray
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
		.substring(0, 32);
}

async function generateUnsubscribeUrl(email: string, secret: string): Promise<string> {
	const token = await generateUnsubscribeToken(email, secret);
	const params = new URLSearchParams({ email: email.toLowerCase(), token });
	return `https://grove.place/unsubscribe?${params.toString()}`;
}

// =============================================================================
// Email Validation
// =============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: unknown): email is string {
	return typeof email === "string" && EMAIL_REGEX.test(email);
}

// =============================================================================
// OnboardingAgent
// =============================================================================

export class OnboardingAgent extends GroveAgent<Env, OnboardingState> {
	initialState: OnboardingState = INITIAL_STATE;

	groveConfig() {
		return {
			name: "OnboardingAgent",
			description: "Email onboarding sequences — one DO per user",
		};
	}

	// ── Callable Methods ────────────────────────────────────────────────────

	/**
	 * Start the email sequence for a user. Idempotent — calling again
	 * with the same email is a safe no-op.
	 */
	@callable()
	async startSequence(email: string, audience: string): Promise<{ started: boolean }> {
		// Already started? Idempotent no-op.
		if (this.state.email) {
			this.log.info("Sequence already started, skipping", {
				code: ONBOARDING_ERRORS.SEQUENCE_ALREADY_STARTED.code,
				email: this.state.email,
			});
			return { started: false };
		}

		// Validate inputs
		if (!isValidEmail(email)) {
			this.log.warn("Invalid email", { code: ONBOARDING_ERRORS.INVALID_EMAIL.code });
			throw new Error(ONBOARDING_ERRORS.INVALID_EMAIL.adminMessage);
		}

		if (!isValidAudience(audience)) {
			this.log.warn("Invalid audience", {
				code: ONBOARDING_ERRORS.INVALID_AUDIENCE.code,
				audience,
			});
			throw new Error(ONBOARDING_ERRORS.INVALID_AUDIENCE.adminMessage);
		}

		const normalizedEmail = email.toLowerCase().trim();
		const sequence = SEQUENCES[audience];

		// Set state first so subsequent calls see it
		this.setState({
			...this.state,
			email: normalizedEmail,
			audience,
		});

		// Schedule all emails in the sequence
		for (const step of sequence) {
			const delaySec = dayToSeconds(step.dayOffset);
			await this.schedule(delaySec, "sendEmail", { day: step.dayOffset });
		}

		this.log.info("Sequence started", {
			email: normalizedEmail,
			audience,
			emailCount: sequence.length,
		});

		this.observe({
			type: "sequence.started",
			message: `Started ${audience} sequence (${sequence.length} emails) for ${normalizedEmail}`,
			data: { email: normalizedEmail, audience, steps: sequence.length },
		});

		return { started: true };
	}

	/**
	 * Schedule callback — sends one email for the given day offset.
	 * Called by the DO alarm system, not directly by external callers.
	 */
	async sendEmail(payload: { day: number }): Promise<void> {
		const { day } = payload;
		const { email, audience, unsubscribed, emailsSent } = this.state;

		// Guard: unsubscribed
		if (unsubscribed) {
			this.log.info("Skipping email — unsubscribed", { day });
			return;
		}

		// Guard: missing state (shouldn't happen)
		if (!email || !audience) {
			this.log.error("sendEmail called with incomplete state", { day });
			return;
		}

		// Idempotency: already sent this day?
		if (emailsSent.some((s) => s.day === day)) {
			this.log.info("Skipping email — already sent for this day", { day, email });
			return;
		}

		// Find the sequence step
		const sequence = SEQUENCES[audience];
		const step = sequence.find((s) => s.dayOffset === day);
		if (!step) {
			this.log.error("No sequence step found for day", { day, audience });
			return;
		}

		// Build Zephyr client with service binding
		const zephyr = new ZephyrClient({
			baseUrl: "https://zephyr.internal",
			apiKey: this.env.ZEPHYR_API_KEY,
			fetcher: this.env.ZEPHYR,
		});

		// Generate unsubscribe URL for email headers
		const unsubscribeUrl = await generateUnsubscribeUrl(email, this.env.UNSUBSCRIBE_SECRET);

		const idempotencyKey = `onboarding:${email}:day${day}`;

		try {
			const result = await zephyr.send({
				type: "sequence",
				template: step.template,
				to: email,
				subject: step.subject,
				source: "onboarding-agent",
				idempotencyKey,
				headers: {
					"List-Unsubscribe": `<${unsubscribeUrl}>`,
					"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
				},
			});

			if (!result.success) {
				this.log.error("Zephyr send failed", {
					code: ONBOARDING_ERRORS.EMAIL_SEND_FAILED.code,
					day,
					email,
					errorCode: result.errorCode,
					errorMessage: result.errorMessage,
				});
				return;
			}

			// Record successful send
			const sentRecord: SentRecord = {
				day,
				sentAt: Date.now(),
				messageId: result.messageId,
			};

			this.setState({
				...this.state,
				emailsSent: [...this.state.emailsSent, sentRecord],
			});

			this.log.info("Email sent", {
				day,
				email,
				template: step.template,
				messageId: result.messageId,
			});

			this.observe({
				type: "email.sent",
				message: `Sent day ${day} email (${step.template}) to ${email}`,
				data: { day, email, template: step.template },
			});
		} catch (err) {
			this.log.errorWithCause("Email send threw", err, {
				code: ONBOARDING_ERRORS.EMAIL_SEND_FAILED.code,
				day,
				email,
			});
		}
	}

	/**
	 * Unsubscribe this user and cancel all pending emails.
	 */
	@callable()
	async unsubscribe(): Promise<{ unsubscribed: boolean }> {
		if (this.state.unsubscribed) {
			this.log.info("Already unsubscribed", {
				code: ONBOARDING_ERRORS.ALREADY_UNSUBSCRIBED.code,
			});
			return { unsubscribed: false };
		}

		// Cancel all pending schedules
		const schedules = this.getSchedules();
		for (const s of schedules) {
			await this.cancelSchedule(s.id);
		}

		this.setState({
			...this.state,
			unsubscribed: true,
		});

		this.log.info("Unsubscribed", {
			email: this.state.email,
			cancelledSchedules: schedules.length,
		});

		this.observe({
			type: "sequence.unsubscribed",
			message: `Unsubscribed ${this.state.email}, cancelled ${schedules.length} pending emails`,
			data: { email: this.state.email, cancelledSchedules: schedules.length },
		});

		return { unsubscribed: true };
	}

	/**
	 * Return current agent state for admin queries.
	 */
	@callable()
	async getStatus(): Promise<OnboardingState> {
		return this.state;
	}
}
