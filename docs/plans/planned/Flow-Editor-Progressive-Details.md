# Flow Editor — Progressive Details Migration

> **Status:** Planned
> **Filed:** 2026-02-13
> **Priority:** High — Core authoring experience
> **Affects:** `/arbor/garden/new`, `/arbor/garden/edit/[slug]`
> **Related:** Arbor panel work, GroveSwap term system
>
> _"A blank page should feel like an invitation, not a form."_

---

## Overview

The current bloom editor (create and edit) forces authors through a 280px metadata sidebar before they've even written a word. Title, slug, description, tags, cover image, font, date, status — all staring back at you, demanding attention. For a platform that's supposed to feel like a midnight tea shop, this is more like a tax return.

**The migration:** Move from a sidebar metadata panel to an inline progressive disclosure layout where the editor is the star and details are available but never in the way.

### The Problem

- The metadata sidebar eats 280px on every screen, shrinking the editor
- On create, you face 8+ empty form fields before you've typed a single word
- The sidebar conflates "write something" with "configure everything"
- Drafts currently require title, slug, and content — but a draft can be _anything_, even a single word
- Mobile experience suffers from the sidebar-to-column collapse

### The Solution

**Inline progressive disclosure.** Title lives above the editor as a natural heading. Everything else hides behind a single "Add details" strip that reveals metadata fields on demand. Drafts save with zero validation. Publishing gates on title + content.

---

## The Vision

```
┌──────────────────────────────────────────────────┐
│  ← Back to Garden              [Save] [Publish]  │
├──────────────────────────────────────────────────┤
│                                                  │
│  Untitled                                        │  ← Big, clean, heading-style input
│  ─────────────────────────────────────────────── │
│                                                  │
│  ▸ Add details                                   │  ← Collapsed by default
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │                                              ││
│  │            Markdown Editor                   ││  ← Full width, all the room
│  │            (the whole point)                 ││
│  │                                              ││
│  │                                              ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  [Show Vines]                                    │  ← Stays separate (gutter toggle)
└──────────────────────────────────────────────────┘
```

**When "Add details" is expanded:**

```
│  Untitled                                        │
│  ─────────────────────────────────────────────── │
│                                                  │
│  ▾ Add details            cover image · 3 tags   │  ← Summary hints when populated
│  ┌──────────────────────────────────────────────┐│
│  │  Description   [________________________________] │
│  │  Cover Image   [________________________________] │
│  │  Tags          [________________________________] │
│  │  Slug          [________________________________] │
│  │  Font          [Default              ▾        ] │
│  │  Date          [2026-02-13                    ] │
│  └──────────────────────────────────────────────┘│
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │            Markdown Editor                   ││
```

---

## Gathering Migration Report

### 🐕 Bloodhound — Territory Mapped

**Files scouted:**

| File                                              | Purpose              | Lines |
| ------------------------------------------------- | -------------------- | ----- |
| `routes/arbor/garden/new/+page.svelte`            | Create bloom page    | ~450  |
| `routes/arbor/garden/edit/[slug]/+page.svelte`    | Edit bloom page      | ~500  |
| `routes/arbor/garden/edit/[slug]/+page.server.ts` | Edit server load     | ~60   |
| `routes/api/blooms/+server.ts`                    | POST create API      | ~200  |
| `routes/api/blooms/[slug]/+server.ts`             | PUT/DELETE/GET API   | ~250  |
| `components/admin/MarkdownEditor.svelte`          | Editor component     | ~800  |
| `components/admin/GutterManager.svelte`           | Vines/gutter sidebar | ~400  |

All paths relative to `packages/engine/src/`.

**Data relationships mapped:**

- Create page → POST `/api/blooms` → D1 `posts` table
- Edit page → PUT `/api/blooms/{slug}` → D1 `posts` table
- Both pages share: `MarkdownEditor`, `GutterManager`, `GlassCard`, toast, api util
- Both use Svelte 5 runes (`$state`, `$effect`, `$derived`)
- Both persist UI prefs to `localStorage` (details collapsed, gutter visible, editor mode)
- Slug auto-generates from title on create (tracks `slugManuallyEdited`)
- Edit page slug is read-only (displayed, not editable)
- Draft auto-save via `useDraftManager` composable (localStorage, 2s debounce)

