#!/usr/bin/env node
/**
 * Generate Logo PNGs for Email Assets
 *
 * Creates PNG versions of the Grove tree logo for all 5 seasons
 * at 16px, 24px, and 32px sizes for email compatibility.
 *
 * Usage: node scripts/generate-logo-pngs.mjs
 */

import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "../docs/internal/email-assets");
const LANDING_STATIC_DIR = join(__dirname, "../landing/static");

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
// SVG PATHS (from Logo.svelte)
// ─────────────────────────────────────────────────────────────────────────────

const PATHS = {
  tier1Dark: "M50 5 L18 32 L50 18 Z",
  tier1Light: "M50 5 L50 18 L82 32 Z",
  tier2Dark: "M50 20 L12 50 L50 35 Z",
  tier2Light: "M50 20 L50 35 L88 50 Z",
  tier3Dark: "M50 38 L18 68 L50 54 Z",
  tier3Light: "M50 38 L50 54 L82 68 Z",
  trunkDark: "M50 54 L42 58 L46 92 L50 92 Z",
  trunkLight: "M50 54 L58 58 L54 92 L50 92 Z",
};

const ROTATION = -12; // Windswept organic feel

// ─────────────────────────────────────────────────────────────────────────────
// SVG GENERATION
// ─────────────────────────────────────────────────────────────────────────────

function generateSvg(season) {
  const colors = SEASONAL_PALETTES[season];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <g transform="rotate(${ROTATION} 50 50)">
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
// PNG GENERATION
// ─────────────────────────────────────────────────────────────────────────────

const SIZES = [16, 24, 32, 512];
const SEASONS = ["spring", "summer", "autumn", "winter", "midnight"];

async function generatePng(season, size) {
  const svg = generateSvg(season);
  const svgBuffer = Buffer.from(svg);

  const pngBuffer = await sharp(svgBuffer).resize(size, size).png().toBuffer();

  const filename = `logo-${season}-${size}.png`;
  const filepath = join(OUTPUT_DIR, filename);

  await writeFile(filepath, pngBuffer);
  console.log(`  ✓ ${filename}`);
}

async function generateLandingIcons() {
  console.log("📱 Generating landing static icons...");

  // Use summer (default) palette for landing icons
  const svg = generateSvg("summer");
  const svgBuffer = Buffer.from(svg);

  // Generate icon-192.png
  const png192 = await sharp(svgBuffer).resize(192, 192).png().toBuffer();
  await writeFile(join(LANDING_STATIC_DIR, "icon-192.png"), png192);
  console.log("  ✓ icon-192.png");

  // Generate icon-512.png
  const png512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();
  await writeFile(join(LANDING_STATIC_DIR, "icon-512.png"), png512);
  console.log("  ✓ icon-512.png");

  console.log("");
}

async function main() {
  console.log("🌲 Generating Grove tree logo PNGs...\n");

  // Ensure output directories exist
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(LANDING_STATIC_DIR, { recursive: true });

  // Generate landing static icons (summer palette)
  await generateLandingIcons();

  // Generate seasonal email assets
  for (const season of SEASONS) {
    console.log(`${season}:`);
    for (const size of SIZES) {
      await generatePng(season, size);
    }
    console.log("");
  }

  console.log(
    `✅ Generated ${SEASONS.length * SIZES.length} email PNGs in ${OUTPUT_DIR}`,
  );
  console.log(`✅ Generated 2 landing icons in ${LANDING_STATIC_DIR}`);
}

main().catch(console.error);
