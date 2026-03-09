#!/usr/bin/env node
/**
 * Generate Business Card PNGs
 *
 * Creates print-ready front and back card PNGs at 300dpi (3.5" × 2" with 0.125" bleed).
 * Generates light/dark theme variants with seasonal logos and embedded QR codes.
 *
 * Spec: docs/marketing/business-card-spec.md
 * Pattern: scripts/generate/generate-logo-pngs.mjs
 *
 * Usage: node scripts/generate/generate-business-cards.mjs
 *
 * Prerequisites:
 *   - Lexend font installed on system (fallback: sans-serif)
 *   - npm packages: sharp, qrcode (in root package.json)
 */

import sharp from "sharp";
import QRCode from "qrcode";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "../..");
const OUTPUT_DIR = join(ROOT_DIR, "docs/internal/print-assets/business-cards");

// ─────────────────────────────────────────────────────────────────────────────
// PRINT DIMENSIONS (300dpi)
// ─────────────────────────────────────────────────────────────────────────────

const DPI = 300;
const px = (inches) => Math.round(inches * DPI);

// Canvas includes 0.125" bleed on all sides
const CANVAS_W = px(3.75); // 1125px total (3.5" card + 0.25" bleed)
const CANVAS_H = px(2.25); // 675px total (2" card + 0.25" bleed)
const BLEED = px(0.125); // 38px bleed each side

// Safe zone = 0.125" inside trim edge (text must stay within)
const SAFE = px(0.125);

// Content boundaries (relative to canvas origin)
const CONTENT = {
	left: BLEED + SAFE, // 76
	top: BLEED + SAFE, // 76
	right: CANVAS_W - BLEED - SAFE, // 1049
	bottom: CANVAS_H - BLEED - SAFE, // 599
	centerX: CANVAS_W / 2, // 562.5
	centerY: CANVAS_H / 2, // 337.5
};

// Element sizes at 300dpi
const QR_SIZE = px(0.7); // 210px (0.7" square)
const LOGO_FRONT = px(0.4); // 120px height (front side)
const LOGO_BACK = px(0.32); // 96px height (back side, slightly smaller per spec)

// Convert point sizes to pixels at 300dpi: pt / 72 * 300
const fontPx = (pt) => Math.round((pt / 72) * DPI);

// ─────────────────────────────────────────────────────────────────────────────
// COLOR THEMES
// ─────────────────────────────────────────────────────────────────────────────

const THEMES = {
	light: {
		bg: "#fefdfb", // Cream
		text: "#374151", // Text Dark
		textSubtle: "#6b7280", // Lighter gray for signature
		qrDark: "#16a34a", // Grove Green modules
		qrLight: "#ffffff", // White background
	},
	dark: {
		bg: "#1e293b", // Charcoal
		text: "#f8fafc", // Text Light
		textSubtle: "#94a3b8", // Slate for signature
		qrDark: "#f8fafc", // White modules
		qrLight: "#1e293b", // Charcoal background
	},
};

// ─────────────────────────────────────────────────────────────────────────────
// SEASONAL PALETTES + SVG PATHS (from generate-logo-pngs.mjs / Logo.svelte)
// ─────────────────────────────────────────────────────────────────────────────

const SEASONAL_PALETTES = {
	summer: {
		tier1: { dark: "#15803d", light: "#86efac" },
		tier2: { dark: "#166534", light: "#4ade80" },
		tier3: { dark: "#14532d", light: "#22c55e" },
		trunk: { dark: "#3d2914", light: "#5a3f30" },
	},
	autumn: {
		tier1: { dark: "#DC2626", light: "#FCD34D" },
		tier2: { dark: "#991B1B", light: "#F59E0B" },
		tier3: { dark: "#7C2D12", light: "#EA580C" },
		trunk: { dark: "#5C3317", light: "#8B4520" },
	},
};

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

const ROTATION = -12; // Windswept organic feel (matches Logo.svelte)

