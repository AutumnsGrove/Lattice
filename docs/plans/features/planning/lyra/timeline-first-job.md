---
title: "Lyra first job: the development timeline"
status: planning
category: features
---

# The first job: the development timeline

The timeline turns a day of GitHub activity into something readable at a glance. It runs in `workers/timeline-sync`. It is the first thing Lyra will do, because it works today but is shallower than it should be, and every shortfall traces to the same cause.

Last updated: 2026-11-13. Written from reading the code, not from running it.

## What it produces

For each day, a page (see `autumn.grove.place/timeline`) with a short headline, the repos worked on with line counts, and a "What I worked on" section. Each repo gets a heading, a list of bullets in a first-person voice, and a row of vines, the small boxed asides ("finally, the worker is dead"). The writing has several voices (`src/voices.ts`).

The line counts, repo chips, and dates come from code. The words come from the model.

## What is wrong today

| What Autumn sees | What the code does |
|---|---|
| Pull requests only show up when a squash commit happens to carry them. | `src/github.ts` only calls the commits endpoint (and commit stats). It never asks for pull requests. |
| Issues are never tracked. A day of nothing but `gh issue` work looks empty. | There is no issue call at all. |
| "Day two of bug fixing" is often wrong. | `src/context.ts` tags each day with a task type by looking for keywords (`detectTask`, line 88). If two days in a row get the same tag, it calls it a streak (`detectContinuation`, line 268; `focusStreak`, line 378). The model sees at most the last three days (`getHistoricalContext`, line 209). Nothing checks that the work is really a continuation. |
| Vines sit in a row under the heading, not beside the line they comment on. | The page attaches vines by exact heading text. The prompt tells the model the anchors "must EXACTLY match `### ProjectName`" (`src/voices.ts`, lines 107 and 321). Any wobble breaks the match. |
| The model sometimes skips the repo name or puts in a random link. | The prompt pleads with the model: "NEVER create markdown links" and "Do NOT invent URLs" (`src/voices.ts`, lines 69, 109, 276), repeated in every voice. The model is writing things that must be exact, as prose. |

## The one idea behind the fix

The model decides what to say. Tools produce anything that has to be exact: repo names, links, ids, and where a vine lands. A tool can reject a bad request ("no such repo, here are the real ones") and the model corrects itself inside the loop. A prompt cannot do that.

## What gets handed over up front

Everything for the day, in full: the repos, commits, pull requests, issue activity (opened, closed, commented), and line counts. The point of the timeline is to filter noise into signal, so the model sees all of it. A very large day is a known limit, accepted because the timeline has one user. A step limit and a clear "too big" failure are enough.

Pull request and issue data needs new GitHub calls in the day's fetch. GitHub access is expected to go through Warden. That is unchecked.

## Lyra's tools for this task (first draft)

| Kind | Tool | What it does | What it checks |
|---|---|---|---|
| Dig deeper | `get_diff` | Shows what changed in a commit or PR | The commit or PR exists |
| Dig deeper | `get_issue_thread` | Reads an issue's discussion | The issue exists |
| Dig deeper | `search_past_days` | Finds earlier days' entries, with dates. Shared with other tasks. | The range is valid |
| Build the page | `start_project` | Creates a project section; the heading and link are made by the tool | The repo is on the day's list |
| Build the page | `add_line` | Adds a bullet and returns its id | Every commit, PR, or issue it cites is real and belongs to that repo |
| Build the page | `add_vine` | Attaches an aside to one specific line | The line id exists |
| Build the page | `mark_continuation` | Says "this continues what was done on day X" | The earlier day exists and is cited |
| Finish | `finish` | Ends the job. Shared across tasks. | Everything that happened is covered by a line, or skipped with a stated reason |

`finish` is the coverage check. A day of only issue work stops looking empty, because `finish` replies "these four issues are not covered yet" and the model goes back and writes them up.

Shared with other tasks: `finish`, `search_past_days`, and (later) asking a human. The rest belong to the timeline.

## Design note: handles, not raw ids (proposed)

Lumen's privacy scrubber runs over tool results (decision 8). It can rewrite text that looks like an email, phone number, or IP address, and long hashes and numbers are exactly what it might touch. So tools should give the model short handles, such as `c1` for a commit, `pr12` for a pull request, and `i34` for an issue. Lyra keeps the map back to the real hash, number, and link. The model cites handles and never copies a long exact string, which also stops it mistyping one. This matches the rule that tools own anything exact.

## Things to check before building

- **Can a bullet carry its own anchor?** The page supports three anchor kinds (`libs/engine/src/lib/utils/gutter.ts`, `parseAnchor`): a header (`## Text`), a numbered paragraph (`paragraph:N`), and a named tag (`anchor:name`). The timeline only uses headers. Whether a single bullet inside a list can carry a tag on the rendered page is not checked. If it cannot, vines need a small page change.
- **Where past days live.** `timeline_summaries` in the Curio database already stores each day's context brief, detected focus, summary, and commit count. `search_past_days` can read it. Whether that is enough detail to judge a real continuation is not checked.
- **The vine layout.** The vines in the screenshot render as a row under the heading. Moving them beside their line is a display change on the page, separate from Lyra.
- **The model.** The timeline picks its model from tenant config with a default (`src/generator.ts`, line 228). The default has to support tool calls. See `lumen-changes.md`, item 7.
