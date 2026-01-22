---
title: The Foundation
description: Multi-tenant architecture where one deployment serves unlimited blogs
category: exhibit
exhibitWing: architecture
icon: layers
lastUpdated: '2026-01-22'
---
# The Foundation

> *One deployment, unlimited blogs.*

---

## What You're Looking At

This exhibit explains Grove's multi-tenant architecture. Rather than deploying a separate application for each blog, Grove runs a single SvelteKit application that serves every tenant through subdomain routing.

---

## The Pattern

When a request arrives at `username.grove.place`, the routing layer extracts the subdomain and queries the appropriate tenant data. One codebase, one deployment, unlimited blogs.

---

## Why It Matters

- **Cost efficiency**: Infrastructure costs don't scale linearly with users
- **Consistency**: Every blog gets the same features and updates simultaneously
- **Simplicity**: One deployment to manage, not thousands

---

## Continue Your Tour

- **[The Engine Room](./engine-room.md)** — Next exhibit
- **[Return to Wing](./WING.md)**

---

*This exhibit is under construction. The full tour is coming soon.*
