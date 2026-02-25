/**
 * Tenant-Scoped Query Helpers — The Aquifer
 *
 * Every query against tenant-scoped tables must include WHERE tenant_id = ?.
 * Forgetting this is a data leak. scopedDb() injects tenant_id automatically
 * into every query, just like TenantDb does for raw D1.
 *
 * @example
 * ```ts
 * import { createDb, scopedDb } from '@autumnsgrove/lattice/db';
 *
 * const db = createDb(platform.env.DB);
 * const tenant = scopedDb(db, locals.tenantId);
 *
 * const post = await tenant.posts.findBySlug('hello-world');
 * const published = await tenant.posts.listPublished();
 * await tenant.posts.create({ title: 'New Post', slug: 'new-post', ... });
 * ```
 */

import { eq, and, or, desc, asc, isNull } from "drizzle-orm";
import { posts, pages, media, blazeDefinitions } from "./schema/engine.js";
import type { EngineDb } from "./client.js";

/**
 * Creates a tenant-scoped query context for Drizzle.
 * All queries automatically filter by tenant_id.
 *
 * SECURITY: This is a critical security boundary. All multi-tenant
 * data access through Drizzle MUST go through this wrapper.
 */
export function scopedDb(db: EngineDb, tenantId: string) {
	return {
		// ── Posts ──────────────────────────────────────────────────────
		posts: {
			findBySlug: (slug: string) =>
				db
					.select()
					.from(posts)
					.where(and(eq(posts.tenantId, tenantId), eq(posts.slug, slug)))
					.get(),

			findById: (id: string) =>
				db
					.select()
					.from(posts)
					.where(and(eq(posts.tenantId, tenantId), eq(posts.id, id)))
					.get(),

			listPublished: () =>
				db
					.select()
					.from(posts)
					.where(and(eq(posts.tenantId, tenantId), eq(posts.status, "published")))
					.orderBy(desc(posts.publishedAt)),

			listAll: () =>
				db.select().from(posts).where(eq(posts.tenantId, tenantId)).orderBy(desc(posts.createdAt)),

			create: (data: typeof posts.$inferInsert) => db.insert(posts).values({ ...data, tenantId }),

			updateBySlug: (slug: string, data: Partial<typeof posts.$inferInsert>) =>
				db
					.update(posts)
					.set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
					.where(and(eq(posts.tenantId, tenantId), eq(posts.slug, slug))),

			deleteBySlug: (slug: string) =>
				db.delete(posts).where(and(eq(posts.tenantId, tenantId), eq(posts.slug, slug))),
		},

		// ── Pages ─────────────────────────────────────────────────────
		pages: {
			findBySlug: (slug: string) =>
				db
					.select()
					.from(pages)
					.where(and(eq(pages.tenantId, tenantId), eq(pages.slug, slug)))
					.get(),

			findById: (id: string) =>
				db
					.select()
					.from(pages)
					.where(and(eq(pages.tenantId, tenantId), eq(pages.id, id)))
					.get(),

			listAll: () =>
				db.select().from(pages).where(eq(pages.tenantId, tenantId)).orderBy(asc(pages.slug)),

			create: (data: typeof pages.$inferInsert) => db.insert(pages).values({ ...data, tenantId }),

			updateBySlug: (slug: string, data: Partial<typeof pages.$inferInsert>) =>
				db
					.update(pages)
					.set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
					.where(and(eq(pages.tenantId, tenantId), eq(pages.slug, slug))),

			deleteBySlug: (slug: string) =>
				db.delete(pages).where(and(eq(pages.tenantId, tenantId), eq(pages.slug, slug))),
		},

		// ── Blaze Definitions ─────────────────────────────────────────
		blazeDefinitions: {
			/** All blazes visible to this tenant: globals (tenant_id IS NULL) + custom */
			listAll: () =>
				db
					.select()
					.from(blazeDefinitions)
					.where(or(eq(blazeDefinitions.tenantId, tenantId), isNull(blazeDefinitions.tenantId)))
					.orderBy(asc(blazeDefinitions.sortOrder)),

			/** Only this tenant's custom definitions */
			listCustom: () =>
				db
					.select()
					.from(blazeDefinitions)
					.where(eq(blazeDefinitions.tenantId, tenantId))
					.orderBy(asc(blazeDefinitions.sortOrder)),

			findBySlug: (slug: string) =>
				db
					.select()
					.from(blazeDefinitions)
					.where(
						and(
							or(eq(blazeDefinitions.tenantId, tenantId), isNull(blazeDefinitions.tenantId)),
							eq(blazeDefinitions.slug, slug),
						),
					)
					.get(),

			create: (data: typeof blazeDefinitions.$inferInsert) =>
				db.insert(blazeDefinitions).values({ ...data, tenantId }),

			deleteBySlug: (slug: string) =>
				db
					.delete(blazeDefinitions)
					.where(and(eq(blazeDefinitions.tenantId, tenantId), eq(blazeDefinitions.slug, slug))),
		},

		// ── Media ─────────────────────────────────────────────────────
		media: {
			findById: (id: string) =>
				db
					.select()
					.from(media)
					.where(and(eq(media.tenantId, tenantId), eq(media.id, id)))
					.get(),

			listAll: () =>
				db.select().from(media).where(eq(media.tenantId, tenantId)).orderBy(desc(media.uploadedAt)),

			create: (data: typeof media.$inferInsert) => db.insert(media).values({ ...data, tenantId }),

			deleteById: (id: string) =>
				db.delete(media).where(and(eq(media.tenantId, tenantId), eq(media.id, id))),
		},
	};
}
