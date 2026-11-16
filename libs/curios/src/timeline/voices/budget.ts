/**
 * Output Budget
 *
 * The spend cap for the detailed breakdown, shared by every preset so the
 * ceiling lives in one place.
 *
 * The model writes until it runs out of tokens, and the whole brief+detailed+
 * gutter response has to fit inside the request's output ceiling
 * (SUMMARY_MAX_OUTPUT_TOKENS) as valid JSON. A 53-commit day across 5 repos blew
 * straight through it on
 * 2026-11-13 — the JSON was cut off mid-object and the run silently stored a
 * "got a bit tangled" fallback. Naming the budget explicitly keeps heavy days
 * inside the envelope instead of relying on the model to self-limit.
 *
 * Consumed through `@autumnsgrove/curios/timeline/voices`, including by
 * workers/timeline-sync, which inlines the presets but not this constant.
 */

import type { Commit } from "./types";

export const DETAILED_BUDGET = `   - Cover at most 6 projects. If the day touched more, fold the extras into a
     final "### Also" section with one bullet each.
   - At most 5 bullets per project, one line each.
   - The whole detailed breakdown must stay under ~350 words.`;

/**
 * Output ceiling, in tokens, for the whole summary request.
 *
 * Both callers (the cron worker and aspen's manual generate) send this and both
 * enforce it the same way: an output that lands *on* the ceiling is treated as
 * truncated mid-JSON and fails the run instead of storing a partial summary.
 * That guard is what makes the ceiling safe to be generous with.
 *
 * 8192 until 2026-11-16, raised to 64k for headroom on days that provoke long
 * answers. The realistic envelope is far smaller — DETAILED_BUDGET caps the
 * detailed section at ~350 words — so this is headroom, not a target, and the
 * per-request cost ceiling it implies is the reason not to go higher than the
 * model's own maximum completion length. Lumen does not check the latter before
 * calling, so a provider that rejects 64k will surface as a provider error and
 * take the retry chain with it.
 */
export const SUMMARY_MAX_OUTPUT_TOKENS = 64_000;

/**
 * Input Budget
 *
 * The input side has its own ceiling, and it is a hard wall rather than a
 * suggestion: Lumen rejects any request whose serialized input runs past
 * MAX_INPUT_LENGTH (in libs/engine/src/lib/ai/lumen/pipeline/preprocessor.ts)
 * before a model is ever chosen. maxTokens does not apply to it — raising the
 * output ceiling changes nothing here.
 *
 * Commit *bodies* are what blow through it. On 2026-11-15, 183 commits over 11
 * repos carried ~116k characters of message text and only ~10.7k of subject
 * lines: squash-merge and merge-commit descriptions were 90% of the prompt,
 * and the nightly run died with "Input exceeds maximum length of 100000
 * characters" without writing a row. The subject line is what the summary is
 * actually written from, so the budget goes to those first and the bodies only
 * if they fit.
 *
 * 120k is about 30k tokens: enough that a 500-commit day still lists every
 * commit by name, and still well clear of Lumen's 300k wall, which leaves room
 * for the system prompt, the historical context and JSON escaping (and is not
 * a number this budget should ever be tuned toward).
 */
export const COMMIT_LIST_BUDGET_CHARS = 120_000;

/** Longest subject line to keep — past this it is a paragraph, not a subject. */
const MAX_SUBJECT_CHARS = 120;

export interface CondensedCommitList<C extends Commit = Commit> {
  /** Commits to hand to a preset's buildPrompt. */
  commits: C[];
  /**
   * Set only when the commit list itself had to be cut. Every preset's prompt
   * carries a "GENERATE THREE OUTPUTS" section, so the caller appends this
   * there instead of silently losing commits the model should know about.
   */
  note: string | null;
}

/** Subject line of a commit message, collapsed to a single bounded line. */
function subjectOf(message: string): string {
  const firstLine = message.split("\n").find((line) => line.trim().length > 0) ?? "";
  const collapsed = firstLine.replace(/\s+/g, " ").trim();
  return collapsed.length > MAX_SUBJECT_CHARS
    ? `${collapsed.slice(0, MAX_SUBJECT_CHARS - 1)}…`
    : collapsed;
}

/** The line a preset will render for a commit — budget math mirrors the output. */
function renderLength(commits: Commit[], messages?: string[]): number {
  let total = 0;
  for (let i = 0; i < commits.length; i++) {
    const message = messages ? messages[i] : commits[i].message;
    // `${i + 1}. [repo] message (+x/-y)` plus its newline
    total +=
      `${i + 1}. [${commits[i].repo}] ${message} (+${commits[i].additions}/-${commits[i].deletions})`
        .length + 1;
  }
  return total;
}

/**
 * Fit a day's commits into the prompt's character budget.
 *
 * Degrades in two steps, cheapest first:
 *   1. full messages, when the day is small enough that they fit;
 *   2. subject lines only — same commit count, roughly a tenth of the characters;
 *   3. subject lines for as many commits as fit, plus a note naming the rest.
 *
 * The commit count never shrinks silently: step 3 always returns a note.
 */
export function condenseCommitsForPrompt<C extends Commit>(
  commits: C[],
  budget: number = COMMIT_LIST_BUDGET_CHARS,
): CondensedCommitList<C> {
  if (commits.length === 0) return { commits, note: null };

  if (renderLength(commits) <= budget) {
    return { commits, note: null };
  }

  const subjects = commits.map((commit) => subjectOf(commit.message));

  if (renderLength(commits, subjects) <= budget) {
    return {
      commits: commits.map((commit, i) => ({ ...commit, message: subjects[i] })),
      note: null,
    };
  }

  // Still too long: keep whole commits while they fit, then say what is left.
  const kept: C[] = [];
  let used = 0;
  let index = 0;
  for (; index < commits.length; index++) {
    const line = `${index + 1}. [${commits[index].repo}] ${subjects[index]} (+${commits[index].additions}/-${commits[index].deletions})`;
    // Always keep the first commit: a list with nothing in it is worse than a
    // list one line over budget, and a single line cannot overshoot far.
    if (kept.length > 0 && used + line.length + 1 > budget) break;
    used += line.length + 1;
    kept.push({ ...commits[index], message: subjects[index] });
  }

  const remaining = commits.slice(index);
  const byRepo: Record<string, number> = {};
  for (const commit of remaining) {
    byRepo[commit.repo] = (byRepo[commit.repo] || 0) + 1;
  }
  const repoCounts = Object.entries(byRepo)
    .sort((a, b) => b[1] - a[1])
    .map(([repo, count]) => `${repo}: ${count}`)
    .join(", ");

  return {
    commits: kept,
    note: `The list above is shortened to fit. This was a ${commits.length}-commit day; the ${remaining.length} commits not listed are across: ${repoCounts}.`,
  };
}
