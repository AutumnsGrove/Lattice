#!/usr/bin/env node
/**
 * Generate Business Card PNGs — v5 (Real Vine Pattern)
 *
 * Uses the EXACT vine paths from vine-pattern.css (the ones on the live site),
 * scaled and recolored for the seasonal palette. Then layers simplex noise-based
 * texture for depth and variety.
 *
 * No more trying to generate vines procedurally — just use what already works.
 *
 * Usage: node scripts/generate/generate-business-cards.mjs
 */

import sharp from "sharp";
import QRCode from "qrcode";
import { createNoise2D } from "simplex-noise";
import alea from "alea";
import { mkdir, writeFile, readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "../..");
const OUTPUT_DIR = join(ROOT_DIR, "docs/internal/print-assets/business-cards");
const FONT_DIR = join(ROOT_DIR, "libs/engine/static/fonts");

// ─────────────────────────────────────────────────────────────────────────────
// FONT EMBEDDING — base64 encode TTF files into SVG @font-face declarations
// ─────────────────────────────────────────────────────────────────────────────
// This ensures fonts render correctly regardless of system font installation.
// We load them once at startup and embed them in every SVG.

const FONT_FILES = {
	Lexend: "Lexend-Regular.ttf",
	Calistoga: "Calistoga-Regular.ttf",
	Cormorant: "Cormorant-Regular.ttf",
	"IBM Plex Mono": "IBMPlexMono-Regular.ttf",
};

let FONT_FACE_CSS = "";

async function loadFonts() {
	const faces = [];
	for (const [family, filename] of Object.entries(FONT_FILES)) {
		const ttfBuffer = await readFile(join(FONT_DIR, filename));
		const b64 = ttfBuffer.toString("base64");
		faces.push(
			`@font-face { font-family: '${family}'; src: url('data:font/ttf;base64,${b64}') format('truetype'); font-weight: normal; font-style: normal; }`,
		);
	}
	FONT_FACE_CSS = faces.join("\n    ");
}

