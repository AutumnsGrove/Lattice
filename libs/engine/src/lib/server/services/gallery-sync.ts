/**
 * Gallery Sync
 *
 * Reconciles one tenant's R2 objects with gallery_images in grove-engine-db:
 * inserts rows for new objects, refreshes file_size for existing ones, and
 * removes rows whose objects are gone. gallery_images.file_size is what storage
 * usage and the TenantDO quota gate read, so this keeps both honest.
 *
 * Shared by the manual "Sync images from Amber" route and the scheduled sweep.
 */

import {
	parseImageFilename,
	isSupportedImage,
	generateGalleryId,
} from "@autumnsgrove/curios/gallery";

export interface GallerySyncResult {
	added: number;
	updated: number;
	removed: number;
	skipped: number;
	backfilledAspectRatio: number;
}

interface ExistingImage {
	id: string;
	r2_key: string;
}

type Parsed = ReturnType<typeof parseImageFilename>;
interface SyncEntry {
	id: string;
	obj: R2Object;
	parsed: Parsed;
}

// R2 paths that are NOT gallery content (system files, generated thumbnails)
const EXCLUDED_PREFIXES = ["profile/", "thumbs/"];
const BATCH_SIZE = 50; // D1 batch limit

/**
 * @param cdnBaseUrl Optional CDN prefix for cdn_url. When null, cdn_url is left
 *   NULL on new rows and untouched on existing ones — readers fall back to
 *   `${cdnBase}/${r2_key}`.
 */
