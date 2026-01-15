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
| **Grove Green** | `#16a34a` | Accents, summer theme |
| **Autumn Orange** | `#EA580C` | Accents, autumn theme |
| **Bark Brown** | `#5C3317` | Logo trunk, autumn dark (see Logo Assets for full palette) |
| **Cream** | `#fefdfb` | Background (light version) |
| **Charcoal** | `#1e293b` | Background (dark version) |
| **Text Dark** | `#374151` | Body text on light bg |
| **Text Light** | `#f8fafc` | Body text on dark bg |

> **Note:** The logo uses multi-tone colors for 3D depth. See the Logo Assets section for the full seasonal color palettes.

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

- **URL:** `https://grove.place?ref=card-front` (includes tracking param)
- **Display URL:** grove.place (printed on card, no tracking param visible)
- **Size:** 0.7" × 0.7" (minimum for reliable scanning)
- **Style:** Standard black on white, or grove green on cream
- **Error correction:** Level M or higher

> **Analytics Note:** The `?ref=card-front` parameter enables Vista to track which side of the card drives traffic. See `docs/specs/vista-spec.md` for acquisition analytics.

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

- **URL:** `https://grove.place/hello?ref=card-back` (includes tracking param)
- **Display URL:** grove.place/hello (printed on card, no tracking param visible)
- **Size:** 0.7" × 0.7"
- **Style:** Match front side
- **Error correction:** Level M or higher

> **Analytics Note:** The `?ref=card-back` parameter tracks this specific call-to-action. Combined with front tracking, you can measure which card side converts better.

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

The Grove logo is a stylized tree SVG with 3D depth:
- **Branches:** Three tiers of paired triangular branches (six total), each pair split into dark/light halves for depth
- **Trunk:** Two-tone tapered trunk (dark left, light right)

### Seasonal Variants

| Season | Vibe | Recommended For |
|--------|------|-----------------|
| **summer** | Sunlit greens, lush vitality | Default, most versatile |
| **autumn** | Warm reds/golds, harvest warmth | Cozy, inviting feel |
| **spring** | Rose gold, cherry blossoms | Fresh, hopeful |
| **winter** | Cool blues, crystalline | Clean, minimal |
| **midnight** | Purple/pink twilight 🌙 | Queer fifth season, magic |

For business cards, **autumn** or **summer** are recommended for warmth and approachability.

### Color Reference (Autumn)

| Element | Dark | Light |
|---------|------|-------|
| Tier 1 (top) | `#DC2626` | `#FCD34D` |
| Tier 2 (middle) | `#991B1B` | `#F59E0B` |
| Tier 3 (bottom) | `#7C2D12` | `#EA580C` |
| Trunk | `#5C3317` | `#8B4520` |

### Color Reference (Summer)

| Element | Dark | Light |
|---------|------|-------|
| Tier 1 (top) | `#15803d` | `#86efac` |
| Tier 2 (middle) | `#166534` | `#4ade80` |
| Tier 3 (bottom) | `#14532d` | `#22c55e` |
| Trunk | `#3d2914` | `#5a3f30` |

### Color Reference (Spring)

| Element | Dark | Light |
|---------|------|-------|
| Tier 1 (top) | `#be185d` | `#fecdd3` |
| Tier 2 (middle) | `#9d174d` | `#fda4af` |
| Tier 3 (bottom) | `#831843` | `#fb7185` |
| Trunk | `#5a3f30` | `#6f4d39` |

### Color Reference (Winter)

| Element | Dark | Light |
|---------|------|-------|
| Tier 1 (top) | `#1e3a5f` | `#bfdbfe` |
| Tier 2 (middle) | `#1e3a5f` | `#93c5fd` |
| Tier 3 (bottom) | `#0f172a` | `#60a5fa` |
| Trunk | `#1e293b` | `#334155` |

### Color Reference (Midnight)

| Element | Dark | Light |
|---------|------|-------|
| Tier 1 (top) | `#4c1d95` | `#fce7f3` |
| Tier 2 (middle) | `#3b0764` | `#f9a8d4` |
| Tier 3 (bottom) | `#1e1b4b` | `#ec4899` |
| Trunk | `#1a1a2e` | `#2d1b4e` |

Logo source: `packages/engine/src/lib/ui/components/ui/Logo.svelte`

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
