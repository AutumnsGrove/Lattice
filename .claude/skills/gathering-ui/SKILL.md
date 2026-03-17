---
name: gathering-ui
description: The drum sounds. Chameleon and Deer gather for complete UI work. Use when designing interfaces that must be both beautiful and accessible.
---

# Gathering UI 🌲🦎🦌

The drum echoes through the glade. The conductor stands at the clearing's center, orchestrating two very different kinds of attention. The Chameleon arrives with fresh eyes — no preconceptions about what the page should look like, just the spec and the forest's palette. The Deer arrives later, also with fresh eyes — it hasn't watched the CSS being written, so it tests accessibility without unconscious trust. Beautiful and accessible, built by isolated minds.

## When to Summon

- Designing new pages or interfaces
- Implementing complete UI features
- Ensuring visual design meets accessibility standards
- Creating Grove-themed experiences
- When beauty and inclusion must coexist

**IMPORTANT:** This gathering is a **conductor**. It never writes components or audits accessibility directly. It dispatches subagents — one per animal — each with isolated context and an intentional model. The conductor only manages handoffs and gate checks.

---

## The Gathering

```
SUMMON → DISPATCH → GATE → DISPATCH → GATE → VERIFY
  ↓         ↓        ↓        ↓        ↓        ↓
Spec    Chameleon  Check     Deer    Check    Visual
(self)  (sonnet)    ✓      (sonnet)   ✓     Proof
```

### Animals Dispatched

| Order | Animal       | Model  | Role                              | Fresh Eyes?                                     |
| ----- | ------------ | ------ | --------------------------------- | ----------------------------------------------- |
| 1     | 🦎 Chameleon | sonnet | Design UI with Grove aesthetics   | Yes — sees only the UI spec                     |
| 2     | 🦌 Deer      | sonnet | Audit accessibility independently | Yes — sees file list only, not design reasoning |

**Reference:** Load `references/conductor-dispatch.md` for exact subagent prompts and handoff formats

---

### Phase 1: SUMMON

_The drum sounds. The glade awaits..._

The conductor receives the UI request and prepares the dispatch plan:

**Clarify the UI Work:**

- What page/component are we designing?
- What's the emotional tone?
- Which season should it reflect?
- What's the content structure?

**Confirm with the human, then proceed.**

**Output:** UI specification, dispatch plan confirmed.

---

### Phase 2: ADAPT (Chameleon)

_The conductor signals. The Chameleon shifts its colors..._

```
Agent(chameleon, model: sonnet)
  Input:  UI specification only
  Reads:  chameleon-adapt/SKILL.md + references (MANDATORY)
  Output: built components + file list
```

Dispatch a **sonnet subagent** to design and build the UI. The Chameleon receives ONLY the UI specification. It reads its own skill file and executes its full workflow.

**What the Chameleon builds:**

- Svelte components with glassmorphism
- Seasonal color palette integration
- Nature decorations (trees, creatures, weather)
- Mobile-responsive layouts
- Reduced motion support
- GroveTerm components for user-facing terminology

**Handoff to conductor:** File list (every file created/modified), component summary (what was built, glass variants used, seasonal elements).

**Gate check:** Run `gw dev ci --affected --fail-fast` — must compile. If build fails, resume Chameleon.

---

### Phase 3: SENSE (Deer)

_The Deer steps into the glade. It hasn't watched the colors change..._

```
Agent(deer, model: sonnet)
  Input:  UI file list ONLY (not Chameleon's design reasoning)
  Reads:  deer-sense/SKILL.md + references (MANDATORY)
  Output: accessibility report + applied fixes
```

Dispatch a **sonnet subagent** to audit accessibility. The Deer receives ONLY the file list — NOT the Chameleon's design decisions or reasoning. This isolation is intentional: the Deer should test what's rendered, not trust what was intended.

**What the Deer audits:**

- Keyboard navigation (tab order, focus management, escape handling)
- Screen reader compatibility (ARIA labels, semantic HTML, live regions)
- Color contrast (4.5:1 minimum, WCAG AA)
- Touch targets (44px minimum)
- Reduced motion (prefers-reduced-motion respected)
- Focus indicators visible

**Handoff to conductor:** Accessibility report (violations found, fixes applied, WCAG level achieved), updated file list.

**Gate check:** Run `gw dev ci --affected --fail-fast` — must still compile after a11y fixes.

---

### Phase 4: ITERATION (When Deer Finds Issues)

If the Deer's report includes issues it couldn't fix directly (e.g., structural changes needed for keyboard navigation, color scheme changes for contrast):

