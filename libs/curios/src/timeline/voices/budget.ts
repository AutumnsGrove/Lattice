/**
 * Output Budget
 *
 * The spend cap for the detailed breakdown, shared by every preset so the
 * ceiling lives in one place.
 *
 * The model writes until it runs out of tokens, and the whole brief+detailed+
 * gutter response has to fit inside the request's maxTokens (8192) as valid
 * JSON. A 53-commit day across 5 repos blew straight through that on
 * 2026-11-13 — the JSON was cut off mid-object and the run silently stored a
 * "got a bit tangled" fallback. Naming the budget explicitly keeps heavy days
 * inside the envelope instead of relying on the model to self-limit.
 *
 * Workers that inline these presets keep their own copy of this string
 * (workers/timeline-sync/src/voices.ts); keep the two in step.
 */
export const DETAILED_BUDGET = `   - Cover at most 6 projects. If the day touched more, fold the extras into a
     final "### Also" section with one bullet each.
   - At most 5 bullets per project, one line each.
   - The whole detailed breakdown must stay under ~350 words.`;
