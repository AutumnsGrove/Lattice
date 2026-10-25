/**
 * Short Links Service — link.grove.place/{slug}
 *
 * One home for every short link rule: slug and target validation, creating and
 * listing links, and resolving a slug to its destination. The redirect worker,
 * Aspen's Arbor, and the landing Arbor all call this instead of re-implementing
 * any of it. See docs/specs/short-links-spec.md.
 *
 * Two kinds of link share the `short_links` table:
 *
 *   post    A bloom. Keyed by post_id and resolved at redirect time, so the link
 *           follows slug renames and a post only ever has one short link.
 *   custom  A chosen slug with an explicit https target. Wanderers may only
 *           target their own grove; the Wayfinder (owner type "wayfinder",
 *           tenant_id NULL) may target anywhere.
 */

import { GROVE_DOMAIN, buildGroveUrl } from "../../utils/grove-url.js";
import { isUsernameBlocked } from "../../platform/config/domain-blocklist.js";
import { containsOffensiveContent } from "../../platform/config/offensive-blocklist.js";
import { getTierSafe } from "../../platform/config/tiers/helpers.js";
import {
	SHORT_LINK_BASE_URL,
	SHORT_LINK_GENERATOR,
	SHORT_LINK_HOST,
	SHORT_LINK_LIST_LIMIT,
	SHORT_LINK_MAX_TARGET_LENGTH,
	SHORT_LINK_POST_PATH_PREFIX,
	SHORT_LINK_SLUG_RULES,
} from "../../platform/config/short-links.js";
import { LINK_ERRORS, type LinkErrorKey } from "../../errors/link-errors.js";
import type { GroveErrorDef } from "../../errors/types.js";

// ============================================================================
// Types
// ============================================================================

/** Who is creating or managing links. */
export type LinkOwner =
	| { type: "wayfinder" }
	| {
			type: "grove";
			tenantId: string;
			subdomain: string;
			/** Only pass when the tier includes a custom domain and one is set. */
			customDomain?: string | null;
	  };

export type LinkResult<T> = { ok: true; value: T } | { ok: false; error: GroveErrorDef };

export type ResolvedLink =
	| { status: "found"; url: string }
	| { status: "gone" }
	| { status: "not_found" };

export interface ShortLinkSummary {
	slug: string;
	shortUrl: string;
	kind: "post" | "custom";
	/** Where the link goes right now; null when a post link's bloom is missing. */
	targetUrl: string | null;
	/** Post title for post links. */
	title: string | null;
	createdAt: number;
	clickCount: number;
}

const ok = <T>(value: T): LinkResult<T> => ({ ok: true, value });
const fail = (key: LinkErrorKey): { ok: false; error: GroveErrorDef } => ({
	ok: false,
	error: LINK_ERRORS[key],
});

/**
 * Load the grove a Wanderer is acting for. Their custom domain only counts as
 * "their grove" on tiers that include one. Null when the grove doesn't exist
 * or isn't active.
 */
export async function getGroveOwner(db: D1Database, tenantId: string): Promise<LinkOwner | null> {
	const row = await db
		.prepare(`SELECT id, subdomain, custom_domain, plan FROM tenants WHERE id = ? AND active = 1`)
		.bind(tenantId)
		.first<{ id: string; subdomain: string; custom_domain: string | null; plan: string }>();
	if (!row) return null;

	return {
		type: "grove",
		tenantId: row.id,
		subdomain: row.subdomain,
		customDomain: getTierSafe(row.plan)?.features.customDomain ? row.custom_domain : null,
	};
}

// ============================================================================
// Slugs
// ============================================================================

export function normalizeSlug(input: string): string {
	return input.trim().toLowerCase();
}

export function buildShortUrl(slug: string): string {
	return `${SHORT_LINK_BASE_URL}/${slug}`;
}

