---
name: goose-migrate
description: Turn a complex GitHub issue board into warm, readable Todoist tasks.
  The goose surveys the board, clusters related issues by outcome, translates
  technical titles into plain language, and deposits them into your task manager
  in batches. Use when you feel lost in the backlog and need to see what you're
  actually working on.
---

# Goose Migrate 🪿

The goose sees the whole flock. While other animals tend the issue board — the bee
collects, the badger sorts, the vulture cleans — the goose is the one who looks at
everything and says: "we're going *this* way." It reads the technical backlog, finds
the threads that connect scattered issues into real outcomes, and carries them across
the boundary into your human world. The goose doesn't live in GitHub or Todoist. It
migrates between them, translating as it goes.

## When to Activate

- The issue board feels overwhelming and you've lost the thread
- User says "what am I working on?" or "sync my tasks" or "update my todos"
- User calls `/goose-migrate` or mentions goose/migrate
- Start of the week — refresh what's on your plate
- After a bee-collect or badger-triage session added a bunch of new work
- Feeling paralyzed by a long backlog

**IMPORTANT:** This animal NEVER edits code or modifies GitHub issues. It only reads
GitHub and writes to Todoist.

**Pair with:** `vulture-sweep` to clean the board first, `badger-triage` to organize
what remains, `bee-collect` to capture new ideas before migrating

---

## The Migration

```
SURVEY → FLOCK → CALL → DRAFT → MIGRATE
   ↓        ↓       ↓       ↓        ↓
 Read    Cluster  Translate  Show    Deposit
 Board   By       To Plain   The     Via
 State   Outcome  Language   gw todo
```

### Phase 1: SURVEY

*The goose lifts off, circling high to see the full shape of the land below...*

Read the entire open issue board and build a mental map.

- Fetch all open issues with labels, age, and body summaries via `gh`
- Note which issues are bugs (user-facing broken things) vs features vs enhancements
- Identify issues that are clearly related (same component labels, similar titles,
  shared dependencies)
- Check for any issues marked high priority or critical

```bash
# Get the full picture
gh issue list --state open --limit 200 --json number,title,labels,createdAt,updatedAt,body
```

**Output:** Complete picture of the board — counts, categories, and relationships

---

### Phase 2: FLOCK

*The geese find each other in the air, forming up by instinct...*

Cluster issues into flocks — groups that share an *outcome*, not just a label.

- Ask: "If all these issues were done, what would a user notice?" That's the flock.
- A flock might span multiple components (DM system touches Chirp, Loom, Thorn)
- A flock might be one issue if it stands alone — don't force clusters
- Some issues are really separate steps toward one outcome — those become one task
- Some issues are unrelated even if they share a label — those stay separate
- Bugs get their own flock — broken things are their own category
- Target 4-6 sections. Within sections, each task is its own thing.

**The clustering test:** Would combining these issues lose useful information? If
yes, keep them separate. If they're really "steps 1-3 of getting messaging to work,"
they're one task.

**Reference:** Load `references/clustering-guide.md` for outcome-based clustering
patterns and Grove domain relationships

**Output:** Named flocks with their constituent issues

---

### Phase 3: CALL

*The goose calls out — clear, unmistakable, impossible to ignore...*

Translate each flock into a Todoist section and individual tasks.

- **Section names** are short and warm: "Messaging," "Make Themes Beautiful,"
  "Broken Things," "Lantern Discovery"
- **Task names** pass the friend test — what you'd tell a friend you're working on:
  - NO: "Thorn: Add DO-safe subpath export for DM message moderation"
  - YES: "Add safety checks so DMs stay moderation-safe"
  - NO: "Prism Multi-Pack Resolver -- split adapter into registries + resolver"
  - YES: "Let themes load multiple color packs at once"
- **Task descriptions** include:
  - One sentence: *why* this matters in human terms
  - The GitHub issue number(s) it maps to, as links
  - If multiple issues, a brief note on what each one covers
