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

#### Where it appears (decided at the campfire)

**Its own button in the editor, opening a chat window** — not a mode that replaces the editor,
and not a panel bolted to the side of an empty post. The writer clicks *Fireside* wherever they
are in the editor and a conversation opens over it; accepting a draft puts the words in the
editor they were already looking at. The exact entry point (toolbar, empty-state card, both) is
**Stop 6's** to settle, with one constraint from here: the button must be reachable from a post
that already has words in it, because "I froze halfway" is as common as "I froze at the start".

#### Kept exactly as-is

- [x] the ASCII fire, the subtitle, the philosophy line
- [x] the `canDraft` copy and the "Ready to draft" transition
- [x] word count, reading time, marker-in-preview
- [x] GlassChat as the chat surface — do not rebuild message bubbles

#### Migration needs

None from this stop. Stops 5 and 8 own the session tables and the footer rendering.

## 2. The Old Engine

**Character**: Three strong vertebrae and a spinal column that ends in mid-air. The prompts are
the philosophy written as instructions, and they are good enough to survive a rewrite nearly
verbatim. The plumbing under them — where the key comes from, who owns the conversation — is
from before Lyra, before BYOK, and in one place before the idea that a conversation is data.

### Safari findings: What exists today

**The route** — `+server.ts`, 142 lines:

- [x] Auth first (401 before anything else)
- [x] Subscription gate via `checkFeatureAccess(db, tenantId, "ai")`, fail-**open** on a billing
      error — the right bias for a check that is about a plan, not about safety
