---
aliases:
date created: Friday, November 21st 2025, 3:01:54 pm
date modified: Tuesday, November 26th 2025
tags:
type: help-article
category: getting-started
order: 1
keywords: [grove, about, introduction, what is, blogging, platform]
related: [writing-your-first-post, understanding-your-privacy]
---

# What is Grove?

Grove is a blogging platform for people who want their own space on the internet, without the complexity of self-hosting or the tradeoffs of big tech platforms.

## The short version

You get a blog. It's yours. You write, we host it, your readers can find you via your own URL. No ads, no algorithms deciding who sees your posts, no tracking your visitors.

**Reading is free. Always.** Every Grove blog is publicly accessible. Just visit and read, no account needed. You only pay if you want to write your own blog.

## What makes Grove different

**You own your content.** Everything you write belongs to you. You can export it anytime, in standard formats that work anywhere. If you ever leave, your words come with you.

**Privacy by default.** We don't track your readers. No analytics scripts following people around the web. Your visitors' attention is between them and your words.

**Invisible to AI crawlers.** We block every AI training bot, every scraper, every "AI search agent" that wants to harvest content for machine learning. Your writing stays between you and your readers, not vacuumed into datasets. Grove is a black hole to external AI.

**Simple on purpose.** Grove has what you need to write and publish. It doesn't have a hundred features you'll never use. The admin panel is clean, the writing experience is focused, and you can be up and running in minutes.

**Real support from real people.** When you reach out, you're talking to an actual human. Usually Autumn, who built this thing. We read every message and respond within a day.

## Who is Grove for?

Grove works well for:

- **Personal bloggers** who want a home for their thoughts without wrestling with WordPress or paying for features they don't need
- **Writers** who want to focus on writing, not configuring
- **People leaving big platforms** who want ownership of their work and respect for their readers' privacy
- **Anyone who misses the old web**: when having a blog felt personal, not performative

## How it works (the simple version)

Think of Grove like a neighborhood of tiny houses. Each person gets their own house (your blog at `yourname.grove.place`), but you all share common infrastructure—the roads, the power grid, the community center.

Grove is all that shared infrastructure: how you get to any site, keeping everything fast and reliable, making sure only you can access your stuff, and (eventually) the community spaces where people can interact.

**Under the hood**, Grove runs on Cloudflare's global network—servers all over the world that are close to wherever your readers are. This makes everything fast.

We use something called **Durable Objects**—think of them like little robot helpers:
- Each robot has a specific job (handle logins for Alice, track analytics for Bob's site, etc.)
- They wake up when needed, do their job, then go back to sleep
- They remember everything even when sleeping
- They can coordinate with each other

Before this architecture, every request had to ask a central database "hey, is this person logged in?" Now, each person basically has their own little robot that already knows the answer. This means:

- **Cheap to run** — Only pay for what's actually being used
- **Fast everywhere** — Servers near every Wanderer
- **Scales infinitely** — 10 Wanderers or 10 million, same system
- **Private by design** — Each person's data is isolated

*For the technical details of this architecture, see [Loom — Real-Time Coordination](/knowledge/patterns/loom-durable-objects-pattern).*

## What Grove isn't

Grove isn't trying to be everything. While we offer optional community features (through Meadow) for those who want them, Grove's core is about writing and sharing your writing with people who want to read it. It's not a traditional social network, a newsletter platform, or a business website builder.

If you need e-commerce, complex membership tiers, or a design tool with infinite customization, Grove probably isn't the right fit. If you want a simple, honest blog that just works—welcome.

## Pricing

Grove has a **Free** tier for readers and community members, and paid plans starting at **$8/month (Seedling)** for bloggers. Higher tiers unlock more posts, storage, and features. We're transparent about what each plan includes—no hidden fees, no bait-and-switch.

See current pricing at [grove.place/pricing](/pricing).

## The values behind it

Grove is built on a few principles:

- **Your data belongs to you.** Full stop.
- **Privacy isn't a premium feature.** Everyone deserves it.
- **Your words aren't training data.** We block AI crawlers completely.
- **Simple tools can be powerful.** Constraints are features.
- **The internet should have more weird, personal, authentic corners.** Grove is one of them.

---

*Questions about whether Grove is right for you? [Reach out](/support)—we're happy to chat.*