**Current validation (client-side):**

| Field       | Create                        | Edit      |
| ----------- | ----------------------------- | --------- |
| Title       | Required                      | Required  |
| Slug        | Required (auto-generated)     | Read-only |
| Content     | Required                      | Required  |
| Description | Optional (warns >160 chars)   | Same      |
| Cover image | Optional (URL validated)      | Same      |
| Tags        | Optional                      | Same      |
| Font        | Optional (default: "default") | Same      |
| Date        | Optional (default: today)     | Same      |

**Current validation (API-side):**

- `title`: required, max 200 chars
- `slug`: required, max 100 chars, sanitized
- `markdown_content`: required, max 1MB
- Other fields: optional with format checks

**Risk assessment:** Low-medium. This is a UI-layer migration. No database schema changes. No API contract changes. The API will need minor relaxation (title/content optional for drafts), but the core data model stays identical.

---

### 🐻 Bear — Migration Plan

#### What Moves

| Element                    | From                           | To                                                           |
| -------------------------- | ------------------------------ | ------------------------------------------------------------ |
| Title input                | Metadata sidebar `.form-group` | Inline heading above editor                                  |
| All other metadata fields  | Metadata sidebar (GlassCard)   | Collapsible "Add details" section                            |
| Status selector            | Metadata sidebar dropdown      | Removed (implicit: save = draft, Publish button = published) |
| Metadata panel (GlassCard) | 280px fixed sidebar            | Deleted entirely                                             |

#### What Stays

| Element                        | Location                           | Change                 |
| ------------------------------ | ---------------------------------- | ---------------------- |
| MarkdownEditor                 | Main editor area                   | Now full width         |
| GutterManager / Vines toggle   | Below editor                       | No change              |
| Delete dialog (edit)           | Overflow menu                      | No change              |
| Draft auto-save                | localStorage via `useDraftManager` | No change              |
| Unsaved changes warning (edit) | `beforeunload` handler             | No change              |
| Error banner (create)          | Above content                      | Repositioned if needed |
| View Live link (edit)          | Header actions                     | No change              |

#### What's New

| Feature                      | Description                                           |
| ---------------------------- | ----------------------------------------------------- |
| Untitled draft naming        | Sequential: "Untitled", "Untitled 2", "Untitled 3"... |
| Publish-time validation gate | Title + content required only on publish, not save    |
| Details summary strip        | Shows populated metadata at a glance when collapsed   |
| Zero-validation draft save   | Drafts save with no required fields at all            |

---

## Detailed Design

### 1. Inline Title

A large, clean input styled as a heading. No label, no border — just a placeholder that says "Untitled" and gets out of the way.

```svelte
<input
  type="text"
  class="inline-title"
  bind:value={title}
  placeholder="Untitled"
  aria-label="Post title"
/>
```

**Styling:**

```css
.inline-title {
  font-size: 2rem;
  font-weight: 700;
  font-family: var(--font-heading, "Lexend", sans-serif);
  border: none;
  background: transparent;
  width: 100%;
  padding: 0.25rem 0;
  outline: none;
  color: var(--text-primary);
}

.inline-title::placeholder {
  color: var(--text-muted);
  opacity: 0.5;
}

.inline-title:focus {
  border-bottom: 2px solid var(--grove-accent, var(--color-green-400));
}
```

**Slug behavior:** Same `$effect` as today — auto-generates from title unless manually edited. On edit page, slug display moves into the details section (read-only).

### 2. Add Details Section

A collapsible strip between the title and editor. Collapsed by default on create. Persists state to `localStorage` under `"editor-details-collapsed"` (same key as today, so existing user prefs carry over).

**Collapsed state:**

```svelte
<button class="details-toggle" onclick={() => detailsExpanded = !detailsExpanded}>
  <ChevronRight class={detailsExpanded ? 'rotated' : ''} />
  <span class="details-label">Add details</span>
  {#if detailsSummary}
    <span class="details-summary">{detailsSummary}</span>
  {/if}
</button>
```

