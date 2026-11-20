// tests/font-fixtures.ts
// Builds small but structurally valid fonts for validator tests.
//
// The fonts have no real outlines. They carry exactly the tables the validator
// reads (a working `cmap`) plus empty stand-ins for the rest, wrapped as raw
// sfnt (TTF/OTF), WOFF (zlib per table) or WOFF2 (one Brotli stream, no table
// transforms, which the spec allows).

import { brotliCompressSync, deflateSync } from "node:zlib";

export const SFNT_TRUETYPE = 0x00010000;
export const SFNT_CFF = 0x4f54544f; // 'OTTO'

export const DIGITS = Array.from("0123456789", (c) => c.codePointAt(0)!);
export const LOWERCASE = Array.from("abcdefghijklmnopqrstuvwxyz", (c) => c.codePointAt(0)!);
export const UPPERCASE = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ", (c) => c.codePointAt(0)!);
export const BASIC_LATIN = [...DIGITS, ...LOWERCASE, ...UPPERCASE];

export interface FontTable {
	tag: string;
	data: Uint8Array;
	/**
	 * WOFF2 only: the table as it sits in the stream after a transform. The directory
	 * then declares both lengths, and the stream carries these bytes instead of `data`.
	 */
	transformed?: Uint8Array;
}

export interface FixtureOptions {
	/** Code points the `cmap` maps to a glyph. Defaults to digits and both letter cases. */
	codepoints?: number[];
	/**
	 * `cmap` subtable format: 4 (BMP), 12 (full range), or "4-indirect", a format 4
	 * whose segments all look glyphs up through `idRangeOffset` (as most real fonts do).
	 */
	cmapFormat?: 4 | 12 | "4-indirect";
	/** Tags to leave out, to exercise the required-table check. */
	omit?: string[];
	/** sfnt version of the wrapped font. */
	flavor?: number;
}

// --- byte helpers -----------------------------------------------------------

function u16(value: number): number[] {
	return [(value >> 8) & 0xff, value & 0xff];
}

