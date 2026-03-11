---
title: The Architecture Wing
description: How Grove is built at the infrastructure level
category: exhibit
exhibitWing: architecture
icon: building
lastUpdated: '2026-03-10'
---
# The Architecture Wing

> *How Grove is built at the infrastructure level.*

---

## What You're Looking At

This wing explains the structural decisions that make Grove work. One deployment serves unlimited blogs. One engine prevents duplication. Cloudflare primitives compose together like instruments in an orchestra. The Infra SDK abstracts it all into a clean, portable interface.

---

## Exhibits

### [The Foundation](./foundation.md)
Multi-tenant architecture: one deployment, unlimited blogs.

### [The Engine Room](./engine-room.md)
Engine-first pattern: how shared code prevents duplication across every tenant.

### [The Loom](./loom.md)
Durable Objects coordination layer. Seven DOs weaving real-time state.

### [The Cloud Garden](./cloud-garden.md)
Cloudflare Workers, D1, KV, R2 working together.

### The Infra SDK
GroveDatabase, GroveStorage, GroveKV, GroveServiceBus, GroveScheduler. Partial context design where omitted bindings get graceful "unavailable" proxies. Framework middleware for Hono and SvelteKit.

---

## Continue Your Tour

- **[The Aspen Wing](../aspen/WING.md)** — Why it exists
- **[The Nature Wing](../nature/WING.md)** — How it looks and feels
- **[The Trust Wing](../trust/WING.md)** — How it keeps you safe
- **[Return to Entrance](../MUSEUM.md)**

---

*This exhibit is under construction. The full tour is coming soon.*