/**
 * Check a slug against the length/pattern rules, the domain blocklist
 * (reserved words, impersonation), and the offensive blocklist.
 * The Wayfinder owns the reserved words, so their own links skip the blocklists
 * (the format rules still apply). Returns the normalized slug on success.
 */
export function validateSlug(input: string, owner?: LinkOwner): LinkResult<string> {
	const slug = normalizeSlug(input);
	const { minLength, maxLength, pattern } = SHORT_LINK_SLUG_RULES;

	if (slug.length < minLength || slug.length > maxLength || !pattern.test(slug)) {
		return fail("SLUG_INVALID");
	}
	if (owner?.type !== "wayfinder" && (isUsernameBlocked(slug) || containsOffensiveContent(slug))) {
		return fail("SLUG_RESERVED");
	}
	return ok(slug);
}

/** Uniform random index with rejection sampling (no modulo bias). */
function randomIndex(max: number): number {
	const limit = 256 - (256 % max);
	const byte = new Uint8Array(1);
	for (;;) {
		crypto.getRandomValues(byte);
		if (byte[0] < limit) return byte[0] % max;
	}
}

/** Generate a candidate slug. Callers still check it against validateSlug and the table. */
export function generateSlug(): string {
	const { alphabet, length } = SHORT_LINK_GENERATOR;
	let slug = "";
	for (let i = 0; i < length; i++) slug += alphabet[randomIndex(alphabet.length)];
	return slug;
}

// ============================================================================
// Targets
// ============================================================================

/**
 * Check a destination URL. Everyone gets https-only, no credentials, no odd
 * ports, no pointing back at link.grove.place. Wanderers must also stay inside
 * their own grove (subdomain, or custom domain when provided).
 * Returns the normalized URL on success.
 */
export function validateTarget(raw: string, owner: LinkOwner): LinkResult<string> {
	const trimmed = raw.trim();
	if (!trimmed) return fail("TARGET_INVALID");
	if (trimmed.length > SHORT_LINK_MAX_TARGET_LENGTH) return fail("TARGET_TOO_LONG");

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		return fail("TARGET_INVALID");
	}

	if (url.protocol !== "https:") return fail("TARGET_NOT_HTTPS");
	if (url.username || url.password || url.port) return fail("TARGET_INVALID");
	if (url.hostname === SHORT_LINK_HOST) return fail("TARGET_IS_SHORT_LINK");

	if (owner.type === "grove") {
		const allowed = [`${owner.subdomain}.${GROVE_DOMAIN}`];
		if (owner.customDomain) allowed.push(owner.customDomain.toLowerCase());
		if (!allowed.includes(url.hostname)) return fail("TARGET_NOT_OWN_GROVE");
	}

	return ok(url.toString());
}

// ============================================================================
// Creating links
// ============================================================================

/**
 * Get a post's short link, creating it on first use.
 *
 * A post has exactly one short link for its whole life: calling this again
 * (or racing another caller) returns the same slug, never a new one. The
 * unique index on post_id is what guarantees that.
 */
export async function getOrCreatePostLink(
	db: D1Database,
	input: { tenantId: string; postId: string },
): Promise<LinkResult<{ slug: string; shortUrl: string }>> {
	const post = await db
		.prepare(`SELECT id FROM posts WHERE id = ? AND tenant_id = ?`)
		.bind(input.postId, input.tenantId)
		.first<{ id: string }>();
	if (!post) return fail("POST_NOT_FOUND");

	const findSlug = () =>
		db
			.prepare(`SELECT slug FROM short_links WHERE post_id = ?`)
			.bind(input.postId)
			.first<{ slug: string }>();

	const existing = await findSlug();
	if (existing) return ok({ slug: existing.slug, shortUrl: buildShortUrl(existing.slug) });

	for (let attempt = 0; attempt < SHORT_LINK_GENERATOR.maxAttempts; attempt++) {
		const candidate = validateSlug(generateSlug());
		if (!candidate.ok) continue;

		await db
			.prepare(
				`INSERT OR IGNORE INTO short_links (slug, kind, tenant_id, post_id)
				 VALUES (?, 'post', ?, ?)`,
			)
			.bind(candidate.value, input.tenantId, input.postId)
			.run();

		// Whatever is stored for this post wins — ours, or a concurrent caller's.
		// Nothing stored means the slug collided with another link; try again.
		const stored = await findSlug();
		if (stored) return ok({ slug: stored.slug, shortUrl: buildShortUrl(stored.slug) });
	}

	return fail("SLUG_GENERATION_FAILED");
}

