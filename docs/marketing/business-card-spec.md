# Grove Business Card Specification

*Created: January 2026*

---

## Overview

Two-sided business card for Grove. Minimal, warm, and functional. Two QR codes — one to explore, one to act.

---

## Card Dimensions

| Spec | Value |
|------|-------|
| **Size** | 3.5" × 2" (standard US business card) |
| **Orientation** | Horizontal (landscape) |
| **Paper** | Matte or soft-touch finish recommended |
| **Corners** | Rounded (2mm radius) optional |

---

## Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| **Grove Green** | `#16a34a` | Logo foliage, accents |
| **Bark Brown** | `#78350f` | Logo trunk |
| **Cream** | `#fefdfb` | Background (light version) |
| **Charcoal** | `#1e293b` | Background (dark version) |
| **Text Dark** | `#374151` | Body text on light bg |
| **Text Light** | `#f8fafc` | Body text on dark bg |

---

## Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| **"Grove"** | Lexend or serif fallback | Medium | 18pt |
| **Tagline** | Lexend | Regular, italic | 10pt |
| **Body text** | Lexend | Regular | 8pt |
| **URL** | Lexend | Medium | 9pt |
| **Signature** | Lexend | Regular, italic | 7pt |

---

## Front Side (Discovery)

**Purpose:** Introduce Grove. QR leads to main site.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   [LOGO]              Grove                              [QR]   │
│    32px                                                  0.7"    │
│                                                                  │
│                    A place to Be.                                │
│                                                                  │
│                     grove.place                                  │
│                                                                  │
│                                              — Autumn Brown      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Front Elements

| Element | Position | Details |
|---------|----------|---------|
| **Logo** | Left, vertically centered | Grove tree logo, 32px, seasonal (autumn recommended) |
| **"Grove"** | Center-left of logo | Serif, 18pt, main text color |
| **Tagline** | Center | "A place to Be." — italic, 10pt |
| **URL** | Center, below tagline | grove.place — 9pt, medium weight |
| **Signature** | Bottom right | "— Autumn Brown" — 7pt, italic, subtle |
| **QR Code** | Right, vertically centered | ~0.7" square, links to `https://grove.place` |

### QR Code (Front)

- **URL:** `https://grove.place`
- **Size:** 0.7" × 0.7" (minimum for reliable scanning)
- **Style:** Standard black on white, or grove green on cream
- **Error correction:** Level M or higher

---

## Back Side (Action)

**Purpose:** The pitch. QR leads to /hello page (then to plant.grove.place).

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   [LOGO]       Your words are yours.                     [QR]   │
│    24px                                                  0.7"    │
│                                                                  │
│              No ads. No algorithms.                              │
│                  No AI training.                                 │
│                                                                  │
│                 grove.place/hello                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Back Elements

| Element | Position | Details |
|---------|----------|---------|
| **Logo** | Left, vertically centered | Grove tree logo, 24px (slightly smaller than front) |
| **Headline** | Center | "Your words are yours." — 11pt, medium weight |
| **Subtext** | Center, below headline | "No ads. No algorithms. / No AI training." — 8pt |
| **URL** | Center, below subtext | grove.place/hello — 9pt |
| **QR Code** | Right, vertically centered | ~0.7" square, links to `https://grove.place/hello` |

### QR Code (Back)

- **URL:** `https://grove.place/hello`
- **Size:** 0.7" × 0.7"
- **Style:** Match front side
- **Error correction:** Level M or higher

---

## Design Variants

### Light Version (Recommended)
- Background: Cream (`#fefdfb`)
- Text: Charcoal (`#374151`)
- Logo: Grove Green + Bark Brown
- QR: Black or Grove Green

### Dark Version
- Background: Charcoal (`#1e293b`)
- Text: Off-white (`#f8fafc`)
- Logo: Grove Green + lighter bark
- QR: White

---

## Logo Assets

The Grove logo is an SVG with two parts:
- **Foliage:** Four-pointed arrow/compass shape (seasonal color)
- **Trunk:** Rectangular base (bark brown)

For business cards, use the **autumn** seasonal variant (orange: `#ea580c`) or **summer** variant (grove green: `#16a34a`).

Logo files location: `landing/src/lib/components/Logo.svelte`

Export as:
- SVG (vector, preferred)
- PNG at 300dpi (for print)
- Sizes needed: 32px, 24px height (scaled proportionally)

---

## QR Code Generation

Generate QR codes with:
- **Format:** SVG or high-res PNG (300dpi minimum)
- **Error correction:** Level M (15% damage tolerance)
- **Quiet zone:** Maintain standard white border
- **Color:** Can be customized to grove green, but ensure contrast

### Recommended Tools
- qr-code-generator.com
- goqr.me
- Any tool that exports SVG

### Test Before Print
Always test QR codes on multiple phones before finalizing print files.

---

## Print Specifications

### For Print Shop

```
Bleed: 0.125" on all sides
Safe zone: Keep text 0.125" from trim edge
Resolution: 300dpi minimum for all raster elements
Color mode: CMYK
File format: PDF/X-1a or high-res PDF
```

### Recommended Printers
- Moo.com (premium quality)
- Vistaprint (budget-friendly)
- Local print shop (support local!)

### Quantity Suggestion
Start with 250-500 cards. They're cheap and you'll want to iterate.

---

## Accessibility Notes

- QR codes should be large enough to scan easily (0.7" minimum)
- Text should have sufficient contrast (WCAG AA minimum)
- Include the URL text below QR codes for those who can't scan
- Avoid putting critical info only in small text

---

## File Checklist

Before sending to print:

- [ ] Both QR codes tested and working
- [ ] grove.place/hello page is live
- [ ] Logo exports at correct sizes
- [ ] Text proofread
- [ ] Colors converted to CMYK
- [ ] Bleed area included
- [ ] PDF generated at 300dpi

---

## The Vibe

This card should feel like Grove itself:
- **Quiet, not loud** — minimal text, lots of breathing room
- **Warm, not corporate** — the signature makes it personal
- **Functional** — two clear paths: explore or act
- **Honest** — no buzzwords, just what Grove actually is

When someone receives this card, it should feel like an invitation to a calm corner of the internet, not a sales pitch.

---

*A place to Be.*
