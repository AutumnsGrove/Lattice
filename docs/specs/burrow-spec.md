---
title: Burrow — Cross-Property Access
description: Trusted cross-property access between greenhouse-mode Grove properties
category: specs
specCategory: platform-services
icon: network
lastUpdated: '2026-02-06'
aliases: []
tags:
  - cross-property-access
  - authentication
  - greenhouse-mode
  - cloudflare-workers
---

# Burrow — Cross-Property Access

```
                    YOUR ARBOR                         THE PRISM
                        │                                  │
                   ┌────┴────┐                        ┌────┴────┐
                   │  🌳     │                        │  🌲🌲🌲  │
                   │  your   │                        │ forest  │
                   │  tree   │                        │         │
                   └────┬────┘                        └────┬────┘
    ════════════════════╪══════════════════════════════════╪═════════════
                        │                                  │
                        │        ╭──────────────╮          │
                        ╰────────┤   BURROW    ├──────────╯
                                 │  ~~~~~~~~~~  │
                                 │  protected   │
                                 │  passage     │
                                 ╰──────────────╯

                        Invisible from above.
                 Shared only with trusted companions.
```

> *A protected way through.*

Grove's system for trusted cross-property access. When two properties are both in greenhouse mode with matching permissions, a Wanderer can burrow from one to the other with a single click. No new account. No separate login. Just a secure handoff from your arbor into a property that's opened its doors to you.

