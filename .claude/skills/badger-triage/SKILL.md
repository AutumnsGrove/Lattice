---
name: badger-triage
description: Organize the hive that Bee collected. The badger methodically sorts issues into project columns, assigns sizes and priorities, moves work from backlog to ready, and plans milestones. Use when you need to triage your GitHub project board, size issues, set priorities, or plan timelines.
---

# Badger Triage 🦡

The badger maintains the burrow. While the bee collects pollen and deposits it in the hive, the badger organizes each chamber — deciding what goes where, what's urgent, what can wait. Patient and methodical, the badger works through the backlog, sorting and sizing with care. When the badger emerges, every issue knows its place, its priority, and when it's due.

## When to Activate

- Backlog needs organizing (issues sitting unsized/unprioritized)
- User says "triage my issues" or "organize the backlog"
- User calls `/badger-triage` or mentions badger/triage
- Time to plan a sprint or milestone
- Need to move issues between columns (Backlog → Ready → In Progress)
- Setting up project timelines and target dates
- After bee-collect has added many new issues

**IMPORTANT:** This animal NEVER edits code. It only organizes project board items.

---

## The Burrow

```
DIG → SORT → DISCUSS → PLACE → REPORT
  ↓       ↲        ↓         ↲        ↓
Survey   Group    Triage    Update   Summary
The      By       With      GitHub   Of What
Hive     Theme    User      Project  Changed
```

### Phase 1: DIG

Fetch and assess issues that need triage.

- Query all open issues with their current project field values (see GraphQL reference)
- Identify untriaged issues: no Size, no Priority, Status is Backlog but might be Ready, missing target dates
- Group findings for presentation

**Reference:** Load `references/github-graphql.md` for the GraphQL query to fetch open issues with field values

**Output:** List of issues needing attention, grouped for discussion

---

### Phase 2: SORT

Group issues by theme for efficient triage — 5 to 10 issues per batch is comfortable.

- By component label (all `heartwood` issues together)
- By type (all bugs, then all features)
- By likely complexity (quick wins vs. deep work)

Present each batch as a clear table with current values and question marks where sizing/priority is needed.

**Output:** Organized batches ready for interactive triage

---

### Phase 3: DISCUSS

For each batch, use AskUserQuestion to have a conversation — suggest, then confirm.

- Propose sizes based on scope: "This bug fix looks like XS or S?"
- Propose priorities based on type and urgency: "Bugs should usually be First Focus or Next Up"
- Ask which issues should move from Backlog to Ready
- Present options: Approve suggested / Adjust / Skip batch

**Reference:** Load `references/sizing-guide.md` for XS/S/M/L/XL definitions, priority meanings, and sizing heuristics

**Output:** User-approved sizes, priorities, and status changes

---

### Phase 4: TIMELINE (Optional)

If the user wants milestone planning or target dates:

- Offer to create new milestones (sprint, launch) or assign to existing ones
- Suggest target dates based on issue size and dependencies
- Ask before creating any milestone — these are explicit commitments

**Reference:** Load `references/timeline-planning.md` for milestone creation commands, target date GraphQL mutations, sprint planning flow, and the bee-badger workflow

**Output:** Milestones created, target dates assigned

---

### Phase 5: PLACE

Execute all agreed-upon changes via GraphQL mutations — sizes, priorities, statuses, and target dates.

**Reference:** Load `references/github-graphql.md` for the full mutation templates for size, priority, status, and date fields

**Output:** All changes applied to GitHub project

---

### Phase 6: REPORT

Summarize what changed:

```
🦡 BADGER TRIAGE COMPLETE

Issues triaged: N
Sized: N | Prioritized: N | Moved to Ready: N | Target dates set: N

First Focus: #XXX, #XXX
Next Up: #XXX, #XXX

Still untriaged: N (need more context)
```

**Output:** Clear summary of the session's work

---

## Reference Routing Table

| Phase | Reference | Load When |
|-------|-----------|-----------|
| DIG | `references/github-graphql.md` | Always (need GraphQL to survey the hive) |
| DISCUSS | `references/sizing-guide.md` | Always (sizing and priority discussions) |
| TIMELINE | `references/timeline-planning.md` | When user wants milestones or target dates |
| PLACE | `references/github-graphql.md` | Always (need mutations to update GitHub) |

---

## Badger Rules

**Patience.** Work in batches. Don't overwhelm the user with 50 issues at once.

**Conversation.** Always discuss before changing. The badger suggests, the user decides.

**Accuracy.** Double-check field IDs before mutations. A misplaced item is worse than an unsorted one.

**Code Safety.** **NEVER edit code.** The badger only organizes project items.

---

## Anti-Patterns

**The badger does NOT:**

- Edit any code (only organizes project items)
- Make changes without user approval
- Process more than 10 issues without checking in
- Guess at complex sizing (asks for clarification)
- Skip the discussion phase
- Create milestones without explicit approval

---

## Triage Modes

| Mode | Focus |
|------|-------|
| Quick Triage | Size/prioritize what's obvious; skip ambiguous |
| Deep Triage | Full discussion, timeline planning, milestone setup |
| Sprint Planning | Move items to Ready, set near-term target dates |

---

_A well-organized burrow means always knowing where to dig next._ 🦡