- [x] Body validation with the Grove error envelope (`error` + `error_code`)
- [x] `Threshold` rate limit, fail-**closed**, per user
- [x] Thin routing layer: all logic in the service, all errors through `logGroveError`
- [ ] **It needs Grove's own OpenRouter key.** `platform?.env?.OPENROUTER_API_KEY` — a
      worker-global secret — and 503s without it. Not the Wanderer's key, not BYOK, not the one
      that shipped yesterday (#1856). Whether Aspen has ever had that secret is invisible from
      the repo (it is not in `wrangler.toml` and not in env validation), which is itself the
      finding: a feature whose ability to run cannot be answered by reading the code.
- [ ] **`action` multiplexing** — `start` / `respond` / `draft` in one POST body. Three verbs,
      three lifetimes, one URL.
- [ ] **The URL no longer exists.** `POST /api/grove/wisp/fireside` — there is no `/api/grove`
      namespace in Aspen any more. Restored as-is, the old component would 404.
- [ ] **`RATE_LIMIT.maxRequestsPerHour = 10`** on key `wisp:<user>` for the whole hour, covering
      start + every turn + the draft. Three exchanges and a draft is five calls: two conversations
      an hour, maximum.
- [ ] **No monthly cap.** `COST_CAP` ($5) exists in `platform/config/wisp.ts` and was enforced by
      `wisp/+server.ts` — which is in the junk drawer too. Fireside never enforced it.

**The service** — `fireside-service.ts`, 272 lines:

- [x] `handleStart` returns a starter prompt and a conversation id, nothing else — no ceremony
- [x] The reply prompt is the spec in prose: ask, never write, keep it 1–3 sentences, redirect
      *"If they ask you to write something, gently redirect"*, and it wraps user text in
      `USER MESSAGE START ---` delimiters so a message cannot impersonate the system
- [x] The draft prompt is the best artefact in the territory. *Use only their words. Preserve
      their phrasing exactly. If the input is brief, the output MUST be brief. Suggest a title
      in their voice.* Plus `secureUserContent()` around the writer's words
- [x] `maxTokens: 150` for replies — short by design, and it works
- [x] A JSON parse failure falls back to the raw response with an honest warning
      (*"The draft formatting may be a bit rough"*) rather than losing the draft
- [x] Draft cost logged to `wisp_requests` with `fireside_session_id` (the only persistence, by
      design, and only for the draft)
- [ ] **The conversation lives on the client.** Every turn re-sends the whole history from the
      browser; the server validates nothing about it and stores nothing. Any "earlier message"
      can be fabricated, and closing the tab ends the session
- [ ] **No compaction.** The whole history is re-sent every turn inside a 120,000-token ceiling
      estimated at 4 chars/token — a wall, not a strategy. The timeline already paid for this
      lesson: re-sending full history cost $0.086 for a single day until compaction was wired
- [ ] **One shape for both jobs.** A conversational reply and a 2,000-token draft are the same
      `lumen.run` call with different prompts; there is no step limit, no tools, no budget
- [ ] **No tenant scoping on spend.** `wisp_requests` has `user_id` and no `tenant_id`
- [ ] **`conversationId` is trusted from the body** for the usage row — validated for *shape*,
      never for ownership

**The pure module** — `fireside.ts`, 169 lines:

- [x] `selectStarterPrompt` — 12 genuinely good prompts, deterministic per user+day, so it
      changes daily without a database read
- [x] `canDraft` — 3 user messages **and** 150 estimated tokens. Cheap, predictable, no model call
- [x] `estimateTokens` documents its own limitations honestly
- [x] `isValidConversationId` / `generateMessageId` / `isConversationTooLong`
- [ ] Client-generated ids mean the server cannot mint or verify a session identity

### Design spec (safari-approved)

**Core decision:** the prompts survive, the plumbing is replaced by what now exists. Lyra gives
the loop, compaction and tools; #1856 gives the key; the session tables (Stop 5) give the history.

> **A correction to the shape of the whole feature.** This engine was built when Wisp was *the*
> AI in Grove and everything hung off it. That is no longer true: **Lumen is where AI enters the
> grove**, Lyra runs on Lumen, and Wisp and Fireside are two sibling features on that floor.
> Nothing here should route through Wisp, and nothing here is "the Wisp API with a chat action" —
> it is the fireside route, talking to Lumen through Lyra, like the timeline does.

#### 1. The key is the Wanderer's, resolved like every other feature

`OPENROUTER_API_KEY` disappears from this path. The route resolves the tenant's key through
`resolveOpenRouterKey()` and builds a model slot exactly as the timeline's generate route does:

```ts
const openrouter = await resolveOpenRouterKey(readTenantSecret);
if (!openrouter) return 400 + MISSING_AI_KEY_MESSAGE;   // names Settings → AI
const model = createLumenModelSlot({
  baseUrl: "https://grove-lumen", fetcher: env.LUMEN, apiKey: env.LUMEN_API_KEY,
  tenantId, tenantApiKey: openrouter.key,
});
```

That one change makes Fireside possible on the beta deployment without Grove paying, and makes
"the key is missing" a sentence a person can act on instead of a 503.

#### 2. The server owns the conversation

`POST /api/fireside` creates the session and its first message. Every later call takes a
**session id in the URL**, loads history from the database, and appends both sides. The browser
stops sending history, which removes the fabrication surface and lets the loop see the real
conversation for compaction.

REST instead of an `action` field:

| Verb | Path | Does |
| --- | --- | --- |
| `POST` | `/api/fireside` | start a session (mints the id, returns the first prompt) |
| `GET` | `/api/fireside/[id]` | resume: messages, draft-unlock state, whether a draft was accepted |
| `POST` | `/api/fireside/[id]/turn` | say something → one reply |
| `POST` | `/api/fireside/[id]/draft` | organize the writer's own words |
| `POST` | `/api/fireside/[id]/accept` | record acceptance (`fireside_assisted`, transcript opt-in) |
| `DELETE` | `/api/fireside/[id]` | let it go |

Every one of them applies the tenant-boundary rule: right tenant/right session `200`, someone
else's session `404` (never `403` — a 403 confirms it exists).

#### 3. The loop, in the timeline's shape

A `fireside` recipe, in the same form as `libs/curios/src/timeline/recipe`:

- **instructions**: the existing reply prompt, cleaned up — plus what the tools make possible
- **tools** (three, and only three):
  - `read_my_recent_posts` — the writer's own published excerpts, so Wisp can hear the voice
    instead of being told to have one
  - `read_draft` — the post they were editing when they opened the fire (this is why the button
    works mid-post)
  - `suggest_title` — a proposal, never applied
- **step limit**: 8 per turn (a reply is a short conversation, not a day of research)
- **compaction**: 32k window / 12k kept, the timeline's numbers, because the same Lumen message
  cap applies
- **no tool may write prose.** The draft stays a separate step with its own prompt — the one
  place the words are assembled

#### 4. The draft rule: keep the spine, loosen the joints

*"Use only their words"* is the feature's spine and it stays — it is what makes this Fireside
and not a ghostwriter. But it is written as a prohibition, and a prohibition cannot tell the
difference between *padding* and *one connector*: a writer who arrives with fragments
("the rain, the dog, that phone call") needs *"and"*, *"but then"*, *"the next morning"* — small
words that carry their meaning forward without adding any of their own.

Safari-approved: keep the rule, and name the exception in it — **connective tissue yes, new
content no.** Existing text: *"AVOID adding transition phrases unless absolutely necessary …
NEVER add stylized phrases like 'And that's the thing—'"*. That stays; what gets added is one
sentence granting plain connectors (*and, but, so, then, later, the next day*) when the input is
a fragment.

This is a **test it, then judge it** decision, not a settled one: build the system with the
spine intact, run it against a genuinely fragmentary session, and see whether the loosening
produces writers' words with joints or writes a paragraph for them. If it drifts, tighten it
back and let the writer ask for help instead.

#### 5. Two prompts, two temperatures, kept

Reply: `150` output tokens, `0.7`, warm and short. Draft: `2,000` output tokens, `0.3`, strict
instructions, JSON out, fallback-to-raw with the existing warning. These numbers were chosen by
someone paying attention; do not "improve" them without a run to back it.

#### 6. No spending limits — the limit is their key

Automated by an earlier model of Grove: when inference was going to be a Grove service, a cap
made sense, so `COST_CAP` and a 10-requests-an-hour `RATE_LIMIT` were written. Both belonged to
a world where **Grove pays**. It does not:

- **BYOK features** (Fireside, the timeline) run on the Wanderer's own OpenRouter key. The spend
  ceiling already exists — it is their provider account. A second, Grove-side cap would be a
  copy of a number they can see better than we can.
- **Platform services** (text and image moderation, Thorn) are Grove's cost, and they stay a
  platform concern with a platform budget.

So Fireside gets **no cost cap, no per-turn quota, no per-session budget**. The old `RATE_LIMIT`
block comes out entirely, and this stop contributes nothing to `Threshold`.

The one thing that is *not* about money: a request flood is still load on Lumen, D1 and the
workers. If that ever shows up as a real problem it belongs in a platform-wide guard in Lumen,
not as a per-feature number invented here. Per-Wanderer spending limits, if they want a lower
ceiling than their provider gives them, are a **Lumen setting** — filed as #1867, for another day.

#### Route fixes

- [ ] Drop `OPENROUTER_API_KEY`; resolve the tenant key via `resolveOpenRouterKey()`
- [ ] Build the slot with `createLumenModelSlot`, `tenantId` included
- [ ] Replace `action` multiplexing with the six routes above
- [ ] Move from `/api/grove/wisp/fireside` to `/api/fireside/*`
- [ ] Load and append history server-side; never accept it from the body
- [ ] Tenant boundary on every route, `404` for someone else's session
- [ ] Keep `checkFeatureAccess(…, "ai")` fail-open — that is a plan gate, not a spend cap
- [ ] Remove the `RATE_LIMIT`/`Threshold` block from this route (BYOK: the ceiling is their key)
- [ ] Log replies as well as drafts to `wisp_requests`, with the session id, so a session's cost is
      the sum of its rows

#### Service fixes

- [ ] `handleStart` creates the session row; `handleRespond` becomes one Lyra turn
- [ ] `handleDraft` reads the conversation from the database, keeps the prompt and the fallback
- [ ] Record turn count, cost and model on the session as it goes

#### Kept exactly as-is

- [x] both prompt bodies, nearly verbatim (they *are* the feature)
- [x] `secureUserContent()` around user text, and the `USER MESSAGE START ---` delimiters
- [x] the JSON fallback + "formatting may be a bit rough" warning
- [x] `canDraft` (3 messages, 150 tokens) and `selectStarterPrompt`'s daily rotation
- [x] `estimateTokens` — still the right cheap estimator for the draft gate
- [x] `maxTokens: 150` / `0.7` for replies, `2000` / `0.3` for drafts

#### Migration needs (for Stop 5 to own)

- [ ] session + message tables in the tenant DB
- [ ] `wisp_requests` gains a tenant column, or is joined through the session

## 3. The Old Trail Map

**Character**: A careful surveyor's notebook that only ever mapped one valley. Every mark in it
is accurate, and every mark is about a pure function — none of them has ever seen a request, a
model, or a failure. What it really proves is how much of Fireside's behaviour was decided before
anyone ran it.

### Safari findings: What exists today

`fireside.test.ts`, 490 lines, **9 describes, 39 tests, zero mocks** — everything it touches is a
pure function from `fireside.ts`. That is why it survived junk-drawering intact.

- [x] **`hashString`** — deterministic, non-negative, and `""` is exactly `0`
- [x] **`selectStarterPrompt`** — same user + same day = same prompt; 30 days yield more than one;
      empty string and unicode do not throw
- [x] **`estimateTokens`** — 4 chars/token, rounds up, `""` is 0, documented 100-char case
- [x] **`estimateConversationTokens`** — sums **both** roles (a distinction the draft gate then
      narrows)
- [x] **`isConversationTooLong`** — both sides of the 120k boundary
- [x] **`canDraft`** — the real guardrail, and it is tested properly: empty, wisp-only, two user
      messages, three messages *without* substance, three messages *with* it, and the one that
      matters most — **wisp's own words never count toward the gate**
- [x] **`generateConversationId`** — timestamp prefix is real, 100/concurrent are unique, format
- [x] **`isValidConversationId`** — the security test of the era: SQL injection, `<script>`,
      `javascript:`, path traversal, unicode, spaces, wrong separator, all four length bounds
- [x] **`generateMessageId`** — UUID v4 shape, uniqueness
- [ ] **Nothing tests the service.** No test that a request to "write it for me" gets redirected,
      that user text is delimited, that the draft prompt carries `secureUserContent`, that replies
      are capped at 150 tokens, that the draft's JSON fallback fires, or that the marker is
      returned. The 272 lines that actually decide what the fire says are untested.
- [ ] **Nothing tests the route.** 401, 403 from the plan gate, 429 from Threshold, 503 without a
      key, invalid `action`, malformed body — all unasserted.
- [ ] **Two of these functions are about to disappear.** Once the server mints session ids
      (Stop 2, §2), `generateConversationId` and `isValidConversationId` have no caller. Their
      tests get deleted with them, not ported — and the security instinct behind the regex moves
      to the route, where the id is now looked up rather than parsed.
- [ ] **Some assertions are honest about being weak** — *"this could theoretically fail"*,
      *"we're mainly testing that the function runs without error"*. Fine as written; noted so
      nobody mistakes them for a guarantee.
- [ ] **The missing boundary:** exactly 3 user messages and exactly 150 tokens sits between the
      two `canDraft` cases but is never asserted on its own. One test, one line.

### Design spec (safari-approved)

**Core decision:** the pure suite is good and nearly all of it ports. The tests that never existed
are the ones that matter now, and they have a shape the repo only just acquired — the
**happy / bad / sad** suites from #1765, running in the real workerd harness (#1766) against real
D1, KV and R2.

#### 1. Port the pure suite almost verbatim

`fireside.test.ts` moves with the module. Two edits:

- delete `generateConversationId` / `isValidConversationId` tests
- add the missing boundary: 3 messages, exactly `MIN_TOKENS_FOR_DRAFT`, `canDraft` → `true`

Rename the describes if the module moves, but keep the tests: they are the only part of this
feature that has ever been honest about its edges.

#### 2. Assert prompt *properties*, never prompt prose

The reply and draft prompts are the feature, and copy-editing them should not break a suite. So:

- [ ] user text is wrapped in the delimiters, and `secureUserContent` is called around it
- [ ] the reply turn passes `maxTokens: 150`, temperature `0.7`; the draft `2000` / `0.3`
- [ ] a prompt containing "write this for me" still carries the redirect rule (assert the rule is
      present by a stable marker comment in the prompt builder, not by matching a paragraph)

No snapshot of the prompt body. If the words change, the tests should not care — only that the
constraints travel with them.

#### 3. The suites that never existed (route, in the workers harness)

**happy**

- [ ] start → three turns → draft → accept: a session row, message rows for every turn, a draft,
      and `fireside_assisted = 1` on the post
- [ ] a second session for the same tenant gets its own id and does not see the first's messages

**bad**

- [ ] no session → `401`
- [ ] another tenant's session id → `404`, never `403`
- [ ] a body carrying a fabricated `conversation` array → **ignored** (history comes from the DB)
- [ ] malformed body → `400` with the Grove error code
- [ ] no AI key set → `400` naming Settings → AI (the #1856 message)
- [ ] plan gate refuses → `403`, fail-open when the gate itself errors

**sad**

- [ ] the model answers with nothing → Lyra retries, then reports (`#1847`'s behaviour, asserted here)
- [ ] the draft comes back as garbage → fallback content + "formatting may be a bit rough"
- [ ] Lumen unavailable → `503` with a message a writer can act on, not a stack
- [ ] a session resumed after a crash mid-turn still has every accepted message
- [ ] draft requested after two messages → refused with the existing "we're just getting started" copy
- [ ] compaction fires on a long conversation and the run still finishes (the 32k window)

#### 4. One test for the rule that has no exceptions

- [ ] **the reply path never writes prose**: the turn's output is returned as a chat message and
      nothing else; only the draft step produces a post body. Assert by checking no post row is
      created by any turn route — the guardrail as a database assertion, not a prompt sentence.

#### Migration needs

None. This stop contributes test files and two deletions.
