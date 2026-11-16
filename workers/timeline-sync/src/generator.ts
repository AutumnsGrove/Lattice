/**
 * Timeline Generator
 *
 * Core per-tenant processing logic for generating timeline summaries.
 * Orchestrates the full flow: decrypt tokens → fetch commits → AI → store.
 */

import type { GroveContext, GroveDatabase } from "@autumnsgrove/infra";
import type {
	Env,
	TenantConfig,
	TenantConfigRow,
	Commit,
	GenerationResult,
	CustomVoiceConfig,
} from "./config";
import { DEFAULT_OPENROUTER_MODEL } from "./config";
import { createSecretsManager, type SecretsManager } from "./secrets-manager";
import { safeDecryptToken } from "./encryption";
import { fetchGitHubCommits, fetchCommitStats } from "./github";
import { parseAIResponse } from "./response-parser";
import { buildVoicedPrompt } from "./voices";
import { SUMMARY_MAX_OUTPUT_TOKENS } from "@autumnsgrove/curios/timeline/voices";
import {
	getHistoricalContext,
	detectTaskFromText,
	detectContinuation,
	formatHistoricalContextForPrompt,
	formatContinuationForPrompt,
	buildSummaryContextData,
} from "./context";
import { RemoteLumenClient } from "@autumnsgrove/lattice/ai/lumen";
import { initPulse, emitPulseEvent, flushPulse } from "@autumnsgrove/lattice/pulse";

// =============================================================================
// Public API
// =============================================================================

/**
 * Get all enabled tenants with valid configuration.
 */
export async function getEnabledTenants(curioDb: GroveDatabase): Promise<TenantConfig[]> {
	// Query enabled tenants - secrets are stored separately in tenant_secrets table
	const result = await curioDb
		.prepare(
			`
      SELECT
        tenant_id,
        github_username,
        openrouter_model,
        voice_preset,
        custom_system_prompt,
        custom_summary_instructions,
        custom_gutter_style,
        repos_include,
        repos_exclude,
        timezone,
        owner_name,
        github_token_encrypted,
        openrouter_key_encrypted
      FROM timeline_curio_config
      WHERE enabled = 1
    `,
		)
		.bind()
		.all<TenantConfigRow>();

	return (result.results || []).map(parseConfigRow);
}

/**
 * Process timeline generation for a single tenant.
 * Isolated error handling so failures don't affect other tenants.
 */
