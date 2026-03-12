---
title: "Flow Developer Guide"
description: "How the immersive Markdown editor works, from modes and drafts to Fireside integration."
category: guides
guideCategory: content-community
lastUpdated: "2026-03-12"
aliases: []
tags:
  - flow
  - editor
  - markdown
  - drafts
  - fireside
  - arbor
---

# Flow Developer Guide

Flow is Grove's Markdown editor. When a Wanderer clicks "New Post" or edits an existing one inside Arbor, they land in Flow. Internally it's a single Svelte 5 component (`MarkdownEditor.svelte`, around 1700 lines) with two composables that handle draft persistence and theming.

This guide covers the architecture, editor modes, draft system, Fireside integration, and the common things that break. If you need the product-facing spec, see `docs/specs/flow-spec.md`.

## How Flow Works

Flow is a `<textarea>`-based editor with a live markdown preview. It renders content through a local `markdown-it` instance configured with `html: false` and `linkify: true`, plus a custom grove directive plugin for curio embeds.

```
MarkdownEditor.svelte
├── FiresideChat.svelte        (conditional, replaces editor area)
├── ContentWithGutter.svelte   (full preview modal with vine support)
├── CurioAutocomplete.svelte   (:: directive autocomplete)
├── PhotoPicker.svelte         (gallery image picker)
├── VoiceInput.svelte          (Scribe transcription)
└── Internal sections:
    ├── Toolbar (formatting, mode switching, zen toggle)
    ├── Editor panel (textarea + line numbers)
    ├── Preview panel (rendered markdown)
    └── Status bar (statistics + state)
```

### Props

The component accepts a `content` bindable, callbacks for saving, and several feature-gate props. The key ones:

| Prop | Type | Purpose |
|---|---|---|
| `content` | `$bindable("")` | The markdown text |
| `onSave` | `() => void` | Server save callback |
| `draftKey` | `string \| null` | localStorage key for draft persistence |
| `grafts` | `Record<string, boolean>` | Feature flags from the tenant |
| `firesideAssisted` | `$bindable(false)` | Whether Fireside generated this content |
| `configuredCurios` | `Array` | Available curios for `::` autocomplete |
| `serverDraftSlug` | `string \| null` | Enables cross-device draft sync when set |

Feature gates are derived from `grafts`:

```js
const wispEnabled = $derived(grafts?.wisp_enabled ?? false);
const firesideEnabled = $derived(grafts?.fireside_mode ?? false);
const scribeEnabled = $derived(grafts?.scribe_mode ?? false);
const uploadsEnabled = $derived(grafts?.image_uploads ?? true);
```

### State Management

Flow uses Svelte 5 runes throughout. The core reactive state:

- `editorMode` ("write" | "split" | "preview") - initialized from localStorage synchronously via an IIFE to prevent flash of wrong mode
- `isZenMode`, `isFiresideMode` - overlay states
- `cursorLine`, `cursorCol` - tracked on every keystroke and click
- `wordCount`, `lineCount`, `readingTime` - `$derived` from content
- `previewHtml` - `$derived` from a debounced copy of content (150ms delay to avoid expensive markdown rendering on every keystroke)

One pattern worth knowing: timers like `debounceTimer` and `draftSaveTimer` are deliberately **not** wrapped in `$state`. Using `$state` for timer handles creates infinite loops because any `$effect` that reads and writes the timer re-triggers itself, which aborts Svelte's flush cycle and breaks `bind:value` on the textarea.

## Editor Modes

Three modes, persisted to localStorage under the key `editor-mode`:

| Mode | What you see | Keyboard |
|---|---|---|
| Write | Full-width textarea with line numbers | `Cmd/Ctrl + 1` |
| Split | 50/50 textarea + rendered preview | `Cmd/Ctrl + 2` |
| Preview | Full-width rendered output, read-only | `Cmd/Ctrl + 3` |

`Cmd/Ctrl + P` cycles through them: Write, Split, Preview, Write.

Mode switching calls `setEditorMode()`, which persists the choice and refocuses the textarea with `preventScroll` to avoid jumping the viewport:

```js
function setEditorMode(mode) {
    editorMode = mode;
    if (browser) {
        localStorage.setItem("editor-mode", mode);
    }
    if (mode !== "preview" && textareaRef) {
        setTimeout(() => textareaRef?.focus({ preventScroll: true }), 50);
    }
}
```

