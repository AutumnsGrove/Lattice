/**
 * Running the comparison for one day (#1798, slice 4).
 *
 * The judgement is Autumn's, so this is deliberately not a score. It runs the new
 * path once and puts it beside what the current path stored, rendered the same way.
 *
 * Two choices worth knowing:
 *
 * - **The old day is read, not regenerated.** It is already in
 *   `timeline_summaries`, written by the nightly run she has been reading all
 *   along. Regenerating it would spend her provider key again and could land on a
 *   different answer than the one she remembers, which would make the comparison
 *   a comparison of two runs rather than of two paths.
 * - **The new day is written to `timeline_runs`**, beside the summaries. It is the
 *   tenant's audit trail (decision 51) and it is what makes the run replayable, so
 *   a comparison run leaves a record like any other.
 */

import { generateDay } from "@autumnsgrove/curios/timeline/generate";
import { d1DayRun } from "@autumnsgrove/curios/timeline/record";
import type { TimelineVine } from "@autumnsgrove/curios/timeline/render";
import { createSecretsManager } from "@autumnsgrove/grove-crypto/secrets";
import type { GroveContext } from "@autumnsgrove/infra";
import { createLumenModelSlot } from "@autumnsgrove/lyra-lumen/lumen";
import { buildComparisonPage, type NewDay, type OldDay } from "./compare-page";
import type { Env } from "./config";
import { getTenantConfig } from "./generator";
import { createRunLogger, reportRunOutcome } from "./run-log";

export interface CompareInput {
	tenantId: string;
	/** `YYYY-MM-DD`. */
	date: string;
}

export interface ComparedDay {
	old: OldDay | null;
	next: NewDay;
	/** The run the new path wrote, or `null` when the day was empty. */
	runId: string | null;
	html: string;
}

export async function compareDay(
	env: Env,
	ctx: GroveContext,
	input: CompareInput,
): Promise<ComparedDay> {
	const config = await getTenantConfig(ctx.db, input.tenantId);
	if (config === null) {
		throw new Error(`no timeline configuration for tenant ${input.tenantId}`);
	}

	const secrets = await createSecretsManager({ DB: env.DB, GROVE_KEK: env.GROVE_KEK });
	const [githubToken, openrouterKey] = await Promise.all([
		secrets.safeGetSecret(config.tenantId, "timeline_github_token"),
		secrets.safeGetSecret(config.tenantId, "timeline_openrouter_key"),
	]);

	if (!githubToken) {
		throw new Error("GitHub token not found in tenant_secrets (key: timeline_github_token)");
	}
	if (!openrouterKey) {
		throw new Error("OpenRouter key not found in tenant_secrets (key: timeline_openrouter_key)");
	}

	const model = createLumenModelSlot({
		fetcher: env.LUMEN,
		apiKey: env.LUMEN_API_KEY,
		tenantId: config.tenantId,
		tenantApiKey: openrouterKey,
		model: config.openrouterModel,
	});

	const record = d1DayRun(env.CURIO_DB, config.tenantId);
	const generated = await generateDay(
		{
			tenantId: config.tenantId,
			date: input.date,
			timezone: config.timezone,
			githubUsername: config.githubUsername,
			githubToken,
			include: config.reposInclude,
			exclude: config.reposExclude,
			ownerName: config.ownerName,
		},
		{
			store: record.store,
			storage: record.storage,
			pastDays: record.pastDays,
			model,
			modelName: config.openrouterModel,
			// Follow the run in `wrangler tail`, and let a run that did not finish
			// reach Pulse where errors are already looked at.
			onEvent: createRunLogger({ tenantId: config.tenantId, date: input.date }),
		},
	);

	await reportRunOutcome(env, {
		tenantId: config.tenantId,
		date: input.date,
		runId: generated.runId,
		status: generated.status,
		turns: generated.turns,
		cost: generated.usage.cost?.amount ?? 0,
		error: generated.error?.message ?? null,
		warnings: generated.warnings,
	});

	const next: NewDay = {
		status: generated.status,
		brief: generated.page.brief,
		markdown: generated.page.markdown,
		gutter: generated.page.gutter,
		turns: generated.turns,
		cost: generated.usage.cost?.amount ?? 0,
		warnings: generated.warnings,
		error: generated.error?.message ?? null,
	};

	const old = await readOldDay(env.CURIO_DB, config.tenantId, input.date);

	return {
		old,
		next,
		runId: generated.runId,
		html: buildComparisonPage({
			tenantId: config.tenantId,
			date: input.date,
			githubUsername: config.githubUsername,
			old,
			next,
		}),
	};
}

interface SummaryRow {
	brief_summary: string | null;
	detailed_timeline: string | null;
	gutter_content: string | null;
	commit_count: number | null;
	voice_preset: string | null;
	ai_model: string | null;
	ai_cost: number | null;
}

/** What the current path stored for the day, in the shape the page wants. */
async function readOldDay(
	curioDb: D1Database,
	tenantId: string,
	date: string,
): Promise<OldDay | null> {
	const row = await curioDb
		.prepare(
			`SELECT brief_summary, detailed_timeline, gutter_content, commit_count,
			        voice_preset, ai_model, ai_cost
			 FROM timeline_summaries
			 WHERE tenant_id = ? AND summary_date = ?`,
		)
		.bind(tenantId, date)
		.first<SummaryRow>();

	if (row === null) {
		return null;
	}

	return {
		brief: row.brief_summary,
		markdown: row.detailed_timeline ?? "",
		gutter: parseGutter(row.gutter_content),
		commitCount: row.commit_count ?? 0,
		voice: row.voice_preset,
		model: row.ai_model,
		cost: row.ai_cost ?? 0,
	};
}

/** The stored gutter is JSON text, and a day written by hand may not have one. */
function parseGutter(raw: string | null): TimelineVine[] {
	if (raw === null || raw.trim() === "") {
		return [];
	}
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}
		return parsed.flatMap((item): TimelineVine[] => {
			if (item === null || typeof item !== "object") return [];
			const { anchor, content } = item as { anchor?: unknown; content?: unknown };
			if (typeof anchor !== "string" || typeof content !== "string") return [];
			return [{ anchor, content }];
		});
	} catch {
		return [];
	}
}
