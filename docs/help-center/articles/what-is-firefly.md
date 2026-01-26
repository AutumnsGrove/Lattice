---
title: What is Firefly?
description: How Grove uses temporary servers that appear when needed and vanish when done
category: help
section: how-it-works
lastUpdated: '2026-01-23'
keywords:
  - firefly
  - ephemeral
  - servers
  - infrastructure
  - on-demand
  - outpost
  - bloom
  - cost
  - temporary
order: 5
---

# What is Firefly?

Some things don't need to run all the time. A Minecraft server that nobody's playing on. A coding agent that finished its task three hours ago. Keeping those servers alive 24/7 costs money for nothing.

Firefly is Grove's answer: servers that appear when you need them and disappear when you don't.

## The short version

Firefly is a pattern for temporary infrastructure. Instead of paying for a server that sits idle, Grove spins one up the moment someone needs it, keeps it alive while it's being used, and shuts it down when the work is done. Like a firefly in a forest—a brief flash of light, purposeful, then gone.

## How it works

Every Firefly server follows three phases:

**Ignite** — Something triggers a need. Maybe you want to play Minecraft, or you send a coding task from your phone. Grove provisions a fresh server, pulls in any saved data, and gets it ready.

**Illuminate** — The server runs. You play, you code, you do your thing. In the background, your progress syncs to persistent storage periodically, so nothing gets lost.

**Fade** — When you're done (or after a period of inactivity), the server saves its final state, cleans up, and shuts down. The server is gone. Your data stays safe in cloud storage, ready for next time.

## Where Grove uses Firefly

**Outpost** (Minecraft) spins up a game server when someone wants to play. No 24/7 hosting fees for a world that sits empty overnight. When the last player leaves and thirty minutes pass, the server saves the world and shuts down. Next time someone connects, it's back in under a minute.

**Bloom** (AI coding) creates a temporary development server when you text it a task. The agent works on your code, syncs the result to cloud storage, and the server self-destructs. You get the finished work without maintaining any infrastructure.

## Why this matters

Traditional hosting works like renting an apartment—you pay monthly whether you're home or not. Firefly works like a library study room—available when you need it, freed up when you leave.

The benefits:

- **Near-zero idle cost.** When nobody's using it, nothing's running. You're not paying for empty servers.
- **Fast availability.** Servers spin up in under a minute. The wait is barely noticeable.
- **Your data persists.** The server is temporary, but your progress isn't. Everything syncs to persistent storage before shutdown.
- **No maintenance burden.** Each server starts fresh. No accumulated cruft, no security patches to apply to long-running instances.

## What this means for you

If you use Outpost or Bloom, you don't need to think about any of this. The servers appear and disappear automatically. Your Minecraft world is always there when you come back. Your code always syncs before shutdown.

Firefly is invisible infrastructure. The best kind—the kind that saves money and complexity without you having to manage anything.

## Curious about the full pattern?

If you enjoy technical architecture, the complete specification covers provisioners, idle detection, state synchronization, and failure handling in detail: [Firefly — Ephemeral Server Pattern](/knowledge/patterns/firefly-pattern).

---

*A brief light in the darkness. It appears, does its work, and fades away.*