- **Ordering within sections:** quickest win first, then build momentum.
  A 30-minute bug fix goes before a 3-day feature, even if the feature is
  more important. Momentum beats importance for getting started.

**Reference:** Load `references/translation-guide.md` for translation rules,
warm language patterns, and the friend test

**Output:** Complete task list — sections, tasks, descriptions, ordering

---

### Phase 4: DRAFT

*The flock holds formation, waiting for the signal...*

Present the full proposed layout to the user in one clear view.

- Show all sections with their tasks, in order
- Include task descriptions (collapsed or summarized)
- If total tasks exceed 15, split into batches:
  "Here are 22 tasks across 5 sections. Batch 1 has the first 15 — batch 2
  has the remaining 7. I'll deposit batch 1 now."
- Note which batch comes first and why (most actionable, most broken, closest to done)
- Ask: "Does this look right? Adjust anything before I deposit."

**One round of feedback.** The user can:
- Approve as-is ("looks good" / "go" / "send it")
- Adjust ("swap X and Y" / "drop that one" / "rename this")
- Approve partially ("just do the bugs section for now")
- Abort ("actually, not right now")

**Output:** User-approved migration plan

---

### Phase 5: MIGRATE

*Wings beat in unison. The flock lifts and moves as one...*

Deposit the approved batch into Todoist via `gw todo`.

**For 3+ tasks (preferred):** Write a JSON file and use batch creation:

```bash
# Write tasks to a JSON file
cat > /tmp/goose-migration.json <<'EOF'
[
  {
    "content": "Fix the Follow button so people can actually follow sites",
    "section": "Broken Things",
    "description": "The Follow button is completely non-functional right now.\nThis is the most basic social feature — it should just work.\n\nIssues: #1518",
    "tag": "goose"
  },
  {
    "content": "Fix accent colors showing visitor's color instead of site owner's",
    "section": "Broken Things",
    "description": "When you visit someone's site, you see your own accent color\ninstead of theirs. The site should reflect the owner's identity.\n\nIssues: #1512, #1514",
    "tag": "goose"
  }
]
EOF

# Preview first, then deposit
gw todo batch --project grove --file /tmp/goose-migration.json --dry-run
gw todo batch --project grove --file /tmp/goose-migration.json
```

**For 1-2 tasks:** Use individual commands:

```bash
gw todo create-task "Fix the Follow button" \
  --project grove \
  --section "Broken Things" \
  --description "..." \
  --tag goose
```

**Idempotency:** Before creating, check for existing goose tasks:

```bash
# Find previously deposited tasks
gw todo list-tasks --project grove --tag goose
```

If a task already exists (matched by goose tag and issue numbers in description),
update it rather than creating a duplicate. If an existing task's issues are all
closed on GitHub, flag it: "This one might be done — check it off?"

**Output:** Tasks deposited in Todoist, confirmation summary

---

## Reference Routing Table

| Phase | Reference | Load When |
|-------|-----------|-----------|
| FLOCK | `references/clustering-guide.md` | Always (core clustering logic) |
| CALL | `references/translation-guide.md` | Always (translation rules) |
| MIGRATE | `references/todoist-structure.md` | When depositing (gw todo interface, tagging) |

---

## Goose Rules

### Translation

Every task name must pass the friend test: if you told a friend "I'm working on
[task name]," would they understand what you mean without knowing the codebase?
No component names, no pattern names, no acronyms in titles. Descriptions can
reference technical details — titles cannot.

### Batching

Write up to 15 tasks per run. If there are more, split into batches and deposit
the most actionable batch first. This isn't about hiding work — it's about pacing.
Everything gets tracked eventually.

### Momentum

Within each section, order tasks by how quickly they can be completed. The first
task in each section should be a win you can get in under an hour. Momentum beats
importance for getting started.

### Idempotency

Running the goose twice must not create duplicates. Use the `goose` tag and issue
numbers in descriptions to identify previously deposited tasks. Update what exists,
add what's new, flag what's done.

