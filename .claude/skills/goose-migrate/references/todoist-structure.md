# Todoist Structure — Deposit Rules

## Target Project

All goose tasks go into the **Grove** project in Todoist.

- Project ID: `6gC236xXF8WrjxF2`
- This is one of 5 Base Camp projects (Path Ahead, Foraging, Tending, Seedbed, Grove)

## Sections

Sections are the goose's primary organizational unit. They map to clusters/flocks.

**Creating sections via gw:**

```bash
# List existing sections
gw todo list-sections --project grove

# Create a new section
gw todo create-section "Broken Things" --project grove
```

**Section naming rules:**
- 2-4 words, warm tone
- Outcome-oriented, not component-oriented
- See clustering-guide.md for naming examples

## Tasks

**Creating tasks via gw:**

```bash
# Single task
gw todo create-task "Fix the Follow button" \
  --project grove \
  --section "Broken Things" \
  --description "The Follow button doesn't work..." \
  --tag goose

# Batch (preferred for 3+)
gw todo batch --project grove --file /tmp/goose-migration.json --dry-run
gw todo batch --project grove --file /tmp/goose-migration.json
```

**Batch JSON format:**

```json
[
  {
    "content": "Fix the Follow button so people can actually follow sites",
    "section": "Broken Things",
    "description": "The Follow button is completely broken right now.\nVisitors click it and nothing happens.\n\nIssues: #1518",
    "tag": "goose"
  },
  {
    "content": "Fix accent colors showing the wrong person's color",
    "section": "Broken Things",
    "description": "When you visit a site, you see your own accent color\ninstead of the site owner's. Sites should reflect their owner.\n\nIssues: #1512, #1514",
    "tag": "goose"
  }
]
```

## Tagging for Idempotency

Every goose-created task gets the `goose` tag (Todoist label). This allows:

1. **Finding existing tasks:** `gw todo list-tasks --project grove --tag goose`
2. **Avoiding duplicates:** Before creating, check if a task with the same
   issue numbers already exists
3. **Updating:** If an existing task's description references issues that are
   now closed, flag it for the user

**Matching logic:**
- Extract issue numbers from existing task descriptions
- Compare against proposed new tasks
- If same issues → update existing task (title/description may have improved)
- If no match → create new task
- If existing task's issues are all closed → suggest completing it

## Batching Rules

- **Max 15 tasks per run** — this is a pacing limit, not a total cap
- If more than 15 tasks are needed, split into batches
- Deposit the most actionable batch first (bugs > nearly-done features > new features)
- Report what's in the next batch so nothing feels hidden
- On the next run, the goose picks up where it left off

## Priority Mapping

The goose generally does NOT set Todoist priorities (p1-p4). Ordering within
sections handles importance — the first task in a section is the one to do first.

Exception: if an issue is labeled `priority-critical` or `priority-high` on GitHub,
the goose may set it to p2 in Todoist to give it visual weight. Never p1 —
that's reserved for "due today" urgency, which the goose doesn't assign.

## What the Goose Does NOT Set

- **Due dates** — the goose doesn't know your schedule. Tasks land undated.
  You (or Base Camp) add dates when you're ready to commit.
- **Assignees** — it's your personal Todoist, everything is yours.
- **Recurrence** — goose tasks are one-time work items, not tides.

## Cleanup

When the goose runs again and finds previously deposited tasks:

1. Tasks whose GitHub issues are all closed → "These might be done. Check them off?"
2. Tasks whose issues have changed → update description with current state
3. Tasks that no longer match any open issue → "This work may have shifted.
   Want to keep it or remove it?"

The goose never auto-completes or auto-deletes Todoist tasks. It flags and suggests.
