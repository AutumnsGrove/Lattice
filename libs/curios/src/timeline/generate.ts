/**
 * One day, start to finish (#1798, slice 3).
 *
 * This is the function both entry points will call: fetch the day, run the recipe,
 * keep the record, write the page down. It exists so the duplicated halves — the
 * nightly worker's generator and the Arbor `generate`/`backfill` routes, each with
 * their own fetcher and builder (decision 61) — can be replaced by one call rather
 * than two that drift.
 *
 * Nothing calls it yet. Slice 4 runs it for the comparison, slice 5 switches the
 * entry points over, so production behaviour is unchanged until then.
 *
 * What it deliberately does not do:
 *
 * - **It does not pick a model.** The caller builds the slot (a Lumen adapter, a
 *   fake in a test), because that is the one part that knows a provider and a key.
 * - **It does not skip the model for a quiet day's cost.** A day with no activity at
 *   all returns `status: "empty"` and writes no run: a record of nothing is noise,
 *   and the caller already knows.
 * - **It does not hide a broken record.** A storage failure is a warning on the
 *   result, because losing the page over a failed row is worse than a gap a person
 *   can see.
 */

import {
	runTask,
	systemClock,
	systemIds,
	type LyraError,
	type ModelSlot,
	type RunEndReason,
	type RunEventListener,
	type StorageSlot,
	type Usage,
} from "@autumnsgrove/lyra";
import { fetchTimelineDay, type FetchLike, type TimelineDay } from "./day";
import {
	checkDayInput,
	createTimelineRecipe,
	TIMELINE_RECIPE_NAME,
	TIMELINE_RECIPE_VERSION,
} from "./recipe";
import { createGitHubReader, type GitHubReader } from "./recipe/github";
import { serializePage, type SerializedPage } from "./recipe/serialize";
import type { TimelineState } from "./recipe/state";
import type { PastDays } from "./recipe/tools";
import type { DayRunStore } from "./record/types";

export interface GenerateDayInput {
	tenantId: string;
	/** The day, `YYYY-MM-DD` in `timezone`. */
	date: string;
	timezone: string;
	githubUsername: string;
	/** The tenant's own GitHub token. It goes to the reader, never into the record. */
	githubToken: string;
	include?: readonly string[] | null;
	exclude?: readonly string[] | null;
	/** Short repo names known to have activity, from `timeline_activity`. */
	repos?: readonly string[] | null;
	ownerName?: string | null;
	/** The voice the instructions carry. Defaults to the professional voice. */
	persona?: string | null;
}

export interface GenerateDayDeps {
	store: DayRunStore;
	storage: (runId: string) => StorageSlot;
	model: ModelSlot;
	/** Earlier days. `d1DayRun` supplies the record-backed one. */
	pastDays?: PastDays;
	/** The GitHub calls. Injected so a test never reaches the network. */
	fetch?: FetchLike;
	/** Answers the two GitHub tools. Built from the token when not given. */
	reader?: GitHubReader;
	/** Overrides the step limit (40 by default, Lyra decision 92). */
	steps?: number;
	/** The model's name, for the record. */
	modelName?: string | null;
	/** A run id to reuse, which a resume or a test may want. */
	runId?: string;
	onEvent?: RunEventListener;
}

export interface GeneratedDay {
	/** `null` when the day was empty and no run was written. */
	runId: string | null;
	day: TimelineDay;
	status: RunEndReason | "empty";
	page: SerializedPage;
	turns: number;
	usage: Usage;
	/** Anything that went wrong around the run: a broken day, a failed write. */
	warnings: string[];
	error: LyraError | null;
}

const NO_CHARS: SerializedPage = { brief: null, markdown: "", gutter: [], continuation: null };
const NO_USAGE: Usage = { inputTokens: 0, outputTokens: 0 };

