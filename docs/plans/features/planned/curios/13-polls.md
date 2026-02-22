---
title: "Curio: Polls"
status: planned
category: features
---

# Curio: Polls

> Extracted from Curio Safari expedition plan. Agent-handoff ready.
> **Safari status**: Full treatment
> **Source**: `docs/plans/planned/curio-safari.md`, Section 13

---

**Character**: Community voice. The town square question box. Low friction, high delight. The moment after you vote and the results animate in — that's the magic.

### Critical finding: Public component is READ-ONLY

The `CurioPoll.svelte` component has **no voting UI**. No buttons, no radio inputs, no checkboxes, no submit. It fetches a poll and renders result bars — that's it. You cannot vote. Additionally:

- Type mismatch: component expects `resultsVisibility: 'public' | 'private'` but shared lib defines 4 states
- No `description` field rendered
- The `hasVoted` check works but only shows a "✓ You voted" footer — it never gates the results view
- Uses `rgba(0,0,0,0.02)` backgrounds — the familiar gray nothingness

### Design spec (safari-approved)

**Voting experience: Inline vote + reveal**

- Options appear as clickable glass chips/buttons (radio-style for single, toggle-style for multiple)
- Click to select, then confirm with a "Cast vote" button
- On submit: options animate into result bars with count-up effect. One smooth transition, no reload.
- Satisfying reveal moment — the bars grow from 0 to final width, numbers tick up

**Pre-vote state: Gentle hint**

- Before voting, show options with very faint ghost result bars behind them (~5% opacity)
- You can sense the trend but can't read exact numbers — creates intrigue
- Total votes shown: "47 votes so far" (social proof without revealing leader)
- After voting, ghost bars solidify into full results with animated transition

**Poll container: Owner's choice (3 styles)**

- **Glass card**: Frosted glass with grove-green accent on question. Consistent with Grove system.
- **Bulletin board pin**: Question pinned to cork/glass board, slight rotation, tack visual at top. Indie web energy.
- **Clean minimal**: Light border, subtle background. Content-first, decoration is a whisper.

**Result bars: Grove-tinted glass + nature fill + animated**

- Translucent grove-green bars with subtle depth (glass effect)
- Leading option's bar glows slightly brighter
- Subtle leaf/vine texture or organic gradient — not flat color but living surface
- Bars animate from 0% to final width on reveal, numbers tick up
- Percentages shown alongside vote counts

**Rich options: Emoji + color per option**

- Each option can have an optional emoji prefix AND a custom color
- Result bar tints to match the option's color: "🌸 Spring" gets pink bar, "❄️ Winter" gets ice-blue
- Emoji and color are optional — text-only options work fine

**Closed state: Archive with winner highlight**

- Winning option highlighted with subtle crown/accent glow
- Results remain visible, vote button gone
- "Final results" label with total vote count
- Clear winner, clear closure

### Admin fixes

- [ ] Add close date picker (field exists in data model, not in form)
- [ ] Add pin toggle (field exists, not in form)
- [ ] Add results dashboard — vote counts, percentages, maybe vote timeline
- [ ] Add duplicate poll action (run same question again)
- [ ] Add archive action (hide from public without deleting)
- [ ] Add per-option emoji + color fields in option editor
- [ ] Add poll container style picker (glass/bulletin/minimal)

### Public component fixes

- [ ] **BUILD THE VOTING UI** — this is the critical gap
  - Single choice: radio-style glass chips
  - Multiple choice: toggle-style glass chips
  - "Cast vote" confirmation button
  - IP-hash dedup (already in data model)
- [ ] Fix type mismatch: align component types with shared lib's 4 visibility states
- [ ] Implement all 4 results visibility modes (always/after-vote/after-close/admin-only)
- [ ] Add pre-vote ghost bars (5% opacity result hint)
- [ ] Add animated count-up reveal on vote submission
- [ ] Render `description` field
- [ ] Render emoji + custom color per option
- [ ] Implement 3 container styles
- [ ] Add closed/archived state with winner highlight
- [ ] Replace hardcoded rgba colors with grove palette
- [ ] Respect `prefers-reduced-motion` (instant bars, no tick-up)