In split mode, scroll sync works by ratio: the textarea's scroll percentage is applied to the preview panel. The editor panel is hidden via CSS in preview mode (not unmounted) to preserve scroll position and cursor state.

### Zen Mode

Toggled with `Cmd/Ctrl + Shift + Enter` or the Focus icon in the toolbar. Zen mode applies a `.zen-mode` class to the container that makes it fill the viewport. It automatically enables typewriter scrolling, which centers the cursor line vertically:

```js
function applyTypewriterScroll() {
    if (!textareaRef || !editorSettings.typewriterMode) return;
    const lineHeight = parseFloat(getComputedStyle(textareaRef).lineHeight) || 24;
    const viewportHeight = textareaRef.clientHeight;
    const centerOffset = viewportHeight / 2;
    const targetScroll = (cursorLine - 1) * lineHeight - centerOffset + lineHeight / 2;
    textareaRef.scrollTop = Math.max(0, targetScroll);
}
```

Press `Escape` to exit. The toolbar and status bar remain visible but faded (30% and 50% opacity respectively, full opacity on hover).

## The Toolbar

The toolbar is a persistent row at the top of the editor. It is hidden entirely when Fireside mode is active. In preview mode, formatting buttons disappear and a "Preview mode (read-only)" hint takes their place.

### Formatting Actions

All formatting operates on the textarea through two helpers:

