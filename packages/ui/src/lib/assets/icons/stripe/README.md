# Grove Stripe Branding Assets

**Status:** Temporary branding for Stripe integration
**Created:** 2025-11-30
**Purpose:** Professional payment branding for Stripe dashboard and Grove payment UI

---

## Overview

This directory contains temporary branding assets for Grove's Stripe payment integration. The design features a simplified single-leaf icon that maintains Grove's warm, organic aesthetic while being optimized for scalability across various contexts.

### Design Concept: "The Growing Leaf"

- **Visual:** Single teardrop/leaf shape with gradient (grove-700 → grove-500)
- **Symbolism:** Growth, nurturing, subscription success
- **Style:** Simplified version of main Grove logo for better small-scale performance
- **Colors:** Grove green (#16a34a), bark brown (#3d2914)

---

## File Inventory

### Master SVG Files

- **`stripe-icon.svg`** (512x512) - Square icon with gradient leaf
- **`stripe-logo.svg`** (240x72) - Horizontal logo with wordmark
- **`stripe-logo-mono.svg`** (240x72) - Monochrome variant for emails

### PNG Exports

**Icons (8 sizes):**
- `exports/icon/stripe-icon-16.png` - Tiny (favicons)
- `exports/icon/stripe-icon-24.png` - Small UI elements
- `exports/icon/stripe-icon-32.png` - Standard small
- `exports/icon/stripe-icon-48.png` - Standard medium
- `exports/icon/stripe-icon-64.png` - Large UI
- `exports/icon/stripe-icon-128.png` - Extra large
- `exports/icon/stripe-icon-256.png` - Hero/showcase
- `exports/icon/stripe-icon-512.png` - Stripe dashboard upload

**Logos (4 sizes):**
- `exports/logo/stripe-logo-160x48.png` - Small headers, emails
- `exports/logo/stripe-logo-200x60.png` - Standard UI
- `exports/logo/stripe-logo-240x72.png` - Large headers
- `exports/logo/stripe-logo-480x144.png` - Retina/2x displays

---

## Usage Guidelines

### When to Use Icon vs Logo

**Use Icon (Square) For:**
- ✅ Stripe dashboard business profile icon
- ✅ Favicons and browser tabs
- ✅ Small UI elements (24-48px)
- ✅ Payment confirmation emails (small logo spot)
- ✅ Mobile app icons

**Use Logo (Horizontal) For:**
- ✅ Payment form headers
- ✅ Email banners and letterhead
- ✅ Invoice headers
- ✅ Billing portal branding
- ✅ Desktop payment screens

### Size Recommendations

**Icon:**
- **16px-24px:** Favicons, tiny UI (solid color works best)
- **32px-48px:** Small UI elements, payment badges
- **64px-128px:** Standard app icons, larger UI
- **256px-512px:** Stripe dashboard upload, showcase

**Logo:**
- **160x48:** Email headers, small banners
- **200x60 or 240x72:** Most UI contexts
- **480x144:** Retina displays, large screens

### Color Variants

**Full Color (Default):**
- Use `stripe-icon.svg` or `stripe-logo.svg`
- Best for digital contexts with color support
- Gradient provides visual richness

**Monochrome:**
- Use `stripe-logo-mono.svg`
- Email templates (better compatibility)
- Printing or grayscale contexts
- High-contrast needs

---

## Stripe Integration

### Dashboard Setup

1. **Settings > Branding**
   - Icon: Upload `exports/icon/stripe-icon-512.png`
   - Brand color: `#16a34a` (grove-600)
   - Accent color: `#15803d` (grove-700)

2. **Customer Emails**
   - Logo: Upload `exports/logo/stripe-logo-240x72.png`
   - Alternative: Use monochrome variant for better email client compatibility

3. **Invoices/Receipts**
   - Header: `exports/logo/stripe-logo-200x60.png`
   - Footer: `exports/icon/stripe-icon-48.png`

### Grove Website Integration

**Pricing Page** (`grove.place/pricing`):
- "Powered by Stripe" badge: `stripe-icon-24.png` + text
- Trust indicators section

**Checkout Flow:**
- Payment form header: `stripe-logo-240x72.png`
- Security badge: `stripe-icon-32.png`

**Billing Dashboard:**
- Payment method icons: `stripe-icon-24.png`
- Transaction headers: `stripe-logo-160x48.png`

**Email Templates** (via Resend):
- Receipts: `stripe-logo-mono.svg` (better email compatibility)
- Payment notifications: Include icon for recognition

---

## Design Specifications

### Colors (from Grove Design System)

- **Primary Green:** `#16a34a` (grove-600)
- **Gradient:** `#15803d` → `#16a34a` → `#22c55e`
- **Text/Stem:** `#3d2914` (bark)

### Typography (Logo Wordmark)

- **Font:** Georgia, Cambria, Times New Roman (serif)
- **Weight:** 600 (semibold)
- **Letter Spacing:** -0.02em (tight)

### Geometry

**Icon (512x512):**
- Leaf: Simplified teardrop, ~400px height
- Stem: 8px stroke, rounded cap, 106px length
- Vitality circle: 6px radius at stem base

**Logo (240x72):**
- Icon: 60x60 scaled version
- Text: 32px Georgia, baseline y=46
- Spacing: 12px gap between icon and text

---

## Regenerating Assets

If you need to regenerate PNG exports from SVG masters:

```bash
cd /Users/mini/Documents/Projects/GroveEngine/packages/ui/src/lib/assets/icons/stripe

# Icon sizes
for size in 16 24 32 48 64 128 256 512; do
  sips -s format png stripe-icon.svg --out exports/icon/stripe-icon-${size}.png -Z ${size}
done

# Logo sizes
sips -s format png stripe-logo.svg --out exports/logo/stripe-logo-160x48.png -z 48 160
sips -s format png stripe-logo.svg --out exports/logo/stripe-logo-200x60.png -z 60 200
sips -s format png stripe-logo.svg --out exports/logo/stripe-logo-240x72.png -z 72 240
sips -s format png stripe-logo.svg --out exports/logo/stripe-logo-480x144.png -z 144 480
```

---

## Future Replacement

These are **temporary assets**. When permanent Stripe branding is designed:

### Replacement Checklist

1. **Create new assets** in this same directory structure
2. **Maintain file names** (stripe-icon.svg, stripe-logo.svg, etc.)
3. **Regenerate PNGs** using the script above
4. **Update Stripe dashboard**:
   - Re-upload icon (512px)
   - Re-upload logo (240x72 or larger)
5. **Test email rendering** with new assets
6. **Archive temporary assets**:
   ```bash
   mkdir stripe/archive-YYYY-MM-DD
   mv stripe-*.svg archive-YYYY-MM-DD/
   ```
7. **Update this README** with new design notes

---

## Design Rationale

**Why a simplified leaf?**
- Main Grove logo (3-layer teardrop) is complex for small sizes
- Single leaf maintains brand identity while scaling better
- Stripe contexts require clarity at 16px-48px

**Why keep the stem?**
- Provides grounding and connection to growth metaphor
- Adds detail without cluttering at small sizes
- Distinguishes from generic leaf icons

**Why gradient?**
- Visual richness at larger sizes (64px+)
- Matches main Grove logo aesthetic
- Monochrome variant available for compatibility

**Why Georgia serif for wordmark?**
- Consistent with Grove's typography system
- Literary, warm feel (not cold/corporate)
- High readability at small sizes

---

## Technical Notes

- **SVG viewBox:** Designed for crisp scaling
- **PNG format:** Better email client support than SVG
- **Transparent backgrounds:** All PNGs have transparency
- **Color space:** sRGB for web consistency
- **Gradient fallback:** Monochrome variant for email/print

---

## Questions?

For questions about these assets or permanent branding:
- See `/packages/ui/docs/BRAND-GUIDELINES.md` for full Grove design system
- Reference `/packages/ui/src/lib/tokens/` for design tokens (colors, typography, effects)

---

*Last updated: 2025-11-30*
*Temporary branding - replace when permanent Stripe assets are ready*
