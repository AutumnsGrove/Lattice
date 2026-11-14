---
title: Business Card Specification
description: Print-ready design spec for the Grove business card deck
category: marketing
lastUpdated: "2026-11-14"
---

# Grove Business Card Specification

_Created: January 2026 · Redesigned: November 2026 (the midnight deck, #1622)_

---

## Overview

One two-sided card, in five seasonal colourways. The layout never changes; only the colours do, so the deck can be handed out in stages and people can end up with different ones.

It is a dark card, and it is quiet on purpose. The Grove tree is the only light source: it glows like a lantern on a ground tinted toward the season. Each side says three things, no more.

- **Front:** design only. No QR code.
- **Back:** the one QR code, in a clearing where the vines thin out.

Midnight (the queer fifth season) is the lead card.

---

## Card Dimensions

| Spec              | Value                                                 |
| ----------------- | ----------------------------------------------------- |
| **Trim size**     | 3.5" × 2" (standard US business card), landscape      |
| **Canvas**        | 3.75" × 2.25" with 0.125" bleed on every side         |
| **Pixels**        | 1125 × 675 at 300ppi                                  |
| **Safe zone**     | Keep content 0.125" inside the trim (0.25" from the canvas edge) |
| **Paper**         | Matte or soft-touch finish recommended                |
| **Corners**       | Square cut. The QR tile is the only rounded shape     |

Backgrounds (vines, glow) run into the bleed on purpose. Everything deliberate (text, the tree, the QR tile) stays inside the safe zone, and the generator refuses to render a card if any of it doesn't.

---

## The Deck

| Season       | Ground          | Glow             | Accent    | Files                     |
| ------------ | --------------- | ---------------- | --------- | ------------------------- |
| **midnight** | violet-black    | violet and pink  | pink      | `card-*-midnight-dark`    |
| **autumn**   | warm brown-black | ember, orange   | amber     | `card-*-autumn-dark`      |
| **summer**   | deep forest     | green            | mint      | `card-*-summer-dark`      |
| **spring**   | plum-black      | rose             | blush     | `card-*-spring-dark`      |
| **winter**   | ink blue        | ice blue         | pale blue | `card-*-winter-dark`      |

Every season follows one recipe: a ground tinted toward the season's hue (never pure black), a glow in its brightest tones, and tree shades lifted off the logo's own dark halves so the tree keeps its edge against the glow. The logo's own dark shades were made for lighter backgrounds; on these cards they dissolve into the glow.

The exact values live in one place, `PALETTES` in `scripts/generate/generate-business-cards.mjs`. This document describes them but does not copy them, so there is only one set of numbers to keep right.

---

## Copy

Short on purpose. Every line earns its place.

**Front**

| Line                          | Voice                       |
| ----------------------------- | --------------------------- |
| Grove                         | Wordmark                    |
| A place to Be.                | Tagline, accent colour      |
| A blogging home for writers.  | Says what Grove is, muted   |
| Autumn Brown · Wayfinder      | Bottom right, muted         |

**Back**

| Line                    | Voice                                              |
| ----------------------- | -------------------------------------------------- |
| Your words are yours.   | Headline                                           |
| Start a blog at         | Small lead-in, muted                               |
| _you_.grove.place       | An italic "you" sits on a line: your own domain    |
| grove.place/hello       | Under the QR, for anyone who can't scan            |

The blank in the domain holds "you" rather than being left empty, so the card reads as yours, not as a template field.

---

## Layout

```
FRONT                                         BACK
┌────────────────────────────────────┐        ┌────────────────────────────────────┐
│                          ◢◣        │        │                                    │
│                         ◢◤◣  glow  │        │  Your words           ┌────────┐   │
│                        ◢◤◢◣        │        │  are yours.           │  ▓▓░▓  │   │
│                          ▌         │        │                       │  ░▓▓░  │   │
│  Grove                             │        │  Start a blog at      │  ▓░▓▓  │   │
│  A place to Be.                    │        │  ___you___.grove.place└────────┘   │
│  A blogging home for writers.      │        │                       grove.place/ │
│                  Autumn Brown ·... │        │                       hello        │
└────────────────────────────────────┘        └────────────────────────────────────┘
```

The tree sits up and to the right, the wordmark bottom left, the name bottom right under the tree. On the back the headline and domain sit on the left and the QR on the right.

---

## Typography

Two families, both Grove's own, both read from `libs/engine/static/fonts/`.

| Element                | Font      | Size  |
| ---------------------- | --------- | ----- |
| **"Grove"** wordmark   | Calistoga | 44pt  |
| **Back headline**      | Calistoga | 26pt  |
| **Tagline**            | Lexend    | 11pt  |
| **Domain line**        | Lexend    | 12pt  |
| **Descriptor**         | Lexend    | 7.5pt |
| **Name, URL, lead-in** | Lexend    | 6.5 to 7pt |

