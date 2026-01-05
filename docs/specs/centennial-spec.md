---
aliases: []
date created: Saturday, January 4th 2026
date modified: Saturday, January 4th 2026
tags:
  - domain-preservation
  - longevity
  - membership
type: tech-spec
---

# Centennial — Domain Preservation

> *Some trees outlive the people who planted them.*

Guarantees 100-year domain preservation after 12 cumulative months of Sapling+ membership. Your grove.place subdomain stays online for a century, even after you're gone. Some trees outlive the people who planted them.

**Public Name:** Centennial
**Internal Name:** GroveCentennial
**Last Updated:** January 2026

A century is the lifetime of an oak. It's the span between a sapling taking root and becoming something people gather beneath for shade. Centennial is Grove's promise that your words can have that same longevity.

When you've been part of Grove long enough to put down real roots, your site earns Centennial status. Your `name.grove.place` domain stays online for 100 years from the day you planted it — even if you stop paying, even after you're gone.

```
         ~ some trees outlive the people who planted them ~

                              2026                              2126
                                │                                 │
                                ▼                                 ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │                                                                       │
    │   🌱                     ────────────────────────────────▶        🌳  │
    │   planted                                                        100  │
    │                                                                 years │
    │                           your grove persists                         │
    │                                                                       │
    └───────────────────────────────────────────────────────────────────────┘

                    ├─────────────────── 100 years ───────────────────┤

             You plant.            You grow.            Your words remain.
```

---

## Goals

1. **Permanence as a feature** — Your grove outlives you if you want it to
2. **Automatic unlock** — No application, no ceremony, just time invested
3. **Opt-out available** — Not everyone wants digital immortality
4. **Simple math** — 12 months of membership, 100 years of preservation

---

## How It Works

### Earning Centennial Status

```
    The Path to Centennial:

    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   Month   1   2   3   4   5   6   7   8   9  10  11  12            │
    │           │   │   │   │   │   │   │   │   │   │   │   │            │
    │           ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼            │
    │           🌱  🌱  🌱  🌱  🌱  🌱  🌱  🌿  🌿  🌿  🌿  🌳            │
    │           ░░  ░░  ░░  ░░  ░░  ░░  ░░  ██  ██  ██  ██  ██            │
    │                                                                     │
    │           └────────── growing ──────────┴── earned! ──┘            │
    │                                                                     │
    │           12 cumulative months at Sapling ($12) or above            │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘

    Yearly subscription? Instant upon first renewal.
    Monthly? After 12 payments. Mixed? Cumulative.
```

Centennial status unlocks automatically when a user reaches **12 cumulative months** of paid membership on **Sapling tier or above**.

| Path to Centennial | Timeline |
|-------------------|----------|
| Yearly subscription (Sapling+) | Instant upon first renewal |
| Monthly subscription (Sapling+) | After 12 monthly payments |
| Mixed (upgrade/downgrade) | Cumulative months counted |

**Tier requirements:**
- **Free:** Not eligible
- **Seedling ($8):** Not eligible
- **Sapling ($12):** Eligible
- **Oak ($25):** Eligible
- **Evergreen ($35):** Eligible

The logic: Sapling is where people start investing seriously. If you've committed to a year at Sapling or above, you've proven this matters to you.

### What Centennial Means

Once earned, Centennial status grants:

1. **100-year domain reservation** — Your `name.grove.place` subdomain is reserved for 100 years from your `planted_at` date
2. **Content preservation** — Your published posts remain publicly accessible
3. **RSS feed maintained** — Subscribers can still receive your content
4. **Static archive** — If you stop paying, your site becomes a read-only archive (no new posts, no admin access)

### The 100-Year Clock

The preservation period is calculated from when the user first created their Grove account (`planted_at`), not when they earned Centennial status.

```
preservation_until = planted_at + 100 years
```

This means:
- Plant your grove in 2026 → preserved until 2126
- The clock starts when you plant, not when you qualify
- Earning Centennial retroactively protects from day one

### Active vs. Archived State

