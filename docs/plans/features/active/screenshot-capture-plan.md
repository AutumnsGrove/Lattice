---
title: "Screenshot Capture Plan"
status: active
category: features
---

# Screenshot Capture Plan

Welcome to Grove's visual storytelling checklist. This document maps out every screenshot we need to bring our vision to life—the moments that live in articles and marketing that can't be rebuilt as live components. Think of it as your personal tour through the Grove you're building, captured for those who'll discover it.

We can't embed Svelte components in markdown articles or pre-render them at build time, so these screenshots become the bridge between what's real and what people imagine. They're not just images; they're invitations.

---

## Tier 1 — Launch Day (Must Have by Feb 14)

These are the heartbeat of launch. They appear on the landing page and core documentation—people will see these first.

- [ ] **Flow Editor — clean split view** (desktop, light theme)
  - Left: write side, right: preview side
  - Showing a short piece of prose
  - Clear, uncluttered
  - Use for: "What is Flow" article + landing page hero showcase

- [ ] **Flow Editor — write mode with line numbers** (desktop)
  - Close-up of the editor, showing line numbers visible
  - A few sentences of text with natural line breaks
  - Focus on typography and readability
  - Use for: "What is Flow" documentation

- [ ] **Flow Editor — mobile view** (375px width)
  - Full-screen editor interface
  - Responsive, readable at mobile size
  - Use for: Landing page mobile showcase

- [ ] **Published blog homepage** (a real Grove showing posts list)
  - Multiple posts visible
  - Clean card layout with titles, dates, excerpts
  - Light theme, autumn season (default)
  - Use for: Landing page + "What is Grove" article

- [ ] **Published blog homepage — mobile view**
  - Same content, responsive 375px width
  - Posts stacked vertically
  - Use for: Landing page mobile showcase

- [ ] **Single blog post** (beautiful article with typography)
  - Full post displayed nicely
  - Serif headings, good whitespace
  - Showing the reading experience
  - Use for: Landing page + "What is Grove" article

---

## Tier 2 — Launch Polish (First Week)

These flesh out the documentation and give people a fuller picture of Grove's possibilities. They help tell the seasonal story.

- [ ] **Flow Editor — Zen mode full-screen** (midnight theme)
  - Editor in distraction-free mode
  - Full dark, cozy midnight theme
  - Use for: "What is Flow" advanced features section

- [ ] **Flow Editor — dark/midnight mode** (normal split view)
  - Same split view as Tier 1, but in dark theme
  - Shows the full editing experience in low light
  - Use for: "What is Flow" + accessibility documentation

- [ ] **Blog in 4 seasons** (same blog, seasonal variants)
  - Spring: fresh greens, new growth feel
  - Summer: warm, bright aesthetic
  - Autumn: harvest golden tones (this is your default)
  - Winter: cool, restful whites and silvers
  - Use for: Vision/philosophy page + seasonal guide

- [ ] **Blog in dark mode / midnight**
  - Homepage or single post in dark theme
  - Use for: Landing + documentation about dark mode

- [ ] **Gallery grid view**
  - Clean grid of images
  - Shows thumbnail layout
  - Use for: "What is Gallery" article

- [ ] **Gallery lightbox open**
  - Large image displayed over grid
  - Navigation arrows visible
  - Use for: "What is Gallery" showcase

- [ ] **Gallery on mobile**
  - Gallery view at 375px width
  - Responsive grid or vertical scroll
  - Use for: "What is Gallery" mobile documentation

- [ ] **Arbor dashboard overview**
  - Admin dashboard showing key stats/sections
  - What creators see when they log in
  - Use for: Landing page "What You Get" section

---

## Tier 3 — Post-Launch Polish

These are the deeper dives—for people who want to understand Grove's full story. No rush, but they complete the picture.

- [ ] **Fireside chat mode in editor**
  - Flow Editor showing conversation/dialogue layout
  - Special formatting for back-and-forth
  - Use for: "What is Flow" advanced modes section

- [ ] **Image upload drag-and-drop**
  - Mid-drag state showing drop zone
  - Or post-upload showing image in editor
  - Use for: "Adding Images and Media" guide

- [ ] **Arbor posts management list**
  - Creator's view of their published posts
  - Showing edit/delete/view options
  - Optional for landing, good for admin documentation
  - Use for: Arbor user guide (if needed)

- [ ] **Arbor settings page**
  - Creator customization options
  - Garden name, colors, etc.
  - Optional but helpful for onboarding docs
  - Use for: Arbor setup guide

- [ ] **Shade protection indicator**
  - Private/protected content visual
  - This may be hard to screenshot—consider a custom graphic instead
  - Use for: "What is Shade" (privacy features) article

- [ ] **Onboarding: choose your name screen**
  - First setup step where creators pick their garden name
  - Use for: Getting Started guide

- [ ] **Onboarding: pick your season screen**
  - Season selection interface
  - Use for: Aesthetic preferences guide

---

## Tier 4 — Generated Assets (Post-Launch)

These are the promotional and sharing-ready assets. Build these after launch week when you have breathing room.

- [ ] **OG image — default** (1200x630)
  - What appears when someone shares Grove on social
  - Clean, inviting, on-brand
  - Use for: Social preview (auto-generated in meta tags)

- [ ] **OG images — seasonal variants** (1200x630 each)
  - Spring, Summer, Autumn, Winter versions
  - One for each season
  - Use for: Dynamic OG image selection based on season

- [ ] **Social quote cards** (1080x1080, 3–5 cards)
  - Grove philosophy quotes as shareable graphics
  - Examples: "Your garden, your rules" / "Write, not perform" / "Cozy corner of the web"
  - Use for: Instagram, Pinterest, social promotion

