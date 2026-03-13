---
name: firefly-journal
description: Make your invisible work visible. The firefly drifts through your git history, gathers what you shipped into stories, glows them into human words, and helps you share them with the world. Use when you need patch notes, posts, or just want to see what you built.
---

# Firefly ✨

The firefly drifts through the dark, finding what glows. Most of your best work happens at 2am, buried in commits nobody reads. The firefly reads them. It floats through your git history, gathers related changes into coherent stories, and illuminates them in words that sound like you — not a changelog, not corporate copy, but the way you'd describe it to a friend at a tea shop. Then it waits. You refine. You correct. You add the feeling the commits can't capture. And when it's right, the firefly helps you signal — a post, a changelog entry, a journey update. Your work, finally visible.

## When to Activate

- User wants to know what they shipped recently
- User needs to write a post about recent work
- User says "what did I build?" or "help me post about this"
- User calls `/firefly-journal` or mentions firefly/journal/ship log
- User needs patch notes, release notes, or changelog entries
- User feels stuck writing about their own work
- After a productive sprint when the work needs to be shared

**IMPORTANT:** The firefly does NOT post anything on your behalf. It drafts. You decide. Human in the loop, always.

**Pair with:** `bee-collect` for turning discoveries into issues, `owl-archive` for documentation, `grove-documentation` for longer-form writing

---

## The Glow

```
DRIFT → GATHER → GLOW → REFLECT → SIGNAL
  ↓        ↓        ↓       ↓         ↓
Float    Collect  Write   Refine    Produce
through  stories  summary  with     the post
git log  by theme in your  you      or update
                  voice
```

### Phase 1: DRIFT

*The firefly lifts from the grass and drifts into the dark, antennae tuned to what changed...*

Float through recent git activity and understand what happened:

```bash
# What changed recently? (default: 7 days, adjust as needed)
gw git log --oneline --since="7 days ago"

# More detail on what files were touched
gw git log --stat --since="7 days ago"

# If looking at a specific range
gw git log --oneline main..HEAD
```

**What to notice:**
- New directories or packages (something big was born)
- Clusters of commits touching the same area (a feature taking shape)
- Commit messages that hint at something meaningful ("feat:", "add:", names of systems)
- Files that appeared for the first time vs. files that were modified
- The SCALE of change — 3 files vs. 30 files tells a different story

**What to ignore:**
- Routine dependency updates (unless they enabled something)
- CI/config tweaks (unless they represent a shift)
- Typo fixes, formatting changes, minor cleanup

**Output:** Raw list of meaningful changes with context about what areas were touched

---

### Phase 2: GATHER

*Dozens of tiny lights — the firefly clusters them, and patterns emerge...*

Group the raw changes into **stories**. A story is a coherent thing that happened, not a list of files.

**Grouping by meaning, not by file:**
- 14 files across `packages/lantern/` → "Lantern was born" (one story)
- 3 commits fixing auth redirect → "Auth redirect bug squashed" (one story)
- Scattered CSS changes across 8 components → "Design system refinement" (one story)

**Story sizing:**
| Size | What It Means | Example |
|------|--------------|---------|
| **Spark** | Small fix or tweak | "Fixed tooltip on mobile" |
| **Glow** | Notable improvement | "Waystones now show contextual help in settings" |
| **Blaze** | Major feature or system | "Lantern: a new component system for surfaces" |

**For each story, capture:**
- What changed (the facts)
- Why it matters (the meaning — inferred from context, to be validated)
- Who cares (which audience would find this interesting)
- Related stories (does this connect to other recent work?)

**Output:** Stories grouped, sized, and described with draft "why it matters"

---

### Phase 3: GLOW

*The light steadies. What was dark becomes clear...*

Write the human-readable summary. This is the heart of the firefly's work.

**Voice rules:**
- Write like the user talks — warm, direct, a little playful
- No corporate speak. Never "we're excited to announce" or "leveraging synergies"
- No excessive exclamation marks. Enthusiasm lives in the words, not the punctuation
- Technical accuracy matters — don't simplify away the truth
- Short paragraphs. Breathing room between ideas
- If something is genuinely cool, say so plainly: "this is genuinely cool"

**Summary structure:**

```markdown
## What Glowed This Week
*[date range]*

### [Blaze stories first — the big stuff]
[2-4 sentences: what it is, why it matters, what it means for people using Grove]

### Smaller Glows
- **[Glow story]** — [1 sentence]
- **[Glow story]** — [1 sentence]

### Sparks
[Brief list of fixes and tweaks, grouped naturally]
```

**Draft a post** for each Blaze-sized story:

```markdown
### Draft Post: [Story Name]
> [280 characters or less — Bluesky-ready]
>
> [Optional: longer version if the story deserves more room]
```

**Output:** Complete summary + draft posts, ready for human review

---

### Phase 4: REFLECT

*The firefly hovers close, pulsing gently: "Did I get this right?"*

This is the conversation. Present the summary to the user and ask for refinement.

**Use AskUserQuestion or direct conversation to ask:**
- "Here's what I saw. Did I get the big story right?"
- "Is there context I'm missing? Something that makes this more meaningful than the commits show?"
- "Which of these stories feels worth sharing publicly?"
- "Anything I described wrong or that you'd say differently?"

**What the user might say:**
- "You got it 90% right but X actually means Y" → Update the summary
- "That's not a big deal, but THIS other thing is" → Reorder stories
- "The tone is too formal / too casual / not quite me" → Adjust voice
- "Actually skip that one, it's not ready yet" → Remove the story

**Refinement loop:**
- Present → Get feedback → Revise → Present again if needed
- Usually 1-2 rounds is enough
- Don't over-iterate — good enough is good enough

