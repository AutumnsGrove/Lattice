#!/usr/bin/env node
/**
 * Generate Business Card PNGs — v7 (Midnight, slim copy)
 *
 * One card design, recolourable by season. The tree is the only light source:
 * a lantern glow sits behind it, the vines thin out around the QR code (a
 * "clearing"), and the QR is dark ink on a cream tile so every phone scans it.
 *
 * Vine paths are the exact ones from vine-pattern.css (the live site).
 *
 * Usage: node scripts/generate/generate-business-cards.mjs [season ... | all]
 *        (default: midnight; seasons: midnight, autumn, summer, spring, winter)
 */

import sharp from "sharp";
import QRCode from "qrcode";
import opentype from "opentype.js";
import { createNoise2D } from "simplex-noise";
import alea from "alea";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "../..");
const OUTPUT_DIR = join(ROOT_DIR, "docs/internal/print-assets/business-cards");
const FONT_DIR = join(ROOT_DIR, "libs/engine/static/fonts");

// ─────────────────────────────────────────────────────────────────────────────
// FONTS — two families, both Grove's own. Calistoga carries the voice,
// Lexend does the plain talking.
//
// sharp renders SVG through librsvg, which ignores @font-face (base64 data
// URIs included) and, on macOS, only sees fonts installed on the system. The
// old generator silently fell back to default serif/sans because of it. So we
// never ask the renderer for a font: every line of text is converted to vector
// outlines from the TTF itself. For print that is the safest form anyway,
// since outlined type cannot be substituted.
// ─────────────────────────────────────────────────────────────────────────────

const FONT_FILES = {
	Lexend: "Lexend-Regular.ttf",
	Calistoga: "Calistoga-Regular.ttf",
};

const FONTS = {};

async function loadFonts() {
	for (const [family, filename] of Object.entries(FONT_FILES)) {
		const buf = await readFile(join(FONT_DIR, filename));
		FONTS[family] = opentype.parse(
			buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
		);
	}
}

/**
 * Lay a line out one glyph at a time, using the font's own advances and
 * kerning. opentype.js's shaper throws on Calistoga's GSUB tables, and our
 * strings are short plain Latin with no ligatures, so we skip shaping.
 */
function layoutGlyphs(font, text, size, tracking) {
	const scale = size / font.unitsPerEm;
	const glyphs = [...text].map((ch) => font.charToGlyph(ch));
	const positions = [];
	let cursor = 0;
	glyphs.forEach((glyph, i) => {
		positions.push(cursor);
		const next = glyphs[i + 1];
		const kern = next ? font.getKerningValue(glyph, next) * scale : 0;
		cursor += glyph.advanceWidth * scale + kern + tracking;
	});
	return { glyphs, positions, width: cursor - tracking };
}

/**
 * Serialise opentype path commands ourselves. opentype.js 2.0.0's own
 * toPathData() emits "NaN" for some perfectly finite quadratic curves (it cut
 * the second "o" out of "Your words"), while the commands themselves are fine.
 */
function commandsToPathData(commands) {
	const n = (v) => {
		if (!Number.isFinite(v)) throw new Error(`Non-finite coordinate in glyph path: ${v}`);
		return Number(v.toFixed(2));
	};
	return commands
		.map((c) => {
			switch (c.type) {
				case "M":
				case "L":
					return `${c.type}${n(c.x)} ${n(c.y)}`;
				case "Q":
					return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
				case "C":
					return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
				case "Z":
					return "Z";
				default:
					throw new Error(`Unexpected path command: ${c.type}`);
			}
		})
		.join("");
}

/**
 * Text as an SVG outline. `y` is the baseline, `tracking` is in pixels, and
 * anchor "middle" centres the line on `x`. `slant` leans the outlines by that
 * many degrees about the baseline: our families ship no italic, so a short
 * word gets a synthetic oblique.
 */
