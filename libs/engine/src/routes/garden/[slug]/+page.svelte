<script>
	import ContentWithGutter from "$lib/components/custom/ContentWithGutter.svelte";
	import ReedsThread from "$lib/components/reeds/ReedsThread.svelte";
	import { Button, Badge, GroveSwap, MessageSquare, MessageSquareText } from "$lib/ui";
	import { fontMap } from "$lib/ui/tokens/fonts";
	import { Blaze } from "$lib/ui/components/indicators";
	import { resolveBlaze } from "$lib/blazes";

	let { data } = $props();

	/** Resolve custom blaze: server definition → global default → slug fallback */
	const customBlazeDefinition = $derived(
		resolveBlaze(data.post.blaze, data.post.blazeDefinition),
	);

	// Get accent color from site settings (falls back to default if not set)
	const accentColor = $derived(data.siteSettings?.accent_color || null);

	// Get the font stack for this post (null if default)
	// Uses canonical fontMap imported from fonts.ts
	const postFont = $derived(
		data.post.font && data.post.font !== "default" ? fontMap[data.post.font] : null,
	);
</script>

<svelte:head>
	<title
		>{data.post.title}{data.context?.type === "tenant"
			? ` - ${data.context.tenant.name}`
			: ""}</title
	>
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
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted JSON-LD script -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		headline: data.post.title,
		description: data.post.description || data.post.title,
		author: {
			"@type": "Person",
			name: data.post.author,
		},
		datePublished: data.post.date,
		dateModified: data.post.updated_at || data.post.date,
		keywords: data.post.tags.join(", "),
		...(data.post.featured_image ? { image: data.post.featured_image } : {}),
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
					<Button variant="link" href="/garden" class="!p-0"
						>&larr; Back to <GroveSwap term="your-garden">Garden</GroveSwap></Button
					>
					{#if data.isOwner}
						<a
							href="/arbor/garden/edit/{data.post.slug}"
							class="edit-link"
							aria-label="Edit this post in Flow"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
								<path d="m15 5 4 4" />
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
							{new Date(data.post.date).toLocaleDateString("en-US", {
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
						</time>
						{#if data.post.created_at}
							{@const created = new Date(data.post.created_at)}
							{@const published = new Date(data.post.date)}
							{#if Math.abs(published.getTime() - created.getTime()) > 86400000}
								<span class="meta-separator" aria-hidden="true"></span>
								<span class="started-date">
									Started {created.toLocaleDateString("en-US", {
										year: "numeric",
										month: "long",
										day: "numeric",
									})}
								</span>
							{/if}
						{/if}
						<span class="meta-separator" aria-hidden="true"></span>
						<div class="blaze-badges">
							<Blaze postType="bloom" />
							{#if customBlazeDefinition}
								<Blaze definition={customBlazeDefinition} />
							{/if}
						</div>
						{#if data.post.tags.length > 0}
							<span class="meta-separator" aria-hidden="true"></span>
							<div class="tags">
								{#each data.post.tags as tag (tag)}
									<a href="/garden/search?tag={encodeURIComponent(tag)}" class="tag-link">
										<Badge variant="tag" class="accent-tag">{tag}</Badge>
									</a>
								{/each}
							</div>
						{/if}
					</div>

					{#if data.commentSettings?.comments_enabled}
						<a
							href="#reeds"
							class="comment-count-badge"
							aria-label="{data.commentTotal || 0} {data.commentTotal === 1
								? 'comment'
								: 'comments'} — jump to discussion"
						>
							{#if (data.commentTotal || 0) > 0}
								<MessageSquareText class="comment-badge-icon has-comments" />
							{:else}
								<MessageSquare class="comment-badge-icon" />
							{/if}
						</a>
					{/if}
				</div>
			</header>
		{/snippet}
	</ContentWithGutter>

	<!-- Reeds: Comments section -->
	<div class="reeds-container">
		<ReedsThread
			slug={data.post.slug}
			initialComments={data.comments || []}
			initialTotal={data.commentTotal || 0}
			settings={data.commentSettings ?? undefined}
			currentUserId={data.user?.id}
			isOwner={data.isOwner || false}
			isLoggedIn={!!data.user}
		/>
	</div>
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
		position: relative;
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

	/* Blaze badges */
	.blaze-badges {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	/* "Started writing" secondary date — muted to stay subordinate to publish date */
	.post-meta .started-date {
		color: #999;
		font-size: 0.9em;
		font-style: italic;
	}

	:global(.dark) .post-meta .started-date {
		color: #777;
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

	/* Comment count badge — floats at right edge of glass meta box */
	.comment-count-badge {
		position: absolute;
		right: 1rem;
		top: 50%;
		transform: translateY(-50%);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		background: rgba(255, 255, 255, 0.5);
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 10px;
		color: var(--color-text-muted, #888);
		text-decoration: none;
		transition:
			color 0.15s ease,
			background 0.15s ease,
			transform 0.15s ease;
	}

	.comment-count-badge:hover {
		background: rgba(255, 255, 255, 0.8);
		color: var(--user-accent, var(--color-primary, #2c5f2d));
		transform: translateY(-50%) scale(1.08);
	}

	:global(.dark) .comment-count-badge {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
		color: var(--grove-text-muted, #999);
	}

	:global(.dark) .comment-count-badge:hover {
		background: rgba(255, 255, 255, 0.12);
		color: var(--grove-300, #86efac);
	}

	.comment-count-badge:focus-visible {
		outline: 2px solid var(--user-accent, var(--color-primary, #2c5f2d));
		outline-offset: 2px;
	}

	:global(.dark) .comment-count-badge:focus-visible {
		outline-color: var(--grove-300, #86efac);
	}

	:global(.comment-badge-icon) {
		width: 1.25rem;
		height: 1.25rem;
	}

	:global(.comment-badge-icon.has-comments) {
		color: var(--user-accent, var(--color-primary, #2c5f2d));
	}

	:global(.dark) :global(.comment-badge-icon.has-comments) {
		color: var(--grove-300, #86efac);
	}

	@media (prefers-reduced-motion: reduce) {
		.comment-count-badge {
			transition: none;
		}
		.comment-count-badge:hover {
			transform: translateY(-50%);
		}
	}

	/* On narrow screens, badge sits below meta instead of floating */
	@media (max-width: 540px) {
		.comment-count-badge {
			position: static;
			transform: none;
			margin-top: 0.75rem;
		}
		.comment-count-badge:hover {
			transform: scale(1.05);
		}
	}

	@media (max-width: 540px) and (prefers-reduced-motion: reduce) {
		.comment-count-badge:hover {
			transform: none;
		}
	}

	/* Reeds comment section container */
	.reeds-container {
		max-width: 768px;
		margin: 0 auto;
		padding: 0 1rem;
	}
</style>