**Public Name:** Burrow
**Internal Name:** GroveBurrow
**Domain:** *Integrated into Arbor*
**Repository:** Part of [AutumnsGrove/GroveEngine](https://github.com/AutumnsGrove/GroveEngine)
**Last Updated:** January 2026

In the forest, a burrow is a protected passage beneath the earth. Animals create burrows to move safely between dens, sharing them with family and trusted companions. The passage is invisible from above. You have to know it's there.

Burrow builds on top of Greenhouse mode. Where Greenhouse provides the trust layer (both properties under glass), Burrow provides the passage. Dave wants to help moderate The Prism? Dig a burrow. The connection respects his existing role. Pathfinders get admin access, Rooted Wanderers can contribute, the Wayfinder gets everything.

---

## The Burrow Lexicon

Extending the Graft vocabulary with burrow-specific terms:

| Term | Action | Description |
|------|--------|-------------|
| **Burrow** | Connection | A trusted passage between two greenhouse properties |
| **Dig** | Create | Open a burrow (establish access) |
| **Fill** | Close | Close a burrow (revoke access) |
| **Receiving** | Property state | A property configured to accept incoming burrows |
| **Surface** | Exit | Leave a burrowed session, return to origin |

*"I'll dig a burrow to The Prism for Dave."*
*"Put The Prism in receiving mode."*
*"Fill that burrow. His moderation privileges have been revoked."*

---

## Goals

1. **One-click access** — Burrow into another property from your arbor with a single click
2. **No new accounts** — Access properties without creating separate credentials
3. **Role-constrained** — Your permissions are bounded by your existing Grove role
4. **Duration-configurable** — Access can last a day, a week, forever, or until membership ends
5. **Audit everything** — Full trail of who burrowed where, when, and what they did
6. **Greenhouse trust** — Both sides must be under glass for the burrow to work
7. **Minimal storage** — Just source, target, and a hash. No sensitive data.
8. **Wayfinder override** — Wayfinder can burrow into any property, period.

---

## Important Distinction: Properties vs. Personal Groves

Burrow is for **Grove properties**, not personal blogs.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BURROW TARGETS                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   CAN BURROW INTO (Properties)                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  • Forests (The Prism, The Terminal, The Kitchen)           │   │
│   │  • Grove Platforms (Amber, Ivy, Pantry)                     │   │
│   │  • Test Tenants (staging-grove, dev-grove)                  │   │
│   │  • Shared Admin Properties (internal tools)                 │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   CANNOT BURROW INTO (Personal Groves)                              │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  • dave.grove.place (Dave's personal blog)                  │   │
│   │  • sarah.grove.place (Sarah's personal blog)                │   │
│   │  • Any user's personal subdomain                            │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   Why: Personal groves are sovereign. They belong to their owners.  │
│   Properties are shared infrastructure that need collaborative      │
│   access without traditional account systems.                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The Wayfinder Graft

The Wayfinder has a special graft: `wayfinder_burrow`. This grants universal access to any Grove property, regardless of whether it's configured to receive burrows.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WAYFINDER OVERRIDE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Regular User Flow:                                                │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  1. Target property must be in receiving mode               │   │
│   │  2. Someone must dig a burrow for the user                  │   │
│   │  3. User can then access with granted permissions           │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   Wayfinder Flow:                                                   │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  1. Wayfinder has `wayfinder_burrow` graft (always on)      │   │
│   │  2. Can burrow into ANY property (receiving or not)         │   │
│   │  3. Automatically gets full access                          │   │
│   │  4. No pre-configuration needed                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   This is essential for:                                            │
│   • Initial setup of new properties for receiving                   │
│   • Emergency access when something breaks                          │
│   • Routine maintenance of Grove infrastructure                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### The `wayfinder_burrow` Graft

```typescript
// In feature_flags table
{
  id: 'wayfinder_burrow',
  name: 'Wayfinder Universal Burrow',
  description: 'Grants universal burrow access to all Grove properties',
  flag_type: 'boolean',
  default_value: 'false',
  rules: [
    {
      ruleType: 'user',
      ruleValue: { userIds: ['wayfinder_autumn'] }, // The one Wayfinder
      resultValue: true,
      priority: 100
    }
  ]
}
```

### How Wayfinder Enables Receiving

Before anyone can burrow into a property, the Wayfinder must enable receiving mode:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RECEIVING CONFIGURATION FLOW                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   1. New property exists (e.g., new Forest "The Greenhouse")        │
│      └── Not receiving yet. No one can burrow in.                   │
│                                                                     │
│   2. Wayfinder burrows in (via wayfinder_burrow graft)              │
│      └── Universal access, no receiving mode required.              │
│                                                                     │
│   3. Wayfinder enables receiving mode for the property              │
│      ┌───────────────────────────────────────────────────────────┐  │
│      │  POST /api/burrow/configure-receiving                     │  │
│      │  {                                                        │  │
│      │    property_id: "the-greenhouse",                         │  │
│      │    receiving_enabled: true,                               │  │
│      │    max_incoming_permission: "admin",                      │  │
│      │    allowed_sources: null  // any greenhouse property      │  │
│      │  }                                                        │  │
│      └───────────────────────────────────────────────────────────┘  │
│                                                                     │
│   4. Property is now receiving. Wayfinder can dig burrows for others│
│                                                                     │
│   5. Wayfinder digs burrow for Dave (Pathfinder)                    │
│      └── Dave can now access The Greenhouse with admin perms.       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Use Cases

### Forests (Primary)

Forests are community aggregators without traditional accounts. The Prism, The Terminal, The Kitchen. How does someone moderate a Forest if there's no account to log into?

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FOREST MODERATION USE CASE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Dave (Pathfinder) wants to help moderate The Prism                │
│                                                                     │
│   1. Wayfinder digs a burrow: Dave → The Prism                      │
│   2. The Prism is in receiving mode (accepts burrows)               │
│   3. Dave sees "The Prism" in his arbor under "Your Burrows"        │
│   4. Dave clicks → burrow handoff → arrives at The Prism admin      │
│   5. Dave's permissions: Pathfinder → admin access                  │
│                                                                     │
│   ┌──────────────┐          ┌──────────────────────────┐            │
│   │ Dave's Arbor │          │      The Prism           │            │
│   │              │  BURROW  │                          │            │
│   │ [The Prism]──┼─────────►│  Welcome, Pathfinder     │            │
│   │              │          │  Moderation tools: ✓     │            │
│   │              │          │  Settings: ✓             │            │
│   └──────────────┘          │  Full admin: ✗           │            │
│                             └──────────────────────────┘            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Test Tenants

Internal testing without managing separate credentials:

```
Developer wants to test a feature on staging-grove

1. Developer's personal grove is in greenhouse mode
2. staging-grove is in greenhouse mode
3. Dig a burrow → developer can access staging-grove admin
4. No shared passwords. No separate login flow.
```

### Grove Platform Access (Amber, Ivy)

Access other Grove platforms you maintain:

```
Wayfinder wants to check Amber (storage management)

1. Autumn's grove is in greenhouse mode
2. Amber property is in greenhouse mode
3. Burrow from arbor → full Amber admin access
4. Same identity, different property
```

### Community Contributors

Let Rooted Wanderers contribute to shared spaces:

```
Sarah (Rooted Wanderer) wants to help curate The Kitchen

1. Sarah's subscription means she's Rooted
2. The Kitchen forest allows Rooted contributors
3. Dig a burrow with contributor permissions
4. Sarah can add content, suggest changes (not moderate)
```

---

## Permission Model

The key insight: **your burrow permissions are constrained by your existing role**.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PERMISSION INHERITANCE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Your Burrow Access = min(your_role, burrow_max_permissions)       │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Role Hierarchy (your ceiling)                              │   │
│   │                                                             │   │
│   │     Wayfinder ─────────────────────────── Full Access       │   │
│   │         │                                                   │   │
│   │     Pathfinder ────────────────────────── Admin Access      │   │
│   │         │                                                   │   │
│   │     Rooted Wanderer ───────────────────── Contributor       │   │
│   │         │                                                   │   │
│   │     Wanderer ──────────────────────────── Read Only         │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Burrow Configuration (the limit)                           │   │
│   │                                                             │   │
│   │     max_permissions: 'admin' | 'contributor' | 'readonly'   │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   Examples:                                                         │
│   • Pathfinder + burrow(admin) = admin access                       │
│   • Rooted Wanderer + burrow(admin) = contributor (role ceiling)    │
│   • Wayfinder + burrow(contributor) = contributor (burrow ceiling)  │
│   • Wanderer + burrow(contributor) = readonly (role ceiling)        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Permission Levels

| Level | Can Do |
|-------|--------|
| `full` | Everything. Reserved for Wayfinder. |
| `admin` | Moderate, configure settings, manage content |
| `contributor` | Add content, suggest changes, participate |
| `readonly` | View admin interface, no modifications |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      BURROW ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                     SOURCE PROPERTY                          │   │
│   │                    (Greenhouse Mode)                         │   │
│   │                                                             │   │
│   │   ┌─────────────────┐    ┌─────────────────┐                │   │
│   │   │   User Session  │    │  Burrow List    │                │   │
│   │   │   (Heartwood)   │    │  in Arbor UI    │                │   │
│   │   └────────┬────────┘    └────────┬────────┘                │   │
│   │            │                      │                         │   │
│   │            └──────────┬───────────┘                         │   │
│   │                       ↓                                     │   │
│   │              ┌────────────────┐                             │   │
│   │              │  Dig Request   │                             │   │
│   │              │  (one-click)   │                             │   │
│   │              └────────┬───────┘                             │   │
│   │                       │                                     │   │
│   └───────────────────────┼─────────────────────────────────────┘   │
│                           │                                         │
│                           ↓                                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    BURROW SERVICE                            │   │
│   │                                                             │   │
│   │   1. Validate source is greenhouse ✓                        │   │
│   │   2. Validate target is greenhouse ✓                        │   │
│   │   3. Check burrow exists & not expired ✓                    │   │
│   │   4. Calculate effective permissions                        │   │
│   │   5. Generate handoff token (hash-based)                    │   │
│   │   6. Log burrow usage                                       │   │
│   │                                                             │   │
│   │   ┌────────────┐    ┌────────────┐    ┌────────────┐        │   │
│   │   │    D1      │    │  FLAGS_KV  │    │ BURROW_KV  │        │   │
│   │   │ (config)   │    │ (greenhouse│    │ (tokens)   │        │   │
│   │   │            │    │  status)   │    │            │        │   │
│   │   └────────────┘    └────────────┘    └────────────┘        │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                           │                                         │
│                           ↓                                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    TARGET PROPERTY                           │   │
│   │                    (Greenhouse Mode)                         │   │
│   │                                                             │   │
│   │   ┌─────────────────┐                                       │   │
│   │   │ Validate Token  │ ← Handoff arrives                     │   │
│   │   │ Extract perms   │                                       │   │
│   │   │ Create session  │                                       │   │
│   │   └────────┬────────┘                                       │   │
│   │            ↓                                                │   │
│   │   ┌─────────────────┐                                       │   │
│   │   │  Target Admin   │ ← User arrives with permissions       │   │
│   │   │  Interface      │                                       │   │
│   │   └─────────────────┘                                       │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Why This Architecture

- **No full Heartwood auth** — Property-to-property handoff is internal, simpler
- **Hash-based tokens** — Lightweight, no session state needed at target
- **Greenhouse as trust layer** — Reuses existing infrastructure
- **KV for fast validation** — Sub-5ms token checks
- **D1 for configuration** — Queryable burrow management

---

## Handoff Mechanism

The handoff is the critical moment: transferring trust from source to target without a full auth flow.

```
┌─────────────────────────────────────────────────────────────────────┐
│                       HANDOFF FLOW                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   1. USER INITIATES (Source Property)                               │
│      ┌──────────────────────────────────────────────────────────┐   │
│      │  POST /api/burrow/dig                                    │   │
│      │  {                                                       │   │
│      │    target_property: "the-prism",                         │   │
│      │    user_id: "user_abc",                                  │   │
│      │    source_tenant: "autumn"                               │   │
│      │  }                                                       │   │
│      └──────────────────────────────────────────────────────────┘   │
│                           │                                         │
│                           ↓                                         │
│   2. SERVICE VALIDATES                                              │
│      • Is source in greenhouse? ✓                                   │
│      • Is target in greenhouse? ✓                                   │
│      • Does burrow exist for this user? ✓                           │
│      • Is burrow expired? ✗                                         │
│      • Calculate permissions: min(role, burrow_max)                 │
│                           │                                         │
│                           ↓                                         │
│   3. GENERATE HANDOFF TOKEN                                         │
│      ┌──────────────────────────────────────────────────────────┐   │
│      │  token = HMAC-SHA256(                                    │   │
│      │    secret,                                               │   │
│      │    source_tenant + target_property + user_id +           │   │
│      │    permissions + timestamp + nonce                       │   │
│      │  )                                                       │   │
│      │                                                          │   │
│      │  Store in KV with short TTL (60 seconds):               │   │
│      │  burrow:handoff:{token} → {                             │   │
│      │    source, target, user, perms,                         │   │
│      │    client_ip, client_ua_hash                            │   │
│      │  }                                                      │   │
│      └──────────────────────────────────────────────────────────┘   │
│                           │                                         │
│                           ↓                                         │
│   4. REDIRECT TO TARGET                                             │
│      302 → https://the-prism.grove.place/admin?burrow_token={token} │
│      Headers: Referrer-Policy: no-referrer                          │
│                           │                                         │
│                           ↓                                         │
│   5. TARGET VALIDATES (Target Property)                             │
│      ┌──────────────────────────────────────────────────────────┐   │
│      │  • Fetch token from KV                                   │   │
│      │  • Verify not expired                                    │   │
│      │  • Verify client IP + UA hash match                      │   │
│      │  • Delete token (single use)                             │   │
│      │  • Create local session with permissions                 │   │
│      └──────────────────────────────────────────────────────────┘   │
│                           │                                         │
│                           ↓                                         │
│   6. URL CLEANUP                                                    │
│      302 → same URL without ?burrow_token (clean browser history)   │
│      Set-Cookie: grove_burrow_session=...                           │
│                           │                                         │
│                           ↓                                         │
│   7. USER ARRIVES                                                   │
│      Welcome, Dave. You have admin access to The Prism.             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Token Structure

```typescript
interface BurrowHandoffToken {
  source_tenant: string;      // Where they came from
  target_property: string;    // Where they're going
  user_id: string;            // Who they are
  user_role: UserRole;        // Their Grove-wide role
  permissions: PermissionLevel; // What they can do here
  created_at: number;         // Unix timestamp
  expires_at: number;         // Unix timestamp (created_at + 60s)
  nonce: string;              // Prevent replay
  client_ip: string;          // IP at token creation (binding)
  client_ua_hash: string;     // SHA-256 of User-Agent (binding)
}
```

### Why Hash-Based (Not JWT)

- **Single use** — Token is deleted after validation, no revocation needed
- **Server-side state** — KV stores the actual payload, token is just a lookup key
- **No parsing** — Target doesn't need to decode anything, just fetch and verify
- **Minimal exposure** — Token in URL is meaningless without KV access

---

## Database Schema

```sql
-- Properties that can participate in burrows
CREATE TABLE burrow_endpoints (
  id TEXT PRIMARY KEY,
  property_type TEXT NOT NULL,        -- 'tenant', 'forest', 'platform'
  property_id TEXT NOT NULL,          -- References the actual entity
  property_name TEXT NOT NULL,        -- Human-readable name
  greenhouse_required INTEGER DEFAULT 1,

  -- Can this property receive incoming burrows?
  receiving_enabled INTEGER DEFAULT 0,

  -- Can users from this property initiate burrows?
  dig_enabled INTEGER DEFAULT 0,

  -- What's the maximum permission level for incoming burrows?
  max_incoming_permission TEXT DEFAULT 'contributor',

  -- Who can burrow in? JSON array of allowed source types/IDs
  allowed_sources TEXT,               -- null = any greenhouse property

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Individual burrow connections
CREATE TABLE burrows (
  id TEXT PRIMARY KEY,

  -- Who dug this burrow
  source_tenant TEXT NOT NULL,        -- The user's home tenant
  user_id TEXT NOT NULL,              -- The user who has access

  -- Where it leads
  target_property TEXT NOT NULL REFERENCES burrow_endpoints(id),

  -- Permission level for this specific burrow
  max_permission TEXT NOT NULL,       -- 'full', 'admin', 'contributor', 'readonly'

  -- Duration configuration
  duration_type TEXT NOT NULL,        -- 'fixed', 'membership', 'infinite'
  expires_at TEXT,                    -- null for infinite

  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'revoked'

  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT NOT NULL,           -- Who authorized this burrow
  revoked_at TEXT,
  revoked_by TEXT,
  revoke_reason TEXT,

  -- Ensure one burrow per user per target
  UNIQUE(source_tenant, user_id, target_property)
);

-- Audit log for burrow activity
CREATE TABLE burrow_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  burrow_id TEXT NOT NULL,
  action TEXT NOT NULL,               -- 'dig', 'fill', 'use', 'expire', 'extend'
  actor_id TEXT,                      -- Who performed the action
  actor_role TEXT,                    -- Their role at the time
  details TEXT,                       -- JSON with additional context
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_burrows_user ON burrows(source_tenant, user_id);
CREATE INDEX idx_burrows_target ON burrows(target_property);
CREATE INDEX idx_burrows_status ON burrows(status, expires_at);
CREATE INDEX idx_burrow_audit_burrow ON burrow_audit_log(burrow_id, created_at DESC);
CREATE INDEX idx_endpoints_type ON burrow_endpoints(property_type);
```

---

## Duration Configuration

Burrow duration is configurable per-connection.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DURATION OPTIONS                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   FIXED DURATION                                                    │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Expires after a set time period                            │   │
│   │                                                             │   │
│   │  Options:  1 day  │  7 days  │  30 days  │  90 days         │   │
│   │                                                             │   │
│   │  Use case: Temporary help, one-time access                  │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   MEMBERSHIP-BASED                                                  │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Expires when user's subscription ends                      │   │
│   │                                                             │   │
│   │  Checked on each use: is user still Rooted?                 │   │
│   │                                                             │   │
│   │  Use case: Community members who contribute while subscribed│   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   INFINITE                                                          │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Never expires (can still be revoked)                       │   │
│   │                                                             │   │
│   │  Use case: Pathfinders, long-term collaborators             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   Default: 30 days (configurable per-property)                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Arbor Integration

Burrows appear in the user's arbor (admin panel) when they have active connections.

```
┌─────────────────────────────────────────────────────────────────────┐
│  🌳 autumn's arbor                                        [logout]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ Dashboard ─────────────────────────────────────────────────┐    │
│  │  Posts: 47    │    Pages: 12    │    Storage: 2.3 GB        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─ Your Burrows ──────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │  🌲 The Prism                              [ Enter ]        │    │
│  │     LGBTQ+ community · admin access                         │    │
│  │     Expires: never                                          │    │
│  │                                                             │    │
│  │  🌲 The Terminal                           [ Enter ]        │    │
│  │     Developer community · admin access                      │    │
│  │     Expires: 23 days                                        │    │
│  │                                                             │    │
│  │  🧪 staging-grove                          [ Enter ]        │    │
│  │     Test environment · full access                          │    │
│  │     Expires: never                                          │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ───────────────────────────────────────────────────────────────    │
│                                                                     │
│  [Posts]  [Pages]  [Media]  [Settings]  [Grafts]                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Wayfinder View (Managing Burrows)

```
┌─────────────────────────────────────────────────────────────────────┐
│  🌳 autumn's arbor                                        [logout]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ Burrow Management (Wayfinder) ─────────────────────────────┐    │
│  │                                                             │    │
│  │  ┌─ The Prism ────────────────────────────────────────────┐ │    │
│  │  │  Status: Receiving (accepting burrows)                 │ │    │
│  │  │  Active burrows: 5                                     │ │    │
│  │  │                                                        │ │    │
│  │  │  ┌────────────────────────────────────────────────┐    │ │    │
│  │  │  │  Dave        │ Pathfinder │ admin   │ never    │    │ │    │
│  │  │  │  Sarah       │ Rooted     │ contrib │ 23 days  │    │ │    │
│  │  │  │  Marcus      │ Pathfinder │ admin   │ never    │    │ │    │
│  │  │  │  Jenna       │ Rooted     │ contrib │ member   │    │ │    │
│  │  │  │  Alex        │ Rooted     │ contrib │ 7 days   │    │ │    │
│  │  │  └────────────────────────────────────────────────┘    │ │    │
│  │  │                                                        │ │    │
│  │  │  [ Dig New Burrow ]            [ View Audit Log ]      │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                                                             │    │
│  │  ┌─ Dig New Burrow ───────────────────────────────────────┐ │    │
│  │  │                                                        │ │    │
│  │  │  User:        [________________] (search by name)      │ │    │
│  │  │  Permission:  [admin ▼]                                │ │    │
│  │  │  Duration:    [30 days ▼]                              │ │    │
│  │  │                                                        │ │    │
│  │  │  [ Dig Burrow ]                                        │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API

### Check Burrow Access

```typescript
import { canBurrow, getBurrows } from '@autumnsgrove/groveengine/burrow';

// Check if user can burrow to a specific property
const canAccess = await canBurrow({
  userId: locals.user.id,
  sourceTenant: locals.tenant.id,
  targetProperty: 'the-prism'
}, platform.env);

// Get all active burrows for a user
const burrows = await getBurrows({
  userId: locals.user.id,
  sourceTenant: locals.tenant.id
}, platform.env);
```

### Dig a Burrow

```typescript
import { digBurrow } from '@autumnsgrove/groveengine/burrow';

// Wayfinder or property admin digs a burrow for someone
const burrow = await digBurrow({
  sourceTenant: 'dave',
  userId: 'user_dave_123',
  targetProperty: 'the-prism',
  maxPermission: 'admin',
  durationType: 'infinite',
  createdBy: locals.user.id
}, platform.env);
```

### Generate Handoff Token

```typescript
import { createHandoff } from '@autumnsgrove/groveengine/burrow';

// Called when user clicks "Enter"
const { redirectUrl } = await createHandoff({
  burrowId: burrow.id,
  userId: locals.user.id,
  userRole: locals.user.role
}, platform.env);

// Redirect user to target with token
throw redirect(302, redirectUrl);
```

### Validate Handoff (Target Side)

```typescript
import { validateHandoff } from '@autumnsgrove/groveengine/burrow';

// In target property's hook or middleware
const handoff = await validateHandoff(
  url.searchParams.get('burrow_token'),
  platform.env
);

if (handoff) {
  // Create local session with handoff.permissions
  locals.burrowSession = {
    sourceProperty: handoff.source_tenant,
    permissions: handoff.permissions,
    userId: handoff.user_id
  };
}
```

### Fill a Burrow (Revoke)

```typescript
import { fillBurrow } from '@autumnsgrove/groveengine/burrow';

// Revoke someone's access
await fillBurrow({
  burrowId: burrow.id,
  revokedBy: locals.user.id,
  reason: 'Moderation privileges no longer needed'
}, platform.env);
```

### Configure Property as Receiving (Wayfinder Only)

```typescript
import { configureReceiving, isWayfinder } from '@autumnsgrove/groveengine/burrow';

// Only Wayfinder can configure receiving mode
if (!isWayfinder(locals.user)) {
  throw error(403, 'Only the Wayfinder can configure receiving mode');
}

// Enable a property to accept incoming burrows
await configureReceiving({
  propertyId: 'the-greenhouse',
  propertyType: 'forest',
  propertyName: 'The Greenhouse',
  receivingEnabled: true,
  maxIncomingPermission: 'admin',
  allowedSources: null, // any greenhouse property
  configuredBy: locals.user.id
}, platform.env);
```

### Check Wayfinder Universal Access

```typescript
import { canWayfinderBurrow } from '@autumnsgrove/groveengine/burrow';

// Wayfinder can burrow anywhere, even non-receiving properties
const hasUniversalAccess = await canWayfinderBurrow(
  locals.user.id,
  platform.env
);

if (hasUniversalAccess) {
  // Skip receiving check, grant full access
}
```

---

## Security Considerations

### Trust Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                       TRUST BOUNDARIES                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   TRUSTED                                                           │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  • Source property (user is authenticated via Heartwood)    │   │
│   │  • Target property (both are greenhouse, operator-managed)  │   │
│   │  • Burrow service (runs on Cloudflare, operator-controlled) │   │
│   │  • KV store (encrypted at rest, Cloudflare-managed)         │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   UNTRUSTED                                                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  • User's browser (token could be extracted)                │   │
│   │  • Network path (token visible in URL during redirect)      │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   MITIGATIONS                                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  • Token is single-use (deleted after validation)           │   │
│   │  • Token has 60-second TTL (minimal interception window)    │   │
│   │  • Token is bound to client IP + User-Agent hash            │   │
│   │  • Token is meaningless without KV access                   │   │
│   │  • Referrer-Policy: no-referrer prevents URL leakage        │   │
│   │  • URL cleanup removes token from browser history           │   │
│   │  • All properties use HTTPS                                 │   │
│   │  • Greenhouse requirement limits attack surface             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Audit Requirements

Every burrow action is logged:

| Action | Logged Data |
|--------|-------------|
| `dig` | Who created, for whom, what permissions, duration |
| `fill` | Who revoked, reason |
| `use` | When used, IP, user agent |
| `expire` | Automatic expiration timestamp |
| `extend` | Who extended, new duration |

### Token Hardening

Handoff tokens are hardened against interception and replay:

| Protection | How | Why |
|-----------|-----|-----|
| **Single-use** | Atomic KV delete on first validation | Prevents replay even if token is intercepted |
| **60-second TTL** | KV expiration + explicit check | Redirect takes <2s; 60s is generous buffer with minimal exposure |
| **IP binding** | Client IP stored at creation, verified at validation | Stolen token is useless from a different network |
| **UA binding** | SHA-256 of User-Agent stored and verified | Adds fingerprint layer alongside IP |
| **Referrer-Policy** | `no-referrer` header on redirect response | Prevents token leaking to third-party resources via Referer header |
| **URL cleanup** | 302 redirect to clean URL after validation | Removes token from address bar, browser history, and bookmarks |
| **No third-party loads** | Token landing page loads zero external resources | No CDN fonts, no analytics, nothing that could leak the URL |

### Rate Limiting

- Handoff generation: 10/minute per user
- Burrow creation: 50/day per property
- Failed validations: triggers alert after 5 failures

---

## Integration with Grafts

Burrow sits alongside Greenhouse mode in the Grafts ecosystem.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GRAFTS ECOSYSTEM LAYERS                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Layer 4: BURROW (Cross-Property Access)            ← NEW          │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  "How do I access properties without accounts?"             │   │
│   │  ├── One-click from arbor                                   │   │
│   │  ├── Role-constrained permissions                           │   │
│   │  └── Greenhouse-to-greenhouse trust                         │   │
│   └─────────────────────────────────────────────────────────────┘   │
│              ↑ Builds on greenhouse trust layer                     │
│                                                                     │
│   Layer 3: GREENHOUSE MODE (Tenant Classification)                  │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  "Who gets early access / self-serve controls?"             │   │
│   │  ├── Tenant enrollment                                      │   │
│   │  ├── Automatic feature inheritance                          │   │
│   │  └── Trust boundary for burrows                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│              ↓ Unlocks experimental features                        │
│                                                                     │
│   Layer 2: FEATURE GRAFTS (Capability Flags)                        │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  "What capabilities are enabled?"                           │   │
│   └─────────────────────────────────────────────────────────────┘   │
│              ↓ Controls what renders                                │
│                                                                     │
│   Layer 1: UI GRAFTS (Reusable Components)                          │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  "How do features render?"                                  │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## KV Cache Strategy

Fast access paths require caching. Here's what gets cached, for how long, and when it's invalidated.

```
┌─────────────────────────────────────────────────────────────────────┐
│                       CACHING LAYERS                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   HANDOFF TOKENS (BURROW_KV)                                        │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Key: burrow:handoff:{token}                                │   │
│   │  Value: { source, target, user_id, permissions, expires,   │   │
│   │           client_ip, client_ua_hash }                       │   │
│   │  TTL: 60 seconds (short-lived, single-use)                  │   │
│   │  Invalidation: Deleted on first read (consumed)             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   GREENHOUSE STATUS (FLAGS_KV)                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Key: greenhouse:{tenant_id}                                │   │
│   │  Value: { enabled: boolean, enrolled_at: timestamp }        │   │
│   │  TTL: 1 hour                                                │   │
│   │  Invalidation: On enrollment/unenrollment                   │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   RECEIVING STATUS (BURROW_KV)                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Key: burrow:receiving:{property_id}                        │   │
│   │  Value: { enabled, max_permission, allowed_sources }        │   │
│   │  TTL: 15 minutes                                            │   │
│   │  Invalidation: On configureReceiving() call                 │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   USER BURROW LIST (BURROW_KV)                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Key: burrow:user:{tenant}:{user_id}                        │   │
│   │  Value: [{ target, permissions, expires_at, status }...]    │   │
│   │  TTL: 5 minutes                                             │   │
│   │  Invalidation: On dig, fill, or expiration                  │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   WAYFINDER STATUS (FLAGS_KV)                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Key: graft:wayfinder_burrow:{user_id}                      │   │
│   │  Value: boolean                                             │   │
│   │  TTL: 1 hour                                                │   │
│   │  Invalidation: Rarely changes (graft update)                │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Cache Invalidation Triggers

| Event | Caches Invalidated |
|-------|-------------------|
| `digBurrow()` | User burrow list |
| `fillBurrow()` | User burrow list |
| `configureReceiving()` | Receiving status |
| Burrow expiration (cron) | User burrow list |
| Greenhouse enrollment | Greenhouse status |

### Why These TTLs

- **Handoff tokens (60s)**: Security-critical. Redirect completes in <2s; 60s is generous buffer with minimal exposure. Combined with IP/UA binding and single-use enforcement.
- **Greenhouse status (1 hour)**: Changes rarely. Checked on every burrow initiation.
- **Receiving status (15 min)**: Moderate change frequency. Balance freshness vs. D1 reads.
- **User burrow list (5 min)**: Displayed in arbor. Needs timely updates on changes.
- **Wayfinder status (1 hour)**: Almost never changes. Single user.

---

## Test Strategy

Following the Grove testing philosophy: write tests, not too many, mostly integration.

### Integration Tests (Primary Focus)

Test complete user flows that mirror real usage:

| Flow | What to Test |
|------|--------------|
| **Burrow access** | User clicks "Enter" → handoff → arrives at target with correct permissions |
| **Permission ceiling** | Rooted user + admin burrow → gets contributor (role ceiling applied) |
| **Expired burrow** | Access attempt after expiration → graceful denial, clear message |
| **Fill revocation** | Active burrow filled → immediate access denial, audit logged |
| **Wayfinder override** | Wayfinder burrows into non-receiving property → succeeds |
| **Receiving configuration** | Enable receiving → property appears in burrow targets |

### Unit Tests (Isolated Logic)

Pure functions that benefit from isolation:

- **Token generation**: HMAC signature correctness, payload structure
- **Permission calculation**: `min(user_role, burrow_max)` edge cases
- **Duration handling**: Fixed dates, membership checks, infinite handling
- **Expiration logic**: Boundary conditions, timezone handling

### Security Tests

Critical paths that must never fail:

- **Token single-use**: Second validation attempt fails
- **Token expiration**: Validation after TTL fails
- **Greenhouse requirement**: Non-greenhouse source/target rejected
- **Permission escalation**: Cannot exceed role or burrow maximum
- **Rate limiting**: Excessive handoff requests throttled

### What NOT to Test

- Framework routing (SvelteKit handles this)
- KV/D1 internals (Cloudflare's responsibility)
- UI component styling (visual regression if needed)
- Exact audit log format (implementation detail)

### Test Data Patterns

```typescript
// Use builders for consistent test data
const testBurrow = buildBurrow({
  permission: 'admin',
  duration: 'infinite',
  status: 'active'
});

const testHandoff = buildHandoff({
  burrow: testBurrow,
  user: { role: 'pathfinder' }
});
```

---

## Implementation Checklist

### Phase 0: Wayfinder Foundation
- [ ] Create `wayfinder_burrow` feature graft
- [ ] Implement Wayfinder detection in burrow checks
- [ ] Add property type classification (property vs. personal grove)
- [ ] Create `configureReceiving()` API for Wayfinder

### Phase 1: Database & Types
- [ ] Create D1 schema migration for burrow tables
- [ ] Define TypeScript types for burrow entities
- [ ] Add burrow-related types to grafts module

### Phase 2: Core Burrow Service
- [ ] Implement `canBurrow()` check
- [ ] Implement `digBurrow()` creation
- [ ] Implement `fillBurrow()` revocation
- [ ] Implement `getBurrows()` listing
- [ ] Add KV caching for hot paths

### Phase 3: Handoff Mechanism
- [ ] Implement `createHandoff()` token generation
- [ ] Implement `validateHandoff()` token consumption
- [ ] Add HMAC signing utilities
- [ ] Configure KV TTL for handoff tokens

### Phase 4: Arbor UI Integration
- [ ] Add "Your Burrows" section to arbor dashboard
- [ ] Implement "Enter" flow with redirect
- [ ] Add burrow management UI for Wayfinder
- [ ] Create "Dig New Burrow" form

### Phase 5: Target Property Middleware
- [ ] Add burrow token detection to SvelteKit hooks
- [ ] Implement burrow session creation
- [ ] Add permission enforcement middleware
- [ ] Create "Surface" (exit) functionality

### Phase 6: Audit & Monitoring
- [ ] Implement comprehensive audit logging
- [ ] Add rate limiting for handoff generation
- [ ] Create audit log viewer in arbor
- [ ] Set up alerts for suspicious activity

### Phase 7: Forest Integration
- [ ] Configure all Forests as receiving
- [ ] Add Forest moderation permissions
- [ ] Test Pathfinder → Forest admin flow
- [ ] Document Forest-specific use cases

### Phase 8: Documentation
- [ ] Update grove-naming.md with Burrow entry
- [ ] Add Burrow lexicon to grafts-spec.md
- [ ] Create Waystone help articles
- [ ] Update AGENT.md with burrow patterns

---

## Related Documents

- [Grafts Spec](./grafts-spec.md) — Feature flags and greenhouse mode
- [Heartwood Spec](./heartwood-spec.md) — Core authentication system
- [Forests Spec](./forests-spec.md) — Community aggregation
- [Grove Naming](../philosophy/grove-naming.md) — Naming philosophy

---

*In the forest, burrows connect what the surface keeps separate. The passage is invisible from above. You have to know it's there.*
