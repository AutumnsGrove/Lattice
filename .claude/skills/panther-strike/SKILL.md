---
name: panther-strike
description: Lock in on a single GitHub issue and STRIKE to fix it. High-energy, surgical focus. Prowl, investigate, plan, strike, kill. Use when targeting one specific issue for rapid resolution.
---

# Panther Strike 🐆

Lock onto a single issue. Prowl through the codebase. Strike with surgical precision. Leave nothing but a clean commit.

## When to Activate

- User provides an issue number to fix
- User says "strike", "drop on", "attack", or "kill" an issue
- User explicitly calls `/panther-strike #123`
- User wants focused, rapid resolution of ONE issue

---

## The Hunt

```
🐆 TARGET → PROWL → INVESTIGATE → PLAN → STRIKE → KILL
```

### Phase 1: TARGET

Lock onto the prey. Fetch the issue details:

```bash
gh issue view {number} --repo AutumnsGrove/GroveEngine
```

Read it carefully. Understand the acceptance criteria. Know what "done" looks like.

**Output:** Brief summary of the target in hunting language.

### Phase 2: PROWL

*The panther's ears perk up. Eyes scan the underbrush.*

Search the codebase for relevant files. Use the issue description and context to guide your hunt:

- Find mentioned files
- Search for related functions/components
- Identify the crime scene

Use Glob, Grep, and Read tools. Move silently. Gather intel.

**Output:** List of files in the strike zone.

### Phase 3: INVESTIGATE

*Crouching lower, scanning for movement...*

Read the relevant files. Understand:
- What's broken or missing
- Where the fix needs to go
- What patterns exist that should be followed
- Dependencies and constraints

Look for root causes, not symptoms.

**Output:** Diagnosis of the issue with specific line numbers.

### Phase 4: PLAN

*The panther calculates the trajectory...*

Write a brief, focused plan:
- What files will change
- What the fix is (1-3 bullet points max)
- Any edge cases to handle

Keep it surgical. No scope creep. One issue, one fix.

For complex fixes, write to a plan file:
```
docs/plans/planned/issue-{number}-{slug}.md
```

### Phase 5: STRIKE

*CLAWS OUT!*

Make the changes. Be surgical:
- Edit only what needs to change
- Follow existing patterns
- Add comments only if the code isn't self-explanatory
- No drive-by refactoring

Use Edit tool for precision. Write tool only for new files.

**Provide an Insight block** before/after code explaining the fix:

```
`★ Insight ─────────────────────────────────────`
[What was wrong and why the fix works]
`─────────────────────────────────────────────────`
```

### Phase 6: KILL

*The hunt is complete.*

Commit and push:

```bash
git add {files} && git commit -m "$(cat <<'EOF'
fix(component): brief description of fix

[1-2 sentences explaining the root cause and solution]

Fixes #{number}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

Push to origin. Announce the kill.

**Output:** Summary table of the hunt:

```
## 🐆 PANTHER STRIKE COMPLETE!

**Issue #{number}** — {title} — **ELIMINATED**

| Phase | Action |
|-------|--------|
| Target | {what the issue was} |
| Prowl | {files investigated} |
| Investigate | {root cause found} |
| Strike | {what was changed} |
| Kill | Commit {hash}, pushed |
```

---

## Hunting Rules

### Energy
Stay locked in. The panther doesn't get distracted. ONE issue. ONE fix. ONE commit.

### Precision
Surgical strikes only. No "while we're here" changes. No scope creep. If you see other issues, note them for later but don't fix them now.

### Speed
Move fast. The panther doesn't deliberate endlessly. When you see the fix, STRIKE.

### Communication
Use hunting metaphors throughout:
- "Prowling through..."
- "Eyes on the target..."
- "Stalking the bug..."
- "CLAWS OUT!"
- "Strike complete."

This keeps the energy high and the focus sharp.

### When to Abort

Sometimes the panther must retreat:
- Issue requires architectural changes beyond one fix
- Multiple unrelated changes needed
- Unclear acceptance criteria
- Blocked by missing information

If this happens, explain what's blocking and ask the user how to proceed. Don't force a bad fix.

---

## Example Hunt

**User:** `/panther-strike 755`

**Response flow:**

1. 🐆 **TARGET** — "Usage stats section shows error on account page load"
2. 🐆 **PROWL** — Search for UsageStatsCard, +page.server.ts, related queries
3. 🐆 **INVESTIGATE** — "Query selects non-existent columns. Root cause: storage_limit and post_limit don't exist in tenants table."
4. 🐆 **PLAN** — "Remove phantom columns from query, get limits from tier config instead"
5. 🐆 **STRIKE** — Edit +page.server.ts with surgical changes
6. 🐆 **KILL** — Commit, push, report

---

## Anti-Patterns

**The panther does NOT:**
- Fix multiple issues in one hunt
- Refactor unrelated code
- Add "improvements" beyond the issue scope
- Hesitate when the path is clear
- Leave prey half-dead (partial fixes)

---

*The panther strikes clean. One issue enters, zero issues leave.*