function u32(value: number): number[] {
	return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function ascii(tag: string): number[] {
	return Array.from(tag, (c) => c.charCodeAt(0));
}

function concat(...parts: ArrayLike<number>[]): Uint8Array {
	const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
	let at = 0;
	for (const part of parts) {
		out.set(part, at);
		at += part.length;
	}
	return out;
}

function pad4(bytes: Uint8Array): Uint8Array {
	const padding = (4 - (bytes.length % 4)) % 4;
	return padding === 0 ? bytes : concat(bytes, new Uint8Array(padding));
}

// --- cmap -------------------------------------------------------------------

/** Group sorted code points into runs of consecutive values. */
function toRuns(codepoints: number[]): Array<[number, number]> {
	const runs: Array<[number, number]> = [];
	for (const cp of [...new Set(codepoints)].sort((a, b) => a - b)) {
		const last = runs[runs.length - 1];
		if (last && cp === last[1] + 1) last[1] = cp;
		else runs.push([cp, cp]);
	}
	return runs;
}

function cmapFormat4(codepoints: number[]): Uint8Array {
	const runs = toRuns(codepoints);
	const segments = [...runs, [0xffff, 0xffff] as [number, number]];
	const segCount = segments.length;
	const ends = segments.flatMap(([, end]) => u16(end));
	const starts = segments.flatMap(([start]) => u16(start));
	let glyph = 1;
	const deltas = segments.flatMap(([start, end]) => {
		if (start === 0xffff) return u16(1);
		const delta = (glyph - start) & 0xffff;
		glyph += end - start + 1;
		return u16(delta);
	});
	const rangeOffsets = segments.flatMap(() => u16(0));
	const length = 16 + segCount * 8;
	return concat(
		u16(4),
		u16(length),
		u16(0),
		u16(segCount * 2),
		u16(0),
		u16(0),
		u16(0),
		ends,
		u16(0), // reservedPad
		starts,
		deltas,
		rangeOffsets,
	);
}

function cmapFormat4Indirect(codepoints: number[]): Uint8Array {
	const runs = toRuns(codepoints);
	const segments = [...runs, [0xffff, 0xffff] as [number, number]];
	const segCount = segments.length;
	const ends = segments.flatMap(([, end]) => u16(end));
	const starts = segments.flatMap(([start]) => u16(start));
	const deltas = segments.flatMap(([start]) => u16(start === 0xffff ? 1 : 0));

	// Each real segment owns a slice of the glyph array; offsets are measured from
	// the segment's own idRangeOffset entry, so earlier segments push them further out.
	const glyphIds: number[] = [];
	let nextGlyph = 1;
	const rangeOffsets = segments.flatMap(([start, end], i) => {
		if (start === 0xffff) return u16(0);
		const offset = (segCount - i) * 2 + glyphIds.length * 2;
		for (let cp = start; cp <= end; cp++) glyphIds.push(nextGlyph++);
		return u16(offset);
	});
	const glyphArray = glyphIds.flatMap((id) => u16(id));
	const length = 16 + segCount * 8 + glyphArray.length;
	return concat(
		u16(4),
		u16(length),
		u16(0),
		u16(segCount * 2),
		u16(0),
		u16(0),
		u16(0),
		ends,
		u16(0), // reservedPad
		starts,
		deltas,
		rangeOffsets,
		glyphArray,
	);
}

function cmapFormat12(codepoints: number[]): Uint8Array {
	const runs = toRuns(codepoints);
	let glyph = 1;
	const groups = runs.flatMap(([start, end]) => {
		const group = [...u32(start), ...u32(end), ...u32(glyph)];
		glyph += end - start + 1;
		return group;
	});
	return concat(u16(12), u16(0), u32(16 + runs.length * 12), u32(0), u32(runs.length), groups);
}

export function buildCmap(codepoints: number[], format: 4 | 12 | "4-indirect" = 4): Uint8Array {
	const subtable =
		format === 12
			? cmapFormat12(codepoints)
			: format === 4
				? cmapFormat4(codepoints)
				: cmapFormat4Indirect(codepoints);
	const platformEncoding = format === 12 ? [...u16(3), ...u16(10)] : [...u16(3), ...u16(1)];
	// header(4) + one encoding record(8) puts the subtable at offset 12
	return concat(u16(0), u16(1), platformEncoding, u32(12), subtable);
}

// --- tables -----------------------------------------------------------------

const CORE_TABLES = ["head", "hhea", "hmtx", "maxp", "name", "OS/2", "post"];

export function buildTables(options: FixtureOptions = {}): FontTable[] {
	const { codepoints = BASIC_LATIN, cmapFormat = 4, omit = [], flavor = SFNT_TRUETYPE } = options;
	const outlines = flavor === SFNT_CFF ? ["CFF "] : ["glyf", "loca"];
	const tags = ["cmap", ...CORE_TABLES, ...outlines].filter((tag) => !omit.includes(tag));
	return tags
		.map((tag) => ({
			tag,
			data: tag === "cmap" ? buildCmap(codepoints, cmapFormat) : new Uint8Array(16).fill(1),
		}))
		.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
}

// --- wrappers ---------------------------------------------------------------

export function buildSfnt(tables: FontTable[], flavor = SFNT_TRUETYPE): Uint8Array {
	let offset = 12 + tables.length * 16;
	const records: number[][] = [];
	const bodies: Uint8Array[] = [];
	for (const { tag, data } of tables) {
		records.push([...ascii(tag), ...u32(0), ...u32(offset), ...u32(data.length)]);
		const padded = pad4(data);
		bodies.push(padded);
		offset += padded.length;
	}
	return concat(u32(flavor), u16(tables.length), u16(0), u16(0), u16(0), ...records, ...bodies);
}

/**
 * `storedOverrides` swaps the stored bytes of a table while its declared
 * original length stays put, which is how the tests forge hostile files.
 */
export function buildWoff(
	tables: FontTable[],
	flavor = SFNT_TRUETYPE,
	storedOverrides: Record<string, Uint8Array> = {},
): Uint8Array {
	const headerSize = 44;
	let offset = headerSize + tables.length * 20;
	const records: number[][] = [];
	const bodies: Uint8Array[] = [];
	let sfntSize = 12 + tables.length * 16;
	for (const { tag, data } of tables) {
		const deflated = deflateSync(data);
		const stored = storedOverrides[tag] ?? (deflated.length < data.length ? deflated : data);
		records.push([
			...ascii(tag),
			...u32(offset),
			...u32(stored.length),
			...u32(data.length),
			...u32(0),
		]);
		const padded = pad4(stored);
		bodies.push(padded);
		offset += padded.length;
		sfntSize += pad4(data).length;
	}
	const header = concat(
		ascii("wOFF"),
		u32(flavor),
		u32(offset),
		u16(tables.length),
		u16(0),
		u32(sfntSize),
		u16(1),
		u16(0),
		u32(0),
		u32(0),
		u32(0),
		u32(0),
		u32(0),
	);
	return concat(header, ...records, ...bodies);
}

// WOFF2 known-tag table (W3C WOFF2 §5.1). Index 63 means "tag follows".
// prettier-ignore
const WOFF2_KNOWN_TAGS = [
	"cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ", "fpgm", "glyf", "loca",
	"prep", "CFF ", "VORG", "EBDT", "EBLC", "gasp", "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea",
	"vmtx", "BASE", "GDEF", "GPOS", "GSUB", "EBSC", "JSTF", "MATH", "CBDT", "CBLC", "COLR", "CPAL",
	"SVG ", "sbix", "acnt", "avar", "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar",
	"gvar", "hsty", "just", "lcar", "mort", "morx", "opbd", "prop", "trak", "Zapf", "Silf", "Glat",
	"Gloc", "Feat", "Sill",
];

function uintBase128(value: number): number[] {
	const bytes = [value & 0x7f];
	let rest = value >>> 7;
	while (rest > 0) {
		bytes.unshift((rest & 0x7f) | 0x80);
		rest >>>= 7;
	}
	return bytes;
}

/**
 * `streamOverride` replaces what gets Brotli-compressed, while the directory
 * still declares the real table lengths.
 */
export function buildWoff2(
	tables: FontTable[],
	flavor = SFNT_TRUETYPE,
	streamOverride?: Uint8Array,
): Uint8Array {
	const directory: number[] = [];
	for (const { tag, data, transformed } of tables) {
		const index = WOFF2_KNOWN_TAGS.indexOf(tag);
		// glyf/loca: version 0 is transformed, 3 is not. Every other table: 0 is not transformed.
		const isGlyphTable = tag === "glyf" || tag === "loca";
		const transformVersion = transformed ? (isGlyphTable ? 0 : 1) : isGlyphTable ? 3 : 0;
		directory.push(((transformVersion << 6) | (index === -1 ? 63 : index)) & 0xff);
		if (index === -1) directory.push(...ascii(tag));
		directory.push(...uintBase128(data.length));
		if (transformed) directory.push(...uintBase128(transformed.length));
	}
	const compressed = brotliCompressSync(
		Buffer.from(streamOverride ?? concat(...tables.map((t) => t.transformed ?? t.data))),
	);
	const headerSize = 48;
	const body = concat(directory, compressed);
	const totalLength = pad4(concat(new Uint8Array(headerSize), body)).length;
	const header = concat(
		ascii("wOF2"),
		u32(flavor),
		u32(totalLength),
		u16(tables.length),
		u16(0),
		u32(12 + tables.length * 16 + tables.reduce((n, t) => n + pad4(t.data).length, 0)),
		u32(compressed.length),
		u16(1),
		u16(0),
		u32(0),
		u32(0),
		u32(0),
		u32(0),
		u32(0),
	);
	return pad4(concat(header, body));
}

// --- one-call helpers -------------------------------------------------------

export const makeTtf = (options?: FixtureOptions) =>
	buildSfnt(buildTables(options), options?.flavor ?? SFNT_TRUETYPE);
export const makeWoff = (options?: FixtureOptions) =>
	buildWoff(buildTables(options), options?.flavor ?? SFNT_TRUETYPE);
export const makeWoff2 = (options?: FixtureOptions) =>
	buildWoff2(buildTables(options), options?.flavor ?? SFNT_TRUETYPE);

/** A standalone ArrayBuffer copy, which is what the validators take. */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
