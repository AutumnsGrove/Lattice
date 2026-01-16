import { getPage } from '$lib/data/static-content.js';

export function load() {
	const page = getPage('About');
	return { page };
}
