/**
 * Earlier days, for `search_past_days` (#1798, slice 3).
 *
 * The tool's rule (from #1798) is that it must not trust what is stored: no
 * `detected_focus`, no `focus_streak`, and not the stored commit lists. Those are
 * keyword guesses and repo names. What it may search is the days themselves, so this
 * reads both places a day's own words live:
 *
 * - `timeline_runs`, the new path's page. Chosen first when both exist for a day,
 *   because a run keeps the exact data the model was given.
 * - `timeline_summaries`, the old path's page, which is still all there is for days
 *   written before the cutover — and during the comparison, the control group.
 *
 * Only finished runs are searched: a parked or failed run's half-written page is not
 * evidence of anything.
 */

import type { PastDay, PastDays } from "../recipe/tools";

interface DayText {
	date: string;
	text: string | null;
}

export function createPastDays(db: D1Database, tenantId: string, limit = 10): PastDays {
	return {
		async search(query: string): Promise<PastDay[]> {
			const pattern = likePattern(query);
			const [runs, summaries] = await Promise.all([
				db
					.prepare(
						`SELECT run_date AS date, markdown AS text
						 FROM timeline_runs
						 WHERE tenant_id = ? AND status = 'done' AND markdown LIKE ? ESCAPE '\\'
						 ORDER BY run_date DESC
						 LIMIT ?`,
					)
					.bind(tenantId, pattern, limit)
					.all<DayText>(),
				db
					.prepare(
						`SELECT summary_date AS date, detailed_timeline AS text
						 FROM timeline_summaries
						 WHERE tenant_id = ? AND detailed_timeline LIKE ? ESCAPE '\\'
						 ORDER BY summary_date DESC
						 LIMIT ?`,
					)
					.bind(tenantId, pattern, limit)
					.all<DayText>(),
			]);

			const byDate = new Map<string, string>();
			// The old path first, then the new path over it: a run's page wins for a
			// day both paths wrote.
			for (const row of summaries.results ?? []) {
				if (row.text !== null) byDate.set(row.date, row.text);
			}
			for (const row of runs.results ?? []) {
				if (row.text !== null) byDate.set(row.date, row.text);
			}

			return [...byDate.entries()]
				.sort((left, right) => (left[0] < right[0] ? 1 : left[0] > right[0] ? -1 : 0))
				.slice(0, limit)
				.map(([date, text]) => ({ date, text: snippet(text, query) }));
		},
	};
}

/** `LIKE` with the query taken literally, so `%` and `_` are not wildcards. */
function likePattern(query: string): string {
	return `%${query.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

const SNIPPET_CHARS = 300;

/**
 * The stretch of the day around the match, with the markdown stripped enough to read.
 * A day that matches at its start gives its opening, which is usually the point.
 */
function snippet(text: string, query: string): string {
	const plain = text
		.replace(/<!--[^>]*-->/g, "")
		.replace(/^#{1,6}\s*/gm, "")
		.replace(/^[-*]\s*/gm, "")
		.replace(/\s+/g, " ")
		.trim();

	const at = plain.toLowerCase().indexOf(query.toLowerCase());
	if (at === -1 || plain.length <= SNIPPET_CHARS) {
		return plain;
	}

	const start = Math.max(0, at - Math.floor(SNIPPET_CHARS / 3));
	const end = Math.min(plain.length, start + SNIPPET_CHARS);
	return `${start > 0 ? "…" : ""}${plain.slice(start, end).trim()}${end < plain.length ? "…" : ""}`;
}
