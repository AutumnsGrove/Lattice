// src/lib/server/font-validator.ts
// WOFF2 / WOFF font file validation
//
// Checks, in order: size, format signature, header and table-directory
// structure, required tables, and (where the runtime can read the font's
// tables) that the character map covers the basics a theme needs to render
// text. Only WOFF2 and WOFF are accepted; raw TTF/OTF/TTC files are recognised
// so the error can say what to do about them.

import type { ValidationResult } from "../types.js";

/**
 * Maximum file size for custom fonts (500KB)
 */
export const MAX_FONT_SIZE = 500 * 1024;

/**
 * Maximum number of custom fonts per tenant
 */
export const MAX_FONTS_PER_TENANT = 10;

/**
 * Ceiling on a font's uncompressed table data. A 500KB file can legitimately
 * expand a few times over; this stops a crafted stream from expanding without
 * limit while we read its character map.
 */
export const MAX_UNCOMPRESSED_FONT_SIZE = 8 * 1024 * 1024;

/**
 * Ceiling on the table count we will read from a header.
 */
const MAX_TABLES = 256;

// ============================================================================
// ERRORS
// ============================================================================

/**
 * Every message the validator can return. One home, so the uploader and the
 * tests read the same strings.
 */
export const FONT_ERRORS = {
	TOO_LARGE: `File exceeds maximum size of ${MAX_FONT_SIZE / 1024}KB`,
	NOT_WOFF2: "Invalid WOFF2 file format",
	NOT_WOFF: "Invalid WOFF file format",
	UNKNOWN_FORMAT: "Unrecognised font file. Upload a WOFF2 or WOFF font.",
	UNSUPPORTED_FORMAT: "Raw TTF, OTF and TTC fonts are not accepted. Convert the font to WOFF2.",
	TRUNCATED: "Font file is truncated or too small to be a valid font",
	BAD_LENGTH: "Font header length does not match the file size",
	BAD_TABLE_COUNT: "Font declares an invalid number of tables",
	BAD_TABLE_DIRECTORY: "Font table directory is malformed or points outside the file",
	MISSING_TABLES: "Font is missing required tables",
	CORRUPT_TABLES: "Font table data could not be decompressed",
	TOO_LARGE_UNCOMPRESSED: "Font expands to more data than is allowed",
	NO_CHARACTER_MAP: "Font has no usable Unicode character map",
	MISSING_CHARACTERS: "Font does not cover the basic characters a theme needs",
} as const;

export type FontErrorCode = keyof typeof FONT_ERRORS;

export interface FontValidationIssue {
	code: FontErrorCode;
	message: string;
	/** Extra context, such as the missing tables or characters. */
	details?: string[];
}

export type FontFormat = "woff2" | "woff" | "ttf" | "otf" | "ttc";

export interface FontValidationResult extends ValidationResult {
	/** The format the file's signature declares, when it has a recognised one. */
	format?: FontFormat;
	/** Every problem found. Empty when `valid` is true. `error` is the first message. */
	errors: FontValidationIssue[];
}

function issue(code: FontErrorCode, details?: string[]): FontValidationIssue {
	return { code, message: FONT_ERRORS[code], ...(details && details.length > 0 && { details }) };
}

function failure(
	format: FontFormat | undefined,
	...errors: FontValidationIssue[]
): FontValidationResult {
	return { valid: false, error: errors[0].message, errors, ...(format && { format }) };
}

function success(format: FontFormat, warnings: string[]): FontValidationResult {
	return { valid: true, errors: [], format, ...(warnings.length > 0 && { warnings }) };
}

// ============================================================================
// COVERAGE REQUIREMENT
// ============================================================================

const codepoints = (chars: string) => Array.from(chars, (c) => c.codePointAt(0)!);

/**
 * The minimum a font must cover to render ordinary text in a theme: the ten
 * digits, and the full Latin alphabet in at least one case (so an
 * uppercase-only display face still qualifies).
 */
export const MIN_COVERAGE = {
	digits: codepoints("0123456789"),
	letters: [codepoints("abcdefghijklmnopqrstuvwxyz"), codepoints("ABCDEFGHIJKLMNOPQRSTUVWXYZ")],
};

