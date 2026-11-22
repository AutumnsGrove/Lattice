/**
 * A suspended grove is not a missing one (#1720).
 *
 * The lookup here is deliberately separate from `getTenantConfig`, which filters
 * on `active = 1` and must keep doing so (#1677). That separation is the thing
 * these tests protect: the second question may never widen the first one.
 */

import { describe, it, expect, vi } from "vitest";
import { isSuspendedSubdomain, ownsSuspendedSubdomain } from "./suspension";

function fakeDb(answer: (sql: string, bindings: unknown[]) => unknown) {
	const prepare = vi.fn((sql: string) => ({
		bind: (...bindings: unknown[]) => ({
			first: async () => answer(sql, bindings),
		}),
	}));
	return { prepare } as unknown as D1Database;
}

describe("isSuspendedSubdomain", () => {
	it("is true only for a row that exists and is switched off", async () => {
		const db = fakeDb(() => ({ off: 1 }));
		expect(await isSuspendedSubdomain(db, "paused")).toBe(true);
	});

	it("asks for inactive rows, not active ones", async () => {
		const prepare = vi.fn((sql: string) => ({
			bind: () => ({ first: async () => null }),
		}));
		await isSuspendedSubdomain({ prepare } as unknown as D1Database, "paused");

		// The whole design rests on this: a query that could return an active
		// tenant would bring back the config #1677 exists to withhold.
		expect(prepare.mock.calls[0][0]).toContain("active = 0");
	});

	it("is false for an unknown subdomain", async () => {
		const db = fakeDb(() => null);
		expect(await isSuspendedSubdomain(db, "nobody")).toBe(false);
	});

	it("is false when the database is missing or broken", async () => {
		// A broken database must not turn a suspended grove into a 500, and must
		// not invent a suspension either: the not-found page is the safe answer.
		expect(await isSuspendedSubdomain(undefined, "paused")).toBe(false);
		expect(
			await isSuspendedSubdomain(
				fakeDb(() => {
					throw new Error("D1 down");
				}),
				"paused",
			),
		).toBe(false);
	});
});

describe("ownsSuspendedSubdomain", () => {
	it("matches the viewer against the row's address, case-insensitively", async () => {
		const prepare = vi.fn((sql: string) => ({
			bind: () => ({ first: async () => ({ mine: 1 }) }),
		}));

		expect(
			await ownsSuspendedSubdomain({ prepare } as unknown as D1Database, "paused", "A@B.co"),
		).toBe(true);
		expect(prepare.mock.calls[0][0]).toMatch(/lower\(email\) = lower\(\?\)/);
	});

	it("is false for a signed-out visitor, without touching the database", async () => {
		const prepare = vi.fn();
		const db = { prepare } as unknown as D1Database;

		expect(await ownsSuspendedSubdomain(db, "paused", null)).toBe(false);
		expect(await ownsSuspendedSubdomain(db, "paused", undefined)).toBe(false);
		expect(prepare).not.toHaveBeenCalled();
	});
});
