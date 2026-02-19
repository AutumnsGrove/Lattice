/**
 * TriageDO - Durable Object for Email Triage Processing
 *
 * Following the Loom pattern, TriageDO provides:
 * - Email classification via Lumen AI (bypasses Worker CPU limits)
 * - Alarm-based digest scheduling (8am / 1pm / 6pm, configurable)
 * - Processing queue: ~10 emails per alarm invocation
 * - Deterministic ID: "triage:owner" (single user MVP, multi-tenant ready)
 *
 * State machine for processing: idle → processing → idle
 * Digest flow: alarm fires → query unread → generate summary → send via Zephyr
 *
 * Migrated to LoomDO base class — see libs/engine/src/lib/loom/
 */

import {
	LoomDO,
	type LoomRoute,
	type LoomConfig,
	type LoomRequestContext,
} from "@autumnsgrove/lattice/loom";
import { createLumenClient, type LumenClient } from "@autumnsgrove/lattice/lumen";
import { evaluateFilters } from "./triage/filters.js";
import { classifyEmail, type EmailEnvelope } from "./triage/classifier.js";
import {
	getDigestEmails,
	generateDigest,
	sendDigest,
	renderDigestHtml,
	calculateNextAlarm,
	getCategoryCounts,
	type DigestSettings,
} from "./triage/digest.js";

// =============================================================================
// TYPES
// =============================================================================

interface TriageDOEnv extends Record<string, unknown> {
	/** Ivy's D1 database (separate from grove-engine DB) */
	IVY_DB: D1Database;
	/** Ivy's R2 bucket for email body storage */
	IVY_R2: R2Bucket;
	KV: KVNamespace;
	AI: Ai;
	ZEPHYR: {
		fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
	};
	OPENROUTER_API_KEY: string;
	ZEPHYR_API_KEY: string;
}

interface ProcessRequest {
	bufferId: string;
}

interface QueueEntry {
	bufferId: string;
	addedAt: string;
}

interface TriageState {
	processingQueue: QueueEntry[];
	digestScheduled: boolean;
	nextDigestAt: string | null;
}

// =============================================================================
// TRIAGE DURABLE OBJECT
// =============================================================================

export class TriageDO extends LoomDO<TriageState, TriageDOEnv> {
	private lumen: LumenClient | null = null;

	config(): LoomConfig {
		return { name: "TriageDO", blockOnInit: false };
	}

	routes(): LoomRoute[] {
		return [
			{
				method: "POST",
				path: "/process",
				handler: (ctx) => this.handleProcess(ctx),
			},
			{
				method: "POST",
				path: "/digest",
				handler: () => this.handleDigestTrigger(),
			},
			{
				method: "POST",
				path: "/schedule",
				handler: (ctx) => this.handleScheduleDigest(ctx),
			},
			{
				method: "GET",
				path: "/status",
				handler: () => this.handleStatus(),
			},
		];
	}

	protected async loadState(): Promise<TriageState | null> {
		const stored = await this.state.storage.get<TriageState>("triageState");
		return (
			stored ?? {
				processingQueue: [],
				digestScheduled: false,
				nextDigestAt: null,
			}
		);
	}

	protected async persistState(): Promise<void> {
		if (this.state_data) {
			await this.state.storage.put("triageState", this.state_data);
		}
	}

	// ===========================================================================
	// LAZY INIT
	// ===========================================================================

	/**
	 * Initialize Lumen client lazily (only when needed for classification)
	 */
	private getLumen(): LumenClient {
		if (!this.lumen) {
			this.lumen = createLumenClient({
				openrouterApiKey: this.env.OPENROUTER_API_KEY,
				ai: this.env.AI,
				db: this.env.IVY_DB,
			});
		}
		return this.lumen;
	}

	// ===========================================================================
	// ALARM HANDLER
	// ===========================================================================