- **All text is converted to vector outlines** from the font files, never left as live text. The renderer cannot load project fonts on macOS and used to silently fall back to default serif and sans; outlines make that impossible and are the safest form for print.
- **Lexend and Calistoga ship no italic.** The "you" is the regular glyphs leaned 12° about the baseline.
- There is no kerning pass: the shaper this generator uses can't read these fonts' kerning tables. The spacing is the fonts' own advances.
- Cormorant and IBM Plex Mono, used by the earlier cards, are gone. Those renders were never actually using them.

---

## QR Code (back only)

| Spec                | Value                                                           |
| ------------------- | --------------------------------------------------------------- |
| **URL**             | `https://grove.place/hello?ref=card-back`                       |
| **Printed URL**     | grove.place/hello (no tracking parameter shown)                 |
| **Tile**            | 0.95" square, rounded, cream (`#fefdfb`)                        |
| **Modules**         | About 0.75" across, above the 0.7" scanning minimum             |
| **Ink**             | Dark violet (`#1a1030`) on cream, never inverted                |
| **Quiet zone**      | 4 modules, built into the tile                                  |
| **Error correction**| Level M                                                         |
| **The clearing**    | Vines are masked out around the tile so nothing touches the code |

Dark-on-light matters. A cream-on-dark code looks better on a dark card, but some phone scanners reject inverted codes, so the tile stays light.

> **Analytics:** `?ref=card-back` lets Vista count visits that came from the card (see `docs/specs/vista-spec.md`). An earlier plan put a second QR on the front (`?ref=card-front`) to compare the two sides. It was dropped to keep the front purely design. #1426 only needs to log `card-back`.

### Scan testing

The rendered back of every season was decoded in testing and returned the exact URL, down to about 2.3 pixels per module with mild blur, which is far smaller than a phone sees at arm's length. That is a software check, not a replacement for scanning a printed proof on real phones.

---

## Accessibility

All text clears WCAG AAA (7:1) against the base ground on every season. The lowest ratio across the deck is 8.3:1.

| Text                     | Lowest contrast |
| ------------------------ | --------------- |
| Cream (wordmark, headline, domain) | 18.6:1 |
| Muted (descriptor, name, URLs)     | 8.3:1  |
| Accent (tagline, "you")            | 9.0:1  |

The printed URL under the QR is there for anyone who can't scan.

---

## Print

### Files

`node scripts/generate/generate-business-cards.mjs all` renders the PNGs, and `node scripts/generate/generate-business-card-pdfs.mjs all` builds one PDF per season.

| Output                                              | What it is                                              |
| --------------------------------------------------- | ------------------------------------------------------- |
| `docs/internal/print-assets/business-cards/*.png`   | sRGB renders, 1125 × 675, for review                    |
| `…/business-cards/print/grove-card-<season>-dark-cmyk.pdf` | Page 1 front, page 2 back. CMYK, 300ppi, TrimBox set |

Each PDF page is the full 3.75" × 2.25" canvas (BleedBox), with the TrimBox at the 3.5" × 2" cut line. It is a CMYK PDF with trim and bleed boxes. It is **not** a certified PDF/X-1a; if a printer insists on X-1a, they or a preflight tool will need to produce it.

### Colour: expect a shift

Glowing violets and blues are outside what CMYK ink can reproduce, so the printed card will be duller than the screen. In a soft proof, midnight's near-black ground drifts toward charcoal and its bright violet tree tiers toward dusty lavender; the pink holds up best.

- The PDF builder converts through an ICC profile. By default that is macOS's **Generic CMYK**, a stand-in. It is conservative and will look duller than a real press profile.
- The printer converts again with their own profile. Ask them for it, then rebuild with `--icc=/path/to/their-profile.icc`.
- Some printers prefer RGB and convert on their side. Ask which they want before choosing.
- Order a single proof of midnight first. It is the card most affected.

### Finish

Soft-touch matte is the recommendation. Spot gloss or foil on the tree is worth asking about, since the glow is what the card is about. It only shows in print, so check what the printer offers.

### Quantity

Start small. The deck is five designs; check whether the printer offers mixed-design packs before ordering a run of one.

---

## File Checklist

Before sending to print:

- [x] Layout, copy and palettes settled for all five seasons
- [x] QR decodes on every back (software check)
- [x] QR URL carries `?ref=card-back`
- [x] Text outlined from Calistoga and Lexend, no font fallbacks
- [x] Safe zone enforced by the generator for every card
- [x] PDFs built: CMYK, 300ppi, bleed and trim boxes
- [ ] `grove.place/hello` is live and logs `ref` (#1426)
- [ ] Printer's ICC profile obtained and PDFs rebuilt with it
- [ ] Proof of midnight reviewed in person, colours accepted
- [ ] QR scanned from the printed proof on at least two phones
- [ ] Final design approved for a print run

---

## The Vibe

This card should feel like Grove itself:

- **Quiet, not loud:** three things per side, lots of dark to breathe in
- **Warm, not corporate:** a lantern in the dark, and a name that is yours
- **Honest:** it says what Grove is, a blogging home for writers, and stops

When someone is handed this card, it should feel like an invitation to a calm corner of the internet, not a sales pitch.

---

_A place to Be._