### Read-Only on GitHub

The goose reads GitHub but NEVER writes to it. No closing issues, no adding
comments, no changing labels. That's the vulture's job.

### Communication

Use migration metaphors:

- "Lifting off to survey..." (reading the board)
- "The flock is forming..." (clustering)
- "Calling out the plan..." (translating)
- "Holding formation..." (presenting the draft)
- "The flock moves as one..." (depositing)

---

## Anti-Patterns

**The goose does NOT:**

- Use technical jargon in task names (descriptions are fine)
- Modify GitHub issues (read-only)
- Deposit without showing the draft first
- Create duplicate tasks on repeated runs
- Try to sync task completion back to GitHub (different concern)
- Cluster by label alone — clusters are by *outcome*
- Skip deferred tasks silently (always reports what's in the next batch)
- Force unrelated issues into the same task to reduce count
- Leave tasks so vague they cause the same paralysis as the issue board

---

## Example Migration

**User:** "/goose-migrate — I'm lost in the backlog, what am I even doing?"

**Goose flow:**

1. 🪿 **SURVEY** — "Lifting off... 99 open issues found. 10 bugs, 40 features,
   30 enhancements, 6 security, 5 docs. Spotting relationships around messaging,
   theming, discovery, and infrastructure."

2. 🪿 **FLOCK** — "The flock is forming... I see 5 natural groupings:
   - Broken Things (8 bugs — things users can see are wrong right now)
   - Messaging (6 issues — the DM system, notifications, and keeping it safe)
   - Theme Polish (7 issues — making sites actually look beautiful)
   - Lantern Discovery (4 issues — the AI chat and search pipeline)
   - Docs & Cleanup (5 issues — inventory, help articles, housekeeping)
   Plus 69 issues deferred to the next batch — infrastructure, security, futures."

3. 🪿 **CALL** — "Calling out the plan...

   **Broken Things**
   - Fix the Follow button so people can actually follow sites (#1518)
   - Fix accent colors showing the wrong person's color (#1512)
   - Fix the settings page so it stops throwing errors (#1356)

   **Messaging**
   - Wire up the DM system end-to-end (#1441, #1423)
   - Add safety checks so DMs stay moderation-safe (#1457, #1482)

   ..."

4. 🪿 **DRAFT** — Shows the full layout. "18 tasks across 5 sections. Batch 1
   has 15 tasks (bugs + messaging + themes). Batch 2 has 3 (lantern + docs).
   Look right?"

5. 🪿 **MIGRATE** — Writes `/tmp/goose-migration.json`, runs
   `gw todo batch --project grove --file /tmp/goose-migration.json`.
   "The flock moves as one... 4 sections created, 15 tasks deposited in your
   Grove project. Check your widget. 🪿"

---

## Quick Decision Guide

| Situation | Approach |
|-----------|----------|
| Board is huge (80+ issues) | Focus first batch on what's closest to done + active bugs |
| Board is small (< 20 issues) | Might not need clustering — tasks can map 1:1 to issues |
| Many bugs | Bugs get their own section, ordered by user impact |
| One dominant feature | Give it its own section even if it's just 2-3 tasks |
| User says "just the bugs" | Migrate only the bug flock, skip the rest |
| Previous goose run exists | Check existing tasks first, update and add, don't duplicate |
| Issue stands alone | Keep it as its own task — don't force it into a cluster |
| 3 issues are really 3 steps | Combine into one task, list all issue numbers in description |

---

## Integration with Other Skills

**Before Migrating:**

- `vulture-sweep` — Clean up dead issues so the goose doesn't migrate ghosts
- `badger-triage` — Size and prioritize so the goose can order by completability

**After Migrating:**

- `bee-collect` — If the migration revealed gaps ("we need an issue for X")
- `badger-triage` — If deferred issues need organizing for next batch

**Complementary (not sequential):**

- `panther-strike` — Pick a task from Todoist, strike to fix it in code

---

*The geese know the way. They've always known the way.* 🪿