export async function processTenantTimeline(
	config: TenantConfig,
	targetDate: string,
	env: Env,
	ctx: GroveContext,
): Promise<GenerationResult> {
	const logPrefix = `[${config.tenantId}]`;

	try {
		// 0. Check if summary already exists (skip regeneration)
		const existing = await ctx.db
			.prepare(
				`SELECT 1 FROM timeline_summaries
       WHERE tenant_id = ? AND summary_date = ? AND commit_count > 0`,
			)
			.bind(config.tenantId, targetDate)
			.first();

		if (existing) {
			console.log(`${logPrefix} Summary already exists for ${targetDate}, skipping`);
			return {
				success: true,
				tenantId: config.tenantId,
				date: targetDate,
				commitCount: 0,
			};
		}

		// 1. Get API tokens from envelope encryption system
		const secrets = createSecretsManager(env.DB, env.GROVE_KEK);

		if (!secrets) {
			throw new Error("GROVE_KEK not configured - cannot decrypt tenant secrets");
		}

		// Fetch tokens from tenant_secrets table, falling back to the legacy
		// encrypted column if tenant_secrets doesn't have them yet.
		const [githubToken, openrouterKey] = await Promise.all([
			resolveTenantToken(
				secrets,
				config.tenantId,
				"timeline_github_token",
				config.githubTokenEncrypted,
				env.TOKEN_ENCRYPTION_KEY,
				logPrefix,
			),
			resolveTenantToken(
				secrets,
				config.tenantId,
				"timeline_openrouter_key",
				config.openrouterKeyEncrypted,
				env.TOKEN_ENCRYPTION_KEY,
				logPrefix,
			),
		]);

		if (!githubToken) {
			throw new Error(
				"GitHub token not found in tenant_secrets or legacy column (key: timeline_github_token)",
			);
		}

		if (!openrouterKey) {
			throw new Error(
				"OpenRouter API key not found in tenant_secrets or legacy column (key: timeline_openrouter_key)",
			);
		}

		// 2. Fetch GitHub commits
		console.log(`${logPrefix} Fetching commits for ${targetDate}...`);
		const commits = await fetchGitHubCommits(config, githubToken, targetDate, ctx.db);

		if (commits.length === 0) {
			console.log(`${logPrefix} No commits for ${targetDate}, skipping`);
			return {
				success: true,
				tenantId: config.tenantId,
				date: targetDate,
				commitCount: 0,
			};
		}

		console.log(`${logPrefix} Found ${commits.length} commits`);

		// 3. Enrich commits with stats
		await fetchCommitStats(commits, config.githubUsername, githubToken);

		// 4. Get historical context
		const repos = [...new Set(commits.map((c) => c.repo))];
		const historicalContext = await getHistoricalContext(ctx.db, config.tenantId, targetDate);

		// Pre-detect task type for continuation detection
		const commitText = commits.map((c) => c.message).join(" ");
		const preDetectedTask = detectTaskFromText(commitText);

		// Check for multi-day continuation
		const continuation = detectContinuation(historicalContext, preDetectedTask);

		// Build prompt context
		let promptContext: {
			historicalContext?: string;
			continuationNote?: string;
		} | null = null;
		if (historicalContext.length > 0 || continuation) {
			promptContext = {
				historicalContext: formatHistoricalContextForPrompt(historicalContext),
				continuationNote: formatContinuationForPrompt(continuation),
			};
		}

		console.log(
			`${logPrefix} Context: task=${preDetectedTask || "none"}, continuation=${continuation?.startDate || "none"}, history=${historicalContext.length} days`,
		);

		// 5. Build voiced prompt
		const customConfig: CustomVoiceConfig | null =
			config.voicePreset === "custom"
				? {
						systemPrompt: config.customSystemPrompt ?? undefined,
						summaryInstructions: config.customSummaryInstructions ?? undefined,
						gutterStyle: config.customGutterStyle ?? undefined,
					}
				: null;

		const { systemPrompt, userPrompt } = buildVoicedPrompt(
			config.voicePreset,
			commits,
			targetDate,
			config.ownerName ?? "the developer",
			customConfig,
			promptContext,
		);

		// 6. Call Lumen (via service binding — full pipeline: PII scrub, quota, fallback)
		console.log(`${logPrefix} Calling Lumen (${config.openrouterModel})...`);
		const lumen = new RemoteLumenClient({
			baseUrl: "https://grove-lumen",
			apiKey: env.LUMEN_API_KEY,
			fetcher: env.LUMEN,
		});

		// A cron run only gets one shot — there's no user sitting there to hit
		// "retry" if Lumen's whole fallback chain trips on a transient network
		// blip. Retrying the entire chain (not just one model) absorbs that.
		const maxTokens = SUMMARY_MAX_OUTPUT_TOKENS;
		const aiResult = await withRetry(
			() =>
				lumen.run({
					task: "summary",
					input: [
						{ role: "system", content: systemPrompt },
						{ role: "user", content: userPrompt },
					],
					tenant: config.tenantId,
					options: {
						model: config.openrouterModel || DEFAULT_OPENROUTER_MODEL,
						tenantApiKey: openrouterKey,
						// Shared with aspen's manual generate, next to DETAILED_BUDGET in
						// libs/curios so the ceiling and the word budget that keeps it
						// honest live in one place. Raising this alone never fixed a
						// truncation — 2026-11-13 pinned exactly 8192 and still got cut
						// off mid-JSON — and it has nothing to do with Lumen's *input*
						// wall, which is a separate limit (see GH #1703).
						maxTokens,
						temperature: 0.7,
					},
				}),
			{ attempts: 3, delayMs: 3000, logPrefix },
		);

		// 7. Parse AI response
		//
		// A truncated response is not a summary. parseAIResponse() hands back a
		// generic fallback object on JSON.parse failure, and storing that used to
		// happen silently: the row was written with the real commit_count, so the
		// date looked generated and every later run skipped it. Fail loudly
		// instead — Pulse records it, no row is written, and the retry can happen.
		if (aiResult.usage.output >= maxTokens) {
			throw new Error(
				`AI response hit the ${maxTokens}-token ceiling (model=${aiResult.model}, output=${aiResult.usage.output}) and was truncated mid-JSON`,
			);
		}

		const parsed = parseAIResponse(aiResult.content);

		if (!parsed.success) {
			throw new Error(
				`AI response was not valid JSON (model=${aiResult.model}, output=${aiResult.usage.output} tokens, ${aiResult.content.length} chars)`,
			);
		}

		// 8. Build context data for storage
		const contextData = buildSummaryContextData(
			{ brief: parsed.brief, detailed: parsed.detailed },
			commits,
			targetDate,
			historicalContext,
			preDetectedTask,
		);

		// 9. Calculate stats
		const totalAdditions = commits.reduce((sum, c) => sum + (c.additions ?? 0), 0);
		const totalDeletions = commits.reduce((sum, c) => sum + (c.deletions ?? 0), 0);

		// 10. Store to database (parallel writes for performance)
		const summaryId = `${config.tenantId}-${targetDate}`;

		await Promise.all([
			// Store summary (curio table)
			ctx.db
				.prepare(
					`INSERT INTO timeline_summaries (
          id,
          tenant_id,
          summary_date,
          brief_summary,
          detailed_timeline,
          gutter_content,
          commit_count,
          repos_active,
          total_additions,
          total_deletions,
          ai_model,
          voice_preset,
          context_brief,
          detected_focus,
          continuation_of,
          focus_streak,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(tenant_id, summary_date) DO UPDATE SET
          brief_summary = excluded.brief_summary,
          detailed_timeline = excluded.detailed_timeline,
          gutter_content = excluded.gutter_content,
          commit_count = excluded.commit_count,
          repos_active = excluded.repos_active,
          total_additions = excluded.total_additions,
          total_deletions = excluded.total_deletions,
          ai_model = excluded.ai_model,
          voice_preset = excluded.voice_preset,
          context_brief = excluded.context_brief,
          detected_focus = excluded.detected_focus,
          continuation_of = excluded.continuation_of,
          focus_streak = excluded.focus_streak,
          created_at = strftime('%s', 'now')`,
				)
				.bind(
					summaryId,
					config.tenantId,
					targetDate,
					parsed.brief,
					parsed.detailed,
					JSON.stringify(parsed.gutter),
					commits.length,
					JSON.stringify(repos),
					totalAdditions,
					totalDeletions,
					aiResult.model,
					config.voicePreset,
					JSON.stringify(contextData.contextBrief),
					contextData.detectedFocus ? JSON.stringify(contextData.detectedFocus) : null,
					contextData.continuationOf,
					contextData.focusStreak,
				)
				.run(),

			// Update activity table (curio table)
			ctx.db
				.prepare(
					`INSERT INTO timeline_activity (
          tenant_id,
          activity_date,
          commit_count,
          repos_active,
          lines_added,
          lines_deleted
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(tenant_id, activity_date) DO UPDATE SET
          commit_count = excluded.commit_count,
          repos_active = excluded.repos_active,
          lines_added = excluded.lines_added,
          lines_deleted = excluded.lines_deleted`,
				)
				.bind(
					config.tenantId,
					targetDate,
					commits.length,
					JSON.stringify(repos),
					totalAdditions,
					totalDeletions,
				)
				.run(),

			// Log AI usage (curio table)
			ctx.db
				.prepare(
					`INSERT INTO timeline_ai_usage (
          tenant_id,
          used_at,
          model,
          input_tokens,
          output_tokens,
          cost_usd
        ) VALUES (?, strftime('%s', 'now'), ?, ?, ?, ?)`,
				)
				.bind(
					config.tenantId,
					aiResult.model,
					aiResult.usage.input,
					aiResult.usage.output,
					aiResult.usage.cost,
				)
				.run(),
		]);

		console.log(
			`${logPrefix} Generated summary: ${commits.length} commits, ${totalAdditions}+ ${totalDeletions}-`,
		);

		return {
			success: true,
			tenantId: config.tenantId,
			date: targetDate,
			commitCount: commits.length,
		};
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		console.error(`${logPrefix} Failed:`, errorMessage);

		// console.error alone is invisible after the fact — this worker has no
		// tail/Logpush wired up, so a bad cron night was previously undiscoverable
		// except by noticing a missing day days later. Pulse gives it a durable trail.
		try {
			initPulse(env.PULSE);
			emitPulseEvent("error.server", {
				app: "timeline-sync",
				tenant_id: config.tenantId,
				metadata: { message: errorMessage, date: targetDate },
			});
			await flushPulse();
		} catch {
			// Observability must never break the product it's observing.
		}

		return {
			success: false,
			tenantId: config.tenantId,
			date: targetDate,
			error: errorMessage,
		};
	}
}

