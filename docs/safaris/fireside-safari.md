# Fireside Safari — the fire that never got lit

> A good listener, not a ghostwriter — and a record of what it actually said.
> **Aesthetic principle**: warmth with receipts. The fire invites you in; the transcript lets anyone check how much of the writing the fire did.
> **Scope per stop**: the code as it exists, the spec it was built against, the schema it wrote, and the surface a reader would actually see.

**Expedition date**: 2026-11-26
**Territory**: Fireside / Wisp mode — feature, spec, schema, surfaces
**Estimated stops**: 10

---

## 🗺️ Route Map

Fireside is not a herd of curios. It is one animal, seen from ten angles: a junk-drawered
implementation, the spec that described it, the schema it left behind, the editor it was
never re-attached to, the transparency surface it promised, and the Lyra loop that did not
exist when it was written.

| # | Stop | Category | Where | Notes |
| --- | --- | --- | --- | --- |
| 1 | The Old Camp | Component | `_junkdrawer/features/scribe/FiresideChat.svelte` (561) | Messages in `$state`, no persistence |
| 2 | The Old Engine | Service / API | `_junkdrawer/features/wisp-routes/wisp/fireside/*` (272 + 169 + 142) | Three handlers, hand-built prompts |
| 3 | The Old Trail Map | Tests | `fireside.test.ts` (490) | The guardrails, asserted against a dead service |
| 4 | The Field Notes | Spec | `docs/specs/wisp-spec.md` §Fireside (~229–780) | Conversation flow, guardrails, marker |
| 5 | The Bones | Schema / migrations | 015, 016, 027, 040, 092, 113 + `fireside_assisted` | Columns exist; almost nothing uses them |
| 6 | The Watering Hole | Editor surfaces | `arbor/garden/new` (941), `edit/[slug]` (1358) | No AI affordance; `fireside_assisted: 0` hardcoded |
| 7 | The Pride | Lyra loop | `libs/curios/src/timeline/recipe/*` (~2,000) | The pattern to borrow: 40 steps, 32k compaction |
| 8 | The Clearing | Public surface | `garden/[slug]/+page.svelte` (550), `chrome/Footer.svelte` | Where a transcript would live; nothing renders |
| 9 | The Fence | Gating | `$lib/server/beta.ts`, `feature_flags` | Beta is a deployment, not a flag |
| 10 | The River | Key / cost | `libs/lyra/src/secrets/ai-key.ts`, Lumen BYOK | Shipped 2026-11-26 (#1856) |

---

## 🔭 Quick Survey

Thirty seconds each, from the jeep, binoculars up.

| # | Stop | First impression | Warmth | Completeness | Priority |
| --- | --- | --- | --- | --- | --- |
| 1 | Old Camp | A whole conversation that lives in a component's memory and dies with the tab | Wilting 🟠 | 55% | High |
| 2 | Old Engine | Good instincts — delimiters around user text, `secureUserContent` scrubbing — driving a one-shot prompt | Wilting 🟠 | 50% | High |
| 3 | Old Trail Map | 490 lines of guardrails worth keeping, asserted against a service that no longer ships | Growing 🟡 | 70% | Medium |
| 4 | Field Notes | The strongest artefact in the territory. Two of its decisions have since been overturned | Thriving 🟢 | 85% | Critical |
| 5 | Bones | `fireside_assisted` is written as `0` at two call sites and read nowhere. `fireside_session_id` unused | Barren 🔴 | 10% | High |
| 6 | Watering Hole | 2,299 lines of editor with no door for the fire to come in by | Barren 🔴 | 0% | High |
| 7 | The Pride | The timeline's recipe: 8 tools, 40 steps, compaction at 32k, $0.0076 a day | Thriving 🟢 | 90% | Critical |
| 8 | The Clearing | `Footer.svelte` exists; the post page has no transcript and renders no marker | Barren 🔴 | 5% | High |
| 9 | The Fence | `isBetaDeployment()` is documented and used; the two AI grafts are still disabled | Growing 🟡 | 60% | Low |
| 10 | The River | One key, resolved canonical-first, shipped an hour ago | Thriving 🟢 | 95% | Done |

### By condition

- **Thriving** 🟢 — 4, 7, 10 (the spec, the loop, the key)
- **Growing** 🟡 — 3, 9 (the rules, the fence)
- **Wilting** 🟠 — 1, 2 (the old implementation)
- **Barren** 🔴 — 5, 6, 8 (the bones, the editor, the public surface)

### Drive order

Read the map before the wreckage:

1. **4 The Field Notes** — the reference everything else is judged against
2. **1, 2, 3 The Old Camp, Engine, Trail Map** — what survives, what gets torn down, what gets rewritten
3. **5 The Bones** — what the schema already promises
4. **8 The Clearing** — the new ask: history and a public transcript
5. **6 The Watering Hole** — where the writer actually meets the fire
6. **7 The Pride** — the loop it will be rebuilt on
7. **9 The Fence** — how it ships as beta
8. **10 The River** — who pays, and how much

---

_Journal opened. Jeep packed. Route mapped. The drive begins at the map, not the wreckage._

## 1. The Old Camp

**Character**: A campfire you can lean over. The interface is supposed to disappear into a
conversation — an invitation, not a form. Nearly everything about its soul is right; nearly
everything about its wiring is from a previous era of the design system.

### Safari findings: What exists today

**The component** — `_junkdrawer/features/scribe/FiresideChat.svelte`, 561 lines
(script 185, markup 97, **style 277**):

- [x] Thin domain layer over `GlassChat` + `createAIChatController` — it owns only API calls,
      draft mode and the fire's personality, which is exactly the split the shared chat
      component exists for
- [x] The ASCII fire, the warm gradient header, and the subtitle *"sit by the fire and tell me
      what's on your mind"* — the character lives here and should survive intact
- [x] `~ a good listener, not a ghostwriter ~` under the input
- [x] Draft preview with word count and reading time (200 wpm)
- [x] The `canDraft` gate with honest copy: *"Keep chatting - drafting unlocks after a few
      exchanges"*
- [x] The marker is shown in the preview, not hidden until publish
- [x] `prefers-reduced-motion` handled for the one transform it adds
- [x] Uses `api.post`, not `fetch`; Prism icons, not `lucide-svelte`
- [ ] **The theme is a private, dead one.** Every colour is `var(--grove-something, <dark hex>)`
      and **no `--grove-*` variable exists anywhere in the codebase any more** (Prism replaced
      them). So every fallback fires: the component is permanently dark with a `#1a1a1a` floor,
      whatever the site's theme or season. `GlassChat variant="dark"` is hardcoded to match.
- [ ] **Half the file is that theme.** 277 of 561 lines re-style what `GlassChat` already themes.
- [ ] **Hardcoded accent colours** — `#e67320` in the draft button's gradient,
      `rgba(255, 140, 50, 0.3)` on its hover shadow, `#ff8c32` as a fire fallback. These are the
      exact patterns the accent gateway blocks in `apps/` and `libs/`; the file only escaped it
      because the junk drawer is out of lint scope.
- [ ] **`$effect(() => { startConversation(); })` with no guard.** It runs on mount, and the
      controller writes state the effect can observe; a second start is one state change away.
      There is no `started` flag, no retry, and a failed start leaves an empty room with an error
      line.
- [ ] **The conversation dies with the tab** — and `onClose` discards it without asking. That is
      the whole of #1317, and it is now overruled: history belongs in the tenant DB.
- [ ] **The draft preview is plain text.** `{draft.content}` in a `white-space: pre-wrap` div
      shows `## A heading` as literal characters; the editor will render it as a heading. The
      preview and the result disagree.
- [ ] **No live region for incoming replies**, no focus management on open/close, no `aria-busy`
      while drafting.
- [ ] **`min-height: 500px`** — a fixed assumption about where it mounts.
- [ ] **Nothing carries the session forward.** The draft that comes out has `title`, `content`,
      `marker` and nothing else — no `sessionId`, so a published post could not point at its own
      conversation even if stop 8 wanted to.

**The dependency contract** (`libs/engine/src/lib/ui/components/ui/glasschat/`, 5 files):

- [x] `GlassChat` takes `messages`, `roles`, `isLoading`, `error`, `inputValue`, `onSend` and
      snippets for `header` / `inputToolbar` / `inputFooter` — a good, honest seam
- [x] `variant` is a prop (`default | accent | dark | muted | frosted`), so a light theme is a
      prop change, not a rewrite
- [ ] The controller keeps `inputValue` and messages in component state only — it has no
      persistence hook, by design

### Design spec (safari-approved)

**Core decision:** keep the fire, throw away its private theme, and split the file so the
conversation, the preview and the styling stop sharing one 561-line room.

#### 1. The theme is inherited, not declared

Every `--grove-*` reference goes. Where the component needs a colour it takes a Prism token
(`--color-surface`, `--color-border`, `--color-text-muted`, `--color-accent-warm`); where it
needs warmth it uses the accent scale, not a hex. `GlassChat`'s `variant` stops being the
literal `"dark"` and follows the page (`frosted` in daylight, `dark` after dusk) — pass it in.

The fire art keeps its warm tint, but through `color-mix` on the accent token so it respects
the season. Budget: **style block under 100 lines**, down from 277.

#### 2. Three files, not one

| File | Contents | Target |
| --- | --- | --- |
| `FiresideChat.svelte` | conversation, start/stop, API calls, close guard | ~180 lines |
| `FiresideDraft.svelte` | the preview: title, body, meta, marker, actions | ~120 lines |
| `fireside.ts` | pure helpers: word count, reading time, draft-unlock copy | ~40 lines |

Same directory as the editor it belongs to (Arbor chrome), not `_junkdrawer`.

#### 3. Start once, and say so

Replace the unguarded `$effect` with an explicit lifecycle: `idle → starting → open → failed`.
A failed start renders *"The fire didn't light. Try again?"* with a retry button, not an empty
conversation. On open, the input takes focus.

#### 4. The room remembers

On mount, if an unfinished session exists for this tenant and user, the fire opens with it and
one quiet line above the messages: *"You were here yesterday. Pick up, or start over?"* — the
session tables land in **Stop 5**; this component only asks for them.

#### 5. Closing asks

With messages and no accepted draft: *"Keep this conversation for later, or let it go?"*
(Keep / Discard). With nothing typed, it closes immediately — no ceremony for an empty room.

#### 6. The preview renders what the editor will render

The draft body goes through the same markdown renderer the editor preview uses, so a heading
looks like a heading before you accept it. The marker stays visible at the bottom.

#### 7. Acceptance carries receipts

`onDraft` gains `sessionId` and `transcriptPublic: boolean`. The footer question — *"Show this
conversation in the post footer?"*, default **off** — is asked here, at the moment the words
leave the fire, and the answer is stored with the post (Stop 8 renders it).

#### Component fixes

- [ ] Replace all `--grove-*` tokens with Prism tokens; delete the dark fallbacks
- [ ] `variant` follows the page instead of `"dark"`
- [ ] Remove `#e67320`, `#ff8c32`, `rgba(255,140,50,0.3)`; use accent-scale tokens
- [ ] Split into `FiresideChat.svelte` / `FiresideDraft.svelte` / `fireside.ts`
- [ ] Replace the unguarded `$effect` start with an explicit lifecycle + retry
- [ ] Resume an unfinished session on mount (asks Stop 5 for one)
- [ ] Close guard when there are messages
- [ ] Render the draft preview as markdown with the editor's renderer
- [ ] `aria-live="polite"` for replies, `aria-busy` while drafting, focus on open and return
      focus to the launcher on close
- [ ] Drop `min-height: 500px` in favour of the container's own sizing
- [ ] `onDraft` carries `sessionId` + `transcriptPublic`

#### Kept exactly as-is

- [x] the ASCII fire, the subtitle, the philosophy line
- [x] the `canDraft` copy and the "Ready to draft" transition
- [x] word count, reading time, marker-in-preview
- [x] GlassChat as the chat surface — do not rebuild message bubbles

#### Migration needs

None from this stop. Stops 5 and 8 own the session tables and the footer rendering.
