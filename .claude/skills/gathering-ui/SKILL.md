---
name: gathering-ui
description: The drum sounds. Chameleon and Deer gather for complete UI work. Use when designing interfaces that must be both beautiful and accessible.
---

# Gathering UI 🌲🦎🦌

The drum echoes through the glade. The Chameleon shifts its colors, painting the forest with glass and light. The Deer senses what others cannot see, ensuring every path is clear. Together they create spaces that welcome all wanderers—beautiful to behold, accessible to all.

## When to Summon

- Designing new pages or interfaces
- Implementing complete UI features
- Ensuring visual design meets accessibility standards
- Creating Grove-themed experiences
- When beauty and inclusion must coexist

---

## Grove Tools for This Gathering

Use `gw` and `gf` throughout. Quick reference for UI work:

```bash
# Find existing UI patterns and components
gf --agent search "GlassCard|GlassButton"  # Find glass component usage
gf --agent glass                    # Find glassmorphism patterns
gf --agent store                    # Find store usage (season, theme)
gf --agent routes                   # Understand route structure

# Test UI changes
gw ci --affected                    # Run CI on affected packages
```

---

## The Gathering

```
SUMMON → ORGANIZE → EXECUTE → VALIDATE → COMPLETE
   ↓         ↲          ↲          ↲          ↓
Receive  Dispatch   Animals    Verify   UI
Request  Animals    Work       Design   Complete
```

### Animals Mobilized

1. **🦎 Chameleon** — Design the UI with glassmorphism and seasonal themes
2. **🦌 Deer** — Audit accessibility and ensure inclusive design

---

### Phase 1: SUMMON

_The drum sounds. The glade awaits..._

Receive and parse the request:

**Clarify the UI Work:**

- What page/component are we designing?
- What's the emotional tone?
- Which season should it reflect?
- What's the content structure?

**Scope Check:**

> "I'll mobilize a UI gathering for: **[UI description]**
>
> This will involve:
>
> - 🦎 Chameleon designing with Grove aesthetics
>   - Glassmorphism containers
>   - Seasonal colors and themes
>   - Randomized forests if appropriate
>   - Lucide icons (no emojis)
> - 🦌 Deer auditing for accessibility
>   - Keyboard navigation
>   - Screen reader compatibility
>   - Color contrast
>   - Reduced motion support
>
> Proceed with the gathering?"

---

### Phase 2: ORGANIZE

_The animals take their positions..._

Dispatch in sequence:

**Dispatch Order:**

```
Chameleon ──→ Deer
     │            │
     │            │
Design         Audit
UI             Accessibility
```

**Dependencies:**

- Chameleon must complete before Deer (needs UI to audit)
- May iterate: Deer findings → Chameleon fixes → Deer re-audit

---

### Phase 3: EXECUTE

_The glade transforms..._

Execute each phase by loading and running each animal's dedicated skill:

---

**🦎 CHAMELEON — ADAPT**

Load skill: `chameleon-adapt`

Execute the full Chameleon workflow for [the page/component being designed], applying Grove's glassmorphism, seasonal palette, and nature decorations.
Handoff: complete Svelte components (glass variants, seasonal decorations, GroveTerm usage, mobile-responsive, reduced motion support) → Deer for accessibility audit

---

**🦌 DEER — SENSE**

Load skill: `deer-sense`

Execute the full Deer workflow on everything the Chameleon produced.
If issues are found: return to Chameleon for fixes, then Deer re-audits. Repeat until clean.
Handoff: accessibility-verified components → VALIDATE phase

---

### Phase 4: VALIDATE

_The design stands. Both animals verify — with their own eyes..._

**Visual Verification (mandatory):**

Before checking boxes, actually _look_ at what was built. Use Glimpse to capture and review the rendered result:

