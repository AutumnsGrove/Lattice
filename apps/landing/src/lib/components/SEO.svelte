<script lang="ts">
	import { page } from '$app/state';

	/**
	 * SEO Component - Generates Open Graph and Twitter Card metadata for link previews
	 *
	 * Usage:
	 * ```svelte
	 * <SEO
	 *   title="Page Title"
	 *   description="Page description for previews"
	 *   url="/page-path"
	 *   image="/custom-image.png"
	 * />
	 * ```
	 */

	interface Props {
		/** Page title (will appear in browser tab and link previews) */
		title: string;
		/** Description for link previews and search engines */
		description: string;
		/** Relative or absolute URL path (e.g., "/roadmap" or "https://grove.place/roadmap") */
		url: string;
		/** Optional: Custom image URL for link previews (defaults to dynamic OG image) */
		image?: string;
		/** Optional: Open Graph type (defaults to "website") */
		type?: 'website' | 'article';
		/** Optional: Use dynamic OG image generation (defaults to true) */
		dynamicImage?: boolean;
		/** Optional: Accent color for dynamic OG image (hex without #, defaults to grove green) */
		accentColor?: string;
	}

	let {
		title,
		description,
		url,
		image,
		type = 'website',
		dynamicImage = true,
		accentColor = '16a34a'
	}: Props = $props();

	// Get base URL from current origin (works in dev/staging/prod)
	// Falls back to production URL for SSR or if page store unavailable
	const baseUrl = $derived(
		typeof window !== 'undefined' && page?.url?.origin
			? page.url.origin
			: 'https://grove.place'
	);

	// Ensure URL is absolute
	const absoluteUrl = $derived(url.startsWith('http') ? url : `${baseUrl}${url}`);

	// Safely encode strings for URL parameters (handles edge cases with special characters)
	function safeEncode(str: string | undefined | null): string {
		if (!str) return '';
		try {
			return encodeURIComponent(str);
		} catch {
			// Fallback: remove problematic characters and try again
			return encodeURIComponent(str.replace(/[\uD800-\uDFFF]/g, ''));
		}
	}

	// Generate dynamic OG image URL if enabled and no custom image provided
	const ogImageUrl = $derived(
		image
			? (image.startsWith('http') ? image : `${baseUrl}${image}`)
			: dynamicImage
				? `${baseUrl}/api/og?title=${safeEncode(title)}&subtitle=${safeEncode(description)}&accent=${safeEncode(accentColor)}`
				: `${baseUrl}/og-image.png`
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content={type} />
	<meta property="og:url" content={absoluteUrl} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImageUrl} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content={absoluteUrl} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImageUrl} />
</svelte:head>
