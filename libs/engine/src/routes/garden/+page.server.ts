import { getAllPosts } from "$lib/utils/markdown.js";
import * as cache from "$lib/server/services/cache.js";
import { emailsMatch } from "$lib/utils/user.js";
import type { PageServerLoad } from "./$types.js";

// Disable prerendering - posts are fetched from D1 at runtime
// This also ensures user auth state is available for the admin link
export const prerender = false;

interface PostRow {
	slug: string;
	title: string;
	published_at: number | null;
	tags: string | null;
	description: string | null;
	blaze: string | null;
	blaze_label: string | null;
	blaze_icon: string | null;
	blaze_color: string | null;
}

interface BlazeDefinition {
	label: string;
	icon: string;
	color: string;
}

interface PostMeta {
	slug: string;
	title: string;
	date: string;
	tags: string[];
	description: string;
	blaze: string | null;
	blazeDefinition: BlazeDefinition | null;
}

/** Cache configuration */
const CACHE_TTL_SECONDS = 900; // 15 minutes for post list

/** SQL query with LEFT JOIN for blaze definitions */
const POSTS_WITH_BLAZES_SQL = `SELECT p.slug, p.title, p.published_at, p.tags, p.description, p.blaze,
	bd.label AS blaze_label, bd.icon AS blaze_icon, bd.color AS blaze_color
FROM posts p
LEFT JOIN blaze_definitions bd ON bd.id = (
	SELECT bd2.id FROM blaze_definitions bd2
	WHERE bd2.slug = p.blaze
		AND (bd2.tenant_id = p.tenant_id OR bd2.tenant_id IS NULL)
	ORDER BY bd2.tenant_id IS NOT NULL DESC
	LIMIT 1
)
WHERE p.tenant_id = ? AND p.status = 'published'
ORDER BY p.published_at DESC
LIMIT 100`;

function mapPostRow(post: PostRow): PostMeta {
	return {
		slug: post.slug as string,
		title: post.title as string,
		date: post.published_at
			? new Date((post.published_at as number) * 1000).toISOString()
			: new Date().toISOString(),
		tags: post.tags ? JSON.parse(post.tags as string) : [],
		description: (post.description as string) || "",
		blaze: (post.blaze as string) || null,
		blazeDefinition:
			post.blaze_label && post.blaze_icon && post.blaze_color
				? { label: post.blaze_label, icon: post.blaze_icon, color: post.blaze_color }
				: null,
	};
}

export const load: PageServerLoad = async ({ locals, platform, setHeaders }) => {
	let posts: PostMeta[] = [];
	const tenantId = locals.tenantId;
	const db = platform?.env?.DB;
	const kv = platform?.env?.CACHE_KV;

	// Try to get from cache first, or compute from D1
	if (kv && db && tenantId) {
		const cacheKey = `garden:list:${tenantId}`;

		posts = await cache.getOrSet<PostMeta[]>(kv, cacheKey, {
			ttl: CACHE_TTL_SECONDS,
			compute: async () => {
				const result = await db.prepare(POSTS_WITH_BLAZES_SQL).bind(tenantId).all<PostRow>();

				return (result.results ?? []).map(mapPostRow);
			},
		});

		// Set Cache-Control headers for edge caching
		setHeaders({
			"Cache-Control": "public, max-age=300, s-maxage=600",
			"CDN-Cache-Control": "max-age=600, stale-while-revalidate=3600",
		});
	} else if (db && tenantId) {
		// No KV available, fall back to direct D1 (no caching)
		try {
			const result = await db.prepare(POSTS_WITH_BLAZES_SQL).bind(tenantId).all<PostRow>();

			posts = (result.results ?? []).map(mapPostRow);
		} catch (err) {
			console.error("D1 fetch error for posts list:", err);
		}
	}

	// If no D1 posts, fall back to filesystem (for local dev or if D1 is empty)
	if (posts.length === 0) {
		posts = getAllPosts().map((p) => ({ ...p, blaze: null, blazeDefinition: null }));
	}

	// Determine if logged-in user is the tenant owner (can access admin)
	const isOwner =
		locals.user &&
		locals.context?.type === "tenant" &&
		emailsMatch(locals.context.tenant.ownerId, locals.user.email);

	return {
		posts,
		user: locals.user || null,
		isOwner: isOwner || false,
	};
};
