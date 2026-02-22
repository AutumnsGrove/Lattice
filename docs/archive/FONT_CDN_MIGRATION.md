# Font CDN Migration Instructions

> **Status:** COMPLETED (2025-12-21) - All fonts now served from cdn.grove.place
>
> **Note:** Local font files in `libs/engine/static/fonts/` are intentionally kept as a backup. Do not delete them.

## Overview

This document provides instructions for migrating font files from local static serving to the Grove CDN (`https://cdn.grove.place`). This migration will reduce bundle size and improve cold start times.

## Current State

Fonts are currently stored in:

- `libs/engine/static/fonts/` (engine package)
- `landing/static/fonts/` (landing site)

Font-face declarations in `libs/engine/src/routes/+layout.svelte` are configured to load from CDN but will need the fonts uploaded first.

## Step 1: Upload Fonts to R2

### Using Wrangler CLI

```bash
# Navigate to the project root
cd /path/to/Lattice

# Upload each font file to R2 bucket
# Replace 'grove-cdn' with your R2 bucket name

# From libs/engine/static/fonts/
wrangler r2 object put grove-cdn/fonts/alagard.ttf --file libs/engine/static/fonts/alagard.ttf
wrangler r2 object put grove-cdn/fonts/AtkinsonHyperlegible-Regular.ttf --file libs/engine/static/fonts/AtkinsonHyperlegible-Regular.ttf
wrangler r2 object put grove-cdn/fonts/BodoniModa-Regular.ttf --file libs/engine/static/fonts/BodoniModa-Regular.ttf
wrangler r2 object put grove-cdn/fonts/Calistoga-Regular.ttf --file libs/engine/static/fonts/Calistoga-Regular.ttf
wrangler r2 object put grove-cdn/fonts/Caveat-Regular.ttf --file libs/engine/static/fonts/Caveat-Regular.ttf
wrangler r2 object put grove-cdn/fonts/Cormorant-Regular.ttf --file libs/engine/static/fonts/Cormorant-Regular.ttf
wrangler r2 object put grove-cdn/fonts/CozetteVector.ttf --file libs/engine/static/fonts/CozetteVector.ttf
wrangler r2 object put grove-cdn/fonts/EBGaramond-Regular.ttf --file libs/engine/static/fonts/EBGaramond-Regular.ttf
wrangler r2 object put grove-cdn/fonts/Fraunces-Regular.ttf --file libs/engine/static/fonts/Fraunces-Regular.ttf
wrangler r2 object put grove-cdn/fonts/IBMPlexMono-Regular.ttf --file libs/engine/static/fonts/IBMPlexMono-Regular.ttf
wrangler r2 object put grove-cdn/fonts/InstrumentSans-Regular.ttf --file libs/engine/static/fonts/InstrumentSans-Regular.ttf
wrangler r2 object put grove-cdn/fonts/Lexend-Regular.ttf --file libs/engine/static/fonts/Lexend-Regular.ttf
wrangler r2 object put grove-cdn/fonts/Lora-Regular.ttf --file libs/engine/static/fonts/Lora-Regular.ttf
wrangler r2 object put grove-cdn/fonts/Luciole-Regular.ttf --file libs/engine/static/fonts/Luciole-Regular.ttf
wrangler r2 object put grove-cdn/fonts/Manrope-Regular.ttf --file libs/engine/static/fonts/Manrope-Regular.ttf
wrangler r2 object put grove-cdn/fonts/Merriweather-Regular.ttf --file libs/engine/static/fonts/Merriweather-Regular.ttf
wrangler r2 object put grove-cdn/fonts/Nunito-Regular.ttf --file libs/engine/static/fonts/Nunito-Regular.ttf
wrangler r2 object put grove-cdn/fonts/OpenDyslexic-Regular.otf --file libs/engine/static/fonts/OpenDyslexic-Regular.otf
wrangler r2 object put grove-cdn/fonts/PlusJakartaSans-Regular.ttf --file libs/engine/static/fonts/PlusJakartaSans-Regular.ttf
wrangler r2 object put grove-cdn/fonts/Quicksand-Regular.ttf --file libs/engine/static/fonts/Quicksand-Regular.ttf
```