**`wrapSelection(before, after)`** wraps the current selection. Used for bold (`**`), italic (`_`), inline code (`` ` ``), and links (`[`, `](url)`).

**`insertAtCursor(text)`** inserts text at the cursor position. Used for headings (`# `, `## `, `### `), code blocks, lists (`- `), and blockquotes (`> `).

Both helpers set `isProgrammaticUpdate = true` before modifying content and use `await tick()` to let Svelte update the DOM before repositioning the cursor. This flag prevents `oninput` side effects (cursor tracking, curio autocomplete) from firing during toolbar operations.

To add a new toolbar action:

1. Write a handler function that calls `wrapSelection()` or `insertAtCursor()`
2. Add a button in the `toolbar-left` section with a Lucide icon
3. If it needs a keyboard shortcut, add the binding in `handleKeydown()`

### Mode and View Buttons

The right side of the toolbar has:

- Three mode buttons (PenLine, Columns2, BookOpen icons) with `.active` class on the current mode
- A full preview button (Maximize2) that opens a styled modal with `ContentWithGutter`
- A zen mode toggle (Focus/Minimize2) that switches based on `isZenMode`

### Conditional Buttons

The Fireside button (flame icon) only appears when `wispEnabled && firesideEnabled && !content.trim()`. Once you type anything, it disappears. The Voice Input (Scribe) button appears when `wispEnabled && scribeEnabled` and you're not in preview mode.

## Draft System

Draft persistence is handled by `useDraftManager`, a composable at `libs/engine/src/lib/components/admin/composables/useDraftManager.svelte.ts`.

### How It Works

Drafts save to localStorage under the key `draft:{draftKey}`. The auto-save delay is 5 seconds (`AUTO_SAVE_DELAY = 5000`). Each save stores:

```ts
interface StoredDraft {
    content: string;
    savedAt: string;       // ISO timestamp
    metadata?: {
        title?: string;
        description?: string;
        tags?: string[];
    };
}
```

The save cycle:

1. The auto-save `$effect` in MarkdownEditor calls `draftManager.scheduleSave(content)` whenever `content` changes
2. `scheduleSave()` debounces for 5 seconds, skipping if content matches `lastSavedContent`
3. `saveDraft()` writes to localStorage, then fires a non-blocking server sync

### Server Sync

When `serverDraftSlug` is set, drafts also sync to the server via `PUT /api/drafts/{slug}`. This is additive: localStorage remains the source of truth. Server sync uses a stable device ID (stored in localStorage as `grove-device-id`, generated via `crypto.randomUUID()`) for conflict detection.

On page unload or visibility change, `flushSave()` cancels any pending debounce timer, saves immediately, and fires a `navigator.sendBeacon()` for best-effort server sync that survives page teardown.

### Draft Recovery

On mount, `init()` checks localStorage for an existing draft. If one exists and its content differs from the current content, a restore prompt banner appears:

```
~ Unsaved draft found
  Saved March 12, 2026, 3:42 PM
  [restore]  [discard]
```

The `init()` function guards against re-running with an `initialized` flag. Without this, reactive dependencies could re-trigger it and re-show the banner after a user has already dismissed it.

### Status Indicators

The status bar shows draft state on the right side:

| Status | What it means |
|---|---|
| `Saving draft...` | Writing to localStorage |
| `Draft saved` (with checkmark) | localStorage write succeeded, clears after 2 seconds |
| `Unsaved` | Content differs from last saved version |
| `Syncing...` | Server sync in progress |
| `Synced` | Server sync succeeded |
| `Sync error` | Server sync failed (local draft is safe) |

### Public API

MarkdownEditor exposes three draft methods for parent components:

```js
export function clearDraft() { draftManager.clearDraft(); }
export function flushDraft() { draftManager.flushSave(); }
export function getDraftStatus() { return draftManager.getStatus(); }
```

The parent page (typically the Arbor post editor) calls `flushDraft()` in its `beforeNavigate` handler to prevent data loss during SvelteKit navigation.

## Fireside Integration

Fireside is a conversational writing mode for writers who freeze at the blank page. It's implemented in `FiresideChat.svelte`, which replaces the entire editor area when active.

### Entry Conditions

Fireside requires three things to be true:

1. `wisp_enabled` graft is set
2. `fireside_mode` graft is set
3. The editor content is empty (`!content.trim()`)

If the editor already has content, the Fireside button is hidden and the keyboard shortcut (`Cmd/Ctrl + Shift + F`) does nothing. This is intentional: Fireside is for starting fresh, not augmenting existing work.

### The Flow

FiresideChat uses `GlassChat` (a reusable chat component) with a `createAIChatController`. The conversation lifecycle:

1. Component mounts, calls `startConversation()` which hits `POST /api/grove/wisp/fireside` with `action: "start"`
2. Wisp responds with an opening question and a `conversationId`
3. User messages go through `onSend` which calls the same endpoint with `action: "respond"`
4. The API returns `canDraft: boolean` - once true, the "Ready to draft" button appears
5. Clicking it calls `action: "draft"`, which returns `{ title, content, marker }`
6. User can accept the draft or go back to chatting

### Draft Acceptance

When the user clicks "Use this draft", `handleFiresideDraft` in MarkdownEditor:

```js
function handleFiresideDraft(draft) {
    content = draft.content + "\n\n" + draft.marker;
    if (draft.title) {
        previewTitle = draft.title;
    }
    firesideAssisted = true;
    isFiresideMode = false;
    tick().then(() => { textareaRef?.focus(); });
}
```

The marker (`~ written fireside with Wisp ~`) is appended to the content. The `firesideAssisted` flag is bound to the parent, which stores it in post metadata. This marker cannot be removed at the API level.

## Image Handling

Images can enter Flow through three paths: drag-and-drop, clipboard paste, or the photo picker (gallery button in toolbar).

### Upload Flow

1. File detected (drag, paste, or picker)
2. `normalizeFileForUpload()` checks magic bytes and fixes MIME/extension mismatches
3. HEIC/HEIF files get converted to JPEG via `convertHeicToJpeg()`
4. `POST /api/images/upload` with FormData, folder set to `"blog"`
5. Success: markdown inserted at cursor (`![alt text](url)`)
6. Failure: actionable error message shown in toast and upload status bar

Pasted images get a timestamped filename (`pasted-{timestamp}.{extension}`).

The photo picker handles multi-select: one image inserts `![Photo](url)`, multiple images insert a `::gallery[url1, url2]::` directive.

Upload is gated by the `image_uploads` graft (defaults to `true`). When disabled, a friendly toast explains the limitation.

### Curio Autocomplete

Typing `::` at the start of a line (or after whitespace) triggers curio autocomplete. The `CurioAutocomplete` component shows matching curios from `configuredCurios`. Selecting one replaces the trigger text with the full directive (e.g., `::guestbook::` or `::poll[]::`) and positions the cursor appropriately.

The autocomplete closes on scroll, Escape, or when the query contains non-word characters.

## Keyboard Shortcuts

### Text Formatting

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + B` | Bold (`**text**`) |
| `Cmd/Ctrl + I` | Italic (`_text_`) |
| `Tab` | Insert 2 spaces |

### Editor Control

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + S` | Save to server |
| `Cmd/Ctrl + 1` | Write mode |
| `Cmd/Ctrl + 2` | Split mode |
| `Cmd/Ctrl + 3` | Preview mode |
| `Cmd/Ctrl + P` | Cycle modes |
| `Cmd/Ctrl + Shift + Enter` | Toggle zen mode |
| `Cmd/Ctrl + Shift + F` | Toggle Fireside (when available) |
| `Escape` | Exit zen / Fireside / full preview (in priority order) |

Escape has a priority chain handled by `handleGlobalKeydown`: curio autocomplete first, then photo picker, then Fireside, then zen mode, then full preview modal.

## The Status Bar

The status bar sits at the bottom of the editor. It's hidden in Fireside mode.

Left side: `Ln {cursorLine}, Col {cursorCol} | {lineCount} lines | {wordCount} words | {readingTime}`

Reading time uses 200 words per minute. Under 1 minute shows "< 1 min".

Right side: current mode label ("Source", "Split", or "Preview"), followed by save/draft/sync indicators when relevant.

## Why Things Break

**Draft banner keeps reappearing.** The `init()` function in `useDraftManager` has a guard (`if (initialized) return`). If something causes the mount effect to re-run, a missing guard would re-show the banner. The `untrack(() => content)` call in the mount effect is there for the same reason: reading `content` reactively would make the effect re-trigger on every keystroke.

**Textarea stops updating.** Timer handles (`debounceTimer`, `draftSaveTimer`) must not be `$state`. If they are, any `$effect` that reads/writes the timer creates an infinite loop that aborts Svelte's flush cycle. The textarea's `bind:value` stops working because DOM updates never apply. This has bitten the codebase twice.

**Preview jank during fast typing.** The preview renders from `debouncedContent`, not `content` directly. A 150ms debounce timer prevents markdown-it from running on every keystroke. If you remove this debounce, split mode will stutter on long posts.

**Formatting toolbar changes have no effect.** `isProgrammaticUpdate` gates `oninput` handlers. If a toolbar action forgets to set this flag (or forgets to clear it), cursor tracking and curio autocomplete will either fire during the update (causing position jumps) or stop working entirely.

**Fireside button missing.** Three conditions: `wispEnabled`, `firesideEnabled`, and empty content. Check the tenant's grafts for `wisp_enabled` and `fireside_mode`. Even one character in the editor hides it.

**Editor mode flashes on load.** The mode is initialized synchronously via an IIFE that reads localStorage at declaration time. If you move this to a `$effect`, you'll get a flash of "write" mode before the saved preference loads.

**Image upload silently fails.** Check the `image_uploads` graft. When disabled, `uploadImage()` shows a toast and returns early. The graft defaults to `true`, so this mostly hits new tenants before their grove is fully provisioned.

## Key Files

| File | What it does |
|---|---|
| `libs/engine/src/lib/components/admin/MarkdownEditor.svelte` | Main editor component |
| `libs/engine/src/lib/components/admin/composables/useDraftManager.svelte.ts` | Draft persistence (localStorage + server sync) |
| `libs/engine/src/lib/components/admin/composables/useEditorTheme.svelte.ts` | Editor theme (light/dark CSS variables) |
| `libs/engine/src/lib/components/admin/composables/index.ts` | Composable barrel export |
| `libs/engine/src/lib/components/admin/FiresideChat.svelte` | Fireside conversational writing UI |
| `libs/engine/src/lib/components/admin/CurioAutocomplete.svelte` | `::` directive autocomplete |
| `libs/engine/src/lib/components/admin/PhotoPicker.svelte` | Gallery image picker |
| `libs/engine/src/lib/components/admin/VoiceInput.svelte` | Scribe voice transcription |
| `docs/specs/flow-spec.md` | Product specification |

## Quick Checklist

When modifying Flow:

- [ ] New toolbar actions use `wrapSelection()` or `insertAtCursor()` with the `isProgrammaticUpdate` guard
- [ ] Timer handles are plain variables, not `$state`
- [ ] Draft key format is `draft:{slug}` in localStorage
- [ ] Feature-gated buttons check the relevant graft flag
- [ ] Keyboard shortcuts are added to both `handleKeydown` (textarea-scoped) and `handleGlobalKeydown` (window-scoped) as appropriate
- [ ] Escape priority chain is respected: autocomplete > picker > Fireside > zen > full preview
- [ ] Mode preference persists to localStorage under `editor-mode`
- [ ] Preview rendering uses `debouncedContent`, not `content`
