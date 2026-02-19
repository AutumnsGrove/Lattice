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

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT DIRECTORIES (organized structure)
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_ASSETS_DIR = join(ROOT_DIR, "docs/internal/email-assets");
const OUTPUT_DIRS = {
	// Individual tree logos
	logosSeasonalDir: join(EMAIL_ASSETS_DIR, "logos/seasonal"),
	logosSocialDir: join(EMAIL_ASSETS_DIR, "logos/social"),
	// Combined seasonal rows
	combinedTransparentDir: join(EMAIL_ASSETS_DIR, "combined/transparent"),
	combinedGlassCardDir: join(EMAIL_ASSETS_DIR, "combined/glass-card"),
	// Email signature dividers
	dividersSolidDir: join(EMAIL_ASSETS_DIR, "dividers/solid"),
	dividersGlassDir: join(EMAIL_ASSETS_DIR, "dividers/glass"),
};

// All packages that need favicon assets
const PACKAGES = [
	"apps/landing",
	"libs/engine",
	"apps/clearing",
	"apps/plant",
	"apps/domains",
	"apps/meadow",
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
// PNG GENERATION FOR PACKAGES (CIRCULAR WITH TRANSPARENT CORNERS)
// ─────────────────────────────────────────────────────────────────────────────

const FAVICON_SIZES = {
	"favicon-32x32.png": 32,
	"apple-touch-icon.png": 180,
	"icon-192.png": 192,
	"icon-512.png": 512,
};

const SEASONS = ["spring", "summer", "autumn", "winter", "midnight"];
const EMAIL_SIZES = [16, 24, 32, 512];

/**
 * Generate a circular background SVG with the Grove glassy style.
 * Returns SVG string with transparent corners.
 */
function generateCircularBackgroundSvg(size, season = "summer") {
	const colors = SEASONAL_PALETTES[season];
	const circleRadius = Math.round(size * 0.48);
	const centerX = size / 2;
	const centerY = size / 2;

	// Use the darkest tier color as base, create gradient toward center
	const darkColor = colors.tier3.dark;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <radialGradient id="circleGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#122a1a" />
      <stop offset="70%" style="stop-color:#0f2015" />
      <stop offset="100%" style="stop-color:#0d1a12" />
    </radialGradient>
    <radialGradient id="glassHighlight" cx="35%" cy="30%" r="50%">
      <stop offset="0%" style="stop-color:rgba(255, 255, 255, 0.06)" />
      <stop offset="100%" style="stop-color:rgba(255, 255, 255, 0)" />
    </radialGradient>
  </defs>
  <circle cx="${centerX}" cy="${centerY}" r="${circleRadius}" fill="url(#circleGradient)" />
  <circle cx="${centerX}" cy="${centerY}" r="${circleRadius}" fill="url(#glassHighlight)" />
  <circle cx="${centerX}" cy="${centerY}" r="${circleRadius}"
          fill="none"
          stroke="rgba(34, 197, 94, 0.12)"
          stroke-width="${Math.max(1, Math.round(size * 0.01))}" />
</svg>`;
}

async function generatePackageFavicons() {
	console.log("📦 Generating favicon PNGs for all packages (circular style)...\n");

	// Use summer (default) palette for all package favicons
	const season = "summer";

	for (const pkg of PACKAGES) {
		const staticDir = join(ROOT_DIR, pkg, "static");
		await mkdir(staticDir, { recursive: true });

		console.log(`  ${pkg}:`);

		for (const [filename, size] of Object.entries(FAVICON_SIZES)) {
			// Generate the tree logo SVG
			const logoSvg = generateSvg(season);
			const logoSvgBuffer = Buffer.from(logoSvg);

			// Calculate logo size with padding inside the circle
			const padding = Math.round(size * 0.15);
			const logoSize = size - padding * 2;

			// Generate circular background
			const bgSvg = generateCircularBackgroundSvg(size, season);
			const bgBuffer = await sharp(Buffer.from(bgSvg)).png().toBuffer();

			// Resize logo
			const logoBuffer = await sharp(logoSvgBuffer).resize(logoSize, logoSize).png().toBuffer();

			// Composite on transparent canvas
			const finalBuffer = await sharp({
				create: {
					width: size,
					height: size,
					channels: 4,
					background: { r: 0, g: 0, b: 0, alpha: 0 },
				},
			})
				.composite([
					{ input: bgBuffer, left: 0, top: 0 },
					{ input: logoBuffer, left: padding, top: padding },
				])
				.png()
				.toBuffer();

			await writeFile(join(staticDir, filename), finalBuffer);
			console.log(`    ✓ ${filename} (${size}x${size})`);
		}
		console.log("");
	}
}

async function generateEmailAssets() {
	console.log("📧 Generating seasonal email assets...\n");

	await mkdir(OUTPUT_DIRS.logosSeasonalDir, { recursive: true });

	for (const season of SEASONS) {
		console.log(`  ${season}:`);
		const svg = generateSvg(season);
		const svgBuffer = Buffer.from(svg);

		for (const size of EMAIL_SIZES) {
			const pngBuffer = await sharp(svgBuffer).resize(size, size).png().toBuffer();

			const filename = `logo-${season}-${size}.png`;
			await writeFile(join(OUTPUT_DIRS.logosSeasonalDir, filename), pngBuffer);
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

	await mkdir(OUTPUT_DIRS.combinedTransparentDir, { recursive: true });

	// Generate SVG buffers for each season (upright, no windswept rotation)
	const logoBuffers = await Promise.all(
		SEASONS.map(async (season) => {
			const svg = generateSvg(season, { rotation: 0 });
			return sharp(Buffer.from(svg)).resize(logoSize, logoSize).png().toBuffer();
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
	const filepath = join(OUTPUT_DIRS.combinedTransparentDir, filename);

	await writeFile(filepath, combinedBuffer);
	console.log(`  ✓ ${filename} (${canvasWidth}x${canvasHeight}px)`);

	return filepath;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED LOGO WITH GLASS CARD BACKGROUND
// ─────────────────────────────────────────────────────────────────────────────

async function generateCombinedLogoWithGlassCard(logoSize = 512, overlap = 0) {
	console.log("🪟 Generating combined seasonal logo with glass card...");

	await mkdir(OUTPUT_DIRS.combinedGlassCardDir, { recursive: true });

	// Generate SVG buffers for each season (upright, no windswept rotation)
	const logoBuffers = await Promise.all(
		SEASONS.map(async (season) => {
			const svg = generateSvg(season, { rotation: 0 });
			return sharp(Buffer.from(svg)).resize(logoSize, logoSize).png().toBuffer();
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

	const glassCardBuffer = await sharp(Buffer.from(glassCardSvg)).png().toBuffer();

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
	const filepath = join(OUTPUT_DIRS.combinedGlassCardDir, filename);

	await writeFile(filepath, combinedBuffer);
	console.log(`  ✓ ${filename} (${canvasWidth}x${canvasHeight}px)`);

	return filepath;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL MEDIA LOGOS (CIRCULAR WITH TRANSPARENT CORNERS)
// ─────────────────────────────────────────────────────────────────────────────

// Grove-themed dark background - forest at night (for the circle fill, not corners)
const DARK_BG_COLOR = "#0d1a12";
// Grove green with very light opacity for frosted glass effect
const GROVE_GREEN_RGB = "34, 197, 94";

const SOCIAL_SIZES = [512, 1024];

async function generateSocialLogos() {
	console.log("🌙 Generating social media logos (circular, transparent corners)...\n");

	await mkdir(OUTPUT_DIRS.logosSocialDir, { recursive: true });

	for (const season of SEASONS) {
		console.log(`  ${season}:`);
		const svg = generateSvg(season);
		const svgBuffer = Buffer.from(svg);

		for (const size of SOCIAL_SIZES) {
			// Calculate dimensions - logo centered in a circle with padding
			const padding = Math.round(size * 0.15); // 15% padding around logo
			const logoSize = size - padding * 2;
			const circleRadius = Math.round(size * 0.48); // Circle fills most of canvas
			const centerX = size / 2;
			const centerY = size / 2;

			// Create the circular background SVG - NO dark rectangle, just the circle
			// Corners will be transparent
			const backgroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <!-- Radial gradient for the circle - dark grove green, solid center fading to edges -->
    <radialGradient id="circleGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#122a1a" />
      <stop offset="70%" style="stop-color:#0f2015" />
      <stop offset="100%" style="stop-color:#0d1a12" />
    </radialGradient>
    <!-- Inner highlight for glass depth -->
    <radialGradient id="glassHighlight" cx="35%" cy="30%" r="50%">
      <stop offset="0%" style="stop-color:rgba(255, 255, 255, 0.06)" />
      <stop offset="100%" style="stop-color:rgba(255, 255, 255, 0)" />
    </radialGradient>
  </defs>
  <!-- Main circle with gradient fill - corners are transparent -->
  <circle cx="${centerX}" cy="${centerY}" r="${circleRadius}" fill="url(#circleGradient)" />
  <!-- Glass highlight overlay -->
  <circle cx="${centerX}" cy="${centerY}" r="${circleRadius}" fill="url(#glassHighlight)" />
  <!-- Subtle border -->
  <circle cx="${centerX}" cy="${centerY}" r="${circleRadius}"
          fill="none"
          stroke="rgba(${GROVE_GREEN_RGB}, 0.12)"
          stroke-width="1" />
</svg>`;

			const backgroundBuffer = await sharp(Buffer.from(backgroundSvg)).png().toBuffer();

			// Resize the logo
			const logoBuffer = await sharp(svgBuffer).resize(logoSize, logoSize).png().toBuffer();

			// Composite: circular background (transparent corners) + logo centered
			const finalBuffer = await sharp({
				create: {
					width: size,
					height: size,
					channels: 4,
					background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent canvas
				},
			})
				.composite([
					{ input: backgroundBuffer, left: 0, top: 0 },
					{ input: logoBuffer, left: padding, top: padding },
				])
				.png()
				.toBuffer();

			const filename = `logo-${season}-${size}-social.png`;
			await writeFile(join(OUTPUT_DIRS.logosSocialDir, filename), finalBuffer);
			console.log(`    ✓ ${filename}`);
		}
		console.log("");
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL SIGNATURE DIVIDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pill background color palettes for each season
 */
const PILL_PALETTES = {
	default: {
		start: "#152a1d",
		mid: "#0f2015",
		end: "#0d1a12",
		border: GROVE_GREEN_RGB,
	},
	spring: {
		start: "#2d1a24",
		mid: "#1f1219",
		end: "#180e14",
		border: "190, 24, 93", // pink
	},
	summer: {
		start: "#152a1d",
		mid: "#0f2015",
		end: "#0d1a12",
		border: GROVE_GREEN_RGB,
	},
	autumn: {
		start: "#2a1f15",
		mid: "#201510",
		end: "#18100c",
		border: "234, 88, 12", // orange
	},
	winter: {
		start: "#1a1f2a",
		mid: "#121620",
		end: "#0c1018",
		border: "96, 165, 250", // blue
	},
	midnight: {
		start: "#1f1a2a",
		mid: "#151020",
		end: "#100c18",
		border: "168, 85, 247", // purple
	},
};

/**
 * Generate a horizontal pill-shaped divider with alternating up/down trees
 * cycling through all 5 seasons twice (10 trees total).
 *
 * Pattern: spring↑ summer↓ autumn↑ winter↓ midnight↑ midnight↓ winter↑ autumn↓ summer↑ spring↓
 *
 * @param treeHeight - Base tree height for layout calculations
 * @param treeScale - Scale factor for tree size (1.0 = normal, 1.5 = 50% bigger trees)
 * @param pillSeason - Season for pill background color (default = dark green)
 */
async function generateEmailSignatureDivider(
	treeHeight = 256,
	treeScale = 1.0,
	pillSeason = "default",
) {
	const scaleLabel = treeScale === 1.0 ? "" : `-${Math.round(treeScale * 100)}pct`;
	const seasonLabel = pillSeason === "default" ? "" : `-${pillSeason}-bg`;
	const description = [
		scaleLabel ? `${Math.round(treeScale * 100)}% trees` : null,
		seasonLabel ? `${pillSeason} bg` : null,
	]
		.filter(Boolean)
		.join(", ");
	console.log(`✉️  Generating email signature divider${description ? ` (${description})` : ""}...`);

	await mkdir(OUTPUT_DIRS.dividersSolidDir, { recursive: true });

	const TREE_COUNT = 10;
	// Mirror pattern: forward then backward (midnights kiss in the middle!)
	const SEASON_ORDER = [
		"spring",
		"summer",
		"autumn",
		"winter",
		"midnight",
		"midnight",
		"winter",
		"autumn",
		"summer",
		"spring",
	];

	// Calculate dimensions (layout based on base treeHeight)
	const treeWidth = treeHeight; // Base tree slot is square
	const treeOverlap = Math.round(treeHeight * 0.15); // 15% overlap (negative spacing)
	const horizontalPadding = Math.round(treeHeight * 0.4); // Padding on left/right
	const verticalPadding = Math.round(treeHeight * 0.25); // Padding top/bottom

	const effectiveTreeWidth = treeWidth - treeOverlap;
	const totalTreesWidth = treeWidth + effectiveTreeWidth * (TREE_COUNT - 1);
	const canvasWidth = totalTreesWidth + horizontalPadding * 2;
	const canvasHeight = treeHeight + verticalPadding * 2;

	// Scaled tree dimensions (trees can be bigger than their slots)
	const scaledTreeSize = Math.round(treeHeight * treeScale);

	// Pill shape: rx/ry = half the height for semicircular ends
	const pillRadius = canvasHeight / 2;

	// Get pill colors from seasonal palette
	const pillColors = PILL_PALETTES[pillSeason] || PILL_PALETTES.default;

	// Create the pill-shaped glass background SVG
	const pillBackgroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}">
  <defs>
    <!-- Radial-ish gradient for glass depth -->
    <linearGradient id="pillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${pillColors.start}" />
      <stop offset="50%" style="stop-color:${pillColors.mid}" />
      <stop offset="100%" style="stop-color:${pillColors.end}" />
    </linearGradient>
    <!-- Inner highlight for glass effect -->
    <linearGradient id="pillHighlight" x1="0%" y1="0%" x2="0%" y2="40%">
      <stop offset="0%" style="stop-color:rgba(255, 255, 255, 0.08)" />
      <stop offset="100%" style="stop-color:rgba(255, 255, 255, 0)" />
    </linearGradient>
  </defs>
  <!-- Main pill shape -->
  <rect x="0" y="0" width="${canvasWidth}" height="${canvasHeight}"
        rx="${pillRadius}" ry="${pillRadius}"
        fill="url(#pillGradient)" />
  <!-- Glass highlight overlay -->
  <rect x="0" y="0" width="${canvasWidth}" height="${canvasHeight}"
        rx="${pillRadius}" ry="${pillRadius}"
        fill="url(#pillHighlight)" />
  <!-- Subtle border -->
  <rect x="0.5" y="0.5" width="${canvasWidth - 1}" height="${canvasHeight - 1}"
        rx="${pillRadius}" ry="${pillRadius}"
        fill="none"
        stroke="rgba(${pillColors.border}, 0.15)"
        stroke-width="1" />
</svg>`;

	const pillBuffer = await sharp(Buffer.from(pillBackgroundSvg)).png().toBuffer();

	// Generate tree buffers with alternating rotations
	// Straight up (0°) or upside down (180°) - no windswept rotation
	// Trees are scaled but positioned to stay centered in their original slots
	const treeBuffers = await Promise.all(
		SEASON_ORDER.map(async (season, index) => {
			// Even indices: straight up (0°), Odd indices: upside down (180°)
			const isUpsideDown = index % 2 === 1;
			const rotation = isUpsideDown ? 180 : 0;

			const svg = generateSvg(season, { rotation });
			return sharp(Buffer.from(svg)).resize(scaledTreeSize, scaledTreeSize).png().toBuffer();
		}),
	);

	// Calculate offset to center scaled trees in their original slots
	const scaleOffset = Math.round((scaledTreeSize - treeWidth) / 2);

	// Create composite inputs: pill background first, then trees positioned with overlap
	const compositeInputs = [
		{ input: pillBuffer, left: 0, top: 0 },
		...treeBuffers.map((buffer, index) => ({
			input: buffer,
			left: horizontalPadding + index * effectiveTreeWidth - scaleOffset,
			top: verticalPadding - scaleOffset,
		})),
	];

	// Create transparent canvas and composite all layers
	const finalBuffer = await sharp({
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

	// Save the divider
	const filename = `email-signature-divider-${treeHeight}${scaleLabel}${seasonLabel}.png`;
	const filepath = join(OUTPUT_DIRS.dividersSolidDir, filename);
	await writeFile(filepath, finalBuffer);
	console.log(`  ✓ ${filename} (${canvasWidth}x${canvasHeight}px)`);

	return filepath;
}

// ─────────────────────────────────────────────────────────────────────────────
// GLASS EMAIL SIGNATURE DIVIDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Glass variant configurations (matching GlassLogo.svelte)
 */
const GLASS_VARIANTS = {
	default: {
		name: "default",
		opacityDark: 0.75,
		opacityLight: 0.5,
		highlightOpacity: 0.4,
		glowOpacity: 0.35,
	},
	accent: {
		name: "accent",
		opacityDark: 0.85,
		opacityLight: 0.7,
		highlightOpacity: 0.3,
		glowOpacity: 0.5,
	},
	frosted: {
		name: "frosted",
		opacityDark: 0.85,
		opacityLight: 0.7,
		highlightOpacity: 0.5,
		glowOpacity: 0.2,
	},
	dark: {
		name: "dark",
		// Dark variant uses slate colors instead of seasonal
		useDarkColors: true,
		opacityDark: 0.7,
		opacityLight: 0.6,
		highlightOpacity: 0.2,
		glowOpacity: 0.2,
	},
	ethereal: {
		name: "ethereal",
		opacityDark: 0.4,
		opacityLight: 0.25,
		highlightOpacity: 0.35,
		glowOpacity: 0.5,
	},
};

/**
 * Convert hex color to RGB string (e.g., "#15803d" -> "21, 128, 61")
 */
function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) return "128, 128, 128";
	return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

/**
 * Generate a glass-styled tree SVG with gradients and highlights
 */
function generateGlassSvg(season, variant, { rotation = 0, uniqueId = "g" } = {}) {
	const colors = SEASONAL_PALETTES[season];
	const v = GLASS_VARIANTS[variant];

	// For dark variant, use slate colors
	const darkColor = v.useDarkColors ? "30, 41, 59" : hexToRgb(colors.tier1.dark);
	const lightColor = v.useDarkColors ? "15, 23, 42" : hexToRgb(colors.tier1.light);
	const glowColor = v.useDarkColors ? "100, 116, 139" : hexToRgb(colors.tier2.light);

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="${uniqueId}-foliage" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(${darkColor}, ${v.opacityDark})" />
      <stop offset="50%" stop-color="rgba(${lightColor}, ${v.opacityLight})" />
      <stop offset="100%" stop-color="rgba(${darkColor}, ${v.opacityDark})" />
    </linearGradient>
    <linearGradient id="${uniqueId}-highlight" x1="0%" y1="0%" x2="50%" y2="50%">
      <stop offset="0%" stop-color="rgba(255, 255, 255, 0.9)" />
      <stop offset="100%" stop-color="transparent" />
    </linearGradient>
    <linearGradient id="${uniqueId}-trunk" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(93, 64, 55, 0.7)" />
      <stop offset="100%" stop-color="rgba(93, 64, 55, 0.5)" />
    </linearGradient>
    <filter id="${uniqueId}-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
      <feFlood flood-color="rgba(${glowColor}, ${v.glowOpacity})" />
      <feComposite in2="blur" operator="in" />
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <g transform="rotate(${rotation} 50 50)">
    <!-- Trunk -->
    <path fill="url(#${uniqueId}-trunk)" d="${PATHS.trunkDark}" />
    <path fill="url(#${uniqueId}-trunk)" d="${PATHS.trunkLight}" />

    <!-- Foliage with glow -->
    <g filter="url(#${uniqueId}-glow)">
      <path fill="url(#${uniqueId}-foliage)" d="${PATHS.tier1Dark}" />
      <path fill="url(#${uniqueId}-foliage)" d="${PATHS.tier1Light}" opacity="0.85" />
      <path fill="url(#${uniqueId}-foliage)" d="${PATHS.tier2Dark}" />
      <path fill="url(#${uniqueId}-foliage)" d="${PATHS.tier2Light}" opacity="0.85" />
      <path fill="url(#${uniqueId}-foliage)" d="${PATHS.tier3Dark}" />
      <path fill="url(#${uniqueId}-foliage)" d="${PATHS.tier3Light}" opacity="0.85" />
    </g>

    <!-- Highlight overlay -->
    <g opacity="${v.highlightOpacity}">
      <path d="${PATHS.tier1Dark}" fill="url(#${uniqueId}-highlight)" />
      <path d="${PATHS.tier2Dark}" fill="url(#${uniqueId}-highlight)" />
      <path d="${PATHS.tier3Dark}" fill="url(#${uniqueId}-highlight)" />
    </g>
  </g>
</svg>`;
}

