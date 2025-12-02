// CDN Files List Endpoint
// GET /api/admin/cdn/files

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listAllCdnFiles, getCdnFolders } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}
	if (!locals.user.is_admin) {
		throw error(403, 'Admin access required');
	}
	if (!platform) {
		throw error(500, 'Platform not available');
	}

	const { DB, CDN_URL } = platform.env;
	const limit = parseInt(url.searchParams.get('limit') || '50', 10);
	const offset = parseInt(url.searchParams.get('offset') || '0', 10);

	const [filesData, folders] = await Promise.all([
		listAllCdnFiles(DB, { limit, offset }),
		getCdnFolders(DB)
	]);

	const filesWithUrls = filesData.files.map((file) => ({
		...file,
		url: `${CDN_URL}/${file.key}`
	}));

	return json({
		success: true,
		files: filesWithUrls,
		total: filesData.total,
		folders,
		limit,
		offset
	});
};