- [ ] **Feature spotlight graphics for social**
  - Flow Editor showcase
  - Gallery beauty
  - Community feel
  - Use for: Weekly social media posts during launch

- [ ] **Promo video stills** (if/when video is made)
  - Key frames from any future Grove video
  - Use for: Email campaigns, social teasers

---

## Capture Tips

These are the little details that make screenshots shine:

**Resolution & Quality:**

- Use 2x resolution for retina-quality screenshots (set device pixel ratio to 2 in DevTools)
- Save all screenshots as PNG for lossless quality
- Aim for 1920px+ width for desktop captures (they'll scale down cleanly)

**Mobile Testing:**

- Use Chrome DevTools device toolbar
- iPhone dimensions: 375×812 (standard modern width)
- Test responsiveness at this size before capturing

**Seasonal Cycling:**

- On any Grove instance, click the logo in the navigation to cycle through seasons
- Use this to capture all 4 seasonal variants without rebuilding

**Image Uploads:**

- You can now upload screenshots directly via the Arbor image gallery (admin panel)
- This keeps everything organized in one place
- Document the upload date in this checklist as you go

**File Organization:**

- Store original high-res screenshots in: `apps/landing/static/assets/screenshots/`
- Name them descriptively: `flow-editor-light-split-view.png`, `grove-blog-autumn-homepage.png`
- Keep variants clearly labeled: `-light`, `-dark`, `-mobile`, `-spring`, etc.

**Before Posting:**

- Check that sensitive info isn't visible (personal names, emails, etc.)
- Verify text is readable at thumbnail size
- Ensure no debug tools or console errors visible

---

## Screenshot Destination Map

Quick reference: where each screenshot lives once captured.

| Screenshot                     | Primary Use                  | Secondary Use         | Tier |
| ------------------------------ | ---------------------------- | --------------------- | ---- |
| Flow Editor split view (light) | Landing hero                 | What is Flow article  | 1    |
| Flow Editor write mode         | What is Flow docs            | —                     | 1    |
| Flow Editor mobile             | Landing mobile showcase      | —                     | 1    |
| Blog homepage (light)          | Landing showcase             | What is Grove article | 1    |
| Blog homepage mobile           | Landing mobile showcase      | —                     | 1    |
| Blog post single (light)       | Landing + docs               | What is Grove article | 1    |
| Flow Editor Zen (midnight)     | What is Flow                 | Flow advanced guide   | 2    |
| Flow Editor split view (dark)  | What is Flow                 | Dark mode docs        | 2    |
| Blog 4 seasons                 | Vision/philosophy page       | Seasonal guide        | 2    |
| Blog dark/midnight             | Landing + docs               | Dark mode guide       | 2    |
| Gallery grid                   | What is Gallery article      | —                     | 2    |
| Gallery lightbox               | What is Gallery showcase     | —                     | 2    |
| Gallery mobile                 | What is Gallery mobile guide | —                     | 2    |
| Arbor dashboard                | Landing "what you get"       | Admin docs            | 2    |
| Fireside chat mode             | Flow advanced guide          | —                     | 3    |
| Image upload                   | Adding media guide           | —                     | 3    |
| Arbor posts list               | Admin user guide             | —                     | 3    |
| Arbor settings                 | Setup guide                  | —                     | 3    |
| Shade indicator                | What is Shade article        | Privacy guide         | 3    |
| Onboarding name                | Getting started guide        | —                     | 3    |
| Onboarding season              | Aesthetic guide              | —                     | 3    |
| OG image default               | Meta tags (auto)             | Social sharing        | 4    |
| OG images seasonal             | Meta tags (dynamic)          | Social sharing        | 4    |
| Quote cards (5x)               | Social media posts           | Marketing materials   | 4    |
| Feature graphics               | Social promotions            | Email campaigns       | 4    |
| Video stills                   | Email + social               | Marketing             | 4    |

---

## Progress Tracker

Keep this updated as you capture. It's easier to spot what's missing when you mark what's done.

### Tier 1 (Launch Day — Feb 14)

- [ ] Flow Editor split view (light)
- [ ] Flow Editor write mode
- [ ] Flow Editor mobile
- [ ] Blog homepage (light)
- [ ] Blog homepage mobile
- [ ] Blog post single

**Status: \_\_\_/6 complete**

### Tier 2 (First Week)

- [ ] Flow Editor Zen (midnight)
- [ ] Flow Editor dark split
- [ ] Blog 4 seasons (spring, summer, autumn, winter)
- [ ] Blog dark/midnight
- [ ] Gallery grid
- [ ] Gallery lightbox
- [ ] Gallery mobile
- [ ] Arbor dashboard

**Status: \_\_\_/8 complete**

### Tier 3 (Post-Launch)

- [ ] Fireside chat mode
- [ ] Image upload
- [ ] Arbor posts list
- [ ] Arbor settings
- [ ] Shade indicator
- [ ] Onboarding name
- [ ] Onboarding season

**Status: \_\_\_/7 complete**

### Tier 4 (Generated Assets)

- [ ] OG image default
- [ ] OG images seasonal (4x)
- [ ] Quote cards (5x)
- [ ] Feature graphics
- [ ] Video stills

**Status: \_\_\_/13 complete**

---

## Notes for Future You

- Don't stress if Tier 1 takes longer than expected—capturing beautiful screenshots is an art. Give yourself grace.
- These images are what welcome people to Grove. They should feel genuine, not polished beyond recognition. A real blog post with real words is better than a perfect mockup.
- If something changes after you capture it (a design tweak, a component update), just recapture. Version control is for the screenshots too.
- Have fun with this. You're showing the world what you built. That's beautiful.

---

_Last updated: February 6, 2026_