/**
 * Generate glass email signature dividers for all variants
 */
async function generateGlassEmailSignatureDividers(treeHeight = 256) {
	console.log("✨ Generating glass email signature dividers...\n");

	await mkdir(OUTPUT_DIRS.dividersGlassDir, { recursive: true });

	const TREE_COUNT = 10;
	const SEASON_ORDER = [
		"spring",
		"summer",
		"autumn",
		"winter",
		"midnight",
		"midnight",
		"winter",
		"autumn",
		"summer",
		"spring",
	];

	const treeWidth = treeHeight;
	const treeOverlap = Math.round(treeHeight * 0.15);
	const horizontalPadding = Math.round(treeHeight * 0.4);
	const verticalPadding = Math.round(treeHeight * 0.25);

	const effectiveTreeWidth = treeWidth - treeOverlap;
	const totalTreesWidth = treeWidth + effectiveTreeWidth * (TREE_COUNT - 1);
	const canvasWidth = totalTreesWidth + horizontalPadding * 2;
	const canvasHeight = treeHeight + verticalPadding * 2;
	const pillRadius = canvasHeight / 2;

	for (const [variantName, variant] of Object.entries(GLASS_VARIANTS)) {
		console.log(`  ${variantName}:`);

		// Pill background - slightly different tint per variant
		const pillBgColor = variant.useDarkColors ? "#1e293b" : "#0f2015";
		const pillMidColor = variant.useDarkColors ? "#0f172a" : "#0d1a12";
		const pillEndColor = variant.useDarkColors ? "#020617" : "#091209";

		const pillBackgroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}">
  <defs>
    <linearGradient id="pillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${pillBgColor}" />
      <stop offset="50%" style="stop-color:${pillMidColor}" />
      <stop offset="100%" style="stop-color:${pillEndColor}" />
    </linearGradient>
    <linearGradient id="pillHighlight" x1="0%" y1="0%" x2="0%" y2="40%">
      <stop offset="0%" style="stop-color:rgba(255, 255, 255, 0.1)" />
      <stop offset="100%" style="stop-color:rgba(255, 255, 255, 0)" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${canvasWidth}" height="${canvasHeight}"
        rx="${pillRadius}" ry="${pillRadius}"
        fill="url(#pillGradient)" />
  <rect x="0" y="0" width="${canvasWidth}" height="${canvasHeight}"
        rx="${pillRadius}" ry="${pillRadius}"
        fill="url(#pillHighlight)" />
  <rect x="0.5" y="0.5" width="${canvasWidth - 1}" height="${canvasHeight - 1}"
        rx="${pillRadius}" ry="${pillRadius}"
        fill="none"
        stroke="rgba(255, 255, 255, 0.1)"
        stroke-width="1" />
</svg>`;

		const pillBuffer = await sharp(Buffer.from(pillBackgroundSvg)).png().toBuffer();

		// Generate glass tree buffers
		const treeBuffers = await Promise.all(
			SEASON_ORDER.map(async (season, index) => {
				const isUpsideDown = index % 2 === 1;
				const rotation = isUpsideDown ? 180 : 0;
				const uniqueId = `g${index}`;
				const svg = generateGlassSvg(season, variantName, {
					rotation,
					uniqueId,
				});
				return sharp(Buffer.from(svg)).resize(treeWidth, treeHeight).png().toBuffer();
			}),
		);

		const compositeInputs = [
			{ input: pillBuffer, left: 0, top: 0 },
			...treeBuffers.map((buffer, index) => ({
				input: buffer,
				left: horizontalPadding + index * effectiveTreeWidth,
				top: verticalPadding,
			})),
		];

		const finalBuffer = await sharp({
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

		const filename = `email-signature-divider-${treeHeight}-glass-${variantName}.png`;
		await writeFile(join(OUTPUT_DIRS.dividersGlassDir, filename), finalBuffer);
		console.log(`    ✓ ${filename} (${canvasWidth}x${canvasHeight}px)`);
	}
	console.log("");
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

	// Generate email signature dividers (high-res at 256px tree height)
	// Standard size with default background
	await generateEmailSignatureDivider(256, 1.0, "default");
	// 125% bigger trees (sweet spot between dense and readable)
	await generateEmailSignatureDivider(256, 1.25, "default");
	// Seasonal background variants (125% trees)
	for (const season of SEASONS) {
		await generateEmailSignatureDivider(256, 1.25, season);
	}
	console.log("");

	// Generate glass email signature dividers (all 5 variants, high-res)
	await generateGlassEmailSignatureDividers();

	// Summary
	const faviconCount = PACKAGES.length * Object.keys(FAVICON_SIZES).length;
	const emailCount = SEASONS.length * EMAIL_SIZES.length;
	const socialCount = SEASONS.length * SOCIAL_SIZES.length;
	console.log(`\n📁 Output organized into: docs/internal/email-assets/`);
	console.log(`   ├── logos/seasonal/     (${emailCount} files)`);
	console.log(`   ├── logos/social/       (${socialCount} files)`);
	console.log(`   ├── combined/transparent/ (2 files)`);
	console.log(`   ├── combined/glass-card/  (2 files)`);
	console.log(`   ├── dividers/solid/     (7 files: default + 150% + 5 seasonal bgs)`);
	console.log(`   └── dividers/glass/     (5 files)`);
	console.log(`\n✅ Generated ${faviconCount} package favicon PNGs`);
	console.log(`✅ Generated ${emailCount + socialCount + 4 + 12} email assets (organized)`);
}

main().catch(console.error);
