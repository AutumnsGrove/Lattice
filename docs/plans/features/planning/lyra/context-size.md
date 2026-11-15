---
title: "Lyra context size and compaction"
status: planning
category: features
---

# Context size and compaction

Last updated: 2026-11-15. Everything here is decided.

## The problem

A model can only read so much at once. A long run, or a run with bulky tool results, can outgrow that. When it does, something has to give: older material is dropped or shortened so the run can go on. That is compaction.

## What Nova and Pi do, and why Lyra differs

Nova (and Pi, similarly) are coding agents with open-ended chats. Nova's compactor:

- Triggers when the estimated token count passes the model's limit minus a reserve (the reserve is 16,384 tokens or 10% of the limit).
- Uses the token count the provider reported for the last request, plus a rough estimate for anything newer.
- Keeps the most recent 20,000 tokens verbatim.
- Asks the model to summarize everything older under fixed headings: Goal, Constraints and preferences, Progress, Key decisions, Next steps, Critical context. It keeps exact identifiers and file paths, and updates an earlier summary in place.
- Never cuts between a tool call and its result.
- Never changes earlier history except at a compaction, because a stable prefix keeps the provider's prompt cache working.

Almost all of that is shaped for a coding chat. The goal drifts as a person steers, and the state of the work is files on disk, so a summary mainly says which files were touched.

Lyra's runs are different in four ways:

1. **The goal is fixed and known.** A run has task instructions and a done-check. There is nothing to summarize about "the goal".
2. **Tools own the state.** The timeline's half-built page and its handle map live in the tools and the record, not on disk. After a compaction the model can be shown the current state exactly, straight from the tools, instead of a paraphrase.
3. **Runs are short.** Most will never compact. It is a safety net, so it should stay small.
4. **The task knows what matters.** A task can say what must survive. A coding agent cannot.

## Decided (2026-11-15)

**39. The record keeps everything, and the model sees a built view.** Compaction never deletes from the record (decisions 28 to 33 stay intact, and replay still works). It adds a `compaction` entry holding the summary and a pointer to the first entry kept. The model's view is built from the record: the pinned instructions, the summary, then the entries from the pointer on. The cut never falls between a tool call and its result, and the most recent steps stay verbatim.

**40. What survives is decided by the task.**
- The task's instructions are pinned and never summarized.
- Tools can supply a "current state" text, shown to the model after a compaction. For the timeline that is the page so far. It is exact, and it replaces prose wherever a tool can provide it.
- The task supplies the summarizer's instructions for the rest, with a generic default (progress, decisions, open items, exact identifiers). A new summary updates the old one.
- Bulky tool results are capped when they arrive, with a note on how to get more (for example, "truncated; call `get_diff` for the rest"). This never disturbs earlier history, so the prompt cache is kept.
- The summary is written through the Model slot. It is the same model as the run by default and can be set per task. Its usage is recorded in the compaction entry.

**41. When it triggers.** When the last request's input tokens, which Lumen already reports, pass the model's context window minus a reserve. The reserve and the amount of recent history kept are configurable per task, with defaults chosen when building. The model's context window is new data: a `contextWindow` field per model in `lumen-models.json` (see `lumen-changes.md`, item 7). If the very first message already exceeds the window, compaction cannot help, and the run fails clearly with "input too large" (the known limit in decision 6).

## How likely is this to fire?

Rarely. Most tasks are small and narrow, and most current models have context windows around a million tokens. A normal timeline day fits easily.

Two honest caveats. Nova's OpenCode Go catalog assumes a conservative 200,000-token window for its models until it can read the real one, so a runner using OpenCode Go with a lot of shell output could still reach it. And with a big window, the practical limit is usually money, not memory: every step re-sends the whole conversation. The optional cost and step limits (decision 18) matter more than the compactor.

## Also decided

**42. Compaction is part of the first version.** It will rarely fire, but Autumn wants it from the start. The first version includes the summarizer, so a long run never has to stop at the limit. I had proposed leaving it out and building it when a task first needed it. The answer was to include it.

## Not discussed yet

- **The summarizer's default instructions.** Written when it is built.