function fontDefs() {
	return `<style>\n    ${FONT_FACE_CSS}\n  </style>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRINT DIMENSIONS (300dpi)
// ─────────────────────────────────────────────────────────────────────────────

const DPI = 300;
const px = (inches) => Math.round(inches * DPI);

const W = px(3.75); // 1125px
const H = px(2.25); // 675px
const BLEED = px(0.125);
const SAFE = px(0.125);

const CONTENT = {
	left: BLEED + SAFE,
	top: BLEED + SAFE,
	right: W - BLEED - SAFE,
	bottom: H - BLEED - SAFE,
};

const QR_SIZE = px(0.55);
const LOGO_SIZE = px(0.85);
const fontPx = (pt) => Math.round((pt / 72) * DPI);

// ─────────────────────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────────────────────

const THEME = {
	bg: "#0f1419",
	text: "#fefdfb", // Cream DEFAULT — warm off-white, not clinical
	textSubtle: "#b69575", // Bark 400 — warm brown for secondary text
	qrFg: "#fefdfb",
};

// ─────────────────────────────────────────────────────────────────────────────
// SEASONAL PALETTES
// ─────────────────────────────────────────────────────────────────────────────

const PALETTES = {
	autumn: {
		// Vine stroke colors (from boldest to most subtle)
		vineColors: ["#DC2626", "#EA580C", "#F59E0B", "#FCD34D", "#991B1B"],
		// Leaf fill colors
		leafColors: ["#EA580C", "#F59E0B", "#DC2626", "#FCD34D"],
		// Noise texture colors
		noiseColors: ["#DC2626", "#F59E0B", "#EA580C", "#FCD34D"],
		// Geometric accents
		accent: "#F59E0B",
		accentAlt: "#DC2626",
		// Text accent — warm gold for highlight moments
		textAccent: "#f59e0b", // Amber 500 from Prism
		// Logo
		tier1: { dark: "#DC2626", light: "#FCD34D" },
		tier2: { dark: "#991B1B", light: "#F59E0B" },
		tier3: { dark: "#7C2D12", light: "#EA580C" },
		trunk: { dark: "#5C3317", light: "#8B4520" },
	},
	summer: {
		vineColors: ["#16a34a", "#22c55e", "#86efac", "#15803d", "#4ade80"],
		leafColors: ["#22c55e", "#4ade80", "#86efac", "#16a34a"],
		noiseColors: ["#16a34a", "#22c55e", "#86efac", "#4ade80"],
		accent: "#22c55e",
		accentAlt: "#15803d",
		// Text accent — fresh green for highlight moments
		textAccent: "#86efac", // Grove 300 from Prism
		tier1: { dark: "#15803d", light: "#86efac" },
		tier2: { dark: "#166534", light: "#4ade80" },
		tier3: { dark: "#14532d", light: "#22c55e" },
		trunk: { dark: "#3d2914", light: "#5a3f30" },
	},
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGO — tree on seasonal circle background
// ─────────────────────────────────────────────────────────────────────────────
//
// The shared logo generator (generate-logo-pngs.mjs) hardcodes green backgrounds.
// For business cards we need the circle to match each season's palette — warm
// dark browns for autumn, forest greens for summer, etc.

const TREE_PATHS = {
	tier1Dark: "M50 5 L18 32 L50 18 Z",
	tier1Light: "M50 5 L50 18 L82 32 Z",
	tier2Dark: "M50 20 L12 50 L50 35 Z",
	tier2Light: "M50 20 L50 35 L88 50 Z",
	tier3Dark: "M50 38 L18 68 L50 54 Z",
	tier3Light: "M50 38 L50 54 L82 68 Z",
	trunkDark: "M50 54 L42 58 L46 100 L50 100 Z",
	trunkLight: "M50 54 L58 58 L54 100 L50 100 Z",
};

// Season-appropriate circle background colors
const LOGO_BG = {
	autumn: {
		// Warm dark brown/amber — matches the autumn vine palette
		inner: "#2a1a0e",
		mid: "#201408",
		outer: "#1a1005",
		strokeColor: "234, 88, 12", // orange-600 RGB
	},
	summer: {
		// Dark forest green — the classic Grove look
		inner: "#122a1a",
		mid: "#0f2015",
		outer: "#0d1a12",
		strokeColor: "34, 197, 94", // green-500 RGB
	},
};

function generateLogoPng(season) {
	const c = PALETTES[season];
	const bg = LOGO_BG[season];
	const size = 512;
	const padding = Math.round(size * 0.15);
	const logoSize = size - padding * 2;
	const circleRadius = Math.round(size * 0.48);
	const cx = size / 2;
	const cy = size / 2;

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <radialGradient id="circleGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:${bg.inner}" />
      <stop offset="70%" style="stop-color:${bg.mid}" />
      <stop offset="100%" style="stop-color:${bg.outer}" />
    </radialGradient>
    <radialGradient id="glassHighlight" cx="35%" cy="30%" r="50%">
      <stop offset="0%" style="stop-color:rgba(255, 255, 255, 0.06)" />
      <stop offset="100%" style="stop-color:rgba(255, 255, 255, 0)" />
    </radialGradient>
  </defs>
  <!-- Circle background -->
  <circle cx="${cx}" cy="${cy}" r="${circleRadius}" fill="url(#circleGradient)" />
  <circle cx="${cx}" cy="${cy}" r="${circleRadius}" fill="url(#glassHighlight)" />
  <circle cx="${cx}" cy="${cy}" r="${circleRadius}"
          fill="none" stroke="rgba(${bg.strokeColor}, 0.12)" stroke-width="2" />
  <!-- Tree logo -->
  <g transform="translate(${padding} ${padding}) scale(${logoSize / 100})">
    <g transform="rotate(-12 50 50)">
      <path fill="${c.tier1.dark}" d="${TREE_PATHS.tier1Dark}" />
      <path fill="${c.tier1.light}" d="${TREE_PATHS.tier1Light}" />
      <path fill="${c.tier2.dark}" d="${TREE_PATHS.tier2Dark}" />
      <path fill="${c.tier2.light}" d="${TREE_PATHS.tier2Light}" />
      <path fill="${c.tier3.dark}" d="${TREE_PATHS.tier3Dark}" />
      <path fill="${c.tier3.light}" d="${TREE_PATHS.tier3Light}" />
      <path fill="${c.trunk.dark}" d="${TREE_PATHS.trunkDark}" />
      <path fill="${c.trunk.light}" d="${TREE_PATHS.trunkLight}" />
    </g>
  </g>
</svg>`;

	return sharp(Buffer.from(svg)).png().toBuffer();
}

