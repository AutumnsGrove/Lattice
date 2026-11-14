#!/usr/bin/env node
/**
 * Build print PDFs from the business card PNGs.
 *
 * One PDF per season: page 1 is the front, page 2 is the back. Each page is the
 * full 3.75" x 2.25" bleed canvas holding one 300ppi DeviceCMYK image, with the
 * TrimBox set to the 3.5" x 2" card so a printer knows where the cut falls.
 *
 * Colour: the sRGB renders are converted to CMYK through an ICC profile (macOS's
 * Generic CMYK by default), not a naive formula. That profile is a stand-in. The
 * printer will convert again with its own press profile, so treat the soft proof
 * as a guide to how far the glowing violets and blues will shift, not a promise.
 *
 * Each season gets two PDFs, same artwork: a CMYK one (converted here) and an RGB one
 * (the untouched sRGB render). CMYK cannot hold the glowing violets and blues, so the
 * RGB twin exists for printers who would rather convert it themselves. Ask which they
 * want. Neither is a certified PDF/X-1a; both carry trim and bleed boxes.
 *
 * Usage: node scripts/generate/generate-business-card-pdfs.mjs [season ... | all]
 *          [--icc=/path/to/cmyk.icc] [--proof-dir=/some/dir]
 *        Run generate-business-cards.mjs first; this reads its PNGs.
 */

import sharp from "sharp";
import {
	PDFDocument,
	PDFRawStream,
	concatTransformationMatrix,
	drawObject,
	popGraphicsState,
	pushGraphicsState,
} from "pdf-lib";
import { deflateSync } from "zlib";
import { access, mkdir, writeFile } from "fs/promises";
import { basename, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "../..");
const CARDS_DIR = join(ROOT_DIR, "docs/internal/print-assets/business-cards");
const PDF_DIR = join(CARDS_DIR, "print");

const DEFAULT_ICC = "/System/Library/ColorSync/Profiles/Generic CMYK Profile.icc";
const SEASONS = ["midnight", "autumn", "summer", "spring", "winter"];

// Print geometry, in PDF points (72 per inch).
const PT = 72;
const PAGE_W = 3.75 * PT;
const PAGE_H = 2.25 * PT;
const BLEED = 0.125 * PT;
const TRIM_W = 3.5 * PT;
const TRIM_H = 2 * PT;

// The renders are 1125 x 675 px on a 3.75" x 2.25" page, so 300ppi exactly.
const EXPECTED_PX = { width: 1125, height: 675 };

function parseArgs(argv) {
	const flags = Object.fromEntries(
		argv
			.filter((a) => a.startsWith("--"))
			.map((a) => {
				const [k, v = "true"] = a.slice(2).split("=");
				return [k, v];
			}),
	);
	const names = argv.filter((a) => !a.startsWith("--"));
	const seasons = names.includes("all") ? SEASONS : names.length ? names : ["midnight"];
	const unknown = seasons.filter((s) => !SEASONS.includes(s));
	if (unknown.length) {
		throw new Error(`Unknown season: ${unknown.join(", ")}. Use: ${SEASONS.join(", ")}`);
	}
	return { seasons, icc: flags.icc ?? DEFAULT_ICC, proofDir: flags["proof-dir"] };
}

/** sRGB PNG in, raw 8-bit CMYK out, converted through the ICC profile. */
async function toCmyk(pngPath, icc) {
	const { data, info } = await sharp(pngPath)
		.removeAlpha()
		.toColourspace("cmyk")
		.withIccProfile(icc)
		.raw()
		.toBuffer({ resolveWithObject: true });
	if (info.channels !== 4)
		throw new Error(`${pngPath}: expected 4 CMYK channels, got ${info.channels}`);
	if (info.width !== EXPECTED_PX.width || info.height !== EXPECTED_PX.height) {
		throw new Error(
			`${pngPath}: expected ${EXPECTED_PX.width}x${EXPECTED_PX.height}px, got ${info.width}x${info.height}`,
		);
	}
	return { data, info };
}

/** Lossless: raw CMYK deflated into an image XObject, no JPEG, no channel inversion. */
function addCmykPage(pdf, { data, info }) {
	const imageDict = pdf.context.obj({
		Type: "XObject",
		Subtype: "Image",
		Width: info.width,
		Height: info.height,
		ColorSpace: "DeviceCMYK",
		BitsPerComponent: 8,
		Filter: "FlateDecode",
	});
	const imageRef = pdf.context.register(PDFRawStream.of(imageDict, deflateSync(data)));

	const page = pdf.addPage([PAGE_W, PAGE_H]);
	const name = page.node.newXObject("Card", imageRef);
	page.pushOperators(
		pushGraphicsState(),
		concatTransformationMatrix(PAGE_W, 0, 0, PAGE_H, 0, 0),
		drawObject(name),
		popGraphicsState(),
	);
	setPrintBoxes(page);
	return page;
}

