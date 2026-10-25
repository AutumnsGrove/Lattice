// @vitest-environment node
/**
 * Short Links Service Tests
 *
 * Runs the real queries against a real SQLite database built from the real
 * migration (node:sqlite behind a thin D1-shaped wrapper), so constraints,
 * joins, and the one-link-per-post guarantee are exercised for real instead of
 * being asserted against mocked SQL.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
	validateSlug,
	validateTarget,
	generateSlug,
	getGroveOwner,
	getOrCreatePostLink,
	createCustomLink,
	listLinks,
	disableLink,
	resolveShortLink,
	recordClick,
	type LinkOwner,
} from "./short-links";
import { LINK_ERRORS } from "../../errors/link-errors";
import { SHORT_LINK_GENERATOR, SHORT_LINK_BASE_URL } from "../../platform/config/short-links";

// ============================================================================
// Real SQLite, D1-shaped
// ============================================================================

const MIGRATION = readFileSync(
	new URL("../../../../migrations/120_short_links.sql", import.meta.url),
	"utf8",
);

function createDb() {
	const sqlite = new DatabaseSync(":memory:");
	sqlite.exec("PRAGMA foreign_keys = ON");
	sqlite.exec(`
		CREATE TABLE tenants (
			id TEXT PRIMARY KEY, subdomain TEXT UNIQUE NOT NULL, active INTEGER DEFAULT 1,
			custom_domain TEXT, plan TEXT DEFAULT 'seedling'
		);
		CREATE TABLE posts (
			id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, slug TEXT NOT NULL,
			title TEXT NOT NULL, status TEXT DEFAULT 'draft'
		);
	`);
	sqlite.exec(MIGRATION);

	const db = {
		prepare(sql: string) {
			return {
				bind: (...params: unknown[]) => ({
					first: async () => sqlite.prepare(sql).get(...(params as never[])) ?? null,
					all: async () => ({ results: sqlite.prepare(sql).all(...(params as never[])) }),
					run: async () => ({
						meta: { changes: Number(sqlite.prepare(sql).run(...(params as never[])).changes) },
					}),
				}),
			};
		},
	} as unknown as D1Database;

	return { db, sqlite };
}

const autumn: LinkOwner = { type: "grove", tenantId: "t-autumn", subdomain: "autumn" };
const river: LinkOwner = { type: "grove", tenantId: "t-river", subdomain: "river" };
const wayfinder: LinkOwner = { type: "wayfinder" };

let db: D1Database;
let sqlite: DatabaseSync;

beforeEach(() => {
	({ db, sqlite } = createDb());
	sqlite.exec(`
		INSERT INTO tenants (id, subdomain, active) VALUES ('t-autumn', 'autumn', 1), ('t-river', 'river', 1);
		INSERT INTO posts VALUES
			('p-hello', 't-autumn', 'hello-world', 'Hello World', 'published'),
			('p-draft', 't-autumn', 'wip', 'Work in progress', 'draft'),
			('p-river', 't-river', 'river-post', 'River Post', 'published');
	`);
});

const rowCount = () =>
	Number((sqlite.prepare("SELECT COUNT(*) AS n FROM short_links").get() as { n: number }).n);

// ============================================================================
// Owners
// ============================================================================

describe("getGroveOwner", () => {
	it("loads a grove's subdomain", async () => {
		expect(await getGroveOwner(db, "t-autumn")).toEqual({
			type: "grove",
			tenantId: "t-autumn",
			subdomain: "autumn",
			customDomain: null,
		});
	});

	it.each([
		["seedling", null],
		["sapling", null],
		["oak", "autumn.example.com"],
		["evergreen", "autumn.example.com"],
	])("on %s the custom domain counts as their grove: %j", async (plan, expected) => {
		sqlite.exec(
			`UPDATE tenants SET plan = '${plan}', custom_domain = 'autumn.example.com' WHERE id = 't-autumn'`,
		);
		const owner = await getGroveOwner(db, "t-autumn");
		expect(owner && owner.type === "grove" && owner.customDomain).toBe(expected);
	});

	it("ignores a custom domain when the plan is unknown", async () => {
		sqlite.exec(
			"UPDATE tenants SET plan = 'mystery', custom_domain = 'x.example.com' WHERE id = 't-autumn'",
		);
		const owner = await getGroveOwner(db, "t-autumn");
		expect(owner && owner.type === "grove" && owner.customDomain).toBeNull();
	});

	it("returns null for groves that are missing or inactive", async () => {
		expect(await getGroveOwner(db, "nope")).toBeNull();
		sqlite.exec("UPDATE tenants SET active = 0 WHERE id = 't-autumn'");
		expect(await getGroveOwner(db, "t-autumn")).toBeNull();
	});
});

// ============================================================================
// Slugs
// ============================================================================

describe("validateSlug", () => {
	it.each(["my-bloom", "abc", "a1b2c3", "x".repeat(32), "2024-recap"])("accepts %s", (slug) => {
		expect(validateSlug(slug)).toEqual({ ok: true, value: slug });
	});

	it("normalizes case and surrounding whitespace", () => {
		expect(validateSlug("  My-Bloom ")).toEqual({ ok: true, value: "my-bloom" });
	});

	it.each(["ab", "", "x".repeat(33), "-ab", "ab-", "a--b", "a_b", "a.b", "a/b", "a b", "café"])(
		"rejects malformed slug %j",
		(slug) => {
			expect(validateSlug(slug)).toEqual({ ok: false, error: LINK_ERRORS.SLUG_INVALID });
		},
	);

	it.each(["link", "api", "admin", "grove-anything"])("rejects reserved slug %s", (slug) => {
		expect(validateSlug(slug)).toEqual({ ok: false, error: LINK_ERRORS.SLUG_RESERVED });
	});
});

describe("generateSlug", () => {
	it("makes slugs of the configured length from the look-alike-free alphabet", () => {
		for (let i = 0; i < 300; i++) {
			const slug = generateSlug();
			expect(slug).toHaveLength(SHORT_LINK_GENERATOR.length);
			for (const char of slug) expect(SHORT_LINK_GENERATOR.alphabet).toContain(char);
			expect(slug).not.toMatch(/[01ilo]/);
		}
	});

	it("does not repeat itself", () => {
		const seen = new Set(Array.from({ length: 200 }, generateSlug));
		expect(seen.size).toBeGreaterThan(195);
	});
});

// ============================================================================
// Targets
// ============================================================================

describe("validateTarget", () => {
	const bad = (key: keyof typeof LINK_ERRORS) => ({ ok: false, error: LINK_ERRORS[key] });

	describe("for everyone", () => {
		it.each([
			["http://example.com", "TARGET_NOT_HTTPS"],
			["javascript:alert(1)", "TARGET_NOT_HTTPS"],
			["data:text/html,<b>x</b>", "TARGET_NOT_HTTPS"],
			["ftp://example.com/file", "TARGET_NOT_HTTPS"],
			["example.com/page", "TARGET_INVALID"],
			["", "TARGET_INVALID"],
			["   ", "TARGET_INVALID"],
			["https://user:pass@example.com", "TARGET_INVALID"],
			["https://example.com:8443/x", "TARGET_INVALID"],
			["https://link.grove.place/abc123", "TARGET_IS_SHORT_LINK"],
			[`https://example.com/${"a".repeat(2100)}`, "TARGET_TOO_LONG"],
		] as const)("rejects %j as %s", (target, key) => {
			expect(validateTarget(target, wayfinder)).toEqual(bad(key));
			expect(validateTarget(target, autumn)).toEqual(bad(key));
		});

		it("allows the default https port written out", () => {
			expect(validateTarget("https://example.com:443/x", wayfinder)).toEqual({
				ok: true,
				value: "https://example.com/x",
			});
		});
	});

	describe("for the Wayfinder", () => {
		it("allows any https destination", () => {
			expect(validateTarget("https://example.com/a?b=c#d", wayfinder)).toEqual({
				ok: true,
				value: "https://example.com/a?b=c#d",
			});
		});
	});

	describe("for a Wanderer", () => {
		it("allows pages in their own grove", () => {
			expect(validateTarget("https://autumn.grove.place/garden/hello?x=1#top", autumn)).toEqual({
				ok: true,
				value: "https://autumn.grove.place/garden/hello?x=1#top",
			});
			expect(validateTarget("https://AUTUMN.grove.place", autumn)).toEqual({
				ok: true,
				value: "https://autumn.grove.place/",
			});
		});

		it.each([
			"https://river.grove.place/garden/river-post",
			"https://grove.place/",
			"https://autumn.grove.place.evil.com/",
			"https://evilautumn.grove.place/",
			"https://sub.autumn.grove.place/",
			"https://autumn.grove.place./",
			"https://example.com/",
		])("rejects %s", (target) => {
			expect(validateTarget(target, autumn)).toEqual(bad("TARGET_NOT_OWN_GROVE"));
		});

		it("rejects userinfo tricks that hide another host", () => {
			expect(validateTarget("https://autumn.grove.place@evil.com/", autumn)).toEqual(
				bad("TARGET_INVALID"),
			);
		});

		it("allows their custom domain only when one is provided", () => {
			const withDomain: LinkOwner = { ...autumn, customDomain: "Autumn.Example.com" };
			expect(validateTarget("https://autumn.example.com/post", withDomain).ok).toBe(true);
			expect(validateTarget("https://autumn.example.com/post", autumn)).toEqual(
				bad("TARGET_NOT_OWN_GROVE"),
			);
		});
	});
});

// ============================================================================
// Post links
// ============================================================================

describe("getOrCreatePostLink", () => {
	it("creates a short link for a post", async () => {
		const result = await getOrCreatePostLink(db, { tenantId: "t-autumn", postId: "p-hello" });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.shortUrl).toBe(`${SHORT_LINK_BASE_URL}/${result.value.slug}`);
		expect(validateSlug(result.value.slug).ok).toBe(true);
		expect(rowCount()).toBe(1);
	});

	it("always returns the same link for the same post", async () => {
		const first = await getOrCreatePostLink(db, { tenantId: "t-autumn", postId: "p-hello" });
		const second = await getOrCreatePostLink(db, { tenantId: "t-autumn", postId: "p-hello" });
		expect(first).toEqual(second);
		expect(rowCount()).toBe(1);
	});

	it("gives one link even when many requests race", async () => {
		const results = await Promise.all(
			Array.from({ length: 8 }, () =>
				getOrCreatePostLink(db, { tenantId: "t-autumn", postId: "p-hello" }),
			),
		);
		const slugs = new Set(results.map((r) => (r.ok ? r.value.slug : "ERROR")));
		expect(slugs.size).toBe(1);
		expect(slugs.has("ERROR")).toBe(false);
		expect(rowCount()).toBe(1);
	});

	it("gives different posts different links", async () => {
		const a = await getOrCreatePostLink(db, { tenantId: "t-autumn", postId: "p-hello" });
		const b = await getOrCreatePostLink(db, { tenantId: "t-autumn", postId: "p-draft" });
		expect(a.ok && b.ok && a.value.slug !== b.value.slug).toBe(true);
	});

	it("refuses posts that belong to another grove, and posts that don't exist", async () => {
		expect(await getOrCreatePostLink(db, { tenantId: "t-autumn", postId: "p-river" })).toEqual({
			ok: false,
			error: LINK_ERRORS.POST_NOT_FOUND,
		});
		expect(await getOrCreatePostLink(db, { tenantId: "t-autumn", postId: "nope" })).toEqual({
			ok: false,
			error: LINK_ERRORS.POST_NOT_FOUND,
		});
		expect(rowCount()).toBe(0);
	});
});

describe("resolving post links", () => {
	const makeLink = async (postId = "p-hello", tenantId = "t-autumn") => {
		const result = await getOrCreatePostLink(db, { tenantId, postId });
		if (!result.ok) throw new Error("setup failed");
		return result.value.slug;
	};

	it("sends the slug to the bloom", async () => {
		const slug = await makeLink();
		expect(await resolveShortLink(db, slug)).toEqual({
			status: "found",
			url: "https://autumn.grove.place/garden/hello-world",
		});
	});

	it("follows the post when its slug changes, keeping the same short link", async () => {
		const slug = await makeLink();
		sqlite.exec("UPDATE posts SET slug = 'a-better-title' WHERE id = 'p-hello'");

		expect(await resolveShortLink(db, slug)).toEqual({
			status: "found",
			url: "https://autumn.grove.place/garden/a-better-title",
		});
		const again = await getOrCreatePostLink(db, { tenantId: "t-autumn", postId: "p-hello" });
		expect(again.ok && again.value.slug).toBe(slug);
	});

	it("is case-insensitive", async () => {
		const slug = await makeLink();
		expect((await resolveShortLink(db, slug.toUpperCase())).status).toBe("found");
	});

	it("is gone while the post is a draft, and works once it's published", async () => {
		const slug = await makeLink("p-draft");
		expect(await resolveShortLink(db, slug)).toEqual({ status: "gone" });

		sqlite.exec("UPDATE posts SET status = 'published' WHERE id = 'p-draft'");
		expect((await resolveShortLink(db, slug)).status).toBe("found");
	});

	it("is gone when the post is deleted, and the link is kept", async () => {
		const slug = await makeLink();
		sqlite.exec("DELETE FROM posts WHERE id = 'p-hello'");
		expect(await resolveShortLink(db, slug)).toEqual({ status: "gone" });
		expect(rowCount()).toBe(1);
	});

	it("is gone when the grove is inactive", async () => {
		const slug = await makeLink();
		sqlite.exec("UPDATE tenants SET active = 0 WHERE id = 't-autumn'");
		expect(await resolveShortLink(db, slug)).toEqual({ status: "gone" });
	});

	it("is removed with the grove", async () => {
		await makeLink();
		sqlite.exec("DELETE FROM tenants WHERE id = 't-autumn'");
		expect(rowCount()).toBe(0);
	});
});

describe("resolveShortLink for unknown slugs", () => {
	it.each(["nothing", "ab", "has space", "a/b", "../etc", "x".repeat(200)])(
		"reports %j as not found",
		async (slug) => {
			expect(await resolveShortLink(db, slug)).toEqual({ status: "not_found" });
		},
	);
});

// ============================================================================
// Custom links
// ============================================================================

describe("createCustomLink", () => {
	it("lets a Wanderer pick a slug for a page in their grove", async () => {
		const result = await createCustomLink(db, autumn, {
			slug: "My-Notes",
			targetUrl: "https://autumn.grove.place/about",
		});
		expect(result).toEqual({
			ok: true,
			value: { slug: "my-notes", shortUrl: `${SHORT_LINK_BASE_URL}/my-notes` },
		});
		expect(await resolveShortLink(db, "my-notes")).toEqual({
			status: "found",
			url: "https://autumn.grove.place/about",
		});
	});

	it("generates a slug when none is given", async () => {
		const result = await createCustomLink(db, autumn, {
			targetUrl: "https://autumn.grove.place/about",
		});
		expect(result.ok && result.value.slug).toHaveLength(SHORT_LINK_GENERATOR.length);
	});

	it("keeps Wanderers inside their own grove", async () => {
		expect(
			await createCustomLink(db, autumn, { slug: "away", targetUrl: "https://example.com" }),
		).toEqual({ ok: false, error: LINK_ERRORS.TARGET_NOT_OWN_GROVE });
		expect(rowCount()).toBe(0);
	});

	it("lets the Wayfinder link anywhere, owned by no grove", async () => {
		const result = await createCustomLink(db, wayfinder, {
			slug: "my-docs",
			targetUrl: "https://example.com/docs",
		});
		expect(result.ok).toBe(true);
		expect(
			sqlite.prepare("SELECT tenant_id FROM short_links WHERE slug = 'my-docs'").get(),
		).toEqual({
			tenant_id: null,
		});
	});

	it("lets the Wayfinder use reserved words, but not Wanderers", async () => {
		expect(
			(await createCustomLink(db, wayfinder, { slug: "docs", targetUrl: "https://example.com/d" }))
				.ok,
		).toBe(true);
		expect(
			await createCustomLink(db, autumn, {
				slug: "help",
				targetUrl: "https://autumn.grove.place/",
			}),
		).toEqual({ ok: false, error: LINK_ERRORS.SLUG_RESERVED });
	});

	it("still holds the Wayfinder to the slug format", async () => {
		expect(
			await createCustomLink(db, wayfinder, {
				slug: "Not Valid!",
				targetUrl: "https://example.com",
			}),
		).toEqual({ ok: false, error: LINK_ERRORS.SLUG_INVALID });
	});

	it("never hands the same slug to two people", async () => {
		await createCustomLink(db, autumn, {
			slug: "shared",
			targetUrl: "https://autumn.grove.place/",
		});
		expect(
			await createCustomLink(db, river, {
				slug: "shared",
				targetUrl: "https://river.grove.place/",
			}),
		).toEqual({ ok: false, error: LINK_ERRORS.SLUG_TAKEN });
		expect(
			await createCustomLink(db, wayfinder, { slug: "shared", targetUrl: "https://example.com" }),
		).toEqual({ ok: false, error: LINK_ERRORS.SLUG_TAKEN });
	});

	it("tells you when you already have that name", async () => {
		const target = "https://autumn.grove.place/";
		await createCustomLink(db, autumn, { slug: "mine", targetUrl: target });
		expect(await createCustomLink(db, autumn, { slug: "mine", targetUrl: target })).toEqual({
			ok: false,
			error: LINK_ERRORS.SLUG_YOURS,
		});
		expect(rowCount()).toBe(1);
	});

	it("tells the Wayfinder when a name is already theirs", async () => {
		await createCustomLink(db, wayfinder, { slug: "docs", targetUrl: "https://example.com/a" });
		expect(
			await createCustomLink(db, wayfinder, { slug: "docs", targetUrl: "https://example.com/b" }),
		).toEqual({ ok: false, error: LINK_ERRORS.SLUG_YOURS });
	});

	it("says a name is taken without revealing whose it is", async () => {
		await createCustomLink(db, river, {
			slug: "river-notes",
			targetUrl: "https://river.grove.place/",
		});
		expect(
			await createCustomLink(db, autumn, {
				slug: "river-notes",
				targetUrl: "https://autumn.grove.place/",
			}),
		).toEqual({ ok: false, error: LINK_ERRORS.SLUG_TAKEN });
	});

	it("treats a name that matches a bloom's generated link as taken", async () => {
		const post = await getOrCreatePostLink(db, { tenantId: "t-river", postId: "p-river" });
		if (!post.ok) throw new Error("setup failed");
		expect(
			await createCustomLink(db, autumn, {
				slug: post.value.slug,
				targetUrl: "https://autumn.grove.place/",
			}),
		).toEqual({ ok: false, error: LINK_ERRORS.SLUG_TAKEN });
	});

	it("rejects bad and reserved slugs", async () => {
		const target = "https://autumn.grove.place/";
		expect(await createCustomLink(db, autumn, { slug: "no", targetUrl: target })).toEqual({
			ok: false,
			error: LINK_ERRORS.SLUG_INVALID,
		});
		expect(await createCustomLink(db, autumn, { slug: "admin", targetUrl: target })).toEqual({
			ok: false,
			error: LINK_ERRORS.SLUG_RESERVED,
		});
	});
});

describe("disableLink", () => {
	const setup = async () => {
		await createCustomLink(db, autumn, { slug: "mine", targetUrl: "https://autumn.grove.place/" });
	};

	it("retires the owner's own link", async () => {
		await setup();
		expect(await disableLink(db, autumn, "mine")).toEqual({ ok: true, value: true });
		expect(await resolveShortLink(db, "mine")).toEqual({ status: "gone" });
		expect(await listLinks(db, autumn)).toEqual([]);
	});

	it("keeps a retired slug reserved so it can't be pointed somewhere else", async () => {
		await setup();
		await disableLink(db, autumn, "mine");
		expect(
			await createCustomLink(db, autumn, {
				slug: "mine",
				targetUrl: "https://autumn.grove.place/x",
			}),
		).toEqual({ ok: false, error: LINK_ERRORS.SLUG_RETIRED });
		expect(await resolveShortLink(db, "mine")).toEqual({ status: "gone" });
	});

	it("tells someone else only that a retired name is taken", async () => {
		await setup();
		await disableLink(db, autumn, "mine");
		expect(
			await createCustomLink(db, river, {
				slug: "mine",
				targetUrl: "https://river.grove.place/",
			}),
		).toEqual({ ok: false, error: LINK_ERRORS.SLUG_TAKEN });
	});

	it("won't touch someone else's link", async () => {
		await setup();
		const notFound = { ok: false, error: LINK_ERRORS.LINK_NOT_FOUND };
		expect(await disableLink(db, river, "mine")).toEqual(notFound);
		expect(await disableLink(db, wayfinder, "mine")).toEqual(notFound);
		expect((await resolveShortLink(db, "mine")).status).toBe("found");
	});

	it("won't retire a post link", async () => {
		const post = await getOrCreatePostLink(db, { tenantId: "t-autumn", postId: "p-hello" });
		if (!post.ok) throw new Error("setup failed");
		expect(await disableLink(db, autumn, post.value.slug)).toEqual({
			ok: false,
			error: LINK_ERRORS.LINK_NOT_FOUND,
		});
		expect((await resolveShortLink(db, post.value.slug)).status).toBe("found");
	});

	it("reports a slug that doesn't exist", async () => {
		expect(await disableLink(db, autumn, "ghost")).toEqual({
			ok: false,
			error: LINK_ERRORS.LINK_NOT_FOUND,
		});
	});
});

// ============================================================================
// Listing and counting
// ============================================================================

describe("listLinks", () => {
	it("lists an owner's links with where each one goes right now", async () => {
		const post = await getOrCreatePostLink(db, { tenantId: "t-autumn", postId: "p-hello" });
		await createCustomLink(db, autumn, {
			slug: "about-me",
			targetUrl: "https://autumn.grove.place/about",
		});
		sqlite.exec("UPDATE posts SET slug = 'renamed' WHERE id = 'p-hello'");

		const links = await listLinks(db, autumn);
		expect(links).toHaveLength(2);

		const postLink = links.find((l) => l.kind === "post");
		expect(postLink).toMatchObject({
			slug: post.ok ? post.value.slug : "",
			title: "Hello World",
			targetUrl: "https://autumn.grove.place/garden/renamed",
			clickCount: 0,
		});
		expect(links.find((l) => l.kind === "custom")).toMatchObject({
			slug: "about-me",
			targetUrl: "https://autumn.grove.place/about",
			shortUrl: `${SHORT_LINK_BASE_URL}/about-me`,
		});
	});

	it("shows no target for a post link whose bloom is gone", async () => {
		await getOrCreatePostLink(db, { tenantId: "t-autumn", postId: "p-hello" });
		sqlite.exec("DELETE FROM posts WHERE id = 'p-hello'");
		const [link] = await listLinks(db, autumn);
		expect(link.targetUrl).toBeNull();
	});

	it("keeps each owner's links separate", async () => {
		await createCustomLink(db, autumn, {
			slug: "autumn-one",
			targetUrl: "https://autumn.grove.place/",
		});
		await createCustomLink(db, river, {
			slug: "river-one",
			targetUrl: "https://river.grove.place/",
		});
		await createCustomLink(db, wayfinder, { slug: "wf-one", targetUrl: "https://example.com" });

		expect((await listLinks(db, autumn)).map((l) => l.slug)).toEqual(["autumn-one"]);
		expect((await listLinks(db, river)).map((l) => l.slug)).toEqual(["river-one"]);
		expect((await listLinks(db, wayfinder)).map((l) => l.slug)).toEqual(["wf-one"]);
	});
});

describe("recordClick", () => {
	it("counts clicks on the link", async () => {
		await createCustomLink(db, wayfinder, { slug: "counted", targetUrl: "https://example.com" });
		await recordClick(db, "counted");
		await recordClick(db, "COUNTED");
		const [link] = await listLinks(db, wayfinder);
		expect(link.clickCount).toBe(2);
	});

	it("ignores slugs that don't exist", async () => {
		await expect(recordClick(db, "ghost")).resolves.toBeUndefined();
	});
});