**Summary generation:**

```typescript
let detailsSummary = $derived(() => {
  const parts: string[] = [];
  if (featuredImage) parts.push("cover image");
  if (description.trim()) parts.push("description");
  const tagCount = parseTags(tagsInput).length;
  if (tagCount > 0) parts.push(`${tagCount} tag${tagCount > 1 ? "s" : ""}`);
  if (slug && slugManuallyEdited) parts.push("custom slug");
  if (font && font !== "default") parts.push(font);
  return parts.join(" · ");
});
```

**Expanded state:** Contains the same form fields as the current sidebar, laid out horizontally in a responsive grid instead of a vertical stack. Two columns on desktop, single column on mobile.

```css
.details-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1rem 0;
}

@media (max-width: 768px) {
  .details-fields {
    grid-template-columns: 1fr;
  }
}

/* Description and cover image span full width */
.details-fields .field-description,
.details-fields .field-cover {
  grid-column: 1 / -1;
}
```

**Fields in the details section:**

1. **Description** — textarea, full width, same char counter (120-160 target)
2. **Cover image** — URL input + preview, full width
3. **Tags** — comma-separated input + tag preview badges
4. **Slug** — text input (create: editable, edit: read-only display)
5. **Font** — dropdown selector (same grouped options)
6. **Date** — date picker (default: today)

**Not in the details section:** Status selector is removed entirely. Status is implicit — the Save button saves as draft, the Publish button publishes.

### 3. Untitled Draft Naming (Sequential)

When saving a draft without a title, we auto-generate "Untitled", "Untitled 2", "Untitled 3", etc.

**Client-side (before API call):**

```typescript
async function getNextUntitledName(): Promise<string> {
  // Fetch existing posts to check for naming conflicts
  // This uses the garden list data already available or a lightweight API call
  const baseName = "Untitled";

  // Check existing untitled posts
  let counter = 0;
  let candidate = baseName;

  while (existingTitles.has(candidate)) {
    counter++;
    candidate = `${baseName} ${counter + 1}`;
  }

  return candidate;
}
```

**Slug generation for untitled posts:**

```typescript
// "Untitled" → "untitled"
// "Untitled 2" → "untitled-2"
// "Untitled 3" → "untitled-3"
// Normal slug generation handles this naturally
```

**When the title is set later:** If the user types a real title after saving an untitled draft, the slug updates (if not manually edited) on the next save. The title replaces "Untitled N" — it's not permanent.

**Implementation approach:** The create page will need to know existing post titles to find the next available number. Options:

- **Option A:** Fetch existing untitled posts count from the garden list page data at load time
- **Option B:** Let the API handle it — send empty title, API assigns sequential untitled name and returns it
- **Recommended: Option B** — the API already has the D1 context and can query efficiently:

```sql
SELECT title FROM posts
WHERE tenant_id = ? AND title LIKE 'Untitled%'
ORDER BY title;
```

The API parses the highest number and returns the next one. Client receives the assigned title in the response and updates local state.

### 4. Save vs. Publish Split

**Header actions restructured:**

```
Create page:   [Save Draft]  [Publish]
Edit (draft):  [Save]        [Publish]
Edit (pub):    [Save]        [Unpublish]
```

**Save (draft):**

- No validation. None.
- If title is empty → API assigns sequential "Untitled N"
- If content is empty → sends empty string (API accepts it)
- Slug auto-generated from title (or from "Untitled N" if title was empty)
- Status: always `"draft"`
- On success: redirect to edit page (create), show success toast (edit)

**Publish:**

- Validates title + content are non-empty
- If details section is collapsed and either is empty, expand the section
- Focus the first problem field (title input if no title, or show toast about content)
- If title is still "Untitled N", that's fine — it's a valid title if the user chose it
- Status: `"published"`
- Runs full current server validation (max lengths, URL format, etc.)

**Unpublish (edit only):**

- Same as current `handleStatusToggle` for draft transition
- No validation needed (drafts can be anything)

### 5. API Changes

**POST `/api/blooms` — relaxed for drafts:**

