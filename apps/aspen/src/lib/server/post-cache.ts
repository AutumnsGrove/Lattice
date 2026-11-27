/**
 * The post caches, in one place.
 *
 * Two keys carry a post to a reader: the post itself and the listing it appears
 * in. Everything that changes a post has to drop both, and "both" is a fact worth
 * writing down once — the key format is a cache contract, not a local detail.
 *
 * This lives outside `bloom-service` because Fireside changes a post's disclosure
 * and needs the same purge. Importing it from there made `publish` → `bloom-service`
 * → `publish` a cycle, and a cycle in a Worker bundle is not an error: the binding
 * is simply `undefined` at call time, and the route answers 500 with nothing in the
 * log to say why.
 */

import * as cache from "@autumnsgrove/lattice/server/services/cache";

export async function invalidatePostCaches(
	kv: KVNamespace | undefined,
	tenantId: string,
	slug: string,
): Promise<void> {
	if (!kv) return;

	try {
		await Promise.all([
			cache.del(kv, `garden:${tenantId}:${slug}`),
			cache.del(kv, `garden:list:${tenantId}`),
		]);
	} catch (err) {
		console.error("[Cache] Failed to invalidate post caches:", err);
	}
}
