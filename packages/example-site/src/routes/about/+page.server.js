import { getPage } from '$lib/utils/content.js';

export function load() {
	const page = getPage('About');
	return { page };
}
