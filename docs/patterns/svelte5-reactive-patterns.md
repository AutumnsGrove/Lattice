---
title: "Svelte 5 Reactive Patterns"
description: "A guide to reactive patterns ($derived, $state, $effect, untrack) used across the GroveEngine codebase."
category: patterns
icon: pyramid
lastUpdated: "2026-01-22"
---

# Svelte 5 Reactive Patterns

This document explains the reactive patterns used across the GroveEngine codebase and when to use each one.

## Pattern Summary

| Pattern | Use Case | Example Location |
|---------|----------|------------------|
| `$derived()` | Read-only computed values from props | `subscribers/+page.svelte` |
| `untrack()` | One-time initialization from props | `domains/admin/config/+page.svelte` |
| `$effect()` unconditional | Form that resets on navigation | `engine/admin/blog/edit/+page.svelte` |
| `$effect()` conditional | One-time setup with guard | `plant/profile/+page.svelte` |

## Pattern Details

### 1. `$derived()` - Read-only Computed Values

**Use when:** You need a reactive value that's purely derived from props or other reactive sources, never mutated locally.

**Example:**
```typescript
let { data } = $props();
let subscribers = $derived(data.subscribers); // Read-only, reactive to data changes
```

**Files using this pattern:**
- `packages/engine/src/routes/admin/subscribers/+page.svelte`
- Various components with computed values

### 2. `untrack()` - One-time Initialization

**Use when:** You want to capture the initial value of a prop but don't need the local state to update when the prop changes (e.g., settings/config pages).

**Example:**
```typescript
let maxBatches = $state(untrack(() => data.config?.max_batches || DEFAULTS.MAX_BATCHES));
```

**Why:** The user edits these values locally, and you don't want external updates to override their edits while they're working.

**Files using this pattern:**
- `domains/src/routes/admin/config/+page.svelte`
- `domains/src/routes/admin/history/+page.svelte`
- `domains/src/routes/admin/searcher/+page.svelte`

### 3. `$effect()` Unconditional - Form Reset on Navigation

**Use when:** You need the form to completely reset when navigating (e.g., editing different blog posts).

**Example:**
```typescript
let title = $state("");
let content = $state("");

$effect(() => {
  // Always sync when data changes
  title = data.post.title || "";
  content = data.post.markdown_content || "";
});
```

**Why:** When navigating from "Post A" to "Post B", you want the entire form to reset with Post B's data.

**Files using this pattern:**
- `packages/engine/src/routes/admin/blog/edit/[slug]/+page.svelte`

### 4. `$effect()` Conditional - One-time Setup

**Use when:** You only want to initialize once, typically for onboarding/setup flows.

**Example:**
```typescript
let displayName = $state('');

$effect(() => {
  if (data.user?.displayName && !displayName) {
    displayName = data.user.displayName;
  }
});
```

**Why:** This is a one-time profile setup. Once the user starts editing, you don't want to override their changes.

**Files using this pattern:**
- `plant/src/routes/profile/+page.svelte`

## Immutable State Updates

**IMPORTANT:** When using `$state()` with objects or arrays, always use immutable update patterns:

### ✅ Correct (Immutable)
```typescript
let timers = $state<Record<string, number>>({});

// Update using spread
timers = { ...timers, [id]: value };

// Or create new object
const updated = { [id]: value };
timers = { ...timers, ...updated };
```

### ❌ Incorrect (Direct Mutation)
```typescript
let timers = $state<Record<string, number>>({});

// Direct mutation won't trigger reactivity!
timers[id] = value; // ❌ BAD

// Even with forced update, this is error-prone
timers[id] = value;
timers = { ...timers }; // ❌ AVOID
```

**Rationale:** Svelte's reactivity tracks assignments (`=`), not mutations. Direct mutations require manual reassignments, which is error-prone and less clear.

## Pattern Decision Tree

```
Is the value derived from reactive sources and never mutated locally?
├─ YES → Use $derived()
└─ NO  → Is it based on a prop?
    ├─ YES → Does the local value need to update when the prop changes?
    │   ├─ YES → Do you want it to always reset?
    │   │   ├─ YES → Use unconditional $effect()
    │   │   └─ NO  → Use conditional $effect()
    │   └─ NO  → Use untrack()
    └─ NO  → Use $state() with static initial value
```

## Examples from Codebase

### Subscribers Page (Read-only derived)
```typescript
// Read-only list for display
let subscribers = $derived(data.subscribers);

// Used only for reading
const allEmails = subscribers.map(s => s.email).join(', ');
```

### Config Page (One-time capture)
```typescript
// Capture initial config, user edits locally
let maxBatches = $state(untrack(() => data.config?.max_batches || 100));

// User's edits won't be overridden by external updates
```

### Blog Edit Page (Always reset)
```typescript
// Reset form when navigating between posts
let title = $state("");

$effect(() => {
  title = data.post.title || "";
  // Runs every time data.post changes
});
```

### Profile Setup (Initialize once)
```typescript
// Initialize from OAuth data, but only if empty
let displayName = $state('');

$effect(() => {
  if (data.user?.displayName && !displayName) {
    displayName = data.user.displayName;
  }
});
```

## Common Mistakes

### Mistake 1: Math.random() in $derived()
```typescript
// ❌ BAD - regenerates on every reactive update
const id = $derived(filterId ?? `id-${Math.random()}`);

// ✅ GOOD - generate once
const randomId = `id-${Math.random()}`;
const id = $derived(filterId ?? randomId);
```

### Mistake 2: Direct Object Mutation
```typescript
// ❌ BAD - won't trigger reactivity
let timers = $state({});
timers[key] = value;

// ✅ GOOD - immutable update
timers = { ...timers, [key]: value };
```

### Mistake 3: Unnecessary $derived() for Static Data
```typescript
// ❌ BAD - data is static
const items = $derived([
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' }
]);

// ✅ GOOD - just use const
const items = [
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' }
];
```

## References

- [Svelte 5 Runes Documentation](https://svelte.dev/docs/svelte/$state)
- [Svelte 5 Migration Guide](https://svelte.dev/docs/svelte/v5-migration-guide)
