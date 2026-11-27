---
title: "Fireside — A Good Listener, Not a Ghostwriter"
description: "A conversational writing mode that helps a frozen writer say what they already think, assembles only their own words, and shows its receipts."
category: specs
specCategory: "content-community"
icon: flame
lastUpdated: "2026-11-27"
status: planned
aliases:
  - fireside
  - fireside-mode
date created: Wednesday, November 26th 2026
date modified: Wednesday, November 26th 2026
tags:
  - writing
  - ai
  - lumen
  - lyra
  - privacy
type: tech-spec
---

```
       ~   ~
      (     )      sit by the fire
     (       )     and tell me what's on your mind
    ~~~~~~~~~~~~~~
```

# Fireside — A Good Listener, Not a Ghostwriter

> The fire doesn't tell the story. It just creates the space where stories emerge.

Some people freeze at the blank page. Not because they have nothing to say — they have plenty to
say, they say it to friends, in group chats, over coffee. The barrier is the page itself. Fireside
is a conversation that helps a writer say what they already think, and then organizes *their own
words* into a draft they can publish.

This document is the result of a ten-stop expedition through the feature's first life
(`docs/safaris/fireside-safari.md`). It replaces the Fireside section of the Wisp specification, which
described a Grove that no longer exists: one where conversations were never stored, inference was
Grove's cost, and Wisp was the centre of the grove's AI.

**Status:** planned. Nothing here is built yet.

---

## What this is

| Fireside Does | Fireside Never Does |
| --- | --- |
| Ask thoughtful questions | Generate content from nothing |
| Organize **your** words into a draft | Add ideas you didn't express |
| Provide connective tissue between your fragments | Expand beyond what you said |
| Suggest you elaborate ("tell me more") | Take a position on your behalf |
| Respect minimal answers with short drafts | Pad low-effort responses into full posts |
| Put a vine in the margin where you gestured at something | Write the sentence you couldn't find |

**Core constraint:** the output cannot exceed the substance of the input. You get out what you put
in.

---

## The voice

This is the tone specification, not decoration. It is how Wisp sounds when it is working:

> **Wisp:** What's been living in your head lately?
>
> **You:** honestly ive been thinking about how communities form online vs irl... theres something
> different
>
> **Wisp:** Ooh, what feels different about it?
>
> **You:** like... you find people by resonance not proximity. which means the connections can be
> deeper but also more fragile? idk if that makes sense
>
> **Wisp:** That makes total sense. Resonance vs proximity. That's a really clear way to put it.
> What makes those connections feel fragile to you?

**Rules the samples encode:**

- **Short.** One to three sentences. A question or an acknowledgement, rarely both.
- **Hand their words back.** "Resonance vs proximity. That's a really clear way to put it." Quote
  them; do not summarise them.
- **One question at a time.** Never a list.
- **No advice, no teaching, no enthusiasm inflation.** "That makes total sense" is warm; "Wow, what
  an amazing insight!!" is a performance.
- **Match their register.** Lowercase and hesitant in, lowercase and gentle out.

---

## What it won't do

Users will ask for a post. Wisp declines and redirects, and these five are the pattern:

| The ask | The answer |
| --- | --- |
| "Write me a post about X" | "I can't write for you, but I'd love to hear what *you* think about X. What draws you to it?" |
| "Expand this into a full post" | "Let's talk through it instead. What's the main thing you want people to take away?" |
| "Add some stuff about Y" | "I can only work with what you've told me. Want to tell me about Y?" |
| "Make this sound smarter" | "Your voice is the whole point. What do you actually want to say?" |
| "What do you think about X?" | "This is your space. What do *you* think?" |

