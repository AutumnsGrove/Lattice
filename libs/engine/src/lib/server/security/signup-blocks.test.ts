import { describe, it, expect } from "vitest";
import {
	normalizeIdentity,
	normalizeBlockValue,
	blockMatches,
	findBlock,
	loadSignupBlocks,
	describeBlock,
	type SignupBlock,
	type SignupBlockKind,
} from "./signup-blocks";

const NOW = 1_800_000_000; // arbitrary fixed "now"

function block(
	kind: SignupBlockKind,
	value: string,
	overrides: Partial<SignupBlock> = {},
): SignupBlock {
	return {
		id: "blk-1",
		kind,
		value,
		reason: null,
		createdBy: "autumn",
		createdAt: NOW - 1000,
		expiresAt: null,
		source: "manual",
		...overrides,
	};
}

describe("normalizeIdentity", () => {
	it("lowercases and trims", () => {
		const identity = normalizeIdentity("  Autumn@Grove.Place ");
		expect(identity).not.toBeNull();
		expect(identity!.email).toBe("autumn@grove.place");
		expect(identity!.local).toBe("autumn");
		expect(identity!.domain).toBe("grove.place");
		expect(identity!.normalized).toBe("autumn@grove.place");
	});

	it("collapses plus aliases to one identity", () => {
		const grace = normalizeIdentity("maplecrest+grace@mail.grokbot.com");
		const ella = normalizeIdentity("maplecrest+ella@mail.grokbot.com");
		expect(grace!.normalized).toBe(ella!.normalized);
		expect(grace!.normalized).toBe("maplecrest@mail.grokbot.com");
	});

	it("leaves a bare plus alone when it is the first character", () => {
		// "+tag@example.com" has no local part to keep — don't produce "@example.com"
		const identity = normalizeIdentity("+tag@example.com");
		expect(identity!.normalized).toBe("+tag@example.com");
	});

	it("keeps idiosyncratic but real local parts intact", () => {
		expect(normalizeIdentity("first.last+promo@example.co.uk")!.normalized).toBe(
			"first.last@example.co.uk",
		);
	});

	it("rejects anything that is not an address", () => {
		for (const bad of ["", "   ", "not-an-email", "@example.com", "a@b", "a@", null, undefined]) {
			expect(normalizeIdentity(bad as string | null | undefined)).toBeNull();
		}
	});
});

describe("normalizeBlockValue", () => {
	it("strips a leading @ and trailing dot from domains", () => {
		expect(normalizeBlockValue("domain", "@Mail.GrokBot.com")).toBe("mail.grokbot.com");
		expect(normalizeBlockValue("domain", "grokbot.com.")).toBe("grokbot.com");
	});

	it("drops the alias from an email block", () => {
		expect(normalizeBlockValue("email", "Maplecrest+Ella@Mail.GrokBot.com")).toBe(
			"maplecrest@mail.grokbot.com",
		);
	});

	it("keeps an unparseable email as-is so it still matches something", () => {
		expect(normalizeBlockValue("email", "Not An Email")).toBe("not an email");
	});

	it("lowercases substrings", () => {
		expect(normalizeBlockValue("substring", "GROKBOT")).toBe("grokbot");
	});
});

