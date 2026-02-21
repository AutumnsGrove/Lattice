# Druid — SKILL.md Template

## The Exact Pattern (Copy This)

```markdown
---
name: {skill-name}
description: {One sentence capturing the animal's purpose and when to use it}
---

# {Name} {Emoji}

{Opening paragraph: 3-5 sentences establishing the animal's character, what it does, and how it does it. Use natural metaphor. Make it vivid.}

## When to Activate

- {Trigger condition 1}
- {Trigger condition 2}
- User says "{common phrase}" or "{another phrase}"
- User calls `/{skill-name}` or mentions {keywords}
- {Additional trigger conditions}

**IMPORTANT:** {Critical behavior note if applicable — omit if none}

**Pair with:** `{related-skill}` for {handoff reason}, `{another-skill}` for {reason}

---

## The {Workflow Name}

```
{PHASE1} → {PHASE2} → {PHASE3} → {PHASE4} → {PHASE5}
    ↓          ↓           ↓          ↓           ↓
{Action}   {Action}    {Action}   {Action}    {Action}
{Detail}   {Detail}    {Detail}   {Detail}    {Detail}
```

### Phase 1: {PHASE1}

*{Italicized atmospheric description using animal's metaphor...}*

{3-5 bullet points summarizing what happens in this phase}

**Reference:** Load `references/{file}.md` {if this phase has deep content}

**Output:** {What this phase produces}

---

### Phase 2: {PHASE2}

{...continue pattern...}

---

### Phase 3: {PHASE3}

{...}

---

### Phase 4: {PHASE4}

{...}

---

### Phase 5: {PHASE5}

{...}

---

## Reference Routing Table

| Phase | Reference | Load When |
|-------|-----------|-----------|
| {PHASE} | `references/{file}.md` | {When to load} |

---

## {Animal} Rules

### {Rule 1 Name}
{Rule explanation — 2-4 sentences}

### {Rule 2 Name}
{Rule explanation}

### Communication
Use {animal} metaphors:
- "{Phrase}" ({meaning})
- "{Phrase}" ({meaning})
- "{Phrase}" ({meaning})

---

## Anti-Patterns

**The {animal} does NOT:**
- {Anti-pattern 1}
- {Anti-pattern 2}
- {Anti-pattern 3}
- {Anti-pattern 4}

---

## Example {Workflow}

**User:** "{Example user request}"

**{Animal} flow:**

1. {Emoji} **{PHASE1}** — "{What happens}"

2. {Emoji} **{PHASE2}** — "{What happens}"

3. {Emoji} **{PHASE3}** — "{What happens}"

4. {Emoji} **{PHASE4}** — "{What happens}"

5. {Emoji} **{PHASE5}** — "{What happens}"

---

## Quick Decision Guide

| Situation | Approach |
|-----------|----------|
| {Situation 1} | {Approach} |
| {Situation 2} | {Approach} |

---

## Integration with Other Skills

**Before {Action}:**
- `{skill}` — {reason}

**During {Action}:**
- `{skill}` — {reason}

**After {Action}:**
- `{skill}` — {reason}

---

*{Closing poetic line capturing the animal's essence}* {Emoji}
```

## File Location

```bash
mkdir -p .claude/skills/{skill-name}
# Write SKILL.md at .claude/skills/{skill-name}/SKILL.md
# Create references/ if deep content warrants it
```

## Lean vs. Full SKILL.md

**Lean SKILL.md (target: 150-200 lines):**
- Frontmatter + opening paragraph
- When to Activate
- Workflow diagram
- 5 phases with: italic opener + 3-5 bullets + Reference link
- Reference Routing Table
- Rules section
- Anti-Patterns
- Example
- Quick Decision Guide
- Integration with Other Skills
- Closing line

**Reference files (extracted deep content):**
- Checklists with 10+ items
- Code examples spanning multiple patterns
- Configuration tables (field IDs, option IDs)
- Detailed templates users copy-paste
- Taxonomies (what to skip vs. test, sizing criteria)

## Required Elements (Non-Negotiable)

Every SKILL.md MUST have:
1. YAML frontmatter with `name` and `description`
2. Opening paragraph (character, purpose, metaphor)
3. "When to Activate" with trigger conditions
4. Workflow diagram with phase names and action words
5. All 5 phases with italic opener and Output statement
6. Rules section with Communication metaphors
7. Anti-Patterns section
8. Example with all 5 phases
9. Closing poetic line with emoji