/** The full canvas is the bleed; the trim box marks the 3.5" x 2" cut line. */
function setPrintBoxes(page) {
	page.setMediaBox(0, 0, PAGE_W, PAGE_H);
	page.setBleedBox(0, 0, PAGE_W, PAGE_H);
	page.setTrimBox(BLEED, BLEED, TRIM_W, TRIM_H);
}

/** The sRGB render as it is, flattened (no alpha), for printers who convert it themselves. */
async function addRgbPage(pdf, pngPath) {
	const flat = await sharp(pngPath).removeAlpha().png().toBuffer();
	const { width, height } = await sharp(flat).metadata();
	if (width !== EXPECTED_PX.width || height !== EXPECTED_PX.height) {
		throw new Error(
			`${pngPath}: expected ${EXPECTED_PX.width}x${EXPECTED_PX.height}px, got ${width}x${height}`,
		);
	}
	const image = await pdf.embedPng(flat);
	const page = pdf.addPage([PAGE_W, PAGE_H]);
	page.drawImage(image, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
	setPrintBoxes(page);
	return page;
}

/** How the CMYK will look back on screen: a rough guide to the colour shift. */
async function writeSoftProof(pngPath, icc, outPath) {
	const tiff = await sharp(pngPath)
		.removeAlpha()
		.toColourspace("cmyk")
		.withIccProfile(icc)
		.tiff({ compression: "lzw" })
		.toBuffer();
	await sharp(tiff).toColourspace("srgb").png().toFile(outPath);
}

async function newPdf(season, mode, icc) {
	const pdf = await PDFDocument.create();
	pdf.setTitle(`Grove business card, ${season} (front, back), ${mode.toUpperCase()}`);
	pdf.setAuthor("Autumn Brown");
	pdf.setProducer("Grove business card generator");
	pdf.setCreator("scripts/generate/generate-business-card-pdfs.mjs");
	pdf.setKeywords(mode === "cmyk" ? ["CMYK", `icc:${basename(icc)}`] : ["RGB", "sRGB, untagged"]);
	return pdf;
}

async function buildSeason(season, { icc, proofDir }) {
	const pngs = {};
	for (const side of ["front", "back"]) {
		pngs[side] = join(CARDS_DIR, `card-${side}-${season}-dark.png`);
		await access(pngs[side]).catch(() => {
			throw new Error(
				`Missing ${pngs[side]}. Run scripts/generate/generate-business-cards.mjs first.`,
			);
		});
	}

	const outputs = [];
	for (const mode of ["cmyk", "rgb"]) {
		const pdf = await newPdf(season, mode, icc);
		for (const side of ["front", "back"]) {
			if (mode === "cmyk") addCmykPage(pdf, await toCmyk(pngs[side], icc));
			else await addRgbPage(pdf, pngs[side]);
		}
		const out = join(PDF_DIR, `grove-card-${season}-dark-${mode}.pdf`);
		await writeFile(out, await pdf.save());
		outputs.push(out);
	}

	if (proofDir) {
		for (const side of ["front", "back"]) {
			await writeSoftProof(pngs[side], icc, join(proofDir, `proof-${side}-${season}.png`));
		}
	}
	return outputs;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	await access(args.icc).catch(() => {
		throw new Error(
			`ICC profile not found: ${args.icc}. Pass --icc=/path/to/your-printers-cmyk.icc`,
		);
	});
	await mkdir(PDF_DIR, { recursive: true });
	if (args.proofDir) await mkdir(args.proofDir, { recursive: true });

	console.log("📄 Building Grove business card PDFs (CMYK + RGB, 300ppi, bleed + trim boxes)\n");
	console.log(`   ICC:   ${args.icc}`);
	console.log(`   Page:  3.75" x 2.25" (trim 3.5" x 2", 0.125" bleed)\n`);

	let count = 0;
	for (const season of args.seasons) {
		for (const out of await buildSeason(season, args)) {
			console.log(`    ✓ ${out.replace(`${ROOT_DIR}/`, "")}`);
			count++;
		}
	}
	console.log(`\n✅ Built ${count} PDFs`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
