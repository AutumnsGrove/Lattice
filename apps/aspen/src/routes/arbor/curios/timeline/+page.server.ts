import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { z } from "zod";
import { ARBOR_ERRORS, logGroveError } from "@autumnsgrove/lattice/errors";
import { parseFormData } from "@autumnsgrove/lattice/server/utils/form-data";
import {
	getAllVoices,
	getOpenRouterModels,
	DEFAULT_TIMELINE_CONFIG,
	CLEAR_TOKEN_VALUE,
} from "@autumnsgrove/curios/timeline";
import {
	setTimelineToken,
	deleteTimelineToken,
	hasTimelineToken,
	TIMELINE_SECRET_KEYS,
} from "@autumnsgrove/curios/timeline/secrets.server";
import { createSecretsManager } from "@autumnsgrove/lattice/server/secrets";
import { AI_SECRETS } from "@autumnsgrove/lyra-lumen/secrets";
import { readAiKeySource } from "$lib/server/ai-key";

interface TimelineConfigRow {
	enabled: number | null;
	github_username: string | null;
	github_token_encrypted: string | null;
	openrouter_key_encrypted: string | null;
	openrouter_model: string | null;
	voice_preset: string | null;
	custom_system_prompt: string | null;
	custom_summary_instructions: string | null;
	custom_gutter_style: string | null;
	repos_include: string | null;
	repos_exclude: string | null;
	timezone: string | null;
	owner_name: string | null;
	updated_at: number | null;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db || !tenantId) {
		return {
			config: null,
			voices: getAllVoices(),
			models: getOpenRouterModels(),
			error: "Database not available",
		};
	}

	// Fetch existing config (include token columns to check presence, not values)
	const config = await db
		.prepare(
			`SELECT
        enabled,
        github_username,
        github_token_encrypted,
        openrouter_key_encrypted,
        openrouter_model,
        voice_preset,
        custom_system_prompt,
        custom_summary_instructions,
        custom_gutter_style,
        repos_include,
        repos_exclude,
        timezone,
        owner_name,
        updated_at
      FROM timeline_curio_config
      WHERE tenant_id = ?`,
		)
		.bind(tenantId)
		.first<TimelineConfigRow>();

	// Parse JSON fields if config exists
	let parsedConfig = null;
	if (config) {
		// Check for tokens in both SecretsManager and legacy columns.
		// SecretsManager's tenant_secrets/tenants tables live in the main
		// engine DB, not CURIO_DB — passing `db` (CURIO_DB) here always
		// throws "no such table: tenant_secrets", silently caught and
		// falling back to the legacy column check every time.
		const env = {
			DB: platform?.env?.DB as D1Database,
			GROVE_KEK: platform?.env?.GROVE_KEK,
		};

		const hasGithub = await hasTimelineToken(env, tenantId, TIMELINE_SECRET_KEYS.GITHUB_TOKEN);
		// The AI key may have been set in Settings instead of here (#1801), so ask
		// the shared lookup rather than this screen's own name.
		const hasOpenrouter = Boolean(await readAiKeySource(platform?.env, tenantId));

		parsedConfig = {
			enabled: Boolean(config.enabled),
			githubUsername: config.github_username as string | null,
			// A row can hold NULL (the column defaults only apply on insert), and the
			// picker has no blank option — so the fallback belongs here rather than in
			// the page, which would otherwise render an empty select (#1602).
			openrouterModel:
				(config.openrouter_model as string | null) ?? DEFAULT_TIMELINE_CONFIG.openrouterModel,
			voicePreset: config.voice_preset as string,
			customSystemPrompt: config.custom_system_prompt as string | null,
			customSummaryInstructions: config.custom_summary_instructions as string | null,
			customGutterStyle: config.custom_gutter_style as string | null,
			reposInclude: config.repos_include ? JSON.parse(config.repos_include as string) : null,
			reposExclude: config.repos_exclude ? JSON.parse(config.repos_exclude as string) : null,
			timezone: config.timezone as string,
			ownerName: config.owner_name as string | null,
			updatedAt: config.updated_at as number,
			// A row exists, so the zone below is one she chose (or the column default
			// on first save) rather than a placeholder for the picker to overwrite.
			timezoneIsSaved: Boolean(config.timezone),
			// Check both SecretsManager and legacy columns for token presence
			hasGithubToken: hasGithub,
			hasOpenrouterKey: hasOpenrouter,
		};
	}

	return {
		config: parsedConfig || {
			...DEFAULT_TIMELINE_CONFIG,
			githubUsername: null,
			customSystemPrompt: null,
			customSummaryInstructions: null,
			customGutterStyle: null,
			reposInclude: null,
			reposExclude: null,
			ownerName: null,
			timezoneIsSaved: false,
			hasGithubToken: false,
			hasOpenrouterKey: false,
		},
		voices: getAllVoices(),
		models: getOpenRouterModels(),
	};
};

