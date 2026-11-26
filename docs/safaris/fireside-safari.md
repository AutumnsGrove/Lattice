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

**Core decision:** the old suite is **inspiration, not a source**. Its *cases* are worth carrying;
its file is not, because a modern suite has a shape this one predates — the **happy / bad / sad**
describes from #1765, in the real workerd harness (#1766) against real D1, KV and R2, with
`edge cases` and `error handling` retired as names.

#### 1. Rewrite, don't port

The old file is 490 lines of node-pool unit tests with no request, no model and no failure in
sight. The new suite runs in the workers harness and is organised by **who was wrong**:

- `happy` — the world works: a conversation happens, a draft comes out, the receipts are right
- `bad` — the caller was wrong: 401, 403, 404, 400
- `sad` — the caller was fine and the world was not: model silence, garbage JSON, Lumen down,
  resumed sessions, an empty room

`canDraft`'s cases (empty, wisp-only, two messages, three without substance, three with, and
**wisp's words never count**) move across as *cases* — same inputs, same expectations, new
harness, new file name. The starter-prompt rotation and the delimiter/`secureUserContent`
assertions go with them.

What does not come across:

- `generateConversationId` / `isValidConversationId` — the server mints ids now (Stop 2, §2), so
  there is nothing to validate by regex. The instinct moves to the route: an unknown or foreign
  session is a `404`.
- the self-admitted weak assertions (*"this could theoretically fail"*) — rewrite them to assert
  something that cannot drift
- anything that asserts a prompt's prose — see §2

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

## 4. The Field Notes

**Character**: A writer's field journal from a country that has since been re-surveyed. The
philosophy is still the best thing in the territory — the voice samples in it are exactly right —
but a third of it now describes a Grove that does not exist: one where conversations are never
stored, where inference is Grove's cost, and where the model vendor list is a shopping list.

### Safari findings: What exists today

`docs/specs/wisp-spec.md`, 1,163 lines. Fireside is a **section inside the Wisp spec** (lines
229–836) — which is itself the old hierarchy. Wisp, grammar, tone and readability are one
feature; this is another.

**Thriving — the parts to carry across word for word:**

- [x] **The philosophy table** (`AI is a TOOL, Never a Writer`): allowed = fixes, analysis,
      scoring, suggestions, feedback; forbidden = "write a post about X", "expand this",
      autocomplete, full sentences, brainstorming. Still the north star.
- [x] **The voice samples.** The mid-conversation mockup is not filler — it is the tone spec:
      *"Ooh, what feels different about it?"* … *"That makes total sense. Resonance vs proximity.
      That's a really clear way to put it. What makes those connections feel fragile to you?"*
      Short, curious, reflecting the writer's own phrase back. Nothing in the code enforces that;
      the mockup is the only place it is written down.
- [x] **The twelve starter prompts** — shipped verbatim in `fireside.ts`.
- [x] **The hard refusals table**, with five redirections that are already good copy:
      *"I can't write for you, but I'd love to hear what you think about X"*, *"Your voice is the
      whole point. What do you actually want to say?"*, *"This is your space. What do you think?"*
- [x] **The soft constraints**: 3 messages + 150 tokens, input/output ratio, no opinion
      injection, no padding. All four survive, and three of them are still only sentences.
- [x] **Security**: strip control and zero-width characters, 2,000-char message cap, reject
      whitespace-only, delimiters around user text, per-conversation message ceiling.
- [x] **The accessibility table** — keyboard map (`Tab`, `Enter`, `Escape`, `Cmd/Ctrl+Shift+F`,
      arrows), `role="log"` + `aria-live="polite"`, "Wisp says: …" announcements, `role="alert"`
      for errors, ASCII-vs-emoji on small screens, `aria-hidden` on decoration.
- [x] **The database additions** — what shipped as migration 027 is what the spec asked for.

**No longer true — five places the spec speaks for a project that moved:**

1. **Privacy: "conversations are never stored."** The spec is explicit — client state, then
   `sessionStorage`, optional KV with a 15-minute TTL and immediate deletion, *"all conversation
   data purged"* after publish. The decision now is the opposite: **history lives in the tenant
   DB** (yours, at least for now), and a transcript can be published. That is not a tweak; the
   section gets rewritten, and the *promise* changes with it — from *"we never keep it"* to
   *"we keep it in your grove, and you decide who sees it"*. **Flagged for the Privacy Policy**,
   which currently makes the stronger claim.
2. **Cost: a Grove-paid service with a $5 cap and a 10/hour limit**, plus an analysis cost table
   ($0.01–$0.15/month). All obsolete: BYOK, no cap, no quota. The spec never estimated a
   *session* at all — and the repo's only measured datapoint is the timeline's day (14 turns,
      169k input, $0.0076). A fireside session is far smaller; the honest line is "well under a cent
   on a cheap model, ten to twenty times that on a frontier one", to be replaced by a measured
   number once a session has run.
