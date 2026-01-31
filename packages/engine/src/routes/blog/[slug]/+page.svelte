<script>
	import ContentWithGutter from '$lib/components/custom/ContentWithGutter.svelte';
	import { Button, Badge } from '$lib/ui';
	import { fontMap } from '$lib/ui/tokens/fonts';

	let { data } = $props();

	// Get accent color from site settings (falls back to default if not set)
	const accentColor = $derived(data.siteSettings?.accent_color || null);

	// Get the font stack for this post (null if default)
	// Uses canonical fontMap imported from fonts.ts
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

	<!-- Cover image for social media -->
	{#if data.post.featured_image}
		<meta property="og:image" content={data.post.featured_image} />
	{/if}

	<!-- Twitter Card metadata -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={data.post.title} />
	<meta name="twitter:description" content={data.post.description || data.post.title} />
	{#if data.post.featured_image}
		<meta name="twitter:image" content={data.post.featured_image} />
	{/if}

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
		"keywords": data.post.tags.join(", "),
		...(data.post.featured_image ? { "image": data.post.featured_image } : {})
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
				<div class="nav-row">
					<Button variant="link" href="/blog" class="!p-0">&larr; Back to Blog</Button>
					{#if data.isOwner}
						<a href="/admin/blog/edit/{data.post.slug}" class="edit-link" aria-label="Edit this post in Flow">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
								<path d="m15 5 4 4"/>
							</svg>
							<span>Edit</span>
						</a>
					{/if}
				</div>
			</nav>

			<!-- Cover image -->
			{#if data.post.featured_image}
				<figure class="cover-image">
					<img src={data.post.featured_image} alt="" />
				</figure>
			{/if}

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

	/* Cover image styling */
	.cover-image {
		margin: 0 0 2rem 0;
		border-radius: 12px;
		overflow: hidden;
	}

	.cover-image img {
		width: 100%;
		height: auto;
		max-height: 400px;
		object-fit: cover;
		display: block;
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
		margin-bottom: 1.5rem;
	}

	.nav-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	/* Edit link for post owners */
	.edit-link {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--accent-success);
		background: var(--accent-success-faint, rgba(44, 95, 45, 0.08));
		border: 1px solid var(--accent-success-border, rgba(44, 95, 45, 0.2));
		border-radius: 6px;
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.edit-link:hover {
		background: var(--accent-success-faint-hover, rgba(44, 95, 45, 0.15));
		border-color: var(--accent-success-border-hover, rgba(44, 95, 45, 0.3));
	}
</style>