```typescript
// Current: title, slug, markdown_content all required
// New: only status is required

if (status === "published") {
  // Full validation (same as today)
  if (!title?.trim()) return error(400, "Title required");
  if (!markdown_content?.trim()) return error(400, "Content required");
} else {
  // Draft: generate defaults for missing fields
  if (!title?.trim()) {
    title = await getNextUntitledTitle(db, tenantId);
  }
  if (!slug?.trim()) {
    slug = generateSlug(title);
  }
  // markdown_content can be empty string for drafts
  if (!markdown_content) {
    markdown_content = "";
  }
}
```

**PUT `/api/blooms/{slug}` — same pattern:**

```typescript
if (status === "published") {
  // Full validation
  if (!title?.trim()) return error(400, "Title required to publish");
  if (!markdown_content?.trim())
    return error(400, "Content required to publish");
}
// Drafts: accept whatever comes in
```

**New helper function:**

```typescript
async function getNextUntitledTitle(
  db: D1Database,
  tenantId: string,
): Promise<string> {
  const result = await db
    .prepare(
      "SELECT title FROM posts WHERE tenant_id = ? AND title LIKE 'Untitled%'",
    )
    .bind(tenantId)
    .all();

  const existingNumbers = result.results
    .map((r) => r.title as string)
    .map((t) => {
      if (t === "Untitled") return 1;
      const match = t.match(/^Untitled (\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);

  if (existingNumbers.length === 0) return "Untitled";

  const maxNumber = Math.max(...existingNumbers);
  return `Untitled ${maxNumber + 1}`;
}
```

### 6. Layout Structure (Both Pages)

**Before (current):**

```
.editor-layout (flex row)
├── .metadata-panel (280px fixed, GlassCard)
│   └── 8 form fields in vertical stack
├── .editor-main (flex: 1)
│   └── MarkdownEditor
└── .gutter-section (conditional, 300px)
    └── GutterManager
```

**After (new):**

```
.editor-layout (flex column)
├── .inline-title
│   └── <input> styled as heading
├── .details-strip
│   ├── toggle button with summary
│   └── .details-fields (collapsible grid)
├── .editor-main (full width)
│   └── MarkdownEditor
└── .gutter-section (conditional)
    └── GutterManager
```

**CSS changes:**

- `.editor-layout` switches from `flex-direction: row` to `column`
- `.metadata-panel` class and its 280px width: **deleted**
- `.editor-main` gets full width by default
- No sidebar gap to worry about
- Gutter toggle stays below editor as-is

### 7. Edit Page — Additional Considerations

**Slug display:** Moves into the details section as a read-only display field (same `.slug-display` div, just relocated).

**Status badge:** Stays in the header area, next to the page title/back link. Shows "Draft" or "Published" as a visual indicator.

**Metadata info** (`last_synced`, `updated_at`): Moves to the bottom of the details section, visible when expanded.

**Dirty check:** The `hasUnsavedChanges` derived state stays exactly the same — it compares current form values against `data.post.*`.

**Default details state on edit:** Collapsed (same as current sidebar default for edit page). Users who already have this preference in localStorage keep their choice.

---

## Phases

### Phase 1: Layout Migration (Create Page)

**Files modified:**

- `routes/arbor/garden/new/+page.svelte` — Full rewrite of layout structure

**Steps:**

1. Remove the `GlassCard` metadata sidebar
2. Add inline title input above editor
3. Build the "Add details" collapsible section with all metadata fields
4. Restructure header actions (Save Draft + Publish)
5. Remove status dropdown (drafts are implicit)
6. Update `handleSave` to skip validation for drafts
7. Wire up slug auto-generation from inline title
8. Add details summary strip
9. Update CSS: delete sidebar styles, add inline/details styles
10. Update responsive breakpoints

**Estimated scope:** ~200 lines changed in the page component, mostly structural moves rather than logic changes.

### Phase 2: Layout Migration (Edit Page)

**Files modified:**

- `routes/arbor/garden/edit/[slug]/+page.svelte` — Same layout restructure

**Steps:**

