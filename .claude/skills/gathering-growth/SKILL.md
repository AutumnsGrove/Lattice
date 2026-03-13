---
name: gathering-growth
description: The drum sounds. Hummingbird, Squirrel, Firefly, and Wren gather for a complete growth cycle — from finding opportunities to shipping findable content. Use when you want to plan and execute your content-to-discovery pipeline in one focused session.
---

# Gathering Growth 🌲🌺🐿️✨🐦

The drum echoes across the meadow and into the wider world. Four creatures answer — each one a fresh subagent with its own context and focus. The Hummingbird darts out to find where your people are. The Squirrel takes what's found and builds a calendar. The Firefly drafts the posts in your voice. The Wren checks that everything is findable. The conductor orchestrates, pauses for human checkpoints between each animal, and ensures nothing gets lost in handoff. One session, one complete growth cycle.

## When to Summon

- Monthly content planning session
- "Help me plan and create content this month"
- After shipping features that deserve visibility
- When you feel stuck on marketing/growth as a whole
- "I need to go from zero to posted"
- User calls `/gathering-growth`

**IMPORTANT:** This gathering is a **conductor with human checkpoints**. It dispatches subagents but PAUSES between each animal to check in with you. Your input shapes every phase. This is collaborative, not automated.

---

## The Gathering

```
SUMMON → SCOUT → ✋ CHECK → PLAN → ✋ CHECK → DRAFT → ✋ CHECK → POLISH → CHORUS
   ↓        ↓        ↓        ↓        ↓        ↓         ↓         ↓        ↓
Confirm  Hummingbird Human  Squirrel  Human   Firefly   Human     Wren    Summary
scope    finds opps  review  builds   review  drafts    review    SEO     & next
                     & pick  calendar & refine posts    & approve checks  steps
```

### Animals Dispatched

| Order | Animal | Model | Role | Handoff Receives |
|-------|--------|-------|------|-----------------|
| 1 | 🌺 Hummingbird | sonnet | Scout opportunities, find where people are | Feature spec + recent work |
| ✋ | Human checkpoint | — | Pick which opportunities to pursue | — |
| 2 | 🐿️ Squirrel | sonnet | Build content calendar from approved opportunities | Approved opportunities + recent firefly output |
| ✋ | Human checkpoint | — | Refine calendar, adjust rhythm, confirm dates | — |
| 3 | ✨ Firefly | sonnet | Draft posts for the highest-priority calendar items | Approved calendar + git log |
| ✋ | Human checkpoint | — | Refine voice, correct facts, approve posts | — |
| 4 | 🐦 Wren | sonnet | SEO-check any pages linked in posts | Approved posts + linked page list |

---

### Phase 1: SUMMON

*The drum sounds. The conductor steps into the clearing...*

The conductor receives the growth request and prepares:

- What's the time horizon? (this week? this month?)
- What has been shipped recently? (quick `gw git log --oneline --since="14 days ago"`)
- Any specific features or launches to highlight?
- Any previous growth experiments to check on?
- Confirm the gathering with the human

**Output:** Scope confirmed, context gathered, ready to dispatch.

---

### Phase 2: SCOUT (Hummingbird)

*The conductor signals. The Hummingbird shoots out of the grove...*

```
Agent(hummingbird, model: sonnet)
  Input:  Growth scope + recent shipping summary
  Reads:  hummingbird-pollinate/SKILL.md (MANDATORY)
  Output: Opportunity report
```

Dispatch a **sonnet subagent** as the Hummingbird. It receives the scope and recent work summary, reads its skill file, and executes the full DART → HOVER → SIP → CARRY workflow.

**Handoff to conductor:** Opportunity report — communities found, conversations spotted, content ideas, growth experiments to try. Ranked by effort vs. impact.

**Gate check:** Opportunities identified with at least 3 actionable ideas.

---

### ✋ Human Checkpoint 1

*The conductor pauses. Turns to you.*

Present the Hummingbird's findings and ask:

- "Here's what the Hummingbird found. Which opportunities excite you?"
- "Any of these feel wrong or not-you?"
- "Which 2-3 should we build the calendar around?"

**Wait for human input.** Do NOT proceed until the user has selected which opportunities to pursue. Use AskUserQuestion if helpful.

**Output:** User-approved opportunities, ready for calendar planning.

---

### Phase 3: PLAN (Squirrel)

*The Squirrel scurries into the clearing, nose twitching...*

```
Agent(squirrel, model: sonnet)
  Input:  Approved opportunities + time horizon + any existing firefly output
  Reads:  squirrel-plan/SKILL.md (MANDATORY)
  Output: Content calendar
```

Dispatch a **sonnet subagent** as the Squirrel. It receives the user-approved opportunities and builds a content calendar with specific topics, dates, formats, and effort levels.

**Handoff to conductor:** Content calendar with items placed in time, effort-tagged, platform-assigned.

**Gate check:** Calendar exists with at least one item per week in the time horizon.

---

### ✋ Human Checkpoint 2

*The conductor pauses again.*

Present the Squirrel's calendar and ask:

- "Does this rhythm feel sustainable?"
- "Any items to move, cut, or add?"
- "Which posts should Firefly draft RIGHT NOW? (pick 1-3)"

**Wait for human input.** The user picks which calendar items to draft in this session.

**Optionally push to GitHub Projects:**
```bash
gw gh issue create --write \
  --title "Content: [topic]" \
  --body "[calendar item details]" \
  --label "content"
```

**Output:** User-approved calendar, items selected for drafting.