/**
 * Say why a chosen slug couldn't be used. Only the owner is told it's theirs;
 * anyone else just hears it's taken, so slugs can't be used to probe other groves.
 */
async function explainTakenSlug(
	db: D1Database,
	slug: string,
	tenantId: string | null,
): Promise<LinkErrorKey> {
	const existing = await db
		.prepare(`SELECT tenant_id, disabled_at FROM short_links WHERE slug = ?`)
		.bind(slug)
		.first<{ tenant_id: string | null; disabled_at: number | null }>();

	if (!existing || existing.tenant_id !== tenantId) return "SLUG_TAKEN";
	return existing.disabled_at === null ? "SLUG_YOURS" : "SLUG_RETIRED";
}

/**
 * Create a link with an explicit target. Pass `slug` to choose it, or omit it
 * to have one generated.
 */
export async function createCustomLink(
	db: D1Database,
	owner: LinkOwner,
	input: { targetUrl: string; slug?: string | null },
): Promise<LinkResult<{ slug: string; shortUrl: string }>> {
	const target = validateTarget(input.targetUrl, owner);
	if (!target.ok) return target;

	const tenantId = owner.type === "grove" ? owner.tenantId : null;
	const insert = async (slug: string): Promise<boolean> => {
		const result = await db
			.prepare(
				`INSERT OR IGNORE INTO short_links (slug, kind, tenant_id, target_url)
				 VALUES (?, 'custom', ?, ?)`,
			)
			.bind(slug, tenantId, target.value)
			.run();
		return (result.meta?.changes ?? 0) > 0;
	};

	if (input.slug) {
		const slug = validateSlug(input.slug, owner);
		if (!slug.ok) return slug;
		if (!(await insert(slug.value))) return fail(await explainTakenSlug(db, slug.value, tenantId));
		return ok({ slug: slug.value, shortUrl: buildShortUrl(slug.value) });
	}

	for (let attempt = 0; attempt < SHORT_LINK_GENERATOR.maxAttempts; attempt++) {
		const candidate = validateSlug(generateSlug());
		if (!candidate.ok) continue;
		if (await insert(candidate.value)) {
			return ok({ slug: candidate.value, shortUrl: buildShortUrl(candidate.value) });
		}
	}

	return fail("SLUG_GENERATION_FAILED");
}

// ============================================================================
// Managing links
// ============================================================================

const ownerClause = (owner: LinkOwner) =>
	owner.type === "grove"
		? { sql: "l.tenant_id = ?", params: [owner.tenantId] }
		: { sql: "l.tenant_id IS NULL", params: [] as string[] };

/** Active links for an owner, newest first. */
export async function listLinks(db: D1Database, owner: LinkOwner): Promise<ShortLinkSummary[]> {
	const scope = ownerClause(owner);
	const result = await db
		.prepare(
			`SELECT l.slug, l.kind, l.target_url, l.created_at, l.click_count,
			        p.slug AS post_slug, p.title AS post_title, t.subdomain
			 FROM short_links l
			 LEFT JOIN posts p ON p.id = l.post_id AND p.tenant_id = l.tenant_id
			 LEFT JOIN tenants t ON t.id = l.tenant_id
			 WHERE ${scope.sql} AND l.disabled_at IS NULL
			 ORDER BY l.created_at DESC, l.slug
			 LIMIT ?`,
		)
		.bind(...scope.params, SHORT_LINK_LIST_LIMIT)
		.all<{
			slug: string;
			kind: "post" | "custom";
			target_url: string | null;
			created_at: number;
			click_count: number;
			post_slug: string | null;
			post_title: string | null;
			subdomain: string | null;
		}>();

	return (result.results ?? []).map((row) => ({
		slug: row.slug,
		shortUrl: buildShortUrl(row.slug),
		kind: row.kind,
		targetUrl:
			row.kind === "post"
				? row.post_slug && row.subdomain
					? buildGroveUrl(row.subdomain, `${SHORT_LINK_POST_PATH_PREFIX}${row.post_slug}`)
					: null
				: row.target_url,
		title: row.post_title,
		createdAt: row.created_at,
		clickCount: row.click_count,
	}));
}

