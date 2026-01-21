#!/usr/bin/env node
/**
 * Generate Logo PNGs for All Packages
 *
 * Creates PNG versions of the Grove tree logo:
 * - Favicon PNGs for all packages (32x32, 180x180, 192x192, 512x512)
 * - Seasonal variants for email assets
 * - Combined seasonal logos for marketing
 *
 * Usage: node scripts/generate/generate-logo-pngs.mjs
 */

import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "../..");
const OUTPUT_DIR = join(ROOT_DIR, "docs/internal/email-assets");

// All packages that need favicon assets
const PACKAGES = [
  "packages/landing",
  "packages/engine",
  "packages/clearing",
  "packages/plant",
  "packages/domains",
  "packages/meadow",
];

// ─────────────────────────────────────────────────────────────────────────────
// SEASONAL COLOR PALETTES (from Logo.svelte)
// ─────────────────────────────────────────────────────────────────────────────

const SEASONAL_PALETTES = {
  spring: {
    // Rose Gold — Cherry blossoms, hope, renewal
    tier1: { dark: "#be185d", light: "#fecdd3" },
    tier2: { dark: "#9d174d", light: "#fda4af" },
    tier3: { dark: "#831843", light: "#fb7185" },
    trunk: { dark: "#5a3f30", light: "#6f4d39" },
  },
  summer: {
    // Sunlit — Lush growth, warmth, vitality
    tier1: { dark: "#15803d", light: "#86efac" },
    tier2: { dark: "#166534", light: "#4ade80" },
    tier3: { dark: "#14532d", light: "#22c55e" },
    trunk: { dark: "#3d2914", light: "#5a3f30" },
  },
  autumn: {
    // Sunset — Harvest, reflection, warm embrace
    tier1: { dark: "#DC2626", light: "#FCD34D" },
    tier2: { dark: "#991B1B", light: "#F59E0B" },
    tier3: { dark: "#7C2D12", light: "#EA580C" },
    trunk: { dark: "#5C3317", light: "#8B4520" },
  },
  winter: {
    // Ice — Stillness, rest, crystalline beauty
    tier1: { dark: "#1e3a5f", light: "#bfdbfe" },
    tier2: { dark: "#1e3a5f", light: "#93c5fd" },
    tier3: { dark: "#0f172a", light: "#60a5fa" },
    trunk: { dark: "#1e293b", light: "#334155" },
  },
  midnight: {
    // Rose Bloom — The queer fifth season, purple twilight, magic
    tier1: { dark: "#4c1d95", light: "#fce7f3" },
    tier2: { dark: "#3b0764", light: "#f9a8d4" },
    tier3: { dark: "#1e1b4b", light: "#ec4899" },
    trunk: { dark: "#1a1a2e", light: "#2d1b4e" },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SVG PATHS (from Logo.svelte - trunk extends to y=100)
// ─────────────────────────────────────────────────────────────────────────────

const PATHS = {
  tier1Dark: "M50 5 L18 32 L50 18 Z",
  tier1Light: "M50 5 L50 18 L82 32 Z",
  tier2Dark: "M50 20 L12 50 L50 35 Z",
  tier2Light: "M50 20 L50 35 L88 50 Z",
  tier3Dark: "M50 38 L18 68 L50 54 Z",
  tier3Light: "M50 38 L50 54 L82 68 Z",
  trunkDark: "M50 54 L42 58 L46 100 L50 100 Z",
  trunkLight: "M50 54 L58 58 L54 100 L50 100 Z",
};

const ROTATION = -12; // Windswept organic feel

// ─────────────────────────────────────────────────────────────────────────────
// SVG GENERATION
// ─────────────────────────────────────────────────────────────────────────────

function generateSvg(season, { rotation = ROTATION } = {}) {
  const colors = SEASONAL_PALETTES[season];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <g transform="rotate(${rotation} 50 50)">
    <!-- Tier 1: Top branches -->
    <path fill="${colors.tier1.dark}" d="${PATHS.tier1Dark}" />
    <path fill="${colors.tier1.light}" d="${PATHS.tier1Light}" />

    <!-- Tier 2: Middle branches -->
    <path fill="${colors.tier2.dark}" d="${PATHS.tier2Dark}" />
    <path fill="${colors.tier2.light}" d="${PATHS.tier2Light}" />

    <!-- Tier 3: Bottom branches -->
    <path fill="${colors.tier3.dark}" d="${PATHS.tier3Dark}" />
    <path fill="${colors.tier3.light}" d="${PATHS.tier3Light}" />

    <!-- Trunk -->
    <path fill="${colors.trunk.dark}" d="${PATHS.trunkDark}" />
    <path fill="${colors.trunk.light}" d="${PATHS.trunkLight}" />
  </g>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PNG GENERATION FOR PACKAGES
// ─────────────────────────────────────────────────────────────────────────────

const FAVICON_SIZES = {
  "favicon-32x32.png": 32,
  "apple-touch-icon.png": 180,
  "icon-192.png": 192,
  "icon-512.png": 512,
};

const SEASONS = ["spring", "summer", "autumn", "winter", "midnight"];
const EMAIL_SIZES = [16, 24, 32, 512];

async function generatePackageFavicons() {
  console.log("📦 Generating favicon PNGs for all packages...\n");

  // Use summer (default) palette for all package favicons
  const svg = generateSvg("summer");
  const svgBuffer = Buffer.from(svg);

  for (const pkg of PACKAGES) {
    const staticDir = join(ROOT_DIR, pkg, "static");
    await mkdir(staticDir, { recursive: true });

    console.log(`  ${pkg}:`);

    for (const [filename, size] of Object.entries(FAVICON_SIZES)) {
      const pngBuffer = await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer();
      await writeFile(join(staticDir, filename), pngBuffer);
      console.log(`    ✓ ${filename} (${size}x${size})`);
    }
    console.log("");
  }
}

async function generateEmailAssets() {
  console.log("📧 Generating seasonal email assets...\n");

  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const season of SEASONS) {
    console.log(`  ${season}:`);
    const svg = generateSvg(season);
    const svgBuffer = Buffer.from(svg);

    for (const size of EMAIL_SIZES) {
      const pngBuffer = await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer();

      const filename = `logo-${season}-${size}.png`;
      await writeFile(join(OUTPUT_DIR, filename), pngBuffer);
      console.log(`    ✓ ${filename}`);
    }
    console.log("");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED SEASONAL LOGO GENERATION
// ─────────────────────────────────────────────────────────────────────────────

async function generateCombinedLogo(logoSize = 512, overlap = 0) {
  console.log("🎨 Generating combined seasonal logo...");

  // Generate SVG buffers for each season (upright, no windswept rotation)
  const logoBuffers = await Promise.all(
    SEASONS.map(async (season) => {
      const svg = generateSvg(season, { rotation: 0 });
      return sharp(Buffer.from(svg))
        .resize(logoSize, logoSize)
        .png()
        .toBuffer();
    }),
  );

  // Calculate canvas dimensions
  // With overlap: each subsequent logo overlaps by `overlap` pixels
  const effectiveWidth = logoSize - overlap;
  const canvasWidth = logoSize + effectiveWidth * (SEASONS.length - 1);
  const canvasHeight = logoSize;

  // Create composite inputs with positions
  const compositeInputs = logoBuffers.map((buffer, index) => ({
    input: buffer,
    left: index * effectiveWidth,
    top: 0,
  }));

  // Create transparent canvas and composite all logos
  const combinedBuffer = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(compositeInputs)
    .png()
    .toBuffer();

  // Save the combined logo
  const overlapSuffix = overlap > 0 ? `-overlap${overlap}` : "";
  const filename = `logo-seasons-combined-${logoSize}${overlapSuffix}.png`;
  const filepath = join(OUTPUT_DIR, filename);

  await writeFile(filepath, combinedBuffer);
  console.log(`  ✓ ${filename} (${canvasWidth}x${canvasHeight}px)`);

  return filepath;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED LOGO WITH GLASS CARD BACKGROUND
// ─────────────────────────────────────────────────────────────────────────────

async function generateCombinedLogoWithGlassCard(logoSize = 512, overlap = 0) {
  console.log("🪟 Generating combined seasonal logo with glass card...");

  // Generate SVG buffers for each season (upright, no windswept rotation)
  const logoBuffers = await Promise.all(
    SEASONS.map(async (season) => {
      const svg = generateSvg(season, { rotation: 0 });
      return sharp(Buffer.from(svg))
        .resize(logoSize, logoSize)
        .png()
        .toBuffer();
    }),
  );

  // Calculate canvas dimensions with padding for glass card
  const effectiveWidth = logoSize - overlap;
  const logosWidth = logoSize + effectiveWidth * (SEASONS.length - 1);
  const padding = Math.round(logoSize * 0.08); // 8% padding around logos
  const canvasWidth = logosWidth + padding * 2;
  const canvasHeight = logoSize + padding * 2;
  const borderRadius = Math.round(logoSize * 0.06); // 6% corner radius

  // Create the glass card SVG background
  const glassCardSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}">
  <defs>
    <!-- Subtle gradient for glass depth -->
    <linearGradient id="glassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgb(255,255,255);stop-opacity:0.25" />
      <stop offset="100%" style="stop-color:rgb(255,255,255);stop-opacity:0.12" />
    </linearGradient>
    <!-- Inner highlight for glass effect -->
    <linearGradient id="innerHighlight" x1="0%" y1="0%" x2="0%" y2="50%">
      <stop offset="0%" style="stop-color:rgb(255,255,255);stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:rgb(255,255,255);stop-opacity:0" />
    </linearGradient>
  </defs>
  <!-- Main glass card -->
  <rect x="1" y="1" width="${canvasWidth - 2}" height="${canvasHeight - 2}"
        rx="${borderRadius}" ry="${borderRadius}"
        fill="url(#glassGradient)"
        stroke="rgba(255,255,255,0.3)"
        stroke-width="1" />
  <!-- Inner highlight bar at top -->
  <rect x="2" y="2" width="${canvasWidth - 4}" height="${Math.round(canvasHeight * 0.4)}"
        rx="${borderRadius - 1}" ry="${borderRadius - 1}"
        fill="url(#innerHighlight)" />
</svg>`;

  const glassCardBuffer = await sharp(Buffer.from(glassCardSvg))
    .png()
    .toBuffer();

  // Create composite inputs: glass card first, then logos on top
  const compositeInputs = [
    { input: glassCardBuffer, left: 0, top: 0 },
    ...logoBuffers.map((buffer, index) => ({
      input: buffer,
      left: padding + index * effectiveWidth,
      top: padding,
    })),
  ];

  // Create transparent canvas and composite all layers
  const combinedBuffer = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(compositeInputs)
    .png()
    .toBuffer();

  // Save the combined logo with glass card
  const overlapSuffix = overlap > 0 ? `-overlap${overlap}` : "";
  const filename = `logo-seasons-combined-${logoSize}${overlapSuffix}-glass.png`;
  const filepath = join(OUTPUT_DIR, filename);

  await writeFile(filepath, combinedBuffer);
  console.log(`  ✓ ${filename} (${canvasWidth}x${canvasHeight}px)`);

  return filepath;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL MEDIA LOGOS (WITH DARK BACKGROUND)
// ─────────────────────────────────────────────────────────────────────────────

// Grove-themed dark background - forest at night
const DARK_BG_COLOR = "#0d1a12";
// Grove green with very light opacity for frosted glass effect
const GROVE_GREEN_RGB = "34, 197, 94";

const SOCIAL_SIZES = [512, 1024];

async function generateSocialLogos() {
  console.log("🌙 Generating social media logos with dark background...\n");

  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const season of SEASONS) {
    console.log(`  ${season}:`);
    const svg = generateSvg(season);
    const svgBuffer = Buffer.from(svg);

    for (const size of SOCIAL_SIZES) {
      // Calculate dimensions - logo centered in a circle with padding
      const padding = Math.round(size * 0.15); // 15% padding around logo
      const logoSize = size - padding * 2;
      const circleRadius = Math.round(size * 0.42); // Circle slightly smaller than canvas
      const centerX = size / 2;
      const centerY = size / 2;

      // Create the background with frosted grove-green circle
      const backgroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <!-- Radial gradient for the frosted circle - grove green, very subtle -->
    <radialGradient id="frostGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:rgba(${GROVE_GREEN_RGB}, 0.12)" />
      <stop offset="70%" style="stop-color:rgba(${GROVE_GREEN_RGB}, 0.08)" />
      <stop offset="100%" style="stop-color:rgba(${GROVE_GREEN_RGB}, 0.04)" />
    </radialGradient>
    <!-- Inner highlight for glass depth -->
    <radialGradient id="glassHighlight" cx="35%" cy="30%" r="50%">
      <stop offset="0%" style="stop-color:rgba(255, 255, 255, 0.08)" />
      <stop offset="100%" style="stop-color:rgba(255, 255, 255, 0)" />
    </radialGradient>
  </defs>
  <!-- Dark background -->
  <rect width="${size}" height="${size}" fill="${DARK_BG_COLOR}" />
  <!-- Frosted grove-green circle -->
  <circle cx="${centerX}" cy="${centerY}" r="${circleRadius}" fill="url(#frostGradient)" />
  <!-- Glass highlight overlay -->
  <circle cx="${centerX}" cy="${centerY}" r="${circleRadius}" fill="url(#glassHighlight)" />
  <!-- Subtle border -->
  <circle cx="${centerX}" cy="${centerY}" r="${circleRadius}"
          fill="none"
          stroke="rgba(${GROVE_GREEN_RGB}, 0.15)"
          stroke-width="1" />
</svg>`;

      const backgroundBuffer = await sharp(Buffer.from(backgroundSvg))
        .png()
        .toBuffer();

      // Resize the logo
      const logoBuffer = await sharp(svgBuffer)
        .resize(logoSize, logoSize)
        .png()
        .toBuffer();

      // Composite: background + logo centered
      const finalBuffer = await sharp(backgroundBuffer)
        .composite([
          {
            input: logoBuffer,
            left: padding,
            top: padding,
          },
        ])
        .png()
        .toBuffer();

      const filename = `logo-${season}-${size}-social.png`;
      await writeFile(join(OUTPUT_DIR, filename), finalBuffer);
      console.log(`    ✓ ${filename}`);
    }
    console.log("");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌲 Generating Grove tree logo PNGs...\n");

  // Generate favicon PNGs for all packages
  await generatePackageFavicons();

  // Generate seasonal email assets
  await generateEmailAssets();

  // Generate social media logos with dark background
  await generateSocialLogos();

  // Generate combined seasonal logos (upright trees, tightly packed)
  // Moderate overlap (55%) - trees close together
  await generateCombinedLogo(512, Math.round(512 * 0.55));
  // Tight overlap (65%) - cozy forest feel
  await generateCombinedLogo(512, Math.round(512 * 0.65));
  console.log("");

  // Generate combined seasonal logos with glass card background
  // Same overlap values but with glass card behind
  await generateCombinedLogoWithGlassCard(512, Math.round(512 * 0.55));
  await generateCombinedLogoWithGlassCard(512, Math.round(512 * 0.65));
  console.log("");

  // Summary
  const faviconCount = PACKAGES.length * Object.keys(FAVICON_SIZES).length;
  const emailCount = SEASONS.length * EMAIL_SIZES.length;
  const socialCount = SEASONS.length * SOCIAL_SIZES.length;
  console.log(`✅ Generated ${faviconCount} package favicon PNGs`);
  console.log(`✅ Generated ${emailCount} seasonal email PNGs`);
  console.log(`✅ Generated ${socialCount} social media PNGs (dark background)`);
  console.log(`✅ Generated 2 combined seasonal logos`);
  console.log(`✅ Generated 2 combined seasonal logos with glass card`);
}

main().catch(console.error);
