---
title: "Account Age Icons"
status: planned
category: features
---

# Account Age Icons

Short plan for visual account age indicators across Grove (Canopy, Meadow, profiles).

## The Idea

Show how long someone has been part of the grove through a simple icon that evolves over time. Not a badge you earn. Just a quiet signal of how long you've been growing here.

## Icons by Age

| Age | Icon | Meaning |
|-----|------|---------|
| < 10 days | 🌱 Sprout | Just planted, brand new |
| 10 days - 1 year | (default, no special icon) | Growing, finding their voice |
| 1+ years | 🌳 Tree | Deep roots, been here a while |
| Centennial-eligible | Special icon (TBD) | Part of something lasting |

## Where They Appear

- **Canopy** directory listings
- **Meadow** feed posts and replies
- **Profile** cards and hover states
- **Comment** author display

## Notes

- The sprout icon doubles as a "new here, be kind" signal to the community.
- No exact dates shown publicly. Just the icon. Privacy-friendly.
- Account age is based on `created_at` on the tenant record. No new data needed.
- Centennial icon design TBD. Should feel earned and meaningful.
- This is independent of subscription tier. A Wanderer who's been here a year gets the tree. A brand-new Evergreen gets the sprout.

## Related

- [Wanderer Plan spec](../specs/wanderer-plan-spec.md) (Canopy visibility for free tier)
- Canopy spec (directory listings)
