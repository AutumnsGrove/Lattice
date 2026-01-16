import { getAllPosts } from '$lib/data/static-content.js';

export function load() {
	const posts = getAllPosts();
	return { posts };
}
