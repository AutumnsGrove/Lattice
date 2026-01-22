---
title: Hacker News Post
description: Show HN submission draft
category: marketing
lastUpdated: '2025-12-30'
---
# Hacker News: Show HN Post

> **Purpose**: Hacker News Show HN submission
> **Tone**: Personal story with technical depth, values-forward
> **Key Points**: Personal journey, AI protection, solo dev with AI agents, anti-surveillance capitalism

---

## Title Options (pick one)

**Option A (Story-forward):**
Show HN: I lost my backyard, quit my job, and built a blogging platform that blocks AI crawlers

**Option B (Product-forward):**
Show HN: Grove – A blogging platform that treats your words like they belong to you

**Option C (Technical hook):**
Show HN: I built a 160k LOC blogging platform in 57 days with AI agents

---

## Body

I used to have a hammock strung between two trees. A garden I built over two years. Robins I knew by song. Then I lost it all and moved into a basement with no windows.

When life loses texture, you either go numb or you build something. I built a forest.

**What it is:** Grove is a multi-tenant blogging platform. You get `username.grove.place`. Write in Markdown, upload images, publish. Your words, your corner of the internet.

**What makes it different:**

- **Shade protection**: We aggressively block AI crawlers (GPTBot, ClaudeBot, PerplexityBot, CCBot, ByteSpider) using Cloudflare's bot management + custom rules. Your words are not training data. I blocked ClaudeBot even though I *built this with Claude*. Principles matter.

- **No algorithms**: The feed is chronological. The SQL query is literally `SELECT * FROM posts WHERE author_id IN your_follows ORDER BY created_at DESC`. No engagement optimization, no "relevance" scoring, no manipulation.

- **Private encouragement**: Reactions are visible only to the author. No public metrics. No dopamine scoreboard. No pile-on dynamics.

- **Portable by design**: Full data export anytime. Markdown files. Standard RSS. Your content works anywhere. If you leave, you take your roots with you.

- **Centennial status**: Stay with Grove long enough, and your site earns 100-year preservation. Your words can outlive you.

**Tech stack:**
- Cloudflare Workers/D1/R2/KV/Durable Objects
- SvelteKit 5 with runes
- TypeScript throughout
- LemonSqueezy for payments
- Magic code auth (no passwords)
- ~160k lines of code, 3,000+ tests

**How I built it:** 57 days, one person, heavily assisted by AI agents (Claude Code, Claude on the web). Neurodivergent hyperfocus meets AI-assisted development. The code is mine, the architecture decisions are mine, but I had a tireless collaborator who never needed sleep.

**The business model:** You pay for the service ($8-12/month). No ads. No tracking. No VC funding, no pressure to enshittify. Grove is a forest, not a factory.

**Why this matters:** I built this for people who remember when the internet felt like a garden of weird personal spaces. For people who are tired of platforms that track 6,000 signals per post and optimize for outrage. For neurodivergent folks who've been exploited by dopamine slot machines designed to hijack our attention.

I quit my job for this. I'm launching to 70 waitlist members this week. If you think the internet can be better than this, I'd love your feedback.

**Links:**
- Main site: grove.place
- Vision: grove.place/vision
- Manifesto: grove.place/manifesto
- Roadmap: grove.place/roadmap

---

## Notes for Posting

- Post during US morning/early afternoon (best HN engagement)
- Be available to respond to comments for first few hours
- Answer technical questions with depth
- Don't get defensive about AI-assisted development — own it
- If it gets traction, genuine engagement matters more than upvotes
- Link to specific pages (vision, manifesto) in follow-up comments, not the initial post

---

## Potential Questions to Prep For

**"How is this different from WordPress/Ghost/Substack?"**
- No tracking, no ads, aggressive AI blocking
- Multi-tenant (username.grove.place) vs self-hosted
- Values-first: queer-friendly, neurodivergent-friendly by design
- Private reactions model is genuinely novel

**"How do you block AI crawlers reliably?"**
- Cloudflare Bot Management (enterprise-grade)
- Custom rules for known bot user agents
- Rate limiting patterns that catch scrapers
- robots.txt + meta tags as baseline (but not relied upon)
- Blog post coming on the technical implementation

**"Is this sustainable as a solo dev?"**
- AI-assisted development changes the math
- Cloudflare's pricing model scales well
- No VC = no pressure for unsustainable growth
- Building for sustainability, not unicorn status

**"Why LemonSqueezy over Stripe?"**
- Merchant of record model (they handle tax complexity)
- Better for solo/indie devs
- Good API, reasonable fees
- Less compliance burden on me

**"What about federation/ActivityPub?"**
- Considering for future (it's on the roadmap as "open standards")
- RSS is the immediate interop layer
- Want to get core experience right first
