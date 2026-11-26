/**
 * Timeline Curio API - Manual Generation Endpoint
 *
 * POST /api/curios/timeline/generate
 *
 * One request, two calls: `generateDay` writes the page with the recipe, and
 * `writeDaySummary` puts it where the site already reads it. This route used to
 * carry its own fetcher (`github-fetcher.ts`) and prompt builder (`builder.ts`) —
 * a second copy of what the nightly worker did, which had already drifted from it
 * (#1798, decision 61). Both are gone; the day is the library's.
 *
 * What stays here is what only this deployment knows: the signed-in Wanderer and
 * their tenant, the rate limit, which of their keys to read, and the Lumen binding
 * the recipe's model slot speaks to.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
	getTimelineToken,
	TIMELINE_SECRET_KEYS,
} from "@autumnsgrove/curios/timeline/secrets.server";
import {
	createTenantSecretsSlot,
	MISSING_AI_KEY_MESSAGE,
	resolveOpenRouterKey,
} from "@autumnsgrove/lyra-lumen/secrets";
import { generateDay } from "@autumnsgrove/curios/timeline/generate";
import { d1DayRun } from "@autumnsgrove/curios/timeline/record";
import { writeDaySummary } from "@autumnsgrove/curios/timeline/summary";
import { resolvePersona } from "@autumnsgrove/curios/timeline/voices";
import { createLumenModelSlot } from "@autumnsgrove/lyra-lumen/lumen";
import { createThreshold } from "@autumnsgrove/lattice/platform/threshold/factory";
import { thresholdCheck } from "@autumnsgrove/lattice/platform/threshold/sveltekit";
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";

/** The columns this route reads from `timeline_curio_config`. */
interface ConfigRow {
	enabled: number;
	github_username: string;
	openrouter_model: string;
	voice_preset: string;
	custom_system_prompt: string | null;
	custom_summary_instructions: string | null;
	custom_gutter_style: string | null;
	repos_include: string | null;
	repos_exclude: string | null;
	timezone: string;
	owner_name: string | null;
}

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

	// A day that has already been written is not rewritten. The check is for the row,
	// not for `commit_count > 0`: a day whose work was a merged pull request has no
	// commits of its own and is still a finished day (#1798).
	const existing = await curioDb
		.prepare(
			`SELECT 1 FROM timeline_summaries
       WHERE tenant_id = ? AND summary_date = ?`,
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

	// One AI key for every feature (#1801): Settings first, the timeline's own
	// name second. The KEK guard mirrors `getTimelineToken`'s, because the slot
	// would otherwise throw on the first read instead of answering "not set".
	const openrouter = env.GROVE_KEK
		? await resolveOpenRouterKey(
				createTenantSecretsSlot({ db, kek: env.GROVE_KEK, tenantId }).get,
			).catch((err) => {
				console.error("[Timeline Generate] AI key lookup failed:", err);
				return undefined;
			})
		: undefined;

	const githubToken = githubResult.token;
	const openrouterKey = openrouter?.key;

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
			`[Timeline Generate] No AI key found. GROVE_KEK present: ${!!platform?.env?.GROVE_KEK}`,
		);
		return json(
			{
				success: false,
				error: "openrouter_key_missing",
				message: MISSING_AI_KEY_MESSAGE,
				debug: {
					secretSource: openrouter?.source ?? "none",
					kekConfigured: !!platform?.env?.GROVE_KEK,
				},
			},
			{ status: 400 },
		);
	}

	// The recipe drives a tool loop, and Lyra's only model slot speaks Lumen's
	// `/inference` contract — which this deployment reaches through a service
	// binding. A missing binding or key is a deployment fault, said plainly rather
	// than surfacing as a model error three turns in.
	const lumen = platform?.env?.LUMEN;
	const lumenKey = platform?.env?.LUMEN_API_KEY;
	if (!lumen || !lumenKey) {
		throwGroveError(500, API_ERRORS.AI_SERVICE_NOT_CONFIGURED, "API");
	}

	try {
		const model = createLumenModelSlot({
			// The binding answers the request; the URL is what the slot builds the path
			// onto, so it needs a base even though the binding does the routing.
			baseUrl: "https://grove-lumen",
			fetcher: lumen,
			apiKey: lumenKey,
			tenantId,
			tenantApiKey: openrouterKey,
			model: config.openrouter_model,
		});

		const record = d1DayRun(curioDb, tenantId);
		const generated = await generateDay(
			{
				tenantId,
				date: targetDate,
				timezone: config.timezone,
				githubUsername: config.github_username,
				githubToken,
				include: config.repos_include ? (JSON.parse(config.repos_include) as string[]) : null,
				exclude: config.repos_exclude ? (JSON.parse(config.repos_exclude) as string[]) : null,
				ownerName: config.owner_name,
				persona: resolvePersona({
					preset: config.voice_preset,
					custom:
						config.voice_preset === "custom"
							? {
									systemPrompt: config.custom_system_prompt ?? undefined,
									summaryInstructions: config.custom_summary_instructions ?? undefined,
									gutterStyle: config.custom_gutter_style ?? undefined,
								}
							: null,
				}),
			},
			{
				store: record.store,
				storage: record.storage,
				pastDays: record.pastDays,
				model,
				modelName: config.openrouter_model,
			},
		);

		for (const warning of generated.warnings) {
			console.warn(`[Timeline Generate] ${tenantId}/${targetDate}: ${warning}`);
		}

		if (generated.status === "empty") {
			return json({
				success: true,
				message: `No activity found for ${targetDate}`,
				summary: null,
			});
		}

		if (generated.status === "failed") {
			return json(
				{
					success: false,
					error: "generation_failed",
					message: generated.error?.message ?? "The day could not be written.",
					debug: {
						date: targetDate,
						model: config.openrouter_model,
						runId: generated.runId,
						turns: generated.turns,
					},
				},
				{ status: 500 },
			);
		}

		const usage = {
			model: generated.model ?? config.openrouter_model,
			inputTokens: generated.usage.inputTokens,
			outputTokens: generated.usage.outputTokens,
			cost: generated.usage.cost?.amount ?? 0,
			turns: generated.turns,
		};

		// Where the site reads it: the summary row, its heatmap row and the usage row,
		// in one batch. The same call the nightly worker makes.
		await writeDaySummary(curioDb, {
			tenantId,
			date: targetDate,
			day: generated.day,
			page: generated.page,
			model: usage.model,
			voice: config.voice_preset,
			usage,
		});

		return json({
			success: true,
			message: `Generated summary for ${targetDate}`,
			summary: {
				id: `${tenantId}-${targetDate}`,
				summaryDate: targetDate,
				briefSummary: generated.page.brief,
				detailedTimeline: generated.page.markdown,
				gutterComments: generated.page.gutter,
				commitCount: generated.day.commits.length,
				reposActive: generated.day.repos,
				totalAdditions: generated.day.commits.reduce(
					(sum, commit) => sum + (commit.additions ?? 0),
					0,
				),
				totalDeletions: generated.day.commits.reduce(
					(sum, commit) => sum + (commit.deletions ?? 0),
					0,
				),
				voicePreset: config.voice_preset,
				continuationOf: generated.page.continuation?.day ?? null,
				status: generated.status,
				runId: generated.runId,
			},
			usage,
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
