# Prism Icon Resolver — Multi-Pack Architecture Spec

## Context

Issue #1448 (completed) established the Prism icon gateway: 408 icons, 12 semantic groups, one adapter file. But the adapter (`lucide.ts`) conflates two concerns — it's both the **registry** (mapping aliases → Lucide components) AND the **resolver** (Proxy machinery, group exports, config). To add a second icon pack, you'd duplicate all the Proxy logic.

**Goal:** Split into three layers so adding a new pack = one mapping file, swapping packs = one config change. Support per-group and per-icon overrides. Build-time default with runtime swap capability.

**Timeline:** Spec only — implement when a second pack is actually needed. Current system works.

---

## Three-Layer Architecture

```
┌─────────────────────────────────────┐
│         manifest.ts (unchanged)     │  ← Semantic vocabulary
│    "what icons exist"               │     408 aliases across 12 groups
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       registries/                    │  ← One file per icon pack
│    "how to map aliases to           │     Each: manifest value → component
│     this pack's components"         │
│                                     │
│   lucide.ts    phosphor.ts          │
│   tabler.ts    botanical.ts         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         resolver.ts (NEW)           │  ← Proxy machinery + config
│    "which pack is active,           │     Reads config, picks registry,
│     with what overrides"            │     exports navIcons, stateIcons, etc.
└─────────────────────────────────────┘
```

---

## Layer 1: Manifest (unchanged)

`libs/prism/src/lib/icons/manifest.ts` — stays exactly as-is. Pure semantic vocabulary. No pack awareness.

---

## Layer 2: Registries

Each icon pack gets a single mapping file in `libs/prism/src/lib/icons/registries/`.

### Registry contract

Every registry exports one function and a name:

```ts
// registries/lucide.ts
import type { Component } from "svelte";
import * as Lucide from "@lucide/svelte";

/** Resolve a manifest icon name to its Lucide component */
export function resolve(iconName: string): Component | undefined {
  return (Lucide as Record<string, Component>)[iconName];
}

export const packName = "lucide";
```

That's it. No Proxy, no normalize(), no groups. Just: "given a PascalCase name from the manifest, return the component."

### Non-Lucide packs (name mapping)

Manifest values use Lucide PascalCase names (`"Check"`, `"AlertTriangle"`). Other packs have different names. Each non-Lucide registry includes its own crossref:

```ts
// registries/phosphor.ts
import * as Phosphor from "@phosphor-icons/svelte";

const CROSSREF: Record<string, string> = {
  Check: "CheckCircle",
  AlertTriangle: "Warning",
  Loader2: "SpinnerGap",
  ExternalLink: "ArrowSquareOut",
  // ... ~408 mappings
};

export function resolve(iconName: string): Component | undefined {
  const phosphorName = CROSSREF[iconName] ?? iconName;
  return (Phosphor as Record<string, Component>)[phosphorName];
}

export const packName = "phosphor";
```

### Custom/hand-drawn packs

```ts
// registries/botanical.ts
import Sprout from "../custom/botanical/Sprout.svelte";
import Leaf from "../custom/botanical/Leaf.svelte";
// ...

const components: Record<string, Component> = { Sprout, Leaf, ... };

export function resolve(iconName: string): Component | undefined {
  return components[iconName];
}

export const packName = "botanical";
```

---

## Layer 3: Resolver (NEW)

`libs/prism/src/lib/icons/resolver.ts` — owns ALL Proxy machinery and pack selection.

### Config

```ts
// resolver-config.ts
import type { IconGroupName } from "./types.js";

export interface IconPackConfig {
  /** Default pack for all groups */
  default: string;

  /** Per-group overrides */
  groups?: Partial<Record<IconGroupName, string>>;

  /** Per-icon overrides (format: "groupName.alias") */
  icons?: Record<string, string>;
}

export const ACTIVE_CONFIG: IconPackConfig = {
  default: "lucide",
  // groups: { nature: "botanical" },
  // icons: { "tool.reverie": "custom" },
};
```

### Resolution order

When `stateIcons.check` is accessed:

