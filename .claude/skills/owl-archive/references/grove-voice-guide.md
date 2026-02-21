# Owl Archive — Grove Voice Guide

## The Grove Voice

From the project's guiding principles:

> This site is my authentic voice — warm, introspective, queer, unapologetically building something meaningful; write like you're helping me speak, not perform.

> Write with the warmth of a midnight tea shop and the clarity of good documentation — this is my space, make it feel like home.

## What Grove Sounds Like

**Warm but not cutesy.** We're friendly, not performative. "Let's get started" feels right. "Let's gooo! 🚀" does not.

**Direct and honest.** Say what you mean. Acknowledge limitations. Don't oversell. If something doesn't work yet, say so.

**Conversational but not sloppy.** Contractions are fine (you're, it's, we're). Short paragraphs. Questions that invite readers in. But still clear, still structured.

**Introspective.** Grove makes space for reflection. We don't rush. We ask "why" alongside "how."

**Poetic in small doses.** Italicized one-liners at the end of sections can land beautifully. Use them sparingly, earn them.

## Sentence Rhythm

Mix short sentences with longer ones. Vary your rhythm. Read it aloud — if it sounds monotonous, it is.

**Good:**
> Every new visitor asks the same question. "Is the music broken?" No. There is no music. There never has been.

**Not good:**
> Every new visitor asks a common question. The question is usually about whether the music system is functioning. The answer is that there is no music system. There has never been one.

## User Identity Terminology

Grove uses specific terms for community members. Always use these in user-facing text.

| Term | Who | Context |
|------|-----|---------|
| **Wanderer** | Everyone | Default greeting, anonymous visitors, all users |
| **Rooted** / **the Rooted** | Subscribers | Those who've planted their tree, paid users |
| **Pathfinder** | Trusted guides | Appointed community helpers |
| **Wayfinder** | Autumn (singular) | The grove keeper |

**Key Rules:**
- Never use "user" or "member" in user-facing text. Use "Wanderer" instead.
- Never use "subscriber" in user-facing text. Use "Rooted" or "the Rooted".
- Personal emails (day-1, day-3, etc.) should use `{{name}}`, not "Wanderer".
- Generic greetings (welcome pages, UI) should use "Wanderer".

**Examples:**

Good:
- "Welcome, Wanderer."
- "Thanks for staying rooted with us."
- "Ask a Pathfinder. They'll show you the way."

Avoid:
- "Welcome, user."
- "Thanks for being a subscriber."
- "Contact an administrator."

## Grove Mode & GroveTerm Components

When writing content that includes Grove terminology, use the GroveTerm component system instead of hardcoding terms.

- **In Svelte UI:** Use `GroveTerm`, `GroveSwap`, or `GroveText` from `@autumnsgrove/lattice/ui`
- **In data strings** (FAQ items, tooltips, onboarding text): Use `[[term]]` syntax, e.g., `"Your [[bloom|posts]] are always yours."`
- **In markdown** (help articles): The `[[term]]` syntax is auto-transformed by the rehype-groveterm plugin
- **Key principle:** New visitors see standard, familiar terms by default. Grove vocabulary is opt-in.

## The Voice Spectrum

**API Reference (minimal warmth, maximum clarity):**

```
POST /api/posts

Creates a new blog post.

Parameters:
- title (string, required): Post title
- content (string, required): Markdown content
- published (boolean): Default false

Returns: Post object or 400 error
```

**Internal Spec (clear, some personality):**

```
## Feed Caching Strategy

Feed pages cache for 5 minutes in KV. When a new post is shared,
we invalidate the chronological feed but let popular/hot feeds
age out naturally. This keeps things fresh without hammering D1.
```

**Getting Started Guide (full Grove voice):**

```
## Your First Post

Welcome. Let's get something published.

The editor opens to a blank page. That's intentional. No templates,
no suggested topics. Just you and your words.

Write something. Anything. Hit publish when it feels ready.
```

**Onboarding Tooltip (warm but concise):**

```
This is your dashboard. Everything you need, nothing you don't.
```

## Queer-Friendly Language

Grove is explicitly queer-friendly. This means:

- No assumptions about users' identities or relationships
- Welcoming, inclusive language throughout
- Safe space messaging where appropriate
- Pride in what we're building, not defensiveness

**Concrete Examples:**

| Avoid | Use Instead |
|-------|-------------|
| "Add your husband/wife" | "Add your partner" or "Add someone special" |
| "he or she" | "they" or rephrase to avoid pronouns |
| "Dear Sir/Madam" | "Hello" or "Hi there" |
| "mankind" | "people" or "everyone" |
| Examples with only straight couples | Vary your examples, or keep them neutral |

**Tone:** We don't make a big deal of being queer-friendly. We just are. No rainbow-washing, no performative allyship. The inclusivity is baked in, not bolted on.

## Closers

Grove docs often end with an italicized line. This should feel earned, not forced.

**Works:**
> _Sometimes the most radical thing you can offer is nothing at all._

> _The path becomes clear by walking it._

**Doesn't work:**
> _And that's how you configure your settings!_

If you can't find a poetic closer that resonates, don't force one. A clean ending is fine.
