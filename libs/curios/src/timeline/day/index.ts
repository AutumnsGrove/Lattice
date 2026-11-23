/**
 * The day (#1798, slice 1).
 *
 * `fetchTimelineDay` reads one calendar date of GitHub activity into plain JSON;
 * `mintDayHandles` names every commit, pull request and issue with a short
 * handle; `renderDay` writes the day as the text a recipe's model opens with.
 * Nothing here calls a model, and nothing here writes.
 *
 * Slices 2 and 3 build on this: the recipe's `setup` re-mints the handles and
 * renders the same text, and the shared `generateDay` fetches, runs the recipe
 * and stores the result with this day in its record.
 */

export { fetchTimelineDay, localDateOf, GitHubRequestError } from "./fetch";
export type { DayFetchOptions, FetchLike } from "./fetch";

export { mintDayHandles } from "./handles";
export type { DayHandleTarget, DayHandles, HandleMinter } from "./handles";

export { renderDay } from "./render";

export type { DayActivity, DayCommit, DayIssue, DayPull, DayWarning, TimelineDay } from "./types";
