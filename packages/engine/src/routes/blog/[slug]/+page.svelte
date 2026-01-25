<script>
	import ContentWithGutter from '$lib/components/custom/ContentWithGutter.svelte';
	import { Button, Badge } from '$lib/ui';

	let { data } = $props();

	// Get accent color from site settings (falls back to default if not set)
	const accentColor = $derived(data.siteSettings?.accent_color || null);

	/** @type {Record<string, string>} */
	// Font family mapping - curated selection of 10 high-quality fonts
	const fontMap = {
		// Accessibility
		lexend: "'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		atkinson: "'Atkinson Hyperlegible', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		// Modern Sans
		quicksand: "'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		'plus-jakarta-sans': "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
		// Serifs
		lora: "'Lora', Georgia, 'Times New Roman', serif",
		merriweather: "'Merriweather', Georgia, 'Times New Roman', serif",
		'eb-garamond': "'EB Garamond', Georgia, 'Times New Roman', serif",
		// Monospace
		'ibm-plex-mono': "'IBM Plex Mono', 'Courier New', Consolas, monospace",
		// Display/Special
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
	<title>{data.post.title}{data.context?.type === 'tenant' ? ` - ${data.context.tenant.name}` : ''}</title>
	<meta name="description" content={data.post.description || data.post.title} />

	<!-- Open Graph metadata for better content detection -->
	<meta property="og:title" content={data.post.title} />
	<meta property="og:description" content={data.post.description || data.post.title} />
	<meta property="og:type" content="article" />
	<meta property="article:published_time" content={data.post.date} />
	<meta property="article:author" content={data.post.author} />
	{#each data.post.tags as tag}
		<meta property="article:tag" content={tag} />
	{/each}

	<!-- Twitter Card metadata -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={data.post.title} />
	<meta name="twitter:description" content={data.post.description || data.post.title} />

	<!-- Schema.org JSON-LD structured data for articles -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		"headline": data.post.title,
		"description": data.post.description || data.post.title,
		"author": {
			"@type": "Person",
			"name": data.post.author
		},
		"datePublished": data.post.date,
		"dateModified": data.post.date,
		"keywords": data.post.tags.join(", ")
	})}<\/script>`}
</svelte:head>

<div class="post-wrapper" class:has-custom-font={postFont} style:--post-font={postFont}>
	<ContentWithGutter
		content={data.post.content}
		gutterContent={data.post.gutterContent || []}
		headers={data.post.headers || []}
	>
		{#snippet children()}
			<!-- Navigation outside of article header for semantic clarity -->
			<nav class="article-nav" aria-label="Article navigation">
				<Button variant="link" href="/blog" class="!p-0 mb-6">&larr; Back to Blog</Button>
			</nav>

			<!-- Article header with title and metadata -->
			<header class="content-header">
				<h1 class="article-title">{data.post.title}</h1>
				<div class="post-meta-glass" style:--accent-color={accentColor}>
					<div class="post-meta article-meta">
						<address class="author-name article-author">
							<span class="author-prefix">By:</span>
							<a href="/about" rel="author">{data.post.author}</a>
						</address>
						<span class="meta-separator" aria-hidden="true"></span>
						<time datetime={data.post.date} class="entry-date dateline published-date">
							{new Date(data.post.date).toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</time>
						{#if data.post.tags.length > 0}
							<span class="meta-separator" aria-hidden="true"></span>
							<div class="tags">
								{#each data.post.tags as tag (tag)}
									<a href="/blog/search?tag={encodeURIComponent(tag)}" class="tag-link">
										<Badge variant="tag" class="accent-tag">{tag}</Badge>
									</a>
								{/each}
							</div>
						{/if}
					</div>
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

	/* Glassmorphism container for post metadata */
	.post-meta-glass {
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 12px;
		padding: 1rem 1.25rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	}

	:global(.dark) .post-meta-glass {
		background: rgba(36, 36, 36, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	/* Reduced motion: disable blur for accessibility */
	@media (prefers-reduced-motion: reduce) {
		.post-meta-glass {
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
			background: rgba(255, 255, 255, 0.95);
		}
		:global(.dark) .post-meta-glass {
			background: rgba(36, 36, 36, 0.95);
		}
	}

	.post-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	/* Meta separator dot */
	.meta-separator {
		width: 4px;
		height: 4px;
		background: #999;
		border-radius: 50%;
		flex-shrink: 0;
	}

	:global(.dark) .meta-separator {
		background: #666;
	}

	/* Author byline styling for Safari Reader detection */
	.post-meta .author-name {
		font-style: normal;
		color: var(--light-border-secondary);
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	:global(.dark) .post-meta .author-name {
		color: var(--color-text-dark);
	}

	.post-meta .author-name .author-prefix {
		font-weight: 400;
		color: #666;
	}

	:global(.dark) .post-meta .author-name .author-prefix {
		color: var(--color-text-muted-dark);
	}

	.post-meta .author-name a {
		color: inherit;
		text-decoration: none;
		font-weight: 500;
	}

	.post-meta .author-name a:hover {
		color: #2c5f2d;
		text-decoration: underline;
	}

	:global(.dark) .post-meta .author-name a:hover {
		color: var(--accent-success);
	}

	/* Date styling */
	.post-meta .entry-date {
		color: #666;
	}

	:global(.dark) .post-meta .entry-date {
		color: var(--color-text-muted-dark);
	}

	/* Tags with accent color support */
	.tags {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.tag-link {
		text-decoration: none;
	}

	/* Apply accent color to tags when set via CSS custom property */
	.post-meta-glass[style*="--accent-color"] .tag-link :global(.accent-tag) {
		background: var(--accent-color, var(--tag-bg));
		border-color: var(--accent-color, var(--tag-bg));
	}

	.post-meta-glass[style*="--accent-color"] .tag-link:hover :global(.accent-tag) {
		filter: brightness(1.1);
	}

	/* Article navigation */
	.article-nav {
		margin-bottom: 1rem;
	}
</style>
