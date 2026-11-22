/**
 * QuotaTracker — refusal reasons.
 *
 * A task with no allowance and a task that has been used up are different
 * situations. The first used to report "0/0 requests used", which tells an
 * operator nothing about what to do next.
 */

import { describe, it, expect, vi } from "vitest";
import { QuotaTracker } from "./tracker.js";
import { QuotaExceededError, LumenError } from "../errors.js";

/**
 * Minimal D1 stand-in.
 *
 * `getTodayUsage` reads a COUNT through `.first()`, so that is where the usage
 * figure has to come from — an empty `all()` would silently mean "nobody has
 * used anything", which is exactly the wrong default for these assertions.
 */
function fakeDb(used: number) {
	return {
		prepare: () => ({
			bind: () => ({
				all: async () => ({ results: [] }),
				first: async () => ({ count: used }),
				run: async () => ({}),
			}),
		}),
	} as unknown as D1Database;
}

describe("QuotaTracker.enforceQuota", () => {
	it("says a task is unavailable rather than reporting 0/0 used", async () => {
		const tracker = new QuotaTracker(fakeDb(0));

		// Agent quota is 0 on every tier until a rule exists.
		const error = await tracker.enforceQuota("t-1", "wanderer", "agent").catch((e) => e);

		expect(error).toBeInstanceOf(LumenError);
		expect(error.code).toBe("QUOTA_EXCEEDED");
		expect(error.message).toContain('Task "agent" is not available on the wanderer tier');
		expect(error.message).toContain("skipQuota");
	});

	it("still reports usage when the allowance is spent", async () => {
		const tracker = new QuotaTracker(fakeDb(10));

		const error = await tracker.enforceQuota("t-1", "wanderer", "generation").catch((e) => e);

		expect(error).toBeInstanceOf(QuotaExceededError);
		expect(error.message).toContain('Quota exceeded for task "generation"');
		expect(error.limit).toBe(10);
	});

	it("allows the call while allowance remains", async () => {
		const tracker = new QuotaTracker(fakeDb(3));
		await expect(tracker.enforceQuota("t-1", "wanderer", "generation")).resolves.toBeUndefined();
	});

	it("does not touch the database for an unavailable task", async () => {
		const all = vi.fn(async () => ({ results: [] }));
		const db = { prepare: () => ({ bind: () => ({ all }) }) } as unknown as D1Database;

		await new QuotaTracker(db).enforceQuota("t-1", "evergreen", "agent").catch(() => {});

		expect(all).not.toHaveBeenCalled();
	});
});