```
    Grove Lifecycle States:

                    ┌─────────────────────────────────────────────┐
                    │                                             │
                    ▼                                             │
    ┌──────────┐         ┌──────────┐         ┌──────────┐       │
    │  ACTIVE  │────────▶│ ARCHIVED │────────▶│ DELETED  │       │
    │          │ lapsed  │          │ request │          │       │
    │  🌳 🌿   │         │   🌳     │         │    ✕     │       │
    │  writing │         │ read-only│         │  removed │       │
    └──────────┘         └──────────┘         └──────────┘       │
         │                    │                                   │
         │                    │ resubscribe                       │
         │                    └───────────────────────────────────┘
         │
         └──────────────────▶ Can always delete if you choose

    Archived groves:
    • All published posts remain publicly accessible
    • RSS feed continues working
    • No admin access (can't edit, delete, or publish)
    • Reactivate anytime by resuming subscription
```

| State | Description |
|-------|-------------|
| **Active** | Paid subscription, full access, can publish |
| **Archived** | Centennial earned, subscription lapsed, read-only |
| **Deleted** | User requested deletion, content removed |

**Archived groves:**
- All published posts remain publicly accessible
- RSS feed continues working
- No admin access (can't edit, delete, or publish)
- Site displays subtle "archived" indicator
- Reactivate anytime by resuming subscription

---

## Opting Out

Not everyone wants their words to outlive them. Centennial is **automatic but reversible**.

### Opt-Out Options

1. **Disable Centennial** — In account settings, toggle off "Preserve my grove"
   - Domain returns to pool after subscription ends
   - Can re-enable anytime while subscribed

2. **Delete Account** — Full account deletion removes everything
   - Content permanently deleted
   - Domain released immediately
   - Irreversible (with confirmation flow)

3. **Designate Successor** — Future feature (Phase 3+)
   - Transfer grove ownership to another Grove user
   - Successor can choose to maintain, archive, or delete

### Default State

Centennial is **enabled by default** once earned. The logic:
- Most people want their work preserved
- Opting out is easy if you don't
- Surprise deletion is worse than surprise preservation

---

## Implementation

### Database Schema

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN centennial_status TEXT DEFAULT 'ineligible';
-- Values: 'ineligible', 'eligible', 'earned', 'opted_out'

ALTER TABLE users ADD COLUMN centennial_earned_at INTEGER;
-- Unix timestamp when status changed to 'earned'

ALTER TABLE users ADD COLUMN centennial_preserve BOOLEAN DEFAULT TRUE;
-- User preference for preservation

ALTER TABLE users ADD COLUMN cumulative_months INTEGER DEFAULT 0;
-- Running count of qualifying months
```

### Status Calculation

```typescript
function updateCentennialStatus(user: User): CentennialStatus {
  // Check tier eligibility
  const eligibleTiers = ['sapling', 'oak', 'evergreen'];
  if (!eligibleTiers.includes(user.tier)) {
    return 'ineligible';
  }

  // Check cumulative months
  if (user.cumulative_months >= 12) {
    if (user.centennial_status !== 'earned') {
      user.centennial_earned_at = Date.now();
    }
    return user.centennial_preserve ? 'earned' : 'opted_out';
  }

  return 'eligible';
}

function getPreservationDate(user: User): Date | null {
  if (user.centennial_status !== 'earned') return null;

  const plantedAt = new Date(user.planted_at);
  return new Date(plantedAt.setFullYear(plantedAt.getFullYear() + 100));
}
```

### Monthly Increment Logic

Cumulative months increment when:
- A monthly payment succeeds (Sapling+)
- A yearly payment succeeds (adds 12 months)
- An upgrade from Seedling to Sapling+ occurs mid-cycle (prorated)

Cumulative months do **not** decrement:
- On downgrade to Seedling
- On subscription pause
- On payment failure (but no new months added)

### Archive Transition

When a Centennial-earned user's subscription lapses:

1. **Grace period:** 7 days before any change
2. **Archive transition:**
   - Set `status = 'archived'`
   - Disable admin routes
   - Add archive banner to public pages
   - Preserve all content as-is
3. **Reactivation:** Resume subscription → full access restored

---

## User Communication

### Earning Centennial

When a user earns Centennial status, send:

**Subject:** Your grove will stand for a century

**Body:**
> You've been growing with us for a year now. That means something.
>
> Your grove has earned Centennial status. Even if you stop paying someday, even after you're gone, your words will remain at `name.grove.place` for the next hundred years.
>
> Some trees outlive the people who planted them. Yours will too — if you want it to.
>
> You can disable this anytime in Settings → Privacy → Preservation. But we thought you'd want to know: your roots run deep now.

### Archive Transition

When a Centennial grove becomes archived:

**Subject:** Your grove is now an archive

**Body:**
> Your subscription has ended, but your grove remains.
>
> Because you earned Centennial status, `name.grove.place` will stay online as a read-only archive until [preservation_date]. Your words are still there. People can still read them.
>
> If you ever want to write again, just resubscribe and pick up where you left off.

---

## Display Elements

### Account Settings

```
┌─────────────────────────────────────────────────────┐
│  Centennial Status                                  │
│  ────────────────────────────────────────────────── │
│                                                     │
│  ✓ Earned (January 2027)                            │
│                                                     │
│  Your grove will be preserved until January 2126.   │
│  Even if you stop paying, your words remain.        │
│                                                     │
│  [ ] Preserve my grove after I'm gone               │
│      Uncheck to release your domain when your       │
│      subscription ends.                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Progress Indicator (Pre-Earned)

```
┌─────────────────────────────────────────────────────┐
│  Path to Centennial                                 │
│  ────────────────────────────────────────────────── │
│                                                     │
│  ████████████░░░░░░░░  7 of 12 months               │
│                                                     │
│  5 months until your grove earns permanent status.  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Archived Grove Banner

Subtle banner on archived groves (visible to visitors):

```
┌─────────────────────────────────────────────────────┐
│  🌳 This grove is preserved as an archive.          │
│     Last updated: March 2045                        │
└─────────────────────────────────────────────────────┘
```

---

## Edge Cases

### What if Grove shuts down?

If Grove ever ceases operation:
1. All Centennial groves are exported to static HTML
2. Archives hosted on commodity infrastructure (pre-funded)
3. Domain redirects to archive location
4. See: [Shutdown Plan] (future doc)

### What about abandoned domains people want?

Centennial domains are **never reclaimed** during the 100-year period:
- Even if the content seems abandoned
- Even if someone else wants the username
- The promise is the promise

After 100 years, domain returns to the pool.

### What if someone dies and family wants content removed?

Family can contact support with:
- Proof of relationship
- Death certificate
- Request for deletion or transfer

We'll work with them. Preservation is the default; respect for the family's wishes is the exception.

---

## Philosophy

Most platforms treat your content as theirs. When you stop paying, it vanishes. When they shut down, everything disappears. The default state of the internet is impermanence.

Centennial is a different bet: that some things are worth keeping. That your words, accumulated over years, might matter to someone you'll never meet. That a century from now, someone might stumble onto your little corner of the internet and feel less alone.

```
    A hundred years is a long time.
    It's also roughly how long an oak tree lives.

              2026                                        2126
                │                                           │
    ────────────┼───────────────────────────────────────────┼────────────
                │                                           │
                │     .  *  .    .  *  .    .  *  .         │
                │  .     ╭───╮     .     ╭───────╮     .    │
                │ *    ╭─┤   ├─╮  *    ╭─┤       ├─╮   *    │
                │.   ╭─┤ │   │ ├─╮   ╭─┤ │       │ ├─╮  .   │
                │   ╭┤ │ │ 🌱│ │ ├╮ ╭┤ │ │  🌳   │ │ ├╮     │
                │  ┌┤│ │ │   │ │ │├┐││ │ │       │ │ │││    │
                │  │││ │ │   │ │ │││││ │ │       │ │ │││    │
                │  └┴┴─┴─┴───┴─┴─┴┴┘└┴─┴─┴───────┴─┴─┴┴┘    │
                │ ╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱   │
                │────────────────────────────────────────   │
                │                                           │
                │                                           │
              plant                                      still
              your                                      standing
              grove

                        ~ plant something worth keeping ~
```

---

*Last updated: January 2026*
