import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listAllCdnFiles, getCdnFolders } from '$lib/server/db';

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
		listAllCdnFiles(DB, { limit: 50, offset: 0 }),
		getCdnFolders(DB)
	]);

	const files = filesData.files.map((file) => ({
		...file,
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
