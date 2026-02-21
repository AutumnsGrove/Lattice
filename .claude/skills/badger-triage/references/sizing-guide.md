# Badger Triage — Sizing & Priority Guide

## Size Definitions

| Size | Time | Scope | Examples |
|------|------|-------|---------|
| **XS** | < 1 hour | Single file, obvious fix | Fix a typo, add a tooltip, correct a CSS class |
| **S** | 1–3 hours | Small feature, few files | Add a form field, update a validation rule, small bug fix |
| **M** | Half day to full day | Multiple files, some complexity | New component, API endpoint with basic logic |
| **L** | 2–3 days | Significant feature, cross-cutting | New user flow, multi-step integration, refactor |
| **XL** | Week+ | Major feature, architectural impact | New subsystem, complex migration, major redesign |

## Sizing Heuristics

**Ask yourself:**

- How many files will this touch? (1-2 = XS/S, 3-5 = M, 6+ = L/XL)
- Does it require database changes? (+1 size)
- Does it require coordination across apps? (+1 size)
- Is the requirement clear or still fuzzy? (fuzzy = don't size yet)
- Has someone done something similar in this codebase before? (yes = smaller)

**Common traps:**

- Bug fixes look small but often reveal complexity — start at S, adjust up
- Auth changes always cost more than expected — start at M minimum
- "Add a filter" to an existing list is usually S or M (not XS)
- "Refactor X to use the engine pattern" is usually L (many files)

## Priority Definitions

| Priority | Meaning | When to Use |
|----------|---------|-------------|
| **First Focus** | Work on this NOW. Blocking or urgent. | Production bugs, blocking other work, launch blockers |
| **Next Up** | In the queue. Will be First Focus soon. | High value, ready to pick up in the next day or two |
| **In Time** | Important but not urgent. Plan for it. | Planned features, non-blocking improvements |
| **Far Off** | Someday/maybe. Keep in backlog. | Nice-to-haves, speculative features, future ideas |

## Priority Decision Rules

**First Focus when:**
- Production is broken or degraded
- The issue blocks other team members' work
- It's blocking a launch milestone
- A Wanderer has already been affected

**Next Up when:**
- It's actively being planned for the current sprint
- Dependencies are resolved and it's ready to start
- It's a high-value fix with low risk

**In Time when:**
- It's important but not blocking anything
- It has a rough timeline (next month, next quarter)
- Other things need to ship first

**Far Off when:**
- No timeline is defined
- It's speculative ("would be nice if...")
- Dependencies don't exist yet
- Requires a design decision before work can start

## Batch Sizing Display Format

```
┌─────────────────────────────────────────────────────────────────────┐
│  BATCH 1: Heartwood Authentication (5 issues)                       │
├──────┬─────────────────────────────────────────────┬───────┬────────┤
│ #    │ Title                                       │ Size  │ Priority│
├──────┼─────────────────────────────────────────────┼───────┼────────┤
│ #412 │ Add session refresh endpoint                │   ?   │   ?    │
│ #415 │ Fix token expiry edge case                  │   ?   │   ?    │
│ #418 │ Support multiple OAuth providers            │   ?   │   ?    │
│ #421 │ Add logout confirmation dialog              │   ?   │   ?    │
│ #425 │ Implement "remember me" checkbox            │   ?   │   ?    │
└──────┴─────────────────────────────────────────────┴───────┴────────┘
```

## When NOT to Size

Some issues can't be sized yet. Surface these honestly:

- "This issue is too vague to size — needs clarification on scope"
- "This requires a design decision before we know what to build"
- "This depends on #XXX which isn't done yet"
- "I'd need to explore the codebase to estimate this accurately"

It's better to flag these than to guess wrong.