export async function generateDay(
	input: GenerateDayInput,
	deps: GenerateDayDeps,
): Promise<GeneratedDay> {
	const day = await fetchTimelineDay({
		username: input.githubUsername,
		token: input.githubToken,
		date: input.date,
		timezone: input.timezone,
		include: input.include,
		exclude: input.exclude,
		repos: input.repos,
		fetch: deps.fetch,
		userAgent: "Lattice-Timeline-Sync",
	});

	if (day.repos.length === 0) {
		return {
			runId: null,
			day,
			status: "empty",
			page: NO_CHARS,
			turns: 0,
			usage: NO_USAGE,
			warnings: [],
			error: null,
		};
	}

	const runId = deps.runId ?? systemIds().next("day_");
	const warnings: string[] = [];

	try {
		await deps.store.start({
			runId,
			tenantId: input.tenantId,
			date: input.date,
			recipe: TIMELINE_RECIPE_NAME,
			recipeVersion: TIMELINE_RECIPE_VERSION,
			model: deps.modelName ?? null,
		});
	} catch (error) {
		// The run still goes ahead: the page is worth more than the row.
		warnings.push(`could not open the run's record: ${reasonOf(error)}`);
	}

	const recipe = createTimelineRecipe({
		reader:
			deps.reader ??
			createGitHubReader({
				token: input.githubToken,
				username: input.githubUsername,
				fetch: deps.fetch,
			}),
		pastDays: deps.pastDays,
		persona: input.persona ?? undefined,
		ownerName: input.ownerName ?? undefined,
		steps: deps.steps,
	});

	try {
		const result = await runTask({
			runId,
			task: TIMELINE_RECIPE_NAME,
			host: "timeline",
			input: `write ${input.date}`,
			inputValue: day as never,
			setup: recipe.setup,
			inputCheck: checkDayInput,
			system: recipe.instructions,
			tools: recipe.tools,
			model: deps.model,
			storage: deps.storage(runId),
			clock: systemClock(),
			ids: systemIds(),
			limits: recipe.limits,
			tenant: input.tenantId,
			recipe: { name: TIMELINE_RECIPE_NAME, version: TIMELINE_RECIPE_VERSION },
			onEvent: deps.onEvent,
		});

		const state = result.state as TimelineState | undefined;
		const page = state === undefined ? NO_CHARS : serializePage(state.page);

		await finishRun(deps.store, {
			runId,
			tenantId: input.tenantId,
			status: result.reason,
			turns: result.turns,
			usage: result.usage,
			page,
			error: result.error?.message ?? null,
		}).catch((error: unknown) => {
			warnings.push(`could not write the run's page: ${reasonOf(error)}`);
		});

		return {
			runId,
			day,
			status: result.reason,
			page,
			turns: result.turns,
			usage: result.usage,
			warnings,
			error: result.error ?? null,
		};
	} catch (error) {
		// The loop is not expected to throw; if it does, the record must not be left
		// saying the run is still going.
		await finishRun(deps.store, {
			runId,
			tenantId: input.tenantId,
			status: "failed",
			turns: 0,
			usage: NO_USAGE,
			page: NO_CHARS,
			error: reasonOf(error),
		}).catch(() => undefined);
		throw error;
	}
}

interface FinishRun {
	runId: string;
	tenantId: string;
	status: "done" | "parked" | "failed";
	turns: number;
	usage: Usage;
	page: SerializedPage;
	error: string | null;
}

function finishRun(store: DayRunStore, run: FinishRun): Promise<void> {
	return store.finish({
		runId: run.runId,
		tenantId: run.tenantId,
		status: run.status,
		turns: run.turns,
		inputTokens: run.usage.inputTokens,
		outputTokens: run.usage.outputTokens,
		cost: run.usage.cost?.amount ?? 0,
		brief: run.page.brief,
		markdown: run.page.markdown,
		gutter: run.page.gutter,
		continuationOf: run.page.continuation?.day ?? null,
		error: run.error,
	});
}

function reasonOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
