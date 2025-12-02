// CDN File Upload Endpoint
// POST /api/admin/cdn/upload

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createCdnFile, getUserByEmail } from '$lib/server/db';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/svg+xml',
	'image/avif',
	'application/pdf',
	'video/mp4',
	'video/webm',
	'audio/mpeg',
	'audio/wav',
	'audio/webm',
	'font/woff',
	'font/woff2',
	'font/ttf',
	'font/otf',
	'application/json',
	'text/css',
	'text/javascript',
	'application/javascript'
]);

function sanitizeFilename(filename: string): string {
	return filename
		.replace(/[/\\:*?"<>|]/g, '-')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.toLowerCase();
}

function generateUniqueFilename(originalFilename: string): string {
	const ext = originalFilename.split('.').pop() || '';
	const nameWithoutExt =
		originalFilename.slice(0, originalFilename.lastIndexOf('.')) || originalFilename;
	const sanitized = sanitizeFilename(nameWithoutExt);
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	return ext ? `${sanitized}-${timestamp}-${random}.${ext}` : `${sanitized}-${timestamp}-${random}`;
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}
	if (!locals.user.is_admin) {
		throw error(403, 'Admin access required');
	}
	if (!platform) {
		throw error(500, 'Platform not available');
	}

	const { DB, CDN_BUCKET, CDN_URL } = platform.env;

	// Get the user from database to get their ID
	const user = await getUserByEmail(DB, locals.user.email);
	if (!user) {
		throw error(401, 'User not found');
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const folder = (formData.get('folder') as string) || '/';
		const altText = (formData.get('alt_text') as string) || '';

		if (!file) {
			throw error(400, 'No file provided');
		}
		if (file.size > MAX_FILE_SIZE) {
			throw error(400, `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB`);
		}
		if (!ALLOWED_TYPES.has(file.type)) {
			throw error(400, `File type not allowed: ${file.type}`);
		}

		const filename = generateUniqueFilename(file.name);
		const cleanFolder = folder.startsWith('/') ? folder : `/${folder}`;
		const key = cleanFolder === '/' ? filename : `${cleanFolder.slice(1)}/${filename}`;

		const arrayBuffer = await file.arrayBuffer();
		await CDN_BUCKET.put(key, arrayBuffer, {
			httpMetadata: {
				contentType: file.type,
				cacheControl: 'public, max-age=31536000'
			}
		});

		const cdnFile = await createCdnFile(DB, {
			filename,
			original_filename: file.name,
			key,
			content_type: file.type,
			size_bytes: file.size,
			folder: cleanFolder,
			alt_text: altText || undefined,
			uploaded_by: user.id
		});

		return json({
			success: true,
			file: { ...cdnFile, url: `${CDN_URL}/${key}` }
		});
	} catch (err) {
		console.error('[CDN Upload Error]', err);
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to upload file');
	}
};
