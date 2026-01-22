---
title: "Amber Sync"
description: "A future extension to Amber that adds reliable cross-device synchronization for vaults, notes, and mixed media."
category: specs
specCategory: "reference"
icon: filecode
lastUpdated: "2026-01-22"
---

# Amber Sync

A future extension to Amber that adds reliable cross-device synchronization for vaults, notes, and mixed media.

---

## Vision

Amber currently serves as Grove's storage layer with a deliberately limited scope: view-only access to compressed media and text. Amber Sync would extend this into a full synchronization service—something like Obsidian Sync or iCloud Drive, but built on Grove's infrastructure with no artificial storage limits.

The key differentiator: R2 storage is so cheap that personal sync can be effectively unlimited. No 10GB ceiling, no per-gigabyte upsells. Videos, PDFs, large attachments—whatever you want to keep in sync.

---

## Core Problem

Sync is a distributed systems problem disguised as a file storage problem. The hard parts aren't storage—they're coordination:

- **Conflict resolution**: Two devices edit the same file offline, then reconnect. What happens?
- **Offline-first reconciliation**: Edits queue up across multiple devices with no connectivity, then all come online at once.
- **Partial sync states**: Network drops mid-upload. Device sleeps mid-download. Battery dies during merge.
- **Version history**: Users expect to recover previous versions. How far back? How granular?

iCloud fails at this regularly. Obsidian Sync gets it right. The difference is engineering investment, not infrastructure cost.

---

## Potential Architecture

### Storage Layer (Amber)
- R2 for content-addressed file chunks
- D1 for metadata, version vectors, sync state
- Effectively unlimited storage at ~$0.015/GB/month

### Coordination Layer
- `VaultDO` (Durable Object) per vault
  - Tracks file tree state
  - Maintains version vectors per device
  - Coordinates concurrent updates
  - Handles conflict detection and resolution strategy
- Similar pattern to SessionDO/TenantDO from Lattice auth work

### Sync Protocol
- Delta-based updates (don't re-upload entire files for small edits)
- Content-addressed chunks for deduplication
- Vector clocks or similar for causality tracking
- CRDT consideration for text files (Yjs, Automerge, or custom)

### Client Integration
- Desktop: Filesystem watcher + sync daemon (or app plugin)
- Mobile: On-open sync with progress indication (background sync is iOS-hostile anyway)
- Web: Already covered by Amber's existing interface

---

## Use Cases

### Primary: Personal Knowledge Base Sync
- Markdown vaults (Obsidian-style)
- Mixed media: text, images, videos, PDFs
- Cross-device: Mac, iPhone, iPad, web

### Secondary: General File Sync
- Could extend to general-purpose sync
- Potential Raindrop alternative for bookmarks/saves
- Reference material, research dumps, media archives

### Tertiary: Shared Vaults
- Collaborative sync between Grove users
- More complex (permissions, multi-user conflict resolution)
- Punt this to v2 or later

---

## Known Hard Problems

1. **Text merge conflicts** — CRDTs solve this but add complexity. Could start simpler (last-write-wins with manual conflict resolution) and upgrade later.

2. **Large binary files** — Videos and PDFs don't merge well. Probably just last-write-wins with version history.

3. **iOS background limits** — Apple restricts background execution. Sync has to be "good enough" on app open rather than truly continuous.

4. **Client development** — Need actual apps/plugins for each platform. This is probably the biggest time sink.

5. **Edge cases** — The long tail of weird sync states will haunt you for months after "launch."

---

## Why Not Just Use Git?

Git (via obsidian-git plugin) is actually a solid option for text-heavy vaults:
- Free with private GitHub repos
- Excellent conflict resolution for text
- Version history built in

Downsides:
- Large binaries bloat the repo
- Commit history is semi-public (activity visible even if content isn't)
- Mobile git clients are clunky
- Not truly seamless—requires manual commits or automation

Amber Sync would aim for the seamlessness of Obsidian Sync with the cost structure of self-hosted.

---

## Timeline Reality

This is a "plant the seed" project. Not for:
- January 2026
- Q1 2026
- Probably not even Q2 2026

Amber itself is built but not wired up, and that's fine. Sync is an extension that matters once:
1. Grove is live and generating some revenue
2. Amber is actually connected and in use
3. There's bandwidth for a multi-week engineering project

Rough estimate: 4-8 weeks focused work for MVP, plus ongoing edge-case fixes.

---

## Open Questions

- Start with Obsidian plugin specifically, or build general sync first?
- CRDT from day one, or simpler conflict strategy to start?
- Version history: how much, how long, how to prune?
- Shared vaults: punt entirely or design for it early?
- Pricing model if offered to others: free tier + paid? Usage-based? Flat rate?

---

*Last updated: January 2026*
*Status: Seedling — not actively developing*
