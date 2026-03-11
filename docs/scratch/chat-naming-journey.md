# Chat Naming Journey

> Finding the name for Grove's 1:1 direct messaging system.

---

## What IS This Thing?

Looking at the code: `chat.ts`, `chat.types.ts`, `ChatDO.ts`, the UI stores,
the routes under `/arbor/chat/`, the API routes, the migration tables
(`chat_conversations`, `chat_messages`, `chat_read_cursors`).

**What it does:**
- 1:1 private messaging between two Wanderers
- WebSocket-powered real-time conversation (via Durable Objects)
- Typing indicators, read receipts, message retraction
- Text and image messages
- Sorted-pair model: (A, B) and (B, A) always resolve to the same thread
- Hibernation-aware — conversations are bursty, the DO sleeps between bursts
- Lives inside Arbor (the admin panel)

**What it is NOT:**
- Not group chat. Two people only.
- Not public. Not a feed. Not comments.
- Not email. Not formal.
- Not support tickets.

---

## The Communication Landscape

Where does this fit among existing names?

```
                         PUBLIC
                           |
              Meadow ------+------ Reeds
          (social feed)    |    (blog comments)
                           |
             Notes ---------       Canopy
         (short-form)             (directory)
                           |
      BROADCAST ───────────+─────────── INTIMATE
                           |
             Ivy -----------       Porch
           (email)         |    (support)
                           |
                           |
                      ???????????
                     (1:1 private
                      messaging)
                           |
                         PRIVATE
```

The missing piece sits in the bottom-right quadrant:
**intimate AND private**. Closer to Ivy than Meadow,
but warmer and less formal than email. More private
than Reeds. More casual than Porch.

---

## Walking Through the Grove

I enter the grove. The Meadow stretches to my left,
voices carrying in the open air. Too public for what
I need to say.

I pass the Reeds at the water's edge. People are
leaving comments on each other's blooms. That's not
it either — those words are for everyone.

I could send an Ivy — proper, encrypted, formal.
But this isn't a letter. It's just... I want to
talk to my friend.

Where do I go?

I step off the main path. Between two aspens,
there's a quiet space where the branches weave
together overhead. Dappled light. Nobody else
around. I lean close and speak softly.

My friend hears me. They speak back.

It's barely a sound. A murmur.

---

## Candidates

### 1. Murmur

**The quiet sound of voices between friends.**

- In nature: the low, continuous sound in a forest —
  wind through leaves, a stream over stones, voices
  just below hearing. A "murmur" of starlings is the
  collective noun for a flock in flight.
- As a verb: "I murmured to you" — the act of
  speaking softly, privately
- As a noun: "You have 3 new murmurs" — messages
  received
- As a service: "murmur.grove.place"
- The vibe: intimate, warm, unhurried. Not shouting
  across the meadow. Leaning close.

**Tagline test:** "Murmur is where you speak softly
and only one person hears."

**Linguistic flexibility:**
- "Open your murmurs" (inbox) ✓
- "You have new murmurs" (unread) ✓
- "I murmured to you" (sending) ✓
- "Our murmur" (a conversation thread) ✓
- "murmur.grove.place" (the service) ✓

**Potential issues:**
- "Heart murmur" medical association (minor — context
  resolves this immediately)
- "Murmur of starlings" is a group noun, but this is
  1:1 (not a real conflict — "murmur" has multiple
  natural meanings)


### 2. Bower

**A sheltered place in the forest for private
conversation.**

- In nature: a shelter made of woven branches, an
  enclosed natural space. Bowerbirds create elaborate
  bowers — intimate spaces for connection.
- As a place: "Meet me in the bower" — where you go
- As a service: "bower.grove.place"
- The vibe: sheltered, private, intentional. A place
  built for two.

**Tagline test:** "Bower is where you step between
the branches and talk, just the two of you."

**Linguistic flexibility:**
- "Open the bower" (enter chat) ✓
- "Your bower with @friend" (a thread) ✓
- "You have a new bower" (new conversation) ✓
- BUT: "You have 3 new bowers" for unread messages?
  Doesn't quite work. Bowers are PLACES not MESSAGES.
- "I bowered you" — no. Not a natural verb.

**Potential issues:**
- Works beautifully as a place, awkwardly as a
  countable thing (messages)
- Bowerbird courtship association — might feel too
  romantic for platonic DMs


### 3. Hollow

**The private space inside a tree.**

