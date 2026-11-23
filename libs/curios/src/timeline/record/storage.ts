/**
 * Lyra's record over D1 (#1798, slice 3).
 *
 * Lyra's storage slot deals in lines: append one, read every line back, in order
 * (decision 12). This is that slot over two columns of `timeline_run_entries`, with
 * the row's position as the `seq` the slot returns.
 *
 * One writer per run is the assumption, and it is a fair one: a run's loop awaits
 * each append before the next, and two runs never share an id. The primary key
 * `(run_id, seq)` is what makes that assumption safe rather than hopeful — a second
 * writer at the same position is refused by the database instead of interleaving.
 *
 * A failure is returned as a result, never thrown: the record is written as the run
 * goes, and a storage failure has to be a fact the run can see rather than an
 * exception that takes it down.
 */

import { fail, ok, type Result, type StorageSlot } from "@autumnsgrove/lyra";

export function d1RunStorage(db: D1Database, runId: string): StorageSlot {
	return {
		async append(line: string): Promise<Result<{ seq: number }>> {
			try {
				const next = await db
					.prepare(
						`SELECT COALESCE(MAX(seq) + 1, 0) AS next
						 FROM timeline_run_entries
						 WHERE run_id = ?`,
					)
					.bind(runId)
					.first<{ next: number }>();

				const seq = next?.next ?? 0;
				await db
					.prepare(
						`INSERT INTO timeline_run_entries (run_id, seq, line)
						 VALUES (?, ?, ?)`,
					)
					.bind(runId, seq, line)
					.run();

				return ok({ seq });
			} catch (error) {
				return fail("internal", `could not save the run's record: ${reasonOf(error)}`);
			}
		},

		async read(): Promise<Result<string[]>> {
			try {
				const rows = await db
					.prepare(
						`SELECT line
						 FROM timeline_run_entries
						 WHERE run_id = ?
						 ORDER BY seq ASC`,
					)
					.bind(runId)
					.all<{ line: string }>();
				return ok((rows.results ?? []).map((row) => row.line));
			} catch (error) {
				return fail("internal", `could not read the run's record: ${reasonOf(error)}`);
			}
		},
	};
}

function reasonOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