---

### Phase 4: DRAFT (Firefly)

*The clearing fills with warm light...*

```
Agent(firefly, model: sonnet)
  Input:  Selected calendar items + git log for relevant period
  Reads:  firefly-journal/SKILL.md (MANDATORY)
  Output: Draft posts
```

Dispatch a **sonnet subagent** as the Firefly. It receives the selected calendar items and reads the git log to understand what was actually built. Executes DRIFT → GATHER → GLOW to produce draft posts.

**Note:** The Firefly's REFLECT phase is handled by the next human checkpoint — the conductor manages the conversation, not the subagent.

**Handoff to conductor:** Draft posts for each selected calendar item, sized appropriately (Bluesky post, thread, dev log, etc.).

**Gate check:** Drafts exist for every selected calendar item.

---

### ✋ Human Checkpoint 3

*The conductor holds up the drafts like lanterns...*

Present each draft post and ask:

- "Does this sound like you?"
- "Anything I got wrong or that you'd say differently?"
- "Which of these are ready to go? Which need more work?"

This is the REFLECT phase — the most important checkpoint. The user's corrections make the content authentic.

**Iterate if needed:** If the user provides corrections, revise the drafts right here. Usually 1-2 rounds.

**Output:** User-approved posts, ready for findability check.

---

### Phase 5: POLISH (Wren)

*The Wren hops onto the branch, tilting its head at the pages...*

```
Agent(wren, model: sonnet)
  Input:  List of pages linked in approved posts + the posts themselves
  Reads:  wren-optimize/SKILL.md (MANDATORY)
  Output: SEO report + fixes for linked pages
```

Dispatch a **sonnet subagent** as the Wren. It receives the pages that will be linked in posts and audits their findability — meta tags, OG images, descriptions. If someone clicks through from a Bluesky post, the landing page needs to deliver.

**What the Wren checks:**
- Pages linked in posts: do they have proper meta tags?
- OG images: will the Bluesky preview card look good?
- Meta descriptions: do they match what the post says?
- If fixes are needed, the Wren applies them directly

**Handoff to conductor:** SEO report + any fixes applied.

**Gate check:** All linked pages have proper meta tags and OG images.

---

### Phase 6: CHORUS

*Dawn breaks over the clearing. The conductor surveys the work...*

Present the complete growth cycle summary:

```markdown
## 🌲 GATHERING GROWTH COMPLETE

### Dispatch Log
  🌺 Hummingbird  — [N opportunities found, M selected]
  🐿️ Squirrel     — [Calendar built: X items over Y weeks]
  ✨ Firefly      — [N posts drafted, M approved]
  🐦 Wren         — [N pages audited, M fixes applied]

### Human Checkpoints
  After Scout:   ✅ [N] opportunities selected
  After Plan:    ✅ Calendar approved, [N] items for drafting
  After Draft:   ✅ [N] posts approved
  After Polish:  ✅ All linked pages findable

### Ready to Post
1. [Post title] — [platform] — [ready / needs screenshot / needs review]
2. [Post title] — ...

### Calendar (Next 2 Weeks)
| Date | Content | Platform | Status |
|------|---------|----------|--------|

### Growth Experiments to Track
- [Experiment from Hummingbird] — try by [date]

### Next Gathering
Suggested: [date] — run `/gathering-growth` again to check what bloomed
```

**Output:** Posts ready, calendar set, pages findable, growth experiments tracked.

---

## Conductor Rules

### Human Checkpoints Are Sacred
NEVER skip a checkpoint. NEVER proceed without user input. The whole point is collaborative growth, not automated marketing. If in doubt, ask.

### Fresh Eyes Per Animal
Each animal runs as an isolated subagent. The Hummingbird doesn't see the Wren's work. The Squirrel doesn't see the Firefly's drafts until they're ready. Isolation produces better results.

### Carry Context Through Handoffs
The conductor is the memory. It carries user decisions, approved items, and corrections from checkpoint to checkpoint. Each subagent gets ONLY what it needs — not the full history.

### Respect Energy
If the user says "this is enough for today" at any checkpoint, stop the gathering gracefully. Save what's done. The Squirrel can stash the remaining items for next time.

### Communication
- "The drum sounds..." (summoning)
- "Dispatching the Hummingbird..." (launching scout)
- "Pausing for your input..." (human checkpoint)
- "The clearing fills with light..." (drafting phase)
- "The chorus rises..." (completion)

---

## Anti-Patterns

**The conductor does NOT:**
- Skip human checkpoints (every transition gets approval)
- Write content itself (dispatch subagents for all content work)
- Pressure the user to post more than they want
- Proceed after a checkpoint without explicit approval
- Let subagents see each other's full context (isolation matters)
- Declare the gathering complete if the user stopped early (save state honestly)

---

## Quick Decision Guide

| Situation | Approach |
|-----------|----------|
| Full monthly planning | All 4 animals, all checkpoints |
| "Just help me post about [thing]" | Skip Hummingbird, start at Squirrel/Firefly |
| "What should I post this week?" | Hummingbird + Squirrel only |
| "I have drafts, just check SEO" | Wren only |
| User runs out of energy mid-gathering | Save state, note what's done, suggest when to resume |

---

## Integration

**Before:** `rabbit-inspect` — audit first impressions before driving traffic to pages
**After:** `hummingbird-pollinate` — track which growth experiments bloomed
**Parallel:** Individual animals can be invoked standalone anytime

---

*When one animal isn't enough and the grove needs to grow — the gathering answers.* 🌲
