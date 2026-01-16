import { error } from '@sveltejs/kit';
import { getPost } from '$lib/data/static-content.js';

export function load({ params }) {
	const post = getPost(params.slug);

	if (!post) {
		throw error(404, 'Post not found');
	}

	return { post };
}