- In nature: the cavity inside an old tree where owls
  nest, squirrels store acorns. Protected, hidden.
- "Meet me in the hollow"
- "hollow.grove.place"

**Rejected because:**
- "Hollow" carries negative connotations — "hollow
  promise", "feeling hollow", "hollow victory"
- Feels cold and empty, not warm and intimate


### 4. Den

**A cozy private retreat.**

- In nature: where animals rest, raise young, shelter
  from storms. Private, warm, protected.
- "Meet me in the den"
- "den.grove.place"

**Rejected because:**
- Warm but not poetic enough for Grove
- "Den of thieves" association
- Doesn't evoke communication, just shelter


### 5. Whisper

**Speaking so only one person hears.**

- "I whispered to you"
- "You have new whispers"
- "whisper.grove.place"

**Rejected because:**
- Already a social app called Whisper (anonymous
  confessions)
- Too on-the-nose — every messaging app's DM feature
  uses this metaphor
- Lacks the uniqueness of Grove naming


### 6. Perch

**Two birds sitting together on a branch.**

- "We perched together"
- "perch.grove.place"

**Rejected because:**
- Too exposed — a perch is visible, not private
- Doesn't evoke exchange or communication
- Slight overlap with Porch


### 7. Glen

**A secluded valley in the forest.**

- "Meet me in the glen"
- "glen.grove.place"

**Rejected because:**
- Too similar to "grove" — both are wooded places
- Doesn't evoke communication

---

## Round 1 Verdict: Murmur didn't land.

Too quiet. Too secretive. The energy wasn't right.

The real energy is: **two birds on a branch, chirping
back and forth.** Lively. Sharing things. Like getting
news hot off the press from your friend. Not a whisper
in the dark — a joyful exchange in the canopy.

---

## Re-Walking the Grove (Round 2)

I enter the grove. I have SOMETHING TO TELL my friend.
Not a secret. Not a formal letter. Just — "oh my god,
you have to hear this."

I find them. We're two robins on a branch. Heads
tilting. Quick exchanges. Back and forth. One chirps,
the other chirps back. It's animated, alive, the
most natural sound in the grove.

Not murmuring. CHATTERING. The lively sound of two
birds who have things to say to each other.

---

## Round 2 Candidates

### 1. Chirp

**The bright, quick call of a bird.**

- In nature: the most fundamental bird sound. Short,
  distinct, joyful. Two birds chirp back and forth
  on a branch — the quintessential image of
  conversation in the grove.
- As a verb: "I chirped you" — sent a message
- As a noun: "You have 3 new chirps" — messages
- As a service: "chirp.grove.place"
- The vibe: bright, quick, alive. Not secretive —
  just personal. The sound of the grove being lived in.

**Tagline test:** "Chirp is where two birds find
each other on the branch."

**Linguistic flexibility:**
- "Open your chirps" (inbox) ✓
- "You have new chirps" (unread) ✓
- "I chirped you" (sending) ✓
- "Our chirps" (a conversation) ✓
- "chirp.grove.place" (the service) ✓

**Potential issues:**
- Twitter WAS the "chirp" brand. But Twitter is now X.
  The word is being reclaimed by nature.
- Might feel too cute? But Grove IS warm and playful.

**The Robin connection:**
Users are robins. Robins chirp. Your DMs are your
chirps. This writes itself.


### 2. Trill

**The musical back-and-forth of birdsong.**

- In nature: a trill is a rapid alternation between
  two notes — literally a BACK AND FORTH. It's the
  structure of conversation encoded in birdsong.
- As a verb: "I trilled you"
- As a noun: "Your trills"
- As a service: "trill.grove.place"
- The vibe: musical, lively, duet-like. Two voices
  weaving together.

**Tagline test:** "Trill is two voices finding
their rhythm."

**Linguistic flexibility:**
- "Open your trills" ✓
- "You have new trills" ✓
- "I trilled you" ✓
- "trill.grove.place" ✓

**Potential issues:**
- "Trill" in internet slang meant "true + real"
  (early 2010s) — fading, probably fine
- Less immediately intuitive than "chirp"
- Slightly more musical/abstract


### 3. Warble

**A bird's complex, melodious song.**

- In nature: a warble is the rich, varied sound birds
  make — trills, runs, and phrases woven together.
  Warblers are an entire family of songbirds.
- As a verb: "I warbled to you"
- As a noun: "Your warbles"
- As a service: "warble.grove.place"
- The vibe: warm, charming, distinctly avian.

