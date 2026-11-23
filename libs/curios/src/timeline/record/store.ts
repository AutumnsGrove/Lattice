/**
 * Writing a day's run down (#1798, slice 3).
 *
 * Two writes per run: the row that says a run started, and the row that says how it
 * ended and what page it produced. The entries are appended as the run goes, by the
 * storage slot beside this file, so a run that dies mid-way still has its history.
 *
 * A write that fails throws. The alternative — swallowing it — would leave a day
 * with no record and no way to tell, and the caller is the only place that can put
 * that warning somewhere a person will see it.
 */

import type { DayRunFinish, DayRunRow, DayRunStart, DayRunStore } from "./types";

export function d1RunStore(db: D1Database): DayRunStore {
	return {
		async start(run: DayRunStart): Promise<void> {
			await db
				.prepare(
					`INSERT INTO timeline_runs
					   (id, tenant_id, run_date, recipe, recipe_version, status, model)
					 VALUES (?, ?, ?, ?, ?, 'running', ?)`,
				)
				.bind(run.runId, run.tenantId, run.date, run.recipe, run.recipeVersion, run.model)
				.run();
		},

		async finish(run: DayRunFinish): Promise<void> {
			await db
				.prepare(
					`UPDATE timeline_runs
					   SET status = ?, turns = ?, input_tokens = ?, output_tokens = ?,
					       cost = ?, markdown = ?, gutter_content = ?, continuation_of = ?,
					       error = ?, finished_at = strftime('%s', 'now')
					 WHERE id = ? AND tenant_id = ?`,
				)
				.bind(
					run.status,
					run.turns,
					run.inputTokens,
					run.outputTokens,
					run.cost,
					run.markdown,
					JSON.stringify(run.gutter),
					run.continuationOf,
					run.error,
					run.runId,
					run.tenantId,
				)
				.run();
		},
	};
}

/** One run, by id. `null` when the row is not there or belongs to another tenant. */
export async function readRun(
	db: D1Database,
	tenantId: string,
	runId: string,
): Promise<DayRunRow | null> {
	return db
		.prepare(`SELECT * FROM timeline_runs WHERE id = ? AND tenant_id = ?`)
		.bind(runId, tenantId)
		.first<DayRunRow>();
}

/** Every run for a day, newest first. The comparison in slice 4 reads both paths. */
export async function listRunsForDay(
	db: D1Database,
	tenantId: string,
	date: string,
): Promise<DayRunRow[]> {
	const rows = await db
		.prepare(
			`SELECT * FROM timeline_runs
			 WHERE tenant_id = ? AND run_date = ?
			 ORDER BY created_at DESC`,
		)
		.bind(tenantId, date)
		.all<DayRunRow>();
	return rows.results ?? [];
}
