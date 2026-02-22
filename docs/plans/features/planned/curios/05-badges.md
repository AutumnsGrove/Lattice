---
title: "Curio: Badges"
status: planned
category: features
---

# Curio: Badges

> Extracted from Curio Safari expedition plan. Agent-handoff ready.
> **Safari status**: Full treatment
> **Source**: `docs/plans/planned/curio-safari.md`, Section 5

---

**Character**: Glass ornaments. Translucent, precious, catches the light. Collectible treasures displayed in your personal cabinet of wonders.

### Current state

- 12 system badges (auto-awarded milestones), 4 community badges (Wayfinder-awarded), custom badges (Oak+ only, max 10)
- Rarity: common (gray), uncommon (green), rare (blue) — also epic (purple) and legendary (amber) defined but unused
- Public component renders pill-shaped items with icon + name + rarity border glow on showcased badges
- Admin has showcase toggle (max 5), custom badge creation (URL-based icons), system badge catalog

### Public component issues

- [ ] **Tiny and flat**: 24px icons in pill shapes — no character, no weight, no collectible feel
- [ ] **No showcase vs. collection distinction**: Showcased badges look the same as non-showcased (just a border color)
- [ ] **Rarity colors are generic**: Gray/green/blue don't feel Grove. Should use grove palette (bark/leaf/gold)
- [ ] **No hover detail**: Title attribute only — could show a proper tooltip/popover with description + earned date
- [ ] **No empty state personality**: "No badges earned yet" is flat. Could tease what's available.

---

### Badge Design Spec

#### Physical metaphor: Glass ornament

Each badge is a **frosted glass pane** — content floating behind translucent glass with blurred edges and cream/white tint. Like holding sea glass up to the light. Gossamer-ready for enhanced depth when available.

#### Badge content: Icon + label

- Icon/illustration centered, label below/etched into glass bottom edge
- **Icon registry pattern**: Badge icon registry maps IDs → Lucide (now) → AI-generated (next) → custom SVG (goal). One swap in registry, all badges update. Same pattern as engine's `lucide.ts` chain.

#### Category shapes

| Category              | Shape          | Why                                  |
| --------------------- | -------------- | ------------------------------------ |
| **Retro web**         | Rectangle      | Nod to classic web button, but glass |
| **Pride & identity**  | Shield / heart | Protection, love                     |
| **Seasonal & nature** | Leaf / circle  | Organic, cyclical                    |
| **Achievement**       | Star / medal   | Earned, proud                        |

#### Size: User-selectable

- **Small** (48-64px) — compact, dense collection, details on hover
- **Medium** (80-96px) — balanced, readable at a glance
- **Large** (120-160px) — statement pieces, glass effect shines

#### Rarity: Clarity + glow + depth (felt through the glass)

| Rarity        | Glass clarity       | Glow                             | Depth                   |
| ------------- | ------------------- | -------------------------------- | ----------------------- |
| **Common**    | Cloudy/frosted      | None                             | Simple flat pane        |
| **Uncommon**  | Clearer             | Soft warm edge glow              | Slight depth            |
| **Rare**      | Crystal clear       | Visible aura, rainbow refraction | Noticeable depth        |
| **Epic**      | Deep, gemstone-like | Gentle pulse                     | Visible internal layers |
| **Legendary** | Prismatic, alive    | Inner light, radiance            | Multiple depth layers   |

#### Pride badges: Glass IS the flag

Frosted glass pane tinted with flag colors — like stained glass segments. Trans pride = pink→white→blue glass. The flag isn't behind glass — it IS the glass.

#### Wall layouts (user-selectable)

- **Pinboard** — organic scatter, cork warmth, slightly rotated badges
- **Shadow box** — neat grid, glass case. Museum-like but cozy.
- **Journal page** — cream background, scattered like diary stickers

#### Showcase styles (user-selectable)

- **Glowing shelf** — glass shelf above wall, badges float with soft glow
- **Pinned to header** — badges near site name/bio, like lapel pins
- **Larger + centered** — inline with wall but emphasized with shimmer

#### Micro-interactions

- **Hover**: Warm glow + slight lift (glass catching light)
- **Click**: Expand to detail card (description, earned date, rarity)
- **Sound**: Subtle glass clink on hover (mutable, respects preferences)
- **Page load**: Badges wobble/settle into place (respects `prefers-reduced-motion`)

---

### Pre-built Badge Library

**Icon source strategy** (layered, swap-friendly via central registry):

1. **Now**: Lucide icons — fastest, consistent
2. **Next**: AI-generated for gaps Lucide can't fill — refined/vectorized
3. **Goal**: Custom SVG illustrations — most unique, most Grove

**Categories** (all four):

#### Retro Web Badges

- [ ] "Made with Grove" / "Powered by Grove"
- [ ] "Powered by Svelte" / "Built with SvelteKit"
- [ ] "Best viewed in Firefox" / "Best viewed in Arc"
- [ ] "This site is handmade"
- [ ] "No algorithms here"
- [ ] "Indie web citizen"
- [ ] "Webmaster" / "Webgardener"
- [ ] "HTML was my first language"
- [ ] "RSS is not dead"
- [ ] "No cookies (just vibes)"
- [ ] "Under construction" (retro aesthetic)

#### Pride & Identity Badges

- [ ] Full pride flag set (rainbow, trans, bi, pan, ace, aro, nonbinary, lesbian, gay, genderqueer, genderfluid, intersex, polyamorous, agender, demisexual, progress flag)
- [ ] Pronoun badges (he/him, she/her, they/them, he/they, she/they, any pronouns, ask me)
- [ ] "This site is queer"
- [ ] "Safe space"
- [ ] "Allies welcome"

#### Seasonal & Nature Badges

- [ ] Spring blossom, Summer sun, Autumn leaf, Winter frost
- [ ] Mushroom collector
- [ ] Night owl / Early bird
- [ ] Stargazer
- [ ] Rain lover
- [ ] Firefly catcher
- [ ] Forest dweller
- [ ] Moonchild

#### Achievement Badges (visual upgrade of existing 12)

- [ ] Redesign all 12 system badges with Grove character (not generic icons)
- [ ] Early Adopter → special seedling-to-tree badge
- [ ] First Post → quill/ink badge
- [ ] Centurion → golden oak
- [ ] Night Owl / Early Bird → actual owl/bird illustrations
- [ ] Seasonal → four-season ring

### Other badge improvements

- [ ] **Badge wall display**: Configurable layout (pinboard / shadow box / journal page)
- [ ] **Showcase**: Configurable style (glowing shelf / pinned to header / larger+centered)
- [ ] **Badge builder** (future): Pick shape, colors, icon, text
- [ ] **Image upload**: Wire into Custom Uploads curio (R2-backed, 100-image quota)
- [ ] **Trading/gifting** (future): Let tenants gift custom badges to each other

### Admin

- [ ] (Good foundation — showcase toggle, custom creation, system catalog)
- [ ] Add badge preview at all 3 sizes (small/medium/large)
- [ ] Add wall layout + showcase style selectors
- [ ] Add image upload via Custom Uploads picker
- [ ] Badge icon registry for swappable artwork sources

---
