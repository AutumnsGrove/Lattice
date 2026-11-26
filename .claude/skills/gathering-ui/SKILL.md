---
name: gathering-ui
description: The drum sounds. Chameleon and Deer gather for complete UI work. Use when designing interfaces that must be both beautiful and accessible.
---

# Gathering UI 🌲🦎🦌

_The conductor dispatches one subagent per animal, each with isolated context and an intentional model. It manages handoffs and gate checks — it never does the work itself._

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

**Gate check:** Run the VERIFICATION.md's self-verification protocol — must compile. If build fails, resume Chameleon.

---

### Phase 3: SENSE (Deer)

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

**Gate check:** Run the VERIFICATION.md's self-verification protocol — must still compile after a11y fixes.

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

**Component Audit Gate (MANDATORY before page-level verification):**

Before capturing full pages, check every component the Chameleon built or modified. **Component check.** There is no isolated component harness any more (Showroom was removed in #1654). Capture the page or element where the component renders, then check it against `DESIGN.md`: colour tokens not hardcoded values, spacing on the 4px grid, type from the scale, a visible focus ring, no skipped heading levels, alt text on images. The pre-commit hooks enforce the mechanical subset (accent colours, Prism icons, barrels). Accent surfaces must use `var(--grove-accent-*)` tokens.

```bash
# There is no isolated component harness any more (Showroom was removed in #1654).
# Capture the component where it actually renders, then check it by hand.
bun run glimpse capture "http://localhost:5173/[page]" \
  -S "[component selector]" --season autumn --theme dark
```

**Fix component-level problems before page-level captures.** If you find violations, resume the Chameleon with the specific findings.

**Visual Verification (MANDATORY for UI gatherings):**

```bash
# Seed database if not already done
./scripts/dev-stack.sh seed blog

# Capture across all seasons and themes
bun run glimpse matrix \
  "http://localhost:5173/[page]?subdomain=midnight-bloom" \
  --seasons spring,summer,autumn,winter --themes light,dark --logs

# Interactive flows (clicks, tab order, focus traps) aren't what glimpse does.
# Write a throwaway Playwright script against @playwright/test and screenshot
# at each step; copy the browser setup from tools/glimpse/src/browser.ts.
```

Review every screenshot. If something looks wrong — fix it and capture again.

**Validation Checklist (after visual verification):**

- [ ] Components: every built/modified component checked against `DESIGN.md` (tokens, spacing, focus, headings)
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
  Final CI:        ✅ verification protocol clean

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

**Never Do Animal Work.** The conductor dispatches. It does not write CSS, build components, or audit accessibility.

**Fresh Eyes Are a Feature.** The Deer hasn't watched the Chameleon work. It sees only the rendered result, not the design intent. This isolation catches contrast issues, missing labels, and navigation gaps that a sympathetic observer would miss.

**Gate Every Transition.** CI between Chameleon and Deer. Component checks after the Chameleon. CI after Deer's fixes. Screenshots after everything.

**Visual Proof Required.** The conductor MUST capture and review Glimpse screenshots before declaring complete. CI passing is not the same as looking correct.

**Resume, Don't Restart.** If iteration is needed, resume existing agents. They have context from their prior work.

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
