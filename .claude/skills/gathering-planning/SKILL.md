---
name: gathering-planning
description: The drum sounds. Bee and Badger gather for complete project planning. Use when you have ideas to capture AND want them organized on the project board in one flow.
---

# Gathering Planning 🌲🐝🦡

_The conductor dispatches one subagent per animal, each with isolated context and an intentional model. It manages handoffs and gate checks — it never does the work itself._

## When to Summon

- Brain dump session that needs to become organized work
- "I have a bunch of ideas AND I want them prioritized"
- Sprint planning from scratch
- After a brainstorm that produced many TODOs
- When you want ideas → issues → organized backlog in one flow

---

## Grove Tools for This Gathering

Use `gw` for git and infra; semantic search for discovery, `rg`/`find`/`glob` for exact matches. Quick reference for planning work:

```bash
# Find existing work items in the codebase
rg -n \"TODO|FIXME\"                     # Find TODO/FIXME/HACK comments

# Batch issue creation (Bee phase)
gw gh issue batch --write --from-json  # Create issues in bulk

# Check project boards (Badger phase)
gw gh project list                  # View project boards and status
```

---

## The Gathering

```
SUMMON → COLLECT → ORGANIZE → COMPLETE
   ↓         ↓          ↓          ↓
Receive   Bee         Badger     Roadmap
Ideas     Creates     Triages    Ready
          Issues      Board
```

### Animals Mobilized

1. **🐝 Bee** — Collect scattered ideas, create structured GitHub issues
2. **🦡 Badger** — Size, prioritize, move to Ready, set milestones/dates

---

### Phase 1: SUMMON

Receive and parse the brain dump:

**Clarify the Session:**

- What ideas/TODOs do you want to capture?
- Any theme or component focus?
- Do you want to set up milestones today?

**Confirm:**

> "I'll mobilize a gathering for project planning:
>
> - 🐝 Bee will create issues from your ideas
> - 🦡 Badger will organize them on the project board
>
> Proceed with the gathering?"

---

### Phase 2: COLLECT (Bee)

**🐝 BEE — COLLECT**

Load skill: `bee-collect`

Execute the full Bee BUZZ → INSPECT → CHECK → DEPOSIT workflow on [the brain dump / ideas provided].
Handoff: list of newly created issue numbers and titles (plus any duplicates skipped) → Badger for organization

---

### Phase 3: ORGANIZE (Badger)

**🦡 BADGER — TRIAGE**

Load skill: `badger-triage`

Execute the full Badger DIG → SORT → DISCUSS → TIMELINE → PLACE workflow on all issues the Bee created (plus any pre-existing untriaged issues).
Handoff: organized board (all issues sized, prioritized, ready items moved, milestones set) → COMPLETE phase

---

### Phase 4: COMPLETE

**Completion Report:**

```markdown
## 🌲 GATHERING PLANNING COMPLETE

### Session Summary

**🐝 Bee Collected:**

- [x] issues created from brain dump
- [Y] duplicates skipped
- Components: [list of labels used]

**🦡 Badger Organized:**

| Metric           | Count |
| ---------------- | ----- |
| Sized            | [X]   |
| Prioritized      | [X]   |
| Moved to Ready   | [X]   |
| Target dates set | [X]   |

### By Priority

| Priority    | Issues           |
| ----------- | ---------------- |
| First Focus | #123, #124, #125 |
| Next Up     | #126, #127       |
| In Time     | [count] issues   |
| Far Off     | [count] issues   |

### Milestones

| Milestone | Issues  | Due    |
| --------- | ------- | ------ |
| [Name]    | [count] | [date] |

### What's Ready to Work On

These issues are sized, prioritized, and in the Ready column:

1. #123 — [Title] (XS, First Focus)
2. #124 — [Title] (S, First Focus)
3. #125 — [Title] (M, First Focus)

_From chaos, order. From ideas, a roadmap._ 🌲
```

---

## Gathering Rules

**Flow.** Bee always runs first. Badger organizes what Bee collected (plus any existing untriaged issues).

**Conversation.** Both animals are interactive. The bee asks for clarification on vague items. The badger discusses sizing and priority in batches.

**Scope.** If the brain dump is massive (20+ items), the bee may ask to split into multiple sessions.

**Code Safety.** Neither animal edits code. This gathering is purely for project organization.

---

## When to Use This vs. Individual Animals

| Situation                             | Use                      |
| ------------------------------------- | ------------------------ |
| Just have ideas to capture            | 🐝 `/bee-collect`        |
| Just need to organize existing issues | 🦡 `/badger-triage`      |
| Have ideas AND want them organized    | 🌲 `/gathering-planning` |
| Weekly planning session               | 🌲 `/gathering-planning` |
| Quick backlog grooming                | 🦡 `/badger-triage`      |

---

_From scattered thoughts to organized work. The forest knows the way._ 🌲
