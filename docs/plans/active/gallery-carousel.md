# Gallery Carousel + Builder

**Issue:** #1590 · **Lands on:** beta first · **Status:** active

A post with several photos should read like one photo with depth: swipe through, tap to see it big. And putting those photos in a post shouldn't take secret knowledge of directive syntax.

Two halves, shipped in a deliberate order:

1. **Rendering** — every `::gallery` becomes a carousel with a lightbox. Goes to **main and beta**, so anything written on beta shows up properly for everyone.
2. **Builder** — a friendly way to make a gallery in the editor. **Beta only.** The interface is the trial; the output isn't.

---

## Decisions

- Lightbox is in v1.
- Collapse the duplicate directive handlers into one. Not optional.
- Extend the syntax to carry alt text and captions.
- Convert everything: every gallery renders as a carousel. Nobody has used the old form in anger (it was too hard to discover), so there's no grid-lovers' migration to protect.
- Ship to beta first. Rendering is visible on main; the builder UI is beta-only.
- No spec doc. This file is the plan.

---

## Syntax

The single-line form can't hold per-image alt text or captions (`^::name[...]::$` is one line, and `[^\]]*` can't contain `]`). Galleries get a **block form** built from markdown image syntax people already half-know:

```
::gallery
![Dawn over the ridge](https://cdn.grove.place/a.jpg "First light, 6am")
![Fog in the valley](https://cdn.grove.place/b.jpg)
![](https://cdn.grove.place/c.jpg)
::
```

- `![alt](url "caption")` — alt and caption both optional.
- The legacy `::gallery[url1, url2]::` keeps parsing and renders the same carousel (empty alt, no caption). No stored-content migration needed; a post upgrades to the block form the next time the builder saves it.
- Only `http(s)` URLs. Alt and caption are HTML-escaped at the handler. A line that doesn't match the image pattern is skipped, not fatal.
- One named constant for the max images per gallery, in the directive module: **20**. No second copy in CSS or the editor (the builder imports it).

---

## Rendering

**Server HTML is already a carousel.** `handleGallery` emits `.grove-gallery` with `.grove-gallery-item` figures (`<img alt>` plus `<figcaption>` when there's a caption). CSS lays 2+ items out as a `scroll-snap-type: x mandatory` strip, one item per viewport-width, fixed `aspect-ratio`. That alone gives touch swipe, no-JS support, and zero layout shift.

**Hydration adds the rest.** Same pattern as curios in `ContentWithGutter.svelte`: the existing hydration effect also picks up `.grove-gallery[data-images]` (2+), reads image/alt/caption from the DOM, and mounts a `PostCarousel` Svelte component over it. Same box, so nothing jumps. It adds:

- prev/next buttons, hidden on touch-only
- tappable dots, tracking the visible slide
- arrow-key navigation
- `role="region"` + `aria-roledescription="carousel"`, slides labelled "n of N"
- tap/click on a slide opens the lightbox

**Lightbox** reuses `ZoomableImage` and `LightboxCaption` from `ImageGallery`, wrapped in a thin dialog shell: focus trap, Esc to close, arrows to navigate, `aria-modal`, focus returns to the slide on close. Captions show under the slide and in the lightbox.

**Reduced motion:** no slide animation, instant snap, no lightbox transitions.

**Single image:** `data-images="1"` is skipped by hydration. Plain image, no chrome.

`ImageGallery.svelte` stays as it is. We borrow its parts, not its 700 lines.

---

## Builder (beta)

The goal: nobody should ever have to type `::gallery`.

- **Photo picker → arrange step.** After selecting 2+ photos in `PhotoPicker`, a second step: reorder (drag, plus up/down buttons for keyboard and touch), alt text and caption per image, and a live carousel preview. "Insert" writes the block form.
- **Editing is the same door.** If the cursor is inside a `::gallery` block, the toolbar photo button opens the builder pre-filled and replaces the block on save.
- **`/gallery` in the curio palette** opens the builder instead of inserting an empty `::gallery[]::`.
- **Gating:** `MarkdownEditor` takes a `galleryBuilder` prop. Aspen's editor pages pass `data.isBeta`, which comes from the root layout via `isBetaDeployment()` (true on `<tenant>-beta.grove.place`, and on localhost when running the beta branch). With it off, the picker behaves as today, except multi-select writes the legacy single-line form, which still renders as a carousel. This is the beta deployment doing its job, not a feature flag.
- **Keep it cherry-pickable:** builder code lives in its own files (`GalleryBuilder.svelte`, a small parse/serialize module) with one gated mount point in the editor, so graduating to main later is a small diff.

---

## Collapse the duplicate

`libs/engine/src/lib/content/markdown/directives.ts` becomes a re-export of `@autumnsgrove/grove-markdown/directives`, like `markdown/index.ts` already does. The copies have drifted: the engine one lacks the `http(s)` filter on gallery URLs and the `javascript:`/`data:` guard on `::image::`. The editor preview currently uses the weaker one.

Check before deleting: the full export surface (`groveDirectivePlugin`, `CURIO_METADATA`, `CURIO_DIRECTIVES`) exists in `grove-markdown`; engine `renderer.ts`, `MarkdownEditor.svelte`, and `CurioAutocomplete.svelte` still resolve; any engine directive tests move to `grove-markdown`. Update the `gallery` entry in `CURIO_METADATA` (it still says "rendered as a grid").

---

## Rollout order

Beta shares prod's D1, so a gallery written on beta is read by main immediately. Order matters:

1. **Consolidate + render** (collapse, block syntax, CSS, `PostCarousel`, lightbox, hydration) → commit on **main**, merge main into **beta**, push both. Existing galleries become carousels everywhere.
2. **Builder** → commit on **beta only**. Don't use it for real posts until step 1 is live on main.

---

## Work breakdown

Each step has its own check.

1. Collapse directives into `grove-markdown` → existing directive tests pass; `pnpm -r run check` clean.
2. Block + legacy gallery parsing, escaping, URL filter, max-images constant → unit tests: both forms, commas/quotes in captions, `<script>` in alt, non-http URLs, malformed lines, over-limit.
3. Scroll-snap CSS; remove the old grid rules (`data-images` 3-col selectors, hover zoom) → Glimpse capture at desktop/mobile, light/dark; no shift between server HTML and hydrated state.
4. `PostCarousel` + lightbox + hydration hook → component tests for index/dots/keys/reduced-motion; manual check with the dev stack on a real post.
5. Ship 1–4 to main + beta.
6. Builder: parse/serialize module (round-trips the block form), `GalleryBuilder.svelte`, picker second step, edit-in-place, `/gallery` palette hook, `betaDeployment` plumbing → serialize/parse tests; click through on beta.
7. Close #1590 once the builder has been used on beta; note in the issue what stays beta-only.

## Later (not v1)

- Alt text auto-filled from photo metadata in the builder.
- Graduating the builder to main.
- Caption/alt editing directly on the rendered page.
