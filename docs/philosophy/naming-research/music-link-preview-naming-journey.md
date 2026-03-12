# Music Link Preview Naming Journey

> *Finding the name for beautiful music link cards in the grove*

Started: February 8, 2026

---

## The Problem

When someone pastes a music link into a bloom — Apple Music, Spotify, YouTube Music, whatever — it should transform into a gorgeous, Grove-branded preview card. Album art, track name, artist, source logo. Click to open. No ugly bare URLs. No third-party iframes.

We called it "Songbird" in the first draft. But **Songbird is already taken** — it's the prompt injection defense pattern in Lumen (Canary, Kestrel, Robin). Very established. Very much a bird.

We need a new name.

---

## Visualizing the Grove

```
                              ☀️

                    🌲    🌳    🌲    🌲
                 🌲    🌲    🌳    🌲
              🌲    🌳    🌲    🌲    🌳
           🌲    🌲    🌲    🌳    🌲    🌲

═══════════════════════════════════════════════════════════
                ROOTS CONNECT BENEATH
```

**Where things already live:**
- **Aria** — music curation tool (`aria.grove.place`). Give it a song, get a playlist back. ACTIVE music discovery.
- **Songbird** — prompt injection defense in Lumen. Three layers: Canary, Kestrel, Robin. TAKEN.
- **Now Playing curio** — live "what I'm listening to" widget in vine slots. Real-time status.
- **Meadow** — the social space where people connect
- **Blooms** — posts, the content body where music links appear
- **Vines** — gutter content alongside posts (where embeds currently live)
- **Flow** — the writing sanctuary where links get pasted

**Where this new thing lives:**
It lives INSIDE blooms. Inline with your writing. Not a curio (sidebar widget), not a standalone tool. It's part of the content body — a transformation that happens to links during markdown rendering.

---

## What IS This Thing?

**Fundamentally:** A transformer. A link goes in plain. A card comes out beautiful.

**In the user's life:** It makes sharing music effortless and warm. You paste a link, and the grove takes care of making it look right. You don't configure anything. You don't pick a template. You just share.