1. **Resume Chameleon** with Deer's specific findings
2. Chameleon applies fixes
3. Gate check: CI passes
4. **Resume Deer** to re-verify only the changed files
5. Max 2 iterations — then escalate to human

---

### Phase 5: VERIFY

_The glade is complete. But the conductor looks with its own eyes..._

**Component Audit Gate (MANDATORY before page-level verification):**

Before capturing full pages, the conductor audits every component the Chameleon built or modified in isolation using Showroom. This gate catches design token violations, off-grid spacing, missing focus styles, and hardcoded colors that page-level captures miss.

```bash
# For each component built or modified by the Chameleon:
uv run --project tools/glimpse glimpse showroom \
  libs/engine/src/lib/ui/components/[path-to-component].svelte

# For new components, scaffold fixtures first:
uv run --project tools/glimpse glimpse showroom \
  libs/engine/src/lib/ui/components/[path-to-component].svelte --scaffold
```

**All Showroom compliance violations must be resolved before proceeding to page-level Glimpse.** If violations are found, resume the Chameleon with the specific findings.

**Visual Verification (MANDATORY for UI gatherings):**

```bash
# Seed database if not already done
uv run --project tools/glimpse glimpse seed --yes

# Capture across all seasons and themes
uv run --project tools/glimpse glimpse matrix \
  "http://localhost:5173/[page]?subdomain=midnight-bloom" \
  --seasons spring,summer,autumn,winter --themes light,dark --logs --auto

# Interactive verification — click around, verify flows
uv run --project tools/glimpse glimpse browse \
  "http://localhost:5173/[page]?subdomain=midnight-bloom" \
  --do "click navigation, scroll content, interact with elements" \
  --screenshot-each --logs --auto
```

Review every screenshot. If something looks wrong — fix it and capture again.

**Validation Checklist (after visual verification):**

- [ ] Showroom: Every built/modified component passes `glimpse showroom` with no compliance violations
- [ ] Glimpse: Page captured across all target seasons — looks correct
- [ ] Glimpse: Light and dark mode both visually verified
- [ ] Glimpse: No console errors in `--logs` output
- [ ] Chameleon: UI matches Grove aesthetic (verified by screenshot)
- [ ] Chameleon: Glassmorphism readable (verified by screenshot)
- [ ] Chameleon: Mobile responsive
- [ ] Deer: Keyboard navigation works
- [ ] Deer: Screen reader compatible
- [ ] Deer: Color contrast passes (4.5:1)
- [ ] Deer: Reduced motion respected
- [ ] Deer: Touch targets adequate (44px)
- [ ] Both: Grove terminology uses GroveTerm components

**Completion Report:**

```
🌲 GATHERING UI COMPLETE

UI: [Name]

DISPATCH LOG
  🦎 Chameleon (sonnet) — [X components built, Y files created/modified]
  🦌 Deer (sonnet)       — [Z a11y issues found, W fixed]

GATE LOG
  After Chameleon: ✅ compiles clean
  After Deer:      ✅ compiles clean, a11y verified
  Iterations:      [N iterations / none needed]
  Visual:          ✅ Glimpse matrix captured and reviewed
  Final CI:        ✅ gw dev ci --affected passes

ACCESSIBILITY
  Keyboard nav: ✅
  Screen reader: ✅
  Contrast: ✅ [ratios]
  Touch targets: ✅ 44px+
  Reduced motion: ✅
  WCAG level: [AA/AAA]

The glade welcomes all wanderers.
```

---

## Conductor Rules

### Never Do Animal Work

The conductor dispatches. It does not write CSS, build components, or audit accessibility.

### Fresh Eyes Are a Feature

The Deer hasn't watched the Chameleon work. It sees only the rendered result, not the design intent. This isolation catches contrast issues, missing labels, and navigation gaps that a sympathetic observer would miss.

### Gate Every Transition

CI between Chameleon and Deer. Showroom audit on every component after Chameleon. CI after Deer's fixes. Glimpse after everything.

### Visual Proof Required

The conductor MUST capture and review Glimpse screenshots before declaring complete. CI passing is not the same as looking correct.

### Resume, Don't Restart

If iteration is needed, resume existing agents. They have context from their prior work.

---

## Anti-Patterns

**The conductor does NOT:**

- Write components itself
- Let Deer see Chameleon's design reasoning (isolation is the point)
- Skip Glimpse verification ("CI passed so it looks fine")
- Skip the Deer phase ("it's just a small component")
- Declare complete without visual proof

---

_Beautiful and accessible — the forest welcomes all._ 🌲
