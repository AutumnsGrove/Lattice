/**
 * Timeline Curio API - Manual Generation Endpoint
 *
 * POST /api/curios/timeline/generate
 * Thin routing layer — delegates to builder.ts and github-fetcher.ts.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
	getTimelineToken,
	TIMELINE_SECRET_KEYS,
} from "@autumnsgrove/curios/timeline/secrets.server";
import { createLumenClient } from "@autumnsgrove/lattice/ai/lumen";
import { createThreshold } from "@autumnsgrove/lattice/platform/threshold/factory";
import { thresholdCheck } from "@autumnsgrove/lattice/platform/threshold/sveltekit";
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";
import { fetchGitHubCommits, fetchCommitStats } from "./github-fetcher";
import { generateSummary, type ConfigRow } from "./builder";

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	const db = platform?.env?.DB;
	const curioDb = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;
	const user = locals.user;

	if (!db || !curioDb) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	if (!user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	// Parse request body
	const body = (await request.json()) as { date?: string };
	const targetDate = body.date ?? new Date().toISOString().split("T")[0];

	// Skip if already generated — checked BEFORE the rate limit so re-running
	// a backfill over an overlapping range doesn't burn quota on free skips.
	const existing = await curioDb
		.prepare(
			`SELECT 1 FROM timeline_summaries
       WHERE tenant_id = ? AND summary_date = ? AND commit_count > 0`,
		)
		.bind(tenantId, targetDate)
		.first();

	if (existing) {
		return json({
			success: true,
			message: `Summary already exists for ${targetDate}`,
			summary: null,
			alreadyExists: true,
		});
	}

	// Rate limit generation
	const threshold = createThreshold(platform?.env, {
		identifier: locals.user?.id,
	});
	if (threshold) {
		const denied = await thresholdCheck(threshold, {
			key: `ai/timeline-generate:${user.id}`,
			limit: 500,
			windowSeconds: 86400,
			failMode: "closed",
		});
		if (denied) return denied;
	}

	// Fetch config
	const config = await curioDb
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
        owner_name
      FROM timeline_curio_config
      WHERE tenant_id = ?`,
		)
		.bind(tenantId)
		.first<ConfigRow>();

	if (!config) {
		throwGroveError(400, API_ERRORS.FEATURE_DISABLED, "API");
	}

	// Get tokens using SecretsManager
	const env = {
		DB: db,
		GROVE_KEK: platform?.env?.GROVE_KEK,
	};

	const githubResult = await getTimelineToken(env, tenantId, TIMELINE_SECRET_KEYS.GITHUB_TOKEN);

	const openrouterResult = await getTimelineToken(
		env,
		tenantId,
		TIMELINE_SECRET_KEYS.OPENROUTER_KEY,
	);

	const githubToken = githubResult.token;
	const openrouterKey = openrouterResult.token;

	if (!githubToken) {
		console.error(
			`[Timeline Generate] GitHub token not found. Source attempted: ${githubResult.source}. GROVE_KEK present: ${!!platform?.env?.GROVE_KEK}`,
		);
		return json(
			{
				success: false,
				error: "github_token_missing",
				message: "GitHub token could not be retrieved. Check that it's saved in Timeline settings.",
				debug: {
					secretSource: githubResult.source,
					kekConfigured: !!platform?.env?.GROVE_KEK,
				},
			},
			{ status: 400 },
		);
	}

	if (!openrouterKey) {
		console.error(
			`[Timeline Generate] OpenRouter key not found. Source attempted: ${openrouterResult.source}. GROVE_KEK present: ${!!platform?.env?.GROVE_KEK}`,
		);
		return json(
			{
				success: false,
				error: "openrouter_key_missing",
				message:
					"OpenRouter API key could not be retrieved. Check that it's saved in Timeline settings.",
				debug: {
					secretSource: openrouterResult.source,
					kekConfigured: !!platform?.env?.GROVE_KEK,
				},
			},
			{ status: 400 },
		);
	}

	console.log(
		`[Timeline Generate] Token sources: github=${githubResult.source}, openrouter=${openrouterResult.source}`,
	);

	try {
		// Fetch commits from GitHub
		const commits = await fetchGitHubCommits(
			config.github_username,
			githubToken,
			targetDate,
			config.repos_include ? JSON.parse(config.repos_include) : null,
			config.repos_exclude ? JSON.parse(config.repos_exclude) : null,
			curioDb,
			tenantId,
			config.timezone,
		);

		if (commits.length === 0) {
			return json({
				success: true,
				message: `No commits found for ${targetDate}`,
				summary: null,
			});
		}

		// Enrich commits with stats
		await fetchCommitStats(commits, config.github_username, githubToken);

		// Generate summary via AI
		const globalKey = platform?.env?.OPENROUTER_API_KEY || openrouterKey;
		const lumen = createLumenClient({
			openrouterApiKey: globalKey,
			ai: platform?.env?.AI,
			db,
		});

		const result = await generateSummary(commits, config, targetDate, tenantId, curioDb, lumen);

		return json({
			success: true,
			message: `Generated summary for ${targetDate}`,
			...result,
		});
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		const isLumenError = err instanceof Error && "code" in err && "attempts" in err;
		const attempts = isLumenError
			? (
					err as {
						attempts?: Array<{ provider: string; model: string; error: string }>;
					}
				).attempts
			: undefined;

		console.error(`[Timeline Generate] Failed for ${targetDate}:`, errorMessage);
		if (attempts) {
			console.error(`[Timeline Generate] Provider attempts:`, JSON.stringify(attempts));
		}

		return json(
			{
				success: false,
				error: "generation_failed",
				message: errorMessage,
				debug: {
					date: targetDate,
					model: config.openrouter_model,
					providerAttempts: attempts ?? null,
				},
			},
			{ status: 500 },
		);
	}
};
