---
title: "What is Loom?"
slug: what-is-loom
category: philosophy-vision
order: 4
keywords: [loom, durable objects, architecture, infrastructure, technical, how grove works, cloudflare]
related: [what-is-grove, understanding-your-privacy, how-grove-backs-up-your-data]
---

# What is Loom?

You don't need to understand Loom to use Grove. But if you're curious about what makes the platform work under the hood, here's the story.

## The short version

Loom is the coordination layer that makes Grove fast and private. Instead of every request asking a central database "who is this person?", each user essentially has their own little helper that already knows the answer.

Think of it like having a personal assistant who remembers your preferences, rather than filling out a form every time you walk in the door.

## The problem it solves

Traditional web applications have a central database. Every time you log in, check your posts, or update your settings, the application asks that database for your information. This works fine for small sites, but creates bottlenecks as they grow. The database becomes a crowded doorway everyone has to squeeze through.

Grove sidesteps this. Instead of one central database handling everything, specific tasks get their own dedicated handlers:

- Your login gets its own session handler (no more "is this person logged in?" queries)
- Your blog gets its own config handler (settings are cached and ready)
- Each post can have its own handler (for real-time comments and reactions)
- Your analytics get buffered and batch-written (instead of hitting the database on every page view)

These handlers wake up when needed and go to sleep when they're not. They remember everything even while sleeping. D1 (the main database) is still the source of truth—Loom is the coordination layer that makes accessing it fast and efficient.

## What this means for you

**It's fast everywhere.** Grove runs on servers around the world. When you visit your blog, you're talking to a server near you, not one on the other side of the planet.

**Your data stays isolated.** Your blog's information doesn't share space with anyone else's. Privacy isn't bolted on after the fact—it's how the system works.

**It scales without drama.** Whether Grove has 10 users or 10 million, the architecture handles it the same way. No scrambling to upgrade infrastructure as the community grows.

**It costs less to run.** The handlers only wake up when needed. When nobody's visiting your blog at 3am, nothing's running. This keeps Grove affordable.

## Where Loom shows up

You won't see "Loom" mentioned in the Grove interface. It's infrastructure—the roads under the neighborhood, not the houses on top. But it powers:

- **Authentication.** Your session handler validates logins across all Grove properties without hitting the database every time. Logging in once works everywhere.
- **Blog coordination.** Your blog's config, theme settings, and rate limits are cached in a dedicated handler. No database query on every page load.
- **Real-time features.** Comments, reactions, and "who's reading this" presence indicators work through post-specific handlers that can push updates instantly via WebSocket.
- **Notifications.** Your notification handler aggregates alerts ("Alice and 5 others liked your post") and delivers them in real time.
- **Analytics.** Page views get buffered and batch-written to the database. Instead of 10,000 page views creating 10,000 database writes, they get combined into periodic batches.

## The technical details

Loom is built on Cloudflare Durable Objects—a technology that lets Grove create persistent, stateful services at the edge of the network.

Each Durable Object is a single-threaded instance with its own SQLite database (up to 10GB). It wakes when a request arrives, processes it, and hibernates after 10-30 seconds of inactivity. Storage persists forever—only the compute goes to sleep.

The key insight: requests for the same ID always route to the same instance. Your session handler is *your* session handler. No chance of two servers having conflicting ideas about whether you're logged in.

If you're the type who reads technical specifications, the full architecture is documented in [Loom — Real-Time Coordination](/knowledge/patterns/loom-durable-objects-pattern).

## Why we mention it

Most platforms don't explain their infrastructure. Grove does, because transparency is part of what we're building. You own your words. You should understand—at whatever level interests you—how they're kept safe and fast.

Loom is the invisible framework where all the threads come together. You'll never interact with it directly. That's the point.

---

*The best infrastructure is the kind you never have to think about.*
