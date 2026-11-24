/**
 * The timeline recipe (#1798, slice 2).
 *
 * `createTimelineRecipe` builds Lyra's recipe for one tenant: the day as input, the
 * eight tools, the coverage check on `finish`, and the tenant's voice. The tools
 * read GitHub through `createGitHubReader`, which is where the token lives, and the
 * page serializes to the markdown-plus-gutter shape the timeline page already
 * renders.
 *
 * Slices 3 and 4 build on this: the shared `generateDay` creates a recipe, runs it,
 * and stores the serialized page beside the existing summaries.
 */

export {
	checkDayInput,
	COMPACTION_WINDOW,
	createTimelineRecipe,
	DEFAULT_PAGE_WORDS,
	DEFAULT_STEP_LIMIT,
	TIMELINE_RECIPE_NAME,
	TIMELINE_RECIPE_VERSION,
} from "./recipe";
export type { TimelineRecipeOptions } from "./recipe";

export { createGitHubReader } from "./github";
export type { FetchLike, GitHubReader, GitHubReaderOptions, ReaderResult } from "./github";

export { buildTimelineInstructions, DEFAULT_PERSONA } from "./instructions";
export type { TimelineInstructionsOptions } from "./instructions";

export { describeState, lineAnchor, serializePage } from "./serialize";
export type { SerializedPage } from "./serialize";

export { createTimelineTools } from "./tools";
export type { PastDay, PastDays, TimelineToolOptions } from "./tools";

export { emptyPage } from "./state";
export type {
	TimelineLine,
	TimelinePage,
	TimelineProject,
	TimelineState,
	TimelineVine,
} from "./state";