const SaveTimelineSchema = z.object({
	enabled: z.string().optional(),
	githubUsername: z.string().nullable().optional(),
	githubToken: z.string().nullable().optional(),
	openrouterKey: z.string().nullable().optional(),
	openrouterModel: z.string().optional().default(""),
	voicePreset: z.string().optional().default(""),
	customSystemPrompt: z.string().nullable().optional(),
	customSummaryInstructions: z.string().nullable().optional(),
	customGutterStyle: z.string().nullable().optional(),
	reposInclude: z.string().nullable().optional(),
	reposExclude: z.string().nullable().optional(),
	timezone: z.string().optional().default(""),
	ownerName: z.string().nullable().optional(),
});

export const actions: Actions = {
	save: async ({ request, platform, locals }) => {
		console.warn("[Timeline Config] Save action called");
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;
		console.warn("[Timeline Config] tenantId:", tenantId, "db:", !!db);

		if (!db || !tenantId) {
			console.warn("[Timeline Config] Missing db or tenantId");
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, SaveTimelineSchema);
		if (!parsed.success) {
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });
		}
		const d = parsed.data;
		console.warn("[Timeline Config] Form data received, enabled:", d.enabled);

		const enabled = d.enabled === "true";
		const githubUsername = d.githubUsername ?? null;
		const githubToken = d.githubToken ?? null;
		const openrouterKey = d.openrouterKey ?? null;
		const openrouterModel = d.openrouterModel;
		const voicePreset = d.voicePreset;
		const customSystemPrompt = d.customSystemPrompt ?? null;
		const customSummaryInstructions = d.customSummaryInstructions ?? null;
		const customGutterStyle = d.customGutterStyle ?? null;
		const reposInclude = d.reposInclude ?? null;
		const reposExclude = d.reposExclude ?? null;
		const timezone = d.timezone;
		const ownerName = d.ownerName ?? null;

		// Validate required fields if enabling
		if (enabled) {
			if (!githubUsername?.trim()) {
				return fail(400, {
					error: ARBOR_ERRORS.FIELD_REQUIRED.userMessage,
					error_code: ARBOR_ERRORS.FIELD_REQUIRED.code,
				});
			}
			// Note: We'd also validate tokens exist (either new or previously saved)
		}

		// Parse repo lists (comma-separated to JSON array)
		const reposIncludeJson = reposInclude?.trim()
			? JSON.stringify(
					reposInclude
						.split(",")
						.map((r) => r.trim())
						.filter(Boolean),
				)
			: null;
		const reposExcludeJson = reposExclude?.trim()
			? JSON.stringify(
					reposExclude
						.split(",")
						.map((r) => r.trim())
						.filter(Boolean),
				)
			: null;

		try {
			// Token handling using SecretsManager (preferred) or legacy encryption
			// Token handling: null = preserve existing, CLEAR_TOKEN_VALUE = delete, "value" = set new
			// SecretsManager's tenant_secrets/tenants tables live in the main
			// engine DB, not CURIO_DB (`db` above) — see same fix in load().
			const env = {
				DB: platform?.env?.DB as D1Database,
				GROVE_KEK: platform?.env?.GROVE_KEK,
			};

			// Tokens go to SecretsManager. The legacy columns are only ever
			// cleared ("" -> NULL via CASE), never written with a ciphertext.
			let githubTokenForDb: string | null = null;
			let openrouterKeyForDb: string | null = null;

			if (githubToken === CLEAR_TOKEN_VALUE) {
				// Explicit clear request - delete from SecretsManager and clear legacy column
				await deleteTimelineToken(env, tenantId, TIMELINE_SECRET_KEYS.GITHUB_TOKEN);
				githubTokenForDb = ""; // Triggers CASE NULL in SQL to clear legacy
			} else if (githubToken?.trim()) {
				// New token value - save via SecretsManager, clear the legacy column
				const rawToken = githubToken.trim();
				const result = await setTimelineToken(
					env,
					tenantId,
					TIMELINE_SECRET_KEYS.GITHUB_TOKEN,
					rawToken,
				);
				githubTokenForDb = "";
				console.warn(`[Timeline Config] GitHub token saved via ${result.system}`);
			}
			// else: null/undefined/empty = preserve existing (COALESCE handles this)

			if (openrouterKey === CLEAR_TOKEN_VALUE) {
				// Clearing here clears the one key, wherever it was set — leaving the
				// Settings copy behind would make this button do nothing (#1801).
				const secrets = await createSecretsManager(env);
				await secrets.deleteSecret(tenantId, AI_SECRETS.openRouterKey);
				await deleteTimelineToken(env, tenantId, TIMELINE_SECRET_KEYS.OPENROUTER_KEY);
				openrouterKeyForDb = "";
			} else if (openrouterKey?.trim()) {
				// Saved under the canonical name, because that is what every feature
				// now reads and what Settings writes. The column stays cleared.
				const rawKey = openrouterKey.trim();
				const secrets = await createSecretsManager(env);
				await secrets.setSecret(tenantId, AI_SECRETS.openRouterKey, rawKey);
				openrouterKeyForDb = "";
				console.warn("[Timeline Config] OpenRouter key saved as the shared AI key");
			}

			await db
				.prepare(
					`INSERT INTO timeline_curio_config (
            tenant_id,
            enabled,
            github_username,
            github_token_encrypted,
            openrouter_key_encrypted,
            openrouter_model,
            voice_preset,
            custom_system_prompt,
            custom_summary_instructions,
            custom_gutter_style,
            repos_include,
            repos_exclude,
            timezone,
            owner_name,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
          ON CONFLICT(tenant_id) DO UPDATE SET
            enabled = excluded.enabled,
            github_username = excluded.github_username,
            github_token_encrypted = CASE
              WHEN excluded.github_token_encrypted = '' THEN NULL
              ELSE COALESCE(excluded.github_token_encrypted, github_token_encrypted)
            END,
            openrouter_key_encrypted = CASE
              WHEN excluded.openrouter_key_encrypted = '' THEN NULL
              ELSE COALESCE(excluded.openrouter_key_encrypted, openrouter_key_encrypted)
            END,
            openrouter_model = excluded.openrouter_model,
            voice_preset = excluded.voice_preset,
            custom_system_prompt = excluded.custom_system_prompt,
            custom_summary_instructions = excluded.custom_summary_instructions,
            custom_gutter_style = excluded.custom_gutter_style,
            repos_include = excluded.repos_include,
            repos_exclude = excluded.repos_exclude,
            timezone = excluded.timezone,
            owner_name = excluded.owner_name,
            updated_at = strftime('%s', 'now')`,
				)
				.bind(
					tenantId,
					enabled ? 1 : 0,
					githubUsername?.trim() || null,
					githubTokenForDb,
					openrouterKeyForDb,
					openrouterModel || DEFAULT_TIMELINE_CONFIG.openrouterModel,
					voicePreset || DEFAULT_TIMELINE_CONFIG.voicePreset,
					customSystemPrompt?.trim() || null,
					customSummaryInstructions?.trim() || null,
					customGutterStyle?.trim() || null,
					reposIncludeJson,
					reposExcludeJson,
					timezone || DEFAULT_TIMELINE_CONFIG.timezone,
					ownerName?.trim() || null,
				)
				.run();

			console.warn("[Timeline Config] Save successful!");
			return { success: true };
		} catch (error) {
			console.error("[Timeline Config] Failed to save:", error);
			logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
			return fail(500, {
				error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
				error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			});
		}
	},
};