// ─────────────────────────────────────────────────────────────────────────────
// THE REAL VINE PATTERN — directly from vine-pattern.css
// ─────────────────────────────────────────────────────────────────────────────
//
// These are the EXACT paths from libs/engine/src/lib/styles/vine-pattern.css.
// The original pattern tile is 450×450px. We render it at multiple positions
// and scales to cover the card, recolored in the seasonal palette.

// Vine strokes (the flowing S-curve paths)
const VINE_PATHS = [
	// Vine 1: dramatic S-curve
	{ d: "M-30 420 C50 380 30 320 80 260 S150 180 120 120 S180 40 140 -30", w: 1.5 },
	// Vine 2: opposite sweep
	{ d: "M480 380 C400 350 420 280 360 230 S280 160 310 100 S250 30 290 -20", w: 1.4 },
	// Vine 3: diagonal crossing
	{ d: "M-20 280 C60 250 100 220 160 200 S250 160 320 170 S400 130 470 100", w: 1.2 },
	// Vine 4: vertical accent
	{ d: "M200 480 C180 420 210 360 190 300 S220 220 200 160 S230 80 210 20", w: 1.1 },
	// Vine 5: wandering vine
	{ d: "M350 480 C330 430 360 380 340 320 S380 260 350 200", w: 1.0 },
];

// Spiral tendrils (the curly bits that branch off vines)
const TENDRIL_PATHS = [
	"M80 260 Q100 250 108 238 Q115 225 105 215 Q95 208 85 215",
	"M120 120 Q140 130 150 120 Q158 108 145 98 Q132 92 125 102",
	"M360 230 Q340 222 330 232 Q322 245 335 255 Q348 262 358 250",
	"M310 100 Q290 92 280 102 Q272 115 288 125",
	"M160 200 Q180 192 188 202 Q195 215 182 225",
	"M190 300 Q210 292 218 305 Q224 320 210 328",
	"M340 320 Q360 328 365 342 Q368 358 352 362",
	"M55 380 Q75 372 82 385 Q88 400 72 408",
];

// Leaf shapes (ivy, ellipse, slender, fern)
const LEAF_ELEMENTS = [
	// Pointed ivy leaves
	"M70 300 Q85 280 78 265 Q70 280 55 288 Q70 295 70 300Z",
	"M135 145 Q150 128 143 115 Q135 128 120 135 Q135 142 135 145Z",
	"M375 255 Q360 240 365 225 Q375 240 390 245 Q375 252 375 255Z",
	"M220 180 Q235 165 228 152 Q220 165 205 172 Q220 178 220 180Z",
	// Slender leaves
	"M145 175 Q152 155 145 135 Q138 155 145 175Z",
	"M295 130 Q305 115 298 98 Q288 115 295 130Z",
	"M210 275 Q200 258 205 240 Q218 258 210 275Z",
	"M365 195 Q375 180 368 162 Q358 180 365 195Z",
	"M115 365 Q125 348 118 330 Q108 348 115 365Z",
];

// Elliptical leaves (cx, cy, rx, ry, rotation)
const ELLIPSE_LEAVES = [
	{ cx: 95, cy: 210, rx: 9, ry: 14, rot: -35 },
	{ cx: 335, cy: 145, rx: 8, ry: 12, rot: 28 },
	{ cx: 175, cy: 255, rx: 7, ry: 11, rot: -18 },
	{ cx: 280, cy: 195, rx: 6, ry: 10, rot: 40 },
	{ cx: 405, cy: 120, rx: 7, ry: 10, rot: -25 },
];

// Seeds/spores
const SEED_POSITIONS = [
	{ cx: 180, cy: 90, r: 2 },
	{ cx: 85, cy: 175, r: 1.5 },
	{ cx: 345, cy: 290, r: 2 },
	{ cx: 420, cy: 200, r: 1.5 },
	{ cx: 260, cy: 350, r: 2 },
	{ cx: 40, cy: 120, r: 1.5 },
	{ cx: 310, cy: 400, r: 1.5 },
];

