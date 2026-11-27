/**
 * The day, written where the site already reads it (#1798, slice 5).
 *
 * `generateDay` writes the run's own record (`timeline_runs` and its entries).
 * This writes the page into the tables the timeline page, the API and every other
 * reader have always used, so the cutover changes who writes a day rather than
 * what a day looks like.
 *
 * It exists because there were two of these and they had drifted: the nightly
 * worker and the Arbor `generate` route each carried their own copy of the same
 * three upserts (decision 61). After the cutover both call this, so a column
 * added here cannot be a column forgotten there.
 *
 * Two fields are deliberately left null rather than guessed:
 *
 * - `context_brief` and `detected_focus` were keyword matches over commit prose
 *   (#1798). The new path has the actual day — commits, pull requests, issues —
 *   and nothing on the page reads those two columns, so writing a guess into them
 *   would only make the row look more certain than it is. They are cleared on an
 *   upsert for the same reason: a stale guess is worse than a null.
 */

import type { TimelineDay } from "./day/types";
import type { SerializedPage } from "./recipe/serialize";
import type { GutterComment } from "./voices/types";

export interface DaySummaryInput {
	tenantId: string;
	/** The day being written, `YYYY-MM-DD`. */
	date: string;
	/** The day as the recipe was handed it, for the counts and the repos. */
	day: TimelineDay;
	/** The serialized page: the headline, the markdown, the vines. */
	page: SerializedPage;
	/** The model that answered the day, which a fallback can change. */
	model: string;
	/** The tenant's voice preset id, as stored on the config row. */
	voice: string;
	/** The run's spend, when the caller knows it. */
	usage?: { inputTokens: number; outputTokens: number; cost: number };
}

/** What a stored day contributes to the heatmap and the usage log. */
interface Totals {
	commits: number;
	additions: number;
	deletions: number;
	repos: string[];
}

function totalsOf(day: TimelineDay): Totals {
	return {
		commits: day.commits.length,
		repos: [...day.repos],
		additions: day.commits.reduce((sum, commit) => sum + (commit.additions ?? 0), 0),
		deletions: day.commits.reduce((sum, commit) => sum + (commit.deletions ?? 0), 0),
	};
}

/**
 * Write one day: the summary row, the activity row, the usage row.
 *
 * Batched so the three land together — a summary without its activity row is a
 * day that appears in the timeline and nowhere on the heatmap. A failure throws;
 * the caller is the only place that can decide what a day without a page means.
 */
export async function writeDaySummary(db: D1Database, input: DaySummaryInput): Promise<void> {
	const totals = totalsOf(input.day);
	const usage = input.usage;

	await db.batch([
		db
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
          ai_cost,
          input_tokens,
          output_tokens,
          voice_preset,
          context_brief,
          detected_focus,
          continuation_of,
          focus_streak,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(tenant_id, summary_date) DO UPDATE SET
          brief_summary = excluded.brief_summary,
          detailed_timeline = excluded.detailed_timeline,
          gutter_content = excluded.gutter_content,
          commit_count = excluded.commit_count,
          repos_active = excluded.repos_active,
          total_additions = excluded.total_additions,
          total_deletions = excluded.total_deletions,
          ai_model = excluded.ai_model,
          ai_cost = excluded.ai_cost,
          input_tokens = excluded.input_tokens,
          output_tokens = excluded.output_tokens,
          voice_preset = excluded.voice_preset,
          context_brief = excluded.context_brief,
          detected_focus = excluded.detected_focus,
          continuation_of = excluded.continuation_of,
          focus_streak = excluded.focus_streak,
          created_at = strftime('%s', 'now')`,
			)
			.bind(
				`${input.tenantId}-${input.date}`,
				input.tenantId,
				input.date,
				input.page.brief,
				input.page.markdown,
				JSON.stringify(input.page.gutter satisfies GutterComment[]),
				totals.commits,
				JSON.stringify(totals.repos),
				totals.additions,
				totals.deletions,
				input.model,
				usage?.cost ?? 0,
				usage?.inputTokens ?? 0,
				usage?.outputTokens ?? 0,
				input.voice,
				input.page.continuation?.day ?? null,
				input.page.continuation === null ? 0 : 1,
			),

		db
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
				input.tenantId,
				input.date,
				totals.commits,
				JSON.stringify(totals.repos),
				totals.additions,
				totals.deletions,
			),

		db
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
				input.tenantId,
				input.model,
				usage?.inputTokens ?? 0,
				usage?.outputTokens ?? 0,
				usage?.cost ?? 0,
			),
	]);
}