	protected async onAlarm(): Promise<void> {
		if (!this.state_data) {
			this.state_data = {
				processingQueue: [],
				digestScheduled: false,
				nextDigestAt: null,
			};
		}

		// Check if this alarm is for digest delivery
		if (this.state_data.digestScheduled && this.state_data.nextDigestAt) {
			const nextDigestTime = new Date(this.state_data.nextDigestAt).getTime();
			const now = Date.now();

			// If we're within 2 minutes of the scheduled digest time, send it
			if (Math.abs(now - nextDigestTime) < 120_000) {
				await this.executeDigest();
				// Schedule next digest
				await this.scheduleNextDigest();
				// Then process any queued emails
			}
		}

		// Process queued emails (up to 10 per alarm)
		if (this.state_data.processingQueue.length > 0) {
			await this.processQueueBatch();
		}
	}

	// ===========================================================================
	// REQUEST HANDLERS
	// ===========================================================================

	/**
	 * POST /process — Add a buffer entry to the processing queue
	 */
	private async handleProcess(ctx: LoomRequestContext): Promise<Response> {
		const body = (await ctx.request.json()) as ProcessRequest;

		if (!this.state_data) {
			this.state_data = {
				processingQueue: [],
				digestScheduled: false,
				nextDigestAt: null,
			};
		}

		// Add to queue
		this.state_data.processingQueue.push({
			bufferId: body.bufferId,
			addedAt: new Date().toISOString(),
		});

		await this.persistState();

		// Schedule alarm to process (100ms from now)
		await this.alarms.schedule(100);

		this.log.info("Email queued for processing", {
			bufferId: body.bufferId,
		});

		return Response.json({ success: true, queued: true });
	}

	/**
	 * POST /digest — Manually trigger a digest
	 */
	private async handleDigestTrigger(): Promise<Response> {
		try {
			await this.executeDigest();
			return Response.json({ success: true });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return Response.json({ success: false, error: message }, { status: 500 });
		}
	}

	/**
	 * POST /schedule — Update digest schedule
	 */
	private async handleScheduleDigest(ctx: LoomRequestContext): Promise<Response> {
		const body = (await ctx.request.json()) as {
			times: string[];
			timezone: string;
			enabled: boolean;
		};

		if (!this.state_data) {
			this.state_data = {
				processingQueue: [],
				digestScheduled: false,
				nextDigestAt: null,
			};
		}

		if (body.enabled && body.times.length > 0) {
			const nextAlarmMs = calculateNextAlarm(body.times, body.timezone);
			if (nextAlarmMs) {
				this.state_data.digestScheduled = true;
				this.state_data.nextDigestAt = new Date(nextAlarmMs).toISOString();
				await this.persistState();
				// Absolute timestamp for digest scheduling
				await this.state.storage.setAlarm(nextAlarmMs);

				this.log.info("Digest scheduled", {
					nextAt: this.state_data.nextDigestAt,
				});

				return Response.json({
					success: true,
					nextDigestAt: this.state_data.nextDigestAt,
				});
			}
		}

		// Disable digest
		this.state_data.digestScheduled = false;
		this.state_data.nextDigestAt = null;
		await this.persistState();

		return Response.json({ success: true, digestDisabled: true });
	}

	/**
	 * GET /status — Return current triage state
	 */
	private async handleStatus(): Promise<Response> {
		return Response.json({
			queueLength: this.state_data?.processingQueue.length ?? 0,
			digestScheduled: this.state_data?.digestScheduled ?? false,
			nextDigestAt: this.state_data?.nextDigestAt ?? null,
		});
	}

	// ===========================================================================
	// PROCESSING LOGIC
	// ===========================================================================

	/**
	 * Process a batch of queued emails (up to 10 per alarm)
	 */
	private async processQueueBatch(): Promise<void> {
		if (!this.state_data) return;

		const BATCH_SIZE = 10;
		const batch = this.state_data.processingQueue.splice(0, BATCH_SIZE);

		this.log.info("Processing batch", { count: batch.length });

		for (const entry of batch) {
			try {
				await this.processBufferEntry(entry.bufferId);
			} catch (error) {
				this.log.errorWithCause(`Failed to process buffer ${entry.bufferId}`, error);
				// Mark buffer as failed
				await this.env.IVY_DB.prepare(
					"UPDATE ivy_webhook_buffer SET status = 'failed', error_message = ?, processed_at = ? WHERE id = ?",
				)
					.bind(String(error), new Date().toISOString(), entry.bufferId)
					.run();
			}
		}

		await this.persistState();

		// If there are more items in the queue, schedule another alarm
		if (this.state_data.processingQueue.length > 0) {
			await this.alarms.schedule(1000);
		}
	}