export async function syncTenantGallery(
	bucket: R2Bucket,
	db: D1Database,
	tenantId: string,
	cdnBaseUrl: string | null,
): Promise<GallerySyncResult> {
	let skipped = 0;
	let cursor: string | undefined;
	const cdnUrlFor = (key: string) => (cdnBaseUrl ? `${cdnBaseUrl}/${key}` : null);

	const existingResult = await db
		.prepare(`SELECT id, r2_key FROM gallery_images WHERE tenant_id = ?`)
		.bind(tenantId)
		.all<ExistingImage>();

	const existingByKey = new Map<string, string>();
	for (const row of existingResult.results ?? []) {
		existingByKey.set(row.r2_key, row.id);
	}

	// Collect all image data from R2, then batch write to D1
	const tenantPrefix = `${tenantId}/`;
	const updates: SyncEntry[] = [];
	const inserts: SyncEntry[] = [];

	do {
		const listResult = await bucket.list({ prefix: tenantPrefix, cursor, limit: 500 });

		for (const obj of listResult.objects) {
			if (!isSupportedImage(obj.key)) {
				skipped++;
				continue;
			}

			const keyWithoutTenant = obj.key.startsWith(tenantPrefix)
				? obj.key.slice(tenantPrefix.length)
				: obj.key;
			if (EXCLUDED_PREFIXES.some((p) => keyWithoutTenant.startsWith(p))) {
				skipped++;
				continue;
			}

			const parsed = parseImageFilename(keyWithoutTenant);
			const existingId = existingByKey.get(obj.key);

			if (existingId) {
				updates.push({ id: existingId, obj, parsed });
			} else {
				inserts.push({ id: generateGalleryId(), obj, parsed });
			}
		}

		cursor = listResult.truncated ? listResult.cursor : undefined;
	} while (cursor);

	for (let i = 0; i < updates.length; i += BATCH_SIZE) {
		const batch = updates.slice(i, i + BATCH_SIZE);
		await db.batch(
			batch.map(({ id, obj, parsed }) =>
				db
					.prepare(
						`UPDATE gallery_images SET
                file_size = ?,
                uploaded_at = ?,
                cdn_url = COALESCE(?, cdn_url),
                parsed_date = COALESCE(parsed_date, ?),
                parsed_category = COALESCE(parsed_category, ?),
                parsed_slug = COALESCE(parsed_slug, ?),
                updated_at = strftime('%s', 'now')
              WHERE id = ?`,
					)
					.bind(
						obj.size,
						obj.uploaded?.toISOString() || null,
						cdnUrlFor(obj.key),
						parsed.date,
						parsed.category,
						parsed.slug,
						id,
					),
			),
		);
	}

	for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
		const batch = inserts.slice(i, i + BATCH_SIZE);
		await db.batch(
			batch.map(({ id, obj, parsed }) =>
				db
					.prepare(
						`INSERT INTO gallery_images (
                id, tenant_id, r2_key,
                parsed_date, parsed_category, parsed_slug,
                file_size, uploaded_at, cdn_url
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(tenant_id, r2_key) DO UPDATE SET file_size = excluded.file_size`,
					)
					.bind(
						id,
						tenantId,
						obj.key,
						parsed.date,
						parsed.category,
						parsed.slug,
						obj.size,
						obj.uploaded?.toISOString() || null,
						cdnUrlFor(obj.key),
					),
			),
		);
	}

	// Remove orphaned D1 rows: system paths that slipped in + R2 objects that no longer exist
	const r2KeysFound = new Set([
		...updates.map(({ obj }) => obj.key),
		...inserts.map(({ obj }) => obj.key),
	]);
	const orphanedIds: string[] = [];
	for (const [r2Key, id] of existingByKey) {
		const keyWithoutTenant = r2Key.startsWith(tenantPrefix)
			? r2Key.slice(tenantPrefix.length)
			: r2Key;
		const isSystemPath = EXCLUDED_PREFIXES.some((p) => keyWithoutTenant.startsWith(p));
		const isOrphaned = !r2KeysFound.has(r2Key);
		if (isSystemPath || isOrphaned) {
			orphanedIds.push(id);
		}
	}
	for (let i = 0; i < orphanedIds.length; i += BATCH_SIZE) {
		const batch = orphanedIds.slice(i, i + BATCH_SIZE);
		await db.batch(
			batch.map((id) => db.prepare(`DELETE FROM gallery_images WHERE id = ?`).bind(id)),
		);
	}

	// Backfill aspect_ratio from existing width/height data
	let backfilledAspectRatio = 0;
	try {
		const backfillResult = await db
			.prepare(
				`UPDATE gallery_images
					SET aspect_ratio = CAST(width AS REAL) / height
					WHERE tenant_id = ?
						AND width IS NOT NULL AND height IS NOT NULL AND height > 0
						AND aspect_ratio IS NULL`,
			)
			.bind(tenantId)
			.run();
		backfilledAspectRatio =
			((backfillResult.meta as Record<string, unknown>)?.changes as number) ?? 0;
	} catch (backfillErr) {
		// Non-critical — aspect_ratio column may not exist yet
		console.warn("[GallerySync] Aspect ratio backfill skipped:", (backfillErr as Error).message);
	}

	return {
		added: inserts.length,
		updated: updates.length,
		removed: orphanedIds.length,
		skipped,
		backfilledAspectRatio,
	};
}

export interface AllGallerySyncResult {
	tenants: number;
	failed: string[];
}

/**
 * Sync every tenant's gallery. One tenant failing never stops the sweep.
 * Runs sequentially: each tenant costs several R2/D1 subrequests, so a very
 * large tenant count will eventually need batching across invocations.
 */
export async function syncAllTenantGalleries(
	bucket: R2Bucket,
	db: D1Database,
): Promise<AllGallerySyncResult> {
	const { results } = await db
		.prepare(
			`SELECT t.id, c.cdn_base_url
       FROM tenants t
       LEFT JOIN gallery_curio_config c ON c.tenant_id = t.id`,
		)
		.all<{ id: string; cdn_base_url: string | null }>();

	const failed: string[] = [];
	for (const { id, cdn_base_url } of results ?? []) {
		try {
			await syncTenantGallery(bucket, db, id, cdn_base_url || null);
		} catch (err) {
			failed.push(id);
			console.error(`[GallerySync] Sync failed for tenant ${id}:`, err);
		}
	}
	return { tenants: results?.length ?? 0, failed };
}