1. **Per-icon:** `config.icons["state.check"]` → specific pack for this icon?
2. **Per-group:** `config.groups.state` → specific pack for this group?
3. **Default:** `config.default` → fallback pack
4. **Resolve:** Call that registry's `resolve("Check")` with the manifest value

### Core resolver logic

The `buildNormalizedMap()` function (currently in `lucide.ts`) moves here, modified to consult config:

```ts
function buildNormalizedMap(
  groupName: IconGroupName,
  group: IconGroupManifest
): Map<string, Component> {
  const map = new Map<string, Component>();

  for (const [alias, iconName] of Object.entries(group)) {
    // Pick pack: per-icon → per-group → default
    const packName =
      _activeConfig.icons?.[`${groupName}.${alias}`] ??
      _activeConfig.groups?.[groupName] ??
      _activeConfig.default;

    const registry = getRegistry(packName);
    const component = registry.resolve(iconName);

    if (component) {
      map.set(normalize(alias), component);
      // Reverse lookup
      const normalizedIcon = normalize(iconName);
      if (!map.has(normalizedIcon)) {
        map.set(normalizedIcon, component);
      }
    }
  }
  return map;
}
```

### Runtime swapping

```ts
let _activeConfig: IconPackConfig = ACTIVE_CONFIG;
const _caches = new Map<string, Map<string, Component>>();

/** Swap icon pack config at runtime. Clears resolved caches. */
export function setIconConfig(config: IconPackConfig): void {
  _activeConfig = config;
  _caches.clear();  // Force lazy re-resolution on next access
}

/** Get current config (for inspection/debugging) */
export function getIconConfig(): IconPackConfig {
  return { ..._activeConfig };
}
```

Enables: seasonal swaps, tenant preferences, A/B testing icon styles.

### Exports (unchanged consumer API)

```ts
export const navIcons = resolveGroup("nav", ICON_MANIFEST.nav);
export const stateIcons = resolveGroup("state", ICON_MANIFEST.state);
// ... all 12 groups + allIcons + resolveIcon + resolveAnyIcon
```

---

## File Structure (final)

```
libs/prism/src/lib/icons/
  manifest.ts           ← unchanged
  types.ts              ← add IconPackConfig, IconRegistry types
  resolver.ts           ← NEW (Proxy machinery + config wiring)
  resolver-config.ts    ← NEW (active pack + overrides)
  index.ts              ← re-exports from resolver.ts (not adapter)
  registries/
    lucide.ts           ← extracted from current adapter
    phosphor.ts         ← future
    tabler.ts           ← future
    botanical.ts        ← future
  adapters/
    lucide.ts           ← DELETED (split into resolver + registries/lucide)
```

---

## What doesn't change

- Consumer imports: `import { stateIcons } from '@autumnsgrove/prism/icons'`
- Template usage: `<stateIcons.check class="w-5 h-5" />`
- Manifest vocabulary: same aliases, same groups
- Pre-commit hook: still blocks bare `@lucide/svelte`
- resolveAnyIcon / resolveIcon: same API

---

## Migration path (when implementing)

1. Create `registries/lucide.ts` — extract just the resolve function from current adapter
2. Create `resolver-config.ts` — `{ default: "lucide" }`
3. Create `resolver.ts` — move Proxy machinery from adapter, add config consultation
4. Update `index.ts` — import from `resolver.ts` instead of `adapters/lucide.ts`
5. Delete `adapters/lucide.ts`
6. All tests pass unchanged — consumer API identical
7. Update pre-commit whitelist: `registries/` replaces `adapters/`

---

## Verification (when implemented)

- All existing Prism + groveicon + blazes tests pass unchanged
- `grep -r "from.*prism/icons" | grep -v node_modules` — same imports work
- Create mock `registries/test.ts`, set `config.groups.nature = "test"` → verify nature icons resolve from test registry
- Per-icon override: `config.icons["tool.reverie"] = "test"` → verify only that icon changes
- Runtime swap: `setIconConfig({ default: "test" })` → verify all icons switch
- Pre-commit hook still blocks bare `@lucide/svelte`
