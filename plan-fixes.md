# Fix Plan for Personal TODOs

## 1. Side Panel Collapsing Animation

**Issue:** The metadata panel (post details) collapses but only works after page refresh; lacks smooth animation.

**Root Cause:** Conditional removal of content (`{#if !detailsCollapsed}`) disrupts CSS width transition because content is removed from DOM instantly.

**Fix:**
- Keep content in DOM but hide with `opacity: 0` and `height: 0` instead of conditional rendering.
- Use CSS `transition` on `max-width`, `opacity`, and `padding` for smooth slide.
- Update CSS for `.metadata-panel.collapsed` to set `max-width: 50px` and `overflow: hidden`.
- Adjust `.panel-content` to have `transition: opacity 0.2s ease`.

**Files to modify:**
- `../AutumnsGrove/src/routes/admin/blog/edit/[slug]/+page.svelte`
- Possibly also the admin blog new page.

## 2. Forest Button (Ambient Sounds) and Overlapping UI

**Issue:** Ambient sounds panel appears only after viewport refresh, overlaps other UI, and forest button does nothing.

**Root Causes:**
- Sound panel may have incorrect `z-index` or positioning.
- Audio files may be missing (`/sounds/forest-ambience.mp3`).
- Panel visibility state may not be properly toggled.

**Fixes:**
- Ensure audio files exist in `static/sounds/`; if not, provide placeholder or disable.
- Adjust `.sound-panel` CSS: increase `z-index` to 2000, ensure it's positioned above other elements.
- Fix `togglePanel` function to properly show/hide panel.
- Add error handling for audio playback failures.

**Files to modify:**
- `packages/engine/src/lib/components/admin/composables/useAmbientSounds.svelte.js`
- `packages/engine/src/lib/components/admin/MarkdownEditor.svelte` (CSS for .sound-panel)

## 3. Gutter Content Button

**Issue:** Toggle button for gutter panel works only after refresh and depends on other sidebars being collapsed.

**Root Cause:** CSS flex layout may cause the gutter panel to be squeezed out when metadata panel is expanded.

**Fix:**
- Ensure `.editor-with-gutter` uses `flex-shrink: 0` for gutter section.
- Adjust `min-width` for gutter panel when collapsed.
- Verify `showGutter` state is correctly toggled and triggers reflow.

**Files to modify:**
- `../AutumnsGrove/src/routes/admin/blog/edit/[slug]/+page.svelte` (CSS for .gutter-section, .editor-with-gutter)

## 4. Overlapping Text Layers in Preview

**Issue:** Multiple text fragments overlap in preview pane (ghost text of "rain", "Fire", etc.).

**Root Cause:** Previous preview content not being cleared; multiple DOM elements stacking due to CSS `position` or `opacity`.

**Fix:**
- Use Svelte `{#key previewHtml}` to force re‑creation of the preview container.
- Add `overflow: hidden` to `.preview-content`.
- Ensure `previewHtml` is properly sanitized and does not contain leftover elements.

**Files to modify:**
- `packages/engine/src/lib/components/admin/MarkdownEditor.svelte` (preview section)

## 5. Toolbar Buttons Freezing Editor

**Issue:** Clicking toolbar buttons causes editor to freeze, requiring browser restart.

**Root Cause:** Likely an infinite loop in `wrapSelection` or `insertAtCursor` due to reactive updates.

**Fix:**
- Review `wrapSelection` and `insertAtCursor` for any recursive state updates.
- Ensure `textareaRef` is not null before manipulating selection.
- Wrap state updates in `$effect` or use `setTimeout` with zero delay to break cycles.
- Add try‑catch to prevent unhandled errors.

**Files to modify:**
- `packages/engine/src/lib/components/admin/MarkdownEditor.svelte` (toolbar functions)

## 6. CSRF Token Error

**Issue:** Submitting post returns "Invalid CSRF token".

**Root Cause:** Mismatch between token in meta tag and server‑side cookie, or token not being sent correctly.

**Fix:**
- Verify that `%sveltekit.locals.csrfToken%` is correctly populated in `app.html`.
- Ensure the API utility reads the meta tag after client‑side navigation (maybe need to re‑query).
- Debug by logging token values on client and server.

**Files to modify:**
- `../AutumnsGrove/src/hooks.server.js` (CSRF token generation)
- `packages/engine/src/lib/utils/api.js` (add debug logging)
- Possibly update the root layout to ensure meta tag is present.

## Implementation Order

1. CSRF token error (blocking)
2. Toolbar freezing (critical)
3. Side panel animation (UI improvement)
4. Overlapping preview (UI bug)
5. Ambient sounds panel (UI bug)
6. Gutter button (UI bug)

## Estimated Effort

- Each fix: 30‑60 minutes.
- Total: 3‑6 hours.

## Next Steps

Approve this plan, then switch to Code mode to implement fixes one by one.