# Design Token Unification Architecture Plan

## Issue #660: Unify design token system between tokens.css and Tailwind config

---

## 🦅 Architectural Decision

**Chosen Approach: Option 1 (Flatten tokens.css) + Gradual Migration**

Keep `tokens.css` as the **semantic layer** but flatten the variable chain to eliminate cascade failures. Use Tailwind utilities as the **consumer layer**, not the source of truth.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED TOKEN SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐      ┌──────────────────┐                 │
│  │  PRIMITIVE       │      │  SEMANTIC        │                 │
│  │  COLORS          │──────▶│  TOKENS          │                 │
│  │  (HSL values)    │      │  (tokens.css)    │                 │
│  │                  │      │                  │                 │
│  │  --grove-500     │      │  --color-text    │                 │
│  │  --bark-600      │      │  --color-bg      │                 │
│  │  --cream-100     │      │  --color-muted   │                 │
│  └────────┬─────────┘      └────────┬─────────┘                 │
│           │                         │                            │
│           │    ┌──────────────────┐ │                            │
│           └───▶│  TAILWIND        │◀┘                            │
│                │  UTILITIES       │                              │
│                │  (tailwind.config)│                              │
│                │                  │                              │
│                │  text-grove-500  │                              │
│                │  bg-bark-600     │                              │
│                └────────┬─────────┘                              │
│                         │                                       │
│                         ▼                                       │
│                ┌──────────────────┐                             │
│                │  COMPONENTS      │                             │
│                │  (Svelte)        │                             │
│                │                  │                             │
│                │  Use utilities   │                             │
│                │  Or semantic vars│                             │
│                └──────────────────┘                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure Changes

### Modified Files

| File                                        | Change                                                       | Reason                     |
| ------------------------------------------- | ------------------------------------------------------------ | -------------------------- |
| `libs/engine/src/lib/styles/tokens.css`     | **FLATTEN** - Replace `hsl(var(--x))` with direct HSL values | Eliminate cascade failures |
| `libs/engine/src/app.css`                   | Keep as-is (shadcn base)                                     | shadcn compatibility       |
| `libs/engine/tailwind.config.js`            | Update to reference flattened tokens                         | Consistent mapping         |
| `libs/engine/src/lib/ui/tailwind.preset.js` | Merge Grove colors into preset                               | Single Tailwind config     |

### Deleted Files

| File                                       | Reason                                  |
| ------------------------------------------ | --------------------------------------- |
| `libs/engine/src/lib/ui/styles/tokens.css` | Consolidate into main tokens.css        |
| `libs/engine/src/lib/ui/styles/grove.css`  | Merge styles into appropriate locations |

### New Files

| File                       | Purpose                       |
| -------------------------- | ----------------------------- |
| `docs/design/tokens.md`    | Token system documentation    |
| `scripts/verify-tokens.js` | CI check for hardcoded colors |

---

## Migration Phases

### Phase 1: Flatten the Token Bridge (PANNER-STRIKE scope)

**Effort: Medium** | **Risk: Low**

1. Update `tokens.css` to use direct HSL values:

   ```css
   /* BEFORE (broken cascade) */
   --color-text: hsl(var(--foreground));
   --color-text-muted: hsl(var(--muted-foreground));

   /* AFTER (flat, reliable) */
   --color-text: hsl(0 0% 20%);
   --color-text-muted: hsl(25 32% 33%);
   ```

2. Update dark mode values in same file:

   ```css
   .dark {
   	--color-text: hsl(0 0% 94%);
   	--color-text-muted: hsl(25 20% 60%);
   }
   ```

3. Test in Svelte scoped styles to verify cascade works

### Phase 2: Consolidate Grove Tokens (ELEPHANT-BUILD scope)

**Effort: Large** | **Risk: Medium**

1. Merge `lib/ui/styles/tokens.css` colors into flattened `tokens.css`
2. Update `tailwind.preset.js` to include Grove palette
3. Replace all hardcoded hex values in components with semantic tokens
4. Add semantic color mappings:
   ```css
   --color-primary: var(--grove-600);
   --color-secondary: var(--bark-600);
   --color-accent: var(--grove-500);
   ```

### Phase 3: Cleanup & Documentation (PANTHER-STRIKE scope)

**Effort: Small** | **Risk: Low**

1. Delete deprecated token files
2. Update all imports
3. Write token system documentation
4. Add CI check to prevent new hardcoded colors

---

## Recommended Implementation

Based on the scope analysis:

**Phase 1 is PANTHER-STRIKE territory** - surgical, focused, addresses immediate pain point
**Phase 2 is ELEPHANT-BUILD territory** - multi-file, systematic replacement
**Phase 3 is PANTHER-STRIKE territory** - cleanup and docs

---

## Risk Assessment

| Risk                                   | Likelihood | Mitigation                                         |
| -------------------------------------- | ---------- | -------------------------------------------------- |
| Breaking visual appearance             | Medium     | Test in both light/dark modes, compare screenshots |
| Missing edge cases in hardcoded colors | High       | Use grep to find all hex values before/after       |
| shadcn component styling breaks        | Low        | Keep app.css unchanged, only flatten tokens.css    |
| Build/bundle size increase             | Low        | CSS variables don't increase bundle size           |

---

## Success Criteria

- [ ] No variable chains (`hsl(var(--x))` → direct values)
- [ ] All Svelte scoped styles work without `:global(.dark)`
- [ ] Dark mode toggle works consistently across all components
- [ ] Zero hardcoded hex values in component files
- [ ] Documented token architecture in `docs/design/tokens.md`