function textPath(
	family,
	text,
	x,
	y,
	size,
	fill,
	{ tracking = 0, anchor = "start", slant = 0 } = {},
) {
	const font = FONTS[family];
	const { glyphs, positions, width } = layoutGlyphs(font, text, size, tracking);
	const startX = anchor === "middle" ? x - width / 2 : x;
	const d = glyphs
		.map((glyph, i) => commandsToPathData(glyph.getPath(startX + positions[i], y, size).commands))
		.join("");
	const lean = slant ? ` transform="translate(0 ${y}) skewX(${-slant}) translate(0 ${-y})"` : "";
	return `<path d="${d}" fill="${fill}"${lean} />`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRINT DIMENSIONS (300dpi)
// ─────────────────────────────────────────────────────────────────────────────

const DPI = 300;
const px = (inches) => Math.round(inches * DPI);
const fontPx = (pt) => Math.round((pt / 72) * DPI);

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

// The QR tile holds the code plus a 4-module quiet zone. At 0.95" the modules
// themselves land at ~0.75", above the spec's 0.7" scanning minimum.
const QR_TILE = px(0.95);
const QR_URL = "https://grove.place/hello?ref=card-back";
const QR_INK = "#1a1030";
const QR_PAPER = "#fefdfb";

// ─────────────────────────────────────────────────────────────────────────────
// SEASONAL PALETTES — swap the season, keep the design.
// ─────────────────────────────────────────────────────────────────────────────

const PALETTES = {
	midnight: {
		bg: "#0d0a1a", // violet-tinted near-black, never pure black
		text: "#fefdfb",
		textSubtle: "#b9a6d3",
		textAccent: "#f9a8d4", // Pink 300
		glow: "#ec4899",
		glowInner: "#7c3aed",
		vineColors: ["#ec4899", "#f9a8d4", "#a78bfa", "#7c3aed", "#fce7f3"],
		leafColors: ["#f9a8d4", "#a78bfa", "#ec4899", "#c4b5fd"],
		noiseColors: ["#a78bfa", "#ec4899", "#f9a8d4", "#7c3aed"],
		// Dark halves lifted from the logo's own midnight shades (#4c1d95 / #3b0764 /
		// #1e1b4b, trunk #1a1a2e / #2d1b4e): those sit on the violet glow and the
		// tree dissolves into it. Same hues, enough lightness to hold the edge.
		tier1: { dark: "#6d28d9", light: "#fce7f3" },
		tier2: { dark: "#5b21b6", light: "#f9a8d4" },
		tier3: { dark: "#4c1d95", light: "#ec4899" },
		trunk: { dark: "#3f3475", light: "#6a58a8" },
	},
	// Every season below follows the same recipe as midnight: a ground tinted
	// toward the season's hue, a glow in its brightest tones, and dark halves
	// lifted off the logo's own shades so the tree holds its edge on the glow.
	autumn: {
		bg: "#140c09",
		text: "#fefdfb",
		textSubtle: "#c4a484",
		textAccent: "#f59e0b",
		glow: "#EA580C",
		glowInner: "#DC2626",
		vineColors: ["#DC2626", "#EA580C", "#F59E0B", "#FCD34D", "#991B1B"],
		leafColors: ["#EA580C", "#F59E0B", "#DC2626", "#FCD34D"],
		noiseColors: ["#DC2626", "#F59E0B", "#EA580C", "#FCD34D"],
		tier1: { dark: "#DC2626", light: "#FCD34D" },
		tier2: { dark: "#B91C1C", light: "#F59E0B" },
		tier3: { dark: "#9A3412", light: "#EA580C" },
		trunk: { dark: "#7a4524", light: "#a8652f" },
	},
	summer: {
		bg: "#08130d",
		text: "#fefdfb",
		textSubtle: "#a6bfae",
		textAccent: "#86efac",
		glow: "#22c55e",
		glowInner: "#15803d",
		vineColors: ["#16a34a", "#22c55e", "#86efac", "#15803d", "#4ade80"],
		leafColors: ["#22c55e", "#4ade80", "#86efac", "#16a34a"],
		noiseColors: ["#16a34a", "#22c55e", "#86efac", "#4ade80"],
		tier1: { dark: "#16a34a", light: "#86efac" },
		tier2: { dark: "#15803d", light: "#4ade80" },
		tier3: { dark: "#166534", light: "#22c55e" },
		trunk: { dark: "#5a4026", light: "#7f5c3a" },
	},
	spring: {
		bg: "#150a10",
		text: "#fefdfb",
		textSubtle: "#d4aab8",
		textAccent: "#fda4af",
		glow: "#fb7185",
		glowInner: "#be185d",
		vineColors: ["#fb7185", "#fda4af", "#fecdd3", "#be185d", "#f9a8d4"],
		leafColors: ["#fda4af", "#fecdd3", "#fb7185", "#f9a8d4"],
		noiseColors: ["#fb7185", "#fda4af", "#fecdd3", "#f9a8d4"],
		tier1: { dark: "#db2777", light: "#fecdd3" },
		tier2: { dark: "#be185d", light: "#fda4af" },
		tier3: { dark: "#9d174d", light: "#fb7185" },
		trunk: { dark: "#7a5640", light: "#99705a" },
	},
	winter: {
		bg: "#090f1a",
		text: "#fefdfb",
		textSubtle: "#9fb4cf",
		textAccent: "#93c5fd",
		glow: "#60a5fa",
		glowInner: "#1d4ed8",
		vineColors: ["#60a5fa", "#93c5fd", "#bfdbfe", "#3b82f6", "#7dd3fc"],
		leafColors: ["#93c5fd", "#bfdbfe", "#60a5fa", "#7dd3fc"],
		noiseColors: ["#60a5fa", "#93c5fd", "#bfdbfe", "#7dd3fc"],
		tier1: { dark: "#3b6ea8", light: "#bfdbfe" },
		tier2: { dark: "#2f5f9e", light: "#93c5fd" },
		tier3: { dark: "#264f86", light: "#60a5fa" },
		trunk: { dark: "#475a75", light: "#64789a" },
	},
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGO — the Grove tree, drawn straight into the card SVG
// ─────────────────────────────────────────────────────────────────────────────

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

function treeLogo(p, cx, cy, size) {
	const s = size / 100;
	return `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${s})">
    <g transform="rotate(-12 50 50)">
      <path fill="${p.tier1.dark}" d="${TREE_PATHS.tier1Dark}" />
      <path fill="${p.tier1.light}" d="${TREE_PATHS.tier1Light}" />
      <path fill="${p.tier2.dark}" d="${TREE_PATHS.tier2Dark}" />
      <path fill="${p.tier2.light}" d="${TREE_PATHS.tier2Light}" />
      <path fill="${p.tier3.dark}" d="${TREE_PATHS.tier3Dark}" />
      <path fill="${p.tier3.light}" d="${TREE_PATHS.tier3Light}" />
      <path fill="${p.trunk.dark}" d="${TREE_PATHS.trunkDark}" />
      <path fill="${p.trunk.light}" d="${TREE_PATHS.trunkLight}" />
    </g>
  </g>`;
}

/** Lantern glow: a warm core fading to nothing, so the tree is the light source. */
function lanternGlow(p, id, cx, cy, r) {
	return {
		defs: `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${p.glow}" stop-opacity="0.42" />
      <stop offset="28%" stop-color="${p.glowInner}" stop-opacity="0.30" />
      <stop offset="65%" stop-color="${p.glowInner}" stop-opacity="0.09" />
      <stop offset="100%" stop-color="${p.glowInner}" stop-opacity="0" />
    </radialGradient>`,
		shape: `<rect width="${W}" height="${H}" fill="url(#${id})" />`,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// THE REAL VINE PATTERN — directly from vine-pattern.css
// ─────────────────────────────────────────────────────────────────────────────
//
// The original pattern tile is 450×450px. We render it at several positions
// and scales to cover the card, recoloured in the seasonal palette.

const VINE_PATHS = [
	{ d: "M-30 420 C50 380 30 320 80 260 S150 180 120 120 S180 40 140 -30", w: 1.5 },
	{ d: "M480 380 C400 350 420 280 360 230 S280 160 310 100 S250 30 290 -20", w: 1.4 },
	{ d: "M-20 280 C60 250 100 220 160 200 S250 160 320 170 S400 130 470 100", w: 1.2 },
	{ d: "M200 480 C180 420 210 360 190 300 S220 220 200 160 S230 80 210 20", w: 1.1 },
	{ d: "M350 480 C330 430 360 380 340 320 S380 260 350 200", w: 1.0 },
];

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

const LEAF_ELEMENTS = [
	"M70 300 Q85 280 78 265 Q70 280 55 288 Q70 295 70 300Z",
	"M135 145 Q150 128 143 115 Q135 128 120 135 Q135 142 135 145Z",
	"M375 255 Q360 240 365 225 Q375 240 390 245 Q375 252 375 255Z",
	"M220 180 Q235 165 228 152 Q220 165 205 172 Q220 178 220 180Z",
	"M145 175 Q152 155 145 135 Q138 155 145 175Z",
	"M295 130 Q305 115 298 98 Q288 115 295 130Z",
	"M210 275 Q200 258 205 240 Q218 258 210 275Z",
	"M365 195 Q375 180 368 162 Q358 180 365 195Z",
	"M115 365 Q125 348 118 330 Q108 348 115 365Z",
];

const ELLIPSE_LEAVES = [
	{ cx: 95, cy: 210, rx: 9, ry: 14, rot: -35 },
	{ cx: 335, cy: 145, rx: 8, ry: 12, rot: 28 },
	{ cx: 175, cy: 255, rx: 7, ry: 11, rot: -18 },
	{ cx: 280, cy: 195, rx: 6, ry: 10, rot: 40 },
	{ cx: 405, cy: 120, rx: 7, ry: 10, rot: -25 },
];

const SEED_POSITIONS = [
	{ cx: 180, cy: 90, r: 2 },
	{ cx: 85, cy: 175, r: 1.5 },
	{ cx: 345, cy: 290, r: 2 },
	{ cx: 420, cy: 200, r: 1.5 },
	{ cx: 260, cy: 350, r: 2 },
	{ cx: 40, cy: 120, r: 1.5 },
	{ cx: 310, cy: 400, r: 1.5 },
];

function renderVineTile(palette, offsetX, offsetY, scale, rotation = 0) {
	const elements = [];

	VINE_PATHS.forEach((vine, i) => {
		const color = palette.vineColors[i % palette.vineColors.length];
		const opacity = 0.18 + (VINE_PATHS.length - i) * 0.03;
		elements.push(
			`<path d="${vine.d}" fill="none" stroke="${color}" ` +
				`stroke-width="${vine.w}" stroke-opacity="${opacity.toFixed(2)}" stroke-linecap="round" />`,
		);
	});

	TENDRIL_PATHS.forEach((d, i) => {
		const color = palette.vineColors[(i + 2) % palette.vineColors.length];
		const opacity = 0.12 + (i % 3) * 0.02;
		elements.push(
			`<path d="${d}" fill="none" stroke="${color}" ` +
				`stroke-width="0.8" stroke-opacity="${opacity.toFixed(2)}" stroke-linecap="round" />`,
		);
	});

	LEAF_ELEMENTS.forEach((d, i) => {
		const color = palette.leafColors[i % palette.leafColors.length];
		const opacity = 0.1 + (i % 3) * 0.02;
		elements.push(`<path d="${d}" fill="${color}" fill-opacity="${opacity.toFixed(2)}" />`);
	});

	ELLIPSE_LEAVES.forEach((leaf, i) => {
		const color = palette.leafColors[i % palette.leafColors.length];
		const opacity = 0.1 + (i % 3) * 0.02;
		elements.push(
			`<ellipse cx="${leaf.cx}" cy="${leaf.cy}" rx="${leaf.rx}" ry="${leaf.ry}" ` +
				`transform="rotate(${leaf.rot} ${leaf.cx} ${leaf.cy})" ` +
				`fill="${color}" fill-opacity="${opacity.toFixed(2)}" />`,
		);
	});

	SEED_POSITIONS.forEach((seed, i) => {
		const color = palette.leafColors[i % palette.leafColors.length];
		elements.push(
			`<circle cx="${seed.cx}" cy="${seed.cy}" r="${seed.r}" ` +
				`fill="${color}" fill-opacity="0.07" />`,
		);
	});

	const transformParts = [`translate(${offsetX} ${offsetY})`];
	if (rotation !== 0) transformParts.push(`rotate(${rotation} 225 225)`);
	if (scale !== 1) transformParts.push(`scale(${scale})`);

	return `<g transform="${transformParts.join(" ")}">\n    ${elements.join("\n    ")}\n  </g>`;
}

/** Soft flowing curves traced through a noise field, like mist. */
function renderNoiseTexture(palette, seed) {
	const prng = alea(seed);
	const noise2D = createNoise2D(prng);
	const elements = [];
	const curveCount = 25;
	const steps = 60;
	const noiseScale = 0.004;

	for (let i = 0; i < curveCount; i++) {
		let cx = prng() * W;
		let cy = prng() * H;
		const color = palette.noiseColors[Math.floor(prng() * palette.noiseColors.length)];
		const opacity = 0.03 + prng() * 0.04;
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

/** Everything visible inside the vine layer: tiles, then the mist on top. */
function vineLayer(palette, side) {
	const tiles =
		side === "front"
			? [
					renderVineTile(palette, -50, -30, 1.6, 0),
					renderVineTile(palette, 500, 200, 1.2, 15),
					renderVineTile(palette, -200, 300, 1.0, -10),
				]
			: [
					renderVineTile(palette, 200, -80, 1.5, 180),
					renderVineTile(palette, -100, 150, 1.3, 5),
					renderVineTile(palette, 600, 250, 1.0, -8),
				];
	return `${tiles.join("\n    ")}\n    ${renderNoiseTexture(palette, `${side}-noise`)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// QR CODE — dark ink on a cream tile, rounded, quiet zone built in
// ─────────────────────────────────────────────────────────────────────────────

async function generateQrTile(url) {
	const qrSvg = await QRCode.toString(url, {
		type: "svg",
		errorCorrectionLevel: "M",
		margin: 4,
		color: { dark: QR_INK, light: QR_PAPER },
	});
	const roundMask = Buffer.from(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${QR_TILE}" height="${QR_TILE}">` +
			`<rect width="${QR_TILE}" height="${QR_TILE}" rx="22" ry="22" fill="#fff" /></svg>`,
	);
	return sharp(Buffer.from(qrSvg))
		.resize(QR_TILE, QR_TILE, { kernel: "nearest" })
		.composite([{ input: roundMask, blend: "dest-in" }])
		.png()
		.toBuffer();
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD LAYOUTS — three things per side, no more
// ─────────────────────────────────────────────────────────────────────────────

function frontSvg(palette) {
	const logoX = Math.round(W * 0.7);
	const logoY = Math.round(H * 0.42);
	const glow = lanternGlow(palette, "lantern", logoX, logoY, 380);

	const textX = CONTENT.left;
	const wordmarkBase = Math.round(H * 0.664);
	const taglineBase = wordmarkBase + 74;
	const nameBase = CONTENT.bottom;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <clipPath id="clip"><rect width="${W}" height="${H}" /></clipPath>
    ${glow.defs}
  </defs>
  <rect width="${W}" height="${H}" fill="${palette.bg}" />
  <g clip-path="url(#clip)">
    ${vineLayer(palette, "front")}
    ${glow.shape}
  </g>

  ${treeLogo(palette, logoX, logoY, 330)}

  ${textPath("Calistoga", "Grove", textX - 6, wordmarkBase, fontPx(44), palette.text, { tracking: -2 })}
  ${textPath("Lexend", "A place to Be.", textX, taglineBase, fontPx(11), palette.textAccent)}
  ${textPath("Lexend", "Autumn Brown · Wayfinder", textX, nameBase, fontPx(6.5), palette.textSubtle, { tracking: 0.6 })}
</svg>`;
}

function backSvg(palette) {
	const tileX = CONTENT.right - QR_TILE;
	const tileY = Math.round(H * 0.5 - QR_TILE / 2) - 14;
	const tileCx = tileX + QR_TILE / 2;
	const tileCy = tileY + QR_TILE / 2;

	// The clearing: vines fade to nothing around the QR tile.
	const clearing = `<radialGradient id="clearingFade" cx="${tileCx}" cy="${tileCy}" r="300" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#000" />
      <stop offset="52%" stop-color="#000" />
      <stop offset="100%" stop-color="#fff" />
    </radialGradient>
    <mask id="clearingMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="url(#clearingFade)" />
    </mask>`;
	const glow = lanternGlow(palette, "tileGlow", tileCx, tileCy, 330);

	const textX = CONTENT.left;
	const headlineBase = Math.round(H * 0.24);
	const lineY = Math.round(H * 0.68);
	const blankW = 240;
	const domainX = textX + blankW + 12;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <clipPath id="clip-b"><rect width="${W}" height="${H}" /></clipPath>
    ${clearing}
    ${glow.defs}
  </defs>
  <rect width="${W}" height="${H}" fill="${palette.bg}" />
  <g clip-path="url(#clip-b)">
    <g mask="url(#clearingMask)">
      ${vineLayer(palette, "back")}
    </g>
    ${glow.shape}
  </g>

  ${textPath("Calistoga", "Your words", textX - 4, headlineBase, fontPx(26), palette.text, { tracking: -1 })}
  ${textPath("Calistoga", "are yours.", textX - 4, headlineBase + fontPx(26) + 6, fontPx(26), palette.text, { tracking: -1 })}

  <!-- you.grove.place — "you" rests on the line like a name written in the blank -->
  <line x1="${textX}" y1="${lineY}" x2="${textX + blankW}" y2="${lineY}"
        stroke="${palette.textAccent}" stroke-width="3" stroke-linecap="round" />
  ${textPath("Lexend", "you", textX + blankW / 2, lineY - 12, fontPx(12), palette.textAccent, { anchor: "middle", slant: 12 })}
  ${textPath("Lexend", ".grove.place", domainX, lineY, fontPx(12), palette.text)}

  ${textPath("Lexend", "grove.place/hello", tileCx, CONTENT.bottom, fontPx(6.5), palette.textSubtle, { tracking: 0.6, anchor: "middle" })}
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSITING
// ─────────────────────────────────────────────────────────────────────────────

async function generateCard(side, season) {
	const palette = PALETTES[season];
	const svg = side === "front" ? frontSvg(palette) : backSvg(palette);
	const base = await sharp(Buffer.from(svg)).resize(W, H).png().toBuffer();

	if (side === "front") return base;

	const qr = await generateQrTile(QR_URL);
	const left = CONTENT.right - QR_TILE;
	const top = Math.round(H * 0.5 - QR_TILE / 2) - 14;
	return sharp(base)
		.composite([{ input: qr, left, top }])
		.png()
		.toBuffer();
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
	const requested = process.argv.slice(2);
	const seasons = requested.includes("all")
		? Object.keys(PALETTES)
		: requested.length
			? requested
			: ["midnight"];
	const unknown = seasons.filter((s) => !PALETTES[s]);
	if (unknown.length) {
		throw new Error(
			`Unknown season: ${unknown.join(", ")}. Use: ${Object.keys(PALETTES).join(", ")}`,
		);
	}

	console.log("🃏 Generating Grove business cards (v7: slim copy, dark)\n");
	console.log(`   Canvas: ${W}×${H}px (300dpi, 0.125" bleed)`);
	console.log(`   Trim:   ${W - BLEED * 2}×${H - BLEED * 2}px (3.5" × 2")`);
	console.log(`   Fonts:  Calistoga · Lexend\n`);

	await loadFonts();
	await mkdir(OUTPUT_DIR, { recursive: true });

	let count = 0;
	for (const season of seasons) {
		console.log(`  ${season}:`);
		for (const side of ["front", "back"]) {
			const filename = `card-${side}-${season}-dark.png`;
			await writeFile(join(OUTPUT_DIR, filename), await generateCard(side, season));
			console.log(`    ✓ ${filename}`);
			count++;
		}
	}

	console.log(`\n📁 Output: docs/internal/print-assets/business-cards/`);
	console.log(`✅ Generated ${count} cards`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