/**
 * Render the vine pattern tile at a given position, scale, and rotation,
 * recolored in the seasonal palette.
 */
function renderVineTile(season, offsetX, offsetY, scale, rotation = 0) {
	const palette = PALETTES[season];
	const elements = [];

	// Vine strokes
	VINE_PATHS.forEach((vine, i) => {
		const color = palette.vineColors[i % palette.vineColors.length];
		// Opacity higher than the CSS version since we're on a dark bg (CSS is 0.08-0.14)
		const opacity = 0.18 + (VINE_PATHS.length - i) * 0.03;
		elements.push(
			`<path d="${vine.d}" fill="none" stroke="${color}" ` +
				`stroke-width="${vine.w}" stroke-opacity="${opacity.toFixed(2)}" stroke-linecap="round" />`,
		);
	});

	// Spiral tendrils
	TENDRIL_PATHS.forEach((d, i) => {
		const color = palette.vineColors[(i + 2) % palette.vineColors.length];
		const opacity = 0.12 + (i % 3) * 0.02;
		elements.push(
			`<path d="${d}" fill="none" stroke="${color}" ` +
				`stroke-width="0.8" stroke-opacity="${opacity.toFixed(2)}" stroke-linecap="round" />`,
		);
	});

	// Path-based leaves
	LEAF_ELEMENTS.forEach((d, i) => {
		const color = palette.leafColors[i % palette.leafColors.length];
		const opacity = 0.1 + (i % 3) * 0.02;
		elements.push(`<path d="${d}" fill="${color}" fill-opacity="${opacity.toFixed(2)}" />`);
	});

	// Elliptical leaves
	ELLIPSE_LEAVES.forEach((leaf, i) => {
		const color = palette.leafColors[i % palette.leafColors.length];
		const opacity = 0.1 + (i % 3) * 0.02;
		elements.push(
			`<ellipse cx="${leaf.cx}" cy="${leaf.cy}" rx="${leaf.rx}" ry="${leaf.ry}" ` +
				`transform="rotate(${leaf.rot} ${leaf.cx} ${leaf.cy})" ` +
				`fill="${color}" fill-opacity="${opacity.toFixed(2)}" />`,
		);
	});

	// Seeds
	SEED_POSITIONS.forEach((seed, i) => {
		const color = palette.leafColors[i % palette.leafColors.length];
		elements.push(
			`<circle cx="${seed.cx}" cy="${seed.cy}" r="${seed.r}" ` +
				`fill="${color}" fill-opacity="0.07" />`,
		);
	});

	// Wrap everything in a transform group
	const transformParts = [];
	transformParts.push(`translate(${offsetX} ${offsetY})`);
	if (rotation !== 0) transformParts.push(`rotate(${rotation} 225 225)`);
	if (scale !== 1) transformParts.push(`scale(${scale})`);

	return `<g transform="${transformParts.join(" ")}">\n    ${elements.join("\n    ")}\n  </g>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOISE TEXTURE LAYER — adds depth and variety on top of the vine pattern
// ─────────────────────────────────────────────────────────────────────────────

function renderNoiseTexture(season, seed) {
	const prng = alea(seed);
	const noise2D = createNoise2D(prng);
	const palette = PALETTES[season];
	const elements = [];

	// Soft flowing curves traced through the noise field
	// These add subtle texture between the vine paths — like mist or light
	const curveCount = 25;
	const steps = 60;
	const noiseScale = 0.004;

	for (let i = 0; i < curveCount; i++) {
		let cx = prng() * W;
		let cy = prng() * H;
		const color = palette.noiseColors[Math.floor(prng() * palette.noiseColors.length)];
		const opacity = 0.03 + prng() * 0.04; // Very subtle
		const strokeWidth = 0.4 + prng() * 0.6;

		const points = [`M${cx.toFixed(1)} ${cy.toFixed(1)}`];
		for (let s = 0; s < steps; s++) {
			const angle = noise2D(cx * noiseScale, cy * noiseScale) * Math.PI * 2;
			cx += Math.cos(angle) * 5;
			cy += Math.sin(angle) * 5;
			points.push(`L${cx.toFixed(1)} ${cy.toFixed(1)}`);
		}

		elements.push(
			`<path d="${points.join(" ")}" fill="none" stroke="${color}" ` +
				`stroke-opacity="${opacity.toFixed(3)}" stroke-width="${strokeWidth.toFixed(1)}" ` +
				`stroke-linecap="round" />`,
		);
	}

	return elements.join("\n    ");
}

// ─────────────────────────────────────────────────────────────────────────────
// GEOMETRIC ACCENTS
// ─────────────────────────────────────────────────────────────────────────────

function geometricAccents(season, side) {
	const p = PALETTES[season];
	const els = [];

	if (side === "front") {
		// Subtle diagonal lines — adds geometric tension without competing with the logo
		els.push(
			`<line x1="-50" y1="${H + 40}" x2="${W * 0.7}" y2="${H * 0.12}" ` +
				`stroke="${p.accentAlt}" stroke-opacity="0.10" stroke-width="1.5" />`,
		);
		els.push(
			`<line x1="-50" y1="${H}" x2="${W * 0.65}" y2="${H * 0.1}" ` +
				`stroke="${p.accent}" stroke-opacity="0.06" stroke-width="1" />`,
		);
	} else {
		// Concentric arcs bottom-right
		const cx = W + 80,
			cy = H + 60;
		for (let i = 0; i < 3; i++) {
			els.push(
				`<circle cx="${cx}" cy="${cy}" r="${180 + i * 55}" fill="none" ` +
					`stroke="${p.accent}" stroke-opacity="${(0.15 - i * 0.04).toFixed(2)}" ` +
					`stroke-width="${2.2 - i * 0.5}" />`,
			);
		}
		els.push(
			`<line x1="-20" y1="-20" x2="${W * 0.42}" y2="${H * 0.52}" ` +
				`stroke="${p.accentAlt}" stroke-opacity="0.12" stroke-width="1.5" />`,
		);
	}

	return els.join("\n    ");
}

// ─────────────────────────────────────────────────────────────────────────────
// QR CODE
// ─────────────────────────────────────────────────────────────────────────────

async function generateQrPng(url) {
	const qrSvg = await QRCode.toString(url, {
		type: "svg",
		errorCorrectionLevel: "M",
		margin: 2,
		color: { dark: THEME.qrFg, light: "#00000000" },
	});
	return sharp(Buffer.from(qrSvg)).resize(QR_SIZE, QR_SIZE).png().toBuffer();
}

function qrBackdrop(x, y) {
	return (
		`<rect x="${x - 14}" y="${y - 14}" width="${QR_SIZE + 28}" height="${QR_SIZE + 28}" ` +
		`rx="10" ry="10" fill="rgba(15, 20, 25, 0.88)" />`
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD LAYOUTS
// ─────────────────────────────────────────────────────────────────────────────

function frontSvg(season) {
	const t = THEME;

	// Place vine pattern tiles — the original is 450×450, we scale and position
	// multiple tiles to cover the 1125×675 card with overlap
	const tile1 = renderVineTile(season, -50, -30, 1.6, 0); // Main tile, scaled up, covers most of card
	const tile2 = renderVineTile(season, 500, 200, 1.2, 15); // Overlapping tile, slight rotation
	const tile3 = renderVineTile(season, -200, 300, 1.0, -10); // Lower-left fill

	// Noise texture for depth
	const noise = renderNoiseTexture(season, `front-noise-${season}`);

	// Geometric accents
	const geo = geometricAccents(season, "front");

	const qrX = CONTENT.right - QR_SIZE - 5;
	const qrY = CONTENT.bottom - QR_SIZE - 5;

	const p = PALETTES[season];

	// ── Typography layout ──────────────────────────────────────────────────
	const groveX = CONTENT.left - 8;
	const groveY = Math.round(H * 0.33); // Upper third
	const taglineY = groveY + fontPx(16); // More breathing room below "Grove"
	const descY = taglineY + fontPx(9) + 12; // "Your own space on the web."

	// Bottom-left block: founder + URL
	const urlY = CONTENT.bottom - 8;
	const sigY = urlY - fontPx(8) - 6;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <clipPath id="clip"><rect width="${W}" height="${H}" /></clipPath>
  </defs>
  ${fontDefs()}
  <rect width="${W}" height="${H}" fill="${t.bg}" />
  <g clip-path="url(#clip)">
    ${tile1}
    ${tile2}
    ${tile3}
    ${noise}
    ${geo}
  </g>

  <!-- "Grove" wordmark — Calistoga: warm, bold, like a sign above a shop door -->
  <text x="${groveX}" y="${groveY}"
        font-family="Calistoga, serif" font-size="${fontPx(36)}"
        fill="${t.text}" dominant-baseline="central" letter-spacing="-1">Grove</text>

  <!-- Tagline — Cormorant: elegant serif for the poetic moments -->
  <text x="${groveX + 6}" y="${taglineY}"
        font-family="Cormorant, serif" font-size="${fontPx(10)}" font-style="italic"
        fill="${p.textAccent}" dominant-baseline="hanging" letter-spacing="0.5">A place to Be.</text>

  <!-- Descriptor — Lexend: clean, readable body text -->
  <text x="${groveX + 6}" y="${descY}"
        font-family="Lexend, sans-serif" font-size="${fontPx(7.5)}"
        fill="${t.textSubtle}" dominant-baseline="hanging">Blogs, pages, and a space that's truly yours.</text>

  <!-- Founder — Lexend: practical, secondary -->
  <text x="${CONTENT.left + 4}" y="${sigY}"
        font-family="Lexend, sans-serif" font-size="${fontPx(6.5)}"
        fill="${t.textSubtle}">Autumn Brown, Wayfinder/Founder</text>

  <!-- URL — IBM Plex Mono: monospace for URLs feels right -->
  <text x="${CONTENT.left + 4}" y="${urlY}"
        font-family="IBM Plex Mono, monospace" font-size="${fontPx(7.5)}"
        fill="${p.textAccent}">grove.place</text>

  ${qrBackdrop(qrX, qrY)}
</svg>`;
}

