/**
 * Signup identity block tests
 *
 * The wrapper's whole job is three outcomes: blocked, allowed, and failed-open.
 * The third one matters most — a deny list that stops loading must not stop
 * people signing up, and must not do it quietly.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const loadSignupBlocks = vi.fn();
const logGroveError = vi.fn();

vi.mock("@autumnsgrove/lattice/server/security/signup-blocks", async () => {
	const actual = await vi.importActual<
		typeof import("@autumnsgrove/lattice/server/security/signup-blocks")
	>("@autumnsgrove/lattice/server/security/signup-blocks");
	return { ...actual, loadSignupBlocks: (...args: unknown[]) => loadSignupBlocks(...args) };
});

vi.mock("@autumnsgrove/lattice/errors", async () => {
	const actual = await vi.importActual<typeof import("@autumnsgrove/lattice/errors")>(
		"@autumnsgrove/lattice/errors",
	);
	return { ...actual, logGroveError: (...args: unknown[]) => logGroveError(...args) };
});

const { checkSignupIdentity } = await import("./signup-blocks");

// Heartwood binds groveauth as DB and grove-engine-db as ENGINE_DB. The deny
// list lives in the engine database, so the two bindings are deliberately made
// to behave differently: reading DB must never be what finds a block.
const engineDb = {};
const authDb = {
	prepare: () => {
		throw new Error("read the groveauth database instead of ENGINE_DB");
	},
};

const env = {
	DB: authDb,
	ENGINE_DB: engineDb,
} as unknown as Parameters<typeof checkSignupIdentity>[0];

const grokbotBlock = {
	id: "blk-1",
	kind: "domain" as const,
	value: "mail.grokbot.com",
	reason: "agent mailbox",
	createdBy: "autumn",
	createdAt: 1,
	expiresAt: null,
	source: "incident:2026-11-14",
};

describe("checkSignupIdentity", () => {
	beforeEach(() => {
		loadSignupBlocks.mockReset();
		logGroveError.mockReset();
	});

	it("blocks a plus alias of a blocked domain", async () => {
		loadSignupBlocks.mockResolvedValue([grokbotBlock]);

		const result = await checkSignupIdentity(env, "maplecrest+ella@mail.grokbot.com");

		expect(result.blocked).toBe(true);
		expect(result.block?.value).toBe("mail.grokbot.com");
	});

	it("reads the deny list from ENGINE_DB, not the groveauth DB", async () => {
		loadSignupBlocks.mockResolvedValue([grokbotBlock]);

		await checkSignupIdentity(env, "maplecrest+ella@mail.grokbot.com");

		// The groveauth binding throws on prepare, so passing it would surface as
		// the fail-open path (blocked: false, HW-SVC-045) — the exact bug that got
		// through review the first time.
		expect(loadSignupBlocks).toHaveBeenCalledWith(env.ENGINE_DB);
		expect(loadSignupBlocks).not.toHaveBeenCalledWith(env.DB);
	});

	it("allows an ordinary address", async () => {
		loadSignupBlocks.mockResolvedValue([grokbotBlock]);

		const result = await checkSignupIdentity(env, "autumn@grove.place");

		expect(result.blocked).toBe(false);
		expect(result.block).toBeUndefined();
	});

	it("skips the lookup for something that is not an address", async () => {
		const result = await checkSignupIdentity(env, "not-an-email");

		expect(result.blocked).toBe(false);
		expect(loadSignupBlocks).not.toHaveBeenCalled();
	});

	it("fails open when the deny list cannot be read", async () => {
		loadSignupBlocks.mockRejectedValue(new Error("no such table: signup_blocks"));

		const result = await checkSignupIdentity(env, "maplecrest+ella@mail.grokbot.com");

		expect(result.blocked).toBe(false);
		// A tenant or address block must resolve to a block, not a throw, so that
		// this fail-open path is the *only* way to get here.
		const [, error] = logGroveError.mock.calls[0];
		expect(error.code).toBe("HW-SVC-045");
	});

	it("does not leak the rule in the returned shape", async () => {
		loadSignupBlocks.mockResolvedValue([grokbotBlock]);

		const result = await checkSignupIdentity(env, "maplecrest+ella@mail.grokbot.com");

		// The caller decides what a user sees; the block is for the server log.
		expect(Object.keys(result).sort()).toEqual(["block", "blocked"]);
	});
});
