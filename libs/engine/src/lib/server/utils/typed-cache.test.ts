import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { createTypedCacheReader, safeJsonParse } from "./typed-cache";

describe("safeJsonParse", () => {
	const NumberSchema = z.object({ count: z.number() });

	it("parses valid JSON that matches schema", () => {
		const result = safeJsonParse('{"count": 42}', NumberSchema);
		expect(result).toEqual({ count: 42 });
	});

	it("returns null for valid JSON that fails schema", () => {
		const result = safeJsonParse('{"count": "not-a-number"}', NumberSchema);
		expect(result).toBeNull();
	});

	it("returns null for invalid JSON", () => {
		expect(safeJsonParse("not valid json", NumberSchema)).toBeNull();
	});

	it("returns null for null input", () => {
		expect(safeJsonParse(null, NumberSchema)).toBeNull();
	});

	it("returns null for undefined input", () => {
		expect(safeJsonParse(undefined, NumberSchema)).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(safeJsonParse("", NumberSchema)).toBeNull();
	});

	it("strips unknown keys", () => {
		const result = safeJsonParse('{"count": 1, "extra": "field"}', NumberSchema);
		expect(result).toEqual({ count: 1 });
	});
});

describe("createTypedCacheReader", () => {
	const ActiveSchema = z.object({
		isActive: z.boolean(),
		lastCommit: z.number(),
	});

	const fallback = { isActive: false, lastCommit: 0 };

	it("returns validated cache data", async () => {
		const cache = {
			get: vi.fn().mockResolvedValue({ isActive: true, lastCommit: 12345 }),
		};

		const reader = createTypedCacheReader(cache);
		const result = await reader.get("key", "tenant", ActiveSchema, fallback);

		expect(result).toEqual({ isActive: true, lastCommit: 12345 });
		expect(cache.get).toHaveBeenCalledWith("key", "tenant");
	});

	it("returns fallback when cache returns null", async () => {
		const cache = { get: vi.fn().mockResolvedValue(null) };
		const reader = createTypedCacheReader(cache);
		const result = await reader.get("key", "tenant", ActiveSchema, fallback);

		expect(result).toEqual(fallback);
	});

	it("returns fallback when cache data fails schema validation", async () => {
		const cache = {
			get: vi.fn().mockResolvedValue({ isActive: "not-a-boolean" }),
		};
		const reader = createTypedCacheReader(cache);
		const result = await reader.get("key", "tenant", ActiveSchema, fallback);

		expect(result).toEqual(fallback);
	});
});