	/**
	 * Process a single buffered webhook entry:
	 * 1. Load from D1 buffer
	 * 2. Parse email headers/body
	 * 3. Check filters (blocklist → auto-junk)
	 * 4. Classify via Lumen
	 * 5. Store classified email to D1 + body to R2
	 */
	private async processBufferEntry(bufferId: string): Promise<void> {
		// 1. Load buffer entry
		const bufferEntry = await this.env.IVY_DB.prepare(
			"SELECT * FROM ivy_webhook_buffer WHERE id = ? AND status = 'pending'",
		)
			.bind(bufferId)
			.first<{
				id: string;
				user_id: string;
				raw_payload: string;
				status: string;
			}>();

		if (!bufferEntry) {
			this.log.debug("Buffer entry not found or already processed", {
				bufferId,
			});
			return;
		}

		// Mark as processing
		await this.env.IVY_DB.prepare(
			"UPDATE ivy_webhook_buffer SET status = 'processing' WHERE id = ?",
		)
			.bind(bufferId)
			.run();

		// 2. Parse payload
		let payload: {
			raw?: string;
			headers?: Record<string, string>;
			recipients?: string[];
		};
		try {
			payload = JSON.parse(bufferEntry.raw_payload);
		} catch {
			throw new Error("Invalid JSON in buffer payload");
		}

		// Extract email metadata from headers or raw content
		const headers = payload.headers || {};
		const from =
			headers["x-original-from"] || headers["from"] || headers["reply-to"] || "unknown@unknown.com";
		const subject = headers["subject"] || "No subject";
		const snippet = extractSnippet(payload.raw || "");
		const to = payload.recipients || [];

		// 3. Check filters
		const filterResult = await evaluateFilters(from, this.env.IVY_DB);

		let category = "uncategorized";
		let confidence = 0;
		let suggestedAction = "read";
		let topics: string[] = [];
		let classificationModel: string | null = null;
		let reason = "";

		if (filterResult?.action === "junk") {
			// Auto-junk via blocklist
			category = "junk";
			confidence = 1;
			suggestedAction = "delete";
			reason = `Blocked by filter: ${filterResult.rule.pattern}`;
			this.log.info("Auto-junked by filter", {
				from,
				pattern: filterResult.rule.pattern,
			});
		} else if (filterResult?.action !== "allow") {
			// 4. Classify via Lumen (skip if allowlisted — those go to uncategorized for now)
			try {
				const lumen = this.getLumen();
				const result = await classifyEmail({ from, subject, snippet, to: to.join(", ") }, lumen);
				category = result.category;
				confidence = result.confidence;
				suggestedAction = result.suggestedAction;
				topics = result.topics;
				reason = result.reason;
				classificationModel = "deepseek-v3";
			} catch (error) {
				this.log.errorWithCause("Classification failed, using default", error);
			}
		}

		// 5. Store to D1 + R2
		const emailId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
		const r2Key = `emails/${bufferEntry.user_id}/${emailId}`;

		// Store full raw content in R2
		await this.env.IVY_R2.put(r2Key, payload.raw || bufferEntry.raw_payload);

		// Store envelope + classification in D1
		const envelope = JSON.stringify({
			from,
			to,
			subject,
			snippet,
			date: new Date().toISOString(),
			labels: ["inbox"],
		});

		const now = new Date().toISOString();

		await this.env.IVY_DB.prepare(
			`INSERT INTO ivy_emails
       (id, user_id, encrypted_envelope, r2_content_key, is_draft,
        category, confidence, suggested_action, topics,
        classification_model, classified_at, is_read, original_sender, created_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
		)
			.bind(
				emailId,
				bufferEntry.user_id,
				envelope,
				r2Key,
				category,
				confidence,
				suggestedAction,
				JSON.stringify(topics),
				classificationModel,
				now,
				from,
				now,
			)
			.run();

		// Mark buffer as completed
		await this.env.IVY_DB.prepare(
			"UPDATE ivy_webhook_buffer SET status = 'completed', processed_at = ? WHERE id = ?",
		)
			.bind(now, bufferId)
			.run();

		this.log.info("Email processed", {
			emailId,
			category,
			confidence,
			from: from.substring(0, 30),
		});
	}

	// ===========================================================================
	// DIGEST EXECUTION
	// ===========================================================================

	/**
	 * Execute a digest: query unread → summarize → deliver via Zephyr
	 */
	private async executeDigest(): Promise<void> {
		this.log.info("Executing digest");

		// Get digest settings
		const settings = await this.env.IVY_DB.prepare(
			"SELECT digest_times, digest_timezone, digest_recipient, digest_enabled, last_digest_at FROM ivy_settings LIMIT 1",
		).first<DigestSettings>();

		if (!settings || !settings.digest_enabled || !settings.digest_recipient) {
			this.log.info("Digest disabled or no recipient configured");
			return;
		}

		// Get emails since last digest
		const emails = await getDigestEmails(this.env.IVY_DB, settings.last_digest_at);

		if (emails.length === 0) {
			this.log.info("No emails for digest, skipping");
			return;
		}

		// Generate digest content via Lumen
		let lumen = null;
		try {
			lumen = this.getLumen();
		} catch {
			// Lumen unavailable — fallback to structured list
		}
		const digestText = await generateDigest(emails, lumen);
		const digestHtml = renderDigestHtml(digestText, emails.length);

		// Send via Zephyr
		const result = await sendDigest(
			digestHtml,
			settings.digest_recipient,
			emails.length,
			this.env.ZEPHYR,
			this.env.ZEPHYR_API_KEY,
		);

		// Record digest in log
		const digestId = `digest-${Date.now()}`;
		const categoryCounts = getCategoryCounts(emails);

		const digestNow = new Date().toISOString();

		await this.env.IVY_DB.prepare(
			`INSERT INTO ivy_digest_log (id, sent_at, recipient, email_count, categories, zephyr_message_id, digest_type)
       VALUES (?, ?, ?, ?, ?, ?, 'scheduled')`,
		)
			.bind(
				digestId,
				digestNow,
				settings.digest_recipient,
				emails.length,
				JSON.stringify(categoryCounts),
				result.messageId || null,
			)
			.run();

		// Update last_digest_at
		await this.env.IVY_DB.prepare("UPDATE ivy_settings SET last_digest_at = ? WHERE rowid = 1")
			.bind(digestNow)
			.run();

		this.log.info("Digest sent", {
			emailCount: emails.length,
			success: result.success,
			messageId: result.messageId,
		});
	}

	/**
	 * Schedule the next digest alarm based on settings
	 */
	private async scheduleNextDigest(): Promise<void> {
		const settings = await this.env.IVY_DB.prepare(
			"SELECT digest_times, digest_timezone, digest_enabled FROM ivy_settings LIMIT 1",
		).first<{
			digest_times: string;
			digest_timezone: string;
			digest_enabled: number;
		}>();

		if (!settings || !settings.digest_enabled) return;

		let times: string[];
		try {
			times = JSON.parse(settings.digest_times);
		} catch {
			times = ["08:00", "13:00", "18:00"];
		}

		const nextAlarmMs = calculateNextAlarm(times, settings.digest_timezone);
		if (nextAlarmMs && this.state_data) {
			this.state_data.nextDigestAt = new Date(nextAlarmMs).toISOString();
			this.state_data.digestScheduled = true;
			await this.persistState();
			// Absolute timestamp for next digest
			await this.state.storage.setAlarm(nextAlarmMs);

			this.log.info("Next digest scheduled", {
				nextAt: this.state_data.nextDigestAt,
			});
		}
	}
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract a text snippet from raw email content.
 * Simple extraction — strips HTML tags and takes first 300 chars.
 */
function extractSnippet(raw: string): string {
	// Try to find text content after headers
	const bodyStart = raw.indexOf("\r\n\r\n");
	const body = bodyStart > -1 ? raw.substring(bodyStart + 4) : raw;

	// Strip HTML tags
	const text = body
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	return text.substring(0, 300);
}
