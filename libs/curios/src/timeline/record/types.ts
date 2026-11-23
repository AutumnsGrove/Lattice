/**
 * A day's run, as the record keeps it (#1798, slice 3).
 *
 * The store is an interface rather than a D1 call so `generateDay` can be tested
 * without a database, and so the schema stays in one file. The D1 implementation is
 * the only thing that knows a table name.
 */

import type { GutterComment } from "../voices/types";

export interface DayRunStart {
	runId: string;
	tenantId: string;
	/** The day being written, `YYYY-MM-DD`. */
	date: string;
	recipe: string;
	recipeVersion: number;
	/** The model the run asked, when the caller knows it. */
	model: string | null;
}

export interface DayRunFinish {
	runId: string;
	/** The run's owner. The update is scoped by it, so a wrong id cannot rewrite a row. */
	tenantId: string;
	/** How the run ended. `parked` still has a page: a limit is not a loss. */
	status: "done" | "parked" | "failed";
	turns: number;
	inputTokens: number;
	outputTokens: number;
	cost: number;
	/** The serialized page, in the shape the summary table already holds. */
	markdown: string;
	gutter: GutterComment[];
	continuationOf: string | null;
	error: string | null;
}

export interface DayRunStore {
	start(run: DayRunStart): Promise<void>;
	finish(run: DayRunFinish): Promise<void>;
}

/** One row of `timeline_runs`, as the readers hand it back. */
export interface DayRunRow {
	id: string;
	tenant_id: string;
	run_date: string;
	recipe: string;
	recipe_version: number;
	status: string;
	model: string | null;
	turns: number;
	input_tokens: number;
	output_tokens: number;
	cost: number;
	markdown: string | null;
	gutter_content: string | null;
	continuation_of: string | null;
	error: string | null;
	created_at: number;
	finished_at: number | null;
}