3. **Model strategy: DeepSeek V3.2 via Fireworks/Cerebras/Groq with a Kimi/Llama fallback.**
   The registry (#1849, #1850) is now the truth about models, prices and fallbacks. This section
   is a historical artefact, and keeping it invites someone to trust it.
4. **The API**: `POST /api/grove/wisp/fireside` with an `action` field, and errors shaped
   `{ error: true, code: "rate_limit" | "generation_blocked" | … }`. The route is gone and the
   error envelope is `{ error, error_code }`. **But the error vocabulary is better than the
   code's** — `generation_blocked` with a `redirectPrompt`, `session_expired`, `content_too_long`
   — and should be carried into the new route rather than lost.
5. **Guardrail detection: "client-side keyword pre-flight + server-side intent classification."**
   **Never built** — nothing in the junk-drawn code mentions intent, pre-flight or
   `generation_blocked`. It was a good instinct in 2025 and a worse one now: a keyword filter
   cannot catch *"help me say this better"*, and a classifier call on every turn doubles the cost
   of a conversation to police a rule the model is already given. Safari-approved: keep the
   redirect as an instruction (and test it), drop the pre-flight, and if a real classifier is ever
   wanted, it runs **once, at the draft step**, where it is cheap and where the consequence lives.

**One promise this spec made that the code never kept:** the marker's *server-side enforcement*.
The spec sketches re-appending `*~ written fireside with Wisp ~*` on write and refusing to clear
`fireside_assisted`. Neither exists; `fireside_assisted` is written as `0` at two call sites and
read by nothing. The promise was right, and it is Stop 8's to keep.

### Design spec (safari-approved)

**Core decision:** this becomes **its own spec** — `docs/specs/fireside-spec.md` — and what it
keeps from here are the *sentences*, not the *architecture*. The Wisp spec keeps grammar, tone and
readability and loses its Fireside section.

#### 1. The shape of the new document

| Section | Source | Change |
| --- | --- | --- |
| What this is | the philosophy table | keep, verbatim |
| The voice | the mid-conversation mockup | promote to its own section — it is the tone spec |
| What it won't do | the hard refusals table | keep the five redirections word for word |
| When it opens its mouth | the soft constraints | keep; `canDraft` is still 3 + 150 |
| Where the conversation lives | *new* | tenant DB, retention, delete, transcript opt-in |
| What it costs | *new* | BYOK, no cap, a measured number once it runs |
| How it is built | Stop 2's routes + Stop 5's tables | replaces the old API and DB sections |
| Where it appears | Stop 6 | one button, one overlay, one shortcut |
| What readers see | Stop 8 | the transcript, opt-in, and the marker's enforcement |
| How it is tested | Stop 3's suites | happy / bad / sad, real runtime, no mocks |
| What we overturned | *new* | the four decisions above, with the reason each changed |

#### 2. The privacy section, rewritten honestly

> **Your conversation is yours.** It is kept in your grove's own database so you can come back to
> it, and so a post can show its own receipts if you choose. It is never used to train a model,
> never read by a person at Grove, and never shown to anyone unless you publish the transcript.
> You can delete a session at any time, and deleting a post deletes its session.

Four promises there, and each one needs a mechanism before it is written down: retention
(unfinished sessions expire — 30 days is the starting guess), deletion (session delete + post
delete cascade), access (no admin route reads message bodies; say it out loud), and the transcript
(off by default).

#### 3. What Autumn ruled at this stop

- **A privacy and legal review is its own piece of work** — filed as **#1868**. Every AI feature is
  optional and opt-in, and **ZDR providers only, even where they cost more**: that is a commitment
  to state, not a footnote about moderation.
- **The cost section is entirely obsolete.** Delete it; BYOK, no caps.
- **The model section is entirely obsolete.** The default is `deepseek/deepseek-v4.1-flash-1017`,
  registered in the catalog the day this safari ran (#1849, #1850). Providers and fallbacks are
  Lumen's business and are decided there — and since one model can be served by several providers,
  the old "cascade to a different model" story may turn out to be a non-issue entirely. The spec
  names a default and points at the registry; it does not list models.
- **Carry the vibes, not the files.** Paths, route names, component names and error shapes from
  2025 are all to be rewritten fresh. What travels is the philosophy, the voice, the refusals, the
  accessibility table and the security rules.
- **The classifier, if it is ever built, is a decision model.** #1853 files OpenRouter's
  decision models (Jev and friends) as a Lumen surface — those answer *"is this a request for me
  to write prose?"* with a probability for a fraction of a chat call. A full LLM call per turn to
  police one rule is too expensive; a decision model at the draft step is not. Recorded as the
  likely answer, not a build order.

#### 4. The "what we overturned" appendix

Written most seriously of anything in the document, because a future reader will otherwise
"restore" the old decisions in good faith:

- **client-only storage → tenant DB.** Why: #1317 asked for resume and got "use sessionStorage";
  the writer's own history is worth keeping, and a transcript is only possible if the conversation
  exists. What was lost: the absolute "we never store it" claim, replaced by a narrower one that
  has to hold up.
- **Grove-paid + $5 cap → BYOK, no cap.** Why: inference became the Wanderer's key. What was
  lost: nothing but a guard that was never enforced.
- **pinned model list → registry.** Why: prices and models move; a spec that names them rots.
- **intent classification → instruction + test**, and later a **decision model** if a classifier
  turns out to be needed (#1853). Why: it was never built, and a chat call per turn is too
  expensive to police a rule the model already has.

#### 5. Spec fixes

- [ ] Create `docs/specs/fireside-spec.md`; delete Fireside from `wisp-spec.md` (leave a pointer)
- [ ] Promote the mid-conversation mockup to a "voice" section, and copy its lines into the reply
      prompt's examples
- [ ] Keep the five refusal redirections verbatim
- [ ] Rewrite privacy: retention window, deletion path, no-admin-read, transcript default off —
      each with its mechanism
- [ ] Replace the cost table with BYOK + a measured session cost (measure after the first run)
- [ ] Delete the model/provider section; point at the registry
- [ ] Replace the API section with the six routes and the Grove error envelope, keeping the old
      error *vocabulary* (`generation_blocked` + `redirectPrompt`, `session_expired`,
      `content_too_long`)
- [ ] Drop the client pre-flight and intent classification; state the redirect is an instruction
      and name the test that proves it
- [ ] Keep the accessibility table; add the transcript page to it
- [ ] Add the "what we overturned" appendix
- [ ] Flag the Privacy Policy line for review in the issue, not a comment in the spec

#### Kept exactly as-is

- [x] the philosophy table, the twelve starter prompts, the five refusals
- [x] `canDraft` (3 messages, 150 tokens) and the input/output ratio rule
- [x] delimiters, control-character stripping, 2,000-char cap, whitespace rejection
- [x] the accessibility keyboard map and screen-reader announcements

## 5. The Bones

**Character**: A skeleton in the shape of a feature, buried before anyone decided whether it should
be a bird or a fish. Two columns exist in production for a thing that never happened, one of them
isn't in the schema as far as TypeScript is concerned, and the table they hang off has been
officially declared dead. Nothing here is wrong. It is *unfinished in a way that reads as done*.

### Safari findings: What exists today

**`posts.fireside_assisted`** (migration 027, `INTEGER DEFAULT 0`, partial index on `= 1`):

- [x] The column is real in the production DB, with an index that only covers the interesting rows
- [x] The bugs API accepts and writes it (`api/blooms/+server.ts:37,362`)
- [ ] **It is not in the Drizzle schema.** `content.ts` declares `posts` without it — so the typed
      schema disagrees with the database, and every writer reaches past the types
- [ ] **Nothing reads it.** Two call sites in `garden/new` write a literal `0`; no page, API or
      footer ever asks whether a post was fireside-assisted
- [ ] **The enforcement the spec described does not exist.** Re-appending the marker on write, and
      refusing to clear the flag, were both specified and neither survived

**`wisp_requests`** (migration 015, extended by 027):

- [x] Sensible shape for a usage ledger: user, action, mode, model, provider, tokens, cost, slug
- [x] Indexed for the three questions asked of it: per-user time, per-day cost, per-day volume
- [x] `fireside_session_id` was added when sessions were only an idea
- [ ] **The schema marks it deprecated**: *"Wisp has been removed. Table retained for prod data
      integrity."*
- [ ] **No live code writes it.** The only writers are junk-drawered
- [ ] **No `tenant_id`** — it is a per-user ledger in a per-tenant world

**The grafts** (`wisp_enabled` 092, `fireside_mode` / `scribe_mode` 040):

- [x] Structured flags with rules, greenhouse-only, a Wayfinder override, all disabled in 113
- [ ] `fireside_mode` is read by nothing except an engine integration test
- [ ] The beta deployment is the gate now (`isBetaDeployment()`), so these are a second, unread
      switch for the same decision

**Where the data belongs** (verified, not assumed):

- Posts, tenants and `tenant_secrets` live in **`grove-engine-db`**; posts cascade on tenant delete
- Timeline and gallery config live in **`grove-curios-db`** (a different database)
- `webhook-cleanup` already runs **daily at 03:00 UTC against the engine DB** — an existing owner
  for retention, no new worker needed
- New migrations start at **128** (127 is the newest today)

### Design spec (safari-approved)

**Core decision:** the conversation lives in the **engine DB**, next to the posts it becomes, in
two new tables; `posts.fireside_assisted` is kept and finally taught to the schema; `wisp_requests`
is left to rest in peace.

#### 1. Why the engine DB and not a curio DB

A fireside conversation exists to become a post. It must live in the same database as `posts` so
that a tenant delete cascades, a post and its receipts are queried together, and there is no
cross-database transaction to invent. Curio databases hold *config*; this is *content*.

#### 2. `fireside_sessions`

```sql
CREATE TABLE fireside_sessions (
  id            TEXT PRIMARY KEY,                    -- server-minted uuid
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','drafted','accepted','abandoned')),
  post_id       TEXT,                                -- set on accept; NULLed if the post dies
  turns         INTEGER NOT NULL DEFAULT 0,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd      REAL NOT NULL DEFAULT 0,             -- estimated from the catalog, then recorded
  model         TEXT,
  transcript_public       INTEGER NOT NULL DEFAULT 0,
  transcript_published_at INTEGER,
  started_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at    INTEGER                              -- retention; set on write, extended on activity
);

CREATE INDEX idx_fireside_sessions_tenant_updated
  ON fireside_sessions(tenant_id, updated_at DESC);
CREATE INDEX idx_fireside_sessions_open
  ON fireside_sessions(tenant_id, user_id) WHERE status = 'open';
```

Decisions inside it:

- **`post_id` is a plain column, not a foreign key.** Deleting a post must not silently erase the
  conversation that made it; the session outlives the post, the transcript link is dropped, and
  retention takes it later. One direction only — no `posts.fireside_session_id` to drift from it.
- **Cost is on the session**, not resurrected in `wisp_requests`. A session's spend is the sum its
  own row already knows; the usage page reads sessions when it wants conversation costs.
- **`status` says what happened**, so "open" is a query (`WHERE status = 'open'`), not a guess from
  timestamps — resume depends on this being cheap.
- **`expires_at` rather than a policy in prose**: 90 days for a session nobody finished; accepted
  sessions with a live post follow the post.

#### 3. `fireside_messages`

```sql
CREATE TABLE fireside_messages (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES fireside_sessions(id) ON DELETE CASCADE,
  tenant_id  TEXT NOT NULL,                          -- denormalised: every query filters on it
  role       TEXT NOT NULL CHECK (role IN ('user','wisp')),
  kind       TEXT NOT NULL DEFAULT 'turn' CHECK (kind IN ('turn','draft')),
  content    TEXT NOT NULL CHECK (length(content) <= 8000),
  seq        INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX idx_fireside_messages_session_seq
  ON fireside_messages(session_id, seq);
```

- **`seq` is the order**, not `created_at` — two messages in the same second are normal here and
  ordering must not be a tiebreak question.
- **`tenant_id` is duplicated on purpose.** Every read filters by tenant; making that a join is how
  a tenant-boundary bug gets written six months from now.
- **`kind = 'draft'`** stores the assembled draft before it is accepted, so going back to the chat
  does not throw it away. The transcript decides what it shows; the table just remembers.
- **8,000 chars**, not 2,000: the message cap is a route rule, and the column is a sanity bound
  that should not fail a legitimate paste twice the size.

#### 4. `posts`: keep the column, fix the schema

- [ ] Add `firesideAssisted: integer("fireside_assisted").default(0)` to the `posts` table in
      `content.ts` — the column exists in production and the types pretend it does not
- [ ] No new column on `posts`. The session points at the post, not the other way around
- [ ] `is_beta` (migration 118) is the precedent for how this is supposed to look: migration,
      schema, written at creation, read at render

#### 5. `wisp_requests`: let it rest

- [ ] No new writers. The table keeps its production data and its `@deprecated` marker
- [ ] `fireside_session_id` on it stays dormant; nothing new reads or writes it
- [ ] The new spec says this out loud, because a table called `wisp_requests` sitting next to a
      cost-bearing session is exactly the kind of thing someone "helpfully" starts writing to

#### 6. The grafts stay off — and the premise is retired

The graft system was an attempt to answer "should this tenant see this" that grew into three
different ideas at once (a flag, a component naming convention, an allowlist). It never answered
the question cleanly here, and it is not the mechanism any more: **features go to the beta
deployment** (`isBetaDeployment()`, `<tenant>-beta.grove.place`), where a person can try the real
thing and fall back to mainline Aspen by walking through the other door.

- [ ] Do not re-enable `fireside_mode` / `wisp_enabled` / `scribe_mode`, and do not add a new one
      for Fireside. The gate is the beta deployment — two gates for one decision is how a feature
      ships to everyone by accident
- [ ] Leave the rows (they are the audit trail); leave the inert `tenant_settings` keys from 016

#### 7. Retention is a cron, not a promise

- [ ] `webhook-cleanup`'s daily 03:00 UTC run deletes messages then sessions past `expires_at`,
      and logs the counts it purged
- [ ] Deleting a session (`DELETE /api/fireside/[id]`) hard-deletes its messages by cascade
- [ ] Deleting a tenant cascades both tables (the FK does it)
- [ ] Deleting a post sets `post_id = NULL` and `transcript_public = 0`, and leaves the session
- [ ] No admin route anywhere selects `fireside_messages.content` — say it in the spec, and let a
      test fail if one appears

#### Migration needs

- [ ] `128_fireside_sessions.sql` — both tables, indexes, and the `posts` schema note (SQLite needs
      no change for a column that already exists)
- [ ] `content.ts` — `posts.firesideAssisted`
- [ ] `platform.ts` — leave `wispRequests` deprecated and stop pretending it is a live ledger
- [ ] Data migration: **none**. There are no conversations to migrate, which is the one mercy here

## 6. The Watering Hole

**Character**: A room with four doors and no chair by the fire. The editor is a good, long-standing
tool — 2,299 lines across two pages, with autosave, zen mode, a gutter panel, image upload and a
preview — and there is nowhere in it to sit down and talk. Not a broken surface. A surface with no
invitation on it.

### Safari findings: What exists today

**The editor component** — `libs/engine/src/lib/content/editor/MarkdownEditor.svelte`:

- [x] One component, four consumers: `arbor/garden/new`, `arbor/garden/edit/[slug]`,
      `arbor/pages/create`, `arbor/pages/edit/[slug]`
- [x] Real features that a chat overlay must not disturb: `useDraftManager` (localStorage + server
      sync), zen mode, scroll sync, line numbers, `write | split | preview`, gutter inserts,
      image upload
- [x] A clean prop surface — `content` is bindable, `onSave`, `saving`, `readonly`, `flags`,
      `configuredCurios`
- [x] **A precedent for exactly this problem**: `uploadAccessUrl` is a prop the *app* builds,
      documented as *"only it knows the tenant; the editor just renders the door"*
- [ ] **No slot for app-provided actions.** The toolbar is internal (`insertHeading`, `insertLink`,
      `insertFootnote`, image upload), so an Aspen-only button has nowhere to go without either
      a new prop on a shared component or duplicating markup into both pages
- [ ] No awareness of any AI feature — correct, and worth keeping that way

**The two post pages** — `garden/new` (941) and `garden/edit/[slug]` (1358):

- [x] Both have a page header with `header-actions` — a natural home for a button that opens a
      drawer, if the button is allowed to be page-level
- [x] Both mount the editor in `editor-main` with the gutter as a sibling — so an overlay that
      does not replace the editor keeps autosave alive underneath
- [x] `garden/new` hardcodes `fireside_assisted: 0` at two call sites (Stop 5)
- [ ] Two copies of any header button, if it lives in the pages rather than the editor
- [ ] Nothing anywhere checks `isBetaDeployment()` in an editor page today

**What already exists to build the overlay with:**

- [x] `Sheet.svelte` — a shadcn/bits-ui drawer with focus trap, `Escape`, `aria-modal` and
      `side="left|right|top|bottom"` for free
- [x] `Dialog.svelte`, `GlassOverlay.svelte`, `GlassConfirmDialog.svelte`
- [ ] Nothing that is a chat *drawer* — the pieces are there, the assembly is not

### Design spec (safari-approved)

> **Not locked.** Autumn's call at the campfire: *"the actual mockup of the UI will need a design
> session of its own — I can't see it, and I need to see it."* The structure below is agreed; the
> surface is not. A visual design session comes before this stop is written into a spec, and the
> session needs a rendered drawer to look at, not a description of one.

**Core decision:** the fire is a **drawer over the editor**, opened by **one button that the engine
offers a slot for and Aspen fills**, and accepting a draft never silently replaces words that are
already there.

#### 1. The engine gets a slot, not a feature

`MarkdownEditorProps` gains one optional snippet:

```ts
/** App-provided controls, rendered at the right of the toolbar. */
editorActions?: Snippet;
```

- Rendered inside the toolbar next to the existing buttons; renders nothing when absent, so the
  four consumers are untouched
- The engine learns nothing about Fireside, tenants or AI — the same rule `uploadAccessUrl`
  already follows
- Aspen passes a button; the button opens Aspen's sheet

This is the whole integration. Everything else lives in `apps/aspen`.

#### 2. Two labels, depending on what is already there

| Editor state | Label | Where |
| --- | --- | --- |
| Empty | **Start with a conversation** | the editor's empty state, and the toolbar |
| Has words | **Fireside** | toolbar only |

Both open the same drawer. The empty-state card exists because a blank page is the exact moment
the feature is for; the toolbar button exists for *"I froze halfway"*, which is equally common.
Keyboard: `Cmd/Ctrl+Shift+F` toggles from either.

#### 3. The drawer

- **Desktop**: `Sheet side="right"`, ~28rem, full height, editor still visible to its left
- **Mobile**: `Sheet side="bottom"` at ~90vh, full width — a chat needs vertical room and a
  composer pinned above the keyboard, not a 28rem column
- **The editor stays mounted** underneath. This matters more than it looks: unmounting would fire
  `useDraftManager`'s teardown and could lose a half-saved paragraph
- **Focus**: the composer takes focus on open; `Escape` closes (the Sheet's own behaviour); focus
  returns to the button on close; the message list is the live region (Stop 4's accessibility table)
- **Resume**: on open, if an unfinished session exists (Stop 1 §4), the drawer opens into it with
  *"You were here yesterday. Pick up, or start over?"* above the messages

#### 4. Accepting a draft is a merge, not an overwrite

The one place this feature can destroy work, so it is decided here rather than left to the
implementation:

| Editor state | On accept |
| --- | --- |
| Empty | title + content set, `fireside_assisted = true`, saved through the page's existing handler |
| Has words | a three-way choice — **Insert at top**, **Replace everything**, **Cancel** — with the draft preview still visible behind it |
| Editing an existing post | same three-way, plus `fireside_assisted` set on save |

No default that silently wins. The autosave manager and the server must agree afterwards, so accept
routes through the page's own save function rather than writing `content` and hoping the debounce
notices — #1586's lesson was that a write-only sync with no read-back loses work.

#### 5. Beta is the gate

- [ ] No graft, no flag. The page's `load` passes `firesideEnabled: isBetaDeployment(locals, url)`
- [ ] On mainline, the slot renders nothing and the shortcut does nothing — the code is present,
      the door is not
- [ ] `Cmd/Ctrl+Shift+F` is still bound on prod (harmless), but a no-op without the button

#### 6. Posts only, for now

`fireside_assisted` is a `posts` column and the marker is a post concept. **Pages (`pages/create`,
`pages/edit`) do not get the button in this pass** — a page is a standing document, not a dated
post, and inventing marker semantics for it is a decision with no user behind it yet. The engine
slot makes that a prop, not a fork, when the day comes.

#### Editor fixes

- [ ] `MarkdownEditorProps`: add `editorActions?: Snippet`; render it in the toolbar; nothing else
- [ ] Empty state: a "Start with a conversation" card that only appears when the slot is filled
- [ ] `garden/new`: pass the button; stop hardcoding `fireside_assisted: 0` (Stop 5's flag flows
      through the accept path instead)
- [ ] `garden/edit/[slug]`: pass the button; accept merges into existing content
- [ ] Bind `Cmd/Ctrl+Shift+F` at the page level, not the editor, so it works in zen mode too

#### Drawer fixes

- [ ] Build `FiresideDrawer.svelte` in Aspen on `Sheet` (right on desktop, bottom on mobile)
- [ ] Keep the editor mounted; no teardown on open
- [ ] Focus the composer on open, return focus to the button on close
- [ ] Resume an unfinished session instead of always starting fresh
- [ ] The accept step asks the three-way question and sets the marker + transcript opt-in (Stop 1 §7)
- [ ] Route accept through the page's save handler so autosave and server agree

#### Not in this pass

- Pages (`pages/*`) — see §6
- A Fireside tab inside the old Wisp panel — the panel is junk-drawered and Wisp is a sibling
  feature, not a host (Stop 4)

## 7. The Pride

**Character**: The animal Fireside should be built like. The timeline's recipe is the first thing
in this codebase that uses Lyra properly — a bounded loop, eight tools, a real budget, and numbers
written down by someone who paid for the mistakes. Almost all of it transfers. Two of its constants
do not, and Autumn called both before the jeep stopped.

### Safari findings: What exists today

`libs/curios/src/timeline/recipe/` (~2,000 lines across 12 files: `recipe.ts`, `tools.ts`,
`instructions.ts`, `state.ts`, `github.ts`, `serialize.ts`, plus tests) and
`libs/curios/src/timeline/generate.ts` (313).

- [x] **A recipe, not a prompt**: `defineRecipe` with `setup` (renders the day and mints handles),
      `tools` (eight), `system` (the voice), and `limits`
- [x] **Tools have an `apply` step** so a resumed run replays saved results instead of re-calling
      anything (decision 112) — a resume costs nothing and repeats nothing
- [x] **The token lives in a closure, never in run state** (decision 51) — the GitHub reader holds
      it, the model never sees it
- [x] **`compaction` is wired into `runTask`, not just declared.** The comment says exactly what
      happened without it: *"1.3 million input tokens for a thirty-one turn day, and eight cents
      for a page"*
- [x] **Real measurements**: 14 turns, 169k input / 13k output, **$0.0076** for a day
- [ ] **`DEFAULT_STEP_LIMIT = 40`** — a constant, and Autumn's ruling: *"we can't lock it in at a
      set amount of steps"*
- [ ] **`COMPACTION_WINDOW = 32_000`** — sized for the timeline's tool-heavy day, and her ruling:
      *"a bit low, it could be higher"*
- [ ] **The 32k rationale has already expired.** Its doc comment justifies the number as *"a proxy
      for message count — Lumen caps a request at 100 messages"*. That cap is **400** today
      (`preprocessor.ts:206`), so the proxy argument is pointing at a number four times larger
      than when it was written

### What Lyra actually offers (read from the installed types)

This is the part that changes the design, because the timeline only uses a third of it:

- **Every limit is optional; none by default; reaching one *parks* rather than kills** (decisions
  18, 22, LIM01). Available: `steps`, `tokens`, `timeMs`, `cost`. A parked run keeps its work and
  can resume with a larger allowance.
- **`toolResultBytes`** (decision 40): *"how much of one tool result the model may read before it
  is cut"*, overridable per tool by `maxResultBytes`.
- **`stuck`** (decision 25): on by default; `reminders` = how many nudges a model that stops
  without finishing gets; `sameFailure` = how many identical tool failures in a row stop the run.
- **`control`**: steers and follow-ups, read at the moments that keep the record paired.

### Design spec (safari-approved)

**Core decision:** build Fireside's recipe in the timeline's shape, take **no** limits from it,
derive the step budget from the tool set, and size the compaction window to the model rather than
to a number copied from another feature.

#### 1. The step budget is derived, not declared

A reply turn ends when the model **answers in prose with no tool call** — that is its finish
condition, so steps are a runaway guard, not a budget. The guard should be the size of the work the
run can legitimately do:

```
steps = 2 * tools.length + 2        // three tools → 8
```

- Two steps per tool covers one call and one retry after a failure
- `+2` covers the opening turn and the final answer
- Passed as `limits.steps`, overridable per call — **the formula lives in the recipe, the number
  never does**
- A run that reaches it **parks** (resumable), which is the correct outcome for a guard: visible,
  not fatal
- `stuck.reminders: 0` for the reply turn — the timeline nudges a model that answers with prose
  instead of calling tools; here prose *is* the answer, and a nudge would be the loop arguing with
  a correct finish. `sameFailure: 2` stays: two identical tool failures means the tool is broken,
  not the model.

#### 2. The window is the model's, not another feature's

The insight that makes this easy: **a bigger compaction window costs nothing until it is reached.**
The window is not a budget — the *history* is what costs, and the history is what it is. A low
window makes a summary call fire earlier, throwing away detail and spending tokens to do it. So:

```
compaction = {
  contextWindow: modelContext - outputReserve - systemPromptAllowance,   // capped by policy
  reserveTokens: 4_000,
  keepTokens:   window / 3,
}
```

- **Not 32k.** For the default model (a 1M-context DeepSeek, per the registry) a window around
  **128k** is a sane policy cap: far above any real fireside session, far below the point where a
  single request would be unwieldy
- **`keepTokens` scales with the window** (a third), because cutting a long conversation down to
  the timeline's 12k would throw away the middle of it — exactly the detail a writer wants back
- **Compaction should essentially never fire.** If it does, that is a signal about tool payloads,
  not about the conversation

#### 3. Bound the tools, not the conversation

The thing that can actually inflate a fireside session is a tool returning a whole post:

- [ ] `read_draft` returns **the first ~400 words plus a note** ("the post continues; ask about a
      section"), not the full document
- [ ] `read_my_recent_posts` returns **two or three short excerpts** with titles, never whole posts
- [ ] `toolResultBytes` is set on the run as a backstop, with `maxResultBytes` on each tool as the
      honest bound

With those three, a 30-turn session stays around 6–10k tokens and the window is insurance rather
than machinery.

#### 4. No cost, token or time limits

Autumn's ruling at Stop 2 holds: it is the Wanderer's key, and the ceiling is their provider
account. `limits.cost`, `limits.tokens` and `limits.timeMs` are all left unset. A per-user spending
limit, if it ever exists, is a Lumen setting (#1867) — not a per-feature number.

#### 5. The draft is a **tool**, and Lyra already has the primitive

Autumn's call, and it changes the shape for the better: *"what if we gave it a tool that is the
final draft? I've done this with an agent before and we have a confirm step for it."*

Lyra ships exactly that, twice, and they answer different questions:

| Primitive | What it is | Fits here? |
| --- | --- | --- |
| **`createProposeTool`** (decisions 50, 52, 53) | *"A finished run's result, for a person to decide later."* The args carry a **schema-validated payload** plus evidence; a payload the schema refuses never becomes a proposal, and the model is told what was wrong so it corrects itself **inside the loop** | **Yes.** This is the draft |
| **`policy: "ask"`** (decisions 34, 35, 85) | A run **parks mid-flight**, saves a request in the record, and resumes when a person answers | No. Nothing the draft run does needs to interrupt itself — the draft is finished when it is proposed, and the writer confirms afterwards |

So the draft run ends by calling `propose_draft({ title, body, ... })`:

- **The schema replaces the JSON parse.** The old prompt asked for JSON and fell back to raw text
  with *"the formatting may be a bit rough"*. A `propose` payload is validated where the model's
  turn crosses into the run, so garbage never becomes a draft and the model gets a correction
  instead of the writer getting a warning
- **The draft run keeps its tools.** It can `read_draft` *while* assembling, which is what makes
  "I arrived with fragments" work — the old no-tools draft step could only see the conversation
- **The confirm step is structural, not a UI afterthought.** The run finishes with a proposal;
  the drawer shows it; accepting calls `POST /api/fireside/[id]/accept`. Nothing is applied to the
  post by the model
- **The transcript gets a real event.** "Wisp proposed a draft, the writer accepted it" is a row
  the footer can show honestly (Stop 8)

The rule from Stop 2 survives in a sharper form: **one tool assembles prose, and it stops and
asks.** Everything else reads.

#### 6. The tool set, deliberately small

The candidate list ran to a dozen, which is the shape of a feature that has not decided what it is.
The bar for a tool is that **the model cannot say the thing correctly without it** — that is the
timeline's own rule (`tools.ts`: the model never types a repo name, a hash, a link or an anchor).

| Tool | Run | Risk | Payload bound | Why |
| --- | --- | --- | --- | --- |
| `read_draft` | turn + draft | reads | first ~400 words + "the post continues; ask about a section" | mid-post Fireside is half the feature; without it Wisp is guessing |
| `read_my_recent_posts` | turn + draft | reads | 2–3 titles + first ~80 words each | so Wisp *hears* the voice instead of being told to have one |
| `propose_draft` | draft only | proposes | schema: `title` (≤120 chars), `body` (≤ the draft's token budget) | the only writer of prose, and it stops and asks |

**Rejected, with reasons:**

- `suggest_title` — see §6a. The *conversation* about a title needs no tool, and the proposal
  already carries one.
- `ask_writer` / mid-run approval — the whole feature is a conversation; a run that parks to ask
  a question is the chat asking the chat.
- `remember(name, value)` — a session scratchpad is genuinely attractive for long conversations and
  genuinely invisible in the transcript. Not v1.
- `insert_into_editor` / `write_post` — the model never writes to the post. Accept is a person's
  action, outside the run.
- `search_my_posts(query)` — the better version of "hear my voice" for a long archive, and the
  obvious v1.1 once there are enough posts to search. Not both in v1.
- `read_site_settings` / voice preset — this belongs in the **instructions**, not a tool. A tool
  call to learn something the recipe already knows is a wasted step.

Two tools that read, one that proposes. That is the whole surface.

#### 6a. Working on the title is a conversation, not a tool

Autumn's note at the campfire: *"what if in the chat session I go 'ok let's now work on the title'
and we go through it there."* Yes — and that already works, which is the point. Prose costs
nothing to produce, so "give me three titles for this feeling" is a perfectly ordinary reply in the
turn run. The tool was never what made titles possible.

The only thing a `set_title` tool would add is **persisting the chosen title** so the draft step
does not re-guess it. Three ways to carry that, cheapest first:

| Carrier | Cost | Verdict |
| --- | --- | --- |
| The draft proposal's own `title` field, **editable in the preview before accept** | none — the field already exists | **v1** |
| A session field the *client* sets when the writer confirms in the preview | one column, no new tool | v1 if the preview needs to survive a reload mid-decision |
| `set_title` as a model-called tool that writes session state | a tool, a schema, a chip in the drawer, and a write the model performs on its own | not v1 — the model proposing words is fine; the model *recording decisions* is a different permission |

So: titles get talked about freely, the proposal carries one, and the writer edits it where they
already edit everything else. If a long title negotiation later feels lossy, the middle row is the
answer, not the bottom one.

#### 6b. Two runs

- **`fireside-turn`** — **`read_draft` only**, `steps = 2*1+2 = 4`,
  `stuck.reminders: 0` (prose is the finish), `sameFailure: 2`. Autumn's ruling: replies stay
  cheap, and the archive-reading work belongs to the step that is assembling the words
- **`fireside-draft`** — the same two readers plus `propose_draft`,
  `steps = 2*3+2 = 8`, no nudges

#### Recipe fixes

- [ ] `createFiresideTurnRecipe` / `createFiresideDraftRecipe`, following the timeline's file layout
      (instructions, tools, state, serialize) so both features read the same way
- [ ] `propose_draft` built with `createProposeTool`, payload schema `{ title, body }`, with the
      draft's own word budget enforced by the schema rather than by a sentence in a prompt
- [ ] `limits.steps` derived from `tools.length`; no `DEFAULT_STEP_LIMIT` constant
- [ ] `stuck: { reminders: 0, sameFailure: 2 }` on the turn recipe; none needed on the draft
- [ ] `compaction` computed from the model's context (policy cap ~128k), `keepTokens` = window/3
- [ ] `toolResultBytes` set on the run; `maxResultBytes` per tool
- [ ] No `cost`/`tokens`/`timeMs` limits
- [ ] The draft recipe has no tools and one step

#### Notes for later (not this feature)

- [ ] The timeline's own `COMPACTION_WINDOW` doc still justifies 32k with a 100-message cap that
      is now 400. Worth a follow-up of its own — its numbers may be costing quality for no reason