// ============================================================================
// BINARY HELPERS
// ============================================================================

const SIGNATURES = {
	woff2: 0x774f4632, // 'wOF2'
	woff: 0x774f4646, // 'wOFF'
	otf: 0x4f54544f, // 'OTTO'
	ttc: 0x74746366, // 'ttcf'
	ttfTrueType: 0x00010000,
	ttfApple: 0x74727565, // 'true'
} as const;

const WOFF_HEADER_SIZE = 44;
const WOFF_TABLE_RECORD_SIZE = 20;
const WOFF2_HEADER_SIZE = 48;

function detectFormat(view: DataView): FontFormat | undefined {
	if (view.byteLength < 4) return undefined;
	switch (view.getUint32(0)) {
		case SIGNATURES.woff2:
			return "woff2";
		case SIGNATURES.woff:
			return "woff";
		case SIGNATURES.otf:
			return "otf";
		case SIGNATURES.ttc:
			return "ttc";
		case SIGNATURES.ttfTrueType:
		case SIGNATURES.ttfApple:
			return "ttf";
		default:
			return undefined;
	}
}

function tagAt(view: DataView, offset: number): string {
	return String.fromCharCode(
		view.getUint8(offset),
		view.getUint8(offset + 1),
		view.getUint8(offset + 2),
		view.getUint8(offset + 3),
	);
}

/** A table in the file, before any decompression. */
interface TableRecord {
	tag: string;
	/** Bytes the table occupies once decompressed. */
	originalLength: number;
	/** WOFF only: where the stored bytes start and how long they are. */
	offset?: number;
	storedLength?: number;
}

/**
 * Tables every usable web font carries, and the outline tables of which at
 * least one set must be present. Deliberately lighter than a browser's own
 * checks: this rejects files that cannot be fonts, not every font a browser
 * might refuse.
 */
const REQUIRED_TABLES = ["cmap", "head", "hhea", "hmtx", "maxp", "name"];
const OUTLINE_TABLE_SETS = [["glyf", "loca"], ["CFF "], ["CFF2"]];

function missingTables(tables: TableRecord[]): string[] {
	const present = new Set(tables.map((t) => t.tag));
	const missing = REQUIRED_TABLES.filter((tag) => !present.has(tag));
	const hasOutlines = OUTLINE_TABLE_SETS.some((set) => set.every((tag) => present.has(tag)));
	if (!hasOutlines) missing.push("glyf+loca or CFF");
	return missing;
}

// ============================================================================
// WOFF2 (https://www.w3.org/TR/WOFF2/)
// ============================================================================

// Index into this list is the 6-bit tag code in a table-directory entry.
// Code 63 means the four-byte tag follows instead.
// prettier-ignore
const WOFF2_KNOWN_TAGS = [
	"cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ", "fpgm", "glyf", "loca",
	"prep", "CFF ", "VORG", "EBDT", "EBLC", "gasp", "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea",
	"vmtx", "BASE", "GDEF", "GPOS", "GSUB", "EBSC", "JSTF", "MATH", "CBDT", "CBLC", "COLR", "CPAL",
	"SVG ", "sbix", "acnt", "avar", "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar",
	"gvar", "hsty", "just", "lcar", "mort", "morx", "opbd", "prop", "trak", "Zapf", "Silf", "Glat",
	"Gloc", "Feat", "Sill",
];

/** Read a UIntBase128 (WOFF2 §5.2). Returns undefined when it is malformed. */
function readBase128(view: DataView, offset: number): { value: number; next: number } | undefined {
	let value = 0;
	for (let i = 0; i < 5; i++) {
		if (offset + i >= view.byteLength) return undefined;
		const byte = view.getUint8(offset + i);
		// A leading 0x80 would be a redundant zero; a value this wide would overflow 32 bits.
		if (i === 0 && byte === 0x80) return undefined;
		if (value > 0x01ffffff) return undefined;
		value = (value << 7) | (byte & 0x7f);
		if ((byte & 0x80) === 0) return { value: value >>> 0, next: offset + i + 1 };
	}
	return undefined;
}

