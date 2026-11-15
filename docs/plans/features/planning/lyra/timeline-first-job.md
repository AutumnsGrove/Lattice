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

## Checked (2026-11-15): vines, links, and past days

Read from the code. Nothing was run.

### Vines can only attach to a heading, and the cause is the page, not the model

The timeline page does not use the engine's general gutter system. `libs/curios/src/timeline/Timeline.svelte` has its own renderer (`renderMarkdownWithGutter`, around lines 148 to 210):

- It groups every vine by the text of its anchor header, then finds the matching `<h3>` with a regular expression and inserts one row of vines (`header-gutter-group`) right after it.
- It has no other kind of anchor. A vine whose heading text does not match exactly is silently dropped, since neither pattern matches.
- The timeline's markdown parser (`timelineMd`, line 18) is created without HTML enabled, so an anchor marker comment written into the text would be escaped, not rendered.

Meanwhile the engine has a fuller system that the timeline does not use. `ContentWithGutter` supports three anchor kinds (heading, `paragraph:N`, and a named tag found by a `data-anchor` attribute) and places a vine right before the anchored element. But it only counts top-level paragraphs, not list items, so a bullet cannot be a paragraph anchor either.

So the answer to "can a bullet carry its own vine anchor?" is no, in both places. A real change is needed in `Timeline.svelte` regardless of Lyra. Two ways to do it, not yet chosen:

1. **Markers in the text.** Enable a limited form of HTML in the timeline's parser, or add a small plugin, so each bullet can carry a marker such as `<!-- anchor:l3 -->`, and have the page place the vine beside that element.
2. **Structure, not text.** Store each day as structured lines with ids, and render the page from that. Vines then point at a line id. This matches Lyra's tools (`add_line` returns an id, `add_vine` takes one) and removes the need to parse text at all. It is a bigger change to the page and to what `detailed_timeline` holds.

### Repo links are already built by the page

The page turns every `### RepoName` into a link to `github.com/<username>/<RepoName>` using whatever name the model typed (`Timeline.svelte`, around line 172). A wrong or invented name becomes a dead link. That confirms the design: `start_project` should only accept a repo from the day's list, so the name on the page is always real.

### Past days hold enough for continuation checks, with one caveat

`timeline_summaries` (`libs/engine/migrations/curios/001_initial_schema.sql`) stores for each day: the short summary, the full detailed markdown, the vines, the commit count, the list of active repos, the line counts, and the model's own earlier conclusions (`detected_focus`, `continuation_of`, `focus_streak`).

So `search_past_days` can search the real text and repo lists of earlier days. It should not treat the stored `detected_focus` or `focus_streak` as evidence, because those are the keyword guesses that are wrong today. It also should not rely on a list of commits, pull requests, or issues from earlier days: the table keeps prose and repo names, not those identifiers. If each day's run record is kept (see record retention in `decisions.md`), the record holds the exact data the model was given, and would make a much better source.

### There are two places that generate a day

The nightly worker (`workers/timeline-sync`) is one. The other is the Arbor routes under `apps/aspen/src/routes/api/curios/timeline/` (`generate` and `backfill`), which have their own `builder.ts` and `github-fetcher.ts` and call Lumen on their own. Both use the shared prompts and parsing in `@autumnsgrove/curios/timeline`, and both write to the same table. The GitHub fetcher in the app appears to duplicate the worker's `github.ts`, which I have not compared line by line.

For Lyra this means the timeline task should be one function that both entry points call, and the new pull request and issue fetching should be written once.

### Vines: the two approaches, compared

This page change is tracked in its own GitHub issue and is not part of Lyra (decision 54). Lyra's timeline task attaches vines to headings until it lands, and `add_vine` can take a line id as soon as the page supports one.

The stored markdown (`detailed_timeline`) is read by seven files: the public page's server load, the timeline API route, the Arbor generate builder, `Timeline.svelte`, the curios package index, the schema, and the worker's generator.

**A. Markers in the text.**
- The page learns to place a vine next to a marked line. A bullet carries a marker in the existing engine format, for example `<!-- anchor:l3 -->`, which the engine already turns into a `data-anchor` span (`processAnchorTags`), and the sanitizer already allows that attribute on a span.
- The timeline's parser (`timelineMd`) must be allowed to pass that one marker through. The page then places the vine before the marked element, as the engine's gutter does today.
- `add_line` writes the marker and the real links into the markdown itself. `add_vine` stores the vine with `anchor:l3` in the same `gutter_content` shape as now.
- Stored rows keep working unchanged, since heading anchors still work. No database change.

**B. Structured lines.**
- Each day is stored as projects, each with lines (an id, the text, and references to real commits, pull requests, and issues), and vines that point at a line id. The page renders from that.
- It matches the tools one to one, and links can be built from the references at display time.
- It touches all seven readers, needs a database change, and old days are markdown, so the page must render both forms for as long as old rows exist.

**Recommendation: A first.** It fixes the vine problem with the smallest change, it keeps every stored day working, and it reuses a format the engine already has. Tools write valid links into the markdown, which also fixes the invented-link problem. B stays possible later, since A does not block it.

### Still open

- Which of the two vine approaches to take.
- Whether the default model supports tools (`lumen-changes.md`, item 7).
- That GitHub access for pull requests and issues goes through Warden. Unchecked.