/**
 * Retry a fallible async operation with a fixed delay between attempts.
 * Used for the Lumen call, whose own internal fallback chain can still trip
 * entirely on a transient network blip — a cron run gets one shot, with no
 * user around to manually retry.
 */
async function withRetry<T>(
	fn: () => Promise<T>,
	options: { attempts: number; delayMs: number; logPrefix: string },
): Promise<T> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= options.attempts; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastError = err;
			if (attempt < options.attempts) {
				console.warn(
					`${options.logPrefix} Attempt ${attempt}/${options.attempts} failed, retrying in ${options.delayMs}ms:`,
					err instanceof Error ? err.message : String(err),
				);
				await new Promise((resolve) => setTimeout(resolve, options.delayMs));
			}
		}
	}
	throw lastError;
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Safely parse a JSON array from a database string.
 * Handles null, empty string, and invalid JSON gracefully.
 */
function safeParseJsonArray(value: string | null): string[] | null {
	if (!value || value.trim() === "") return null;
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}

/**
 * Parse a raw database row into a TenantConfig object.
 */
function parseConfigRow(row: TenantConfigRow): TenantConfig {
	return {
		tenantId: row.tenant_id,
		githubUsername: row.github_username,
		openrouterModel: row.openrouter_model,
		voicePreset: row.voice_preset,
		customSystemPrompt: row.custom_system_prompt,
		customSummaryInstructions: row.custom_summary_instructions,
		customGutterStyle: row.custom_gutter_style,
		reposInclude: safeParseJsonArray(row.repos_include),
		reposExclude: safeParseJsonArray(row.repos_exclude),
		timezone: row.timezone,
		ownerName: row.owner_name,
		githubTokenEncrypted: row.github_token_encrypted,
		openrouterKeyEncrypted: row.openrouter_key_encrypted,
	};
}

