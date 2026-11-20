// tests/font-validator.test.ts
// Font validation tests

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { brotliDecompressSync, deflateSync } from "node:zlib";
import {
	validateFont,
	validateWoff2,
	validateWoff,
	sanitizeFontName,
	FONT_ERRORS,
	MAX_FONT_SIZE,
	MAX_UNCOMPRESSED_FONT_SIZE,
} from "../src/lib/server/font-validator.js";
import {
	BASIC_LATIN,
	DIGITS,
	LOWERCASE,
	SFNT_CFF,
	UPPERCASE,
	buildTables,
	buildWoff,
	buildWoff2,
	makeTtf,
	makeWoff,
	makeWoff2,
	toArrayBuffer,
} from "./font-fixtures.js";

// A WOFF2 holds its tables in one Brotli stream, and DecompressionStream only learned "brotli" in
// Node 22. CI runs Node 20 (and Workers has no Brotli either), so without help every WOFF2 test that
// reads the stream would see the validator's "skip coverage, warn" path instead of the check it is
// meant to exercise. Where the runtime lacks Brotli, give the tests a decoder backed by node:zlib, so
// they run the same path everywhere. Where it has Brotli, the real one is used.
const NativeDecompressionStream = globalThis.DecompressionStream;
const runtimeHasBrotli = (() => {
	try {
		new NativeDecompressionStream("brotli" as never);
		return true;
	} catch {
		return false;
	}
})();

class DecompressionStreamWithBrotli {
	constructor(format: string) {
		if (format !== "brotli") return new NativeDecompressionStream(format as "deflate");
		const chunks: Uint8Array[] = [];
		return new TransformStream<Uint8Array, Uint8Array>({
			transform(chunk) {
				chunks.push(chunk);
			},
			flush(controller) {
				try {
					controller.enqueue(new Uint8Array(brotliDecompressSync(Buffer.concat(chunks))));
				} catch (error) {
					controller.error(error);
				}
			},
		});
	}
}

