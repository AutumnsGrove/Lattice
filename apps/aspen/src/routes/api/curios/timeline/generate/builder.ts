/**
 * Timeline Curio - Summary Generation + Storage
 *
 * Builds voiced prompts, calls Lumen AI, stores summaries and activity.
 */

import {
	buildVoicedPrompt,
	parseAIResponse,
	getHistoricalContext,
	detectTaskFromText,
	buildSummaryContextData,
	formatHistoricalContextForPrompt,
	formatContinuationForPrompt,
	detectContinuation,
	type Commit,
	type CustomVoiceConfig,
	type PromptContextInput,
} from "@autumnsgrove/curios/timeline";
import type { LumenClient } from "@autumnsgrove/lattice/ai/lumen";

// ============================================================================
// Types
// ============================================================================

export interface ConfigRow {
	enabled: number;
	github_username: string;
	github_token_encrypted: string;
	openrouter_key_encrypted: string;
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

export interface GenerationResult {
	summary: {
		id: string;
		summaryDate: string;
		briefSummary: string;
		detailedTimeline: string;
		gutterComments: unknown;
		commitCount: number;
		reposActive: string[];
		totalAdditions: number;
		totalDeletions: number;
		voicePreset: string;
		detectedFocus: string | null;
		focusStreak: number;
		continuationOf: string | null;
	};
	usage: {
		model: string;
		inputTokens: number;
		outputTokens: number;
		cost: number;
	};
	context: {
		historicalDays: number;
		preDetectedTask: string | null;
		finalDetectedTask: string | null;
		focusStreak: number;
	};
}

// ============================================================================
// Generate Summary
// ============================================================================

export async function generateSummary(
	commits: Commit[],
	config: ConfigRow,
	targetDate: string,
	tenantId: string,
	curioDb: D1Database,
	lumen: LumenClient,
): Promise<GenerationResult> {
	// Long-Horizon Context: Get historical context BEFORE generating
	const repos = [...new Set(commits.map((c) => c.repo))];
	let historicalContext: Awaited<ReturnType<typeof getHistoricalContext>> = [];
	let preDetectedTask = null;
	let promptContext: PromptContextInput | null = null;

	try {
		historicalContext = await getHistoricalContext(curioDb, tenantId, targetDate);

		const commitText = commits.map((c) => c.message).join(" ");
		preDetectedTask = detectTaskFromText(commitText);

		const continuation = detectContinuation(historicalContext, preDetectedTask);

		if (historicalContext.length > 0 || continuation) {
			promptContext = {
				historicalContext: formatHistoricalContextForPrompt(historicalContext),
				continuationNote: formatContinuationForPrompt(continuation),
			};
		}

		console.log(
			`Context: task=${preDetectedTask}, continuation=${continuation?.startDate || "none"}, history=${historicalContext.length} days`,
		);
	} catch (contextError) {
		console.error("Failed to get historical context (non-fatal):", contextError);
	}

	// Build prompt based on voice (with optional context)
	const customConfig: CustomVoiceConfig | null =
		config.voice_preset === "custom"
			? {
					systemPrompt: config.custom_system_prompt ?? undefined,
					summaryInstructions: config.custom_summary_instructions ?? undefined,
					gutterStyle: config.custom_gutter_style ?? undefined,
				}
			: null;

	const promptResult = buildVoicedPrompt(
		config.voice_preset,
		commits,
		targetDate,
		config.owner_name ?? "the developer",
		customConfig,
		promptContext,
	);

	// Call AI via Lumen
	const maxTokens = 8192;
	const aiResponse = await lumen.run({
		task: "summary",
		input: [
			{ role: "system", content: promptResult.systemPrompt },
			{ role: "user", content: promptResult.userPrompt },
		],
		tenant: tenantId,
		options: {
			model: config.openrouter_model,
			tenantApiKey: undefined, // Set by caller
			// See same fix + rationale in workers/timeline-sync/src/generator.ts.
			maxTokens,
			temperature: 0.7,
			skipQuota: true,
		},
	});

	// A truncated response is not a summary. parseAIResponse() hands back a
	// generic fallback object on JSON.parse failure, and storing that used to
	// happen silently — the row was written with the real commit_count, so the
	// date looked generated and every later run skipped it. Fail loudly instead.
	if (aiResponse.usage.output >= maxTokens) {
		throw new Error(
			`AI response hit the ${maxTokens}-token ceiling (model=${aiResponse.model}, output=${aiResponse.usage.output}) and was truncated mid-JSON`,
		);
	}

	// Parse AI response
	const parsed = parseAIResponse(aiResponse.content);

	if (!parsed.success) {
		throw new Error(
			`AI response was not valid JSON (model=${aiResponse.model}, output=${aiResponse.usage.output} tokens, ${aiResponse.content.length} chars)`,
		);
	}

	// Build context data for storage
	const contextData = buildSummaryContextData(
		{ brief: parsed.brief, detailed: parsed.detailed },
		commits,
		targetDate,
		historicalContext,
		preDetectedTask,
	);

	console.log(
		`Final context: detected=${contextData.detectedFocus?.task || "none"}, streak=${contextData.focusStreak}`,
	);

	// Calculate stats
	const totalAdditions = commits.reduce((sum, c) => sum + (c.additions ?? 0), 0);
	const totalDeletions = commits.reduce((sum, c) => sum + (c.deletions ?? 0), 0);

	const summaryId = `${tenantId}-${targetDate}`;

	// Store summary with context data
	await storeSummary(curioDb, {
		summaryId,
		tenantId,
		targetDate,
		parsed,
		repos,
		commits,
		totalAdditions,
		totalDeletions,
		config,
		contextData,
	});

	// Update activity table
	await storeActivity(
		curioDb,
		tenantId,
		targetDate,
		commits.length,
		repos,
		totalAdditions,
		totalDeletions,
	);

	// Log AI usage
	await logAIUsage(curioDb, tenantId, aiResponse);

	return {
		summary: {
			id: summaryId,
			summaryDate: targetDate,
			briefSummary: parsed.brief,
			detailedTimeline: parsed.detailed,
			gutterComments: parsed.gutter,
			commitCount: commits.length,
			reposActive: repos,
			totalAdditions,
			totalDeletions,
			voicePreset: config.voice_preset,
			detectedFocus: contextData.detectedFocus?.task ?? null,
			focusStreak: contextData.focusStreak,
			continuationOf: contextData.continuationOf,
		},
		usage: {
			model: aiResponse.model,
			inputTokens: aiResponse.usage.input,
			outputTokens: aiResponse.usage.output,
			cost: aiResponse.usage.cost,
		},
		context: {
			historicalDays: historicalContext.length,
			preDetectedTask,
			finalDetectedTask: contextData.detectedFocus?.task ?? null,
			focusStreak: contextData.focusStreak,
		},
	};
}

// ============================================================================
// Storage Helpers
// ============================================================================

async function storeSummary(
	curioDb: D1Database,
	data: {
		summaryId: string;
		tenantId: string;
		targetDate: string;
		parsed: ReturnType<typeof parseAIResponse>;
		repos: string[];
		commits: Commit[];
		totalAdditions: number;
		totalDeletions: number;
		config: ConfigRow;
		contextData: ReturnType<typeof buildSummaryContextData>;
	},
) {
	await curioDb
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
			data.summaryId,
			data.tenantId,
			data.targetDate,
			data.parsed.brief,
			data.parsed.detailed,
			JSON.stringify(data.parsed.gutter),
			data.commits.length,
			JSON.stringify(data.repos),
			data.totalAdditions,
			data.totalDeletions,
			data.config.openrouter_model,
			data.config.voice_preset,
			JSON.stringify(data.contextData.contextBrief),
			data.contextData.detectedFocus ? JSON.stringify(data.contextData.detectedFocus) : null,
			data.contextData.continuationOf,
			data.contextData.focusStreak,
		)
		.run();
}

async function storeActivity(
	curioDb: D1Database,
	tenantId: string,
	targetDate: string,
	commitCount: number,
	repos: string[],
	totalAdditions: number,
	totalDeletions: number,
) {
	await curioDb
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
		.bind(tenantId, targetDate, commitCount, JSON.stringify(repos), totalAdditions, totalDeletions)
		.run();
}

async function logAIUsage(
	curioDb: D1Database,
	tenantId: string,
	aiResponse: { model: string; usage: { input: number; output: number; cost: number } },
) {
	await curioDb
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
			tenantId,
			aiResponse.model,
			aiResponse.usage.input,
			aiResponse.usage.output,
			aiResponse.usage.cost,
		)
		.run();
}