/**
 * Retire a custom link. The row stays (disabled) so the slug is never reused
 * for a different destination. Post links can't be retired — a post's short
 * link stays the same for as long as the post exists.
 */
export async function disableLink(
	db: D1Database,
	owner: LinkOwner,
	slug: string,
): Promise<LinkResult<true>> {
	const scope = ownerClause(owner);
	const result = await db
		.prepare(
			`UPDATE short_links AS l SET disabled_at = unixepoch()
			 WHERE l.slug = ? AND l.kind = 'custom' AND l.disabled_at IS NULL AND ${scope.sql}`,
		)
		.bind(normalizeSlug(slug), ...scope.params)
		.run();

	return (result.meta?.changes ?? 0) > 0 ? ok(true) : fail("LINK_NOT_FOUND");
}

// ============================================================================
// Redirecting
// ============================================================================

/**
 * Resolve a slug to where it should go right now.
 *
 * "gone" is a link that existed and no longer leads anywhere: disabled, its
 * bloom unpublished or deleted, or its grove inactive. "not_found" is a slug
 * nobody ever made.
 */
export async function resolveShortLink(db: D1Database, rawSlug: string): Promise<ResolvedLink> {
	const slug = normalizeSlug(rawSlug);
	if (!SHORT_LINK_SLUG_RULES.pattern.test(slug) || slug.length > SHORT_LINK_SLUG_RULES.maxLength) {
		return { status: "not_found" };
	}

	const row = await db
		.prepare(
			`SELECT l.kind, l.tenant_id, l.target_url, l.disabled_at,
			        p.slug AS post_slug, p.status AS post_status,
			        t.subdomain, t.active
			 FROM short_links l
			 LEFT JOIN posts p ON p.id = l.post_id AND p.tenant_id = l.tenant_id
			 LEFT JOIN tenants t ON t.id = l.tenant_id
			 WHERE l.slug = ?`,
		)
		.bind(slug)
		.first<{
			kind: "post" | "custom";
			tenant_id: string | null;
			target_url: string | null;
			disabled_at: number | null;
			post_slug: string | null;
			post_status: string | null;
			subdomain: string | null;
			active: number | null;
		}>();

	if (!row) return { status: "not_found" };
	if (row.disabled_at !== null) return { status: "gone" };
	if (row.tenant_id !== null && (!row.subdomain || row.active !== 1)) return { status: "gone" };

	if (row.kind === "custom") {
		return row.target_url ? { status: "found", url: row.target_url } : { status: "gone" };
	}

	if (row.post_slug && row.post_status === "published" && row.subdomain) {
		const path = `${SHORT_LINK_POST_PATH_PREFIX}${encodeURIComponent(row.post_slug)}`;
		return { status: "found", url: buildGroveUrl(row.subdomain, path) };
	}
	return { status: "gone" };
}

/** Count a click. Fire-and-forget; callers should never let this fail a redirect. */
export async function recordClick(db: D1Database, slug: string): Promise<void> {
	await db
		.prepare(`UPDATE short_links SET click_count = click_count + 1 WHERE slug = ?`)
		.bind(normalizeSlug(slug))
		.run();
}