**Tagline test:** "Warble is the song between
two birds who know each other's tune."

**Linguistic flexibility:**
- "Open your warbles" — hmm, slightly awkward?
- "I warbled you" ✓
- "warble.grove.place" ✓

**Potential issues:**
- Might be too whimsical/silly for some users
- "Warbling" can imply unsteady/wavering voice


### 4. Lark

**Playful, spontaneous joy.**

- In nature: larks are skylarks, meadowlarks —
  birds that sing while rising into the air, pure
  exuberance in flight.
- In idiom: "on a lark" = doing something for the
  fun of it. Lighthearted, spontaneous.
- As a noun: "Our lark" (a conversation)
- As a service: "lark.grove.place"
- The vibe: playful, joyful, "let's catch up!"

**Tagline test:** "Lark is where friends catch up
for the joy of it."

**Linguistic flexibility:**
- "Open your larks" — hmm
- "On a lark" is great idiomatically
- "lark.grove.place" ✓

**Potential issues:**
- ByteDance has a product called Lark (workplace tool)
- "Having a lark" is very British English
- Works better as a spirit than as a countable noun


### 5. Wren

**The duet bird.**

- In nature: wrens are tiny but LOUD. Famous for
  singing duets — mated pairs alternate phrases so
  precisely it sounds like one bird. They live in
  undergrowth, close to the forest floor. Intimate,
  not showy. Punching above their weight.
- As a service name: "wren.grove.place"
- The vibe: small but mighty, intimate, duets.

**Tagline test:** "Wren is where two voices
become one song."

**Potential issues:**
- Naming after a specific bird species feels different
  from the rest of the naming system
- "Your wrens" for messages doesn't work — the bird
  IS the messenger, not the message
- Works as a service name but not as a countable noun

---

## The Name Is Chirp.

It was right there in the image: two robins on a branch,
chirping back and forth. Users ARE robins. The most
natural thing a robin does is chirp. Your DMs are your
chirps — small, bright calls from one friend to another.

**Why Chirp wins:**

1. **The robin connection.** Grove's users are robins.
   Robins chirp. Every other name was reaching for a
   metaphor. Chirp IS the thing.

2. **Noun and verb.** "I chirped you." "Check your
   chirps." "Our chirps have been quiet." Works in
   every position — just like "bloom" and "wander."

3. **The right energy.** Not secretive (murmur), not
   formal (ivy), not performative (song). Chirping is
   lively, joyful, personal. Two friends with something
   to say to each other.

4. **Post-Twitter.** The bird brand abandoned chirps
   when it became X. The word is free — and it belongs
   in a grove more than it ever belonged in a timeline.

5. **No conflicts.** Not claimed in the Grove naming
   system. Not reserved as a subdomain or username.
   Appeared in previous journeys only as a passing
   mention (rejected as "too cute" for content
   moderation — but perfect for DMs).

---

## The Entry

### Chirp

**Two robins on a branch** · Arbor feature
**Standard:** Direct Messages
**Waystone:** Private 1:1 messaging — quick,
real-time conversations with a friend.

A chirp is the first sound you hear when you enter a
grove. Short, bright, unmistakable — one bird calling
to another. Not a song performed for an audience. Not
an alarm raised for the whole forest. Just one robin
turning to another and saying: *hey. I'm here. Are
you there?*

Chirp is Grove's direct messaging. Two Wanderers,
one branch — a private, real-time exchange that
lives inside Arbor. Send text, share images, see
when they're typing, know when they've read it.
Pull back a message before it lands. Each chirp is
a small, bright thing: personal, immediate, gone as
fast as a bird's call between the branches.

Users are robins. Robins chirp. Your DMs were always
going to be called this.

> "I chirped you about that bloom."
> "Check your chirps — I sent photos."
> "We were chirping all night."

_Two robins. One branch. Everything to say._

---

## The Chirp Lexicon

- **Chirp** — A message sent to a friend
- **Chirps** — Your conversation inbox
- **Chirping** — Actively messaging someone
- **A chirp with @friend** — A conversation thread
- **New chirps** — Unread messages

---

## Conflict Check

- `chirp` in codebase: No service, component, or
  feature uses this name
- `chirp` in grove-router: Not claimed as subdomain
- `chirp` in plant username check: Not reserved
- `chirp` in naming doc: Not an existing entry
- Previous naming journeys: Mentioned only in passing
  ("too cute" — for a different feature)

All clear.