describe("blockMatches", () => {
	const grokbot = normalizeIdentity("maplecrest+ella@mail.grokbot.com")!;

	it("catches a plus alias by domain rule", () => {
		expect(blockMatches(grokbot, block("domain", "mail.grokbot.com"), NOW)).toBe(true);
	});

	it("catches a subdomain of a blocked parent domain", () => {
		expect(blockMatches(grokbot, block("domain", "grokbot.com"), NOW)).toBe(true);
	});

	it("does not catch a lookalike domain", () => {
		expect(blockMatches(grokbot, block("domain", "notgrokbot.com"), NOW)).toBe(false);
		// suffix match must land on a dot boundary
		expect(blockMatches(grokbot, block("domain", "grokbot.co"), NOW)).toBe(false);
	});

	it("catches an alias by an email rule on the parent address", () => {
		expect(blockMatches(grokbot, block("email", "maplecrest@mail.grokbot.com"), NOW)).toBe(true);
	});

	it("does not catch a different local part with an email rule", () => {
		expect(blockMatches(grokbot, block("email", "someoneelse@mail.grokbot.com"), NOW)).toBe(false);
	});

	it("honours expiry", () => {
		const expired = block("domain", "mail.grokbot.com", { expiresAt: NOW - 1 });
		expect(blockMatches(grokbot, expired, NOW)).toBe(false);

		const live = block("domain", "mail.grokbot.com", { expiresAt: NOW + 60 });
		expect(blockMatches(grokbot, live, NOW)).toBe(true);
	});

	it("treats a null expiry as permanent", () => {
		expect(
			blockMatches(grokbot, block("domain", "mail.grokbot.com", { expiresAt: null }), NOW),
		).toBe(true);
	});

	it("matches substrings against the full address", () => {
		expect(blockMatches(grokbot, block("substring", "grokbot"), NOW)).toBe(true);
		expect(blockMatches(grokbot, block("substring", "openclaw"), NOW)).toBe(false);
	});

	it("ignores an empty substring rather than matching everything", () => {
		expect(blockMatches(grokbot, block("substring", ""), NOW)).toBe(false);
	});
});

describe("findBlock", () => {
	it("returns null for an unparseable identity", () => {
		expect(findBlock(null, [block("domain", "grokbot.com")], NOW)).toBeNull();
	});

	it("returns the first matching block so the reason can be logged", () => {
		const blocks = [
			block("domain", "example.com", { id: "b1" }),
			block("domain", "grokbot.com", { id: "b2", reason: "agent mailbox" }),
		];
		const found = findBlock(normalizeIdentity("maplecrest+ella@mail.grokbot.com"), blocks, NOW);
		expect(found?.id).toBe("b2");
		expect(found?.reason).toBe("agent mailbox");
	});

	it("returns null when nothing matches", () => {
		const blocks = [block("domain", "grokbot.com")];
		expect(findBlock(normalizeIdentity("autumn@grove.place"), blocks, NOW)).toBeNull();
	});
});

describe("loadSignupBlocks", () => {
	it("maps rows to blocks with camelCase fields", async () => {
		const db = {
			prepare: () => ({
				bind: () => ({
					all: async () => ({
						results: [
							{
								id: "b1",
								kind: "domain",
								value: "mail.grokbot.com",
								reason: "agent mailbox",
								created_by: "autumn",
								created_at: 123,
								expires_at: null,
								source: "incident:2026-11-14",
							},
						],
					}),
				}),
			}),
		};

		const blocks = await loadSignupBlocks(db as never);
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toMatchObject({
			id: "b1",
			kind: "domain",
			value: "mail.grokbot.com",
			createdBy: "autumn",
			expiresAt: null,
			source: "incident:2026-11-14",
		});
	});

	it("propagates database errors so the caller can fail loudly", async () => {
		const db = {
			prepare: () => ({
				bind: () => ({
					all: async () => {
						throw new Error("no such table: signup_blocks");
					},
				}),
			}),
		};
		await expect(loadSignupBlocks(db as never)).rejects.toThrow("no such table");
	});

	it("treats a missing results array as no blocks", async () => {
		const db = { prepare: () => ({ bind: () => ({ all: async () => ({}) }) }) };
		await expect(loadSignupBlocks(db as never)).resolves.toEqual([]);
	});
});

describe("describeBlock", () => {
	it("produces an ops-readable line without the person-facing copy", () => {
		const line = describeBlock(block("domain", "mail.grokbot.com", { reason: "agent mailbox" }));
		expect(line).toBe("domain=mail.grokbot.com · agent mailbox · source=manual");
	});
});
