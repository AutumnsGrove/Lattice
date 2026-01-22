---
title: The Filing Cabinet
description: D1 database patterns for persistent storage
category: exhibit
exhibitWing: data
icon: folder
lastUpdated: '2026-01-22'
---
# The Filing Cabinet

> *D1 database patterns for persistent storage.*

---

## What You're Looking At

This exhibit explains how Grove uses Cloudflare D1 (SQLite at the edge) for persistent storage. Posts, comments, settings, and user data all live here.

---

## The Pattern

**Tenant Isolation**: Every query is scoped to a tenant. Your data can't leak to other blogs.

**Isolated Try/Catch**: One failing query doesn't block others. Each query has its own error handling.

**Parallel Queries**: Independent queries run simultaneously to reduce latency.

---

## Why It Matters

D1 puts your database at the edge, close to your readers. Combined with careful query patterns, this means fast, reliable data access worldwide.

---

## Continue Your Tour

- **[The Quick-Lookup Shelf](./quick-lookup.md)** — Next exhibit
- **[Return to Wing](./WING.md)**

---

*This exhibit is under construction. The full tour is coming soon.*
