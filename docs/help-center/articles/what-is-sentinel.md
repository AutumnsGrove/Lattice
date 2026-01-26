---
title: What is Sentinel?
description: How Grove tests itself to make sure everything keeps working
category: help
section: how-it-works
lastUpdated: '2026-01-24'
keywords:
  - sentinel
  - stress testing
  - reliability
  - infrastructure
  - performance
  - the clearing
  - monitoring
order: 5
---

# What is Sentinel?

You don't need to know about Sentinel to use Grove. But if you've ever wondered how we know the platform can handle growth, here's the answer.

## The short version

Sentinel is Grove's way of testing itself. It simulates heavy traffic against the platform's core systems, measures how they respond, and flags anything that slows down or breaks. Think of it as a fire drill for infrastructure.

## The problem it solves

Most platforms discover performance problems when real people hit them. A popular post goes viral, a thousand people sign up at once, and suddenly everything crawls. By then, your readers are already waiting.

Grove takes a different approach. Sentinel runs controlled stress tests before problems find you. It pushes the database, the file storage, the login system, and the caching layer to their limits on purpose, in a safe environment. If something would buckle under pressure, we find out during a test, not during your busiest day.

## How it works

Sentinel generates realistic traffic patterns. Not random noise, but the kind of load that actually happens:

- **Spike tests** simulate sudden surges (a post going viral, a newsletter driving traffic)
- **Sustained tests** simulate steady high usage (a busy community humming along)
- **Ramp tests** gradually increase pressure to find the exact breaking point
- **Oscillation tests** simulate traffic that ebbs and flows like a normal day

Each test targets specific systems: database reads and writes, image storage, authentication, content creation. Sentinel measures response times, error rates, and throughput for all of them.

## What this means for you

**Reliability you don't have to think about.** When Grove says it can handle your growing audience, that's been tested. Repeatedly.

**Honest status reporting.** Sentinel feeds its results to [The Clearing](/clearing), Grove's status page. If a test reveals degraded performance, you'll see it there before it affects your experience.

**Growth without anxiety.** Whether your blog has ten readers or ten thousand, the infrastructure has already proven it can handle the load. You can focus on writing.

## Where Sentinel fits

Sentinel is built on [Loom](/knowledge/help/what-is-loom), Grove's coordination layer. Long-running tests use their own Durable Object, so a thirty-minute stress test doesn't tie up resources that serve your actual readers.

The results flow to The Clearing, where they become part of Grove's uptime tracking. Good results keep the status green. Concerning results trigger alerts so we can investigate before anything reaches you.

## The technical details

For the curious: Sentinel runs as a Durable Object following the Loom pattern. It executes batches of operations against D1 (the database), KV (the cache), R2 (file storage), and the auth system. Metrics are collected in real time, flushed in batches, and stored for trend analysis.

Tests are admin-only. They run against isolated test data that gets cleaned up afterward. Your content is never touched.

If you're the type who reads specs, the full architecture is in the codebase. But you'll never need to look at it. That's the point.

---

*The strongest foundations are the ones that have already weathered the storm.*
