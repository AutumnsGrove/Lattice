import { describe, it, expect, vi } from "vitest";
import {
	formatSqlValue,
	formatBytes,
	generateJobId,
	getUnixTimestamp,
	formatDate,
	calculateExpirationTimestamp,
} from "./utils";

describe("formatSqlValue", () => {
	it("converts null to NULL", () => {
		expect(formatSqlValue(null)).toBe("NULL");
	});

	it("converts number to string", () => {
		expect(formatSqlValue(42)).toBe("42");
		expect(formatSqlValue(0)).toBe("0");
		expect(formatSqlValue(-100)).toBe("-100");
		expect(formatSqlValue(3.14)).toBe("3.14");
	});

	it("converts boolean true to 1", () => {
		expect(formatSqlValue(true)).toBe("1");
	});

	it("converts boolean false to 0", () => {
		expect(formatSqlValue(false)).toBe("0");
	});

	it("converts Uint8Array to hex format", () => {
		const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
		expect(formatSqlValue(bytes)).toBe("X'48656c6c6f'");
	});

	it("handles single-byte hex conversion in Uint8Array", () => {
		const bytes = new Uint8Array([0x0f, 0x10, 0xff]);
		expect(formatSqlValue(bytes)).toBe("X'0f10ff'");
	});

	it("converts empty Uint8Array", () => {
		const bytes = new Uint8Array([]);
		expect(formatSqlValue(bytes)).toBe("X''");
	});

	it("converts string with quotes", () => {
		expect(formatSqlValue("hello")).toBe("'hello'");
	});

	it("escapes single quotes in strings", () => {
		expect(formatSqlValue("it's")).toBe("'it''s'");
	});

	it("escapes multiple single quotes in strings", () => {
		expect(formatSqlValue("O'Reilly's books")).toBe("'O''Reilly''s books'");
	});

	it("handles empty string", () => {
		expect(formatSqlValue("")).toBe("''");
	});

	it("handles string with special characters", () => {
		expect(formatSqlValue("hello\nworld")).toBe("'hello\nworld'");
	});
});

describe("formatBytes", () => {
	it("formats 0 bytes", () => {
		expect(formatBytes(0)).toBe("0 B");
	});

	it("formats bytes less than 1 KB", () => {
		expect(formatBytes(500)).toBe("500.0 B");
		expect(formatBytes(1023)).toBe("1023.0 B");
	});

	it("formats kilobytes", () => {
		expect(formatBytes(1024)).toBe("1.0 KB");
		expect(formatBytes(1536)).toBe("1.5 KB");
		expect(formatBytes(2048)).toBe("2.0 KB");
	});

	it("formats megabytes", () => {
		expect(formatBytes(1048576)).toBe("1.0 MB");
		expect(formatBytes(1572864)).toBe("1.5 MB");
		expect(formatBytes(5242880)).toBe("5.0 MB");
	});

	it("formats gigabytes", () => {
		expect(formatBytes(1073741824)).toBe("1.0 GB");
		expect(formatBytes(1610612736)).toBe("1.5 GB");
	});

	it("formats large numbers near GB boundary", () => {
		// sizes array only goes up to GB — TB values overflow to undefined
		expect(formatBytes(500 * 1024 * 1024 * 1024)).toBe("500.0 GB");
	});
});

describe("generateJobId", () => {
	it("returns a UUID format string", () => {
		const jobId = generateJobId();
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		expect(jobId).toMatch(uuidRegex);
	});

	it("generates unique IDs", () => {
		const id1 = generateJobId();
		const id2 = generateJobId();
		expect(id1).not.toBe(id2);
	});

	it("generates consistent UUID length", () => {
		const jobId = generateJobId();
		expect(jobId).toHaveLength(36); // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
	});
});