interface Woff2Table extends TableRecord {
	/** Bytes this table takes in the decompressed stream (transformed size when it is transformed). */
	streamLength: number;
}

interface Woff2Layout {
	tables: Woff2Table[];
	compressedStart: number;
	compressedLength: number;
}

function parseWoff2(view: DataView): Woff2Layout | FontValidationIssue {
	if (view.byteLength < WOFF2_HEADER_SIZE) return issue("TRUNCATED");
	if (view.getUint32(8) !== view.byteLength) return issue("BAD_LENGTH");

	const numTables = view.getUint16(12);
	if (numTables === 0 || numTables > MAX_TABLES) return issue("BAD_TABLE_COUNT");
	const compressedLength = view.getUint32(20);

	const tables: Woff2Table[] = [];
	let offset = WOFF2_HEADER_SIZE;
	for (let i = 0; i < numTables; i++) {
		if (offset >= view.byteLength) return issue("BAD_TABLE_DIRECTORY");
		const flags = view.getUint8(offset++);
		const tagCode = flags & 0x3f;
		const transformVersion = flags >> 6;

		let tag: string;
		if (tagCode === 63) {
			if (offset + 4 > view.byteLength) return issue("BAD_TABLE_DIRECTORY");
			tag = tagAt(view, offset);
			offset += 4;
		} else {
			tag = WOFF2_KNOWN_TAGS[tagCode];
		}

		const original = readBase128(view, offset);
		if (!original) return issue("BAD_TABLE_DIRECTORY");
		offset = original.next;

		// WOFF2 §5 defines a transform for three tables only: glyf and loca (0 = transformed,
		// 3 = none) and hmtx (0 = none, 1 = transformed). Every other table has only the
		// null transform, version 0. §4.1 says a decoder must reject an unknown version —
		// without that, a `cmap` claiming one could skip the character coverage check below
		// by looking transformed.
		const isGlyphTable = tag === "glyf" || tag === "loca";
		const knownVersion = isGlyphTable
			? transformVersion === 0 || transformVersion === 3
			: tag === "hmtx"
				? transformVersion === 0 || transformVersion === 1
				: transformVersion === 0;
		if (!knownVersion) return issue("BAD_TABLE_DIRECTORY");
		const transformed = isGlyphTable ? transformVersion === 0 : transformVersion !== 0;
		let streamLength = original.value;
		if (transformed) {
			const transformedLength = readBase128(view, offset);
			if (!transformedLength) return issue("BAD_TABLE_DIRECTORY");
			offset = transformedLength.next;
			streamLength = transformedLength.value;
		}

		tables.push({ tag, originalLength: original.value, streamLength });
	}

	// The compressed stream must sit wholly inside the file.
	if (compressedLength === 0 || offset + compressedLength > view.byteLength) {
		return issue("BAD_TABLE_DIRECTORY");
	}
	return { tables, compressedStart: offset, compressedLength };
}

// ============================================================================
// WOFF (https://www.w3.org/TR/WOFF/)
// ============================================================================

function parseWoff(view: DataView): TableRecord[] | FontValidationIssue {
	if (view.byteLength < WOFF_HEADER_SIZE) return issue("TRUNCATED");
	if (view.getUint32(8) !== view.byteLength) return issue("BAD_LENGTH");

	const numTables = view.getUint16(12);
	if (numTables === 0 || numTables > MAX_TABLES) return issue("BAD_TABLE_COUNT");
	if (view.getUint16(14) !== 0) return issue("BAD_TABLE_DIRECTORY"); // reserved must be zero

	const directoryEnd = WOFF_HEADER_SIZE + numTables * WOFF_TABLE_RECORD_SIZE;
	if (directoryEnd > view.byteLength) return issue("BAD_TABLE_DIRECTORY");

	const tables: TableRecord[] = [];
	for (let i = 0; i < numTables; i++) {
		const at = WOFF_HEADER_SIZE + i * WOFF_TABLE_RECORD_SIZE;
		const offset = view.getUint32(at + 4);
		const storedLength = view.getUint32(at + 8);
		const originalLength = view.getUint32(at + 12);
		const insideFile = offset >= directoryEnd && offset + storedLength <= view.byteLength;
		// Stored data is either deflated (shorter) or raw (equal); never longer than the original.
		if (!insideFile || storedLength > originalLength || offset % 4 !== 0) {
			return issue("BAD_TABLE_DIRECTORY");
		}
		tables.push({ tag: tagAt(view, at), offset, storedLength, originalLength });
	}
	return tables;
}

