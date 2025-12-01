import { error } from '@sveltejs/kit';
import { getPost } from '$lib/utils/content.js';

export function load({ params }) {
	const post = getPost(params.slug);

	if (!post) {
		throw error(404, 'Post not found');
	}

	return { post };
}