function backSvg(season) {
	const t = THEME;

	// Back side — tiles placed differently for variety, slight mirror energy
	const tile1 = renderVineTile(season, 200, -80, 1.5, 180); // Flipped for mirror feel
	const tile2 = renderVineTile(season, -100, 150, 1.3, 5); // Fill left side
	const tile3 = renderVineTile(season, 600, 250, 1.0, -8); // Lower-right fill

	const noise = renderNoiseTexture(season, `back-noise-${season}`);
	const geo = geometricAccents(season, "back");
	const p = PALETTES[season];

	const qrX = CONTENT.right - QR_SIZE - 5;
	const qrY = CONTENT.bottom - QR_SIZE - 5;

	// ── Typography layout ──────────────────────────────────────────────────
	const headlineY = Math.round(H * 0.22);

	// "No" values — tight, dismissive block
	const valuesStartY = Math.round(H * 0.4);
	const valuesGap = fontPx(6.5) + 5;
	const sub1Y = valuesStartY;
	const sub2Y = sub1Y + valuesGap;
	const sub3Y = sub2Y + valuesGap;

	// "What you get" — Cormorant, warmer, the turn in the narrative
	const getStartY = sub3Y + fontPx(7) + 18;
	const getGap = fontPx(7.5) + 6;
	const get1Y = getStartY;
	const get2Y = get1Y + getGap;

	// "Fully yours." — standalone thesis moment, bigger, accent color
	const thesisY = get2Y + fontPx(9) + 16;

	// Warm closer
	const closerY = thesisY + fontPx(9) + 12;

	// URL
	const urlY = CONTENT.bottom - 8;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <clipPath id="clip-b"><rect width="${W}" height="${H}" /></clipPath>
  </defs>
  ${fontDefs()}
  <rect width="${W}" height="${H}" fill="${t.bg}" />
  <g clip-path="url(#clip-b)">
    ${tile1}
    ${tile2}
    ${tile3}
    ${noise}
    ${geo}
  </g>

  <!-- Headline — Calistoga: same display font as front wordmark -->
  <text x="${CONTENT.left + 4}" y="${headlineY}"
        font-family="Calistoga, serif" font-size="${fontPx(20)}"
        fill="${t.text}" dominant-baseline="central" letter-spacing="-1">Your words are yours.</text>

  <!-- Values — Lexend: cold, factual, dismissive -->
  <text x="${CONTENT.left + 4}" y="${sub1Y}"
        font-family="Lexend, sans-serif" font-size="${fontPx(6.5)}"
        fill="${t.textSubtle}">No ads.</text>
  <text x="${CONTENT.left + 4}" y="${sub2Y}"
        font-family="Lexend, sans-serif" font-size="${fontPx(6.5)}"
        fill="${t.textSubtle}">No algorithms.</text>
  <text x="${CONTENT.left + 4}" y="${sub3Y}"
        font-family="Lexend, sans-serif" font-size="${fontPx(6.5)}"
        fill="${t.textSubtle}">No AI training.</text>

  <!-- What you get — Cormorant: the turn. warmth enters. -->
  <text x="${CONTENT.left + 4}" y="${get1Y}"
        font-family="Cormorant, serif" font-size="${fontPx(8)}"
        fill="${t.text}">A beautiful place to write.</text>
  <text x="${CONTENT.left + 4}" y="${get2Y}"
        font-family="Cormorant, serif" font-size="${fontPx(8)}"
        fill="${t.text}">A home with your name on it.</text>

  <!-- Thesis — Calistoga: the punctuation. standalone. accent. -->
  <text x="${CONTENT.left + 4}" y="${thesisY}"
        font-family="Calistoga, serif" font-size="${fontPx(10)}"
        fill="${p.textAccent}">Fully yours.</text>

  <!-- Warm closer — Cormorant italic: the emotional exhale -->
  <text x="${CONTENT.left + 4}" y="${closerY}"
        font-family="Cormorant, serif" font-size="${fontPx(8.5)}" font-style="italic"
        fill="${t.text}">Just you and your voice.</text>

  <!-- URL — IBM Plex Mono: functional, not competing -->
  <text x="${CONTENT.left + 4}" y="${urlY}"
        font-family="IBM Plex Mono, monospace" font-size="${fontPx(7)}"
        fill="${t.textSubtle}">grove.place/hello</text>

  ${qrBackdrop(qrX, qrY)}
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSITING
// ─────────────────────────────────────────────────────────────────────────────

async function generateCard(side, season) {
	const svg = side === "front" ? frontSvg(season) : backSvg(season);
	const base = await sharp(Buffer.from(svg)).resize(W, H).png().toBuffer();
	const layers = [];

	if (side === "front") {
		const logoPng = await generateLogoPng(season);
		const logo = await sharp(logoPng).resize(LOGO_SIZE, LOGO_SIZE).png().toBuffer();
		layers.push({ input: logo, left: CONTENT.right - LOGO_SIZE - 20, top: CONTENT.top + 10 });
	}

	const qrUrl =
		side === "front"
			? "https://grove.place?ref=card-front"
			: "https://grove.place/hello?ref=card-back";
	const qr = await generateQrPng(qrUrl);
	layers.push({ input: qr, left: CONTENT.right - QR_SIZE - 5, top: CONTENT.bottom - QR_SIZE - 5 });

	return sharp(base).composite(layers).png().toBuffer();
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
	console.log("🃏 Generating Grove business cards (v6 — Multi-font, dark only)\n");
	console.log(`   Canvas: ${W}×${H}px (300dpi, 0.125" bleed)`);
	console.log(`   Trim:   ${W - BLEED * 2}×${H - BLEED * 2}px (3.5" × 2")`);
	console.log(`   Fonts:  Calistoga · Cormorant · Lexend · IBM Plex Mono\n`);

	// Load and base64-encode fonts for SVG embedding
	await loadFonts();
	console.log(`   ✓ Fonts loaded and encoded\n`);

	await mkdir(OUTPUT_DIR, { recursive: true });
	let count = 0;

	for (const season of ["autumn", "summer"]) {
		console.log(`  ${season}:`);
		for (const side of ["front", "back"]) {
			const filename = `card-${side}-${season}-dark.png`;
			const buffer = await generateCard(side, season);
			await writeFile(join(OUTPUT_DIR, filename), buffer);
			console.log(`    ✓ ${filename}`);
			count++;
		}
		console.log("");
	}

	console.log(`📁 Output: docs/internal/print-assets/business-cards/`);
	console.log(`✅ Generated ${count} cards\n`);
	console.log(`💡 Print: Moo.com, soft-touch matte laminate, CMYK conversion before upload`);
}

main().catch(console.error);
