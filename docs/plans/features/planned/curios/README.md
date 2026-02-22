# Curio Safari — Individual Plans

> Split from the [Curio Safari mega-plan](../../../../safaris/planned/curio-safari.md) into agent-handoff-ready files.
> Each file is self-contained with full design specs, implementation tasks, and admin notes.

## Index

| #   | Curio           | File                                                 | Safari Status       | Wave |
| --- | --------------- | ---------------------------------------------------- | ------------------- | ---- |
| 1   | Hit Counter     | [01-hit-counter.md](01-hit-counter.md)               | Full treatment      | 1    |
| 2   | Mood Ring       | [02-mood-ring.md](02-mood-ring.md)                   | Full treatment      | 1    |
| 3   | Now Playing     | [03-now-playing.md](03-now-playing.md)               | Full treatment      | 1    |
| 4   | Guestbook       | [04-guestbook.md](04-guestbook.md)                   | Full treatment      | 1    |
| 5   | Badges          | [05-badges.md](05-badges.md)                         | Full treatment      | 2    |
| 6   | Blogroll        | [06-blogroll.md](06-blogroll.md)                     | Full treatment      | 3    |
| 7   | Webring         | [07-webring.md](07-webring.md)                       | Full treatment      | 1    |
| 8   | Link Garden     | [08-link-garden-merged.md](08-link-garden-merged.md) | Merged into Shelves | 3    |
| 9   | Activity Status | [09-activity-status.md](09-activity-status.md)       | Full treatment      | 3    |
| 10  | Status Badge    | [10-status-badge.md](10-status-badge.md)             | Full treatment      | 3    |
| 11  | Shelves         | [11-shelves.md](11-shelves.md)                       | Full treatment      | 3    |
| 12  | Artifacts       | [12-artifacts.md](12-artifacts.md)                   | Full treatment      | 3    |
| 13  | Polls           | [13-polls.md](13-polls.md)                           | Full treatment      | 3    |
| 14  | Shrines         | [14-shrines.md](14-shrines.md)                       | Full treatment      | 3    |
| 15  | Cursors         | [15-cursors.md](15-cursors.md)                       | Full treatment      | 3    |
| 16  | Ambient         | [16-ambient.md](16-ambient.md)                       | Full treatment      | 3    |
| 17  | Clip Art        | [17-clip-art.md](17-clip-art.md)                     | Shallow (deferred)  | 3    |
| 18  | Custom Uploads  | [18-custom-uploads.md](18-custom-uploads.md)         | Full treatment      | 3    |

### Skipped curios (no individual files)

Gallery (#19), Journey (#20), Timeline (#21), and Pulse (#22) were observed during the safari but deferred — admin pages exist, public components are future work.

---

## Implementation Waves

### Wave 1 — Quick polish (existing components)

1. Hit Counter — render all 4 styles, grove palette, dedup
2. Mood Ring — render all 3 display styles, glow/pulse animation
3. Now Playing — swap hardcoded green, vinyl spin, warm fallback
4. Guestbook — warm palette, organic shapes, accent borders
5. Webring — grove colors, character
6. Cross-cutting — shared `.sr-only`, replace hardcoded `#4ade80` and `rgba()` colors

### Wave 2 — Badges expansion (HIGH PRIORITY)

7. Design custom Grove badge format (shape, sizes per category)
8. Pre-built badge library (retro web, pride & identity, seasonal & nature, achievements)
9. Badge wall/grid public display component (replace pill row)
10. Showcase shelf for featured badges
11. Custom badge image upload via Custom Uploads curio
12. Upload Picker shared component for badge/shrine/cursor admin pages

### Wave 3 — Remaining polish + missing components

13. Blogroll — warm palette, favicon fallback, descriptions
14. Link Garden — glass cards, section icons
15. Polls — grove-green bars, animation, winner highlight
16. Activity Status — pulse animation, warm fallback text
17. Status Badges — grove palette alignment
18. Bookmark Shelf — physical shelf effect, book spines
19. Ambient — warmer button, sound label on hover
20. Custom Uploads — upload dropzone, category tags, wire usage_count
21. Shrines — build public component (spatial frame rendering)
22. Clip Art — build public component (positioned overlays)

### Wave 4 — Future

23. Artifacts — full collectible system
24. Badge builder tool
25. Badge trading/gifting
26. Cursor trail canvas rendering

---

## Cross-cutting patterns

- [ ] **Duplicated `.sr-only`**: Every curio component defines its own `.sr-only` class. Should use a shared utility class.
- [ ] **Hardcoded rgba colors**: Many components use `rgba(0,0,0,0.04)` / `rgba(255,255,255,0.06)` instead of theme-aware vars.
- [ ] **Hardcoded `#4ade80`**: Hit counter, now playing, webring all use raw green hex instead of `rgb(var(--grove-500))`.
- [ ] **No shared skeleton animation**: Each component has static gray rectangles. Could pulse/shimmer.
- [ ] **lucide-svelte in admin pages**: Several admin pages import directly from lucide-svelte instead of engine icons.
- [ ] **No upload picker integration**: Badges, shrines, and cursors ask for external URLs — should have a "pick from Custom Uploads" button.
- [ ] **Trail canvas not implemented**: Cursors config has trail effects but the canvas rendering is a no-op.

---

## Missing public components

| Curio        | Admin Complexity          | Status          |
| ------------ | ------------------------- | --------------- |
| **Shrines**  | Complete (spatial layout) | Needs component |
| **Clip Art** | Complete (positioning)    | Needs component |
| **Gallery**  | Comprehensive (R2/Amber)  | SKIPPED for now |
| **Timeline** | Massive (1622 lines, AI)  | SKIPPED for now |
| **Pulse**    | Complete (webhooks)       | SKIPPED for now |
| **Journey**  | Placeholder only          | SKIPPED for now |
