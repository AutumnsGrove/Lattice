import { getPage, getLatestPost, getSiteConfig } from '$lib/utils/content.js';

export function load() {
	const homeData = getPage('Home');
	const latestPost = getLatestPost();
	const siteConfig = getSiteConfig();

	return {
		title: siteConfig?.site?.title || 'The Midnight Bloom',
		tagline: siteConfig?.site?.tagline || 'Open when the stars come out',
		description: siteConfig?.site?.description || '',
		hero: homeData?.hero || {
			title: 'The Midnight Bloom',
			subtitle: 'Open when the stars come out',
			cta: { text: 'View Our Menu', link: '/shop' }
		},
		content: homeData?.content || '',
		latestPost,
		siteConfig
	};
}