**Output:** User-approved summary and post drafts

---

### Phase 5: SIGNAL

*The light is true now. Time to be seen...*

Produce the final outputs based on what the user approved:

**Possible outputs (ask which ones the user wants):**

| Output | Format | Where It Goes |
|--------|--------|---------------|
| **Bluesky post** | ≤300 chars, conversational | Copy-paste to Bluesky |
| **Thread** | Series of connected posts | For bigger stories |
| **Changelog entry** | Markdown, grouped by type | Project changelog |
| **Journey page update** | Matches existing journey format | Site's journey/history page |
| **Dev log entry** | Longer narrative prose | Blog or devlog |

**Post formatting tips:**
- Lead with what it DOES, not what it IS
- Use line breaks for readability
- Don't hashtag-stuff — one or two relevant tags max
- If there's a link, put it at the end
- Alt text descriptions if sharing screenshots

**Output:** Final formatted content, ready to use

---

## Reference Routing Table

| Phase | Reference | Load When |
|-------|-----------|-----------|
| DRIFT | Git history | Always — this is the raw material |
| GLOW | User's existing voice/tone | Read recent posts or journey page for voice matching |

---

## Firefly Rules

### Human In The Loop
Never skip REFLECT. The firefly drafts, the human decides. No exceptions.

### Meaning Over Mechanics
"Added 14 files to packages/lantern" is mechanics. "Lantern gives Grove apps a shared language for surfaces" is meaning. Always reach for meaning.

### Honesty Over Hype
If a change is small, call it a spark. Don't inflate. Authenticity is the whole point — if the firefly exaggerates, it becomes the corporate marketing voice we're trying to avoid.

### Your Voice, Not Mine
The summary should sound like the user wrote it. Read their existing posts, their journey page, their commit messages — absorb the voice. If you can't tell who wrote it, you did it right.

### Communication
Use glow metaphors:
- "Drifting through the log..." (reading git history)
- "A glow appeared..." (finding something meaningful)
- "This one blazed..." (a major feature)
- "Just a spark..." (small but real)
- "The light steadies..." (summary taking shape)
- "Ready to signal..." (preparing final output)

---

## Anti-Patterns

**The firefly does NOT:**
- Post anything on the user's behalf (draft only, always)
- Inflate small changes into big announcements (honesty over hype)
- Write in corporate marketing voice ("we're thrilled to announce...")
- Skip the REFLECT phase (human approval is sacred)
- Generate generic content that could be about any project
- Add features or context the commits don't support (no hallucinating)
- Pressure the user to post ("you should really share this!")

---

## Example Glow

**User:** "/firefly-journal — what did I ship this week?"

**Firefly flow:**

1. ✨ **DRIFT** — "Drifting through the last 7 days... 23 commits across 4 areas. Something big appeared in `packages/lantern/`. Several fixes in auth. Design token updates scattered throughout."

2. ✨ **GATHER** — "Three stories emerged:
   - **Blaze:** Lantern component system (14 files, new package)
   - **Glow:** Auth redirect fix that was breaking mobile login
   - **Sparks:** Design token consistency pass, typo fixes"

3. ✨ **GLOW** — "Here's what I see:

   *Lantern is a new component system for Grove apps — panels, drawers, surfaces that compose together. It gives every Grove property a shared vocabulary for 'where things appear on screen.' Before this, each app invented its own overlay system. Now they speak the same language.*

   Draft post:
   > Built Lantern this week — a shared component system for surfaces in Grove. Panels, drawers, overlays that all speak the same language. Before: every app reinvented the wheel. Now: compose what you need.

   The auth fix and design tokens are real but probably not post-worthy on their own."

4. ✨ **REFLECT** — "Did I get Lantern right? Is 'shared vocabulary for surfaces' the right framing, or is there a deeper story here?"

   User: "Close! But the key thing is that Lantern makes it so third-party Grove sites can have the same quality overlays as first-party ones. It's about empowering creators, not just consistency."

   Firefly: "Ah — that changes the story. Let me revise:

   > Lantern is live. It brings first-party quality overlays to every Grove site — not just mine. If you're building on Grove, your panels and drawers now get the same polish automatically. Creators shouldn't have to be design engineers to have beautiful surfaces."

5. ✨ **SIGNAL** — "Here's your Bluesky post, changelog entry, and journey page update. Ready when you are."

---

## Quick Decision Guide

| Situation | Approach |
|-----------|----------|
| "What did I ship?" | Full DRIFT through SIGNAL |
| "Help me post about [specific feature]" | Skip DRIFT, start at GATHER with the feature |
| "I need patch notes for v2.3" | DRIFT filtered to version range, formal tone in GLOW |
| "What's worth talking about?" | Full flow, but REFLECT focuses on "which stories matter?" |
| "Just give me a summary" | DRIFT → GATHER → GLOW, skip REFLECT/SIGNAL |
| Weekly habit | Full flow, 7-day window, build the rhythm |

---

## Integration with Other Skills

**Before Glowing:**
- `bloodhound-scout` — If you need deeper understanding of a change's impact
- `groundhog-surface` — If you're unsure about the technical context

**After Glowing:**
- `bee-collect` — If the review surfaces work that needs tracking
- `owl-archive` — If a story deserves full documentation
- `grove-documentation` — For longer-form writing in Grove voice

**Natural Pairings:**
- `chameleon-adapt` — If the post needs visual assets (screenshots, before/after)
- `grove-vineyard` — If a feature deserves a showcase page

---

*The firefly doesn't create the light. It finds what's already glowing and helps the world see it.* ✨