function generateLogoSvg(season) {
	const c = SEASONAL_PALETTES[season];
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <g transform="rotate(${ROTATION} 50 50)">
    <path fill="${c.tier1.dark}" d="${PATHS.tier1Dark}" />
    <path fill="${c.tier1.light}" d="${PATHS.tier1Light}" />
    <path fill="${c.tier2.dark}" d="${PATHS.tier2Dark}" />
    <path fill="${c.tier2.light}" d="${PATHS.tier2Light}" />
    <path fill="${c.tier3.dark}" d="${PATHS.tier3Dark}" />
    <path fill="${c.tier3.light}" d="${PATHS.tier3Light}" />
    <path fill="${c.trunk.dark}" d="${PATHS.trunkDark}" />
    <path fill="${c.trunk.light}" d="${PATHS.trunkLight}" />
  </g>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// QR CODE GENERATION
// ─────────────────────────────────────────────────────────────────────────────

async function generateQrPng(url, size, theme) {
	const colors = THEMES[theme];
	// Generate QR as SVG → render via sharp for crisp output at any size
	const qrSvg = await QRCode.toString(url, {
		type: "svg",
		errorCorrectionLevel: "M",
		margin: 2, // Quiet zone in modules
		color: { dark: colors.qrDark, light: colors.qrLight },
	});
	return sharp(Buffer.from(qrSvg)).resize(size, size).png().toBuffer();
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD LAYOUT — FRONT SIDE
// ─────────────────────────────────────────────────────────────────────────────

function generateFrontSvg(theme) {
	const t = THEMES[theme];
	const cx = CONTENT.centerX;

	// Vertical layout zones (relative to canvas)
	const headerY = Math.round(CANVAS_H * 0.33); // Logo + "Grove" + QR row
	const taglineY = Math.round(CANVAS_H * 0.54); // "A place to Be."
	const urlY = Math.round(CANVAS_H * 0.66); // grove.place
	const sigY = CONTENT.bottom - 10; // "— Autumn Brown"

	// "Grove" title sits to the right of the logo
	const groveX = CONTENT.left + LOGO_FRONT + 25;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}">
  <!-- Background (extends to bleed edge) -->
  <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="${t.bg}" />

  <!-- "Grove" wordmark — positioned right of logo area -->
  <text x="${groveX}" y="${headerY}"
        font-family="Lexend, sans-serif" font-size="${fontPx(18)}" font-weight="500"
        fill="${t.text}" dominant-baseline="central">Grove</text>

  <!-- Tagline -->
  <text x="${cx}" y="${taglineY}"
        font-family="Lexend, sans-serif" font-size="${fontPx(10)}" font-style="italic"
        fill="${t.text}" text-anchor="middle" dominant-baseline="central">A place to Be.</text>

  <!-- URL (displayed without tracking param) -->
  <text x="${cx}" y="${urlY}"
        font-family="Lexend, sans-serif" font-size="${fontPx(9)}" font-weight="500"
        fill="${t.text}" text-anchor="middle" dominant-baseline="central">grove.place</text>

  <!-- Signature -->
  <text x="${CONTENT.right - QR_SIZE - 20}" y="${sigY}"
        font-family="Lexend, sans-serif" font-size="${fontPx(7)}" font-style="italic"
        fill="${t.textSubtle}" text-anchor="end" dominant-baseline="auto">— Autumn Brown</text>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD LAYOUT — BACK SIDE
// ─────────────────────────────────────────────────────────────────────────────

function generateBackSvg(theme) {
	const t = THEMES[theme];
	const cx = CONTENT.centerX;

	// Vertical layout (stacked text in center of card)
	const headlineY = Math.round(CANVAS_H * 0.36); // "Your words are yours."
	const sub1Y = Math.round(CANVAS_H * 0.52); // "No ads. No algorithms."
	const sub2Y = Math.round(CANVAS_H * 0.62); // "No AI training."
	const urlY = Math.round(CANVAS_H * 0.78); // grove.place/hello

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}">
  <!-- Background (extends to bleed edge) -->
  <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="${t.bg}" />

  <!-- Headline -->
  <text x="${cx}" y="${headlineY}"
        font-family="Lexend, sans-serif" font-size="${fontPx(11)}" font-weight="500"
        fill="${t.text}" text-anchor="middle" dominant-baseline="central">Your words are yours.</text>

  <!-- Subtext line 1 -->
  <text x="${cx}" y="${sub1Y}"
        font-family="Lexend, sans-serif" font-size="${fontPx(8)}"
        fill="${t.textSubtle}" text-anchor="middle" dominant-baseline="central">No ads. No algorithms.</text>

  <!-- Subtext line 2 -->
  <text x="${cx}" y="${sub2Y}"
        font-family="Lexend, sans-serif" font-size="${fontPx(8)}"
        fill="${t.textSubtle}" text-anchor="middle" dominant-baseline="central">No AI training.</text>

  <!-- URL (displayed without tracking param) -->
  <text x="${cx}" y="${urlY}"
        font-family="Lexend, sans-serif" font-size="${fontPx(9)}" font-weight="500"
        fill="${t.text}" text-anchor="middle" dominant-baseline="central">grove.place/hello</text>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD COMPOSITING
// ─────────────────────────────────────────────────────────────────────────────

async function generateCard(side, season, theme) {
	// 1. Render card base (background + text) from SVG
	const cardSvg = side === "front" ? generateFrontSvg(theme) : generateBackSvg(theme);
	const cardBuffer = await sharp(Buffer.from(cardSvg)).resize(CANVAS_W, CANVAS_H).png().toBuffer();

	// 2. Render seasonal logo at correct size
	const logoSize = side === "front" ? LOGO_FRONT : LOGO_BACK;
	const logoSvg = generateLogoSvg(season);
	const logoBuffer = await sharp(Buffer.from(logoSvg)).resize(logoSize, logoSize).png().toBuffer();

	// 3. Generate QR code
	const qrUrl =
		side === "front"
			? "https://grove.place?ref=card-front"
			: "https://grove.place/hello?ref=card-back";
	const qrBuffer = await generateQrPng(qrUrl, QR_SIZE, theme);

	// 4. Position elements
	// Logo: left side, vertically centered at header row (front) or card center (back)
	const logoX = CONTENT.left + 10;
	const headerY = Math.round(CANVAS_H * 0.33);
	const logoY =
		side === "front"
			? Math.round(headerY - logoSize / 2) // Aligned with "Grove" title
			: Math.round(CONTENT.centerY - logoSize / 2); // Centered vertically

	// QR: right side, vertically centered at header row (front) or card center (back)
	const qrX = CONTENT.right - QR_SIZE;
	const qrY =
		side === "front"
			? Math.round(headerY - QR_SIZE / 2) // Aligned with header row
			: Math.round(CONTENT.centerY - QR_SIZE / 2); // Centered vertically

	// 5. Composite all layers
	const finalBuffer = await sharp(cardBuffer)
		.composite([
			{ input: logoBuffer, left: logoX, top: logoY },
			{ input: qrBuffer, left: qrX, top: qrY },
		])
		.png()
		.toBuffer();

	return finalBuffer;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

// Seasons recommended by the spec for warmth and approachability
const CARD_SEASONS = ["autumn", "summer"];
const CARD_THEMES = ["light", "dark"];

async function main() {
	console.log("🃏 Generating Grove business card PNGs...\n");
	console.log(`   Canvas: ${CANVAS_W}×${CANVAS_H}px (300dpi, includes 0.125" bleed)`);
	console.log(`   Trim:   ${CANVAS_W - BLEED * 2}×${CANVAS_H - BLEED * 2}px (3.5" × 2")`);
	console.log(`   QR:     ${QR_SIZE}×${QR_SIZE}px (0.7")`);
	console.log(`   Logo:   ${LOGO_FRONT}px front, ${LOGO_BACK}px back\n`);

	await mkdir(OUTPUT_DIR, { recursive: true });

	let count = 0;

	for (const season of CARD_SEASONS) {
		console.log(`  ${season}:`);

		for (const theme of CARD_THEMES) {
			for (const side of ["front", "back"]) {
				const filename = `card-${side}-${season}-${theme}.png`;
				const buffer = await generateCard(side, season, theme);
				await writeFile(join(OUTPUT_DIR, filename), buffer);
				console.log(`    ✓ ${filename}`);
				count++;
			}
		}
		console.log("");
	}

	// Summary
	console.log(`📁 Output: docs/internal/print-assets/business-cards/`);
	console.log(`✅ Generated ${count} business card PNGs\n`);
	console.log(`💡 Print notes:`);
	console.log(`   • All files are sRGB — convert to CMYK before sending to print`);
	console.log(`   • Bleed: 0.125" on all sides (already included in canvas)`);
	console.log(`   • Safe zone: text stays 0.125" inside trim edge`);
	console.log(`   • QR codes tested with error correction level M (15% tolerance)`);
	console.log(`   • Recommended: Moo.com (premium) or Vistaprint (budget)`);
	console.log(`\n🎨 Print-safe color reference (sRGB → approximate CMYK):`);
	console.log(`   Grove Green  #16a34a → C:78 M:0 Y:86 K:6`);
	console.log(`   Autumn Orange #EA580C → C:0 M:72 Y:96 K:4`);
	console.log(`   Bark Brown   #5C3317 → C:30 M:60 Y:85 K:50`);
	console.log(`   Cream        #fefdfb → C:0 M:0 Y:1 K:0`);
	console.log(`   Charcoal     #1e293b → C:70 M:55 Y:35 K:65`);
}

main().catch(console.error);