```bash
# Prerequisite: seed the database if not already done
uv run --project tools/glimpse glimpse seed --yes

# Capture the page across all seasons and themes
# Local routing uses ?subdomain= for tenant isolation; --auto starts the dev server
uv run --project tools/glimpse glimpse matrix \
  "http://localhost:5173/[page]?subdomain=midnight-bloom" \
  --seasons spring,summer,autumn,winter --themes light,dark --logs --auto

# Browse interactively — verify flows, click targets, scrolling
uv run --project tools/glimpse glimpse browse \
  "http://localhost:5173/[page]?subdomain=midnight-bloom" \
  --do "click navigation, scroll to content, click interactive elements" \
  --screenshot-each --logs --auto
```

Review every screenshot. If something looks wrong — fix it and capture again. The gathering does not declare UI complete without visual proof.

**Validation Checklist (after visual verification):**

- [ ] Glimpse: Page captured across all target seasons — looks correct
- [ ] Glimpse: Light and dark mode both visually verified
- [ ] Glimpse: No console errors in `--logs` output
- [ ] Chameleon: UI matches Grove aesthetic (verified by screenshot)
- [ ] Chameleon: Seasonal theme appropriate (verified by matrix)
- [ ] Chameleon: Glassmorphism readable (verified by screenshot)
- [ ] Chameleon: Mobile responsive
- [ ] Deer: Keyboard navigation works
- [ ] Deer: Screen reader compatible
- [ ] Deer: Color contrast passes (4.5:1)
- [ ] Deer: Reduced motion respected
- [ ] Deer: Touch targets adequate (44px)
- [ ] Both: Grove terminology uses GroveTerm components (not hardcoded)
- [ ] Both: `[[term]]` syntax used in data-driven content strings

**Quality Gates:**

```
Chameleon completes → Glimpse capture → Review screenshots
                                              ↓
                                    Looks correct?
                                       /        \
                                    No            Yes
                                     |             |
                              Chameleon fixes      ↓
                                     |          Deer audits
                              Glimpse re-capture    ↓
                                     |         Issues found?
                                  Repeat        /        \
                                             Yes          No
                                              |            |
                                       Chameleon fixes     ↓
                                              |         Proceed
                                       Deer re-audit
                                              |
                                          Complete
```

---

### Phase 5: COMPLETE

_The gathering ends. A welcoming space awaits..._

**Completion Report:**

```markdown
## 🌲 GATHERING UI COMPLETE

### UI: [Name]

### Animals Mobilized

🦎 Chameleon → 🦌 Deer

### Design Decisions

- **Season:** [spring/summer/autumn/winter/midnight]
- **Decoration Level:** [minimal/moderate/full]
- **Glass Variants Used:** [surface/tint/card/accent]

### Visual Elements

- Randomized forests: [count] trees
- Weather effects: [snow/petals/leaves/none]
- Seasonal birds: [species]
- Icons: Lucide ([list])

### Accessibility Features

- Keyboard navigation: ✅
- Screen reader tested: [VoiceOver/NVDA]
- Color contrast: ✅ [ratios]
- Reduced motion: ✅
- Touch targets: ✅ [44px minimum]

### Files Created

- [Component files]
- [Style files]
- [Accessibility documentation]

### Time Elapsed

[Duration]

_The glade welcomes all wanderers._ 🌲
```

---

## Example Gathering

**User:** "/gathering-ui Create the user profile page"

**Gathering execution:**

1. 🌲 **SUMMON** — "Mobilizing for: User profile page. Personal settings, avatar, bio. Emotional: reflection."

2. 🌲 **ORGANIZE** — "Chameleon designs → Deer audits"

3. 🌲 **EXECUTE** —
   - 🦎 Chameleon: "Autumn theme, glass cards for settings, randomized birch trees, cardinals perched, Lucide icons"
   - 🦌 Deer: "Tab order logical, form labels associated, contrast passes, screen reader announces changes"

4. 🌲 **VALIDATE** — "Visual design matches Grove, all accessibility checks pass"

5. 🌲 **COMPLETE** — "Profile page complete, beautiful and accessible"

---

_Beautiful and accessible—the forest welcomes all._ 🌲
