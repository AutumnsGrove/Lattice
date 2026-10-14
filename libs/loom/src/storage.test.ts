import { describe, it, expect, vi } from "vitest";
import { safeJsonParse, SqlHelper, JsonStore } from "./storage.js";
import type { LoomLogger } from "./logger.js";

describe("safeJsonParse", () => {
	it("parses valid JSON", () => {
		const result = safeJsonParse('{"name":"test"}', null);
		expect(result).toEqual({ name: "test" });
	});

	it("returns fallback for null input", () => {
		const result = safeJsonParse(null, { default: true });
		expect(result).toEqual({ default: true });
	});

	it("returns fallback for undefined input", () => {
		const result = safeJsonParse(undefined, "fallback");
		expect(result).toBe("fallback");
	});

	it("returns fallback for invalid JSON", () => {
		const result = safeJsonParse("{not valid json", []);
		expect(result).toEqual([]);
	});

	it("returns fallback for empty string", () => {
		// Empty string is not null/undefined, but is invalid JSON
		const result = safeJsonParse("", 42);
		expect(result).toBe(42);
	});

	it("parses arrays", () => {
		const result = safeJsonParse<string[]>('["a","b","c"]', []);
		expect(result).toEqual(["a", "b", "c"]);
	});

	it("parses primitive values", () => {
		expect(safeJsonParse("42", 0)).toBe(42);
		expect(safeJsonParse("true", false)).toBe(true);
		expect(safeJsonParse('"hello"', "")).toBe("hello");
	});

	it("handles nested objects", () => {
		const json = '{"a":{"b":{"c":1}}}';
		const result = safeJsonParse<{ a: { b: { c: number } } }>(json, {
			a: { b: { c: 0 } },
		});
		expect(result.a.b.c).toBe(1);
	});
});

// ============================================================================
// SqlHelper / JsonStore
// ============================================================================

/**
 * A fake SQL storage whose cursor behaves like Cloudflare's, including the part
 * that matters here: `one()` throws unless there is exactly one row.
 */
function fakeSql(rows: Record<string, unknown>[]): SqlStorage {
	const cursor = () => {
		const iterator = rows[Symbol.iterator]();
		return {
			next: () => iterator.next(),
			toArray: () => [...rows],
			one: () => {
				if (rows.length === 1) return rows[0];
				throw new Error(
					rows.length === 0
						? "Expected exactly one result from SQL query, but got no results."
						: "Expected exactly one result from SQL query, but got multiple results.",
				);
			},
		};
	};
	return { exec: vi.fn(() => cursor()) } as unknown as SqlStorage;
}

const quietLog = { debug() {}, info() {}, warn() {}, error() {} } as unknown as LoomLogger;
const helperFor = (rows: Record<string, unknown>[]) => new SqlHelper(fakeSql(rows), quietLog);

describe("SqlHelper.queryOne", () => {
	// Regression: queryOne is documented to return null when nothing matches, but it called
	// cursor.one(), which throws on zero rows. Every caller written against the documented
	// contract (TenantDO's draft lookup, JsonStore.get/has, ...) turned "not found" into a 500.
	it("returns null when no rows match, instead of throwing", () => {
		expect(helperFor([]).queryOne("SELECT * FROM drafts WHERE slug = ?", "nope")).toBeNull();
	});

	it("returns the row when exactly one matches", () => {
		const row = { slug: "a", content: "hello" };
		expect(helperFor([row]).queryOne("SELECT * FROM drafts WHERE slug = ?", "a")).toEqual(row);
	});

	it("returns the first row when several match, instead of throwing", () => {
		const rows = [{ n: 1 }, { n: 2 }];
		expect(helperFor(rows).queryOne("SELECT n FROM t")).toEqual({ n: 1 });
	});

	it("passes the query and bindings through", () => {
		const sql = fakeSql([]);
		new SqlHelper(sql, quietLog).queryOne("SELECT * FROM drafts WHERE slug = ?", "x");
		expect(sql.exec).toHaveBeenCalledWith("SELECT * FROM drafts WHERE slug = ?", "x");
	});

	it("is consistent with queryAll on an empty result", () => {
		const helper = helperFor([]);
		expect(helper.queryAll("SELECT 1")).toEqual([]);
		expect(helper.queryOne("SELECT 1")).toBeNull();
	});
});

describe("JsonStore on an empty table", () => {
	const storeFor = (rows: Record<string, unknown>[]) =>
		new JsonStore(helperFor(rows), quietLog, "kv_store");

	it("get() returns null for a missing key, as documented", () => {
		expect(storeFor([]).get("missing")).toBeNull();
	});

	it("has() returns false for a missing key, as documented", () => {
		expect(storeFor([]).has("missing")).toBe(false);
	});

	it("get() and has() still work when the key exists", () => {
		const store = storeFor([{ key: "k", value: JSON.stringify({ a: 1 }) }]);
		expect(store.get("k")).toEqual({ a: 1 });
		expect(store.has("k")).toBe(true);
	});
});
