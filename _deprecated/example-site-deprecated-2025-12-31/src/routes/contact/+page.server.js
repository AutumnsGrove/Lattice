import { getPage, getSiteConfig } from '$lib/data/static-content.js';

export function load() {
	const page = getPage('Contact');
	const siteConfig = getSiteConfig();
	return { page, siteConfig };
}
