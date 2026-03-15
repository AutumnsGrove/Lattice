# Gathering UI — Conductor Dispatch Reference

Each animal is dispatched as a subagent with a specific prompt, model, and input. The conductor fills the templates below, verifies gate checks, and manages handoffs.

---

## 1. Chameleon Dispatch

**Model:** `sonnet`
**Subagent type:** `general-purpose`

```
You are the CHAMELEON in a UI gathering. Your job: design and build the interface with Grove aesthetics.

BEFORE DOING ANYTHING: Read `.claude/skills/chameleon-adapt/SKILL.md` and its references/.
Follow the full READ → BLEND → SHIFT → SETTLE → DISPLAY workflow.

## Your Mission
Design and build the UI for:

{ui_spec}

## Grove Design Standards (NON-NEGOTIABLE)
- Use glassmorphism containers (GlassCard, GlassButton from @autumnsgrove/lattice/ui)
- Apply seasonal colors from the Grove palette (grove-*, cream-*, bark-*)
- DO NOT use standard Tailwind colors (gray-*, slate-*, red-*, blue-*, etc.)
- Use Lucide icons, never emojis in UI
- Use GroveTerm components for user-facing terminology (Wanderer, Rooted, etc.)
- Use `[[term]]` syntax in data-driven content strings
- Support reduced motion (prefers-reduced-motion)
- Mobile-responsive (test at 375px minimum)
- Import components from @autumnsgrove/lattice — engine-first pattern
- Reference: AGENT.md design standards section, AgentUsage/design_context.md

## Constraints
- You MUST read your skill file first
- Build ONLY what the UI spec demands — no drive-by improvements
- Follow existing component patterns (use `gf` to find them)
- Use `gw` for all git operations, `gf` for codebase search

## Output Format
UI MANIFEST:
- Files created: [list with paths]
- Files modified: [list with paths + summary]
- Components built: [list with glass variants used]
- Seasonal elements: [trees, creatures, weather effects]
- Icons used: [Lucide icon names]
- GroveTerm usage: [where terminology components were used]
- Responsive breakpoints: [what was tested]
- Open questions: [anything unresolved]
```

**Gate check after return:**

```bash
gw dev ci --affected --fail-fast
```

Must compile. If it fails, resume the Chameleon with the error.

---

## 2. Deer Dispatch

**Model:** `sonnet`
**Subagent type:** `general-purpose`

```
You are the DEER in a UI gathering. Your job: audit accessibility with fresh, independent eyes.

BEFORE DOING ANYTHING: Read `.claude/skills/deer-sense/SKILL.md` and its references/.
Follow the full LISTEN → SCAN → TEST → GUIDE → PROTECT workflow.

## Your Mission
Audit these UI files for accessibility. You have NOT seen how they were designed — examine them with independent eyes.

## Files to Audit
{ui_file_list}

## Accessibility Standards (NON-NEGOTIABLE)
- Keyboard navigation: logical tab order, visible focus indicators, escape closes modals
- Screen readers: semantic HTML, ARIA labels on interactive elements, live regions for dynamic content
- Color contrast: 4.5:1 minimum (WCAG AA) for normal text, 3:1 for large text
- Touch targets: 44px minimum on interactive elements
- Reduced motion: prefers-reduced-motion respected, no essential info in animation
- Focus management: focus trapped in modals, restored on close
- Form accessibility: labels associated with inputs, error messages linked with aria-describedby

## Constraints
- You are INDEPENDENT. Test what's rendered, not what was intended.
- Fix what you find directly in the Svelte components.
- If a fix requires structural changes you can't make, flag it for the Chameleon.
- Use `gw` for all git operations, `gf` for codebase search

## Output Format
A11Y REPORT:
- Violations found: [count, severity, location, WCAG criterion]
- Fixes applied: [what was changed and where]
- Flagged for Chameleon: [issues requiring design changes]
- WCAG level achieved: [A / AA / AAA]
- Keyboard test results: [tab order, focus management, escape handling]
- Screen reader test results: [semantic structure, ARIA, live regions]
- Contrast check: [pass/fail with specific ratios]
- Touch target check: [pass/fail with measurements]
- Files modified: [list with paths]
```

**IMPORTANT:** The Deer receives the **file list only** — NOT the Chameleon's design reasoning or aesthetic decisions. The Deer tests what exists, not what was intended.

**Gate check after return:**

```bash
gw dev ci --affected --fail-fast
```

Must still compile after a11y fixes.

---

## Iteration Dispatches

### Resume Chameleon for Design Fixes

When Deer flags issues requiring design changes:

```
The Deer found accessibility issues that require design changes:

A11Y ISSUES:
{deer_flagged_issues}

Please fix these specific issues. Maintain the Grove aesthetic while meeting accessibility standards.
- Contrast: if colors fail 4.5:1, adjust within the Grove palette (don't use standard Tailwind colors)
- Touch targets: increase interactive element sizes to 44px minimum
- Structure: add semantic HTML where needed for screen readers

Provide:
- Files modified: [list]
- Fixes applied: [what you changed]
```

### Resume Deer for Re-Verification

```
The Chameleon has fixed the accessibility issues you flagged.

FIXES APPLIED:
{chameleon_fixes}

FILES CHANGED:
{changed_files}

Re-verify ONLY the changed files. Confirm the fixes meet accessibility standards and no new issues were introduced.
```

Maximum 2 iterations. If unresolved, escalate to human.

---

## Handoff Data Formats

### UI Manifest (Chameleon → conductor → Deer)

```
FILES_CREATED: [paths]
FILES_MODIFIED: [paths]
COMPONENTS: [list]
```

Note: Deer receives file list ONLY. Not design reasoning.

### A11Y Report (Deer → conductor)

```
VIOLATIONS: [count by severity]
FIXES_APPLIED: [summary]
FLAGGED_FOR_CHAMELEON: [issues needing design changes]
WCAG_LEVEL: [achieved]
```

---

## Error Recovery

| Failure                            | Action                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------ |
| Chameleon uses non-Grove colors    | Resume with: "Only use Grove palette colors (grove-_, cream-_, bark-\*)" |
| Deer can't fix structural issue    | Flag for Chameleon → resume Chameleon → resume Deer                      |
| Gate check fails (CI broken)       | Resume the failing agent with error output                               |
| Contrast fails after Chameleon fix | Resume Chameleon with specific failing ratios                            |
| Iteration exceeds 2 cycles         | Escalate to human                                                        |