describe("getUnixTimestamp", () => {
	it("returns a number", () => {
		const timestamp = getUnixTimestamp();
		expect(typeof timestamp).toBe("number");
	});

	it("returns current Unix timestamp (seconds)", () => {
		const before = Math.floor(Date.now() / 1000);
		const timestamp = getUnixTimestamp();
		const after = Math.floor(Date.now() / 1000);

		expect(timestamp).toBeGreaterThanOrEqual(before);
		expect(timestamp).toBeLessThanOrEqual(after);
	});

	it("returns integer timestamp (no milliseconds)", () => {
		const timestamp = getUnixTimestamp();
		expect(Number.isInteger(timestamp)).toBe(true);
	});

	it("returns positive number", () => {
		const timestamp = getUnixTimestamp();
		expect(timestamp).toBeGreaterThan(0);
	});
});

describe("formatDate", () => {
	it("formats date as YYYY-MM-DD", () => {
		const date = new Date("2024-03-15T10:30:00Z");
		expect(formatDate(date)).toBe("2024-03-15");
	});

	it("formats date with leading zeros", () => {
		const date = new Date("2024-01-05T10:30:00Z");
		expect(formatDate(date)).toBe("2024-01-05");
	});

	it("formats date at year boundary", () => {
		const date = new Date("2024-12-31T23:59:59Z");
		expect(formatDate(date)).toBe("2024-12-31");
	});

	it("handles date at year start", () => {
		const date = new Date("2024-01-01T00:00:00Z");
		expect(formatDate(date)).toBe("2024-01-01");
	});

	it("ignores time component", () => {
		const date1 = new Date("2024-03-15T00:00:00Z");
		const date2 = new Date("2024-03-15T23:59:59Z");
		expect(formatDate(date1)).toBe(formatDate(date2));
		expect(formatDate(date1)).toBe("2024-03-15");
	});
});

describe("calculateExpirationTimestamp", () => {
	it("adds correct weeks to current timestamp", () => {
		const beforeMs = Date.now();
		const timestamp = calculateExpirationTimestamp(1);
		const afterMs = Date.now();

		const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
		const expectedBeforeS = Math.floor((beforeMs + oneWeekMs) / 1000);
		const expectedAfterS = Math.floor((afterMs + oneWeekMs) / 1000);

		expect(timestamp).toBeGreaterThanOrEqual(expectedBeforeS);
		expect(timestamp).toBeLessThanOrEqual(expectedAfterS);
	});

	it("calculates 12-week expiration (standard retention)", () => {
		const beforeMs = Date.now();
		const timestamp = calculateExpirationTimestamp(12);
		const afterMs = Date.now();

		const twelveWeeksMs = 12 * 7 * 24 * 60 * 60 * 1000;
		const expectedBeforeS = Math.floor((beforeMs + twelveWeeksMs) / 1000);
		const expectedAfterS = Math.floor((afterMs + twelveWeeksMs) / 1000);

		expect(timestamp).toBeGreaterThanOrEqual(expectedBeforeS);
		expect(timestamp).toBeLessThanOrEqual(expectedAfterS);
	});

	it("returns integer timestamp (seconds, not milliseconds)", () => {
		const timestamp = calculateExpirationTimestamp(1);
		expect(Number.isInteger(timestamp)).toBe(true);
	});

	it("returns future timestamp", () => {
		const now = Math.floor(Date.now() / 1000);
		const timestamp = calculateExpirationTimestamp(1);
		expect(timestamp).toBeGreaterThan(now);
	});

	it("handles zero weeks", () => {
		const beforeMs = Date.now();
		const timestamp = calculateExpirationTimestamp(0);
		const afterMs = Date.now();

		const expectedBeforeS = Math.floor(beforeMs / 1000);
		const expectedAfterS = Math.floor(afterMs / 1000);

		expect(timestamp).toBeGreaterThanOrEqual(expectedBeforeS);
		expect(timestamp).toBeLessThanOrEqual(expectedAfterS);
	});

	it("handles large retention values", () => {
		const beforeMs = Date.now();
		const timestamp = calculateExpirationTimestamp(52); // one year
		const afterMs = Date.now();

		const oneYearMs = 52 * 7 * 24 * 60 * 60 * 1000;
		const expectedBeforeS = Math.floor((beforeMs + oneYearMs) / 1000);
		const expectedAfterS = Math.floor((afterMs + oneYearMs) / 1000);

		expect(timestamp).toBeGreaterThanOrEqual(expectedBeforeS);
		expect(timestamp).toBeLessThanOrEqual(expectedAfterS);
	});
});
