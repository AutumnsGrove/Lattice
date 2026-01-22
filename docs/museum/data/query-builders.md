---
title: The Query Builders
description: Type-safe database helpers that prevent SQL injection
category: exhibit
exhibitWing: data
icon: code
lastUpdated: '2026-01-22'
---
# The Query Builders

> *Type-safe helpers that prevent the scary stuff.*

---

## What You're Looking At

This exhibit explains Grove's typed query builders. Instead of raw SQL strings, Grove uses helper functions that validate inputs and provide type safety.

---

## The Helpers

```typescript
// Type-safe queries
const user = await findById<User>(db, 'users', userId);
const posts = await queryMany<Post>(db, 'posts', 'status = ?', ['published']);

// Insert with auto-generated ID and timestamps
const newId = await insert(db, 'posts', { title: 'Hello', content: '...' });

// Tenant-scoped operations
const tenantDb = getTenantDb(db, { tenantId: locals.tenant.id });
```

---

## Why It Matters

SQL injection is one of the most common security vulnerabilities. By using typed helpers instead of string concatenation, Grove prevents injection attacks at the API level.

---

## Continue Your Tour

- **[The Personalization Wing](../personalization/WING.md)** — Continue to next wing
- **[Return to Wing](./WING.md)**

---

*This exhibit is under construction. The full tour is coming soon.*
