import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
  getAllVoices,
  getOpenRouterModels,
  DEFAULT_TIMELINE_CONFIG,
  CLEAR_TOKEN_VALUE,
} from "$lib/curios/timeline";
import {
  setTimelineToken,
  deleteTimelineToken,
  hasTimelineToken,
  TIMELINE_SECRET_KEYS,
} from "$lib/curios/timeline/secrets.server";

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
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
    .first();

  // Parse JSON fields if config exists
  let parsedConfig = null;
  if (config) {
    // Check for tokens in both SecretsManager and legacy columns
    const env = {
      DB: db,
      GROVE_KEK: platform?.env?.GROVE_KEK,
      TOKEN_ENCRYPTION_KEY: platform?.env?.TOKEN_ENCRYPTION_KEY,
    };

    const hasGithub = await hasTimelineToken(
      env,
      tenantId,
      TIMELINE_SECRET_KEYS.GITHUB_TOKEN,
      config.github_token_encrypted as string | null,
    );
    const hasOpenrouter = await hasTimelineToken(
      env,
      tenantId,
      TIMELINE_SECRET_KEYS.OPENROUTER_KEY,
      config.openrouter_key_encrypted as string | null,
    );

    parsedConfig = {
      enabled: Boolean(config.enabled),
      githubUsername: config.github_username as string | null,
      openrouterModel: config.openrouter_model as string,
      voicePreset: config.voice_preset as string,
      customSystemPrompt: config.custom_system_prompt as string | null,
      customSummaryInstructions: config.custom_summary_instructions as
        | string
        | null,
      customGutterStyle: config.custom_gutter_style as string | null,
      reposInclude: config.repos_include
        ? JSON.parse(config.repos_include as string)
        : null,
      reposExclude: config.repos_exclude
        ? JSON.parse(config.repos_exclude as string)
        : null,
      timezone: config.timezone as string,
      ownerName: config.owner_name as string | null,
      updatedAt: config.updated_at as number,
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
      hasGithubToken: false,
      hasOpenrouterKey: false,
    },
    voices: getAllVoices(),
    models: getOpenRouterModels(),
  };
};

export const actions: Actions = {
  save: async ({ request, platform, locals }) => {
    console.warn("[Timeline Config] Save action called");
    const db = platform?.env?.DB;
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
    console.warn(
      "[Timeline Config] Form data received, enabled:",
      formData.get("enabled"),
    );

    const enabled = formData.get("enabled") === "true";
    const githubUsername = formData.get("githubUsername") as string | null;
    const githubToken = formData.get("githubToken") as string | null;
    const openrouterKey = formData.get("openrouterKey") as string | null;
    const openrouterModel = formData.get("openrouterModel") as string;
    const voicePreset = formData.get("voicePreset") as string;
    const customSystemPrompt = formData.get("customSystemPrompt") as
      | string
      | null;
    const customSummaryInstructions = formData.get(
      "customSummaryInstructions",
    ) as string | null;
    const customGutterStyle = formData.get("customGutterStyle") as
      | string
      | null;
    const reposInclude = formData.get("reposInclude") as string | null;
    const reposExclude = formData.get("reposExclude") as string | null;
    const timezone = formData.get("timezone") as string;
    const ownerName = formData.get("ownerName") as string | null;

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
      const env = {
        DB: db,
        GROVE_KEK: platform?.env?.GROVE_KEK,
        TOKEN_ENCRYPTION_KEY: platform?.env?.TOKEN_ENCRYPTION_KEY,
      };

      // Determine token values for legacy columns
      // With SecretsManager: legacy columns get cleared (set to "")
      // Without SecretsManager: legacy columns store encrypted value
      let githubTokenForDb: string | null = null;
      let openrouterKeyForDb: string | null = null;

      if (githubToken === CLEAR_TOKEN_VALUE) {
        // Explicit clear request - delete from SecretsManager and clear legacy column
        await deleteTimelineToken(
          env,
          tenantId,
          TIMELINE_SECRET_KEYS.GITHUB_TOKEN,
        );
        githubTokenForDb = ""; // Triggers CASE NULL in SQL to clear legacy
      } else if (githubToken?.trim()) {
        // New token value - save via SecretsManager (preferred) or legacy
        const rawToken = githubToken.trim();
        const result = await setTimelineToken(
          env,
          tenantId,
          TIMELINE_SECRET_KEYS.GITHUB_TOKEN,
          rawToken,
        );
        // If using SecretsManager, clear legacy column; otherwise store encrypted value
        githubTokenForDb = result.legacyValue;
        console.warn(
          `[Timeline Config] GitHub token saved via ${result.system}`,
        );
      }
      // else: null/undefined/empty = preserve existing (COALESCE handles this)

      if (openrouterKey === CLEAR_TOKEN_VALUE) {
        // Explicit clear request
        await deleteTimelineToken(
          env,
          tenantId,
          TIMELINE_SECRET_KEYS.OPENROUTER_KEY,
        );
        openrouterKeyForDb = "";
      } else if (openrouterKey?.trim()) {
        // New token value - save via SecretsManager (preferred) or legacy
        const rawKey = openrouterKey.trim();
        const result = await setTimelineToken(
          env,
          tenantId,
          TIMELINE_SECRET_KEYS.OPENROUTER_KEY,
          rawKey,
        );
        openrouterKeyForDb = result.legacyValue;
        console.warn(
          `[Timeline Config] OpenRouter key saved via ${result.system}`,
        );
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
