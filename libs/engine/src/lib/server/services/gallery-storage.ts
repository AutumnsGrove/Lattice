/**
 * Gallery Storage Usage
 *
 * Single source of truth for "how much storage has this tenant used".
 * Sums gallery_images.file_size in grove-engine-db — the same table the upload
 * pipeline writes to and the same number the TenantDO quota gate enforces.
 *
 * Results are a discriminated union so a failed query is never mistaken for
 * an empty account (0 bytes).
 */

export type StorageUsage = { ok: true; bytes: number } | { ok: false };

export type AllStorageUsage =
	| { ok: true; byTenant: Map<string, number>; totalBytes: number }
	| { ok: false };

/** Bytes used by one tenant. */
export async function getTenantStorageUsed(
	db: D1Database,
	tenantId: string,
): Promise<StorageUsage> {
	try {
		const row = await db
			.prepare(
				"SELECT COALESCE(SUM(COALESCE(file_size, 0)), 0) as used_bytes FROM gallery_images WHERE tenant_id = ?",
			)
			.bind(tenantId)
			.first<{ used_bytes: number }>();
		return { ok: true, bytes: row?.used_bytes ?? 0 };
	} catch (err) {
		console.error("[GalleryStorage] Failed to load tenant storage usage:", err);
		return { ok: false };
	}
}

/** Bytes used per tenant, plus the platform total. Tenants with no images are absent from the map. */
export async function getAllTenantsStorageUsed(db: D1Database): Promise<AllStorageUsage> {
	try {
		const { results } = await db
			.prepare(
				"SELECT tenant_id, COALESCE(SUM(COALESCE(file_size, 0)), 0) as used_bytes FROM gallery_images GROUP BY tenant_id",
			)
			.all<{ tenant_id: string; used_bytes: number }>();

		const byTenant = new Map<string, number>();
		let totalBytes = 0;
		for (const row of results ?? []) {
			byTenant.set(row.tenant_id, row.used_bytes);
			totalBytes += row.used_bytes;
		}
		return { ok: true, byTenant, totalBytes };
	} catch (err) {
		console.error("[GalleryStorage] Failed to load platform storage usage:", err);
		return { ok: false };
	}
}