// ============================================================================
// DECOMPRESSION
// ============================================================================

/** Bytes backed by a plain ArrayBuffer, which is what the compression streams accept. */
type Bytes = Uint8Array<ArrayBuffer>;

class FontDataError extends Error {
	constructor(readonly code: FontErrorCode) {
		super(FONT_ERRORS[code]);
	}
}

/** The runtime has no decoder for this format (as opposed to the data being bad). */
class UnsupportedDecoderError extends Error {}

/**
 * Inflate `data` and stop as soon as it grows past `expected` bytes, so a
 * crafted stream cannot be used to exhaust memory.
 */
async function inflate(data: Bytes, format: string, expected: number): Promise<Bytes> {
	let stream: DecompressionStream;
	try {
		// Brotli is not in Workers' typings and may not exist at runtime.
		stream = new DecompressionStream(format as "deflate");
	} catch {
		throw new UnsupportedDecoderError(format);
	}

	const writer = stream.writable.getWriter();
	// Pushing the input can reject if the stream errors first; the read side reports that.
	writer
		.write(data)
		.then(() => writer.close())
		.catch(() => {});

	const chunks: Uint8Array[] = [];
	let total = 0;
	const reader = stream.readable.getReader();
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > expected) {
				await reader.cancel();
				throw new FontDataError("TOO_LARGE_UNCOMPRESSED");
			}
			chunks.push(value);
		}
	} catch (error) {
		if (error instanceof FontDataError) throw error;
		throw new FontDataError("CORRUPT_TABLES");
	}

	const out = new Uint8Array(total);
	let at = 0;
	for (const chunk of chunks) {
		out.set(chunk, at);
		at += chunk.byteLength;
	}
	return out;
}

function checkDeclaredSizes(tables: TableRecord[]): void {
	const total = tables.reduce((sum, t) => sum + t.originalLength, 0);
	if (total > MAX_UNCOMPRESSED_FONT_SIZE) throw new FontDataError("TOO_LARGE_UNCOMPRESSED");
}

/** Read one table's raw bytes out of a WOFF file. */
async function readWoffTable(bytes: Bytes, table: TableRecord): Promise<Uint8Array> {
	const stored = bytes.subarray(table.offset!, table.offset! + table.storedLength!);
	if (table.storedLength === table.originalLength) return stored;
	const data = await inflate(stored, "deflate", table.originalLength);
	if (data.byteLength !== table.originalLength) throw new FontDataError("CORRUPT_TABLES");
	return data;
}

/** Read one table's raw bytes out of a WOFF2 file's single Brotli stream. */
async function readWoff2Table(
	bytes: Bytes,
	layout: Woff2Layout,
	tag: string,
): Promise<Uint8Array | undefined> {
	const target = layout.tables.find((t) => t.tag === tag);
	if (!target) return undefined;
	// A transformed table cannot be read without undoing the transform.
	if (target.streamLength !== target.originalLength) return undefined;

	// The stream's own declared size is what bounds the read, so cap it here as well:
	// a directory can declare a huge transformed length that `originalLength` never shows.
	const expected = layout.tables.reduce((sum, t) => sum + t.streamLength, 0);
	if (expected > MAX_UNCOMPRESSED_FONT_SIZE) throw new FontDataError("TOO_LARGE_UNCOMPRESSED");
	const stream = await inflate(
		bytes.subarray(layout.compressedStart, layout.compressedStart + layout.compressedLength),
		"brotli",
		expected,
	);
	if (stream.byteLength !== expected) throw new FontDataError("CORRUPT_TABLES");

	let start = 0;
	for (const table of layout.tables) {
		if (table === target) return stream.subarray(start, start + table.originalLength);
		start += table.streamLength;
	}
	return undefined;
}

