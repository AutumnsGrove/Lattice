# Druid — Gathering Template

## Purpose

A gathering orchestrates multiple animals for complex work that spans multiple domains. Save gathering files to `.claude/skills/gathering-{purpose}/SKILL.md`.

## Template

```markdown
---
name: gathering-{purpose}
description: The drum sounds. {Animals} gather for {purpose}. Use when {trigger}.
---

# Gathering {Purpose} 🌲🐾

{Opening: The drum echoes through the grove. Named animals answer the call. 3-4 sentences describing what they accomplish together and why no single animal could do it alone.}

## When to Summon

- {Trigger condition 1}
- {Trigger condition 2}
- {Trigger condition 3}
- User says "{common phrase}" or calls `/gathering-{purpose}`

---

## The Gathering

```
SUMMON → ORGANIZE → EXECUTE → VALIDATE → COMPLETE
   ↓         ↲          ↲          ↲          ↓
Receive  Dispatch   Animals    Verify   Work
Request  Animals    Work       All      Ready
```

### Animals Mobilized

1. **{Emoji} {Animal}** (`{skill-name}`) — {What it contributes to this gathering}
2. **{Emoji} {Animal}** (`{skill-name}`) — {What it contributes}
3. **{Emoji} {Animal}** (`{skill-name}`) — {What it contributes}

### Dependencies

```
{Animal1} ──→ {Animal2} ──→ {Animal3}
                  ↓
             {Animal4} ──→ {Animal5} (parallel with Animal3)
```

{Explain which animals work sequentially, which in parallel, and what each passes to the next.}

---

### Phase 1: SUMMON

*The drum sounds. The animals gather at the clearing...*

- Receive the request and understand the full scope
- Confirm which animals are needed for this specific task
- Identify any dependencies or pre-conditions
- Brief each animal on its role in the gathering

**Output:** Animals assembled, roles clear, ready to begin

---

### Phase 2: ORGANIZE

*The animals circle the clearing, establishing order...*

- {Animal1} begins its work: {what it does first}
- {Animal2} waits for {Animal1}'s output before starting
- {Animal3} and {Animal4} can work in parallel on {X and Y}
- Handoff protocol: {what Animal1 passes to Animal2}

**Output:** Work organized, first animals dispatched

---

### Phase 3: EXECUTE

*The grove comes alive with focused effort...*

- {Animal1} completes: {what it produces}
- {Animal2} receives output, begins: {what it does}
- {Animal3} works simultaneously on: {what it does}
- Quality gates: {what must be true before proceeding}

**Output:** Core work complete from all animals

---

### Phase 4: VALIDATE

*The animals inspect each other's work...*

- {Animal that validates} reviews {what it checks}
- Integration check: {how the outputs fit together}
- Any conflicts or gaps between animals resolved
- All quality gates confirmed

**Output:** Work validated, integration confirmed

---

### Phase 5: COMPLETE

*The gathering disperses, the work stands...*

- Final summary of what was accomplished
- Update project board, close issues, notify as needed
- Document what the gathering produced
- Note anything for future gatherings

**Output:** {What was built/accomplished}, ready for use

---

## Example Gathering

**User:** "{Example user request that triggers this gathering}"

**Gathering flow:**

1. 🌲 **SUMMON** — "{Animals called, roles assigned}"
2. 🌲 **ORGANIZE** — "{Animal1 starts, dependencies established}"
3. 🌲 **EXECUTE** — "{Animals work, handoffs happen}"
4. 🌲 **VALIDATE** — "{Integration checked, quality confirmed}"
5. 🌲 **COMPLETE** — "{What was delivered}"

---

## Integration with Other Gatherings

**Precedes:** `gathering-{name}` — {Why this gathering often leads to that one}

**Follows:** `gathering-{name}` — {Why this gathering often comes after that one}

**Animals available for extension:** {Other animals that could join this gathering for specific scenarios}

---

*When no single animal suffices, the gathering answers.* 🌲🐾
```

## Existing Gatherings (Reference)

| Name | Animals | Purpose |
|------|---------|---------|
| gathering-feature | 8 animals (Bloodhound, Elephant, Turtle, Beaver, Raccoon, Deer, Fox, Owl) | Full feature lifecycle |
| gathering-architecture | 3 animals (Eagle, Swan, Elephant) | System design |
| gathering-ui | 2 animals (Chameleon, Deer) | UI + accessibility |
| gathering-security | 3 animals (Spider, Raccoon, Turtle) | Auth + audit + hardening |
| gathering-migration | 2 animals (Bear, Bloodhound) | Data movement |
| gathering-planning | 2 animals (Bee, Badger) | Issue capture + triage |

## Design Principles

**Sequential vs. Parallel:**
- Sequential when Animal B needs Animal A's output to start
- Parallel when animals work on independent domains
- Always be explicit about which mode each relationship uses

**Gathering size:**
- 2-3 animals: tight, focused gatherings (most common)
- 4-6 animals: full feature gatherings
- 7+ animals: rarely needed; consider breaking into sub-gatherings

**Handoffs must be explicit:**
- What does Animal A produce?
- What exact output does Animal B need?
- Is there a format/structure to the handoff?
