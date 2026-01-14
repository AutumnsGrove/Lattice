import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import {
  getAllVoices,
  getOpenRouterModels,
  DEFAULT_TIMELINE_CONFIG,
} from "$lib/curios/timeline";

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

  // Fetch existing config
  const config = await db
    .prepare(
      `SELECT
        enabled,
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
        updated_at
      FROM timeline_curio_config
      WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first();

  // Parse JSON fields if config exists
  let parsedConfig = null;
  if (config) {
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
      // Note: We don't return encrypted tokens to the client
      hasGithubToken: false, // Would check if github_token_encrypted is set
      hasOpenrouterKey: false, // Would check if openrouter_key_encrypted is set
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
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();

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
          error: "GitHub username is required when enabling Timeline",
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
      // Upsert config
      // Note: In production, encrypt tokens before storing
      const githubTokenEncrypted = githubToken?.trim() || null;
      const openrouterKeyEncrypted = openrouterKey?.trim() || null;

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
            github_token_encrypted = COALESCE(excluded.github_token_encrypted, github_token_encrypted),
            openrouter_key_encrypted = COALESCE(excluded.openrouter_key_encrypted, openrouter_key_encrypted),
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
          githubTokenEncrypted,
          openrouterKeyEncrypted,
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

      return { success: true };
    } catch (error) {
      console.error("Failed to save Timeline config:", error);
      return fail(500, { error: "Failed to save configuration" });
    }
  },
};
