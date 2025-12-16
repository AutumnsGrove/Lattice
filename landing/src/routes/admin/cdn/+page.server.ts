import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { storage } from '@autumnsgrove/groveengine/services';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		throw redirect(302, '/admin/login');
	}
	if (!locals.user.is_admin) {
		throw error(403, 'Admin access required');
	}
	if (!platform) {
		throw error(500, 'Platform not available');
	}

	const { DB, CDN_URL } = platform.env;

	const [filesData, folders] = await Promise.all([
		storage.listAllFiles(DB, { limit: 50, offset: 0 }),
		storage.listFolders(DB)
	]);

	const files = filesData.files.map((file) => ({
		id: file.id,
		filename: file.filename,
		original_filename: file.originalFilename,
		key: file.key,
		content_type: file.contentType,
		size_bytes: file.sizeBytes,
		folder: file.folder,
		alt_text: file.altText,
		uploaded_by: file.uploadedBy,
		created_at: file.createdAt,
		url: `${CDN_URL}/${file.key}`
	}));

	return {
		files,
		total: filesData.total,
		folders,
		cdnUrl: CDN_URL,
		user: locals.user
	};
};
