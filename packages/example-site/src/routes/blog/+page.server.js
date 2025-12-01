import { getAllPosts } from '$lib/utils/content.js';

export function load() {
	const posts = getAllPosts();
	return { posts };
}
