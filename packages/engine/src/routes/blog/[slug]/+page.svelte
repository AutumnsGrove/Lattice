<script>
	import ContentWithGutter from '$lib/components/custom/ContentWithGutter.svelte';
	import { Button, Badge } from '$lib/ui';

	let { data } = $props();

	/** @type {Record<string, string>} */
	// Font family mapping - same as in +layout.svelte
	const fontMap = {
		// Default
		lexend: "'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		// Accessibility
		atkinson: "'Atkinson Hyperlegible', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		opendyslexic: "'OpenDyslexic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		luciole: "'Luciole', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		nunito: "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		// Modern Sans
		quicksand: "'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		manrope: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		'instrument-sans': "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		'plus-jakarta-sans': "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		// Serifs
		cormorant: "'Cormorant', Georgia, 'Times New Roman', serif",
		'bodoni-moda': "'Bodoni Moda', Georgia, 'Times New Roman', serif",
		lora: "'Lora', Georgia, 'Times New Roman', serif",
		'eb-garamond': "'EB Garamond', Georgia, 'Times New Roman', serif",
		merriweather: "'Merriweather', Georgia, 'Times New Roman', serif",
		fraunces: "'Fraunces', Georgia, 'Times New Roman', serif",
		// Monospace
		'ibm-plex-mono': "'IBM Plex Mono', 'Courier New', Consolas, monospace",
		cozette: "'Cozette', 'Courier New', Consolas, monospace",
		// Display/Special
		alagard: "'Alagard', fantasy, cursive",
		calistoga: "'Calistoga', Georgia, serif",
		caveat: "'Caveat', cursive, sans-serif"
	};

	// Get the font stack for this post (null if default)
	const postFont = $derived(
		data.post.font && data.post.font !== 'default'
			? fontMap[data.post.font]
			: null
	);
</script>

<svelte:head>
	<title>{data.post.title} - AutumnsGrove</title>
	<meta name="description" content={data.post.description || data.post.title} />
</svelte:head>

<div class="post-wrapper" class:has-custom-font={postFont} style:--post-font={postFont}>
	<ContentWithGutter
		content={data.post.content}
		gutterContent={data.post.gutterContent || []}
		headers={data.post.headers || []}
	>
		{#snippet children()}
			<header class="content-header">
				<Button variant="link" href="/blog" class="!p-0 mb-8">&larr; Back to Blog</Button>
				<h1>{data.post.title}</h1>
				<div class="post-meta">
					<time datetime={data.post.date} class="text-gray-600 dark:text-gray-400 transition-colors">
						{new Date(data.post.date).toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})}
					</time>
					{#if data.post.tags.length > 0}
						<div class="tags">
							{#each data.post.tags as tag (tag)}
								<a href="/blog/search?tag={encodeURIComponent(tag)}">
									<Badge variant="tag">{tag}</Badge>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			</header>
		{/snippet}
	</ContentWithGutter>
</div>

<style>
	/* Post wrapper for custom font application - placeholder for future styles */
	.post-wrapper {
		display: contents;
	}

	/* Apply custom font to body content and headings (not meta like date/tags) */
	.post-wrapper.has-custom-font :global(.content-body) {
		font-family: var(--post-font, var(--font-family-main));
	}

	.post-wrapper.has-custom-font :global(.content-body h1),
	.post-wrapper.has-custom-font :global(.content-body h2),
	.post-wrapper.has-custom-font :global(.content-body h3),
	.post-wrapper.has-custom-font :global(.content-body h4),
	.post-wrapper.has-custom-font :global(.content-body h5),
	.post-wrapper.has-custom-font :global(.content-body h6) {
		font-family: var(--post-font, var(--font-family-main));
	}
	/* Override content-header h1 to add margin for post meta */
	.content-header h1 {
		margin: 0 0 1rem 0;
	}

	.post-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
</style>
