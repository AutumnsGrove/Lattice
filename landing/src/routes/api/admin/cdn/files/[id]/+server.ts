// CDN File Delete/Update Endpoint
// DELETE /api/admin/cdn/files/[id]
// PATCH /api/admin/cdn/files/[id] (update alt_text)

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteCdnFile, getCdnFile, updateCdnFileAltText } from '$lib/server/db';

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}
	if (!locals.user.is_admin) {
		throw error(403, 'Admin access required');
	}
	if (!platform) {
		throw error(500, 'Platform not available');
	}

	const { DB, CDN_BUCKET } = platform.env;
	const key = await deleteCdnFile(DB, params.id);

	if (!key) {
		throw error(404, 'File not found');
	}

	await CDN_BUCKET.delete(key);

	return json({ success: true, message: 'File deleted successfully' });
};

export const PATCH: RequestHandler = async ({ params, request, locals, platform }) => {
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
	const body = await request.json();
	const { alt_text } = body;

	if (typeof alt_text !== 'string') {
		throw error(400, 'alt_text must be a string');
	}

	const file = await getCdnFile(DB, params.id);
	if (!file) {
		throw error(404, 'File not found');
	}

	await updateCdnFileAltText(DB, params.id, alt_text);

	return json({
		success: true,
		file: { ...file, alt_text, url: `${CDN_URL}/${file.key}` }
	});
};