This is an **instruction**, not a classifier. The redirect lives in the recipe's instructions and is
proven by a test (see [Testing](#testing)). A keyword pre-flight cannot catch *"help me say this
better"*, and a model call per turn to police one rule costs more than the rule is worth. If a
classifier is ever genuinely needed, it is a **decision model** (`docs/specs` → #1853), run once at
the draft step — never a chat call on every turn.

---

## When it opens its mouth

"Ready to draft" appears when there is enough substance to organize:

```ts
canDraft(messages) =
  userMessages.length >= 3 &&
  estimatedTokens(userMessages) >= 150
```

- **Wisp's own messages never count.** A model that talks a lot has not given the writer anything to
  organize.
- Tokens are estimated at 4 characters per token — deliberately conservative, and exact enough for a
  gate that never needs to be right to the token.
- Below the gate the reply is: *"We're just getting started! Tell me a bit more before we shape it
  into words."*

---

## Where the conversation lives

A Fireside conversation is **kept in the writer's own tenant database** — in `grove-engine-db` next
to the posts it becomes. This is a deliberate change from the original design, which promised that
conversations were never stored anywhere.

**Why the change:** you cannot resume what you did not keep, and a published transcript is only
possible if the conversation exists. The writer's own history is worth keeping; a promise of "we
never keep it" was a promise of a worse feature.

**The promise now, stated narrowly and honoured:**

> Your conversation is yours. It is kept in your grove's own database so you can come back to it, and
> so a post can show its own receipts if you choose. It is never used to train a model, never read by
> a person at Grove, and never shown to anyone unless you publish the transcript. You can delete a
> session at any time, and deleting a post deletes its transcript.

Each clause has a mechanism:

| Promise | Mechanism |
| --- | --- |
| kept in your grove | `fireside_sessions` / `fireside_messages`, tenant-scoped, engine DB |
| never used for training | **ZDR providers only**, even where they cost more (Lumen's provider policy) |
| never read by a person | no admin route selects `fireside_messages.content`; a test fails if one appears |
| never shown unless you publish | `transcript_public = 0` by default; the writer opts in |
| delete it, any time | `DELETE /api/fireside/[id]`; messages cascade |
| deleting a post deletes its transcript | the post owns the link (`posts.fireside_session_id`) |

**Retention:** an unpublished session expires after **90 days** (a starting number, revisitable).
A session with a published transcript is **exempt** — a transcript is a promise to a reader and must
not vanish underneath a live post. Deletion runs in `webhook-cleanup`'s existing 03:00 UTC pass.

---

## What it costs

Fireside runs on **the Wanderer's own OpenRouter key**, resolved through
`resolveOpenRouterKey()` — the same one AI key every feature uses (`openrouter_api_key`, with the
timeline's older `timeline_openrouter_key` as fallback).

- **No cost cap, no per-turn quota, no session budget.** The ceiling is their provider account, and a
  second Grove-side number would be a copy of something they can see better than we can.
- Grove pays only for platform-level AI: **moderation** (Thorn for text, Petal for images).
- A missing key fails with *"No AI key is set. Add one in Arbor → Settings → AI, then try again."* —
  not a provider 401.
- Per-user spending limits, if they are ever wanted, are a **Lumen setting** (#1867), not a feature
  concern.

**What a session costs:** the repository's only measured datapoint is a timeline day — 14 turns,
169k input tokens, **$0.0076**. A fireside session is far smaller (6–10 turns, history well under
~2k tokens because the tools are bounded). The honest claim is **well under a cent on a cheap model,
ten to twenty times that on a frontier one**, to be replaced by a measured number after the first
real session.

---

## How it is built

Two Lyra recipes on top of Lumen, seven routes, two tables, one column, one cron.

### The two recipes

| | `fireside-turn` | `fireside-draft` |
| --- | --- | --- |
| Job | one reply, in prose | organize the writer's words into a draft |
| Tools | `read_draft` | `read_draft`, `read_my_recent_posts`, `propose_draft` |
| Steps | `2 × 1 + 2 = 4` | `2 × 3 + 2 = 8` |
| Output | ≤150 tokens, temperature 0.7 | a validated proposal, temperature 0.3 |
| Finish | `ending: "reply"` — prose *is* the finish | `propose_draft` |
| Stuck | `reminders: 0`, `sameFailure: 2` | `reminders: 0`, `sameFailure: 2` |

**`ending` has to reach `runTask`.** Declaring it on the recipe is inert: the run config carries it
beside `limits` and `compaction`, and a run told to end on a reply but not given `ending: "reply"`
finishes exactly like a run that stopped without finishing. Lyra 0.4.0 removed the sentinel `finish`
the earlier draft of this spec relied on.

**Steps are derived, never declared.** `2 × tools + 2` covers one call and one retry per tool, plus
the opening turn and the final answer. A run that reaches its limit **parks** (Lyra's behaviour),
which is visible and resumable — the correct failure for a guard.

**`reminders: 0` on both.** The timeline nudges a model that answers with prose instead of calling
tools. Here prose *is* the answer; a nudge would be the loop arguing with a correct finish.

**Compaction is sized to the model, not copied from another feature.** A window costs nothing until
it is reached — the history is what costs — so a low window only spends a summary call and throws
away detail.

```ts
compaction = {
  contextWindow: modelContext - outputReserve - systemAllowance,  // policy cap ~128k
  reserveTokens: 4_000,
  keepTokens:   window / 3,
}
```

Compaction should essentially never fire for a fireside session. If it does, the signal is about tool
payloads, not about the conversation.

**No `cost`, `tokens` or `timeMs` limits.** See [What it costs](#what-it-costs).

### The tools, deliberately small

The bar: **the model cannot say the thing correctly without it.** (The timeline's rule: the model
never types a repo name, a hash, a link or an anchor.)

| Tool | Run | Risk | Bound | Why |
| --- | --- | --- | --- | --- |
| `read_draft` | both | reads | first ~400 words, then *"the post continues; ask about a section"* | mid-post Fireside is half the feature; without it Wisp is guessing |
| `read_my_recent_posts` | draft | reads | 2–3 titles + ~80 words each | so Wisp hears the voice instead of being told to have one |
| `propose_draft` | draft | proposes | `title` ≤120 chars, `body` ≤ the draft's token budget, `vines` ≤6 | the only writer of prose, and it stops and asks |

`toolResultBytes` is set on the run as a backstop; each tool also declares `maxResultBytes`.

**Rejected, with reasons:** `suggest_title` (the proposal carries one, and titles are a conversation
— see below), `ask_writer` (the conversation is the asking), `insert_into_editor` (accept is a
person's action), `read_site_settings` (that is instructions, not a tool), `search_my_posts`,
`read_past_session` and `remember` (all good; all later — `search_my_posts` is the obvious v1.1 for a
long archive).

### The draft is a proposal

`propose_draft` is built with Lyra's `createProposeTool`: a finished run's result, for a person to
decide later. The payload is schema-validated where the model's turn crosses into the run, so a
malformed draft never becomes a proposal — the model is told what was wrong and corrects itself
inside the loop. This replaces the old "ask for JSON, then parse, then fall back to raw text with a
warning" dance entirely.

**It does not use mid-run approval** (`policy: "ask"`). Nothing the draft run does needs to
interrupt itself; the draft is finished when it is proposed, and the writer confirms afterwards.

### Vines come with the draft

A vines is a margin note: `posts.gutter_content`, `{ type: "comment", anchor, content }`, rendered as
markdown beside the paragraph it belongs to. The editor supports three anchor shapes — a header's
text, `paragraph:N`, or an explicit `<!-- anchor:name -->`.

**The model never types an anchor.** It quotes a fragment of its own body; the tool resolves it:

```ts
propose_draft({
  title: "Resonance, not proximity",
  body: "…## Finding each other\n\nYou don't connect with people because they live nearby…",
  vines: [
    {
      quote: "You don't connect with people because they live nearby",
      text: "This is the line I want the whole post to earn.",
    },
  ],
})
```

1. the quote is found in `body` (exact, whitespace-normalised)
2. the tool resolves it to the **top-level paragraph** containing it and writes `paragraph:N`
3. on accept, the item becomes `{ type: "comment", anchor: "paragraph:N", content: text }`

A quote that is not in the body is **refused with a message naming what is** — *"that phrase isn't in
the draft; quote the sentence you mean"* — and the model corrects. Nothing lands that the writer did
not see in the preview. Bounds: six vines, ~280 characters each. Vines are asides, not a second post.

**Accept writes two columns**: `markdown_content` and `gutter_content`. A draft accepted without its
vines is half accepted.

### Acceptance is part of the save

The page does not save and then confirm: the save **is** the confirmation. A create or update may
carry `fireside: { sessionId, transcriptPublic }`, and the route

1. verifies the session belongs to this writer in this grove (**`404`** otherwise, before any write),
2. writes the post with `fireside_assisted = 1` and `fireside_session_id` in the same insert,
3. marks the session `accepted` and records the transcript choice behind it.

The order matters: the post carries the truth before the session is updated, so the only failure left
is a session still marked `drafted` — which re-accepting fixes. The reverse would leave a post that
cannot say where it came from.

### The routes

```
POST   /api/fireside                    start a session (mints the id, returns the first prompt)
GET    /api/fireside/[id]               resume: messages, canDraft, whether a draft was accepted
POST   /api/fireside/[id]/turn          say something → one reply
POST   /api/fireside/[id]/draft         organize the writer's own words → a proposal
POST   /api/fireside/[id]/accept        record acceptance: post link, marker, transcript opt-in
POST   /api/fireside/[id]/transcript    publish the conversation under its post, or take it down
DELETE /api/fireside/[id]               let it go (messages cascade)
```

The seventh route is the same question accept asks, asked later: the writer changes their mind from
the post or from the editor, and one route keeps both ends writing one column and purging one page.

- **History is never accepted from the request body.** It is loaded from the database, which removes
  the fabrication surface the original design had (every turn re-sent the client's own history).
- **Tenant boundary on every route**, including the session lookup: right tenant/right session →
  `200`; someone else's session → **`404`**, never `403` (a `403` confirms it exists).
- **Beta gate on every route**: production returns `404` (see [The gate](#the-gate)).
- **Plan gate**: `checkFeatureAccess(db, tenantId, "ai")`, fail-open when the gate itself errors — it
  is a plan question, not a safety one.
- **The reply turn reads the writer's message, appends both messages, and records turn/token/cost
  totals on the session.**

### The data model

```sql
CREATE TABLE fireside_sessions (
  id            TEXT PRIMARY KEY,                    -- server-minted uuid
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','drafted','accepted','abandoned')),
  turns         INTEGER NOT NULL DEFAULT 0,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd      REAL NOT NULL DEFAULT 0,
  model         TEXT,
  transcript_public       INTEGER NOT NULL DEFAULT 0,
  transcript_published_at INTEGER,
  started_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at    INTEGER
);

CREATE INDEX idx_fireside_sessions_tenant_updated
  ON fireside_sessions(tenant_id, updated_at DESC);
CREATE INDEX idx_fireside_sessions_open
  ON fireside_sessions(tenant_id, user_id) WHERE status = 'open';

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

And on `posts`:

```sql
-- 027 already added this one; the Drizzle schema never learned about it
fireside_assisted   INTEGER DEFAULT 0,
-- new: the post owns its transcript, so the transcript cannot outlive the page
fireside_session_id TEXT REFERENCES fireside_sessions(id) ON DELETE SET NULL
```

**Why the post owns the link:** the post is the durable artefact and the session is the transient one.

| Event | What happens |
| --- | --- |
| session expires (never published) | `SET NULL` — the post keeps its attribution, loses a link to nothing |
| post is deleted | the transcript goes with the page that showed it |
| session deleted deliberately | same as expiry |
| tenant deleted | both tables cascade |
| a transcript was published | the session is exempt from expiry |

`seq`, not `created_at`, orders messages: two messages in the same second is normal.

`wisp_requests` is **not** used. It is marked deprecated, has no live writers, and a table called
`wisp_requests` sitting next to a cost-bearing session is exactly the thing someone will helpfully
start writing to.

### The marker

Rendered from the flag, never stored in the prose:

```
*~ written fireside with Wisp ~*
```

- `posts.fireside_assisted = 1` → the post footer renders it
- **Nothing is appended to `markdown_content`**, so nothing needs re-appending when someone edits
- One enforcement rule at the API boundary: **the flag cannot be cleared** —
  `if (currentPost.fireside_assisted) updateData.fireside_assisted = 1`
- `POST /api/fireside/[id]/accept` sets it

An edit cannot remove the marker by accident *or* on purpose, and the transcript can be turned off
without the attribution lying about what happened.

### The transcript

Off by default, asked once at accept, in the fire, in plain words.

```
… the article …
──────────────────────────────────────────
*~ written fireside with Wisp ~*          ← always, when the flag is set
[ Read how this was written ⌄ ]           ← only when the transcript is public
──────────────────────────────────────────
[ comments ]
```

- **Full transcript, both sides, verbatim.** The writer's own words are the proof the fire did not
  write them. Per-message selection (*"these three can be shared"*) is the better long-term answer and
  a lot more UI; it is not v1.
- **Proposals are counted, not reprinted**: *"Wisp proposed a draft — 1,240 words. The writer
  accepted this one."* The accepted draft is the post above; reprinting it doubles the page.
- **Closed by default**, in a `<details>` that renders without JS. Indexed, deliberately: this is
  content the writer chose to publish.
- **The owner toggles it in two places**: the post page when signed in, and the editor's fireside
  block. Not Settings → AI — a key panel is not where a post's disclosure belongs.
- **Moderation**: the transcript goes through the same Thorn hook as the post body when it first
  becomes public.
- **Caching**: the transcript joins the cached post payload (`garden:<tenant>:<slug>`); toggling
  visibility calls the existing `invalidatePostCaches`.

### Where it appears

**Inline in the editor's own frame** — not a sheet over it, and not a mode that replaces it.

> **Overturned in a live session.** The earlier draft of this spec called for `Sheet side="right"` on
desktop and `Sheet side="bottom"` on mobile. It was built, looked at, and rejected: a sheet puts a
second surface over the one the writer is working in, and Fireside is a conversation *about* those
words, so the words have to stay in sight. What shipped is a panel inside the editor's frame with a
fixed height — **70vh when the page is blank, 60vh when there are words above it** — a drag handle to
resize it, and no dimming behind it.

| Editor state | Label |
| --- | --- |
| Empty | **Start with a conversation** (empty state *and* toolbar) |
| Has words | **Fireside** (toolbar) |

- The engine (`MarkdownEditor`) gains one optional `editorActions?: Snippet` and learns nothing about
  Fireside — the same rule `uploadAccessUrl` already follows. Aspen fills the slot.
- **The editor stays mounted underneath** — unmounting would fire the draft manager's teardown.
- `Cmd/Ctrl+Shift+F` toggles; `Escape` closes (bound on the window, because the fire does not own
  focus); the resize handle is a real control with arrow keys, not a mouse-only affordance.
- **Accepting a draft is a merge, not an overwrite:** empty editor → set title/body/vines; editor with
  words → **Insert at top / Replace everything / Cancel**, with the preview still visible. It routes
  through the page's own save handler so autosave and the server agree.
- **The draft preview shows vines in the margin**, or accepting is a surprise.

Posts only, for now: `fireside_assisted` is a `posts` column and the marker is a post concept. Pages
get the button the day someone wants it, and the engine slot makes that a prop rather than a fork.

### The disclosure on the post

The post page is the one surface Fireside reaches for someone who agreed to nothing, so its two
halves are deliberately unequal: the marker always, the conversation only when the writer published
it.

- **Derived, never stored in the prose.** `posts.fireside_assisted` decides; nothing is appended to
  `markdown_content` and there is no string an edit could remove.
- **A missing transcript is not a broken page.** The load logs and degrades to the marker alone — a
  post that cannot say how it was written is still a post.
- **The owner's switch is per request, beta only.** The session belongs to a person, so it is looked
  up for the signed-in owner and never rides in the payload every reader shares.
- **A published transcript is exempt from the sweep**; taking it back down does not re-arm the clock
  and does not erase the day it first went public, which is when the writer decided.

### The gate

Grove ships experimental features on **the beta deployment**, not behind a graft.

- `isBetaDeployment(locals, url)` in the page `load` decides whether the button exists
- **every route returns `404` on a non-beta deployment** — a hidden button is not a gate, and a live
  API is a feature anyone can `curl`
- The test build passes `__GIT_BRANCH__: "beta"` at build time, so the suites see the real thing; no
  runtime bypass production could satisfy
- **Promotion is a deletion**: the `isBetaDeployment` checks come out and the next deploy serves it to
  everyone. There is no switch to go looking for.

---

## Security

- **Prompt injection**: user text is always wrapped in `USER MESSAGE START ---` / `--- USER MESSAGE
  END`, the instructions sit outside it, and content is passed through `secureUserContent()` before
  it reaches a prompt. Control and zero-width characters are stripped; messages over 2,000 characters
  are refused; whitespace-only messages are refused.
- **The key** never leaves the server after it is saved, is never read back by a route, and is only
  ever sent to Lumen as `tenant_api_key`.
- **Tenant boundary** on every route, `404` for a foreign session.
- **The model cannot write to a post.** `propose_draft` proposes; acceptance is a person's action.
- **The schedule** is the database: history comes from `fireside_messages`, never from the request.
- **No admin surface reads message bodies.** A test fails if one appears.
- **ZDR providers only.** The conversation is processed by providers that do not retain it.

---

## Accessibility

| Key | Action |
| --- | --- |
| `Tab` | move between composer, buttons and messages |
| `Enter` | send |
| `Escape` | close the drawer, return focus to the button |
| `Cmd/Ctrl + Shift + F` | toggle the drawer |
| `Arrow Up/Down` | move through the transcript |

- The message list is `role="log"` with `aria-live="polite"`; new replies are announced
- "Ready to draft" is announced when it appears
- Errors use `role="alert"`
- The ASCII fire is `aria-hidden`; small screens get a short text heading instead
- The transcript `<details>` is keyboard-operable and needs no JS
- `prefers-reduced-motion` is respected by the drawer

---

## Testing

Three suites per surface, named for who was wrong, in the real workerd harness (`@cloudflare/vitest-plugin`)
against real D1/KV/R2 — no storage mocks. `edge cases` and `error handling` are retired as names.

**happy** — start → three turns → draft → accept: session rows, message rows, a proposal, a post with
`fireside_assisted = 1` and its vines in `gutter_content`; a second session for the same tenant does
not see the first's messages.

**bad** — no session → `401`; another tenant's session → `404`, never `403`; a body carrying a
fabricated `conversation` → ignored; malformed body → `400`; no AI key → `400` naming Settings; plan
gate refuses → `403` and fails open when the gate errors; every route on a non-beta deployment → `404`.

**sad** — the model answers with nothing (Lyra retries, then reports); a proposal quoting a phrase not
in the body (refused, model corrects); Lumen unavailable → `503` with an actionable message; a session
resumed after a crash mid-turn still has every accepted message; draft requested after two messages →
the "just getting started" copy; a long conversation compacts and still finishes.

**Prompt properties, never prompt prose** — the delimiters are present, `secureUserContent` is
called, 150/0.7 and 2000/0.3 are passed, the redirect rule travels. A copy edit of the prompts must
never break a suite.

**The gate as a fact** — no turn route creates a post row. The guardrail is a database assertion, not
a sentence in a prompt.

---

## Build order

1. **Schema** — migration 128, `posts.fireside_assisted` + `posts.fireside_session_id` in the Drizzle
   schema. Lands alone, breaks nothing. **Built.**
2. **The recipes and tools** — `fireside-turn`, `fireside-draft`, three tools, `propose_draft` with
   vine resolution. Testable against a fake model slot before a route exists. **Built.**
3. **The routes** — seven routes (the transcript toggle arrived with step 4), tenant `404`s, beta gate,
   the three suites. **Built.**
4. **The marker and the transcript** — derived attribution, `<details>`, two toggles, cache purge, and
   the nightly sweep that lets go of what was never published. **Built.**
5. **The drawer** — after the visual design session. **Built as the inline fire** (see "Where it
   appears"); it was rejected on sight and rebuilt rather than designed from a description.
   **The fire also opens on an existing post** (`arbor/garden/edit/[slug]`), which is where a merge
   into words the writer already has actually matters.
6. **Beta** — merge to `beta`, deploy, live in it. **Not yet.** Migration 128 still has to be applied
   to production by hand.

In parallel from step 4: **the privacy docs** (#1868) — done, because the transcript is what made the
old policy text wrong: it claimed nothing of yours was ever held by an AI feature.

---

## What we overturned

Written plainly, because a future reader will otherwise restore these in good faith.

| Was | Now | Why |
| --- | --- | --- |
| Conversations are **never stored**; client `sessionStorage` only | **Kept in the tenant DB**, with retention and a delete path | you cannot resume what you didn't keep, and a transcript needs a conversation to exist |
| **Grove pays**, with a `$5/month` cap and 10 requests/hour | **BYOK**, no cap, no quota | inference became the Wanderer's key; the cap was never enforced here anyway |
| A **pinned model list** with a fallback cascade | **The registry decides**; the spec names a default and points at it | model lists rot within weeks, and one model is often served by several providers |
| **Client pre-flight + server intent classification** for guardrails | *"Client pre-flight + server intent classification"* | it was never built, a keyword filter cannot catch "help me say this better", and a chat call per turn costs more than the rule is worth. If wanted: a decision model (#1853) at the draft step |
| The marker **appended to markdown**, re-appended if removed | **Derived from `fireside_assisted`** | string surgery loses to the database; the flag is the truth and the marker is presentation |
| A **graft** (`fireside_mode`) | **The beta deployment** | a flag, a naming convention and an allowlist in one word; the deployment answers the question properly |
| Reports **unpublished transcripts** with content | **Tenant DB** + explicit consent + full transcript | the writer's own history is theirs |

---

## Settled, 2026-11-27

Autumn's calls, so a later reader does not reopen them.

| Question | Answer | Why |
| --- | --- | --- |
| **Accept's ordering** | **The save carries the acceptance.** The post, `fireside_assisted` and `fireside_session_id` land in one insert; the session is accepted behind them. | Saving first and calling `/accept` second left a post with no marker when the second call failed — a lie of omission nobody would notice. `/accept` still exists for a client that records it separately, but the app no longer depends on it. |
| **Retention** | **90 days**, confirmed rather than assumed. Unpublished conversations only. | What the start route stamps, what the sweep enforces, and the number published in the help center. Changing it now changes one constant and one sweep. |
| **Where the disclosure renders** | **On every deployment, not only beta.** | Beta shares the database, so the post a conversation produced is already on the writer's real site. Hiding the marker there would let the page claim it was hand-written. What stays beta-only is the *ability to change* it. |
| **What had to exist before beta** | **The fire on an existing post, and corrected privacy docs (#1868).** | The fire only on a blank page is the one writing problem Fireside was not built for, and the policy said conversations are never stored. |

## Open questions

- **Per-message transcript sharing.** Full transcript now; selecting messages later.
- **`search_my_posts`** — the better "hear my voice" tool for a long archive; v1.1.
- **`read_past_session`** — "last time we talked about…" is only possible because history exists; later.
- **A session scratchpad (`remember`)** — attractive for long conversations, invisible in the
  transcript; later.

## Out of scope

- Replacing Wisp's analysis features (grammar, tone, readability) — Wisp is a sibling, not a host.
- Grove-paid inference. That is a different, currently unmade decision.
- Pages. Posts only, for now.
- Streaming replies. 150-token answers do not need it.

---

## References

- The expedition that produced this document: `docs/safaris/fireside-safari.md`
- The Wisp specification (analysis features, still current): `wisp-spec.md`
- Lumen (the AI entry point): `lumen-spec.md`
- Lyra's recipe pattern, in the wild: `libs/curios/src/timeline/recipe/`
- Zero-data-retention providers: `docs/help-center/articles/understanding-your-privacy.md`
- Decision models (`#1853`), the one AI key (`#1856`), the privacy review (`#1868`)