// ============================================================================
// CHARACTER MAP (https://learn.microsoft.com/typography/opentype/spec/cmap)
// ============================================================================

type CoverageCheck = (codepoint: number) => boolean;

/** Does a format 4 (BMP segment mapping) subtable map this code point to a real glyph? */
function format4Lookup(view: DataView, start: number): CoverageCheck | undefined {
	if (start + 14 > view.byteLength) return undefined;
	const segCount = view.getUint16(start + 6) / 2;
	const endCodes = start + 14;
	const startCodes = endCodes + segCount * 2 + 2;
	const idDeltas = startCodes + segCount * 2;
	const idRangeOffsets = idDeltas + segCount * 2;
	if (idRangeOffsets + segCount * 2 > view.byteLength) return undefined;

	return (cp) => {
		if (cp > 0xffff) return false;
		for (let i = 0; i < segCount; i++) {
			if (view.getUint16(endCodes + i * 2) < cp) continue;
			if (view.getUint16(startCodes + i * 2) > cp) return false;
			const delta = view.getUint16(idDeltas + i * 2);
			const rangeOffset = view.getUint16(idRangeOffsets + i * 2);
			if (rangeOffset === 0) return ((cp + delta) & 0xffff) !== 0;
			const glyphAt =
				idRangeOffsets + i * 2 + rangeOffset + (cp - view.getUint16(startCodes + i * 2)) * 2;
			if (glyphAt + 2 > view.byteLength) return false;
			const glyph = view.getUint16(glyphAt);
			return glyph !== 0 && ((glyph + delta) & 0xffff) !== 0;
		}
		return false;
	};
}

/** Does a format 12 (segmented coverage) subtable map this code point to a real glyph? */
function format12Lookup(view: DataView, start: number): CoverageCheck | undefined {
	if (start + 16 > view.byteLength) return undefined;
	const numGroups = view.getUint32(start + 12);
	const groups = start + 16;
	if (groups + numGroups * 12 > view.byteLength) return undefined;

	return (cp) => {
		for (let i = 0; i < numGroups; i++) {
			const at = groups + i * 12;
			if (cp < view.getUint32(at) || cp > view.getUint32(at + 4)) continue;
			return view.getUint32(at + 8) + (cp - view.getUint32(at)) !== 0;
		}
		return false;
	};
}

/**
 * Build a lookup from the best Unicode subtable in a `cmap`, preferring the
 * full-range format 12 over the BMP-only format 4.
 */
function cmapLookup(cmap: Uint8Array): CoverageCheck | undefined {
	const view = new DataView(cmap.buffer, cmap.byteOffset, cmap.byteLength);
	if (view.byteLength < 4) return undefined;
	const numRecords = view.getUint16(2);
	if (4 + numRecords * 8 > view.byteLength) return undefined;

	const lookups: Partial<Record<12 | 4, CoverageCheck>> = {};
	for (let i = 0; i < numRecords; i++) {
		const platform = view.getUint16(4 + i * 8);
		const encoding = view.getUint16(6 + i * 8);
		const offset = view.getUint32(8 + i * 8);
		// Unicode platform (0), or Windows (3) with Unicode BMP (1) / full (10).
		const isUnicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
		if (!isUnicode || offset + 2 > view.byteLength) continue;

		const format = view.getUint16(offset);
		if (format === 4 && !lookups[4]) lookups[4] = format4Lookup(view, offset);
		if (format === 12 && !lookups[12]) lookups[12] = format12Lookup(view, offset);
	}
	return lookups[12] ?? lookups[4];
}

function describeMissing(has: CoverageCheck): string[] {
	const missing: string[] = [];
	if (!MIN_COVERAGE.digits.every(has)) missing.push("digits 0-9");
	if (!MIN_COVERAGE.letters.some((set) => set.every(has))) missing.push("Latin letters A-Z or a-z");
	return missing;
}

/** Check a font's character map against {@link MIN_COVERAGE}. */
function checkCoverage(cmap: Uint8Array): FontValidationIssue | undefined {
	const has = cmapLookup(cmap);
	if (!has) return issue("NO_CHARACTER_MAP");
	const missing = describeMissing(has);
	return missing.length > 0 ? issue("MISSING_CHARACTERS", missing) : undefined;
}