### Batch Upload Script

Create and run this script for batch upload:

```bash
#!/bin/bash
# upload-fonts-to-r2.sh

BUCKET="grove-cdn"
FONTS_DIR="libs/engine/static/fonts"

for font in "$FONTS_DIR"/*; do
  filename=$(basename "$font")
  echo "Uploading $filename..."
  wrangler r2 object put "$BUCKET/fonts/$filename" --file "$font"
done

echo "Done! All fonts uploaded to R2."
```

## Step 2: Configure R2 Public Access

Ensure your R2 bucket is configured with:

1. Public access enabled OR
2. Custom domain `cdn.grove.place` pointing to the bucket

### Cloudflare Dashboard Steps:

1. Go to R2 > Your Bucket > Settings
2. Enable "Public Access" or configure custom domain
3. Verify fonts are accessible at `https://cdn.grove.place/fonts/Lexend-Regular.ttf`

## Step 3: Verify CDN Fonts Load Correctly

Test each font loads from the CDN:

```bash
# Test a few fonts
curl -I https://cdn.grove.place/fonts/Lexend-Regular.ttf
curl -I https://cdn.grove.place/fonts/alagard.ttf
curl -I https://cdn.grove.place/fonts/OpenDyslexic-Regular.otf
```

Expected: `HTTP/2 200` response with correct `Content-Type`

## Step 4: Remove Local Font Files

Once CDN is verified working:

```bash
# Remove font files from static directories
rm -rf libs/engine/static/fonts/*.ttf
rm -rf libs/engine/static/fonts/*.otf
rm -rf landing/static/fonts/*.ttf
rm -rf landing/static/fonts/*.otf
```

## Step 5: Update package.json (Optional)

Consider excluding fonts from the npm package in `libs/engine/package.json`:

```json
{
	"files": ["dist", "!dist/**/*.test.*"]
}
```

Remove `"static"` from files array if fonts are the only static assets.

## Font File Inventory

| Font Name             | Filename                         | Format   |
| --------------------- | -------------------------------- | -------- |
| Alagard               | alagard.ttf                      | TrueType |
| Atkinson Hyperlegible | AtkinsonHyperlegible-Regular.ttf | TrueType |
| Bodoni Moda           | BodoniModa-Regular.ttf           | TrueType |
| Calistoga             | Calistoga-Regular.ttf            | TrueType |
| Caveat                | Caveat-Regular.ttf               | TrueType |
| Cormorant             | Cormorant-Regular.ttf            | TrueType |
| Cozette               | CozetteVector.ttf                | TrueType |
| EB Garamond           | EBGaramond-Regular.ttf           | TrueType |
| Fraunces              | Fraunces-Regular.ttf             | TrueType |
| IBM Plex Mono         | IBMPlexMono-Regular.ttf          | TrueType |
| Instrument Sans       | InstrumentSans-Regular.ttf       | TrueType |
| Lexend                | Lexend-Regular.ttf               | TrueType |
| Lora                  | Lora-Regular.ttf                 | TrueType |
| Luciole               | Luciole-Regular.ttf              | TrueType |
| Manrope               | Manrope-Regular.ttf              | TrueType |
| Merriweather          | Merriweather-Regular.ttf         | TrueType |
| Nunito                | Nunito-Regular.ttf               | TrueType |
| OpenDyslexic          | OpenDyslexic-Regular.otf         | OpenType |
| Plus Jakarta Sans     | PlusJakartaSans-Regular.ttf      | TrueType |
| Quicksand             | Quicksand-Regular.ttf            | TrueType |

## Rollback

If issues occur, revert font-face declarations to use local paths:

```css
/* Change FROM */
src: url("https://cdn.grove.place/fonts/Lexend-Regular.ttf") format("truetype");

/* Change TO */
src: url("/fonts/Lexend-Regular.ttf") format("truetype");
```

---

_Last updated: 2025-12-20_