beforeEach(() => {
	if (!runtimeHasBrotli) vi.stubGlobal("DecompressionStream", DecompressionStreamWithBrotli);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("Font Validator", () => {
	describe("WOFF2 Validation", () => {
		it("should accept valid WOFF2 files", async () => {
			const result = await validateWoff2(toArrayBuffer(makeWoff2()));
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
			expect(result.errors).toEqual([]);
			expect(result.format).toBe("woff2");
			expect(result.warnings).toBeUndefined();
		});

		it("should reject files without WOFF2 signature", async () => {
			// Create buffer with wrong signature
			const buffer = new ArrayBuffer(100);
			const view = new Uint8Array(buffer);
			view[0] = 0x00;
			view[1] = 0x00;
			view[2] = 0x00;
			view[3] = 0x00;

			const result = await validateWoff2(buffer);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Invalid WOFF2 file format");
		});

		it("should reject files over 500KB", async () => {
			// Create buffer exceeding MAX_FONT_SIZE
			const buffer = new ArrayBuffer(MAX_FONT_SIZE + 1);
			const view = new Uint8Array(buffer);
			view[0] = 0x77; // 'w'
			view[1] = 0x4f; // 'O'
			view[2] = 0x46; // 'F'
			view[3] = 0x32; // '2'

			const result = await validateWoff2(buffer);
			expect(result.valid).toBe(false);
			expect(result.error).toBe(`File exceeds maximum size of ${MAX_FONT_SIZE / 1024}KB`);
		});
	});

	describe("WOFF Validation", () => {
		it("should accept valid WOFF files", async () => {
			const result = await validateWoff(toArrayBuffer(makeWoff()));
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
			expect(result.errors).toEqual([]);
			expect(result.format).toBe("woff");
		});

		it("should reject files without WOFF signature", async () => {
			// Create buffer with wrong signature
			const buffer = new ArrayBuffer(100);
			const view = new Uint8Array(buffer);
			view[0] = 0x00;
			view[1] = 0x00;
			view[2] = 0x00;
			view[3] = 0x00;

			const result = await validateWoff(buffer);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Invalid WOFF file format");
		});

		it("should reject files over 500KB", async () => {
			// Create buffer exceeding MAX_FONT_SIZE
			const buffer = new ArrayBuffer(MAX_FONT_SIZE + 1);
			const view = new Uint8Array(buffer);
			view[0] = 0x77; // 'w'
			view[1] = 0x4f; // 'O'
			view[2] = 0x46; // 'F'
			view[3] = 0x46; // 'F'

			const result = await validateWoff(buffer);
			expect(result.valid).toBe(false);
			expect(result.error).toBe(`File exceeds maximum size of ${MAX_FONT_SIZE / 1024}KB`);
		});
	});

	describe("Format detection (validateFont)", () => {
		it("accepts WOFF2 and WOFF and reports which it found", async () => {
			expect((await validateFont(toArrayBuffer(makeWoff2()))).format).toBe("woff2");
			expect((await validateFont(toArrayBuffer(makeWoff()))).format).toBe("woff");
			expect((await validateFont(toArrayBuffer(makeWoff2()))).valid).toBe(true);
			expect((await validateFont(toArrayBuffer(makeWoff()))).valid).toBe(true);
		});

		it.each([
			["TrueType", makeTtf(), "ttf"],
			["OpenType/CFF", makeTtf({ flavor: SFNT_CFF }), "otf"],
			[
				"a font collection",
				new Uint8Array([0x74, 0x74, 0x63, 0x66, 0, 1, 0, 0, 0, 0, 0, 1]),
				"ttc",
			],
		] as const)("recognises %s and asks for WOFF2 instead", async (_name, bytes, format) => {
			const result = await validateFont(toArrayBuffer(bytes));
			expect(result.valid).toBe(false);
			expect(result.format).toBe(format);
			expect(result.errors.map((e) => e.code)).toEqual(["UNSUPPORTED_FORMAT"]);
			expect(result.error).toBe(FONT_ERRORS.UNSUPPORTED_FORMAT);
		});

		it("rejects a file that is not a font at all", async () => {
			const html = new TextEncoder().encode("<!doctype html><title>nope</title>");
			const result = await validateFont(toArrayBuffer(html));
			expect(result.errors.map((e) => e.code)).toEqual(["UNKNOWN_FORMAT"]);
			expect(result.format).toBeUndefined();
		});

		it("rejects empty and tiny files", async () => {
			expect((await validateFont(new ArrayBuffer(0))).errors[0].code).toBe("TRUNCATED");
			expect((await validateFont(new ArrayBuffer(3))).errors[0].code).toBe("TRUNCATED");
		});

		it("rejects files over the size limit before looking inside", async () => {
			const result = await validateFont(new ArrayBuffer(MAX_FONT_SIZE + 1));
			expect(result.errors.map((e) => e.code)).toEqual(["TOO_LARGE"]);
		});

		it("returns structured errors whose first message is `error`", async () => {
			const result = await validateFont(toArrayBuffer(makeTtf()));
			expect(result.errors[0]).toEqual({
				code: "UNSUPPORTED_FORMAT",
				message: FONT_ERRORS.UNSUPPORTED_FORMAT,
			});
			expect(result.error).toBe(result.errors[0].message);
		});
	});

	describe("WOFF2 structure", () => {
		const codes = async (bytes: Uint8Array) =>
			(await validateWoff2(toArrayBuffer(bytes))).errors.map((e) => e.code);

		/** Patch the header's `length` field so a hand-trimmed file still matches its size. */
		const withHeaderLength = (bytes: Uint8Array) => {
			new DataView(bytes.buffer, bytes.byteOffset).setUint32(8, bytes.byteLength);
			return bytes;
		};

		it("rejects a file shorter than its header", async () => {
			const stub = new Uint8Array(20);
			stub.set([0x77, 0x4f, 0x46, 0x32]);
			expect(await codes(stub)).toEqual(["TRUNCATED"]);
		});

		it("rejects a header length that disagrees with the file", async () => {
			const bytes = makeWoff2();
			expect(await codes(bytes.subarray(0, bytes.length - 4))).toEqual(["BAD_LENGTH"]);
		});

		it("rejects zero tables", async () => {
			const bytes = makeWoff2();
			new DataView(bytes.buffer, bytes.byteOffset).setUint16(12, 0);
			expect(await codes(bytes)).toEqual(["BAD_TABLE_COUNT"]);
		});

		it("rejects an absurd table count", async () => {
			const bytes = makeWoff2();
			new DataView(bytes.buffer, bytes.byteOffset).setUint16(12, 60000);
			expect(await codes(bytes)).toEqual(["BAD_TABLE_COUNT"]);
		});

		it("rejects a table directory that runs off the end of the file", async () => {
			const bytes = withHeaderLength(makeWoff2().slice(0, 60));
			expect(await codes(bytes)).toEqual(["BAD_TABLE_DIRECTORY"]);
		});

		it("rejects a compressed stream longer than the file", async () => {
			const bytes = makeWoff2();
			new DataView(bytes.buffer, bytes.byteOffset).setUint32(20, bytes.length);
			expect(await codes(bytes)).toEqual(["BAD_TABLE_DIRECTORY"]);
		});

		it("names the required tables that are missing", async () => {
			const result = await validateWoff2(toArrayBuffer(makeWoff2({ omit: ["maxp", "name"] })));
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].code).toBe("MISSING_TABLES");
			expect(result.errors[0].details).toEqual(["maxp", "name"]);
		});

		it("requires outlines, but accepts either glyf+loca or CFF", async () => {
			const noOutlines = await validateWoff2(toArrayBuffer(makeWoff2({ omit: ["glyf", "loca"] })));
			expect(noOutlines.errors[0].details).toEqual(["glyf+loca or CFF"]);

			const cff = await validateWoff2(toArrayBuffer(makeWoff2({ flavor: SFNT_CFF })));
			expect(cff.valid).toBe(true);
		});

		it("rejects a Brotli stream that cannot be decoded", async () => {
			const bytes = makeWoff2();
			bytes.fill(0xff, bytes.length - 16);
			expect(await codes(bytes)).toEqual(["CORRUPT_TABLES"]);
		});

		it("rejects a stream that decodes to a different size than the directory declares", async () => {
			const tables = buildTables();
			const short = new Uint8Array(8).fill(1);
			const result = await validateWoff2(toArrayBuffer(buildWoff2(tables, undefined, short)));
			expect(result.errors.map((e) => e.code)).toEqual(["CORRUPT_TABLES"]);
		});

		it("stops reading a stream that expands past what it declared", async () => {
			const tables = buildTables();
			const bomb = new Uint8Array(4 * 1024 * 1024); // 4MB of zeros compresses to almost nothing
			const bytes = buildWoff2(tables, undefined, bomb);
			expect(bytes.length).toBeLessThan(MAX_FONT_SIZE);
			expect(await codes(bytes)).toEqual(["TOO_LARGE_UNCOMPRESSED"]);
		});

		it("rejects a directory that declares more data than is allowed", async () => {
			const tables = buildTables();
			tables[0] = { ...tables[0], data: new Uint8Array(MAX_UNCOMPRESSED_FONT_SIZE + 1) };
			const bytes = buildWoff2(tables, undefined, new Uint8Array(16));
			expect(await codes(bytes)).toEqual(["TOO_LARGE_UNCOMPRESSED"]);
		});

		it("finds the cmap after tables whose stream length differs from their original", async () => {
			const tables = buildTables();
			const take = (tag: string) =>
				tables.splice(
					tables.findIndex((t) => t.tag === tag),
					1,
				)[0];
			// Transformed glyf is smaller than the original; transformed loca is empty. Both
			// come before cmap in the stream, so a wrong offset would read garbage as the cmap.
			const glyf = { ...take("glyf"), transformed: new Uint8Array(5).fill(7) };
			const loca = { ...take("loca"), transformed: new Uint8Array(0) };
			const bytes = buildWoff2([glyf, loca, ...tables]);
			const result = await validateWoff2(toArrayBuffer(bytes));
			expect(result.errors).toEqual([]);
			expect(result.valid).toBe(true);
			expect(result.warnings).toBeUndefined();
		});

		it("rejects a directory whose transformed length alone exceeds the limit", async () => {
			const tables = buildTables();
			const glyf = tables.find((t) => t.tag === "glyf")!;
			glyf.transformed = new Uint8Array(MAX_UNCOMPRESSED_FONT_SIZE + 1);
			const bytes = buildWoff2(tables);
			expect(bytes.length).toBeLessThan(MAX_FONT_SIZE);
			expect(await codes(bytes)).toEqual(["TOO_LARGE_UNCOMPRESSED"]);
		});

		it("accepts the only other transform the spec defines: a transformed hmtx", async () => {
			const tables = buildTables();
			const hmtx = tables.find((t) => t.tag === "hmtx")!;
			hmtx.transformed = new Uint8Array(6).fill(9);
			const result = await validateWoff2(toArrayBuffer(buildWoff2(tables)));
			expect(result.valid).toBe(true);
			expect(result.warnings).toBeUndefined();
		});

		it("rejects an undefined transform version instead of skipping the coverage check", async () => {
			// §4.1: an unknown version means the font must be rejected. Before this guard a
			// `cmap` claiming one looked transformed, so its bytes were never read for coverage.
			const tables = buildTables({ codepoints: [] });
			const cmap = tables.find((t) => t.tag === "cmap")!;
			cmap.transformed = new Uint8Array(8).fill(3);
			cmap.transformVersion = 1;
			expect(await codes(buildWoff2(tables))).toEqual(["BAD_TABLE_DIRECTORY"]);
		});

		it("rejects a glyf transform version that does not exist", async () => {
			const tables = buildTables();
			const glyf = tables.find((t) => t.tag === "glyf")!;
			glyf.transformVersion = 1;
			expect(await codes(buildWoff2(tables))).toEqual(["BAD_TABLE_DIRECTORY"]);
		});

		it("accepts the file with a warning when the runtime has no Brotli decoder", async () => {
			const RealStream = globalThis.DecompressionStream;
			vi.stubGlobal(
				"DecompressionStream",
				class {
					constructor(format: string) {
						if (format === "brotli") throw new TypeError("Unsupported compression format");
						return new RealStream(format as "deflate");
					}
				},
			);
			try {
				const result = await validateWoff2(toArrayBuffer(makeWoff2({ codepoints: [] })));
				// Coverage cannot be read, so even a font with no characters passes structure.
				expect(result.valid).toBe(true);
				expect(result.warnings).toHaveLength(1);
				expect(result.warnings![0]).toMatch(/coverage could not be verified/i);
			} finally {
				vi.unstubAllGlobals();
			}
		});
	});

	describe("WOFF structure", () => {
		const codes = async (bytes: Uint8Array) =>
			(await validateWoff(toArrayBuffer(bytes))).errors.map((e) => e.code);

		it("rejects a file shorter than its header", async () => {
			const stub = new Uint8Array(20);
			stub.set([0x77, 0x4f, 0x46, 0x46]);
			expect(await codes(stub)).toEqual(["TRUNCATED"]);
		});

		it("rejects a header length that disagrees with the file", async () => {
			const bytes = makeWoff();
			expect(await codes(bytes.subarray(0, bytes.length - 4))).toEqual(["BAD_LENGTH"]);
		});

		it("rejects zero tables", async () => {
			const bytes = makeWoff();
			new DataView(bytes.buffer, bytes.byteOffset).setUint16(12, 0);
			expect(await codes(bytes)).toEqual(["BAD_TABLE_COUNT"]);
		});

		it("rejects a non-zero reserved field", async () => {
			const bytes = makeWoff();
			new DataView(bytes.buffer, bytes.byteOffset).setUint16(14, 1);
			expect(await codes(bytes)).toEqual(["BAD_TABLE_DIRECTORY"]);
		});

		it("rejects a table that points outside the file", async () => {
			const bytes = makeWoff();
			// First record's offset field sits at 44 + 4.
			new DataView(bytes.buffer, bytes.byteOffset).setUint32(48, bytes.length + 100);
			expect(await codes(bytes)).toEqual(["BAD_TABLE_DIRECTORY"]);
		});

		it("rejects a table stored longer than its original", async () => {
			const bytes = makeWoff();
			const view = new DataView(bytes.buffer, bytes.byteOffset);
			view.setUint32(52, view.getUint32(56) + 4); // storedLength > originalLength
			expect(await codes(bytes)).toEqual(["BAD_TABLE_DIRECTORY"]);
		});

		it("names the required tables that are missing", async () => {
			const result = await validateWoff(toArrayBuffer(makeWoff({ omit: ["cmap", "hhea"] })));
			expect(result.errors[0].code).toBe("MISSING_TABLES");
			expect(result.errors[0].details).toEqual(["cmap", "hhea"]);
		});

		it("rejects a cmap that cannot be inflated", async () => {
			const tables = buildTables();
			const cmap = tables.find((t) => t.tag === "cmap")!;
			// Shorter than the original, so it is treated as deflated, but it is noise.
			const noise = new Uint8Array(cmap.data.length - 2).fill(0xee);
			const bytes = buildWoff(tables, undefined, { cmap: noise });
			expect(await codes(bytes)).toEqual(["CORRUPT_TABLES"]);
		});

		it("rejects a cmap that inflates to a different size than declared", async () => {
			const tables = buildTables();
			const wrong = deflateSync(new Uint8Array(4));
			const bytes = buildWoff(tables, undefined, { cmap: wrong });
			expect(await codes(bytes)).toEqual(["CORRUPT_TABLES"]);
		});

		it("stops inflating a cmap that expands past its declared size", async () => {
			const tables = buildTables();
			const bomb = deflateSync(new Uint8Array(4 * 1024 * 1024));
			// Declare a cmap big enough to hold the compressed bytes, so the structure
			// check passes and only the real expansion gives it away.
			const cmap = tables.find((t) => t.tag === "cmap")!;
			cmap.data = new Uint8Array(bomb.length + 16);
			const bytes = buildWoff(tables, undefined, { cmap: bomb });
			expect(await codes(bytes)).toEqual(["TOO_LARGE_UNCOMPRESSED"]);
		});
	});

	describe("Character coverage", () => {
		const wrappers = [
			["WOFF2", makeWoff2, validateWoff2],
			["WOFF", makeWoff, validateWoff],
		] as const;

		describe.each(wrappers)("%s", (_name, make, validate) => {
			const check = (codepoints: number[], cmapFormat?: 4 | 12 | "4-indirect") =>
				validate(toArrayBuffer(make({ codepoints, cmapFormat })));

			it("accepts digits plus both letter cases", async () => {
				expect((await check(BASIC_LATIN)).valid).toBe(true);
			});

			it("accepts an uppercase-only display face", async () => {
				expect((await check([...DIGITS, ...UPPERCASE])).valid).toBe(true);
			});

			it("accepts a lowercase-only face", async () => {
				expect((await check([...DIGITS, ...LOWERCASE])).valid).toBe(true);
			});

			it("rejects a font with no digits", async () => {
				const result = await check([...LOWERCASE, ...UPPERCASE]);
				expect(result.errors).toEqual([
					{
						code: "MISSING_CHARACTERS",
						message: FONT_ERRORS.MISSING_CHARACTERS,
						details: ["digits 0-9"],
					},
				]);
			});

			it("rejects a font with no letters", async () => {
				const result = await check(DIGITS);
				expect(result.errors[0].details).toEqual(["Latin letters A-Z or a-z"]);
			});

			it("rejects an alphabet with one letter missing", async () => {
				// Both cases are one short, so neither case is complete.
				const result = await check([...DIGITS, ...LOWERCASE.slice(1), ...UPPERCASE.slice(1)]);
				expect(result.errors[0].details).toEqual(["Latin letters A-Z or a-z"]);
			});

			it("reports every group that is missing", async () => {
				const result = await check([0x20]);
				expect(result.errors[0].details).toEqual(["digits 0-9", "Latin letters A-Z or a-z"]);
			});

			it("reads format 12 subtables", async () => {
				expect((await check(BASIC_LATIN, 12)).valid).toBe(true);
				expect((await check(DIGITS, 12)).valid).toBe(false);
			});

			it("reads format 4 segments that look glyphs up through idRangeOffset", async () => {
				// Non-contiguous runs force several segments, each with its own glyph slice.
				const sparse = [...DIGITS, ...LOWERCASE, ...UPPERCASE, 0x20, 0x2e];
				expect((await check(sparse, "4-indirect")).valid).toBe(true);
				expect(
					(await check([...DIGITS, ...LOWERCASE.slice(1)], "4-indirect")).errors[0].details,
				).toEqual(["Latin letters A-Z or a-z"]);
				expect((await check([...LOWERCASE, ...UPPERCASE], "4-indirect")).errors[0].details).toEqual(
					["digits 0-9"],
				);
			});

			it("is not fooled by characters beyond the Basic Latin block", async () => {
				// Plenty of glyphs, none of the ones that are required.
				const cyrillic = Array.from({ length: 64 }, (_, i) => 0x0410 + i);
				expect((await check(cyrillic)).errors[0].code).toBe("MISSING_CHARACTERS");
			});

			it("rejects a cmap with no Unicode subtable", async () => {
				const tables = buildTables();
				const cmap = tables.find((t) => t.tag === "cmap")!;
				cmap.data = new Uint8Array([0, 0, 0, 0]); // version 0, zero encoding records
				const bytes = make === makeWoff2 ? buildWoff2(tables) : buildWoff(tables);
				expect((await validate(toArrayBuffer(bytes))).errors.map((e) => e.code)).toEqual([
					"NO_CHARACTER_MAP",
				]);
			});

			it("rejects a cmap whose records run past the table", async () => {
				const tables = buildTables();
				const cmap = tables.find((t) => t.tag === "cmap")!;
				cmap.data = new Uint8Array([0, 0, 0xff, 0xff]); // claims 65535 records
				const bytes = make === makeWoff2 ? buildWoff2(tables) : buildWoff(tables);
				expect((await validate(toArrayBuffer(bytes))).errors[0].code).toBe("NO_CHARACTER_MAP");
			});
		});
	});

	describe("Font Name Sanitization", () => {
		it("should preserve alphanumeric characters", () => {
			const result = sanitizeFontName("Arial123");
			expect(result).toBe("Arial123");
		});

		it("should preserve spaces and hyphens", () => {
			const result = sanitizeFontName("Open Sans-Bold");
			expect(result).toBe("Open Sans-Bold");
		});

		it("should remove special characters", () => {
			const result = sanitizeFontName("Font<script>");
			expect(result).toBe("Fontscript");
		});

		it("should trim whitespace", () => {
			const result = sanitizeFontName("  Font  ");
			expect(result).toBe("Font");
		});
	});
});