// ============================================================================
// PUBLIC API
// ============================================================================

const COVERAGE_UNVERIFIED_WARNING =
	"Character coverage could not be verified: this runtime cannot read the font's character map.";

/**
 * Validate a font file. Accepts WOFF2 and WOFF; recognises TTF, OTF and TTC so
 * the error can tell the Wanderer to convert them.
 */
export async function validateFont(file: ArrayBuffer): Promise<FontValidationResult> {
	if (file.byteLength > MAX_FONT_SIZE) return failure(undefined, issue("TOO_LARGE"));

	const view = new DataView(file);
	const format = detectFormat(view);
	if (!format) {
		return failure(undefined, issue(view.byteLength < 4 ? "TRUNCATED" : "UNKNOWN_FORMAT"));
	}
	if (format === "woff2") return validateWoff2Structure(file, view);
	if (format === "woff") return validateWoffStructure(file, view);
	return failure(format, issue("UNSUPPORTED_FORMAT"));
}

/**
 * Validate a WOFF2 font file
 */
export async function validateWoff2(file: ArrayBuffer): Promise<FontValidationResult> {
	if (file.byteLength > MAX_FONT_SIZE) return failure(undefined, issue("TOO_LARGE"));
	const view = new DataView(file);
	if (detectFormat(view) !== "woff2") return failure(undefined, issue("NOT_WOFF2"));
	return validateWoff2Structure(file, view);
}

/**
 * Validate a WOFF font file (optional fallback)
 */
export async function validateWoff(file: ArrayBuffer): Promise<FontValidationResult> {
	if (file.byteLength > MAX_FONT_SIZE) return failure(undefined, issue("TOO_LARGE"));
	const view = new DataView(file);
	if (detectFormat(view) !== "woff") return failure(undefined, issue("NOT_WOFF"));
	return validateWoffStructure(file, view);
}

async function validateWoff2Structure(
	file: ArrayBuffer,
	view: DataView,
): Promise<FontValidationResult> {
	const layout = parseWoff2(view);
	if ("code" in layout) return failure("woff2", layout);

	const missing = missingTables(layout.tables);
	if (missing.length > 0) return failure("woff2", issue("MISSING_TABLES", missing));

	const warnings: string[] = [];
	try {
		checkDeclaredSizes(layout.tables);
		const cmap = await readWoff2Table(new Uint8Array(file), layout, "cmap");
		if (cmap) {
			const problem = checkCoverage(cmap);
			if (problem) return failure("woff2", problem);
		} else {
			warnings.push(COVERAGE_UNVERIFIED_WARNING);
		}
	} catch (error) {
		if (error instanceof FontDataError) return failure("woff2", issue(error.code));
		if (!(error instanceof UnsupportedDecoderError)) throw error;
		warnings.push(COVERAGE_UNVERIFIED_WARNING);
	}
	return success("woff2", warnings);
}

async function validateWoffStructure(
	file: ArrayBuffer,
	view: DataView,
): Promise<FontValidationResult> {
	const tables = parseWoff(view);
	if (!Array.isArray(tables)) return failure("woff", tables);

	const missing = missingTables(tables);
	if (missing.length > 0) return failure("woff", issue("MISSING_TABLES", missing));

	try {
		checkDeclaredSizes(tables);
		const cmapRecord = tables.find((t) => t.tag === "cmap")!;
		const problem = checkCoverage(await readWoffTable(new Uint8Array(file), cmapRecord));
		if (problem) return failure("woff", problem);
	} catch (error) {
		if (error instanceof FontDataError) return failure("woff", issue(error.code));
		if (!(error instanceof UnsupportedDecoderError)) throw error;
		return success("woff", [COVERAGE_UNVERIFIED_WARNING]);
	}
	return success("woff", []);
}

/**
 * Sanitize font family name for CSS usage
 */
export function sanitizeFontName(name: string): string {
	// Remove any potentially dangerous characters
	return name.replace(/[^a-zA-Z0-9\s-]/g, "").trim();
}
