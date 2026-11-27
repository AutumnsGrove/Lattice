/**
 * Timeline Generator
 *
 * One tenant, one day. The day itself is `generateDay` from
 * `@autumnsgrove/curios/timeline/generate` — this file is only what the worker
 * knows that a library cannot: which tenant is enabled, where their tokens live,
 * which model slot to build, and where the page goes afterwards.
 *
 * It used to do the fetching, prompting, parsing and storing itself, as a second
 * copy of the Arbor route (#1798, decision 61). The cutover retired that copy; the
 * old prompt path lives in git history, and the page now comes from the recipe.
 */

import type { GroveContext, GroveDatabase } from "@autumnsgrove/infra";
import type { Env, TenantConfig, TenantConfigRow, GenerationResult } from "./config";
import { createSecretsManager } from "@autumnsgrove/grove-crypto/secrets";
import { generateDay } from "@autumnsgrove/curios/timeline/generate";
import { d1DayRun } from "@autumnsgrove/curios/timeline/record";
import { writeDaySummary } from "@autumnsgrove/curios/timeline/summary";
import { resolvePersona } from "@autumnsgrove/curios/timeline/voices";
import { createLumenModelSlot } from "@autumnsgrove/lyra-lumen/lumen";
import {
	MISSING_AI_KEY_MESSAGE,
	resolveOpenRouterKey,
	type SecretReader,
} from "@autumnsgrove/lyra-lumen/secrets";
import { initPulse, emitPulseEvent, flushPulse } from "@autumnsgrove/lattice/pulse";
import { createRunLogger, reportRunOutcome } from "./run-log";

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
        owner_name
      FROM timeline_curio_config
      WHERE enabled = 1
    `,
		)
		.bind()
		.all<TenantConfigRow>();

	return (result.results || []).map(parseConfigRow);
}

/**
 * One tenant's configuration, whether or not it is enabled.
 *
 * The nightly run only asks for enabled tenants; the comparison (#1798) asks for a
 * named one, which may be disabled while it is still being tried out.
 */
export async function getTenantConfig(
	curioDb: GroveDatabase,
	tenantId: string,
): Promise<TenantConfig | null> {
	const row = await curioDb
		.prepare(
			`SELECT
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
        owner_name
      FROM timeline_curio_config
      WHERE tenant_id = ?`,
		)
		.bind(tenantId)
		.first<TenantConfigRow>();

	return row === null || row === undefined ? null : parseConfigRow(row);
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
		// 0. A day that has already been written is not rewritten. The check is for the
		// row, not for `commit_count > 0`: a day whose work was a merged pull request
		// has no commits of its own and is still a finished day.
		const existing = await ctx.db
			.prepare(
				`SELECT 1 FROM timeline_summaries
       WHERE tenant_id = ? AND summary_date = ?`,
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

		// 1. The tenant's own keys, from envelope encryption (tenant_secrets only)
		const secrets = await createSecretsManager({ DB: env.DB, GROVE_KEK: env.GROVE_KEK });

		// One AI key, canonical first — the same order Warden resolves (#1801).
		const readSecret: SecretReader = async (name) =>
			(await secrets.safeGetSecret(config.tenantId, name)) ?? undefined;

		const githubToken = await secrets.safeGetSecret(config.tenantId, "timeline_github_token");
		const openrouter = await resolveOpenRouterKey(readSecret);

		if (!githubToken) {
			throw new Error("GitHub token not found in tenant_secrets (key: timeline_github_token)");
		}

		if (!openrouter) {
			throw new Error(MISSING_AI_KEY_MESSAGE);
		}

		const openrouterKey = openrouter.key;

		// 2. The model, through the Lumen service binding — the same pipeline the
		// nightly run has always used: PII scrub, quota, fallback.
		const model = createLumenModelSlot({
			// The binding answers the request; the URL is what the slot builds the path
			// onto, so it needs a base even though the binding does the routing.
			baseUrl: "https://grove-lumen",
			fetcher: env.LUMEN,
			apiKey: env.LUMEN_API_KEY,
			tenantId: config.tenantId,
			tenantApiKey: openrouterKey,
			model: config.openrouterModel,
		});

		// 3. The day. Lyra retries a failed model call itself, which is why the worker
		// no longer wraps the provider in its own retry loop.
		console.log(`${logPrefix} Writing ${targetDate} with ${config.openrouterModel}...`);
		const record = d1DayRun(env.CURIO_DB, config.tenantId);
		const generated = await generateDay(
			{
				tenantId: config.tenantId,
				date: targetDate,
				timezone: config.timezone,
				githubUsername: config.githubUsername,
				githubToken,
				include: config.reposInclude,
				exclude: config.reposExclude,
				ownerName: config.ownerName,
				persona: resolvePersona({
					preset: config.voicePreset,
					custom:
						config.voicePreset === "custom"
							? {
									systemPrompt: config.customSystemPrompt ?? undefined,
									summaryInstructions: config.customSummaryInstructions ?? undefined,
									gutterStyle: config.customGutterStyle ?? undefined,
								}
							: null,
				}),
			},
			{
				store: record.store,
				storage: record.storage,
				pastDays: record.pastDays,
				model,
				modelName: config.openrouterModel,
				// Follow it in `wrangler tail`. A run that does not finish reaches Pulse
				// below, where errors are already looked at.
				onEvent: createRunLogger({ tenantId: config.tenantId, date: targetDate }),
			},
		);

		for (const warning of generated.warnings) {
			console.warn(`${logPrefix} ${warning}`);
		}

		if (generated.status === "empty") {
			console.log(`${logPrefix} No activity for ${targetDate}, nothing to write`);
			return {
				success: true,
				tenantId: config.tenantId,
				date: targetDate,
				commitCount: 0,
			};
		}

		if (generated.status === "failed") {
			// A failed run has no page worth storing, and a stored page would stop the
			// next run from trying again. The catch below reports it to Pulse.
			throw new Error(generated.error?.message ?? "the run ended failed");
		}

		if (generated.status === "parked") {
			// Parked means a limit was reached, not that the page is worthless, so the
			// page is stored — but it is a night worth seeing, so it goes to Pulse.
			await reportRunOutcome(env, {
				tenantId: config.tenantId,
				date: targetDate,
				runId: generated.runId,
				status: generated.status,
				turns: generated.turns,
				cost: generated.usage.cost?.amount ?? 0,
				error: generated.error?.message ?? null,
				warnings: generated.warnings,
			});
		}

		// 4. Store the day where the site already reads it: the summary, its heatmap
		// row and the usage row, in one batch.
		await writeDaySummary(env.CURIO_DB, {
			tenantId: config.tenantId,
			date: targetDate,
			day: generated.day,
			page: generated.page,
			// The model that answered, not the one that was asked: Lumen's fallback
			// chain can move a turn, and a day charged to the wrong model is a lie
			// the usage table keeps forever.
			model: generated.model ?? config.openrouterModel,
			voice: config.voicePreset,
			usage: {
				inputTokens: generated.usage.inputTokens,
				outputTokens: generated.usage.outputTokens,
				cost: generated.usage.cost?.amount ?? 0,
			},
		});

		console.log(
			`${logPrefix} Wrote ${targetDate}: ${generated.day.commits.length} commits, ` +
				`${generated.turns} turns, $${(generated.usage.cost?.amount ?? 0).toFixed(4)}`,
		);

		return {
			success: true,
			tenantId: config.tenantId,
			date: targetDate,
			commitCount: generated.day.commits.length,
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
	};
}