/**
 * Resolve a tenant token: try SecretsManager first, fall back to the legacy
 * encrypted column + TOKEN_ENCRYPTION_KEY, and auto-migrate on recovery.
 *
 * Mirrors getTimelineToken() in libs/curios/src/timeline/secrets.server.ts —
 * kept as a local copy since this worker uses its own read-only SecretsManager.
 */
async function resolveTenantToken(
	secrets: SecretsManager,
	tenantId: string,
	keyName: "timeline_github_token" | "timeline_openrouter_key",
	legacyEncryptedValue: string | null,
	tokenEncryptionKey: string | undefined,
	logPrefix: string,
): Promise<string | null> {
	const fromSecretsManager = await secrets.safeGetSecret(tenantId, keyName);
	if (fromSecretsManager) return fromSecretsManager;

	if (!legacyEncryptedValue || !tokenEncryptionKey) return null;

	const legacyToken = await safeDecryptToken(legacyEncryptedValue, tokenEncryptionKey);
	if (!legacyToken) return null;

	console.warn(`${logPrefix} Recovered ${keyName} from legacy column, migrating to tenant_secrets`);
	try {
		await secrets.setSecret(tenantId, keyName, legacyToken);
	} catch (err) {
		console.warn(
			`${logPrefix} Failed to auto-migrate ${keyName}: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	return legacyToken;
}