**What it's NOT:**
- Not a music player (no audio playback)
- Not a curator (that's Aria)
- Not a live status (that's Now Playing)
- Not an embed (we're building our own card)
- Not interactive — it's a beautiful signpost that says "here's what I'm listening to, go hear it"

**The emotion:** Warmth. The intimacy of saying "you need to hear this." Like handing someone your headphones.

---

## Walking Through the Grove

I'm in the grove. I'm writing a bloom at my desk in Arbor. Kate Bush is playing. I want to tell the world.

I paste the Apple Music link. The bare URL sits there in my markdown, cold and mechanical: `https://music.apple.com/us/album/hounds-of-love/1558...`

And then the grove does something. The link transforms. Not into someone else's widget — into something that belongs here. Album art glowing softly through frosted glass. "Running Up That Hill." Kate Bush. Hounds of Love. A little Apple logo in the corner. Warm. Inviting. Click it and the music starts.

What just happened?

The grove... heard me. It recognized what I was sharing. It wrapped my cold link in warmth. It made the music *visible*.

What do you call that moment when the forest picks up your song?

---

## The Candidates

### ❌ Songbird
Already taken. Prompt injection defense in Lumen. Beautiful name, wrong feature.

### ❌ Echo
Rejected in the Scribe naming journey. "Echo chamber" vibes. Hollow. Also Amazon Echo association. An echo is a copy, a diminished repetition — but sharing music isn't diminishing it.

### ❌ Murmur
Rejected in the Scribe journey. Too delicate, too wispy.

### ❌ Strum
Guitar-specific. What about electronic music? Pop? Classical? Too narrow.

### ❌ Wren / Finch / any bird name
Too close to Songbird's bird-themed layers (Canary, Kestrel, Robin). Would cause confusion. The bird namespace belongs to prompt injection defense.

### ❌ Sway
"Trees sway to the music" — nice bridge between nature and music. But Microsoft Sway exists as a presentation tool. Also "sway" implies being influenced/moved, which is more about the listener than the sharer.

### ❌ Vesper
Evening song. Poetic, beautiful. But too churchy ("vespers" = evening prayers). Doesn't feel warm enough.

### ❌ Chime
Wind chimes — decorative, responsive, musical. Beautiful concept. But "chime" has notification connotations (doorbell, Amazon Chime, notification chimes). Could confuse with alerts/notifications.

### ❌ Lilt
"A lilt in her voice" — light, cheerful, musical quality. Gorgeous word. But potentially obscure for non-native English speakers. Might not be immediately understood.

---

## The Deeper Candidates

### 🤔 Thrum
A thrum is vibration. The hum of a plucked string. The buzz of bees. The pulse you feel through the ground when the forest is alive. It has a physical, tactile quality — you don't just hear a thrum, you *feel* it.

- "The forest thrums with what you share."
- "A thrum through the grove."
- Tactile, warm, full-bodied
- But maybe too obscure? Not everyone knows "thrum."

### 🤔 Refrain
The part of a song everyone knows. The melody that comes back. The chorus. In the forest, the bird call that repeats at dawn.

- "The refrain of the grove."
- "Every link finds its refrain."
- Musical, structural, about the part that sticks with you
- But abstract. A refrain is a concept, not a thing you find in a forest.

---

## 💛 The One: Hum

A hum is:

**In nature:**
- The ambient sound of a living forest — bees, wind, insects, the vibration of everything being *alive*
- The background music that fills the space between trees
- What you hear when you stop walking and just... listen
- Warm, low, constant, everywhere

**In music:**
- The most natural, unconscious musical expression
- What you do when a song gets stuck in your head
- You hum without thinking about it — it's authentic, involuntary
- Not a performance. Not rehearsed. Just the music living inside you, leaking out.

**In the grove:**
- "The grove hums." — It's alive, it has ambient sound.
- "I shared a hum." — I shared the music in my head.
- "The hum of Autumn's grove today: Kate Bush." — Personal, ambient, warm.

**The tagline test:**
> "Hum is where music links become warm." ✓
> "Hum is the music that fills the space between trees." ✓
> "Share a song. The grove hums along." ✓

**Why Hum wins:**
1. **Three letters.** Short, punchy, memorable. Like Ivy, like Etch.
2. **Dual meaning.** Both the forest's ambient sound AND the human act of humming a tune. The bridge is natural, not forced.
3. **Not a performance.** We're not building a music player. We're not streaming audio. We're making links beautiful. A hum is exactly that energy — music that's present without being performed.
4. **Complements Aria.** Aria is active curation (build me a playlist). Hum is passive display (show this link beautifully). An aria is a formal vocal piece. A hum is its unconscious, intimate counterpart.
5. **Complements Now Playing.** Now Playing is live status (what I'm listening to *right now*). Hum is embedded in content (what I was listening to *when I wrote this*).
6. **Inevitability.** "The grove hums" feels like it was always true. The name was always there.

---

## The Entry

### Hum
**Music Link Previews** · *(integrated into content rendering)*
**Standard:** Music Embeds
**Waystone:** Transforms music links in your posts into beautiful preview cards — album art, track name, artist, and source — without ugly bare URLs or third-party widgets.

A hum is the ambient music of the forest — bees in the undergrowth, wind through the canopy, the vibration of everything being alive. It's also what you do when a song won't leave your head. Not a performance. Not something you rehearse. Just music, living in you, leaking out.

Hum is what happens when you paste a music link into a bloom. The grove recognizes it — Apple Music, Spotify, YouTube Music, SoundCloud, whatever — and wraps it in warmth. Album art glowing through frosted glass, track name, artist, a small provider logo in the corner. Your link doesn't just sit there. It hums.

*Share a song. The grove hums along.*

---

## Conflict Check

- [x] Not in the ecosystem table in grove-naming.md
- [x] No subdomain needed (integrated into content rendering)
- [x] Doesn't clash with any existing service
- [x] "Hum" doesn't appear as a feature name anywhere in codebase
- [x] Complements Aria (curation) and Now Playing (live status) without overlap
- [x] Three letters, easy to type, easy to say, easy to remember
- [x] Works as both noun and verb: "a hum" and "the grove hums"

---

*The forest was always humming. We just gave it a name.*
