// Public CDN File Server - GET /cdn/[...path]

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const CACHE_CONTROL: Record<string, string> = {
	'image/jpeg': 'public, max-age=31536000, immutable',
	'image/png': 'public, max-age=31536000, immutable',
	'image/gif': 'public, max-age=31536000, immutable',
	'image/webp': 'public, max-age=31536000, immutable',
	'image/svg+xml': 'public, max-age=31536000, immutable',
	'image/avif': 'public, max-age=31536000, immutable',
	'font/woff': 'public, max-age=31536000, immutable',
	'font/woff2': 'public, max-age=31536000, immutable',
	'font/ttf': 'public, max-age=31536000, immutable',
	'font/otf': 'public, max-age=31536000, immutable',
	'video/mp4': 'public, max-age=31536000, immutable',
	'video/webm': 'public, max-age=31536000, immutable',
	'audio/mpeg': 'public, max-age=31536000, immutable',
	'audio/wav': 'public, max-age=31536000, immutable',
	'audio/webm': 'public, max-age=31536000, immutable',
	'application/pdf': 'public, max-age=86400',
	'application/json': 'public, max-age=3600',
	'text/css': 'public, max-age=86400',
	'text/javascript': 'public, max-age=86400',
	'application/javascript': 'public, max-age=86400'
};

export const GET: RequestHandler = async ({ params, platform, request }) => {
	if (!platform) {
		throw error(500, 'Platform not available');
	}

	const { CDN_BUCKET } = platform.env;
	const key = params.path;

	if (!key) {
		throw error(400, 'File path required');
	}

	const object = await CDN_BUCKET.get(key);

	if (!object) {
		throw error(404, 'File not found');
	}

	const contentType = object.httpMetadata?.contentType || 'application/octet-stream';
	const headers = new Headers();
	headers.set('Content-Type', contentType);
	headers.set('Cache-Control', CACHE_CONTROL[contentType] || 'public, max-age=86400');
	headers.set('ETag', object.httpEtag);

	// Handle conditional requests
	const ifNoneMatch = request.headers.get('If-None-Match');
	if (ifNoneMatch && ifNoneMatch === object.httpEtag) {
		return new Response(null, { status: 304, headers });
	}

	// Enable CORS for font files
	if (contentType.startsWith('font/')) {
		headers.set('Access-Control-Allow-Origin', '*');
	}

	return new Response(object.body, { headers });
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Max-Age': '86400'
		}
	});
};
