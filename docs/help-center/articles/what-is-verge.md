---
title: What is Verge?
description: Remote coding infrastructure that transforms your code in another dimension
category: help
section: how-it-works
lastUpdated: '2026-02-02'
keywords:
  - verge
  - remote coding
  - ai coding
  - ephemeral compute
  - infrastructure
order: 50
---

# What is Verge?

Verge is Grove's remote coding infrastructure. Send your code through the Verge, and it comes back transformed.

## The short version

You text a coding task from your phone. Somewhere in another dimension (okay, it's actually a temporary server), an AI coding agent picks it up, works through it autonomously, commits the changes, and syncs everything back. Then the server self-destructs. By morning, there's only the code it left behind.

Brief, brilliant, gone.

## What it actually does

Verge spins up temporary VPS instances on-demand. These ephemeral machines run AI coding agents that complete development tasks autonomously. When the work is done, the results sync to cloud storage and the infrastructure vanishes.

Think of it like sending a letter through a portal. The letter goes in, gets transformed on the other side, and returns more polished than you sent it. The portal itself doesn't need to stay open. It exists only for the moment of passage.

## Why "Verge"?

The verge is the edge. The threshold. The liminal space where one state ends and another begins. Not quite here, not quite there.

In impossible geometries, the verge is where transformation happens. You cross it and emerge changed.

Your code crosses the Verge. It comes back transformed.

## Who uses this?

Verge is primarily internal infrastructure for the Wayfinder's development workflow. It's not a public service. If you're reading this, you probably stumbled here from a footer link or the Workshop page.

The pattern Verge uses—ephemeral compute that spins up, does work, and tears down—is called the [Firefly pattern](/knowledge/help/what-is-firefly). It powers both Verge and [Outpost](/workshop#tool-outpost) (the on-demand Minecraft server).

## Technical details

For the curious:

- **Compute**: Hetzner Cloud VPS (CX33 in EU, CPX31 in US)
- **Agent**: Kilo Code CLI with autonomous mode
- **AI**: DeepSeek V3.2 for reasoning, GLM 4.6V for vision (via OpenRouter)
- **Storage**: Cloudflare R2 for code sync, D1 for state
- **Lifecycle**: Idle timeout triggers sync and teardown

The full technical specification is available at [Verge Spec](/knowledge/specs/verge-spec).

---

*You send it through. It comes back transformed.*
