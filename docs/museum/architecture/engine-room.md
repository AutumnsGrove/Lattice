---
title: The Engine Room
description: Engine-first pattern that prevented 11,925 lines of duplicate code
category: exhibit
exhibitWing: architecture
icon: cog
lastUpdated: '2026-01-22'
---
# The Engine Room

> *The pattern that prevented 11,925 lines of duplicate code.*

---

## What You're Looking At

This exhibit explains the engine-first pattern. Before implementing any utility, component, or pattern in an app, check if the engine already has it. If not, add it to the engine first, then import it.

---

## The Rule

```
1. CHECK: Does the engine already have this?
   └── YES → Import from @autumnsgrove/groveengine
   └── NO  → Continue to step 2

2. IMPLEMENT: Add it to the engine FIRST
   └── packages/engine/src/lib/...

3. IMPORT: Then use it from the engine in your app
```

---

## Why It Matters

Grove once accumulated 11,925 lines of duplicate code because apps implemented their own versions instead of using or extending the engine. The engine-first pattern prevents that from ever happening again.

---

## Continue Your Tour

- **[The Loom](./loom.md)** — Next exhibit
- **[Return to Wing](./WING.md)**

---

*This exhibit is under construction. The full tour is coming soon.*