1. Remove the `GlassCard` metadata sidebar
2. Add inline title input (pre-populated from data)
3. Build the "Add details" section (same component structure as create)
4. Move slug display into details section (read-only)
5. Move metadata info (timestamps) into details section
6. Restructure header actions (Save + Publish/Unpublish)
7. Remove status dropdown
8. Update `handleSave` to skip validation for drafts
9. Keep dirty checking, unsaved warning, delete dialog
10. Update CSS to match create page

**Estimated scope:** ~200 lines changed, same structural approach.

### Phase 3: API Relaxation + Untitled Drafts

**Files modified:**

- `routes/api/blooms/+server.ts` — POST handler validation
- `routes/api/blooms/[slug]/+server.ts` — PUT handler validation

**Steps:**

1. Add `getNextUntitledTitle()` helper function
2. Relax POST validation: only require fields when `status === "published"`
3. Auto-generate title and slug for untitled drafts
4. Relax PUT validation: same pattern
5. Ensure empty `markdown_content` is stored as empty string (not null)
6. Update word count / reading time to handle empty content gracefully

**Estimated scope:** ~60 lines added/modified across both API files.

### Phase 4: Polish & Edge Cases

**Steps:**

1. Test untitled draft sequential numbering (create 3 untitled, delete middle, create another — should get next sequential)
2. Test publish gate (expand details, focus title, show error)
3. Test mobile responsive layout
4. Verify localStorage preference migration (existing `"editor-details-collapsed"` key works)
5. Verify draft auto-save still works with new layout
6. Test GroveSwap terms render correctly in new locations
7. Verify Vines/Gutter toggle still works independently
8. Accessibility pass: keyboard navigation through inline title → details toggle → editor

---

## Edge Cases

| Scenario                                  | Behavior                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| Save with no title, no content            | Creates "Untitled" draft with empty content                                        |
| Save with no title, has content           | Creates "Untitled N" draft with content                                            |
| Already have "Untitled" and "Untitled 2"  | Next untitled becomes "Untitled 3"                                                 |
| Delete "Untitled 2", create new untitled  | Gets "Untitled 3" (always increments from max, doesn't reuse)                      |
| Rename "Untitled" to real title           | Slug regenerates on save (if not manually edited)                                  |
| Publish with empty title                  | Details section expands, title input focuses, toast: "Title required to publish"   |
| Publish with title but no content         | Toast: "Content required to publish"                                               |
| Publish untitled post titled "Untitled 3" | Allowed — if the user chose to keep that title, it's valid                         |
| Edit published post, clear title, save    | Title stays required for published posts (validation on PUT when status=published) |
| Mobile: details expanded                  | Single column grid, full width, scrollable                                         |
| Slug conflict on untitled                 | Handled by existing 409 conflict response + client retry                           |

---

## What We're NOT Changing

- Database schema (no migrations needed)
- API response format
- MarkdownEditor component internals
- GutterManager component
- Draft auto-save mechanism
- Authentication/authorization flow
- Tier enforcement logic
- Cache invalidation patterns
- GroveSwap term system
- Image upload flow
- Fireside/Scribe graft integrations

---

## Rollback Plan

The old sidebar layout can be restored by reverting the two page components (create + edit). The API changes are additive (relaxing validation), not destructive. No data migration needed in either direction.

---

## Success Criteria

- [ ] Create page loads with just a title input and editor — no sidebar
- [ ] Typing a word and hitting Save works with zero other fields
- [ ] Three consecutive untitled saves produce "Untitled", "Untitled 2", "Untitled 3"
- [ ] "Add details" expands to show all current metadata fields
- [ ] Summary strip shows populated field hints when collapsed
- [ ] Publish validates title + content and expands details if needed
- [ ] Edit page has same layout with pre-populated fields
- [ ] Slug is read-only on edit, displayed in details section
- [ ] Mobile layout is clean single-column
- [ ] Keyboard navigation: Tab from title → details toggle → editor works
- [ ] Existing localStorage preferences for collapse state carry over
- [ ] `gw ci --affected --fail-fast` passes clean

---

_A blank page should feel like an invitation. Now it does._ 🌲
